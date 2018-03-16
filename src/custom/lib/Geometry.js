/* eslint-disable */
const logger = require('../util/Logger')

const addPolygon = function (payload) {
    const ID = payload.id || `places${Math.floor(Math.random() * 1000) + 1}`
    if (!payload.coordinates) { logger.warn('geo-001', 'coordinates is undefined') }

    let style;
    const defaultColor = '#888888';
    const defaultOpacity = 0.4;

    style = payload.style || {
        fillColor: defaultColor,
        fillOpacity: defaultOpacity
    };

    this.addSource(ID, {
        "type": "geojson",
        "data": {
            "type": "FeatureCollection",
            "features": [{
                "type": "Feature",
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [
                        payload.coordinates
                    ]
                }
            }]
        }
    });

    try {
        this.addLayer({
            "id": `boundary`,
            "type": "fill",
            "source": ID,
            "paint": {
                "fill-color": style.fillColor || defaultColor,
                "fill-opacity": style.fillOpacity || defaultOpacity
            },
            "filter": ["==", "$type", "Polygon"]
        });
        logger.info('geo-001', payload)
    }
    catch (error) {
        logger.error('geo-001', error.message)
    }
};

const addLine = function (payload) {
    const ID = payload.id || `places${Math.floor(Math.random() * 1000) + 1}`;
    if (!payload.coordinates) { logger.warn('geo-001', 'coordinates is undefined') }

    let style;
    const defaultColor = '#FF1233';
    const defaultLineWidth = 3;

    style = payload.style || {
        lineWidth: defaultLineWidth,
        color: defaultColor
    };

    try {
        this.addLayer({
            'id': ID,
            'type': 'line',
            'source': {
                'type': 'geojson',
                'data': {
                    'type': 'FeatureCollection',
                    'features': [{
                        'type': 'Feature',
                        'properties': {
                            'color': style.color || defaultColor,
                        },
                        'geometry': {
                            'type': 'LineString',
                            'coordinates': payload.coordinates
                        }
                    }]
                }
            },
            'paint': {
                'line-width': style.lineWidth || defaultLineWidth,
                'line-color': {
                    'type': 'identity',
                    'property': 'color'
                }
            }
        });
        logger.info('geo-002', payload)
    }
    catch (error) {
        logger.error('geo-002', error.message)
    }
};

module.exports = {
    addPolygon,
    addLine
};
