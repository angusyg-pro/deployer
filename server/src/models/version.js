/**
 * @fileoverview Version class module
 * @module models/deployer/version
 * @requires {@link external:mongoose}
 */

const mongoose = require('mongoose');

const Schema = mongoose.Schema;

/**
 * Describes a version Configuration
 * @class
 * @name ConfigurationSchema
 */
const ConfigurationSchema = new Schema({
  mailRecipients: [
    { type: String },
  ],

  artifactoryUrl: {
    type: String,
    required: true,
  },

  mailMode: {
    type: String,
    enum: ['ALWAYS', 'FAILED', 'SUCCEED', 'NEVER'],
    require: true,
    default: 'ALWAYS',
  },

  interval: { type: String },
});

/**
 * Describes a server
 * @class
 * @name ServerSchema
 */
const ServerSchema = new Schema({
  name: {
    type: String,
    required: true
  },

  ears: [
    { type: String }
  ],
});

/**
 * Describes a Version
 * @class
 * @name VersionSchema
 */
const VersionSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },

  snapshot: {
    type: Boolean,
    required: true,
  },

  paused: {
    type: Boolean,
    default: false,
  },

  servers: [ServerSchema],

  numero: {
    type: String,
    required: true,
    trim: true,
  },

  deployments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Deployment',
  }],

  configuration: { type: ConfigurationSchema },
});

VersionSchema.virtual('fullName').get(function () {
  return `${this.name} - ${this.numero}${this.snapshot ? '-SNAPSHOT': ''}`;
});

module.exports = mongoose.model('Version', VersionSchema);
