(function() {
  angular
    .module('webadmin.deployer.versions')
    .controller('versionsDeleteController', VersionsDeleteController);

  VersionsDeleteController.$inject = [
    '$uibModalInstance',
    'infos',
  ];

  function VersionsDeleteController($uibModalInstance, infos) {
    const vm = this;

    // Variables
    vm.infos = infos;

    // Méthodes
    vm.close = close;

    /**
     * Ferme la fenêtre de dialogue avec la valeur choisie (oui ou non)
     */
    function close(choice) {
      $uibModalInstance.close(choice);
    }
  }
})();
