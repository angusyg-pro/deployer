/**
 * @fileoverview Service de gestion du proxy
 * @module lib/proxy
 * @requires {@link external:request}
 * @requires {@link external:tcp-ping}
 * @requires {@link external:util}
 * @requires config/app
 * @requires lib/errors
 * @requires lib/logger
 */

const request = require('request');
const tcpp = require('tcp-ping');
const util = require('util');
const config = require('../config/app');
const { ApiError } = require('./errors');
const logger = require('./logger');

const ping = util.promisify(tcpp.ping);

const service = {};

/**
 * Retourne une requête proxifiée
 * @private
 * @return {Promise} résolue avec la requête proxifiée, rejettée si erreur
 */
service.getProxifiedRequest = () => new Promise(async (resolve, reject) => {
  // Récupération de la liste des proxies paramétrée
  if (config.proxies.length > 0) {
    for (let proxy of config.proxies) { /* eslint no-restricted-syntax: 0 */
      try {
        // Test du proxy
        const data = await ping({
          address: proxy.address,
          port: proxy.port,
          attempts: 1,
          timeout: 5000,
        });
        if (data.min !== undefined) {
          // Proxy trouvé
          logger.debug(`Proxy trouvé '${proxy.address}:${proxy.port}'`);
          return resolve(request.defaults({ proxy: `http://${proxy.address}:${proxy.port}` }));
        }
      } catch (err) {
        logger.warn(`Echec de contact du proxy '${proxy.address}:${proxy.port}'`);
      }
    }
    // Aucun proxy actif trouvé
    return reject(new ApiError('NO_AVAILABLE_PROXY', 'Aucun proxy actif trouvé'));
  }
  // Aucun proxy configuré
  return reject(new ApiError('NO_CONFIGURATION_PROXY', 'Aucun proxy configuré'));
});

module.exports = service;
