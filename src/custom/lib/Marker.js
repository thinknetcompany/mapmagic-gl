/* eslint-disable */
const logger = require('../util/Logger')

const addMarker = function (payload = {}) {
    const ADD_MARKER_ID = 'mkr-001'

    if (!payload.lng || !payload.lat) {
        logger.warn(ADD_MARKER_ID, 'blank latitude and longitude')
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
                let coords = e.lngLat;

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

        logger.info(ADD_MARKER_ID, args)
    } catch (error) {
        logger.error(ADD_MARKER_ID, error.message)
    }
}

const addMarkerArray = function (payload = {}) {
    const ADD_MARKER_ARRAY_ID = 'mkr-002'
    const ID = payload.id || `places${Math.floor(Math.random() * 1000) + 1}`;
    if (typeof payload.marker !== 'Array') {
        logger.warn(ADD_MARKER_ARRAY_ID, 'marker array cannot resolve')
    }
    const args = {
        id: ID,
        markers: payload.marker,
    }
    const markerArray = payload.marker.map((val, index) => {
        if (!val.lng || !val.lat) {
            logger.warn(ADD_MARKER_ARRAY_ID, `blank latitude and longitude at item ${index}`)
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
        logger.info(ADD_MARKER_ARRAY_ID, args)
    } catch (error) {
        logger.error(ADD_MARKER_ARRAY_ID, error.message)
    }
};

const addMarkerImage = function (info = {}) {
    const ADD_MARKER_IMAGE_ID = 'mkr-003'
    const { id, url, description, lat, lng, size, offset, onClick } = info
    if (!lat || !lng) {
        logger.warn(ADD_MARKER_IMAGE_ID, 'blank latitude and longitude')
    }
    const map = this;
    const ID = id || `places${Math.floor(Math.random() * 1000) + 1}`
    const args = {
        id: ID,
        lat,
        lng,
        url,
        description: description || '',
        size: size || 1,
        offset: offset || [0, 0],
    }
    map.loadImage(url || '', (error, image) => {
        if (error) {
            logger.error(ADD_MARKER_IMAGE_ID, error.message)
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
            logger.info(ADD_MARKER_IMAGE_ID, args)
        } catch (error) {
            logger.error(ADD_MARKER_IMAGE_ID, error.message)
        }
    })
}

const addMarkerImageArray = function (info = {}) {
    const ADD_MARKER_IMAGE_ARRAY_ID = 'mkr-004'
    const { id, url, size, offset, places } = info
    const map = this
    const ID = id || `places${Math.floor(Math.random() * 1000) + 1}`
    const args = {
        id: ID,
        url,
        size: size || 1,
        offset: offset || [0, 0],
        places
    }

    const markerArray = places.map((val, index) => {
        if (!val.lng || !val.lat) {
            logger.warn(ADD_MARKER_IMAGE_ARRAY_ID, `blank latitude and longitude at item ${index}`)
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
            logger.error(ADD_MARKER_IMAGE_ARRAY_ID, error.message)
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
            logger.info(ADD_MARKER_IMAGE_ARRAY_ID)
        } catch (error) {
            logger.error(ADD_MARKER_IMAGE_ARRAY_ID, error.message)
        }
    })
}

const addMarkerFilter = function (info = {}) {
    const ADD_MARKER_FILTER = 'mkr-005'

    const places = {
        "type": "FeatureCollection",
        "features": info.places
    };

    if (!info.places) {
        logger.warn(ADD_MARKER_FILTER, 'missing place info')
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
                logger.info(ADD_MARKER_FILTER, args)
            } catch (error) {
                logger.error(ADD_MARKER_FILTER, error.message)
            }

            layerIDs.push(layerID)
        } else {
            logger.error(ADD_MARKER_FILTER, 'cannot find layer')
        }
    });

    filterInput.addEventListener('keyup', (e) => {
        var value = e.target.value.trim().toLowerCase()
        layerIDs.forEach(function (layerID) {
            map.setLayoutProperty(layerID, 'visibility',
                layerID.indexOf(value) > -1 ? 'visible' : 'none')
        })
    });
};

const setMarker = function (payload = {}) {
    const SET_MARKER = 'mkr-006'
    const { id, lng, lat } = payload

    if (!lat || !lng) {
        logger.warn(ADD_MARKER_IMAGE_ID, 'blank latitude and longitude')
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
        logger.info(SET_MARKER, payload)
    } catch (error) {
        logger.error(SET_MARKER, error.message)
    }

}

module.exports = {
    addMarker,
    addMarkerArray,
    addMarkerImage,
    addMarkerImageArray,
    addMarkerFilter,
    setMarker
};
