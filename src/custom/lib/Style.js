// @flow
import Logger from '../util/Logger';
import { LOG_CONSTANT } from '../constant';

const initColorMap = function (payload = {}) {
    try {
        payload.layers.forEach(option => {
            const { layer, color } = option;
            if (!color) {
                Logger.warn(initColorMap.name, 'missing color!');
            }
            if (!layer) {
                Logger.warn(initColorMap.name, LOG_CONSTANT.UNDEFINED_LAYER);
            }
            let attribute = null;
            const layers = [];
            if (layer == 'street') {
                attribute = 'line-color';
                layers.push('tn-road_class1');
                layers.push('tn-road_class2');
                layers.push('tn-road_class2');
                layers.push('tn-road_class3');
            } else if (layer == 'water') {
                attribute = 'fill-color';
                layers.push('water');
                layers.push('tn-seath');
                layers.push('tn-water_polygon_4');
                layers.push('tn-water_polygon_3');
                layers.push('tn-water_polygon_2');
                layers.push('tn-water_polygon_1');
            } else if (layer == 'province') {
                attribute = 'fill-color';
                layers.push('tn-land_province');
            } else if (layer == 'area') {
                attribute = 'fill-color';
                layers.push('tn-area_gray');
                layers.push('tn-area_down');
            } else if (layer == 'building') {
                attribute = 'fill-color';
                layers.push('tn-area_bldg');
            }
            layers.forEach(value => {
                map.setPaintProperty(value, attribute, color);
            });
        });
        Logger.info(initColorMap.name, null, payload);
    } catch (error) {
        Logger.error(initColorMap.name, error.message);
    }
};

export default {
    initColorMap
};
