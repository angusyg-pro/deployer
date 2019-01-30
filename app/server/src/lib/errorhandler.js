/**
 * @fileoverview Middlewares de gestion des erreurs
 * @module lib/errorhandler
 * @requires lib/errors
 */

const { ApiError, NotFoundError } = require('./errors');

const errorhandler = {};

/**
 * Capte toutes les requêtes non mappées et renvoie une erreur NotFoundError
 * @method errorNoRouteMapped
 * @param  {external:Request}  req  - requête reçue
 * @param  {external:Response} res  - réponse à envoyer
 * @param  {nextMiddleware}    next - fonction de callback vers le prochain middleware
 */
errorhandler.errorNoRouteMapped = (req, res, next) => next(new NotFoundError(req.url));

/**
 * Gère toutes les erreurs non gérées par le métier
 * @method errorHandler
 * @param  {external:Error}    err  - Erreur non gérée
 * @param  {external:Request}  req  - Requête reçue
 * @param  {external:Response} res  - Réponse à envoyer
 * @param  {nextMiddleware}    next - Callback vers le prochain middleware
 */
errorhandler.errorHandler = (err, req, res, next) => {
  if (res.headersSent) next(err);
  else ApiError.handle(req, res, err);
};

module.exports = errorhandler;
