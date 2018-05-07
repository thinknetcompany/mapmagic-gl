// @flow

const Style = require('../../style/style');
const mapbox = require('../../util/mapbox');
const ajax = require('../../util/ajax');
const Debugger = require('../util/Debugger');

Style.prototype.loadURL = function(url: string, options: {
  validate?: boolean,
  accessToken?: string
} = {}) {
    this.fire('dataloading', {dataType: 'style'});

    const validate = typeof options.validate === 'boolean' ?
        options.validate : !mapbox.isMapboxURL(url);

    url = mapbox.normalizeStyleURL(url, options.accessToken);
    const request = this.map._transformRequest(url, ajax.ResourceType.Style);

    ajax.getJSON(request, (error, json) => {
        if (error) {
            this.fire('error', 'APP ID or API Key is invalid');
            Debugger.alertMissingKey(null, null, false);
            this.fire('error', {error});
        } else if (json) {
            this._load((json: any), validate);
        }
    });
};

module.exports = Style;
