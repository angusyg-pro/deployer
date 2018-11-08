/**
 * @fileoverview Deployment service
 * @module services/deployments
 * @requires {@link external:child_process}
 * @requires {@link external:path}
 * @requires {@link external:fs-extra}
 * @requires {@link external:cron}
 * @requires {@link external:nodemailer}
 * @requires config/app
 * @requires models/version
 * @requires models/deployment
 * @requires services/deployer
 * @requires services/artifactory
 * @requires services/servers
 * @requires lib/socketio
 * @requires lib/logger
 * @requires lib/errors
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs-extra');
const { CronJob } = require('cron');
const nodemailer = require('nodemailer');
const moment = require('moment');
const config = require('../config/app');
const Version = require('../models/version');
const Deployment = require('../models/deployment');
const deployerService = require('./deployer');
const artifactoryService = require('./artifactory');
const serverService = require('./servers');
const socketIO = require('../lib/socketio');
const logger = require('../lib/logger');
const { ApiError } = require('../lib/errors');

const intervals = new Map();
const transporter = nodemailer.createTransport({
  host: 'smtp.probtp',
  port: 25,
});
const service = {};

/**
 * Envoie le mail de rapport de déploiement
 * @param  {string[]} recipients - Destinataire
 * @param  {string}   title      - titre du mail
 * @param  {string}   body       - corps du mail
 */
const sendMail = (version, deployment) => {
  logger.debugFuncCall(version, deployment);
  // Envoi du mail seulement si des destinataires existent et que le mode de mailing est toujours ou correspond au statut du déploiement
  if (version.configuration.mailRecipients.length > 0 && (version.configuration.mailMode === 'ALWAYS' || version.configuration.mailMode === deployment.status)) {
    let title = `[${version.fullName}] [${moment().format('DD/MM/YYYY, hh:mm:ss')}] Déploiement ${deployment.status === 'FAILED' ? 'KO' : 'OK'}`;
    let body = '';
    let cptErrors = 0;
    let cptTotal = 0;
    // Inspection du détail pour construire le corps du mail
    for (const server of deployment.servers) {
      // Inspection de tous les serveurs
      body += `<br/><h3><font color="${server.status === 'FAILED' ? 'red' : 'green'}">${server.status === 'FAILED' ? 'KO' : 'OK'}</font> : Serveur ${server.name} - <a href="${config.serverLocation}:${config.port}/versions/${version._id}/deployments/${deployment._id}/servers/${server._id}/serverlog">server.log</a></h3>`;
      for (const ear of server.ears) {
        // Inspection de tous les ears du serveur
        body += `<font color="${server.status === 'FAILED' ? 'red' : 'green'}">${server.status === 'FAILED' ? 'KO' : 'OK'}</font> : ${ear.name} - <a href="${ear.url}">Télécharger</a><br/>`;
        // Incrément du nombre d'EAR total
        cptTotal += 1;
        // Incrément du nombre d'EAR total en erreur
        if (ear.status === 'FAILED') cptErrors += 1;
      }
    }
    // Mise à jour du titre avec le total des erreurs
    if (cptErrors > 0) title = `${title} - ${cptErrors}/${cptTotal} KO`;
    else title = `${title} - ${cptTotal}/${cptTotal} OK`;
    // Envoi du mail
    transporter.sendMail({
      from: 'auto-deploy@cloud.com',
      to: version.configuration.mailRecipients,
      subject: title,
      html: body,
    }, (err) => {
      if (err) logger.error('Erreur lors de l\'envoi du mail de rapport d\'opération', err);
    });
  }
};

/**
 * Déploie tous les serveurs d'une version
 * @private
 * @param  {Version}    version    - version à déployer
 * @param  {deployment} deployment - déploiement en cours
 * @return {Promise} rejettée si erreur
 */
const deployServers = (version, deployment) => {
  logger.debugFuncCall(version, deployment);
  return new Promise(async (resolve, reject) => {
    try {
      deployerService.addDeploymentLog('INFO', `Démarrage du déploiement de la version '${version.fullName}'`);
      let status = 'SUCCEED';
      for (const server of version.servers) { /* eslint no-restricted-syntax: 0, no-await-in-loop: 0 */
        // Création du serveur dans le déploiement
        const deploymentServer = await deployment.servers.create({ name: server.name });
        server.ears.forEach(ear => deploymentServer.ears.push({ name: ear }));
        deployment.servers.push(deploymentServer);
        // Envoi de l'ajout du serveur aux clients connectés
        socketIO.emit('deployment-progress', deployment);
        const serverFolder = path.normalize(`${config.deployerFolder}/${version.name}/${server.name}`);
        const deploymentFolder = path.normalize(`${serverFolder}/deployments`);
        // Nettoyage du serveur
        await serverService.cleanServer(deploymentServer, serverFolder);
        // Téléchargement des EARS
        const lastVersionEars = await artifactoryService.downloadLastVersionEars(version.numero, version.snapshot, deploymentServer, deploymentFolder);
        // Attente du déploiement
        const serverStatus = await serverService.deploy(deploymentServer, serverFolder, lastVersionEars);
        deploymentServer.status = serverStatus;
        // Statut global sur le déploiement
        if (serverStatus === 'FAILED') status = 'FAILED';
        logger.debug(`Statut du serveur ${server.name}: ${serverStatus}`);
      }
      deployerService.addDeploymentLog('INFO', `Déploiement de la version '${version.fullName}' terminé ${status === 'SUCCEED' ? 'avec succès' : 'en erreur'}`);
      return resolve(status);
    } catch (err) {
      deployerService.addDeploymentLog('ERROR', `Déploiement de la version '${version.fullName}' terminé en erreur`);
      return reject(new ApiError(err));
    }
  });
};

/**
 * Démarre un déploiement de version
 * @param  {string} deployment - déploiement à exécuter
 * @return {Promise} résolue si ok, rejettée si erreur
 */
const deployVersion = (deployment) => {
  logger.debugFuncCall(deployment);
  return new Promise(async (resolve, reject) => {
    let version;
    try {
      // Recherche de la version à déployer
      version = await Version.findById(deployment.version);
      if (!version.paused) {
        // Enregistre le déploiement courant auprès du service pour éviter les déploiements simultanés
        await deployerService.registerDeployment(deployment);
        // Déploiement de tous les serveurs
        deployment.status = await deployServers(version, deployment);
        // Envoi du mail de résumé
        sendMail(version, deployment);
      } else logger.info(`${version.fullName} en pause => déploiement skippé`);
      // Log du statut final
      resolve();
    } catch (err) {
      deployment.status = 'FAILED';
      logger.error(`Erreur lors de la tentative de déploiement ${deployment ? deployment._id : ''}: ${err.message} - ${err.stack}`);
      deployerService.addDeploymentLog('ERROR', `Erreur lors de la tentative de déploiement: ${err.message}`);
      reject(new ApiError(err));
    }
    // Libération du deployer
    await deployerService.unregisterDeployment();
    // Si un déploiement est en attente on le démarre
    findNextDeployment();
  });
};

/**
 * Recherche le prochain déploiement en attente et le lance
 */
const findNextDeployment = async () => {
  logger.debugFuncCall();
  if (!deployerService.getDeploymentInProgress()) {
    // On va chercher le prochain déploiement en attente
    const next = await Deployment.find({ status: 'PENDING' }, null, { sort: 'date', limit: 1 });
    if (next && next.length > 0) deployVersion(next[0]);
  }
};

/**
 * Initialise toutes les tâches CRON des versions
 */
const initVersionsInterval = async () => {
  logger.debugFuncCall();
  try {
    // Recherche des versions à déployer
    const versions = await Version.find();
    for (const version of versions) {
      // Si un interval est paramétré, lancement du CRON
      if (version.configuration.interval) service.createInterval(version);
    }
    // Interval de lancement automatique des déploiements en attente
    setInterval(() => findNextDeployment(), 2000);
  } catch (err) {
    logger.error('Impossible de lancer une tâche cron', err);
  }
};

/**
 * Supprime les déploiements les plus anciens (6 déploiements sont conservés)
 * @param  {Version} version - version associée au déploiement
 * @return {Promise} réjettée si erreur
 */
const cleanOldDeployments = (version) => {
  logger.debugFuncCall(version);
  return new Promise(async (resolve, reject) => {
    try {
      let deleted = [];
      if (version.deployments.length >= 6) {
        // Trie tous les déploiements par date croissante
        version.deployments.sort((a, b) => {
          if (a.date > b.date) return 1;
          if (a.date < b.date) return -1;
          return 0;
        });
        // Suppression des (taille - 5) déploiements les plus anciens de la version
        deleted = version.deployments.splice(0, version.deployments.length - 5);
        // Suppression des déploiements
        await Deployment.remove({ _id: { $in: deleted } });
        // Envoi des suppressions
        socketIO.emit('deployment-deleted', deleted);
      }
      return resolve(deleted);
    } catch (err) {
      return reject(new ApiError(err));
    }
  });
};

/**
 * Créer un nouveau déploiement
 * @param  {Version} version - version à déployer
 * @return {Promise<Deployment>} résolue avec le nouveau déploiement, rejettée si erreur
 */
const createNewDeployment = (version) => {
  logger.debugFuncCall(version);
  return new Promise(async (resolve, reject) => {
    try {
      // Création du déploiement
      const deployment = await Deployment.create({
        date: new Date(),
        version,
        status: 'PENDING',
      });
      // Ajout du déploiement à la version
      version.deployments.push(deployment._id);
      await version.save();
      resolve(deployment);
      socketIO.emit('deployment-created', deployment);
    } catch (err) {
      return reject(new ApiError(err));
    }
  });
};

/**
 * Arrête le container docker
 * @private
 * @return {Promise} résolue avec le code de sortie de l'arrêt
 */
const stopContainer = () => {
  logger.debugFuncCall();
  return new Promise(async (resolve, reject) => {
    try {
      logger.info('Arrêt du container docker du déploiement');
      // Arrêt du container
      const stopCmd = spawn('sudo', [
        'docker',
        'rm',
        '-f',
        'deployer',
      ]);
      // Suivi de l'arrêt
      stopCmd.stdout.on('data', data => logger.info(`Arrêt du container: ${data.toString()}`));
      stopCmd.stderr.on('data', data => logger.error(`Arrêt du container: ${data.toString()}`));
      stopCmd.on('exit', async (code) => {
        // Log de fin
        if (code === 0) logger.info('Arrêt du container terminé');
        else logger.info('Arrêt du container en erreur');
        resolve(code);
      });
    } catch (err) {
      return reject(new ApiError(err));
    }
  });
};

/**
 * Créé un nouvel interval pour une version
 * @param  {Version} version - version à déployer
 */
service.createInterval = (version) => {
  logger.debugFuncCall(version);
  // Si un interval n'est pas déjà présent pour la version
  if (!intervals.get(version._id)) {
    // Si un cron time existe, on créé l'interval
    if (version.configuration.interval) {
      logger.debug(`Création d'une tâche CRON pour la version '${version._id}' avec l'interval ${version.configuration.interval}`);
      // Création du CRON
      const cronJob = new CronJob({
        cronTime: version.configuration.interval,
        onTick: () => {
          logger.info(`Lancement automatique de la version '${version._id}'`);
          service.validateAndDeploy(version._id);
        },
        start: false,
        timeZone: 'Europe/Paris',
      });
      // Lancement
      cronJob.start();
      // Ajout à la map des CRON en cours
      intervals.set(version._id, cronJob);
    }
  } else logger.warn(`Une tâche CRON existe déjà pour la version ${version._id}`);
};

/**
 * Modifie un interval pour une version
 * @param  {Version} version - version à déployer
 */
service.updateInterval = (version) => {
  logger.debugFuncCall(version);
  const interval = intervals.get(version._id);
  if (interval) {
    // Si un interval existe on le supprime
    interval.stop();
    intervals.delete(version._id);
    logger.debug(`Suppression de la tâche CRON de la version ${version._id}`);
  }
  // Création d'un nouvel interval
  service.createInterval(version);
};

/**
 * Supprime un interval pour une version
 * @param  {Version} version - version à déployer
 */
service.removeInterval = (version) => {
  logger.debugFuncCall(version);
  const interval = intervals.get(version._id);
  if (interval) {
    // Si un interval existe on le supprime
    interval.destroy();
    intervals.delete(version._id);
  }
};

/**
 * Retourne un déploiement
 * @param  {string} idDeployment  - id du déploiement
 * @return {Promise} résolue avec le déploiement, rejettée si erreur
 */
service.getDeployment = (idDeployment) => {
  logger.debugFuncCall(idDeployment);
  return new Promise(async (resolve, reject) => {
    try {
      // On récupère le déploiement en cours
      let deployment = deployerService.getDeploymentInProgress();
      // Si le déploiement demandé n'est pas celui en cours on va chercher en base
      if (!deployment) deployment = await Deployment.findById(idDeployment);
      else if (deployment._id.toString() !== idDeployment) deployment = await Deployment.findById(idDeployment);
      // Si un déploiement a été on le renvoie
      if (deployment) return resolve(deployment);
      // Aucun déploiement trouvé on renvoie une erreur
      return reject(new ApiError('DEPLOYMENT_NOT_FOUND', `Aucun déploiement trouvé avec l'id '${idDeployment}'`));
    } catch (err) {
      return reject(new ApiError(err));
    }
  });
};

/**
 * Annule un déploiement en cours sur arrêt de l'application
 * @return {Promise} rejettée si erreur
 */
service.cancelDeploymentOnShutdown = (dep) => {
  logger.debugFuncCall(dep);
  return new Promise(async (resolve, reject) => {
    let deployment;
    try {
      // On récupère le déploiement
      if (dep) deployment = dep;
      else deployment = await deployerService.getDeploymentInProgress();
      if (deployment) {
        // On récupère la version
        const version = await Version.findById(deployment.version);
        if (version) {
          // Suppression du déploiement de la version
          version.deployments.splice(version.deployments.findIndex(d => d._id === deployment._id), 1);
          await version.save();
          // Suppression du déploiement
          await Deployment.remove({ _id: deployment._id });
          // Arrêt du container docker
          await stopContainer();
          // retour
          return resolve();
        }
        // Aucun déploiement trouvé on renvoie une erreur
        return reject(new ApiError('VERSION_NOT_FOUND', 'La version associée au déploiement n\'a pas été trouvée'));
      }
    } catch (err) {
      return reject(new ApiError(err));
    }
  });
};

/**
 * Annule un déploiement
 * @param  {string} idDeployment  - id du déploiement à annuler
 * @return {Promise} rejettée si erreur
 */
service.cancelDeployment = (idDeployment) => {
  logger.debugFuncCall(idDeployment);
  return new Promise(async (resolve, reject) => {
    try {
      // On récupère le déploiement
      const deployment = await Deployment.findById(idDeployment);
      if (deployment) {
        // Si le déploiement n'est pas en attente, erreur
        if (deployment.status !== 'PENDING' && deployment.status !== 'IN-PROGRESS') return reject(new ApiError('DEPLOYMENT_NOT_PENDING', 'Le déploiement n\'est pas en attente'));
        // Si déploiement en cours, on va restart l'application pour annuler
        const restart = deployment.status === 'IN-PROGRESS';
        // On récupère la version
        const version = await Version.findById(deployment.version);
        if (version) {
          // Suppression du déploiement de la version
          version.deployments.splice(version.deployments.findIndex(d => d._id === deployment._id), 1);
          await version.save();
          // Suppression du déploiement
          await Deployment.remove({ _id: deployment._id });
          // retour
          resolve();
          // Restart de l'application pour annuler tous les traitements en cours
          if (restart) {
            // Arrêt du container docker
            await stopContainer();
            process.exit(0);
          }
        } else {
          // Aucun déploiement trouvé on renvoie une erreur
          return reject(new ApiError('VERSION_NOT_FOUND', 'La version associée au déploiement n\'a pas été trouvée'));
        }
      }
      // Aucun déploiement trouvé on renvoie une erreur
      return reject(new ApiError('DEPLOYMENT_NOT_FOUND', `Aucun déploiement trouvé avec l'id '${idDeployment}'`));
    } catch (err) {
      return reject(new ApiError(err));
    }
  });
};

/**
 * Retourne la log d'un déploiement du serveur
 * @param  {string} idDeployment  - id du déploiement
 * @param  {string} idServer  - id du serveur
 * @return {Promise} résolue la log du déploiement du serveur, rejettée si erreur
 */
service.getServerDeploymentLog = (idDeployment, idServer) => {
  logger.debugFuncCall(idDeployment, idServer);
  return new Promise(async (resolve, reject) => {
    try {
      // On récupère le déploiement en cours
      let deployment = deployerService.getDeploymentInProgress();
      // Si le déploiement demandé n'est pas celui en cours on va chercher en base
      if (!deployment) deployment = await Deployment.findById(idDeployment);
      else if (deployment._id.toString() !== idDeployment) deployment = await Deployment.findById(idDeployment);
      // Si déploiement a été trouvé
      if (deployment) {
        // On récupère le serveur demandé
        const server = deployment.servers.find(srv => srv._id.toString() === idServer);
        // Si on a trouvé le serveur on renvoie la log
        if (server) return resolve(server.logs);
        // Aucun serveur trouvé on renvoie une erreur
        return reject(new ApiError('DEPLOYMENT_SERVER_NOT_FOUND', `Aucun serveur avec l'id '${idServer}' pour le déploiement avec l'id '${idDeployment}'`)); // Pas de déploiement correspondant, on renvoie une erreur
      }
      // Aucun déploiement trouvé on renvoie une erreur
      return reject(new ApiError('DEPLOYMENT_NOT_FOUND', `Aucun déploiement trouvé avec l'id '${idDeployment}'`));
    } catch (err) {
      return reject(new ApiError(err));
    }
  });
};

/**
 * Retourne le chemin du server.log d'un déploiement du serveur
 * @param  {string} idServer  - id du serveur
 * @return {Promise} résolue avec le chemin du server.log du déploiement du serveur, rejettée si erreur
 */
service.getDeploymentLog = (idServer) => {
  logger.debugFuncCall(idServer);
  return new Promise((resolve, reject) => {
    try {
      // Construction du chemin vers le fichier de log archivé
      const logFile = path.join(config.historyFolder, `${idServer}.log`);
      // Si le fichier existe on renvoie le chemin vers le fichier de log archivé
      if (fs.existsSync(logFile)) return resolve(logFile);
      // Le fichier n'existe pas on renvoie une erreur
      return reject(new ApiError('DEPLOYMENT_SERVER_LOG_NOT_FOUND', `Aucun fichier de log trouvé pour le déploiement du serveur '${idServer}'`));
    } catch (err) {
      return reject(new ApiError(err));
    }
  });
};

/**
 * Valide et démarre un déploiement de version
 * @param {string} idVersion - id de la version à déployer
 * @param {[boolean]} immediate - flag qui indique si le lancement doit se faire à la suite de la création
 * @return {Promise} résolue si ok, rejettée si erreur
 */
service.validateAndDeploy = (idVersion, immediate) => {
  logger.debugFuncCall(idVersion);
  return new Promise(async (resolve, reject) => {
    let version;
    let deployment;
    try {
      // Récupération de la version à déployer
      version = await Version.findById(idVersion);
      if (!version) return reject(new ApiError('VERSION_NOT_FOUND', `Aucune version trouvée avec l'id '${idVersion}'`));
      // Si la version est en pause on ne déploie pas
      if (version.paused) return reject(new ApiError('VERSION_PAUSED', `La version '${version.fullName}' est en pause`));
      // Si il y a au moins 6 déploiements on supprime le(s) plus ancien(s)
      const deleted = await cleanOldDeployments(version);
      // Création du nouveau déploiement
      deployment = await createNewDeployment(version);
      // On rend la main tout de suite
      resolve({
        deleted,
        deployment,
      });
      // On lance le déploiement si demandé
      if (immediate) findNextDeployment();
    } catch (err) {
      service.cancelDeploymentOnShutdown(deployment);
      return reject(new ApiError(err));
    }
  });
};

// Création de tous les CRONs au lancement de l'application
initVersionsInterval();

module.exports = service;
