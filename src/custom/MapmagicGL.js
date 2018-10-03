// @flow
import { extend } from '../util/util';
import Map from '../ui/map';
import NavigationControl from '.././ui/control/navigation_control';
import Debugger from './util/Debugger';
import Logger from './util/Logger';
import { isLight } from './util/Color';
import LogoControl from './ui/LogoControl';
import getLogConfig from './util/getLogConfig';
import { API_URL, LOGO_CLASSNAME } from './constant';
import {
    Style,
    Marker,
    Popup,
    Handler,
    Geometry,
} from './lib';

class MapMagicGL extends Map {
    constructor(options) {
        const newStyle = options.style;
        options.style = undefined;
        if (!options.zoom) {
            options['zoom'] = 9;
        }
        let center = [100.49, 13.72];
        if (options.center) {
            if (options.center.lng && options.center.lat) {
                const { lng, lat } = options.center;
                center = [lng, lat];
            }
        }
        options.center = center;
        super(options);
        this.appId = options.appId || options.app_id;
        getLogConfig((config) => {
            Logger.init(this.appId, config.isLogging, config.isDebug);
        });

        this.styleURL = options.styleURL || options.style_url;
        this.apiKey = options.apiKey || options.api_key;
        this.options = options;
        const styleURL = this.getStyleURL(newStyle, options);
        this.setStyle(styleURL);
        this.on('style.load', this.setLogo);
        if (options.protectScroll === true) {
            Handler.disabled(this);
        }
        if (options.navigationCtrl) {
            this.addControl(new NavigationControl());
        }
    }

    getStyleURL(newStyle = null, option) {
        let styleURL;
        if (this.styleURL) {
            styleURL = this.styleURL;
        } else {
            let style;
            if (newStyle) {
                style = newStyle;
            } else {
                style = option.style ? option.style : 'ivory';
            }
            styleURL = `${API_URL}/${style}?app_id=${this.appId}&api_key=${this.apiKey}&lang=${option.lang}`;
            Debugger.alertMissingKey(this.appId || 'error', this.apiKey || 'error');
        }
        return styleURL;
    }

    setStyle(style, option = {}) {
        let styleURL;
        const validateURL = /^((http[s]?|ftp):\/)?\/?([^:\/\s]+)((\/\w+)*\/)([\w\-\.]+[^#?\s]+)(.*)?(#[\w\-]+)?$/;
        const isStyleURL = validateURL.exec(style);
        if (isStyleURL) {
            styleURL = style;
        } else {
            styleURL = this.getStyleURL(style, option);
        }
        super.setStyle(styleURL, option);
    }

    setLogo({ style }) {
        if (!document.getElementsByClassName(LOGO_CLASSNAME)[0]) {
            this.addControl(new LogoControl(), 'bottom-left');
        }
        const backgroundColor = style.stylesheet.layers[0].paint['background-color'];
        this.logoSrc = isLight(backgroundColor) ? '' : 'dark';
        const logoElement = document.getElementsByClassName(LOGO_CLASSNAME)[0];
        if (logoElement) {
            logoElement.className = `${LOGO_CLASSNAME} ${this.logoSrc}`;
        }
    }
}

MapMagicGL.prototype = extend(MapMagicGL.prototype,
    Marker,
    Popup,
    Style,
    Geometry,
);

export default MapMagicGL;
