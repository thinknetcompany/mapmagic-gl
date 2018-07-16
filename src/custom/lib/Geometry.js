/* eslint-disable */
const logger = require('../util/Logger')

const loggerDebug = {
    addPolygon: true,
}

const addPolygon = function (payload) {
    const ID = payload.id || `places${Math.floor(Math.random() * 1000) + 1}`
    if (!payload.coordinates) {
        logger.warn(addPolygon.name, 'coordinates is undefined', {}, loggerDebug.addPolygon)
    }

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
        if (!process.env.DEBUG) {
            logger.info(addPolygon.name, null, {}, loggerDebug.addPolygon)
        } else {
            logger.debug(addPolygon.name, null, payload, process.env.DEBUG)
        }
    }
    catch (error) {
        logger.error(addPolygon.name, error.message, {}, loggerDebug.addPolygon)
    }
    loggerDebug.addPolygon = false
};

const addLine = function (payload) {
    const ID = payload.id || `places${Math.floor(Math.random() * 1000) + 1}`;
    if (!payload.coordinates) { logger.warn(addLine.name, 'coordinates is undefined') }

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
        if (!process.env.DEBUG) {
            logger.info(addLine.name, null, {})
        } else {
            logger.debug(addLine.name, null, payload, process.env.DEBUG)
        }
    }
    catch (error) {
        logger.error(addLine.name, error.message)
    }
};

module.exports = {
    addPolygon,
    addLine
};
