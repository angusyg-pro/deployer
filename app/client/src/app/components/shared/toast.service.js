(function() {
  'use strict';

  angular
    .module('webadmin.shared')
    .factory('toastService', ToastService);

  ToastService.$inject = [
    'ngToast',
  ];

  /**
   * Service d'affichage de message sous forme de notifications
   * @param       {Service} ngToast - service d'affichage de notification
   * @constructor
   */
  function ToastService(ngToast) {
    return {
      error: error,
      info: info,
      success: success,
      warning: warning,
    };

    /**
     * Affiche un message d'erreur et log un erreur
     * @param  {string} message - message à afficher
     * @param  {[Error]} error   - erreur à logger
     */
    function error(message, error) {
      // Affichage de la notification
      ngToast.danger(message);
      // Si une erreur est passée, log en console
      if (error) console.error(message, error);
    }

    /**
     * Affiche un message d'information
     * @param  {string} message - message à afficher
     */
    function info(message) {
      // Affichage de la notification
      ngToast.info(message);
    }

    /**
     * Affiche un message de succès
     * @param  {string} message - message à afficher
     */
    function success(message) {
      ngToast.success(message);
    }

    /**
     * Affiche un message d'avertissement
     * @param  {string} message - message à afficher
     */
    function warning(message) {
      // Affichage de la notification
      ngToast.warning(message);
      // Log en console du message
      console.info(message);
    }
  }
})();
