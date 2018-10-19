(function() {
  'use strict';

  angular
    .module('webadmin')
    .constant('DEPLOYER_API', {
      URL: 'http://localhost:3001',
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
