/**
 * @fileoverview Version class module
 * @module models/deployer/deployment
 * @requires {@link external:mongoose}
 */

const mongoose = require('mongoose');

const Schema = mongoose.Schema;

/**
 * Describes a deployment log line
 * @class
 * @name LogSchema
 */
const LogSchema = new Schema({
  level: {
    type: String,
    enum: ['INFO', 'ERROR', 'WARNING'],
    required: true,
  },

  date: {
    type: Date,
    required: true,
  },

  message: {
    type: String,
    required: true,
  },
});

/**
 * Describes a EAR deployment
 * @class
 * @name EarSchema
 */
const EarSchema = new Schema({
  name: {
    type: String,
    required: true,
  },

  status: {
    type: String,
    enum: ['SUCCEED', 'FAILED', 'IN-PROGRESS'],
    default: 'IN-PROGRESS',
    required: true,
  },

  url: String,
});

/**
 * Describes a server deployment
 * @class
 * @name ServerSchema
 */
const ServerSchema = new Schema({
  name: {
    type: String,
    required: true,
  },

  ears: [
    { type: EarSchema },
  ],

  status: {
    type: String,
    enum: ['SUCCEED', 'FAILED', 'IN-PROGRESS'],
    default: 'IN-PROGRESS',
    required: true,
  },

  logs: [
    { type: LogSchema },
  ],
});

/**
 * Describes a deployment
 * @class
 * @name DeploymentSchema
 */
const DeploymentSchema = new Schema({
  date: {
    type: Date,
    required: true,
  },

  status: {
    type: String,
    enum: ['SUCCEED', 'FAILED', 'IN-PROGRESS', 'PENDING'],
    default: 'IN-PROGRESS',
    required: true,
  },

  servers: [
    { type: ServerSchema },
  ],

  logs: [
    { type: LogSchema },
  ],

  version: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Version',
  },
});

/**
 * Ajoute une log au deploiement
 * @param {string} level   - niveau de la log
 * @param {string} message - message à logger
 */
/* eslint func-names: 0 */
DeploymentSchema.methods.addLog = function (level, message) {
  this.logs.push({
    date: new Date(),
    level,
    message,
  });
};

/**
 * Ajoute une log au deploiement
 * @param {string} level   - niveau de la log
 * @param {string} message - message à logger
 */
DeploymentSchema.methods.addServerLog = function (level, message, server) {
  const srv = this.servers.find(s => s._id === server._id);
  if (srv) {
    srv.logs.push({
      date: new Date(),
      level,
      message,
    });
  }
};

module.exports = mongoose.model('Deployment', DeploymentSchema);
