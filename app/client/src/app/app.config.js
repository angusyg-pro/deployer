(function() {
  'use strict';

  angular
    .module('webadmin')
    .constant('DEPLOYER_API', {
      URL: '@@SERVER_URL',
    })
    .config(RoutingConfig)

  RoutingConfig.$inject = [
    '$stateProvider',
    '$urlRouterProvider',
  ];

  function RoutingConfig($stateProvider, $urlRouterProvider) {
    $urlRouterProvider.otherwise('/versions');
  }
})();
