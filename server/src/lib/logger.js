/**
 * @fileoverview Logger applicatif de mise en forme des logs
 * @module lib/logger
 */

const logger = {};

/**
 * Créé un objet représentant un message de log à partir d'un message
 * En plus du message on ajoute, le niveau de log, l'heure et le PID du process
 * @param  {string} level    - niveau de la log
 * @param  {string} message  - message à logger
 * @param  {[object[]]} args - arguments d'un appel de fonction en debug
 * @return {string} string de l'objet représentant un message de log formatté
 */
const formatMessage = (level, message, ...args) => {
  let pre = '';
  // Extraction de informations d'entête
  let stack = new Error().stack.split('\n');
  // Extraction de l'appelant
  if (stack[3]) stack = /at (.*) \(.*\)/.exec(new Error().stack.split('\n')[3].trim());
  if (stack) {
    // Extraction de la ligne et colonne
    const line = /.* \(.*\\(.*)\)/.exec(stack);
    if (line && line[1]) pre = `[${line[1]}]`;
    if (stack[1]) pre = `${pre}[${stack[1]}(${args && args.length > 0 ? JSON.stringify(args) : ''})]: `;
    else pre = `${pre}: `;
  }
  return JSON.stringify({
    level,
    date: new Date().getTime(),
    message: `${pre}${message}`,
    pid: process.pid,
  });
};

/**
 * Log un appel de fonction avec ses arguments avec le niveau DEBUG (sortie stdout)
 * si l'environnement n'est pas production
 * @param  {string} args - arguments de la fonction
 */
logger.debugFuncCall = (...args) => {
  if (process.env.NODE_ENV !== 'production') console.log(formatMessage('DEBUG', 'CALL', args));
};

/**
 * Log un message avec le niveau DEBUG (sortie stdout)
 * si l'environnement n'est pas production
 * @param  {string} message - message à logger
 */
logger.debug = (message) => {
  if (process.env.NODE_ENV !== 'production') console.log(formatMessage('DEBUG', message));
};

/**
 * Log un message avec le niveau INFO (sortie stdout)
 * @param  {string} message - message à logger
 */
logger.info = message => console.log(formatMessage('INFO', message));

/**
 * Log un message avec le niveau WARN (sortie stderr)
 * @param  {string} message - message à logger
 */
logger.warn = message => console.warn(formatMessage('WARN', message));

/**
 * Log un message avec le niveau ERROR (sortie stderr)
 * @param  {string} message - message à logger
 */
logger.error = (message, err) => {
  let errMsg = '';
  if (err && err instanceof Error) errMsg = ` - Stack: ${err.message}`;
  console.error(formatMessage('ERROR', `${message}${errMsg}`));
};

/**
 * Log un message avec le niveau FATAL (sortie stderr)
 * Le processus devrait être terminé suite à cette log
 * @param  {string} message - message à logger
 */
logger.fatal = message => console.error(formatMessage('FATAL', message));

module.exports = logger;
