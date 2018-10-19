(function() {
  'use strict';

  angular
    .module('webadmin.deployer')
    .config(RoutingConfig)

  RoutingConfig.$inject = [
    '$stateProvider',
  ];

  function RoutingConfig($stateProvider) {
    const versionsState = {
      name: 'root',
      url: '/versions',
      views: {
        'content@': {
          templateUrl: 'partials/versions.html',
          controller: 'VersionsController',
          controllerAs: 'versions',
        }
      },
      resolve: {
        list: ['versionsService', (versionsService) => versionsService.list()],
      },
    };

    $stateProvider.state(versionsState);
  }
})();
