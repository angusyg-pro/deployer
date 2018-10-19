/**
 * @fileoverview Routeur des serveurs
 * @module routes/servers
 * @requires {@link external:express}
 * @requires controllers/servers
 */

const express = require('express');
const controller = require('../controllers/servers');

const router = express.Router({ mergeParams: true });

/**
 * Ajoute un serveur
 * @path {POST} /:id/servers
 * @name addServer
 */
router.post('/', controller.addServer);

/**
 * Supprime un serveur
 * @path {DELETE} /:idVersion/servers/:idServer
 * @name removeServer
 */
router.delete('/:idServer', controller.removeServer);

/**
 * Ajoute un EAR à un serveur
 * @path {POST} /:idVersion/servers/:idServer
 * @name addEarToServer
 */
router.post('/:idServer', controller.addEarToServer);

/**
 * Supprime un EAR d'un serveur
 * @path {DELETE} /:idVersion/servers/:idServer/ear/:earName
 * @name removeEarFromServer
 */
router.delete('/:idServer/ear/:earName', controller.removeEarFromServer);

/**
 * Télécharge le standalone.xml d'un serveur
 * @path {GET} /:idVersion/servers/:idServer/standalone
 * @name getServerStandalone
 */
router.get('/:idServer/standalone', controller.getServerStandalone);

/**
 * Upload le standalone.xml d'un serveur
 * @path {POST} /:idVersion/servers/:idServer/standalone
 * @name postServerStandalone
 */
router.post('/:idServer/standalone', controller.postServerStandalone);

module.exports = router;
