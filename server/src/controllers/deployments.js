/**
 * @fileoverview Controleur des déploiements
 * @module controllers/deployments
 * @requires services/deployments
 */

const service = require('../services/deployments');

const controller = {};

/**
 * Renvoie un déploiement
 * @method deployVersion
 * @param  {external:Request}  req  - requête reçue
 * @param  {external:Response} res  - réponse à envoyer
 * @param  {nextMiddleware}    next - fonction de callback vers le prochain middleware
 */
controller.getDeployment = (req, res, next) => {
  service.getDeployment(req.params.idDeployment)
    .then(deployment => res.status(200).json(deployment))
    .catch(err => next(err));
};

/**
 * Lance le déploiement d'une version
 * @method deployVersion
 * @param  {external:Request}  req  - requête reçue
 * @param  {external:Response} res  - réponse à envoyer
 * @param  {nextMiddleware}    next - fonction de callback vers le prochain middleware
 */
controller.deployVersion = (req, res, next) => {
  service.validateAndDeploy(req.params.idVersion, true)
    .then(version => res.status(200).json(version))
    .catch(err => next(err));
};

/**
 * Annule un déploiement
 * @method cancelDeployment
 * @param  {external:Request}  req  - requête reçue
 * @param  {external:Response} res  - réponse à envoyer
 * @param  {nextMiddleware}    next - fonction de callback vers le prochain middleware
 */
controller.cancelDeployment = (req, res, next) => {
  service.cancelDeployment(req.params.idDeployment)
    .then(() => res.status(204).end())
    .catch(err => next(err));
};

/**
 * Télécharge le fichier de log d'un déploiement
 * @method getDeploymentLog
 * @param  {external:Request}  req  - requête reçue
 * @param  {external:Response} res  - réponse à envoyer
 * @param  {nextMiddleware}    next - fonction de callback vers le prochain middleware
 */
controller.getDeploymentLog = (req, res, next) => {
  service.getDeploymentLog(req.params.idServer)
    .then(file => res.download(file, 'server.log'))
    .catch(err => next(err));
};

/**
 * Télécharge la log d'un déploiement d'un serveur
 * @method getDeploymentLog
 * @param  {external:Request}  req  - requête reçue
 * @param  {external:Response} res  - réponse à envoyer
 * @param  {nextMiddleware}    next - fonction de callback vers le prochain middleware
 */
controller.getServerDeploymentLog = (req, res, next) => {
  service.getServerDeploymentLog(req.params.idDeployment, req.params.idServer)
    .then(log => res.status(200).json(log))
    .catch(err => next(err));
};

module.exports = controller;
