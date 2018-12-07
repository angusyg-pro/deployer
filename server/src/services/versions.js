/**
 * @fileoverview Version service
 * @module services/versions
 * @requires {@link external:path}
 * @requires {@link external:fs-extra}
 * @requires {@link external:cron}
 * @requires lib/errors
 * @requires models/version
 * @requires models/deployment
 * @requires lib/logger
 * @requires config/app
 * @requires services/deployments
 */

const path = require('path');
const fs = require('fs-extra');
const { CronTime } = require('cron');
const { ApiError } = require('../lib/errors');
const Version = require('../models/version');
const Deployment = require('../models/deployment');
const logger = require('../lib/logger');
const config = require('../config/app');
const deploymentService = require('./deployments');

const service = {};

/**
 * Retourne le chemin du dossier de déploiement d'une version donnée
 * @private
 * @param  {string}   name      - nom de la version
 * @return {string} chemin du dossier de déploiement de la version
 */
const getVersionDeploymentFolder = name => path.normalize(`${config.deployerFolder}/${name}`);

/**
 * Vérifie si une version existe
 * @private
 * @param  {string}   name      - nom de la version
 * @param  {string}   id        - id de la version à vérifier
 * @return {string} résolue avec le nouveau dossier de la version, rejected with code string if version or folder already exists
 */
const checkExistingVersion = (name, id) => {
  logger.debugFuncCall(name, id);
  return new Promise(async (resolve, reject) => {
    try {
      // Recherche de la version
      const version = await Version.findOne({ name });
      // Vérifie si le dossier de déploiement de la version
      const versionFolder = await getVersionDeploymentFolder(name);
      // Seulement si la version change d'état (SNAPSHOT)
      if (version && name !== version.name) {
        // Vérifie si la version existe
        if (!id || id !== version._id.toString()) return reject(new ApiError('EXISTING_VERSION', `Une version existe déjà avec le nom '${version.fullName}'`));
        if (fs.existsSync(versionFolder)) return reject(new ApiError('EXISTING_VERSION_FOLDER', `Un dossier de déploiement existe déjà avec ce nom de version '${name}'`));
      }
      return resolve(versionFolder);
    } catch (err) {
      return reject(new ApiError(err));
    }
  });
};

/**
 * Liste toutes les versions
 * @return {Promise} résolue avec la liste des versions, rejettée si erreur
 */
service.list = () => {
  logger.debugFuncCall();
  return new Promise(async (resolve, reject) => {
    try {
      // Recherche et alimentation des déploiements de toutes les versions
      const versions = await Version.find().populate('deployments').exec();
      return resolve(versions);
    } catch (err) {
      return reject(new ApiError(err));
    }
  });
};

/**
 * Met une pause une version
 * @param  {string} id - id de la version à mettre en pause
 * @return {Promise} rejettée si erreur
 */
service.pause = (id) => {
  logger.debugFuncCall(id);
  return new Promise(async (resolve, reject) => {
    try {
      // Recherche de la version avec son id et mise à jour de son statut à en pause
      await Version.findOneAndUpdate(id, { paused: true });
      return resolve();
    } catch (err) {
      return reject(new ApiError(err));
    }
  });
};

/**
 * Met une pause toutes les versions actives
 * @return {Promise} résolue avec la liste de versions mises en pause, rejettée si erreur
 */
service.pauseAll = () => {
  logger.debugFuncCall();
  return new Promise(async (resolve, reject) => {
    try {
      // Objet de retour, regroupant les versions mises en pause et celles en erreur
      const results = {
        ok: [],
        errors: [],
      };
      // Récupération des versions actives
      const paused = await Version.find({ paused: false });
      // Si aucune version active on sort
      if (!paused) return resolve(results);
      // Pour chaque version active on update son statut
      for (const p of paused) {
        p.paused = true;
        try {
          // Enregistrement de la modification
          await p.save();
          // Ajout aux résultats OK
          results.ok.push(p);
        } catch (err) {
          // Si erreur on catch et on ne fait pas planter pour passer aux versions suivantes
          logger.error(`Erreur lors de la mise en pause de la version '${p._id}'`);
          // Ajout aux résultats KO
          results.errors.push(p);
        }
      }
      return resolve(results);
    } catch (err) {
      return reject(new ApiError(err));
    }
  });
};

/**
 * Active une version en pause
 * @param  {string} id - id de la version à mettre en pause
 * @return {Promise} rejettée si erreur
 */
service.unpause = (id) => {
  logger.debugFuncCall(id);
  return new Promise(async (resolve, reject) => {
    try {
      // Recherche de la version avec son id et mise à jour de son statut à active
      await Version.findOneAndUpdate(id, { paused: false });
      return resolve();
    } catch (err) {
      return reject(new ApiError(err));
    }
  });
};

/**
 * Active toutes les versions en pause
 * @return {Promise} résolue avec la liste de versions mactivées, rejettée si erreur
 */
service.unpauseAll = () => {
  logger.debugFuncCall();
  return new Promise(async (resolve, reject) => {
    try {
      // Objet de retour, regroupant les versions mises en pause et celles en erreur
      const results = {
        ok: [],
        errors: [],
      };
      // Récupération des versions en pause
      const unpaused = await Version.find({ paused: true });
      // Si aucune version en pause on sort
      if (!unpaused) return resolve(results);
      // Pour chaque version en pause on update son statut
      for (const u of unpaused) {
        u.paused = false;
        try {
          // Enregistrement de la modification
          await u.save();
          // Ajout aux résultats OK
          results.ok.push(u);
        } catch (err) {
          // Si erreur on catch et on ne fait pas planter pour passer aux versions suivantes
          logger.error(`Erreur lors de l'activation de la version '${u._id}'`);
          // Ajout aux résultats KO
          results.errors.push(u);
        }
      }
      return resolve(results);
    } catch (err) {
      return reject(new ApiError(err));
    }
  });
};

/**
 * Ajoute une version
 * @param  {Version} newVersion - version à ajouter
 * @return {Promise} résolue avec la nouvelle version, rejettée si erreur
 */
service.addVersion = (newVersion) => {
  logger.debugFuncCall(newVersion);
  return new Promise(async (resolve, reject) => {
    try {
      // Vérification de la possiblité de créer la version
      const versionFolder = await checkExistingVersion(newVersion.name, newVersion.snapshot);
      // Version initiale
      const version = {
        servers: [],
        name: newVersion.name,
        numero: newVersion.numero,
        snapshot: newVersion.snapshot,
        configuration: {
          mailRecipients: [],
          artifactoryUrl: config.artifactoryUrl,
          interval: '',
          mailMode: 'ALWAYS',
        },
      };
      if (newVersion.from) {
        // Récupération de la version de base
        const fromVersion = await Version.findById(newVersion.from);
        if (fromVersion) {
          // Copie de la configuration de la version de base
          version.configuration = {
            artifactoryUrl: fromVersion.configuration.artifactoryUrl,
            interval: fromVersion.configuration.interval,
            mailRecipients: fromVersion.configuration.mailRecipients,
            mailMode: fromVersion.configuration.mailMode,
          };
          // Copie de tous les serveurs
          fromVersion.servers.forEach((server) => {
            const srv = {
              ears: [],
              name: server.name,
            };
            // Copie de tous les ears du serveur
            server.ears.forEach(ear => srv.ears.push(ear));
            version.servers.push(srv);
          });
          // Copie du répertoire de déploiement de la version de base
          fs.copySync(getVersionDeploymentFolder(fromVersion.name), versionFolder);
        } else return reject(new ApiError('COPY_VERSION_NOT_FOUND', 'La version à copiée n\'a pas été trouvée'));
      } else {
        // Création du dossier de déploiement
        fs.mkdirSync(versionFolder);
      }
      // Enregistrement de la nouvelle version;
      const newV = await Version.create(version);
      resolve(newV);
      // Si un interval a été donné, on ajoute la tâche CRON
      if (newV.configuration.interval) deploymentService.createInterval(version);
    } catch (err) {
      return reject(new ApiError(err));
    }
  });
};

/**
 * Supprime une version (et ses déploiements)
 * @param  {string} id - id de la version à supprimer
 * @return {Promise} rejettée si erreur
 */
service.deleteVersion = (id) => {
  logger.debugFuncCall(id);
  return new Promise(async (resolve, reject) => {
    try {
      // Recherche de la version avec son id
      const version = await Version.findById(id);
      if (version) {
        // Suppression de tous les déploiements de la version
        await Deployment.remove({ _id: { $in: version.deployments } });
        // Suppression du dossier de déploiement de la version
        const folder = await getVersionDeploymentFolder(version.name);
        fs.emptyDirSync(folder);
        fs.rmdirSync(folder);
        // Suppression de la version
        await version.remove();
        resolve();
        // Suppression de la tâche CRON si elle existe
        return deploymentService.removeInterval(version);
      }
      // Version non trouvée, on renvoie une erreur
      return reject(new ApiError('VERSION_NOT_FOUND', `Aucune version trouvée avec l'id '${id}'`));
    } catch (err) {
      return reject(new ApiError(err));
    }
  });
};

/**
 * Modifie une version
 * @param  {string} id      - id de la version à supprimer
 * @param  {string} version - version à modifier
 * @return {Promise} résolue avec la nouvelle version, rejettée si erreur
 */
service.updateVersion = (id, version) => {
  logger.debugFuncCall(id, version);
  return new Promise(async (resolve, reject) => {
    try {
      // Si un interval est présent on le valide
      if (version.configuration.interval) {
        try {
          // Test du format de l'interval
          // eslint-disable-next-line no-new
          new CronTime(version.configuration.interval);
        } catch (err) {
          return reject(new ApiError('BAD_INTERVAL_FORMAT', 'Le format de l\'interval n\'est pas valide'));
        }
      }
      // Vérification de la possiblité de créer la version (nom valide)
      const versionFolder = await checkExistingVersion(version.name, id);
      // Récupération de la version à modifier
      let v = await Version.findById(id);
      if (v) {
        const oldVersionFolder = await getVersionDeploymentFolder(v.name);
        if (versionFolder !== oldVersionFolder) {
          // Nouveau dossier de déploiement suite à changement de nom de version
          fs.renameSync(oldVersionFolder, versionFolder);
        }
        // Enregistrement de la modification de la version
        v = await Version.findByIdAndUpdate(id, version);
        // On ajoute la tâche CRON
        deploymentService.updateInterval(version);
        resolve();
      } else return reject(new ApiError('VERSION_NOT_FOUND', `Aucune version trouvée avec l'id '${id}'`));
    } catch (err) {
      return reject(new ApiError(err));
    }
  });
};

module.exports = service;
