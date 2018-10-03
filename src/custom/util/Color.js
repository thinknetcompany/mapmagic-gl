//@flow
import tinycolor from 'tinycolor2'

const isLight = (color) => {
    return tinycolor(color).isLight()
};

export {
  isLight
}

