/* eslint-disable */
const logger = require('beaver-logger')
const constant = require('../constant')

const { LOGGER_URL, LOGGER_TIMER } = constant
const url = window.location.href

const initLogger = () => {
  logger.init({
    uri: LOGGER_URL,
    flushInterval: LOGGER_TIMER,
    heartbeat: false,
    silent: true,
  })
}

const info = (functionId, args = {}) => {
  const payload = { 
    appId: process.env.APP_ID, 
    functionId,
    url,
    args,
  }

  
  logger.info('mapmagic', payload)
}

const warn = (functionId, message) => {
  const payload = { appId: process.env.APP_ID, functionId, url, message }
  logger.warn('mapmagic', payload)
}

const error = (functionId, message) => {
  const payload = { appId: process.env.APP_ID, functionId, url, message }
  logger.error('mapmagic', payload)
}

module.exports = {
  initLogger,
  info,
  warn,
  error,
};
