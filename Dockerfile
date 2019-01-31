FROM centos:7

USER root

# Emplacement du tar Jboss
ARG JBOSS_TAR
ARG GIT_REPOSITORY

# Ajout des variables d'environnement
ENV NODE_SOURCE https://rpm.nodesource.com/setup_11.x
ENV NODE_RPM https://rpm.nodesource.com/pub_11.x/el/7/x86_64/nodesource-release-el7-1.noarch.rpm
ENV JAVA_HOME /usr/lib/jvm/java
ENV JBOSS_HOME /opt/jboss/eap-6.4.17
ENV LAUNCH_JBOSS_IN_BACKGROUND true
ENV JBOSS_USER jboss
ENV NODE_VERSION 11.8.0
ENV PORT 3000
ENV NODE_APP_SRC /usr/src/nodejs

############################# Installation de JBOSS #############################

# Dépendances
RUN yum update -y && yum -y install xmlstarlet saxon augeas bsdtar unzip java-1.8.0-openjdk-devel initscripts && yum clean all

# Déplacement dans le dossier d'installation du Jboss
WORKDIR ${JBOSS_HOME}

# Télécharge le tar du JBoss sur le container Openstack et dézippe dans le dossier Jboss
RUN curl --noproxy '*' --insecure ${JBOSS_TAR} | tar -x -C ${JBOSS_HOME}

# Configure la console d'admin
RUN ${JBOSS_HOME}/bin/add-user.sh admin probtp@2018 --silent

# Ports exposés
EXPOSE 8080 9990 9999

############################# Installation de Nodejs #############################

RUN export NODETEMP=$(mktemp) && curl --insecure -o ${NODETEMP} ${NODE_RPM} && \
    rpm -i --nosignature --force ${NODETEMP} && rm -f ${NODETEMP} && unset NODETEMP

# Désactivation SSL pour yum
RUN echo sslverify=false >> /etc/yum.conf

# Installation de node
RUN yum -y install gcc-c++ make nodejs 

############################## Installation de PM2 ###############################

# Proxy pour NPM
RUN npm config set proxy=${http_proxy} && npm config set https-proxy=${https_proxy} && npm config set strict-ssl=false

# Installe pm2
RUN npm install pm2 -g 

# Installe pm2 log rotate et le configure
RUN pm2 install pm2-logrotate
RUN pm2 set pm2-logrotate:max_size 10M
RUN pm2 set pm2-logrotate:retain 10
RUN pm2 set pm2-logrotate:compress true
RUN pm2 set pm2-logrotate:dateFormat YYYY-MM-DD_HH-mm-ss
RUN pm2 set pm2-logrotate:rotateModule true
RUN pm2 set pm2-logrotate:workerInterval 30
RUN pm2 set pm2-logrotate:rotateInterval '0 0 * * *'

########################## Installation de l'application #########################

RUN yum install -y git

# Création du dossier de l'application node
WORKDIR ${NODE_APP_SRC}

# Récupération des sources du projet
RUN git -c http.sslVerify=false clone ${GIT_REPOSITORY} ${NODE_APP_SRC}

# Dossier de l'application
WORKDIR ${NODE_APP_SRC}/app

# Installation de l'application, build et clean des dépendances de dev
RUN npm install
RUN npm run build
RUN npm prune --production

# Supprime le proxy npm
RUN npm config rm proxy && npm config rm https-proxy

# Expose le port de l'application node
EXPOSE ${PORT}

# Monitore l'application node avec pm2
CMD ["pm2-runtime", "--json", "start", "ecosystem.config.js", "--env", "production"]

