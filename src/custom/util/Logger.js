// @flow
import logger from 'beaver-logger';
import { LOGGER_URL, LOGGER_TIMER } from '../constant';

const props = {};

const defaultLogger = (logCallback) => (
    functionName,
    message = '',
    args = {},
    emitLog = true,
) => {
    const url = window.location.href;
    const userAgent = navigator.userAgent;

    const payload = {
        'user-agent': userAgent,
        app_id: props.APP_ID, //eslint-disable-line
        function_name: functionName, //eslint-disable-line
        url,
        message
    };
    if (props.DEBUG) {
        payload.args = args;
    }

    if (props.LOGGING && emitLog) {
        logCallback('mapmagic', payload);
    }
};

const Logger = {
    init: (APP_ID, LOGGING, DEBUG) => {
        props.APP_ID = APP_ID;
        props.LOGGING = LOGGING;
        props.DEBUG = DEBUG;
        logger.init({
            uri: LOGGER_URL,
            flushInterval: LOGGER_TIMER,
            heartbeat: false,
            silent: true,
        });
        props.logger = logger;
    },
    debug: defaultLogger(logger.debug),
    info: defaultLogger(logger.info),
    warn: defaultLogger(logger.warn),
    error: defaultLogger(logger.error),
    getDebug: () => props.DEBUG,
    getLogging: () => props.LOGGING,
};

Object.freeze(Logger);

export default Logger;
