(function() {
  angular
    .module('webadmin.deployer.versions')
    .controller('versionsDeploymentModal', VersionsDeploymentModalController);

  VersionsDeploymentModalController.$inject = [
    '$uibModalInstance',
    '$scope',
    'deployment',
    'socket',
  ];

  function VersionsDeploymentModalController($uibModalInstance, $scope, deployment, socket) {
    const vm = this;

    // Variables
    vm.deployment = deployment;

    // Méthodes
    vm.close = close;

    /**
     * Ferme la fenêtre de dialogue
     */
    function close() {
      $uibModalInstance.close();
    }

    /**
     * Initialise le controleur
     * en ajoutant le listener pour MAJ de la log en direct
     */
    function init() {
      if (socket !== null) {
        // Listeneur pour MAJ live de la log
        socket.on('deployment-progress', (deployment) => {
          if (vm.deployment._id === deployment._id) {
            vm.deployment = deployment;
            $scope.$applyAsync();
          }
        });
      }
    }

    // Appel de l'initialisation à la création du controleur
    init();
  }
})();
