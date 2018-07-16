/* eslint-disable */
const constant = require('./constant')
const Map = require('../ui/map')
const Logger = require('./util/Logger')
const Marker = require('./lib/Marker')
const Popup = require('./lib/Popup')
const Geometry = require('./lib/Geometry')
const Style = require('./lib/Style')
const DOM = require('../util/dom')
const Handler = require('./lib/Handler')
const NavigationControl = require('.././ui/control/navigation_control')
const Debugger = require('./util/Debugger')
const getLogConfig = require('./util/getLogConfig')
const { isLight } = require('./util/Color')

const { API_URL, LOGO_IMG } = constant

class MapmagicGL extends Map {
    constructor(options) {
        getLogConfig((config) => {
            process.env.LOGGING = config.isLogging
            process.env.DEBUG = config.isDebug;
            Logger.initLogger();
        })
        this.appId = options.appId || options.app_id
        this.styleURL = options.styleURL || options.style_url
        this.apiKey = options.apiKey || options.api_key
        this.options = options

        process.env.APP_ID = this.appId ? this.appId : 'ไม่ได้ใช้ Style mapmagic'

        if (!options.zoom) {
            options['zoom'] = 9;
        }
        let center = [100.49, 13.72]
        if (options.center) {
            if (options.center.lng && options.center.lat) {
                const { lng, lat } = options.center
                center = [lng, lat]
            }
        }
        options['center'] = center
        const newStyle = options.style
        options.style = undefined
        super(options)
        const styleURL = this.getStyleURL(options, newStyle)
        this.setStyle(styleURL)
        this.on('style.load', this.adjustLogoColor)

        if (options.protectScroll === true) {
            Handler.disabled(this);
        }
        if (options.navigationCtrl) {
            this.addControl(new NavigationControl())
        }
    }

    getStyleURL(options, newStyle = null) {
        let styleURL
        if (this.styleURL) {
            styleURL = this.styleURL;
        } else {
            let style
            if (newStyle) {
                style = newStyle
            } else {
                style = options.style ? options.style : 'ivory'
            }
            styleURL = `${API_URL}/${style}?app_id=${this.appId}&api_key=${this.apiKey}&lang=${options.lang}`;
            Debugger.alertMissingKey(this.appId || 'error', this.apiKey || 'error') 
        }
        return styleURL
    }

    setStyle(style, option = {}) {
        let styleURL
        const validateURL = /^((http[s]?|ftp):\/)?\/?([^:\/\s]+)((\/\w+)*\/)([\w\-\.]+[^#?\s]+)(.*)?(#[\w\-]+)?$/
        const isStyleURL = validateURL.exec(style)
        if (isStyleURL) {
            styleURL = style
        } else {
            styleURL = this.getStyleURL(this.options, style)
        }
        super.setStyle(styleURL, option)
    }

    adjustLogoColor ({ style }) {
        const backgroundColor = style.stylesheet.layers[0].paint['background-color']
        this.logoSrc = isLight(backgroundColor) ? LOGO_IMG.black : LOGO_IMG.white
        this.updateLogo();
    }

    updateLogo() {
        const logoElement = document.getElementsByClassName('mapmagic-logo')[0];
        if (logoElement) {
            logoElement.src = this.logoSrc;
        } else {
            this.createLogo()
        }
    }

    createLogo() {
        const element = document.getElementsByClassName('mapboxgl-ctrl-logo')[0];
        const logo = DOM.create('img', 'mapmagic-logo');
        element.href = 'https://www.mapmagic.co.th/';
        element.style.backgroundImage = 'none';
        logo.style.height = '90%';
        if (this._canvas.clientWidth < 340) {
            logo.style.height = '70%';
            logo.style.marginTop = '5px';
        }
        logo.src = this.logoSrc;
        element.appendChild(logo);
    }
}

Object.assign(MapmagicGL.prototype,
    Object.assign(
        Marker,
        Popup,
        Geometry,
        Style
    ));

module.exports = MapmagicGL;
