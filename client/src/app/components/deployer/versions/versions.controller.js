(function() {
  angular
    .module('webadmin.deployer.versions')
    .controller('VersionsController', VersionsController);

  VersionsController.$inject = [
    '$scope',
    'list',
    'versionsService',
    'errorHandlerService',
    'toastService',
    '$uibModal',
    'Upload',
    'DEPLOYER_API',
    '$document',
    '$q',
  ];

  function VersionsController($scope, list, versionsService, errorHandlerService, toastService, $uibModal, Upload, DEPLOYER_API, $document, $q) {
    const vm = this;

    vm.list = list;
    vm.selected = null;

    /****** Contrôles ******/

    // Méthodes
    vm.addVersion = addVersion;
    vm.getActiveVersions = getActiveVersions;
    vm.getPausedVersions = getPausedVersions;
    vm.pauseAll = pauseAll;
    vm.unpauseAll = unpauseAll;

    /****** Infos ******/

    // Variables
    vm.originalVersion = null;
    vm.newEmail = '';
    vm.mailModes = versionsService.mailModes;

    // Méthodes
    vm.addEmail = addEmail;
    vm.deleteEmail = deleteEmail;
    vm.deleteVersion = deleteVersion;
    vm.selectVersion = selectVersion;
    vm.updateVersion = updateVersion;
    vm.versionName = versionName;

    /****** Serveurs ******/

    // Variables
    vm.newServer = '';
    vm.uncollapsedServers = [];

    // Méthodes
    vm.addEarToServer = addEarToServer;
    vm.addServer = addServer;
    vm.getStandaloneUrl = getStandaloneUrl;
    vm.isCollapsed = isCollapsed;
    vm.openServer = openServer;
    vm.removeEarFromServer = removeEarFromServer;
    vm.removeServer = removeServer;
    vm.uploadStandalone = uploadStandalone;

    /****** Déploiements ******/

    // Variables
    vm.deploymentSocket = null;
    vm.selectedDeployment = null;

    // Méthodes
    vm.cancelDeployment = cancelDeployment;
    vm.convertStatus = convertStatus;
    vm.deployVersion = deployVersion;
    vm.getDeploymentLog = getDeploymentLog;
    vm.getServerDeploymentLog = getServerDeploymentLog;
    vm.getServerDeploymentLogFileUrl = getServerDeploymentLogFileUrl;
    vm.getType = getType;
    vm.selectDeployment = selectDeployment;

    //++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
    //++++++++++++++++++++++++++++++++++++++++ GESTION DES CONTROLES +++++++++++++++++++++++++++++++++++++++++
    //++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

    /**
     * Ouvre la fenêtre de dialogue d'ajout de version
     * Au retour, fait appel au service de création de la version
     */
    function addVersion() {
      // Ouvre la fenêtre de dialogue
      const modal = $uibModal.open({
        templateUrl: 'partials/versions-modal.html',
        controller: 'VersionsModalController',
        controllerAs: 'versionsModal',
        appendTo: angular.element($document[0].querySelector('#versions')),
        resolve: {
          // Passage de la liste des versions, pour liste des versions de base
          list: () => vm.list,
        }
      });

      // En retour, création de version renvoyée
      modal.result.then((newVersion) => {
        // Suppression des déploiements avant envoi de la version de base
        if (newVersion.from) delete newVersion.from.deployments;
        versionsService.addVersion(newVersion)
          .then((version) => {
            // Ajout de la version aux versions courantes
            vm.list.push(version);
            // Sélection de la version ajoutée
            vm.selected = version;
            selectVersion();
            toastService.success('Nouvelle version créée');
          })
          .catch(error => errorHandlerService.handleServerError(error, 'Une erreur est survenue lors de l\'ajout de la version'));
      });
    }

    /**
     * Retourne le nombre de versions actives
     * @return {number} nombre de versions actives
     */
    function getActiveVersions() {
      let active = 0;
      // Pour chaque version de la liste
      vm.list.forEach((version) => {
        // Si la version n'est pas en pause, incrément du compteur
        if (!version.paused) active++;
      });
      return active;
    }

    /**
     * Retourne le nombre de versions en pause
     * @return {number} nombre de versions en pause
     */
    function getPausedVersions() {
      let paused = 0;
      // Pour chaque version de la liste
      vm.list.forEach((version) => {
        // Si la version est en pause, incrément du compteur
        if (version.paused) paused++;
      });
      return paused;
    }

    /**
     * Appel le serveur pour mettre en pause les versions actives
     */
    function pauseAll() {
      versionsService.pauseAll()
        .then((results) => {
          // Inspection des résultats pour traiter les versions OK et en erreur
          results.ok.forEach((ok) => {
            // Pour chaque version mise en pause, mise en pause locale
            vm.list[vm.list.findIndex(version => version._id === ok._id)].paused = true;
            toastService.success(`Version ${versionName(ok)} mise en pause`);
          });
          results.errors.forEach((error) => {
            // Pour chaque mise en pause de version en erreur, affichage d'un message
            toastService.error(`Erreur lors la mise en pause de la version ${versionName(error)}`);
          });
        })
        .catch(error => errorHandlerService.handleServerError(error, `Une erreur est survenue lors de la mise en pause des versions`));
    }

    /**
     * Appel le serveur pour mettre en pause les versions actives
     */
    function unpauseAll() {
      versionsService.unpauseAll()
        .then((results) => {
          // Inspection des résultats pour traiter les versions OK et en erreur
          results.ok.forEach((ok) => {
            // Pour chaque version activée, activation locale
            vm.list[vm.list.findIndex(version => version._id === ok._id)].paused = false;
            toastService.success(`Version ${versionName(ok)} activée`);
          });
          results.errors.forEach((error) => {
            // Pour chaque activation de version en erreur, affichage d'un message
            toastService.error(`Erreur lors l'activation de la version ${versionName(error)}`);
          });
        })
        .catch(error => errorHandlerService.handleServerError(error, `Une erreur est survenue lors de l'activation des versions`));
    }

    //--------------------------------------------------------------------------------------------------------
    //------------------------------------------ GESTION DES CONTROLES ---------------------------------------
    //--------------------------------------------------------------------------------------------------------



    //++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
    //+++++++++++++++++++++++++++++++++++++++++++ GESTION DES INFOS ++++++++++++++++++++++++++++++++++++++++++
    //++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

    /**
     * Ajoute un email à la liste des personnes à contacter en fin de déploiement
     */
    function addEmail() {
      if (vm.newEmail) {
        // Vérification de la non présence de cet email à la liste existante
        if (vm.selected.configuration.mailRecipients.indexOf(vm.newEmail) === -1) {
          // Non existant, ajout de l'email à la liste
          vm.selected.configuration.mailRecipients.push(vm.newEmail);
          updateVersion()
            .then(() => {
              // Non existant, ajout de l'email à la liste
              vm.selected.configuration.mailRecipients.push(vm.newEmail);
              // Reset du champ email
              vm.newEmail = '';
              // Renew de l'oiriginal
              vm.originalVersion = JSON.parse(JSON.stringify(vm.selected));
            })
            .catch((err) => {
              // Non existant, ajout de l'email à la liste
              vm.selected.configuration.mailRecipients.splice(vm.selected.configuration.mailRecipients.indexOf(vm.newEmail), 1);
              errorHandlerService.handleServerError(error, 'Une erreur est survenue lors de l\'ajout de l\'email');
            });
        } else {
          // Existant, affichage d'un message d'erreur
          toastService.warning(`Email ${vm.newEmail} déjà présent dans la liste`);
        }
      }
    }

    /**
     * Suppression d'un email de la liste des personnes à contacter en fin de déploiement
     * @param  {string} email - email à supprimer
     */
    function deleteEmail(email) {
      // Ouvre la fenêtre de dialogue
      const modal = $uibModal.open({
        templateUrl: 'partials/versions-delete-modal.html',
        controller: 'versionsDeleteController',
        controllerAs: 'versionsDelete',
        appendTo: angular.element($document[0].querySelector('#versions')),
        size: 'md',
        backdrop: 'static',
        resolve: {
          // Informations de la modal
          infos: () => {
            return {
              title: 'Confirmation',
              message: `Etes-vous sûr de vouloir supprimer de la liste de diffusion, l'email<br>${email} ?`
            }
          },
        }
      });

      // En retour, suppression la version si confirmation
      modal.result.then((choice) => {
        if (choice) {
          // Recherche de l'index de l'email et suppression
          vm.selected.configuration.mailRecipients.splice(vm.selected.configuration.mailRecipients.indexOf(email), 1);
          updateVersion()
            .catch(() => {
              // Reset de la liste des emails
              vm.selected.configuration.mailRecipients = vm.originalVersion.slice();
            });
        }
      });
    }

    /**
     * Suppression de la version sélectionnée
     */
    function deleteVersion() {
      // Ouvre la fenêtre de dialogue
      const modal = $uibModal.open({
        templateUrl: 'partials/versions-delete-modal.html',
        controller: 'versionsDeleteController',
        controllerAs: 'versionsDelete',
        appendTo: angular.element($document[0].querySelector('#versions')),
        size: 'md',
        backdrop: 'static',
        resolve: {
          // Informations de la modal
          infos: () => {
            return {
              title: 'Confirmation',
              message: `Etes-vous sûr de vouloir supprimer la version <br>${versionsService.versionName(vm.selected)} ?`
            }
          },
        }
      });

      // En retour, suppression la version si confirmation
      modal.result.then((choice) => {
        if (choice) {
          // Appel au service avec la version sélectionnée
          versionsService.deleteVersion(vm.selected)
            .then(() => {
              // Si ok, suppression de la liste locale des versions
              vm.list.splice(vm.list.indexOf(vm.selected), 1);
              toastService.success(`Version ${versionName(vm.selected)} supprimée`);
              // Sélection d'une autre version
              selectDefault();
            })
            .catch(error => errorHandlerService.handleServerError(error, 'Une erreur est survenue lors de la suppression de la version'));
        }
      });
    }

    /**
     * Sélectionne une version par défaut
     */
    function selectDefault() {
      // Reset des élements sélectionnés
      vm.selected = null;
      vm.selectedDeployment = null;
      // Si la liste des versions n'est pas vide
      if (vm.list && vm.list.length > 0) {
        // Sélection de la première versions de la liste
        vm.selected = vm.list[0];
        // Copie de la version originale pour détection des modifications
        vm.originalVersion = JSON.parse(JSON.stringify(vm.list[0]));
        // Fermeture de tous les serveurs de la version
        vm.selected.servers.forEach((s) => {
          vm.uncollapsedServers[s._id] = false;
        });
        // Vérification si un déploiement est en cours
        if (vm.selected.deployments && vm.selected.deployments.length > 0) {
          const inProgress = vm.selected.deployments.find(d => d.status === 'IN-PROGRESS');
          // Sélection automatique du déploiement en cours pour suivi live
          if (inProgress) selectDeployment(inProgress);
        }
      }
    }

    /**
     * Sélectionne une version
     */
    function selectVersion() {
      // Copie de la version originale pour détection des modifications
      vm.originalVersion = JSON.parse(JSON.stringify(vm.selected));
      // Reset les serveurs ouverts de la version
      vm.uncollapsedServers = [];
      vm.selected.servers.forEach((s) => {
        vm.uncollapsedServers[s._id] = false;
      });
      // Reset la sélection du déploiement
      vm.selectedDeployment = null;
    }

    /**
     * Modifie la version sélectionnée
     */
    function updateVersion() {
      const deferred = $q.defer();
      if (vm.selected.name && vm.selected.numero) {
        // Appel au service avec la version sélectionnée
        versionsService.updateVersion(vm.selected)
          .then(() => {
            toastService.success(`Version modifiée`);
            vm.originalVersion = JSON.parse(JSON.stringify(vm.selected));
            deferred.resolve();
          })
          .catch(error => {
            errorHandlerService.handleServerError(error, 'Une erreur est survenue lors de la mise en jour de la version');
            deferred.reject();
          });
      } else deferred.resolve();
      return deferred.promise;
    }

    /**
     * Renvoie le nom complet de la version
     * @param  {Version} version - version à nommer
     * @return {string}  le nom complet de la version
     */
    function versionName(version) {
      return versionsService.versionName(version);
    }

    //--------------------------------------------------------------------------------------------------------
    //-------------------------------------------- GESTION DES INFOS -----------------------------------------
    //--------------------------------------------------------------------------------------------------------



    //++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
    //++++++++++++++++++++++++++++++++++++++++ GESTION DES SERVEURS ++++++++++++++++++++++++++++++++++++++++++
    //++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

    /**
     * Ajoute un EAR à un serveur
     * @param {Server} server - serveur auquel ajouter l'EAR
     */
    function addEarToServer(server) {
      versionsService.addEarToServer(vm.selected, server, server.newEar)
        .then(() => {
          // OK, ajout de l'EAR en local
          server.ears.push(server.newEar);
          toastService.success(`EAR ${server.newEar} ajouté au serveur ${server.name}`);
          // Reset du champ EAR
          server.newEar = '';
        })
        .catch(error => errorHandlerService.handleServerError(error, 'Une erreur est survenue lors de l\'ajout du serveur'));
    }

    /**
     * Ajoute un serveur à la version sélectionnée
     */
    function addServer() {
      // Appel au service avec la version sélectionnée et le serveur à ajouter
      versionsService.addServer(vm.selected, vm.newServer)
        .then((server) => {
          // OK, ajout du serveur en local
          vm.selected.servers.push(server);
          toastService.success('Serveur ajouté');
          // Reset du champ
          vm.newServer = '';
        })
        .catch(error => errorHandlerService.handleServerError(error, 'Une erreur est survenue lors de l\'ajout du serveur'));
    }

    /**
     * Retourne l'url du standalone.xml d'un serveur
     * @param  {Server} server - serveur
     * @return {string} url du standalone.xml d'un serveur
     */
    function getStandaloneUrl(server) {
      // Appel au service avec la version sélectionnée et le serveur
      return versionsService.getStandaloneUrl(vm.selected, server);
    }

    /**
     * Renvoie si un serveur est ouvert ou non
     * @param  {Server}  server - serveur à tester
     * @return {boolean} true si le serveur est fermé
     */
    function isCollapsed(server) {
      return vm.uncollapsedServers[server._id] === false || vm.uncollapsedServers[server._id] === undefined;
    }

    /**
     * Ouvre un serveur
     * @param  {Server}  server - serveur à ouvrir
     */
    function openServer(server) {
      vm.uncollapsedServers[server._id] ? vm.uncollapsedServers[server._id] = false : vm.uncollapsedServers[server._id] = true;
    }

    /**
     * Supprime un EAR d'un serveur de la version sélectionnée
     * @param  {Server} server - serveur duquel supprimer l'EAR
     * @param  {string} ear    - EAR à supprimer du serveur
     */
    function removeEarFromServer(server, ear) {
      // Ouvre la fenêtre de dialogue
      const modal = $uibModal.open({
        templateUrl: 'partials/versions-delete-modal.html',
        controller: 'versionsDeleteController',
        controllerAs: 'versionsDelete',
        appendTo: angular.element($document[0].querySelector('#versions')),
        size: 'md',
        backdrop: 'static',
        resolve: {
          // Informations de la modal
          infos: () => {
            return {
              title: 'Confirmation',
              message: `Etes-vous sûr de vouloir supprimer l'EAR<br>${ear} du serveur ${server.name} ?`
            }
          },
        }
      });

      // En retour, suppression la version si confirmation
      modal.result.then((choice) => {
        if (choice) {
          // Appel au service avec la version sélectionnée, le serveur et l'EAR
          versionsService.removeEarFromServer(vm.selected, server, ear)
            .then(() => {
              // OK, suppression de l'EAR en local
              server.ears.splice(server.ears.indexOf(ear), 1);
              toastService.success(`EAR ${ear} supprimé du serveur ${server.name}`);
            })
            .catch(error => errorHandlerService.handleServerError(error, 'Une erreur est survenue lors de la suppression de l\'EAR'));
        }
      });
    }

    /**
     * Supprime un serveur de la version sélectionnée
     * @param  {Server} server - serveur à supprimer de la version
     */
    function removeServer(server) {
      // Ouvre la fenêtre de dialogue
      const modal = $uibModal.open({
        templateUrl: 'partials/versions-delete-modal.html',
        controller: 'versionsDeleteController',
        controllerAs: 'versionsDelete',
        appendTo: angular.element($document[0].querySelector('#versions')),
        size: 'md',
        backdrop: 'static',
        resolve: {
          // Informations de la modal
          infos: () => {
            return {
              title: 'Confirmation',
              message: `Etes-vous sûr de vouloir supprimer la serveur<br>${server.name} ?`
            }
          },
        }
      });

      // En retour, suppression la version si confirmation
      modal.result.then((choice) => {
        if (choice) {
          // Appel au service avec la version sélectionnée et le serveur
          versionsService.removeServer(vm.selected, server)
            .then(() => {
              // OK, suppression deu serveur en local
              vm.uncollapsedServers[server._id] = undefined;
              vm.selected.servers.splice(vm.selected.servers.indexOf(server), 1);
              toastService.success(`Serveur ${server.name} supprimé`);
            })
            .catch(error => errorHandlerService.handleServerError(error, 'Une erreur est survenue lors de la suppression du serveur'));
        }
      });
    }

    /**
     * Upload un standalone.xml pour un serveur de la version sélectionnée
     * @param  {Server} server - serveur associé au standalone.xml
     * @param  {file}   file   - fichier standalone.xml
     */
    function uploadStandalone(server, file) {
      // Appel au service avec la version sélectionnée, le serveur et le fichier
      versionsService.uploadStandalone(vm.selected, server, file)
        .then(() => toastService.success(`Standalone uploadé pour le serveur '${server.name}'`))
        .catch(error => errorHandlerService.handleServerError(error, 'Une erreur est survenue lors de l\'upload du standalone.xml'));
    }

    //--------------------------------------------------------------------------------------------------------
    //------------------------------------------ GESTION DES SERVEURS ----------------------------------------
    //--------------------------------------------------------------------------------------------------------



    //++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
    //++++++++++++++++++++++++++++++++++++++ GESTION DES DEPLOIEMENTS ++++++++++++++++++++++++++++++++++++++++
    //++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

    /**
     * Annule un déploiement
     * @param  {Deployment} deployment - déploiement à annuler
     */
    function cancelDeployment(deployment) {
      versionsService.cancelDeployment(vm.selected, deployment)
        .then(() => {
          // Suppression du déploiement local
          vm.selected.deployments.splice(vm.selected.deployments.findIndex(d => d._id === deployment._id));
          toastService.success(`Déploiement de la version ${versionName(vm.selected)} annulé`);
        })
        .catch(error => errorHandlerService.handleServerError(error, 'Une erreur est survenue lors de l\'annulation du déploiement'));
    }

    /**
     * Converti un statut en label à afficher
     * @param  {string} status - statut à convertir
     * @return {[string]} label à afficher
     */
    function convertStatus(status) {
      switch (status) {
        case 'SUCCEED':
          return 'SUCCES'
        case 'FAILED':
          return 'EN ERREUR'
        case 'IN-PROGRESS':
          return 'EN COURS'
        case 'PENDING':
          return 'EN ATTENTE'
        default:
          return '';
      }
    }

    /**
     * Lance le déploiement de la version sélectionnée
     */
    function deployVersion() {
      // Appel au service avec la version sélectionnée
      versionsService.deployVersion(vm.selected)
        .then((result) => {
          // OK, met à jour la liste locale des déploiements (seulement les 6 plus récents sont conservés)
          result.deleted.forEach((dep) => {
            // Si le déploiement n'existe plus côté serveur on le supprime des déploiements locaux
            const index = vm.selected.deployments.findIndex(d => d._id === dep);
            if (index > -1) vm.selected.deployments.splice(index, 1);
          });
          // Ajout du déploiement en cours aux déploiements locaux
          const index = vm.selected.deployments.findIndex(d => d._id === result.deployment._id);
          if (index === -1) vm.selected.deployments.push(result.deployment);
          if (result.deployment.status === 'PENDING') toastService.warning(`Déploiement de la version ${versionName(vm.selected)} mise en liste d'attente`);
          else toastService.success(`Déploiement de la version ${versionName(vm.selected)} démarré`);
        })
        .catch(error => errorHandlerService.handleServerError(error, 'Une erreur est survenue lors du lancement du déploiement'));
    }

    /**
     * Ouvre la fenêtre de dialogue de log d'un déploiement
     * @param  {Deployment} deployment - déploiement associé à la log
     */
    function getDeploymentLog(deployment) {
      const modal = $uibModal.open({
        templateUrl: 'partials/versions-deployment-modal.html',
        controller: 'versionsDeploymentModal',
        controllerAs: 'versionsDeploymentModal',
        appendTo: angular.element($document[0].querySelector('#versions')),
        size: 'lg',
        resolve: {
          // Déploiement à suivre
          deployment: ['versionsService', () => versionsService.getDeployment(vm.selected, deployment)],
          // Socket pour mise à jour live de la log
          socket: () => vm.deploymentSocket,
        }
      });
    }

    /**
     * Ouvre la fenêtre de dialogue de log du déploiement d'un serveur
     * @param  {Server} server - serveur pour lequel afficher la log
     */
    function getServerDeploymentLog(server) {
      const modal = $uibModal.open({
        templateUrl: 'partials/versions-deployment-server-modal.html',
        controller: 'versionsDeploymentServerModal',
        controllerAs: 'versionsDeploymentModal',
        appendTo: angular.element($document[0].querySelector('#versions')),
        size: 'lg',
        resolve: {
          // Serveur pour lequel afficher la log
          server: () => server,
          // Socket pour affichage en live
          socket: () => vm.deploymentSocket,
        }
      });
    }

    /**
     * Retourne l'url du fichier server.log du déploiement d'un serveur
     * @param  {Server} server - serveur pour lequel récupérer l'url de la log
     * @return {string} url du fichier server.log du déploiement du serveur
     */
    function getServerDeploymentLogFileUrl(server) {
      // Appel au service avec la version sélectionnée, le déploiement et le serveur
      return versionsService.getServerLogFileUrl(vm.selected, vm.selectedDeployment, server);
    }

    /**
     * Retourne le type css associé au statut du déploiement
     * @param  {string}     status     - statut à interpréter
     * @param  {Deployment} deployment - déploiement associé (si non null, on vérifie si c'est celui sélectionné)
     * @return {string} type css associé au statut
     */
    function getType(status, deployment) {
      // Si le déploiement passé est non null et qu'un est sélectionné et que ce n'est pas celui passé => type désactivé
      if (deployment && vm.selectedDeployment && vm.selectedDeployment !== deployment) return 'secondary';
      // Correspondance avec le statut
      switch (status) {
        case 'SUCCEED':
          return 'success'
        case 'FAILED':
          return 'danger'
        case 'IN-PROGRESS':
          return 'primary'
        case 'PENDING':
          return 'warning'
        default:
          return '';
      }
    }

    /**
     * Créer les listeners sur les évènements serveur d'un déploiement
     */
    function registerSocketEvent() {
      // Listeneur pour MAJ de la liste des déploiements en live
      vm.deploymentSocket.on('deployment-created', (dep) => {
        const index = vm.selected.deployments.findIndex(d => d._id === dep._id);
        if (index === -1) vm.selected.deployments.push(dep);
        // Mise à jour du scope
        $scope.$applyAsync();
      });
      // Listeneur pour MAJ de la liste des déploiements en live
      vm.deploymentSocket.on('deployment-deleted', (deps) => {
        // Suppression de la liste locale de tous les déploiements supprimés
        deps.forEach(id => vm.selected.deployments.splice(vm.selected.deployments.findIndex(d => d._id === id), 1));
        // Mise à jour du scope
        $scope.$applyAsync();
      });
      // Listeneur pour MAJ live de la log sur évènement de fin du déploiement
      vm.deploymentSocket.on('deployment-started', (dep) => {
        if (dep.version === vm.selected._id) {
          // Recherche du déploiement associé à l'évènement
          const deployment = vm.selected.deployments.find(d => d._id === dep._id);
          if (deployment) {
            // Mise à jour du déploiement local
            deployment.servers = dep.servers;
            deployment.logs = dep.logs;
            deployment.status = dep.status;
          } else {
            // Nouveau déploiement ajout aux déploiements locaux
            vm.selected.deployments.push(dep);
          }
          // Mise à jour du scope
          $scope.$applyAsync();
        }
      });
      // Listeneur pour MAJ live de la log sur évènement d'un serveur en déploiement
      vm.deploymentSocket.on('deployment-server-progress', (infos) => {
        // Recherche du déploiement associé à l'évènement
        const deployment = vm.selected.deployments.find(d => d._id === infos.deployment._id);
        // Mise à jour du serveur local
        const index = deployment.servers.findIndex(srv => srv._id === infos.server._id);
        if (index > -1) deployment.servers[index] = infos.server;
        // Mise à jour du scope
        $scope.$applyAsync();
      });
      // Listeneur pour MAJ live de la log sur évènement déploiement
      vm.deploymentSocket.on('deployment-progress', (dep) => {
        // Recherche du déploiement associé à l'évènement
        const deployment = vm.selected.deployments.find(d => d._id === dep._id);
        // Mise à jour du déploiement local
        deployment.servers = dep.servers;
        deployment.logs = dep.logs;
        deployment.status = dep.status;
        // Mise à jour du scope
        $scope.$applyAsync();
      });
      // Listeneur pour MAJ live de la log sur évènement de fin du déploiement
      vm.deploymentSocket.on('deployment-finished', (dep) => {
        // Recherche du déploiement associé à l'évènement
        const deployment = vm.selected.deployments.find(d => d._id === dep._id);
        // Mise à jour du déploiement local
        deployment.servers = dep.servers;
        deployment.logs = dep.logs;
        deployment.status = dep.status;
        // Mise à jour du scope
        $scope.$applyAsync();
      });
    }

    /**
     * Sélectionne un déploiement et récupère ses infos sur le serveur
     * @param  {Deployment} deployment - déploiement à récupérer
     */
    function selectDeployment(deployment) {
      // Si le déploiement est celui sélectionné, on désélectionne
      if (vm.selectedDeployment === deployment) vm.selectedDeployment = null;
      else {
        // Appel au service avec la version sélectionnée et le déploiement
        versionsService.getDeployment(vm.selected, deployment)
          .then((dep) => {
            // MAJ du déploiement sélectionné avec le déploiement renvoyé
            vm.selectedDeployment = deployment;
            vm.selectedDeployment.servers = dep.servers;
            vm.selectedDeployment.logs = dep.logs;
            vm.selectedDeployment.status = dep.status;
          })
          .catch(error => errorHandlerService.handleServerError(error, 'Une erreur est survenue lors de la récupération du déploiement'));
      }
    }

    //--------------------------------------------------------------------------------------------------------
    //---------------------------------------- GESTION DES DEPLOIEMENTS --------------------------------------
    //--------------------------------------------------------------------------------------------------------

    /**
     * Initialise le controleur
     * en sélectionnant la version par défaut
     * en ouvrant la socket pour suivi de déploiement
     */
    function init(list) {
      // Ouverture d'une socket vers le serveur pour évènement live des déploiements
      vm.deploymentSocket = io.connect(DEPLOYER_API.URL);
      // Sélection de la version par défaut
      selectDefault();
      registerSocketEvent();
    }

    // Appel de l'initialisation à la création du controleur
    init(list);
  }
})();
