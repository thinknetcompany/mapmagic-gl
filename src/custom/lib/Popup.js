/* eslint-disable */
const Popup = require('../../ui/popup');
const logger = require('../util/Logger')

let logFirst = true

const eventShow = function (map, geojson) {
    new Popup({ closeOnClick: false })
        .setLngLat(geojson.features[0].geometry.coordinates)
        .setHTML(geojson.features[0].properties.description)
        .addTo(map);
}

const eventClick = function (map, id, payload) {
    map.on('click', id, function (e) {
        const popup = new Popup({
            anchor: payload.anchor || '',
            offset: payload.offset || [0, 0]
        }).setLngLat(e.features[0].geometry.coordinates)
            .setHTML(e.features[0].properties.description)
            .addTo(this);
    });
    map.on('mouseenter', id, function () {
        this.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', id, function () {
        this.getCanvas().style.cursor = '';
    });
}

const eventHover = function (map, id, payload) {
    const popup = new Popup({
        closeButton: false,
        closeOnClick: false,
        anchor: payload.anchor || '',
        offset: payload.offset || [0, 0]
    });
    map.on('mouseenter', id, function (e) {
        this.getCanvas().style.cursor = 'pointer';
        popup.setLngLat(e.features[0].geometry.coordinates)
            .setHTML(e.features[0].properties.description)
            .addTo(this);
    });
    map.on('mouseleave', id, function () {
        this.getCanvas().style.cursor = '';
        popup.remove();
    });
}

const addPopup = function (payload = {}) {
    const ID = payload.id || `places${Math.floor(Math.random() * 1000) + 1}`;

    const geojson = this.getSource(ID)._data;
    this.getSource(ID).setData(geojson);

    const action = payload.action || 'show';

    if (action === 'show') {
        try {
            eventShow(this, geojson)
            if (!process.env.DEBUG) {
                logger.info(addPopup.name, null, {}, logFirst)
            } else {
                logger.debug(addPopup.name, null, payload)
            }
        }
        catch (error) {
            logger.error(addPopup.name, error.message)
        }
    } else if (action === 'click') {
        try {
            eventClick(this, ID, payload)
            if (!process.env.DEBUG) {
                logger.info(addPopup.name, null, {}, logFirst)
            } else {
                logger.debug(addPopup.name, null, payload)
            }
        }
        catch (error) {
            logger.error(addPopup.name, error.message)
        }
    } else if (action === 'hover') {
        try {
            eventHover(this, ID, payload);
            if (!process.env.DEBUG) {
                logger.info(addPopup.name, null, {}, logFirst)
            } else {
                logger.debug(addPopup.name, null, payload)
            }
        }
        catch (error) {
            logger.error(addPopup.name, error.message)
        }
    }
    logFirst = false
};

module.exports = { addPopup };
