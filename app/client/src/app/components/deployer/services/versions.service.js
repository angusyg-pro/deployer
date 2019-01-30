(function() {
  'use strict';

  angular
    .module('webadmin.deployer')
    .factory('versionsService', VersionsService);

  VersionsService.$inject = [
    'DEPLOYER_API',
    '$http',
    'Upload',
  ];

  /**
   * Service d'accès au serveur de resources pour les versions
   * @param       {Coonstant} DEPLOYER_API - configuration pour l'accès au serveur
   * @param       {Service}   $http        - service de gestion des appels HTTP
   * @param       {Service}   Upload       - service d'upload de fichiers
   * @constructor
   */
  function VersionsService(DEPLOYER_API, $http, Upload) {
    const url = `${DEPLOYER_API.URL}/versions`;
    const mailModes = [{
      type: 'ALWAYS',
      label: 'TOUJOURS',
    }, {
      type: 'FAILED',
      label: 'EN ERREUR',
    }, {
      type: 'SUCCEED',
      label: 'EN SUCCES',
    }, {
      type: 'NEVER',
      label: 'JAMAIS',
    }];
    return {
      addEarToServer: (version, server, ear) => $http.post(`${url}/${version._id}/servers/${server._id}`, { ear }).then(result => result.data),
      addServer: (version, server) => $http.post(`${url}/${version._id}/servers`, { name: server }).then(result => result.data),
      addVersion: (version) => $http.post(`${url}`, version).then(result => result.data),
      cancelDeployment: (version, deployment) => $http.get(`${url}/${version._id}/deployments/${deployment._id}/cancel`),
      deleteVersion: (version) => $http.delete(`${url}/${version._id}`),
      deployVersion: (version) => $http.get(`${url}/${version._id}/deployments/deploy`).then(result => result.data),
      getDeployment: (version, deployment) => $http.get(`${url}/${version._id}/deployments/${deployment._id}`).then(result => result.data),
      getServerDeploymentLog: (version, deployment, server) => $http.get(`${url}/${version._id}/deployments/${deployment._id}/servers/${server._id}/log`).then(result => result.data),
      getServerLogFileUrl: (version, deployment, server) => `${url}/${version._id}/deployments/${deployment._id}/servers/${server._id}/serverlog`,
      getStandaloneUrl: (version, server) => `${url}/${version._id}/servers/${server._id}/standalone`,
      pause: (version) => $http.get(`${url}/${version._id}/pause`),
      pauseAll: () => $http.get(`${url}/pause`).then(result => result.data),
      mailModes,
      list: () => $http.get(url).then(result => result.data),
      removeEarFromServer: (version, server, ear) => $http.delete(`${url}/${version._id}/servers/${server._id}/ear/${ear}`),
      removeServer: (version, server) => $http.delete(`${url}/${version._id}/servers/${server._id}`),
      unpause: (version) => $http.get(`${url}/${version._id}/unpause`),
      unpauseAll: () => $http.get(`${url}/unpause`).then(result => result.data),
      updateVersion: (version) => $http.put(`${url}/${version._id}`, version),
      uploadStandalone: (version, server, file) => Upload.upload({ url: `${url}/${version._id}/servers/${server._id}/standalone`, data: { file: file } }),
      versionName: (version) => version.name ? `${version.name} - ${version.numero}${version.snapshot ? '-SNAPSHOT' : ''}${version.paused ? ' - En pause' : ''}` : '',
    };
  }
})();
