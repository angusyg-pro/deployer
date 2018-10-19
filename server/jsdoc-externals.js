/**
 * Callback function to pass control to the next matching middleware
 * @callback nextMiddleware
 * @global
 * @param {string|external:Error} [route|Error] - Next route to activate or Error to pass to next error handler middleware
 */

/**
 * Checks if user has role to call endpoint
 * @callback checkRole
 * @param  {external:Request}   req  - Request received
 * @param  {external:Response}  res  - Response to be send
 * @param  {nextMiddleware}     next - Callback to pass control to next middleware
 */

/**
 * The built-in class for creating error object
 * @external Error
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error
 */

/**
 * The path module provides utilities for working with file and directory paths.
 * @external path
 * @see https://nodejs.org/api/path.html
 */

/**
 * The fs module provides an API for interacting with the file system in a manner closely modeled around standard POSIX functions.
 * @external fs
 * @see https://nodejs.org/api/fs.html
 */

/**
 * Fast, unopinionated, minimalist web framework for Node.js
 * @external express
 * @see http://expressjs.com/
 */

/**
 * The req object represents the HTTP request and has properties for the request query string, parameters, body, HTTP headers, and so on.
 * @external Request
 * @see http://expressjs.com/en/4x/api.html#req
 */

/**
 * The res object represents the HTTP response that an Express app sends when it gets an HTTP request.
 * @external Response
 * @see http://expressjs.com/en/4x/api.html#res
 */

/**
 * Lib to help to hash passwords.
 * @external bcrypt
 * @see https://github.com/kelektiv/node.bcrypt.js
 */

/**
 * Node.js body parsing middleware, to parse incoming request bodies in a middleware before your handlers, available under the req.body property.
 * @external body-parser
 * @see https://github.com/expressjs/body-parser
 */

/**
 * Node.js compression middleware.
 * @external compression
 * @see https://github.com/expressjs/compression
 */

/**
 * Extremely fast node.js logger, inspired by Bunyan. It also includes a shell utility to pretty-print its log files
 * @external pino
 * @see https://github.com/pinojs/pino
 */

/**
 * A wrapper for Pino to provide Bunyan's multiple stream API
 * @external pino-multi-stream
 * @see https://github.com/pinojs/pino-multi-stream
 */

/**
 * The util module is primarily designed to support the needs of Node.js' own internal APIs. However, many of the utilities are useful for application and module developers as well.
 * @external util
 * @see https://nodejs.org/api/util.html
 */

/**
 * Continuation-local storage works like thread-local storage in threaded programming, but is based on chains of Node-style callbacks instead of threads.
 * @external continuation-local-storage
 * @see https://github.com/othiym23/node-continuation-local-storage
 */

/**
 * JsonWebToken implementation for node.js
 * @external jsonwebtoken
 * @see https://github.com/auth0/node-jsonwebtoken
 */

/**
 * An express middleware to log with pino.
 * @external express-pino-logger
 * @see https://github.com/pinojs/express-pino-logger
 */

/**
 * Simple, fast generation of RFC4122 UUIDS.
 * @external uuid/v4
 * @see https://github.com/kelektiv/node-uuid
 */

/**
 * Helmet helps to secure Express apps by setting various HTTP headers.
 * @external helmet
 * @see https://github.com/helmetjs/helmet
 */

/**
 * CORS is a node.js package for providing a Connect/Express middleware that can be used to enable CORS with various options.
 * @external cors
 * @see https://github.com/expressjs/cors
 */

/**
 * Simple, unobtrusive authentication for Node.js
 * @external passport
 * @see http://www.passportjs.org/
 */

/**
 * A Passport strategy for authenticating with a JSON Web Token.
 * @external passport-jwt
 * @see https://github.com/themikenicholson/passport-jwt
 */

/**
 * Elegant MongoDB object modeling for Node.js
 * @external mongoose
 * @see http://mongoosejs.com/
 */

/**
 * Easily create a flexible REST interface for mongoose models
 * @external express-restify-mongoose
 * @see https://florianholzapfel.github.io/express-restify-mongoose
 */

/**
 * An HTTP programmable proxying library that supports websockets. It is suitable for implementing components such as reverse proxies and load balancers.
 * @external http-proxy
 * @see https://github.com/nodejitsu/node-http-proxy
 */

/**
 * CORS is a node.js package for providing a Connect/Express middleware that can be used to enable CORS with various options.
 * @external cors
 * @see https://github.com/expressjs/cors
 */

/**
 * Node.js: extra methods for the fs object like copy(), remove(), mkdirs()
 * @external fs-extra
 * @see https://github.com/jprichardson/node-fs-extra
 */

/**
 * Node.js middleware for handling `multipart/form-data`.
 * @external multer
 * @see https://github.com/expressjs/multer
 */

/**
 * TCP ping utility for node.js
 * @external tcp-ping
 * @see https://github.com/apaszke/tcp-ping
 */

/**
 * The child_process module provides the ability to spawn child processes in a manner that is similar, but not identical, to popen(3).
 * @external child_process
 * @see https://nodejs.org/api/child_process.html
 */

/**
 * FEATURING THE FASTEST AND MOST RELIABLE REAL-TIME ENGINE
 * @external socket.io
 * @see https: //socket.io/
 */

/**
 * Cron for Node.js
 * @external cron
 * @see https://github.com/kelektiv/node-cron
 */

/**
 * Send e-mails with Node.JS – easy as cake!
 * @external nodemailer
 * @see https://github.com/nodemailer/nodemailer
 */

/**
 * Parse, validate, manipulate, and display dates and times in JavaScript.
 * @external moment
 * @see http://momentjs.com/
 */
