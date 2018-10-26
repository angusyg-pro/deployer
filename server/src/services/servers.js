/**
 * @fileoverview Service de gestion des serveurs
 * @module services/servers
 * @requires {@link external:child_process}
 * @requires {@link external:path}
 * @requires {@link external:fs-extra}
 * @requires {@link external:multer}
 * @requires {@link external:mongoose}
 * @requires config/app
 * @requires services/deployer
 * @requires models/version
 * @requires models/deployment
 * @requires lib/logger
 * @requires lib/errors
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs-extra');
const multer = require('multer');
const config = require('../config/app');
const deployerService = require('./deployer');
const Version = require('../models/version');
const logger = require('../lib/logger');
const { ApiError } = require('../lib/errors');

const service = {};

/**
 * Retourne le chemin du dossier de déploiement d'un serveur pour une version donnée
 * @private
 * @param  {string}   name      - nom de la version
 * @param  {string}   server    - nom du serveur
 * @return {string} chemin du dossier de déploiement du serveur
 */
const getServerDeploymentFolder = (name, server) => path.normalize(`${config.deployerFolder}/${name}/${server}`);

// Configuration de multer pour stockage disque
const storage = multer.diskStorage({
  filename: (req, file, cb) => cb(null, 'standalone.xml'),
  destination: (req, file, cb) => {
    Version.findById(req.params.idVersion)
      .then((version) => {
        if (version) {
          // Récupération du serveur associé au stockage
          const server = version.servers.find(srv => srv._id.toString() === req.params.idServer);
          // Si aucun serveur n'est trouvé on renvoie une erreur
          if (!server) return cb(new ApiError('SERVER_NOT_FOUND', `Aucun serveur trouvé avec l'id '${req.params.idServer}' pour la version '${version.fullName}'`));
          // Construction du chemin vers le dossier de configuration du serveur
          const standalonePath = path.join(`${getServerDeploymentFolder(version.name, server.name)}`, 'configuration');
          return cb(null, standalonePath);
        }
        // Version non trouvée
        return cb(new ApiError('VERSION_NOT_FOUND', `Aucune version trouvée avec l'id '${req.params.idVersion}'`));
      })
      .catch(err => cb(new ApiError(err)));
  },
});

// Récupération d'un service d'upload multer
const upload = multer({ storage }).single('file');

/**
 * Supprime un EAR du serveur en paramètre
 * @param {string} idVersion - id de la version
 * @param {string} idServer  - id du serveur
 * @param {string} earName   - nom de l'EAR à supprimer
 * @return {Promise} rejettée si erreur
 */
service.removeEarFromServer = (idVersion, idServer, earName) => {
  logger.debugFuncCall(idVersion, idServer, earName);
  return new Promise(async (resolve, reject) => {
    try {
      // Recherche de la version
      const version = await Version.findById(idVersion);
      if (version) {
        // Recherche du serveur à supprimer dans la version
        const server = version.servers.find(srv => srv._id.toString() === idServer);
        // Recherche de l'EAR à supprimer dans le serveur
        const index = server.ears.indexOf(earName);
        // Si aucun EAR trouvé on renvoie une erreur
        if (index === -1) return reject(new ApiError('EAR_NOT_FOUND', `Aucun EAR trouvé avec le nom '${earName}' pour le serveur '${server.name}' de la version '${version.fullName}'`));
        // Suppression de l'EAR
        server.ears.splice(index, 1);
        // Enregistrement de la modification de la version
        await version.save();
        return resolve();
      }
      return reject(new ApiError('VERSION_NOT_FOUND', `Aucune version trouvée avec l'id '${idVersion}'`));
    } catch (err) {
      return reject(new ApiError(err));
    }
  });
};

/**
 * Ajoute un serveur
 * @param {string} idVersion  - id de la version
 * @param {string} server     - nom du serveur
 * @return {Promise} résolue avec le nouveau serveur, rejettée si erreur
 */
service.addServer = (idVersion, server) => {
  logger.debugFuncCall(idVersion, server);
  return new Promise(async (resolve, reject) => {
    try {
      // Recherche de la version
      const version = await Version.findById(idVersion);
      if (version) {
        // Recherche d'un serveur existant avec le nouveau nom de serveur
        const existing = version.servers.findIndex(s => s.name === server.name);
        // Si un serveur existe déjà avec ce nom on renvoie une erreur
        if (existing > -1) return reject(new ApiError('EXISTING_SERVER', `Un serveur existe déjà avec le nom '${server.name}' pour la version '${version.fullName}'`));
        // Si un dossier de déploiement existe déjà on renvoie une erreur
        const serverFolder = await getServerDeploymentFolder(version.name, server.name);
        if (fs.existsSync(serverFolder)) return reject(new ApiError('EXISTING_SERVER_FOLDER', `Un dossier de serveur existe déjà avec le nom '${server.name}' pour la version '${version.fullName}'`));
        // Création du dossier de déploiement du nouveau serveur (copie du dossier de template)
        fs.copySync(config.serverTemplateFolder, serverFolder);
        // Ajout du nouveau serveur à la version associée
        version.servers.push({ name: server.name });
        // Enregistrement de la modification de la version
        const v = await version.save();
        return resolve(v.servers.find(srv => srv.name === server.name));
      }
      // Version non trouvée
      return reject(new ApiError('VERSION_NOT_FOUND', `Aucune version trouvée avec l'id '${idVersion}'`));
    } catch (err) {
      return reject(new ApiError(err));
    }
  });
};

/**
 * Supprime un serveur
 * @param {string} idVersion - id de la version
 * @param {string} idServer  - id du serveur
 * @return {Promise} rejettée si erreur
 */
service.removeServer = (idVersion, idServer) => {
  logger.debugFuncCall(idVersion, idServer);
  return new Promise(async (resolve, reject) => {
    try {
      // Recherche de la version
      const version = await Version.findById(idVersion);
      if (version) {
        // Recherche du serveur à supprimer dans la version
        const index = version.servers.findIndex(srv => srv._id.toString() === idServer);
        // Si aucun serveur trouvé on renvoie une erreur
        if (index === -1) return reject(new ApiError('SERVER_NOT_FOUND', `Aucun serveur trouvé avec l'id '${idServer}' pour la version '${version.fullName}'`));
        // Suppression du dossier de déploiement du serveur
        const folder = await getServerDeploymentFolder(version.name, version.servers[index].name);
        fs.removeSync(folder);
        // Suppression du serveur de la version
        version.servers.splice(index, 1);
        // Enregistrement de la modification de la version
        await version.save();
        return resolve();
      }
      return reject(new ApiError('VERSION_NOT_FOUND', `Aucune version trouvée avec l'id '${idVersion}'`));
    } catch (err) {
      return reject(new ApiError(err));
    }
  });
};

/**
 * Ajoute un EAR à un serveur
 * @param {string} idVersion - id de la version
 * @param {string} idServer  - id du serveur
 * @param {string} earName   - nom de l'EAR à ajouter
 * @return {Promise} resolved with new server, rejected on error
 */
service.addEarToServer = (idVersion, idServer, ear) => {
  logger.debugFuncCall(idVersion, idServer, ear);
  return new Promise(async (resolve, reject) => {
    try {
      // Recherche de la version
      const version = await Version.findById(idVersion);
      if (version) {
        // Recherche du serveur auquel ajouter l'EAR
        const server = version.servers.find(srv => srv._id.toString() === idServer);
        if (server) {
          // Recherche de l'index de l'EAR à supprimer
          const earIndex = server.ears.indexOf(ear.ear);
          // Si un EAR avec le même nom a été trouvé on renvoie une erreur
          if (earIndex > -1) return reject(new ApiError('EXISTING_EAR', `Un EAR existe déjà avec le nom '${ear.ear}' pour le serveur '${server.name}' de la version '${version.fullName}'`));
          // Ajout de l'EAR au serveur
          server.ears.push(ear.ear);
          // Enregistrement de la modification de la version
          await version.save();
          return resolve();
        }
        // Serveur non trouvé
        return reject(new ApiError('SERVER_NOT_FOUND', `Aucun serveur trouvé avec l'id '${idServer}' pour la version '${version.fullName}'`));
      }
      // Version non trouvée
      return reject(new ApiError('VERSION_NOT_FOUND', `Aucune version trouvée avec l'id '${idVersion}'`));
    } catch (err) {
      return reject(new ApiError(err));
    }
  });
};

/**
 * Démarre un serveur JBoss
 * @private
 * @param {Server} server       - serveur à démarrer
 * @param {string} serverFolder - dossier du serveur
 * @return {Promise} résolue avec le code de sortie du lancement
 */
const start = (server, serverFolder) => {
  logger.debugFuncCall(server, serverFolder);
  return new Promise((resolve, reject) => {
    try {
      deployerService.addDeploymentLog('INFO', 'Démarrage du serveur', server);
      // Environnement de test windows sans docker on ne lance pas de serveur
      if (process.env.LOCAL_DEPLOYMENT) return resolve(0);
      // Lancement du serveur
      const startCmd = spawn('sudo', [
        'docker',
        'run',
        '-d',
        '--name',
        'deployer',
        '-v',
        `${path.join(serverFolder, 'configuration')}:/opt/jboss/eap-6.4.17/standalone/configuration`,
        '-v',
        `${path.join(serverFolder, 'deployments')}:/opt/jboss/eap-6.4.17/standalone/deployments`,
        '-v',
        `${path.join(serverFolder, 'log')}:/opt/jboss/eap-6.4.17/standalone/log`,
        'jboss:6.4.17',
      ], { cwd: serverFolder });
      // Log de suivi
      startCmd.stdout.on('data', data => deployerService.addDeploymentLog('INFO', data.toString(), server));
      startCmd.stderr.on('data', data => deployerService.addDeploymentLog('ERROR', data.toString(), server));
      startCmd.on('exit', (code) => {
        // Log de fin
        if (code === 0) deployerService.addDeploymentLog('INFO', 'Démarrage du serveur terminé', server);
        else deployerService.addDeploymentLog('INFO', 'Démarrage du serveur en erreur', server);
        return resolve(code);
      });
    } catch (err) {
      return reject(new ApiError(err));
    }
  });
};

/**
 * Nettoie les dossiers du serveur de déploiement et archive le fichier de log (server.log)
 * @private
 * @param {Server} server       - serveur à arrêter
 * @param {string} serverFolder - dossier du serveur
 * @return {Promise} rejettée si erreur
 */
const cleanServer = (server, serverFolder) => {
  logger.debugFuncCall(server, serverFolder);
  return new Promise(async (resolve, reject) => {
    try {
      // Suppression de tous les fichiers du dossier de déploiement
      const deploymentFolder = path.join(serverFolder, 'deployments');
      const files = fs.readdirSync(deploymentFolder);
      for (const file of files) {
        // On supprime tous les fichiers sauf le rar webmethods
        if (file !== 'webm-jmsra.rar') fs.removeSync(path.join(deploymentFolder, file));
      }
      // Copie du server.log du déploiement
      const logFolder = path.join(serverFolder, 'log');
      const serverLog = path.join(logFolder, 'server.log');
      // Archivage du server.log
      if (fs.existsSync(serverLog)) fs.copySync(serverLog, path.join(config.historyFolder, `${server._id}.log`));
      // Nettoyage du dossier de log du serveur
      fs.emptyDirSync(logFolder);
      return resolve();
    } catch (err) {
      return reject(new ApiError(err));
    }
  });
};

/**
 * Arrête un serveur JBoss
 * @private
 * @param {Server} server       - serveur à arrêter
 * @param {string} serverFolder - dossier du serveur
 * @param {boolean} forced      - flag indiquant si l'arrêt est forcé (timeout)
 * @return {Promise} résolue avec le code de sortie de l'arrêt
 */
const stop = (server, serverFolder, forced) => {
  logger.debugFuncCall(server, serverFolder);
  return new Promise(async (resolve, reject) => {
    try {
      deployerService.addDeploymentLog('INFO', `Arrêt ${forced ? 'forcé' : ''} du serveur`, server);
      if (process.env.LOCAL_DEPLOYMENT) {
        // Environnement de test windows sans docker on n'arrête pas de serveur
        // Nettoyage du serveur
        await cleanServer(server, serverFolder);
        return resolve(0);
      }
      // Arrêt du serveur
      const stopCmd = spawn('sudo', [
        'docker',
        'rm',
        '-f',
        'deployer',
      ], { cwd: serverFolder });
      // Suivi du déploiement
      stopCmd.stdout.on('data', data => deployerService.addDeploymentLog('INFO', `Nom du container: ${data.toString()}`, server));
      stopCmd.stderr.on('data', data => deployerService.addDeploymentLog('ERROR', data.toString(), server));
      stopCmd.on('exit', async (code) => {
        // Log de fin
        if (code === 0) deployerService.addDeploymentLog('INFO', `Arrêt ${forced ? 'forcé' : ''} du serveur terminé`, server);
        else deployerService.addDeploymentLog('INFO', `Arrêt ${forced ? 'forcé' : ''} du serveur en erreur`, server);
        // Nettoyage du serveur
        await cleanServer(server, serverFolder);
        resolve(code);
      });
    } catch (err) {
      return reject(new ApiError(err));
    }
  });
};

/**
 * Vérifie le statut d'un EAR
 * @private
 * @param  {string} earPath - path de l'EAR à vérifier
 * @return {string} SUCCEED si ok, FAILED si erreur, IN-PROGRESS si en cours
 */
const checkEARStatus = (earPath) => {
  logger.debugFuncCall(earPath);
  if (fs.existsSync(`${earPath}.deployed`)) return 'SUCCEED';
  if (fs.existsSync(`${earPath}.failed`)) return 'FAILED';
  return 'IN-PROGRESS';
};

/**
 * Démarre un serveur JBoss
 * @private
 * @param {Server} server           - serveur à démarrer
 * @param {string} lastVersionEars  - données des EAR
 * @return {Promise} résolue avec le code de sortie du lancement
 */
const checkServerStatus = (server, lastVersionEars) => {
  logger.debugFuncCall(server, lastVersionEars);
  return new Promise((resolve) => {
    try {
      deployerService.addDeploymentLog('INFO', 'Attente de la fin du déploiement', server);
      let serverStatus = 'SUCCEED';
      // Interval entre 2 vérification de statut d'EAR
      const intervalMilliseconds = 2000;
      // Timeout avant arrêt forcé
      let beforeTimeout = 180000;
      // On vérifie toutes les 2s si les EARs ont fini leur déploiement
      const interval = setInterval((srv, lv) => {
        try {
          let keep = false;
          // Pour chaque EAR on va vérifier si un fichier de statut est présent
          for (const ear of srv.ears) { /* eslint no-restricted-syntax: 0 */
            if (ear.status === 'IN-PROGRESS') {
              // Si l'EAR est en cours de déploiement, on vérifie son statut
              const status = checkEARStatus(lv.get(ear.name).path);
              switch (status) {
                case 'SUCCEED':
                  ear.status = 'SUCCEED';
                  deployerService.addDeploymentLog('INFO', `Ear '${ear.name}' déployé avec succès`, server);
                  break;
                case 'FAILED':
                  ear.status = 'FAILED';
                  deployerService.addDeploymentLog('ERROR', `Ear '${ear.name}' en erreur`, server);
                  serverStatus = 'FAILED';
                  break;
                case 'IN-PROGRESS':
                  keep = true;
                  break;
                default:
                  throw new Error(`Valeur inconnue pour le status: ${status}`);
              }
            }
          }
          if (!keep) {
            // Si tous les EAR ont terminé leur déploiement, on arrête d'attendre
            clearInterval(interval);
            // Renvoie du statut du serveur
            return resolve(serverStatus);
          }
          beforeTimeout -= intervalMilliseconds;
          if (beforeTimeout < 0) {
            // Log deploiement
            deployerService.addDeploymentLog('ERROR', 'Timeout lors du deploiement du serveur', server);
            // Arrêt de l'attente du déploiement
            clearInterval(interval);
            // Renvoie du statut du serveur en timeout
            return resolve('SERVER_DEPLOYMENT_TIMEOUT');
          }
        } catch (err) {
          // Log deploiement
          deployerService.addDeploymentLog('ERROR', `Erreur lors de la vérification du statut des EAR du serveur: ${err.message}`, server);
          // Arrêt de l'attente du déploiement
          clearInterval(interval);
          // Renvoie du statut du serveur en erreur
          return resolve('FAILED');
        }
      }, intervalMilliseconds, server, lastVersionEars);
    } catch (err) {
      // Log deploiement
      deployerService.addDeploymentLog('ERROR', `Erreur lors de l'attente du déploiement du serveur: ${err.message}`, server);
      // Renvoie du statut du serveur en erreur
      return resolve('FAILED');
    }
  });
};

/**
 * Retourne le chemin du standalone.xml d'un serveur
 * @param  {string} idVersion - id de la version
 * @param  {string} idServer  - id du serveur
 * @return {Promise} résolue avec le chemin du standalone.xml du serveur, rejettée si erreur
 */
service.getServerStandalone = (idVersion, idServer) => {
  logger.debugFuncCall(idVersion, idServer);
  return new Promise(async (resolve, reject) => {
    try {
      const version = await Version.findById(idVersion);
      if (version) {
        // Récupération du serveur
        const server = version.servers.find(srv => srv._id.toString() === idServer);
        // Si aucun serveur n'est trouvé on renvoie une erreur
        if (!server) return reject(new ApiError('SERVER_NOT_FOUND', `Aucun serveur trouvé avec l'id '${idServer}' pour la version '${version.fullName}'`));
        // Récupération du dossier du serveur
        const folder = await getServerDeploymentFolder(version.name, server.name);
        // Vérification de l'existence du fichier standalone.xml du serveur
        const standalonePath = path.join(`${folder}`, 'configuration/standalone.xml');
        if (!fs.existsSync(standalonePath)) return reject(new ApiError('SERVER_STANDALONE_NOT_FOUND', `Aucun standalone.xml trouvé pour le serveur '${server.name}' à l'emplacement '${standalonePath}'`));
        return resolve(standalonePath);
      }
      // Version non trouvée
      return reject(new ApiError('VERSION_NOT_FOUND', `Aucune version trouvée avec l'id '${idVersion}'`));
    } catch (err) {
      return reject(new ApiError(err));
    }
  });
};

/**
 * Modifie le standalone.xml d'un serveur
 * @param  {external:Request}  req  - requête reçue
 * @param  {external:Response} res  - réponse à envoyer
 * @return {Promise} rejettée si erreur
 */
service.postServerStandalone = (req, res) => new Promise((resolve, reject) => {

  // Extrait le fichier envoyé et le sauvegarde sur le disque
  upload(req, res, (err) => {
    if (err) return reject(new ApiError(err));
    return resolve();
  });
});

/**
 * Démarre un serveur JBoss
 * @param {Server} server                       - serveur à déployer
 * @param {string} serverFolder                 - dossier du serveur
 * @param {Map<string, object>} lastVersionEars - versions des EARs
 * @return {Promise} résolue avec le statut du déploiement
 */
service.deploy = (server, serverFolder, lastVersionEars) => {
  logger.debugFuncCall(server, serverFolder, lastVersionEars);
  return new Promise(async (resolve) => {
    try {
      // Démarrage du serveur
      await start(server, serverFolder);
      const status = await checkServerStatus(server, lastVersionEars, serverFolder);
      // Arrêt du serveur
      await stop(server, serverFolder, status === 'SERVER_DEPLOYMENT_TIMEOUT');
      // Renvoie du statut du serveur
      return resolve(status === 'SERVER_DEPLOYMENT_TIMEOUT' ? 'FAILED' : status);
    } catch (err) {
      // Log deploiement
      deployerService.addDeploymentLog('ERROR', `Erreur lors du déploiement: ${err.message}`, server);
      // Renvoie du statut du serveur en erreur
      return resolve('FAILED');
    }
  });
};

module.exports = service;
