// @flow
import Logger from '../util/Logger';
import { randomID } from '../util';
import { LOG_CONSTANT } from '../constant';

const loggerDebug = {
    addMarker: true,
    addMarkerArray: true,
    addMarkerImage: true,
    addMarkerImageArray: true,
    addMarkerFilter: true,
    setMarker: true,
};

const addMarker = function(payload = {}) {
    if (!payload.lng || !payload.lat) {
        Logger.warn(addMarker.name, LOG_CONSTANT.UNDEFINED_LATLNG, {}, loggerDebug.addMarker);
    }

    const ID = payload.id || randomID();

    const geojson = {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "properties": {
                    "description": payload.description || '',
                },
                "geometry": {
                    "type": "Point",
                    "coordinates": [
                        payload.lng,
                        payload.lat,
                    ]
                }
            }
        ],
    };
    const args = {
        id: payload.id || '',
        lat: payload.lat || '',
        lng: payload.lng || '',
        size: payload.size || 1,
        offset: payload.offset || [0, 0],
    };

    try {
        if (payload.onClick) {
            Object.assign(args, {
                onClick: (payload.onClick !== undefined),
            });
            this.on('click', ID, payload.onClick);
        }

        if (payload.draggable) {
            Object.assign(args, {
                draggable: payload.draggable,
            });
            let isDragging;
            let isCursorOverPoint;
            const canvas = this.getCanvasContainer();

            const onMove = (e) => {
                if (!isDragging) return;
                const coords = e.lngLat;

                // Set a UI indicator for dragging.
                canvas.style.cursor = 'grabbing';

                // Update the Point feature in `geojson` coordinates
                // and call setData to the source layer `point` on it.
                geojson.features[0].geometry.coordinates = [coords.lng, coords.lat];
                this.getSource(ID).setData(geojson);
            };

            const onUp = (e) => {
                if (!isDragging) return;
                if (payload.onDragEnd && isDragging)
                    payload.onDragEnd(e);

                canvas.style.cursor = '';
                isDragging = false;

                // Unbind mouse events
                this.off('mousemove', onMove);
            };

            const mouseDown = () => {
                if (!isCursorOverPoint) return;

                isDragging = true;

                // Set a cursor indicator
                canvas.style.cursor = 'grab';

                // Mouse events
                this.on('mousemove', onMove);
                this.once('mouseup', onUp);
            };

            this.on('mouseenter', ID, function () {
                canvas.style.cursor = 'move';
                isCursorOverPoint = true;
                this.dragPan.disable();
            });

            this.on('mouseleave', ID, function () {
                canvas.style.cursor = '';
                isCursorOverPoint = false;
                this.dragPan.enable();
            });
            this.on('mousedown', mouseDown);
        }

        this.addLayer({
            "id": ID, // use when hover popup
            "type": "symbol",
            "source": {
                "type": "geojson",
                "data": geojson
            },
            "layout": {
                "icon-image": payload.icon || 'mmg_pin_1_orange',
                "icon-allow-overlap": true,
                'icon-size': payload.size || 1,
                'icon-offset': payload.offset || [0, 0],
            }
        });

        if (payload.popup) {
            Object.assign(payload.popup, { id: ID });
            this.addPopup(payload.popup);
        }
        if (!Logger.getDebug()) {
            Logger.info(addMarker.name, '', {}, loggerDebug.addMarker);
        } else {
            Logger.debug(addMarker.name, '', args, loggerDebug.addMarker);
        }
    } catch (error) {
        Logger.error(addMarker.name, error.message, {}, loggerDebug.addMarker);
        console.log(error);
    }
    loggerDebug.addMarker = false;
};

const removeMarker = function(id) {
    if (id) {
        const layer = this.getLayer(id);
        if (layer) {
            this.removeLayer(id);
            this.removeSource(id);
        } else {
            console.warn('marker ID does not exist');
        }
    }
};

const addMarkerArray = function(payload = {}) {
    const ID = payload.id || randomID();
    if (!Array.isArray(payload.marker)) {
        Logger.warn(addMarkerArray.name, LOG_CONSTANT.INVALID_TYPE, {}, loggerDebug.addMarkerArray);
    }
    const args = {
        id: ID,
        markers: payload.marker,
    };
    const markerArray = payload.marker.map((val, index) => {
        if (!val.lng || !val.lat) {
            Logger.warn(addMarkerArray.name, `${LOG_CONSTANT.UNDEFINED_ARRAY_LATLNG} ${index}`, {}, loggerDebug.addMarkerArray);
        }
        return {
            "type": "Feature",
            "properties": {
                "description": val.description || '',
                "icon": 'mmg_pin_1_orange'
            },
            "geometry": {
                "type": "Point",
                "coordinates": [
                    val.lng,
                    val.lat,
                ]
            }
        };
    });

    try {
        this.addLayer({
            "id": ID, // use when hover popup
            "type": "symbol",
            "source": {
                "type": "geojson",
                "data": {
                    "type": "FeatureCollection",
                    "features": markerArray
                }
            },
            "layout": {
                "icon-image": payload.icon || 'mmg_pin_1_orange',
                "icon-allow-overlap": true
            }
        });
        if (!Logger.getDebug()) {
            Logger.info(addMarkerArray.name, '', {}, loggerDebug.addMarkerArray);
        } else {
            Logger.debug(addMarkerArray.name, '', args);
        }
    } catch (error) {
        Logger.error(addMarkerArray.name, error.message, {}, loggerDebug.addMarkerArray);
    }
    loggerDebug.addMarkerArray = false;
};

const addMarkerImage = function(info = {}) {
    const { id, url, description, lat, lng, size, offset, onClick } = info;
    if (!lat || !lng) {
        Logger.warn(addMarkerImage.name, LOG_CONSTANT.UNDEFINED_LATLNG, {}, loggerDebug.addMarkerImage);
    }
    const map = this;
    const ID = id || randomID();
    const args = {
        id: ID,
        lat,
        lng,
        img_url: url,
        size: size || 1,
        offset: offset || [0, 0],
    };
    map.loadImage(url || '', (error, image) => {
        if (error) {
            Logger.error(addMarkerImage.name, error.message, {}, loggerDebug.addMarkerImage);
            throw error;
        }

        try {
            map.addImage(ID, image);
            if (onClick) {
                Object.assign(args, {
                    onClick: (onClick !== undefined)
                });
                this.on('click', ID, onClick);
            }
            map.addLayer({
                'id': ID, // use when hover popup
                'type': 'symbol',
                'source': {
                    'type': 'geojson',
                    'data': {
                        'type': 'FeatureCollection',
                        'features': [{
                            'type': 'Feature',
                            'properties': {
                                'description': description || '',
                                'icon': 'theatre'
                            },
                            'geometry': {
                                'type': 'Point',
                                'coordinates': [lng, lat]
                            }
                        }]
                    }
                },
                'layout': {
                    'icon-image': ID,
                    'icon-size': size || 1,
                    'icon-offset': offset || [0, 0]
                }
            });
            if (!Logger.getDebug()) {
                Logger.info(addMarkerImage.name, null, {}, loggerDebug.addMarkerImage);
            } else {
                Logger.debug(addMarkerImage.name, null, args);
            }
        } catch (error) {
            Logger.error(addMarkerImage.name, error.message, {}, loggerDebug.addMarkerImage);
        }
    });
    loggerDebug.addMarkerImage = false;
};

const addMarkerImageArray = function(info = {}) {
    const { id, url, size, offset, places } = info;
    const map = this;
    const ID = id || randomID();
    const args = {
        img_url: url,
        size,
        offset,
        places
    };
    const markerArray = places.map((val, index) => {
        if (!val.lng || !val.lat) {
            Logger.warn(addMarkerImageArray.name, `${LOG_CONSTANT.UNDEFINED_ARRAY_LATLNG} ${index}`, {}, loggerDebug.addMarkerImageArray);
        }
        return {
            'type': 'Feature',
            'properties': {
                'description': val.description || '',
                'icon': 'theatre'
            },
            'geometry': {
                'type': 'Point',
                'coordinates': [val.lng, val.lat]
            }
        };
    });
    map.loadImage(url || '', (error, image) => {
        if (error) {
            Logger.error(addMarkerImageArray.name, error.message, {}, loggerDebug.addMarkerImageArray);
            throw error;
        }
        try {
            map.addImage(ID, image);
            map.addLayer({
                'id': ID,
                'type': 'symbol',
                'source': {
                    'type': 'geojson',
                    'data': {
                        'type': 'FeatureCollection',
                        'features': markerArray
                    }
                },
                'layout': {
                    'icon-image': ID,
                    'icon-size': size || 1,
                    'icon-offset': offset || [0, 0]
                }
            });
            if (!Logger.getDebug()) {
                Logger.info(addMarkerImageArray.name, null, {}, loggerDebug.addMarkerImageArray);
            } else {
                Logger.debug(addMarkerImageArray.name, null, args);
            }
        } catch (error) {
            Logger.error(addMarkerImageArray.name, error.message, {}, loggerDebug.addMarkerImageArray);
        }
        loggerDebug.addMarkerImageArray = false;
    });
};

const addMarkerFilter = function(info = {}) {
    const places = {
        "type": "FeatureCollection",
        "features": info.places
    };

    if (!info.places) {
        Logger.warn(addMarkerFilter.name, LOG_CONSTANT.UNDEFINED_PLACE_INFO, {}, loggerDebug.addMarkerFilter);
    }
    map.addSource('places', {
        "type": "geojson",
        "data": places
    });

    const args = {
        places: info.places,
    };

    places.features.forEach((feature) => {
        const symbol = feature.properties['icon'];
        const label = feature.properties['label'];
        const layerID = `poi-${label}`;

        if (!map.getLayer(layerID)) {
            try {
                map.addLayer({
                    "id": layerID,
                    "type": "symbol",
                    "source": "places",
                    "layout": {
                        "icon-image": symbol,
                        "icon-allow-overlap": true,
                        "text-field": label,
                        "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
                        "text-size": 11,
                        "text-transform": "uppercase",
                        "text-letter-spacing": 0.05,
                        "text-offset": [0, 1.5]
                    },
                    "paint": {
                        "text-color": "#202",
                        "text-halo-color": "#fff",
                        "text-halo-width": 2,
                    },
                    "filter": ["==", "label", label]
                });
                if (!Logger.getDebug()) {
                    Logger.info(addMarkerFilter.name, null, {}, loggerDebug.addMarkerFilter);
                } else {
                    Logger.debug(addMarkerFilter.name, null, args);
                }
            } catch (error) {
                Logger.error(addMarkerFilter.name, error.message, {}, loggerDebug.addMarkerFilter);
            }
            layerIDs.push(layerID);
        } else {
            Logger.error(addMarkerFilter.name, LOG_CONSTANT.UNDEFINED_LAYER, {}, loggerDebug.addMarkerFilter);
        }
    });

    filterInput.addEventListener('keyup', (e) => {
        const value = e.target.value.trim().toLowerCase();
        layerIDs.forEach((layerID) => {
            map.setLayoutProperty(layerID, 'visibility',
                layerID.indexOf(value) > -1 ? 'visible' : 'none');
        });
    });
    loggerDebug.addMarkerFilter = false;
};

const setMarker = function(payload = {}) {
    const SET_MARKER = 'mkr-006';
    const { id, lng, lat } = payload;

    if (!lat || !lng) {
        Logger.warn(addMarkerImage.name, LOG_CONSTANT.UNDEFINED_LATLNG, {}, loggerDebug.setMarker);
    }

    const geojson = {
        "type": "Point",
        "coordinates": [
            lng,
            lat,
        ]
    };

    try {
        this.getSource(id).setData(geojson);
        if (!Logger.getDebug()) {
            Logger.info(SET_MARKER, null, payload, loggerDebug.setMarker);
        } else {
            Logger.debug(SET_MARKER, null, payload);
        }
    } catch (error) {
        Logger.error(SET_MARKER, error.message, {}, loggerDebug.setMarker);
    }
    loggerDebug.setMarker = Logger.getDebug();
};

export default {
    addMarker,
    removeMarker,
    addMarkerArray,
    addMarkerImage,
    addMarkerImageArray,
    addMarkerFilter,
    setMarker,
};
