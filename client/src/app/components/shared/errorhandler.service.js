(function() {
  'use strict';

  angular
    .module('webadmin.shared')
    .factory('errorHandlerService', ErrorHandlerService);

  ErrorHandlerService.$inject = [
    'toastService',
  ];

  /**
   * Service de gestion des erreurs
   * @param       {Service} toastService - service d'affichage de notification
   * @constructor
   */
  function ErrorHandlerService(toastService) {
    return {
      handleError: handleError,
      handleServerError: handleServerError,
    };

    /**
     * Gère une erreur en affichant le message correspondant
     * @param  {Error}    error   - erreur à gérer
     * @param  {[string]} message - message à afficher
     */
    function handleError(error, message) {
      let msg = message;
      // Si aucun message n'est passé, message par défaut
      if (!message) msg = 'Un erreur est survenue, veuillez retenter votre action';
      // Affichage du message
      toastService.error(msg, error);
    }

    /**
     * Gère une erreur survenue sur un appel serveur
     * @param  {Error}    error   - erreur à gérer
     * @param  {[string]} message - message à afficher
     */
    function handleServerError(error, message) {
      // Si aucun message n'est passé, message par défaut
      let msg = message ? message : 'Un erreur est survenue, veuillez retenter votre action';
      // Recherche du type de l'erreur pour traitement spécifique
      if (error.data && error.data.code !== 'INTERNAL_SERVER_ERROR' && error.data.code !== 'NOT_FOUND' && error.data.code !== 'RESOURCE_NOT_FOUND') {
        // Si un message est disponible dans le retour de l'appel
        if (error.data.message) msg = error.data.message;
      }
      // Affichage du message
      toastService.error(msg, error);
    }
  }
})();
