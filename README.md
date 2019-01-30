# Serveur de déploiement automatique des EARs projet

## Besoin d'un proxy pour rebond vers la PFD

Le deployer ayant besoin d'accéder à la PFD, notamment Artifactory, et le Cloud PROBTP n'ayant pas accès à la PFD, il est nécessaire de faire un rebond par un proxy fonctionnant sur une machine de DEV.

La liste des proxies configurés est disponible dans le fichier *app/server/src/config/app.js* dans la variable *proxies*. Un proxy est de la forme 

~~~~
{
    address: 'NUMERO_MACHINE',
    port: 'PORT',
}
~~~~

Si de nouveaux proxies doivent être ajoutés, il doivent être configurés et une nouvelle image Docker doit être construite (voir section Création de l'image Docker). 

### Installation d'un proxy de rebond en local

Le zip du proxy à installer sur les machines de DEV est disponible ici:

https://openstack-ctn.cloud.probtp.com:13808/swift/v1/webrc_container/proxy-cloud-to-pfd.zip

Pour installer le proxy, seulement le dézipper dans le dossier de votre choix. 
Différents batchs permettent sa gestion:
* *demarrage.bat*: démarre le proxy
* *arret.bat*: arrête le proxy
* *logs.bat*: affiche les logs du proxy
* *status.bat*: affiche le status du proxy

Afin de démarrer le proxy en arrière plan au démarrage de la machine, il suffit de créer un raccourci (copier/coller le racourci) le batch de démarrage dans le dossier *C:\ProgramData\Microsoft\Windows\Start Menu\Programs\Startup*.

## Création de l'image Docker

### Vérification des paramètres d'environnement

Vérifier dans le fichier *app/ecosystem.config.js* que tous les paramètres sont corrects pour l'environnnement cible (port, url, url de la base de données ...) et les modifier si besoin.

### Construire l'image

Se placer à la racine du dépôt et faire la commande suivante en remplaçant les variables:
* PROXY_URL: URL du proxy pour connexion de npm au repository externe lors de l'installation (http://PBXXXX:PASSWORD@proxynav:8080).
* VERSION: Numéro de version de l'image.
~~~~
sudo docker build --network host --build-arg NPMPROXY=PROXY_URL -t deployer:latest -t deployer:VERSION .
~~~~
La commande va alors créer une image Docker disponible avec 2 tags.

## Démarrage d'un container avec Docker-compose

Vérifier que les paramètres dans le fichier *docker-compose.yml* à la racine sont corrects:
* Le nom du container.
* Le nom de l'image à utiliser.
* Le port par défaut de l'application dans le container est 3000.
* Il faut modifier si besoin le port de la machine host.

Exécuter la commande suivante dans le dossier pour démarrer le container en mode deamon:
~~~~
sudo docker-compose up -d
~~~~

## Arrêt d'un container avec Docker-compose

Dans le dossier contenant le fichier *docker-compose.yml* exécuter la commande:
~~~~
sudo docker-compose down
~~~~

Cette commande arrête le container et supprime le container arrêté.