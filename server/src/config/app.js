/**
 * @fileoverview Configuration de base de l'application
 * @module config/app
 * @requires {@link external:path}
 */

const path = require('path');
/**
 * Configuration
 * @namespace
 */
const app = {
  /**
   * Port du serveur
   * @type {number}
   * @default 3001
   */
  port: process.env.PORT || 3001,

  /**
   * Path du fichier de log du serveur
   * @type {string}
   */
  logFile: path.join(__dirname, '../../../logs/combined.log'),

  /**
   * Liste de proxys pour rebond vers PFD
   * @type {object[]}
   */
  proxies: [{
      address: 'M57355',
      port: '8888'
    },
    {
      address: 'M57341',
      port: '8888'
    },
    {
      address: 'M57244',
      port: '8888'
    },
    {
      address: 'M54683',
      port: '8888'
    },
  ],

  /**
   * URL du repository Artifactory
   * @type {string}
   */
  artifactoryUrl: 'http://solar-repo.retraite.lan/artifactory/webrc/fr/dsirc/webrc/',

  /**
   * Dossier des serveurs de déploiement
   * @type {string}
   */
  deployerFolder: path.join(__dirname, '../../../data/servers'),

  /**
   * Dossier de template d'un serveur de déploiement
   * @type {string}
   */
  serverTemplateFolder: path.join(__dirname, '../../../data/jboss-template'),

  /**
   * Dossier d'historique des log de déploiement
   * @type {string}
   */
  historyFolder: path.join(__dirname, '../../../data/history'),

  /**
   * Adresse du serveur
   * @type {string}
   */
  serverLocation: process.env.SERVER || 'localhost',
};

module.exports = app;
