/* eslint-disable */
import LOG_CONSTANT from './logConstant'

const NODE_ENV = 'production'

const API_URL = 'https://api.mapmagic.co.th/v2/get-map-style'

// Config Logger
const LOGGER_URL = 'https://api.mapmagic.co.th/log/v1/mapmagic-gl/emit-log'
const LOGGER_CONFIG_URL = 'https://api.mapmagic.co.th/log/v1/mapmagic-gl/log-config'
const LOGGER_URL_DEV = 'http://localhost:5006/log/v1/mapmagic-gl/emit-log'
const LOGGER_CONFIG_URL_DEV = 'http://localhost:5006/log/v1/mapmagic-gl/log-config'
const LOGGER_TIMER = 5000

// constant function
const LOGO_CLASSNAME = 'mapmagic-ctrl-logo'

export {
  LOG_CONSTANT,
  LOGGER_URL,
  LOGGER_CONFIG_URL,
  LOGGER_URL_DEV,
  LOGGER_CONFIG_URL_DEV,
  LOGGER_TIMER,
  API_URL,
  NODE_ENV,
  LOGO_IMG,
  LOGO_CLASSNAME,
}
