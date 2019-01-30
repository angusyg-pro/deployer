(function() {
  angular
    .module('webadmin.deployer.versions')
    .controller('versionsDeploymentServerModal', VersionsDeploymentServerModal);

  VersionsDeploymentServerModal.$inject = [
    '$uibModalInstance',
    '$scope',
    'server',
    'socket',
  ];

  function VersionsDeploymentServerModal($uibModalInstance, $scope, server, socket) {
    const vm = this;

    // Variables
    vm.server = server;

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
      if(socket !== null) {
        // Listeneur pour MAJ live de la log sur évènement serveur
        socket.on('deployment-server-progress', (infos) => {
          if (vm.server._id === infos.server._id){
            vm.server = infos.server;
            $scope.$applyAsync();
          }
        });
        // Listeneur pour MAJ live de la log sur évènement déploiement
        socket.on('deployment-progress', (deployment) => {
          const server = deployment.servers.find(srv => srv._id === vm.server._id);
          if (server){
            vm.server = server;
            $scope.$applyAsync();
          }
        });
      }
    }

    // Appel de l'initialisation à la création du controleur
    init();
  }
})();
