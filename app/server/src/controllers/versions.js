/**
 * @fileoverview Controleur des versions
 * @module controllers/versions
 * @requires services/versions
 */

const service = require('../services/versions');

const controller = {};

/**
 * Liste toutes les versions
 * @method list
 * @param  {external:Request}  req  - requête reçue
 * @param  {external:Response} res  - réponse à envoyer
 * @param  {nextMiddleware}    next - fonction de callback vers le prochain middleware
 */
controller.list = (req, res, next) => {
  service.list()
    .then(versions => res.status(200).json(versions))
    .catch(err => next(err));
};

/**
 * Met en pause une version
 * @method pause
 * @param  {external:Request}  req  - requête reçue
 * @param  {external:Response} res  - réponse à envoyer
 * @param  {nextMiddleware}    next - fonction de callback vers le prochain middleware
 */
controller.pause = (req, res, next) => {
  service.pause(req.params.id)
    .then(() => res.status(204).end())
    .catch(err => next(err));
};

/**
 * Met en pause toutes les versions actives
 * @method pause
 * @param  {external:Request}  req  - requête reçue
 * @param  {external:Response} res  - réponse à envoyer
 * @param  {nextMiddleware}    next - fonction de callback vers le prochain middleware
 */
controller.pauseAll = (req, res, next) => {
  service.pauseAll()
    .then(paused => res.status(200).json(paused))
    .catch(err => next(err));
};

/**
 * Active une version en pause
 * @method unpause
 * @param  {external:Request}  req  - requête reçue
 * @param  {external:Response} res  - réponse à envoyer
 * @param  {nextMiddleware}    next - fonction de callback vers le prochain middleware
 */
controller.unpause = (req, res, next) => {
  service.unpause(req.params.id)
    .then(() => res.status(204).end())
    .catch(err => next(err));
};

/**
 * Active toutes les versions en pause
 * @method pause
 * @param  {external:Request}  req  - requête reçue
 * @param  {external:Response} res  - réponse à envoyer
 * @param  {nextMiddleware}    next - fonction de callback vers le prochain middleware
 */
controller.unpauseAll = (req, res, next) => {
  service.unpauseAll()
    .then(unpaused => res.status(200).json(unpaused))
    .catch(err => next(err));
};

/**
 * Ajoute un nouvelle version
 * @method addVersion
 * @param  {external:Request}  req  - requête reçue
 * @param  {external:Response} res  - réponse à envoyer
 * @param  {nextMiddleware}    next - fonction de callback vers le prochain middleware
 */
controller.addVersion = (req, res, next) => {
  service.addVersion(req.body)
    .then(version => res.status(200).json(version))
    .catch(err => next(err));
};

/**
 * Supprime une version
 * @method deleteVersion
 * @param  {external:Request}  req  - requête reçue
 * @param  {external:Response} res  - réponse à envoyer
 * @param  {nextMiddleware}    next - fonction de callback vers le prochain middleware
 */
controller.deleteVersion = (req, res, next) => {
  service.deleteVersion(req.params.id)
    .then(() => res.status(204).end())
    .catch(err => next(err));
};

/**
 * Met à jour une version
 * @method updateVersion
 * @param  {external:Request}  req  - requête reçue
 * @param  {external:Response} res  - réponse à envoyer
 * @param  {nextMiddleware}    next - fonction de callback vers le prochain middleware
 */
controller.updateVersion = (req, res, next) => {
  service.updateVersion(req.params.id, req.body)
    .then(() => res.status(204).end())
    .catch(err => next(err));
};

module.exports = controller;
