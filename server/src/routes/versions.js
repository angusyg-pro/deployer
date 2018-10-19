/**
 * @fileoverview Routeur des versions
 * @module routes/versions
 * @requires {@link external:express}
 * @requires controllers/versions
 */

const express = require('express');
const controller = require('../controllers/versions');
const serverRouter = require('./servers');
const deploymentRouter = require('./deployments');

const router = express.Router({ mergeParams: true });

/**
 * Liste toutes les versions
 * @path {GET} /
 * @response {json} array of versions
 * @name list
 */
router.get('/', controller.list);

/**
 * Ajoute une version
 * @path {POST} /
 * @name addVersion
 */
router.post('/', controller.addVersion);

/**
 * Ajoute une version
 * @path {POST} /
 * @name addVersion
 */
router.get('/pause', controller.pauseAll);

/**
 * Ajoute une version
 * @path {POST} /
 * @name addVersion
 */
router.get('/unpause', controller.unpauseAll);

/**
 * Supprime une version
 * @path {DELETE} /:id
 * @name deleteVersion
 */
router.delete('/:id', controller.deleteVersion);

/**
 * Met en pause une version
 * @path {GET} /:id/pause
 * @name pauseVersion
 */
router.get('/:id/pause', controller.pause);

/**
 * Active une version en pause
 * @path {GET} /:id/unpause
 * @name unpauseVersion
 */
router.get('/:id/unpause', controller.unpause);

/**
 * Modifie une version
 * @path {PUT} /:id
 * @name updateVersion
 */
router.put('/:id', controller.updateVersion);

// Ajoute le routeur des serveurs
router.use('/:idVersion/servers', serverRouter);

// Ajoute le routeur des déploiements
router.use('/:idVersion/deployments', deploymentRouter);

module.exports = router;
