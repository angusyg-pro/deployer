/**
 * @fileoverview Controleur des serveurs
 * @module controllers/servers
 * @requires services/servers
 */

const service = require('../services/servers');

const controller = {};

/**
 * Supprime un EAR du serveur en paramètre
 * @method removeEarFromServer
 * @param  {external:Request}  req  - requête reçue
 * @param  {external:Response} res  - réponse à envoyer
 * @param  {nextMiddleware}    next - fonction de callback vers le prochain middleware
 */
controller.removeEarFromServer = (req, res, next) => {
  service.removeEarFromServer(req.params.idVersion, req.params.idServer, req.params.earName)
    .then(() => res.status(204).end())
    .catch(err => next(err));
};

/**
 * Supprime un serveur
 * @method removeServer
 * @param  {external:Request}  req  - requête reçue
 * @param  {external:Response} res  - réponse à envoyer
 * @param  {nextMiddleware}    next - fonction de callback vers le prochain middleware
 */
controller.removeServer = (req, res, next) => {
  service.removeServer(req.params.idVersion, req.params.idServer)
    .then(() => res.status(204).end())
    .catch(err => next(err));
};

/**
 * Ajoute un serveur
 * @method addServer
 * @param  {external:Request}  req  - requête reçue
 * @param  {external:Response} res  - réponse à envoyer
 * @param  {nextMiddleware}    next - fonction de callback vers le prochain middleware
 */
controller.addServer = (req, res, next) => {
  service.addServer(req.params.idVersion, req.body)
    .then(server => res.status(200).json(server))
    .catch(err => next(err));
};

/**
 * Ajoute un EAR à un serveur
 * @method addEarToServer
 * @param  {external:Request}  req  - requête reçue
 * @param  {external:Response} res  - réponse à envoyer
 * @param  {nextMiddleware}    next - fonction de callback vers le prochain middleware
 */
controller.addEarToServer = (req, res, next) => {
  service.addEarToServer(req.params.idVersion, req.params.idServer, req.body)
    .then(server => res.status(200).json(server))
    .catch(err => next(err));
};

/**
 * Télécharge le standalone.xml d'un serveur
 * @method getServerStandalone
 * @param  {external:Request}  req  - requête reçue
 * @param  {external:Response} res  - réponse à envoyer
 * @param  {nextMiddleware}    next - fonction de callback vers le prochain middleware
 */
controller.getServerStandalone = (req, res, next) => {
  service.getServerStandalone(req.params.idVersion, req.params.idServer)
    .then(file => res.download(file))
    .catch(err => next(err));
};

/**
 * Upload le standalone.xml d'un serveur
 * @method postServerStandalone
 * @param  {external:Request}  req  - requête reçue
 * @param  {external:Response} res  - réponse à envoyer
 * @param  {nextMiddleware}    next - fonction de callback vers le prochain middleware
 */
controller.postServerStandalone = (req, res, next) => {
  service.postServerStandalone(req, res)
    .then(() => res.status(204).end())
    .catch(err => next(err));
};

module.exports = controller;
