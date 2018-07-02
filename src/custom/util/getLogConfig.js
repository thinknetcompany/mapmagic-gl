/* eslint-disable */
const window = require('../../util/window')
const { NODE_ENV, LOGGER_CONFIG_URL, LOGGER_CONFIG_URL_DEV } = require('../constant');

const getLogConfig = (callback = () => { }) => {
  const urlLog = NODE_ENV !== 'production' ? LOGGER_CONFIG_URL_DEV : LOGGER_CONFIG_URL
  const xhr = new window.XMLHttpRequest();
  xhr.responseType = 'json'
  xhr.open('GET', urlLog, true);
  xhr.onreadystatechange = () => {
    if (xhr.readyState === 4) {
      let res = {}
      if (xhr.response) {
        res = xhr.response
      } else {
        res = { isDebug: false, isLogging: false }
      }
      callback(res)
    }
  }
  xhr.send()
  return xhr
};

module.exports = getLogConfig;
