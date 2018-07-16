/* eslint-disable */
const logger = require('../util/Logger')
const { LOG_CONSTANT } = require('../constant')

const loggerDebug = {
    addMarker: true,
    addMarkerArray: true,
    addMarkerImage: true,
    addMarkerImageArray: true,
    addMarkerFilter: true,
    setMarker: true,
}

const addMarker = function (payload = {}) {
    if (!payload.lng || !payload.lat) {
        logger.warn(addMarker.name, LOG_CONSTANT.UNDEFINED_LATLNG, {}, loggerDebug.addMarker)
    }

    const ID = payload.id || `places${Math.floor(Math.random() * 1000) + 1}`;

    const geojson = {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "properties": {
                    "description": payload.description || '',
                    "icon": "theatre"
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
        id: payload.id,
        lat: payload.lat,
        lng: payload.lng,
        size: payload.size || 1,
        offset: payload.offset || [0, 0],
    }

    try {
        if (payload.onClick) {
            Object.assign(args, {
                onClick: (payload.onClick !== undefined),
            })
            this.on('click', ID, payload.onClick);
        }

        if (payload.draggable) {
            Object.assign(args, {
                draggable: payload.draggable,
            })
            let isDragging;
            let isCursorOverPoint;
            const canvas = this.getCanvasContainer();

            function mouseDown() {
                if (!isCursorOverPoint) return;

                isDragging = true;

                // Set a cursor indicator
                canvas.style.cursor = 'grab';

                // Mouse events
                this.on('mousemove', onMove);
                this.once('mouseup', onUp);
            }

            function onMove(e) {
                if (!isDragging) return;
                let coords = e.lngLat;

                // Set a UI indicator for dragging.
                canvas.style.cursor = 'grabbing';

                // Update the Point feature in `geojson` coordinates
                // and call setData to the source layer `point` on it.
                geojson.features[0].geometry.coordinates = [coords.lng, coords.lat];
                this.getSource(ID).setData(geojson);
            }

            function onUp(e) {
                if (!isDragging) return;

                if (payload.onDragEnd && isDragging)
                    payload.onDragEnd(e);

                canvas.style.cursor = '';
                isDragging = false;

                // Unbind mouse events
                this.off('mousemove', onMove);
            }

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
        })

        if (payload.popup) {
            Object.assign(payload.popup, { id: ID })
            this.addPopup(payload.popup)
        }
        if (!process.env.DEBUG) {
            logger.info(addMarker.name, null, {}, loggerDebug.addMarker)
        } else {
            logger.debug(addMarker.name, null, args)
        }
    } catch (error) {
        logger.error(addMarker.name, error.message, {}, loggerDebug.addMarker)
    }
    loggerDebug.addMarker === false
}

const addMarkerArray = function (payload = {}) {
    const ID = payload.id || `places${Math.floor(Math.random() * 1000) + 1}`;
    if (typeof payload.marker !== 'Array') {
        logger.warn(addMarkerArray.name, LOG_CONSTANT.INVALID_TYPE, {}, loggerDebug.addMarkerArray)
    }
    const args = {
        id: ID,
        markers: payload.marker,
    }
    const markerArray = payload.marker.map((val, index) => {
        if (!val.lng || !val.lat) {
            logger.warn(addMarkerArray.name, `${UNDEFINED_ARRAY_LATLNG} ${index}`, {}, loggerDebug.addMarkerArray)
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
        }
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
        })
        if (!process.env.DEBUG) {
            logger.info(addMarkerArray.name, null, {}, loggerDebug.addMarkerArray)
        } else {
            logger.debug(addMarkerArray.name, null, args)
        }
    } catch (error) {
        logger.error(addMarkerArray.name, error.message, {}, loggerDebug.addMarkerArray)
    }
    loggerDebug.addMarkerArray = false
};

const addMarkerImage = function (info = {}) {
    const { id, url, description, lat, lng, size, offset, onClick } = info
    if (!lat || !lng) {
        logger.warn(addMarkerImage.name, LOG_CONSTANT.UNDEFINED_LATLNG, {}, loggerDebug.addMarkerImage)
    }
    const map = this;
    const ID = id || `places${Math.floor(Math.random() * 1000) + 1}`
    const args = {
        id: ID,
        lat,
        lng,
        img_url: url,
        size: size || 1,
        offset: offset || [0, 0],
    }
    map.loadImage(url || '', (error, image) => {
        if (error) {
            logger.error(addMarkerImage.name, error.message, {}, loggerDebug.addMarkerImage)
            throw error
        }

        try {
            map.addImage(ID, image);
            if (onClick) {
                Object.assign(args, {
                    onClick: (onClick !== undefined)
                })
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
            })
            if (!process.env.DEBUG) {
                logger.info(addMarkerImage.name, null, {}, loggerDebug.addMarkerImage)
            } else {
                logger.debug(addMarkerImage.name, null, args)
            }
        } catch (error) {
            logger.error(addMarkerImage.name, error.message, {}, loggerDebug.addMarkerImage)
        }
    })
    loggerDebug.addMarkerImage = false
}

const addMarkerImageArray = function (info = {}) {
    const { id, url, size, offset, places } = info
    const map = this
    const ID = id || `places${Math.floor(Math.random() * 1000) + 1}`
    const args = {
        img_url: url,
        size,
        offset,
        places
    }
    const markerArray = places.map((val, index) => {
        if (!val.lng || !val.lat) {
            logger.warn(addMarkerImageArray.name, `${LOG_CONSTANT.UNDEFINED_ARRAY_LATLNG} ${index}`, {}, loggerDebug.addMarkerImageArray)
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
        }
    });
    map.loadImage(url || '', (error, image) => {
        if (error) {
            logger.error(addMarkerImageArray.name, error.message, {}, loggerDebug.addMarkerImageArray)
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
            })
            if (!process.env.DEBUG) {
                logger.info(addMarkerImageArray.name, null, {}, loggerDebug.addMarkerImageArray)
            } else {
                logger.debug(addMarkerImageArray.name, null, args)
            }
        } catch (error) {
            logger.error(addMarkerImageArray.name, error.message, {}, loggerDebug.addMarkerImageArray)
        }
        loggerDebug.addMarkerImageArray = false
    })
}

const addMarkerFilter = function (info = {}) {
    const places = {
        "type": "FeatureCollection",
        "features": info.places
    };

    if (!info.places) {
        logger.warn(addMarkerFilter.name, LOG_CONSTANT.UNDEFINED_PLACE_INFO, {}, loggerDebug.addMarkerFilter)
    }
    map.addSource('places', {
        "type": "geojson",
        "data": places
    })

    const args = {
        places: info.places,
    }

    places.features.forEach((feature) => {
        var symbol = feature.properties['icon'];
        var label = feature.properties['label'];
        var layerID = 'poi-' + label;

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
                })
                if (!process.env.DEBUG) {
                    logger.info(addMarkerFilter.name, null, {}, loggerDebug.addMarkerFilter)
                } else {
                    logger.debug(addMarkerFilter.name, null, args)
                }
            } catch (error) {
                logger.error(addMarkerFilter.name, error.message, {}, loggerDebug.addMarkerFilter)
            }
            layerIDs.push(layerID)
        } else {
            logger.error(addMarkerFilter.name, LOG_CONSTANT.UNDEFINED_LAYER, {}, loggerDebug.addMarkerFilter)
        }
    });

    filterInput.addEventListener('keyup', (e) => {
        var value = e.target.value.trim().toLowerCase()
        layerIDs.forEach(function (layerID) {
            map.setLayoutProperty(layerID, 'visibility',
                layerID.indexOf(value) > -1 ? 'visible' : 'none')
        })
    });
    loggerDebug.addMarkerFilter = false
};

const setMarker = function (payload = {}) {
    const SET_MARKER = 'mkr-006'
    const { id, lng, lat } = payload

    if (!lat || !lng) {
        logger.warn(addMarkerImage.name, LOG_CONSTANT.UNDEFINED_LATLNG, {}, loggerDebug.setMarker)
    }

    const geojson = {
        "type": "Point",
        "coordinates": [
            lng,
            lat,
        ]
    }

    try {
        this.getSource(id).setData(geojson)
        if (!process.env.DEBUG) {
            logger.info(SET_MARKER, null, payload, loggerDebug.setMarker)
        } else {
            logger.debug(SET_MARKER, null, payload)
        }
    } catch (error) {
        logger.error(SET_MARKER, error.message, {}, loggerDebug.setMarker)
    }
    loggerDebug.setMarker = process.env.DEBUG
}

module.exports = {
    addMarker,
    addMarkerArray,
    addMarkerImage,
    addMarkerImageArray,
    addMarkerFilter,
    setMarker,
};
