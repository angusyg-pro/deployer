/**
 * @fileoverview Service de gestion du serveur de socket
 * @module lib/socketio
 * @requires {@link external:socket.io}
 * @requires lib/logger
 */

const socketIO = require('socket.io');
const logger = require('./logger');

const service = {};
let io;

/**
 * Ouvre un serveur socket.io sur le serveur en paramètre
 * @param {HTTPServer} server - serveur applicatif
 */
service.setServer = (server) => {
  io = socketIO(server);
  io.on('connection', () => logger.info('Serveur Socket.io à l\'écoute'));
};

/**
 * Emet un evènement
 * @param  {Event}  event     - nom de l'évènement à envoyer
 * @param  {object} parameter - données à envoyer
 */
service.emit = (event, parameter) => {
  io.emit(event, parameter);
};

module.exports = service;
