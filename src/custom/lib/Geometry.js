// @flow
import Logger from '../util/Logger';
import { randomID } from '../util';
import { LOG_CONSTANT } from '../constant';

const loggerDebug = {
    addPolygon: true,
    addLine: true,
};

const addPolygon = function (payload) {
    const ID = payload.id || randomID();
    if (!payload.coordinates) {
        Logger.warn(addPolygon.name, LOG_CONSTANT.UNDEFINED_COORDINATES, {}, loggerDebug.addPolygon);
    }

    const defaultColor = '#888888';
    const defaultOpacity = 0.4;

    const style = payload.style || {
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
        if (!Logger.getDebug()) {
            Logger.info(addPolygon.name, null, {}, loggerDebug.addPolygon);
        } else {
            Logger.debug(addPolygon.name, null, payload);
        }
    } catch (error) {
        Logger.error(addPolygon.name, error.message, {}, loggerDebug.addPolygon);
    }
    loggerDebug.addPolygon = false;
};

const addLine = function (payload) {
    const ID = payload.id || randomID();
    if (!payload.coordinates) { Logger.warn(addLine.name, LOG_CONSTANT.UNDEFINED_COORDINATES); }

    const defaultColor = '#FF1233';
    const defaultLineWidth = 3;

    const style = payload.style || {
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
        if (!Logger.getDebug()) {
            Logger.info(addLine.name, null, {}, loggerDebug.addLine);
        } else {
            Logger.debug(addLine.name, null, payload);
        }
    } catch (error) {
        Logger.error(addLine.name, error.message);
    }
    loggerDebug.addLine = false;
};

export default {
    addPolygon,
    addLine
};
