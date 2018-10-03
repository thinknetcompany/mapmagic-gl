// @flow
import { Event } from '../../util/evented'
import Style from '../../style/style'
import { isMapboxURL, normalizeStyleURL } from '../../util/mapbox'
import { getJSON, ResourceType } from '../../util/ajax'
import Debugger from './Debugger'

Style.prototype.loadURL = function(
  url: string, 
  options: {
    validate?: boolean,
    accessToken?: string
  } = {}) {
    this.fire(new Event('dataloading', {dataType: 'style'}))
    const validate = typeof options.validate === 'boolean' ?
        options.validate : !isMapboxURL(url)

    url = normalizeStyleURL(url, options.accessToken)
    const request = this.map._transformRequest(url, ResourceType.Style)

    this._request = getJSON(request, (error, json) => {
      this._request = null
        if (error) {
            this.fire('error', 'APP ID or API Key is invalid')
            Debugger.alertMissingKey(null, null, false)
            this.fire('error', {error})
        } else if (json) {
            this._load((json: any), validate)
        }
    })
}

export default Style
