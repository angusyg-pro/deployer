(function() {
  'use strict';

  angular
    .module('webadmin.shared')
    .config(Config)

  Config.$inject = [
    'ngToastProvider',
  ];

  function Config(ngToastProvider) {
    // Configuration des notifications
    ngToastProvider.configure({
      verticalPosition: 'top',
      horizontalPosition: 'left',
      animation: 'slide',
      maxNumber: '10',
    });
  }
})();
