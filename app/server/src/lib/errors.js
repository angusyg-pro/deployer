/**
 * @fileoverview Erreurs personnalisées
 * @module lib/errors
 * @requires {@link external:kind-of}
 */

const kindOf = require('kind-of');
const logger = require('./logger');

/**
 * Créé une erreur ApiError
 * @class
 * @extends external:Error
 * @name ApiError
 * @param {[external:Error|string]} args - erreur, ou String(s) pour initialiser l'erreur
 */
class ApiError extends Error {
  /**
   * 1 argument:
   *   si de type Error on récupère le message,
   *   si string on met à jour le message,
   *   si tableau de taille 2, si 2 string on met à jour le code et le message
   * 2 arguments:
   *   si 2 string on met à jour le code et le message
   * 3 arguments:
   *   si 2 string et un number on met à jour le code, le message et le statusCode
   * Si une condition de type n'est pas respectée, une TypeError est lancée
   */
  constructor(...args) {
    super('An unknown server error occured while processing request');
    /**
     * Nom de l'erreur
     * @default ApiError
     * @member {string}
     */
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);

    /**
     * Code de l'erreur
     * @default Internal Server Error
     * @member {string}
     */
    this.code = 'INTERNAL_SERVER_ERROR';

    /**
     * Statut HTTP status de la réponse résultant de l'erreur
     * @default 500
     * @member {number}
     */
    this.statusCode = 500;

    let type;
    if (args.length === 1) {
      type = kindOf(args[0]);
      if (type === 'error') {
        // On récupère la stack
        // 1 argument de type Error
        if (args[0] instanceof ApiError) {
          // Instance de ApiError, on récupère les données de l'erreur
          this.code = args[0].code;
          this.message = args[0].message;
          this.stack = args[0].stack;
          // On sort pour éviter le log
          return;
        }
        // Récupération du message
        this.message = args[0].message;
      } else if (type === 'string') this.message = args[0]; // 1 argument string, on met à jour le message
      else if (type === 'array' && args[0].length === 2) {
        // 1 argument tableau de taille 2
        type = kindOf(args[0][0]);
        // On met à jour le code avec le premier élément si c'est un string
        if (type === 'string') this.code = args[0][0];
        // Erreur si le premier élément n'est pas de type string
        else throw new TypeError(`Type invalide '${type}' pour le premier argument du new ApiError`);
        type = kindOf(args[0][1]);
        // On met à jour le message avec le deuxième élément si c'est un string
        if (type === 'string') this.message = args[0][1];
        // Erreur si le deuxième élément n'est pas de type string
        else throw new TypeError(`Type invalide '${type}' pour le deuxième argument du new ApiError`);
      } else throw new TypeError(`Type invalide '${type}' pour le l'argument du new ApiError`); // 1 argument de type non Error, string ou array
    } else if (args.length === 2) {
      // 2 arguments
      type = kindOf(args[0]);
      // On met à jour le code avec le premier argument si c'est un string
      if (type === 'string') this.code = args[0];
      // Erreur si le premier argument n'est pas de type string
      else throw new TypeError(`Type invalide '${type}' pour le premier argument du new ApiError`);
      type = kindOf(args[1]);
      // On met à jour le message avec le deuxième argument si c'est un string
      if (type === 'string') this.message = args[1];
      // Erreur si le deuxième argument n'est pas de type string
      else throw new TypeError(`Type invalide '${type}' pour le deuxième argument du new ApiError`);
    } else if (args.length === 3) {
      // 3 arguments
      type = kindOf(args[0]);
      // On met à jour le code avec le premier argument si c'est un string
      if (type === 'string') this.code = args[0];
      // Erreur si le premier argument n'est pas de type string
      else throw new TypeError(`Type invalide '${type}' pour le premier argument du new ApiError`);
      type = kindOf(args[1]);
      // On met à jour le message avec le deuxième argument si c'est un string
      if (type === 'string') this.message = args[1];
      // Erreur si le deuxième argument n'est pas de type string
      else throw new TypeError(`Type invalide '${type}' pour le deuxième argument du new ApiError`);
      type = kindOf(args[2]);
      // On met à jour le statusCode avec le troisième argument si c'est un number
      if (type === 'number') this.statusCode = args[2];
      // Erreur si le troisième argument n'est pas de type number
      else throw new TypeError(`Type invalide '${type}' pour le troisième argument du new ApiError`);
    } else if (args.length > 3) throw new TypeError(`Nombre d'argument invalide du new ApiError (${args.length} devrait être <= 3)`); // Erreur si trop d'arguments
    // Log de l'erreur créée
    // Extraction de l'origine de l'erreur dans la stack
    const s = /at (.*) \(.*\)/.exec(this.stack.split('\n')[1]);
    let pre = '';
    if (s) {
      // Extraction du fichier:ligne:colonne
      const line = /.* \(.*\\(.*)\)/.exec(s);
      // Si trouvé on ajoute une entête
      if (line && line.length >= 1) pre = `[${line[1]}] `;
    }
    logger.error(`${pre}ApiError`, this);
  }

  /**
   * Vérifie le type de l'erreur et si besoin la converti en ApiError avant de la renvoyer en tant que réponse
   * @method handle
   * @static
   * @param  {external:Request}  req - Requête reçue
   * @param  {external:Response} res - Réponse à envoyer
   * @param  {external:Error}    err - Erreur à gérer
   */
  static handle(req, res, err) {
    if (err instanceof ApiError) err.send(req, res);
    else new ApiError(err).send(req, res);
  }

  /**
   * Créé une réponse à partir des caractéristiques de l'ApiError
   * @method send
   * @param  {external:Request}  req - Requête reçue
   * @param  {external:Response} res - Réponse à envoyer
   */
  send(req, res) {
    const err = {
      code: this.code,
      message: this.message,
      reqId: req.id,
    };
    res.status(this.statusCode).json(err);
  }
}

/**
 * Créé une erreur NotFoundError
 * @class
 * @extends {ApiError}
 */
class NotFoundError extends ApiError {
  constructor(url) {
    super('NOT_FOUND', url);

    /**
     * Nom de l'erreur
     * @default NotFoundError
     * @member {string}
     */
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);

    /**
     * Statut HTTP status de la réponse résultant de l'erreur
     * @default 404
     * @member {number}
     */
    this.statusCode = 404;
  }
}

/**
 * Créé une erreur NotFoundResourceError
 * @class
 * @extends {ApiError}
 */
class NotFoundResourceError extends ApiError {
  constructor(id) {
    super('RESOURCE_NOT_FOUND', `No resource found ${id || ''}`.trim());

    /**
     * Nom de l'erreur
     * @default NotFoundResourceError
     * @member {string}
     */
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);

    /**
     *  Statut HTTP status de la réponse résultant de l'erreur
     * @default 404
     * @member {number}
     */
    this.statusCode = 404;
  }
}

module.exports = {
  ApiError,
  NotFoundError,
  NotFoundResourceError,
};
