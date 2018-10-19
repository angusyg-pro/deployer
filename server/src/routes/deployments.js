/**
 * @fileoverview Routeur des déploiements
 * @module routes/deployments
 * @requires {@link external:express}
 * @requires controllers/deployments
 */

const express = require('express');
const controller = require('../controllers/deployments');

const router = express.Router({ mergeParams: true });


/**
 * Lance un déploiement
 * @path {GET} /:idVersion/deployments/deploy
 * @name deployVersion
 */
router.get('/deploy', controller.deployVersion);

/**
 * Lance un déploiement
 * @path {GET} /:idVersion/deployments/:idDeployment
 * @name deployVersion
 */
router.get('/:idDeployment', controller.getDeployment);

/**
 * Annule un déploiement
 * @path {GET} /:idVersion/deployments/:idDeployment/cancel
 * @name cancelDeployment
 */
router.get('/:idDeployment/cancel', controller.cancelDeployment);

/**
 * Télécharge le fichier de log d'un déploiement
 * @path {GET} /:idVersion/deployments/:idDeployment/servers/:idServer/serverlog
 * @name getDeploymentLog
 */
router.get('/:idDeployment/servers/:idServer/serverlog', controller.getDeploymentLog);

/**
 * Télécharge la log d'un déploiement du serveur
 * @path {GET} /:idVersion/deployments/:idDeployment/servers/:idServer/serverlog
 * @name getDeploymentLog
 */
router.get('/:idDeployment/servers/:idServer/log', controller.getServerDeploymentLog);

module.exports = router;
