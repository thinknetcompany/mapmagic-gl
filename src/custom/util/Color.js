//@flow
const tinycolor = require('tinycolor2');

const isLight = (color) => {
    return tinycolor(color).isLight();
};

module.exports = {
    isLight
};
