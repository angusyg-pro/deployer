(function() {
  angular
    .module('webadmin.deployer.versions')
    .controller('VersionsModalController', VersionsModalController);

  VersionsModalController.$inject = [
    '$uibModalInstance',
    'list',
    'versionsService',
  ];

  function VersionsModalController($uibModalInstance, list, versionsService) {
    const vm = this;

    // Variables
    vm.list = [''].concat(list);
    vm.newVersion = {
      from: null,
      name: '',
      snapshot: false,
      paused: false,
      numero: '',
    };

    // Méthodes
    vm.cancel = cancel;
    vm.selectFrom = selectFrom;
    vm.validate = validate;
    vm.versionName = versionName;

    /**
     * Ferme la fenêtre de dialogue
     */
    function cancel() {
      $uibModalInstance.dismiss();
    }

    /**
     * Met à jour les informations de la nouvelle version avec celles de la version de base
     */
    function selectFrom() {
      if (vm.newVersion.from) vm.newVersion.numero = vm.newVersion.from.numero;
      else vm.newVersion.numero = '';
    }

    /**
     * Ferme la fenêtre de dialogue en renvoyant la version à créer
     */
    function validate() {
      $uibModalInstance.close(vm.newVersion);
    }

    /**
     * Renvoie le nom complet de la version
     * @param  {Version} version - version à nommer
     * @return {string}  le nom complet de la version
     */
    function versionName(version) {
      console.log(version);
      return versionsService.versionName(version);
    }
  }
})();
