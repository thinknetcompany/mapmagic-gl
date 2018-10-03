// @flow
import Logger from '../util/Logger';

let flag = 0;
const macText = 'กด ⌘ + Scroll เพื่อซูมแผนที่';
const winText = 'กด Ctrl + Scroll เพื่อซูมแผนที่';
const mobileText = 'ใช้ 2 นิ้วเพื่อเลื่อนแผนที่';

const overWrite = (map) => {
    map.dragPan._ignoreEvent = function _ignoreEvent(e) {
        if (map.boxZoom && map.boxZoom.isActive()) { return true; }
        if (map.dragRotate && map.dragRotate.isActive()) { return true; }
        if (e.touches) {
            return (e.touches.length !== 2);
        } else {
            if (e.ctrlKey) return true;
            return e.type !== 'mousemove' && e.button && e.button !== 0; // left button
        }
    };
};

const initStyle = (map) => {
    const id = map._canvasContainer.offsetParent.id;
    document.getElementsByClassName("mapboxgl-canvas")[0].style.zIndex = 1;

    const element = document.createElement("div");
    element.setAttribute('id', 'overlayMapmagic');
    element.style.height = '100%';
    element.style.width = '100%';
    element.style.backgroundColor = 'black';
    element.style.color = 'white';
    element.style.opacity = 0;
    element.style.fontSize = '1.3rem';
    element.style.display = 'flex';
    element.style.flexDirection = 'row';
    element.style.justifyContent = 'center';
    element.style.alignItems = 'center';
    document.getElementById(id).appendChild(element);
};

const overlayShow = (text = null) => {
    const overlayMapmagic = document.getElementById('overlayMapmagic');
    const mapmagic = document.getElementsByClassName('mapboxgl-canvas')[0];
    overlayMapmagic.innerHTML = text;
    overlayMapmagic.style.zIndex = 1;
    overlayMapmagic.style.opacity = 0.5;
    mapmagic.style.zIndex = -1;
    overlayMapmagic.style.transitionDuration = '0.5s';
};

const overlayClose = () => {
    const overlayMapmagic = document.getElementById('overlayMapmagic');
    const mapmagic = document.getElementsByClassName('mapboxgl-canvas')[0];
    overlayMapmagic.style.zIndex = -1;
    overlayMapmagic.style.opacity = 0;
    mapmagic.style.zIndex = 1;
    mapmagic.style.transition = 'z-index 0.3s';
    overlayMapmagic.style.transitionDuration = '0.3s';
};

const handleMobile = (map, mobileText) => {
    const overlayMapmagic = document.getElementById('overlayMapmagic');
    map.on('touchstart', (event) => {
        if (event.points.length < 2) {
            overlayShow(mobileText);
            map.dragPan.disable();
        } else {
            overlayClose();
            map.dragPan.enable();
        }
    });
    overlayMapmagic.addEventListener('touchstart', (e) => {
        if (e.touches.length < 2) {
            overlayShow(mobileText);
        } else {
            overlayClose();
            map.dragPan.enable();
        }
    });
    map.on('touchend', () => {
        overlayClose();
    });
};

const _onScroll = () => {
    if (flag === 1) {
        const textShow = navigator.appVersion.indexOf("Win") != -1 ? winText : macText;
        overlayShow(textShow);
    }
};

const handleDesktop = (map) => {
    const mapmagic = document.getElementsByClassName('mapboxgl-canvas')[0];
    if (navigator.appVersion.indexOf("Win") != -1 || navigator.appVersion.indexOf("Mac") != -1) {
        map.scrollZoom.disable();
        const overlayMapmagic = document.getElementById('overlayMapmagic');

        document.addEventListener('keydown', (e) => {
            if (navigator.appVersion.indexOf("Win") != -1) {
                if (e.ctrlKey) {
                    flag = 1;
                    overlayClose();
                    map.scrollZoom.enable();
                }
            } else if (navigator.appVersion.indexOf("Mac") != -1) {
                if (e.metaKey) {
                    flag = 1;
                    overlayClose();
                    map.scrollZoom.enable();
                }
            }
        });
        document.addEventListener('scroll', _onScroll);

        mapmagic.addEventListener('mouseover', () => {
            flag = 1;
        });
        overlayMapmagic.addEventListener('mouseout', () => {
            flag = 0;
            overlayClose();
        });
        document.body.addEventListener('keyup', () => {
            flag = 0;
            map.scrollZoom.disable();
        });
    }
};

const disabled = function (map) {
    Logger.info(disabled.name);
    overWrite(map);
    initStyle(map);
    handleMobile(map, mobileText);
    handleDesktop(map, winText, macText);

};

export default {
    disabled
};
