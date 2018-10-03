// @flow

import DOM from '../../util/dom';

import { bindAll } from '../../util/util';

import type Map from '../MapMagicGL';

/**
 * A `LogoControl` is a control that adds the Mapbox watermark
 * to the map as required by the [terms of service](https://www.mapbox.com/tos/) for Mapbox
 * vector tiles and core styles.
 *
 * @implements {IControl}
 * @private
**/

class LogoControl {
    _map: Map;
    _container: HTMLElement;

    constructor() {
        bindAll(['_updateLogo'], this);
        bindAll(['_updateCompact'], this);
    }

    onAdd(map: Map) {
        this._map = map;
        this._container = DOM.create('div', 'mapboxgl-ctrl');
        const anchor = DOM.create('a', 'mapmagic-ctrl-logo');
        anchor.target = "_blank";
        anchor.href = "https://www.mapmagic.co.th/";
        anchor.setAttribute("aria-label", "MapMagic Logo");
        anchor.setAttribute("rel", "noopener");
        this._container.appendChild(anchor);

        this._map.on('resize', this._updateCompact);
        this._updateCompact();

        return this._container;
    }

    onRemove() {
        DOM.remove(this._container);
        this._map.off('resize', this._updateCompact);
    }

    getDefaultPosition() {
        return 'bottom-left';
    }

    _updateLogo(e: any) {
        if (!e || e.sourceDataType === 'metadata') {
            this._container.style.display = this._logoRequired() ? 'block' : 'none';
        }
    }

    _logoRequired() {
        if (!this._map.style) return;

        const sourceCaches = this._map.style.sourceCaches;
        for (const id in sourceCaches) {
            const source = sourceCaches[id].getSource();
            if (source.mapbox_logo) {
                return true;
            }
        }

        return false;
    }

    _updateCompact() {
        const containerChildren = this._container.children;
        if (containerChildren.length) {
            const anchor = containerChildren[0];
            if (this._map.getCanvasContainer().offsetWidth < 250) {
                anchor.classList.add('mapmagicgl-compact');
            } else {
                anchor.classList.remove('mapmagicgl-compact');
            }
        }
    }

}


export default LogoControl;
