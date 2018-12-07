/**
 * @fileoverview Service d'intéraction avec Artifactory
 * @module services/artifactory
 * @requires {@link external:path}
 * @requires {@link external:fs}
 * @requires config/app
 * @requires lib/proxy
 * @requires lib/logger
 * @requires lib/errors
 * @requires services/deployer
 */

const path = require('path');
const fs = require('fs');
const config = require('../config/app');
const ProxyService = require('../lib/proxy');
const logger = require('../lib/logger');
const { ApiError } = require('../lib/errors');
const deployerService = require('./deployer');

const service = {};

/**
 * Compare deux versions en fonction du nom de la version et de son statut
 * @private
 * @param  {string}  numero          - numero de la version en cours
 * @param  {boolean} versionSnapshot - statut de la versions en cours
 * @param  {string}  v1              - version 1 à comparer
 * @param  {string}  v2              - version 2 à comparer
 * @return {string} version la plus ancienne
 */
const compareVersion = (numero, versionSnapshot, v1, v2) => {
  logger.debugFuncCall(numero, versionSnapshot, v1, v2);
  // Première comparaison
  let picked;
  if (v1 === null) picked = v2;
  else {
    // Extraction du type de versions (a, rc ...)
    const version = `${numero}([-arc0-9]*)${versionSnapshot ? '-SNAPSHOT' : ''}`;
    const reg = new RegExp(version);
    const regType = new RegExp('[-]*([A-Za-z]*)([0-9]*)');
    const type1 = v1.match(reg)[1].match(regType);
    const type2 = v2.match(reg)[1].match(regType);
    // Si les types sont identiques comparaison des numéros de version
    if (type1[1] === type2[1]) picked = Number(type1[2]) - Number(type2[2]) > 0 ? v1 : v2;
    else {
      // Types différents => analyse
      switch (type1[1]) {
        case '':
          // vide, version finale => v1
          picked = v1;
          break;
        case 'a':
          // version alpha on retourne soit une version finale ou version rc => v2
          picked = v2;
          break;
        case 'rc':
          // version rc, on regarde si v2 est alpha ou finale
          picked = type2[1] === '' ? v2 : v1;
          break;
        default:
          throw new ApiError('');
      }
    }
  }
  logger.debug(`Version choisie: ${picked}`);
  return picked;
};

/**
 * Extrait la version la plus récente à partir du corps de la page HTML artifactory
 * @private
 * @param  {string}  numero          - numéro de la version en cours
 * @param  {boolean} versionSnapshot - statut de la versions en cours
 * @param  {string}  html            - corps de la page html Artifactory
 * @return {string} version la plus récente
 */
const getLastVersionFromHtml = (numero, versionSnapshot, html, server) => {
  logger.debugFuncCall(numero, versionSnapshot, html, server);
  deployerService.addDeploymentLog('INFO', `Extraction de la dernière version de '${numero}${versionSnapshot ? '-SNAPSHOT' : ''}'`, server);
  // Recherche dans les balises href de la page
  let lastVersion = null;
  const version = `<a href="(${numero}[-arc0-9]*${versionSnapshot ? '-.*-SNAPSHOT' : ''})/">`;
  const versionRegExp = new RegExp(version, 'g');
  // Extraction des versions existantes
  let array;
  while ((array = versionRegExp.exec(html)) !== null) {
    // Analyse de chaque correspondance
    // Compare avec la dernière version la plus récente trouvée
    lastVersion = compareVersion(numero, versionSnapshot, lastVersion, array[1]);
  }
  deployerService.addDeploymentLog('INFO', `Dernière version de '${numero}${versionSnapshot ? '-SNAPSHOT' : ''}' trouvée: ${lastVersion}`, server);
  return lastVersion;
};

/**
 * Extrait le nom de l'EAR à partir du corps de la page HTML artifactory
 * @private
 * @param  {string} numero - numéro de la version en cours
 * @param  {string} html   - corps de la page html Artifactory
 * @return {string} nom de l'EAR
 */
const getLastEARVersionFromHtml = (numero, html) => {
  logger.debugFuncCall(numero, html);
  // Recherche dans les balises href de la page
  const version = `<a href="(.*${numero}.*\.ear)">`;
  const versionRegExp = new RegExp(version, 'g');
  const name = versionRegExp.exec(html)[1];
  logger.debug(`Ear name: ${name}`);
  return name;
};

/**
 * Récupère l'URL d'un EAR de la version passée en paramètre
 * @private
 * @param  {string}  numero          - numéro de la version en cours
 * @param  {boolean} versionSnapshot - statut de la versions en cours
 * @param  {string}  ear             - nom de l'EAR
 * @param  {string}  url             - URL de la page Artifactory de l'EAR
 * @param  {string}  lastVersion     - dernière version
 * @return {Promise<string>} résolue avec l'URL de l'EAR, rejettée si erreur
 */
const getLastVersionEARUrl = (numero, versionSnapshot, ear, url, lastVersion, server) => {
  logger.debugFuncCall(numero, versionSnapshot, ear, url, lastVersion, server);
  return new Promise(async (resolve, reject) => {
    try {
      deployerService.addDeploymentLog('INFO', `Récupération de l'URL de la version '${lastVersion}' de l'EAR '${ear}'`, server);
      // Seulement besoin de faire appel à Artifactory pour les versions SNAPSHOT (timestamp dans le nom des EAR)
      if (versionSnapshot) {
        // Récupération d'un proxy
        const proxifiedRequest = await ProxyService.getProxifiedRequest();
        // Récupération de l'URL de la page de la dernière version de l'EAR
        const u = `${url}/${lastVersion}`;
        proxifiedRequest(u, async (err, res, body) => {
          try {
            if (err) return reject(new ApiError(`Erreur lors de l'appel à l'URL '${u}': ${err}`));
            if (res && res.statusCode === 200) {
              // Extraction de l'URL
              const earFullName = await getLastEARVersionFromHtml(numero, body);
              const earURL = `${url}/${lastVersion}/${earFullName}`;
              deployerService.addDeploymentLog('INFO', `URL de la version '${lastVersion}' de l'EAR '${ear}': ${earURL}`, server);
              return resolve(earURL);
            }
            return reject(new ApiError(`Erreur lors de l'appel à l'URL '${u}': ${err}`));
          } catch (e) {
            return reject(new ApiError(`Erreur lors de l'appel à l'URL '${u}': ${e}`));
          }
        });
      } else {
        const earURL = `${url}/${lastVersion}/${ear}-${lastVersion}.ear`;
        deployerService.addDeploymentLog('INFO', `URL de la version '${lastVersion}' de l'EAR '${ear}': ${earURL}`, server);
        return resolve(earURL);
      }
    } catch (err) {
      return reject(new ApiError(`Erreur lors de la récupération de l'URL de la version '${lastVersion}' de l'EAR '${ear}': ${err}`, server));
    }
  });
};

/**
 * Téléchargement d'un EAR dans le dossier de déploiement
 * @private
 * @param  {string} url    - URL de l'EAR à télécharger
 * @param  {string} folder - dossier de déploiement
 * @param  {Server} server - serveur associé au téléchargement
 * @return {Promise<string>} résolue avec le chemin vers l'EAR téléchargé, rejettée si erreur
 */
const downloadEAR = (url, folder, server) => {
  logger.debugFuncCall(url, folder, server);
  return new Promise(async (resolve, reject) => {
    try {
      deployerService.addDeploymentLog('INFO', `Téléchargement de '${url}' vers '${folder}`, server);
      // Récupération d'un proxy
      const proxifiedRequest = await ProxyService.getProxifiedRequest();
      // Téléchargement de l'EAR dans le dossier de déploiement
      const localName = url.substr(url.lastIndexOf('/') + 1);
      const earLocalInfos = {
        path: path.join(folder, localName),
        localName,
      };
      proxifiedRequest(url)
        .pipe(fs.createWriteStream(earLocalInfos.path))
        .on('finish', () => {
          deployerService.addDeploymentLog('INFO', `Téléchargement terminé de '${url}'`, server);
          return resolve(earLocalInfos);
        })
        .on('error', err => reject(new ApiError(err)));
    } catch (err) {
      return reject(new ApiError(err));
    }
  });
};

/**
 * Récupère la dernière version de chaque EAR d'un serveur
 * @param  {string}   versionName      - nom de la version en cours
 * @param  {boolean}  versionSnapshot  - statut de la versions en cours
 * @param  {string[]} ears             - tableau des EARs à récupérer
 * @param  {string}   deploymentFolder - dossier de déploiement du serveur
 * @return {Promise<Map<string, string>>} résolue avec pour chaque EAR, l'URL de la version la plus récente, rejettée si erreur
 */
service.downloadLastVersionEars = (numero, versionSnapshot, server, deploymentFolder) => {
  logger.debugFuncCall(numero, versionSnapshot, server, deploymentFolder);
  return new Promise(async (resolve, reject) => {
    try {
      // Récupération d'un proxy
      const proxifiedRequest = await ProxyService.getProxifiedRequest();
      // Vars
      const baseUrl = config.artifactoryUrl;
      const lastVersionEars = new Map();
      const downloading = [];
      // On va chercher en parallèle les URLs pour chaque EAR
      for (const ear of server.ears) { /* eslint no-restricted-syntax: 0 */
        const url = `${baseUrl}${ear.name}`;
        downloading.push(new Promise((resolve, reject) => {
          // Récupération de l'URL de la page de la dernière version de l'EAR
          proxifiedRequest(url, async (err, res, body) => {
            if (err) return reject(new ApiError(`Erreur lors de l'appel à l'url : ${url}`));
            if (res && res.statusCode === 200) {
              const earInfos = {};
              // Récupération de la dernière version de l'EAR disponible
              const lastVersion = getLastVersionFromHtml(numero, versionSnapshot, body, server);
              if (lastVersion === null) {
                deployerService.addDeploymentLog('ERROR', `Aucune version trouvée sur artifactory pour l'EAR ${ear.name}`, server);
                reject(new ApiError(`Aucune version trouvée sur artifactory pour l'EAR ${ear.name}`));
              } else {
                // Récupération de l'URL de la dernière version de l'EAR
                earInfos.url = await getLastVersionEARUrl(numero, versionSnapshot, ear.name, url, lastVersion, server);
                // Téléchargement de l'EAR
                const earLocalInfos = await downloadEAR(earInfos.url, deploymentFolder, server);
                earInfos.path = earLocalInfos.path;
                ear.name = earLocalInfos.localName;
                ear.url = earInfos.url;
                logger.debug(ear);
                lastVersionEars.set(ear.name, earInfos);
                resolve();
              }
            }
            return reject(new ApiError(`Erreur lors de l'appel à l'url : ${url}`));
          });
        }));
      }
      Promise.all(downloading)
        .then(() => resolve(lastVersionEars))
        .catch(err => reject(err));
    } catch (err) {
      deployerService.addDeploymentLog('ERROR', `Erreur lors de la tentative de download: ${err}`, server);
      return reject(new ApiError(err));
    }
  });
};

module.exports = service;
