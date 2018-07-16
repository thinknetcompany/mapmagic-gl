/* eslint-disable */
const logger = require('beaver-logger')
const constant = require('../constant')

const { NODE_ENV, LOGGER_URL, LOGGER_URL_DEV, LOGGER_TIMER } = constant
const url = window.location.href
const urlLog = NODE_ENV !== 'production' ? LOGGER_URL_DEV : LOGGER_URL
const userAgent = navigator.userAgent

const defaultLogging = (logCallback) => (functionName, message, args = {}, emitLog = true) => {
  const payload = {
    'user-agent': userAgent,
    app_id: process.env.APP_ID,
    function_name: functionName,
    url,
    message
  }
  if (process.env.DEBUG) {
    payload.args = args
  }
  if (process.env.LOGGING && emitLog) {
    logCallback('mapmagic', payload)
  }
}

const initLogger = () => {
  logger.init({
    uri: urlLog,
    flushInterval: LOGGER_TIMER,
    heartbeat: false,
    silent: true,
  })
}

const debug = defaultLogging(logger.debug)
const info = defaultLogging(logger.info)
const warn = defaultLogging(logger.warn)
const error = defaultLogging(logger.error)

module.exports = {
  initLogger,
  debug,
  info,
  warn,
  error,
};
