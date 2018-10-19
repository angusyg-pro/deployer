/**
 * @fileoverview Service de gestion du deployer
 * @module services/deployer
 * @requires models/deployment
 * @requires lib/socket.io
 * @requires lib/logger
 */

const Deployment = require('../models/deployment');
const socketIO = require('../lib/socketio');
const logger = require('../lib/logger');

let currentDeployment = null;
const service = {};

/**
 * Ajoute une ligne de log au déploiement courant
 * @param {string} level   - niveau de la log
 * @param {string} message - message à logger
 * @param {server} server  - serveur associé à la log
 */
service.addDeploymentLog = (level, message, server) => {
  let msg = message;
  if (currentDeployment && server) {
    // Ajout de la log au serveur
    currentDeployment.addServerLog(level, msg, server);
    // Envoie du nouveau serveur aux clients connectés
    socketIO.emit('deployment-server-progress', { deployment: currentDeployment, server });
    // Ajout de l'entête pour la log du déploiement
    msg = `[SERVEUR:${server.name}] - ${msg}`;
  }
  // En developpement ou si aucun déploiement en cours on log simplement en console
  if (process.env.NODE_ENV !== 'production' || !currentDeployment) logger[level.toLowerCase()](msg);
  if (currentDeployment) {
    // Ajout de la log au déploiement
    currentDeployment.addLog(level, msg);
    // Envoie du nouveau déploiement aux clients connectés
    socketIO.emit('deployment-progress', currentDeployment);
  }
};

/**
 * Renvoie le déploiement en cours
 * @return {Deployment} le déploiement en cours, null sinon
 */
service.getDeploymentInProgress = () => currentDeployment;

/**
 * Termine et enregistre le déploiement en cours
 */
service.unregisterDeployment = async () => {
  logger.debug(`Sauvegarde du déploiement ${JSON.stringify(currentDeployment)}`);
  // Si un déploiement était en cours on le sauvegarde
  if (currentDeployment) {
    await currentDeployment.save();
    // Envoi de la fin du déploiement aux clients connectés
    socketIO.emit('deployment-finished', currentDeployment);
  }
  currentDeployment = null;
};

/**
 * Ajoute le déploiement au contexte local
 * @param {Deployment} deployment - déploiement à ajouter
 */
service.registerDeployment = deployment => new Promise(async (resolve) => {
  logger.debug(`Lancement d'un nouveau déploiement ${JSON.stringify(deployment)}`);
  // Inscription du déploiement
  currentDeployment = deployment;
  // Changement du statut du déploiement PENDING -> IN-PROGRESS
  currentDeployment.status = 'IN-PROGRESS';
  await currentDeployment.save();
  // Envoie du nouveau déploiement aux clients connectés
  socketIO.emit('deployment-started', currentDeployment);
  resolve();
});

module.exports = service;
