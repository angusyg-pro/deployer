/**
 * @fileoverview Configuration de la base de donnée
 * @module config/db
 * @requires {@link external:mongoose}
 * @requires lib/logger
 */

const mongoose = require('mongoose');
const logger = require('../lib/logger');

/**
 * URL de la base de donnée
 * @type {string}
 * @default 127.0.0.1:27017
 */
const server = process.env.DB_URL || '127.0.0.1:27017';

/**
 * Nom de la base de donnée
 * @type {string}
 * @default deployer
 */
const database = process.env.DB_NAME || 'deployer';

// Surcharge la Promise par défaut de mongoose avec la Promise standard de Node
mongoose.Promise = Promise;

/**
 * Connecte lapplication à la base de données MongoDB
 * @function connect
 * @returns {Promise} résolue si connexion ok, rejéttée sinon
 */
const connect = () => new Promise((resolve, reject) => {
  mongoose.connect(`mongodb://${server}/${database}`, { useNewUrlParser: true })
    .then(() => {
      logger.info(`Connection opened to DB 'mongodb://${server}/${database}'`);
      resolve(mongoose.connection);
    })
    .catch((err) => {
      logger.fatal(`Error during DB connection : ${JSON.stringify(err)}`);
      reject(err);
    });
});

module.exports = { connect };
