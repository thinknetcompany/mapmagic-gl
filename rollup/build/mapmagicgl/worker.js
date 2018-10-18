define(['./shared.js'], function (__chunk_1) { 'use strict';

function stringify(obj) {
    var type = typeof obj;
    if (type === 'number' || type === 'boolean' || type === 'string' || obj === undefined || obj === null) {
        return JSON.stringify(obj);
    }
    if (Array.isArray(obj)) {
        var str$1 = '[';
        for (var i$1 = 0, list = obj; i$1 < list.length; i$1 += 1) {
            var val = list[i$1];
            str$1 += stringify(val) + ',';
        }
        return str$1 + ']';
    }
    var keys = Object.keys(obj).sort();
    var str = '{';
    for (var i = 0; i < keys.length; i++) {
        str += JSON.stringify(keys[i]) + ':' + stringify(obj[keys[i]]) + ',';
    }
    return str + '}';
}
function getKey(layer) {
    var key = '';
    for (var i = 0, list = __chunk_1.refProperties; i < list.length; i += 1) {
        var k = list[i];
        key += '/' + stringify(layer[k]);
    }
    return key;
}
function groupByLayout(layers) {
    var groups = {};
    for (var i = 0; i < layers.length; i++) {
        var k = getKey(layers[i]);
        var group = groups[k];
        if (!group) {
            group = groups[k] = [];
        }
        group.push(layers[i]);
    }
    var result = [];
    for (var k$1 in groups) {
        result.push(groups[k$1]);
    }
    return result;
}

var StyleLayerIndex = function StyleLayerIndex(layerConfigs) {
    if (layerConfigs) {
        this.replace(layerConfigs);
    }
};
StyleLayerIndex.prototype.replace = function replace(layerConfigs) {
    this._layerConfigs = {};
    this._layers = {};
    this.update(layerConfigs, []);
};
StyleLayerIndex.prototype.update = function update(layerConfigs, removedIds) {
    var this$1 = this;
    for (var i = 0, list = layerConfigs; i < list.length; i += 1) {
        var layerConfig = list[i];
        this$1._layerConfigs[layerConfig.id] = layerConfig;
        var layer = this$1._layers[layerConfig.id] = __chunk_1.createStyleLayer(layerConfig);
        layer._featureFilter = __chunk_1.featureFilter(layer.filter);
    }
    for (var i$1 = 0, list$1 = removedIds; i$1 < list$1.length; i$1 += 1) {
        var id = list$1[i$1];
        delete this$1._layerConfigs[id];
        delete this$1._layers[id];
    }
    this.familiesBySource = {};
    var groups = groupByLayout(__chunk_1.values(this._layerConfigs));
    for (var i$2 = 0, list$2 = groups; i$2 < list$2.length; i$2 += 1) {
        var layerConfigs$1 = list$2[i$2];
        var layers = layerConfigs$1.map(function (layerConfig) {
            return this$1._layers[layerConfig.id];
        });
        var layer$1 = layers[0];
        if (layer$1.visibility === 'none') {
            continue;
        }
        var sourceId = layer$1.source || '';
        var sourceGroup = this$1.familiesBySource[sourceId];
        if (!sourceGroup) {
            sourceGroup = this$1.familiesBySource[sourceId] = {};
        }
        var sourceLayerId = layer$1.sourceLayer || '_geojsonTileLayer';
        var sourceLayerFamilies = sourceGroup[sourceLayerId];
        if (!sourceLayerFamilies) {
            sourceLayerFamilies = sourceGroup[sourceLayerId] = [];
        }
        sourceLayerFamilies.push(layers);
    }
};

function checkMaxAngle(line, anchor, labelLength, windowSize, maxAngle) {
    if (anchor.segment === undefined) {
        return true;
    }
    var p = anchor;
    var index = anchor.segment + 1;
    var anchorDistance = 0;
    while (anchorDistance > -labelLength / 2) {
        index--;
        if (index < 0) {
            return false;
        }
        anchorDistance -= line[index].dist(p);
        p = line[index];
    }
    anchorDistance += line[index].dist(line[index + 1]);
    index++;
    var recentCorners = [];
    var recentAngleDelta = 0;
    while (anchorDistance < labelLength / 2) {
        var prev = line[index - 1];
        var current = line[index];
        var next = line[index + 1];
        if (!next) {
            return false;
        }
        var angleDelta = prev.angleTo(current) - current.angleTo(next);
        angleDelta = Math.abs((angleDelta + 3 * Math.PI) % (Math.PI * 2) - Math.PI);
        recentCorners.push({
            distance: anchorDistance,
            angleDelta: angleDelta
        });
        recentAngleDelta += angleDelta;
        while (anchorDistance - recentCorners[0].distance > windowSize) {
            recentAngleDelta -= recentCorners.shift().angleDelta;
        }
        if (recentAngleDelta > maxAngle) {
            return false;
        }
        index++;
        anchorDistance += current.dist(next);
    }
    return true;
}

function getLineLength(line) {
    var lineLength = 0;
    for (var k = 0; k < line.length - 1; k++) {
        lineLength += line[k].dist(line[k + 1]);
    }
    return lineLength;
}
function getAngleWindowSize(shapedText, glyphSize, boxScale) {
    return shapedText ? 3 / 5 * glyphSize * boxScale : 0;
}
function getShapedLabelLength(shapedText, shapedIcon) {
    return Math.max(shapedText ? shapedText.right - shapedText.left : 0, shapedIcon ? shapedIcon.right - shapedIcon.left : 0);
}
function getCenterAnchor(line, maxAngle, shapedText, shapedIcon, glyphSize, boxScale) {
    var angleWindowSize = getAngleWindowSize(shapedText, glyphSize, boxScale);
    var labelLength = getShapedLabelLength(shapedText, shapedIcon) * boxScale;
    var prevDistance = 0;
    var centerDistance = getLineLength(line) / 2;
    for (var i = 0; i < line.length - 1; i++) {
        var a = line[i], b = line[i + 1];
        var segmentDistance = a.dist(b);
        if (prevDistance + segmentDistance > centerDistance) {
            var t = (centerDistance - prevDistance) / segmentDistance, x = __chunk_1.number(a.x, b.x, t), y = __chunk_1.number(a.y, b.y, t);
            var anchor = new __chunk_1.Anchor(x, y, b.angleTo(a), i);
            anchor._round();
            if (!angleWindowSize || checkMaxAngle(line, anchor, labelLength, angleWindowSize, maxAngle)) {
                return anchor;
            } else {
                return;
            }
        }
        prevDistance += segmentDistance;
    }
}
function getAnchors(line, spacing, maxAngle, shapedText, shapedIcon, glyphSize, boxScale, overscaling, tileExtent) {
    var angleWindowSize = getAngleWindowSize(shapedText, glyphSize, boxScale);
    var shapedLabelLength = getShapedLabelLength(shapedText, shapedIcon);
    var labelLength = shapedLabelLength * boxScale;
    var isLineContinued = line[0].x === 0 || line[0].x === tileExtent || line[0].y === 0 || line[0].y === tileExtent;
    if (spacing - labelLength < spacing / 4) {
        spacing = labelLength + spacing / 4;
    }
    var fixedExtraOffset = glyphSize * 2;
    var offset = !isLineContinued ? (shapedLabelLength / 2 + fixedExtraOffset) * boxScale * overscaling % spacing : spacing / 2 * overscaling % spacing;
    return resample(line, offset, spacing, angleWindowSize, maxAngle, labelLength, isLineContinued, false, tileExtent);
}
function resample(line, offset, spacing, angleWindowSize, maxAngle, labelLength, isLineContinued, placeAtMiddle, tileExtent) {
    var halfLabelLength = labelLength / 2;
    var lineLength = getLineLength(line);
    var distance = 0, markedDistance = offset - spacing;
    var anchors = [];
    for (var i = 0; i < line.length - 1; i++) {
        var a = line[i], b = line[i + 1];
        var segmentDist = a.dist(b), angle = b.angleTo(a);
        while (markedDistance + spacing < distance + segmentDist) {
            markedDistance += spacing;
            var t = (markedDistance - distance) / segmentDist, x = __chunk_1.number(a.x, b.x, t), y = __chunk_1.number(a.y, b.y, t);
            if (x >= 0 && x < tileExtent && y >= 0 && y < tileExtent && markedDistance - halfLabelLength >= 0 && markedDistance + halfLabelLength <= lineLength) {
                var anchor = new __chunk_1.Anchor(x, y, angle, i);
                anchor._round();
                if (!angleWindowSize || checkMaxAngle(line, anchor, labelLength, angleWindowSize, maxAngle)) {
                    anchors.push(anchor);
                }
            }
        }
        distance += segmentDist;
    }
    if (!placeAtMiddle && !anchors.length && !isLineContinued) {
        anchors = resample(line, distance / 2, spacing, angleWindowSize, maxAngle, labelLength, isLineContinued, true, tileExtent);
    }
    return anchors;
}

function clipLine(lines, x1, y1, x2, y2) {
    var clippedLines = [];
    for (var l = 0; l < lines.length; l++) {
        var line = lines[l];
        var clippedLine = void 0;
        for (var i = 0; i < line.length - 1; i++) {
            var p0 = line[i];
            var p1 = line[i + 1];
            if (p0.x < x1 && p1.x < x1) {
                continue;
            } else if (p0.x < x1) {
                p0 = new __chunk_1.Point(x1, p0.y + (p1.y - p0.y) * ((x1 - p0.x) / (p1.x - p0.x)))._round();
            } else if (p1.x < x1) {
                p1 = new __chunk_1.Point(x1, p0.y + (p1.y - p0.y) * ((x1 - p0.x) / (p1.x - p0.x)))._round();
            }
            if (p0.y < y1 && p1.y < y1) {
                continue;
            } else if (p0.y < y1) {
                p0 = new __chunk_1.Point(p0.x + (p1.x - p0.x) * ((y1 - p0.y) / (p1.y - p0.y)), y1)._round();
            } else if (p1.y < y1) {
                p1 = new __chunk_1.Point(p0.x + (p1.x - p0.x) * ((y1 - p0.y) / (p1.y - p0.y)), y1)._round();
            }
            if (p0.x >= x2 && p1.x >= x2) {
                continue;
            } else if (p0.x >= x2) {
                p0 = new __chunk_1.Point(x2, p0.y + (p1.y - p0.y) * ((x2 - p0.x) / (p1.x - p0.x)))._round();
            } else if (p1.x >= x2) {
                p1 = new __chunk_1.Point(x2, p0.y + (p1.y - p0.y) * ((x2 - p0.x) / (p1.x - p0.x)))._round();
            }
            if (p0.y >= y2 && p1.y >= y2) {
                continue;
            } else if (p0.y >= y2) {
                p0 = new __chunk_1.Point(p0.x + (p1.x - p0.x) * ((y2 - p0.y) / (p1.y - p0.y)), y2)._round();
            } else if (p1.y >= y2) {
                p1 = new __chunk_1.Point(p0.x + (p1.x - p0.x) * ((y2 - p0.y) / (p1.y - p0.y)), y2)._round();
            }
            if (!clippedLine || !p0.equals(clippedLine[clippedLine.length - 1])) {
                clippedLine = [p0];
                clippedLines.push(clippedLine);
            }
            clippedLine.push(p1);
        }
    }
    return clippedLines;
}

function getIconQuads(anchor, shapedIcon, layer, alongLine, shapedText, feature) {
    var image = shapedIcon.image;
    var layout = layer.layout;
    var border = 1;
    var top = shapedIcon.top - border / image.pixelRatio;
    var left = shapedIcon.left - border / image.pixelRatio;
    var bottom = shapedIcon.bottom + border / image.pixelRatio;
    var right = shapedIcon.right + border / image.pixelRatio;
    var tl, tr, br, bl;
    if (layout.get('icon-text-fit') !== 'none' && shapedText) {
        var iconWidth = right - left, iconHeight = bottom - top, size = layout.get('text-size').evaluate(feature, {}) / 24, textLeft = shapedText.left * size, textRight = shapedText.right * size, textTop = shapedText.top * size, textBottom = shapedText.bottom * size, textWidth = textRight - textLeft, textHeight = textBottom - textTop, padT = layout.get('icon-text-fit-padding')[0], padR = layout.get('icon-text-fit-padding')[1], padB = layout.get('icon-text-fit-padding')[2], padL = layout.get('icon-text-fit-padding')[3], offsetY = layout.get('icon-text-fit') === 'width' ? (textHeight - iconHeight) * 0.5 : 0, offsetX = layout.get('icon-text-fit') === 'height' ? (textWidth - iconWidth) * 0.5 : 0, width = layout.get('icon-text-fit') === 'width' || layout.get('icon-text-fit') === 'both' ? textWidth : iconWidth, height = layout.get('icon-text-fit') === 'height' || layout.get('icon-text-fit') === 'both' ? textHeight : iconHeight;
        tl = new __chunk_1.Point(textLeft + offsetX - padL, textTop + offsetY - padT);
        tr = new __chunk_1.Point(textLeft + offsetX + padR + width, textTop + offsetY - padT);
        br = new __chunk_1.Point(textLeft + offsetX + padR + width, textTop + offsetY + padB + height);
        bl = new __chunk_1.Point(textLeft + offsetX - padL, textTop + offsetY + padB + height);
    } else {
        tl = new __chunk_1.Point(left, top);
        tr = new __chunk_1.Point(right, top);
        br = new __chunk_1.Point(right, bottom);
        bl = new __chunk_1.Point(left, bottom);
    }
    var angle = layer.layout.get('icon-rotate').evaluate(feature, {}) * Math.PI / 180;
    if (angle) {
        var sin = Math.sin(angle), cos = Math.cos(angle), matrix = [
                cos,
                -sin,
                sin,
                cos
            ];
        tl._matMult(matrix);
        tr._matMult(matrix);
        bl._matMult(matrix);
        br._matMult(matrix);
    }
    return [{
            tl: tl,
            tr: tr,
            bl: bl,
            br: br,
            tex: image.paddedRect,
            writingMode: undefined,
            glyphOffset: [
                0,
                0
            ]
        }];
}
function getGlyphQuads(anchor, shaping, layer, alongLine, feature, positions) {
    var oneEm = 24;
    var textRotate = layer.layout.get('text-rotate').evaluate(feature, {}) * Math.PI / 180;
    var textOffset = layer.layout.get('text-offset').evaluate(feature, {}).map(function (t) {
        return t * oneEm;
    });
    var positionedGlyphs = shaping.positionedGlyphs;
    var quads = [];
    for (var k = 0; k < positionedGlyphs.length; k++) {
        var positionedGlyph = positionedGlyphs[k];
        var glyphPositions = positions[positionedGlyph.fontStack];
        var glyph = glyphPositions && glyphPositions[positionedGlyph.glyph];
        if (!glyph) {
            continue;
        }
        var rect = glyph.rect;
        if (!rect) {
            continue;
        }
        var glyphPadding = 1;
        var rectBuffer = __chunk_1.GLYPH_PBF_BORDER + glyphPadding;
        var halfAdvance = glyph.metrics.advance * positionedGlyph.scale / 2;
        var glyphOffset = alongLine ? [
            positionedGlyph.x + halfAdvance,
            positionedGlyph.y
        ] : [
            0,
            0
        ];
        var builtInOffset = alongLine ? [
            0,
            0
        ] : [
            positionedGlyph.x + halfAdvance + textOffset[0],
            positionedGlyph.y + textOffset[1]
        ];
        var x1 = (glyph.metrics.left - rectBuffer) * positionedGlyph.scale - halfAdvance + builtInOffset[0];
        var y1 = (-glyph.metrics.top - rectBuffer) * positionedGlyph.scale + builtInOffset[1];
        var x2 = x1 + rect.w * positionedGlyph.scale;
        var y2 = y1 + rect.h * positionedGlyph.scale;
        var tl = new __chunk_1.Point(x1, y1);
        var tr = new __chunk_1.Point(x2, y1);
        var bl = new __chunk_1.Point(x1, y2);
        var br = new __chunk_1.Point(x2, y2);
        if (alongLine && positionedGlyph.vertical) {
            var center = new __chunk_1.Point(-halfAdvance, halfAdvance);
            var verticalRotation = -Math.PI / 2;
            var xOffsetCorrection = new __chunk_1.Point(5, 0);
            tl._rotateAround(verticalRotation, center)._add(xOffsetCorrection);
            tr._rotateAround(verticalRotation, center)._add(xOffsetCorrection);
            bl._rotateAround(verticalRotation, center)._add(xOffsetCorrection);
            br._rotateAround(verticalRotation, center)._add(xOffsetCorrection);
        }
        if (textRotate) {
            var sin = Math.sin(textRotate), cos = Math.cos(textRotate), matrix = [
                    cos,
                    -sin,
                    sin,
                    cos
                ];
            tl._matMult(matrix);
            tr._matMult(matrix);
            bl._matMult(matrix);
            br._matMult(matrix);
        }
        quads.push({
            tl: tl,
            tr: tr,
            bl: bl,
            br: br,
            tex: rect,
            writingMode: shaping.writingMode,
            glyphOffset: glyphOffset
        });
    }
    return quads;
}

var CollisionFeature = function CollisionFeature(collisionBoxArray, line, anchor, featureIndex, sourceLayerIndex, bucketIndex, shaped, boxScale, padding, alignLine, overscaling, rotate) {
    var y1 = shaped.top * boxScale - padding;
    var y2 = shaped.bottom * boxScale + padding;
    var x1 = shaped.left * boxScale - padding;
    var x2 = shaped.right * boxScale + padding;
    this.boxStartIndex = collisionBoxArray.length;
    if (alignLine) {
        var height = y2 - y1;
        var length = x2 - x1;
        if (height > 0) {
            height = Math.max(10 * boxScale, height);
            this._addLineCollisionCircles(collisionBoxArray, line, anchor, anchor.segment, length, height, featureIndex, sourceLayerIndex, bucketIndex, overscaling);
        }
    } else {
        if (rotate) {
            var tl = new __chunk_1.Point(x1, y1);
            var tr = new __chunk_1.Point(x2, y1);
            var bl = new __chunk_1.Point(x1, y2);
            var br = new __chunk_1.Point(x2, y2);
            var rotateRadians = rotate * Math.PI / 180;
            tl._rotate(rotateRadians);
            tr._rotate(rotateRadians);
            bl._rotate(rotateRadians);
            br._rotate(rotateRadians);
            x1 = Math.min(tl.x, tr.x, bl.x, br.x);
            x2 = Math.max(tl.x, tr.x, bl.x, br.x);
            y1 = Math.min(tl.y, tr.y, bl.y, br.y);
            y2 = Math.max(tl.y, tr.y, bl.y, br.y);
        }
        collisionBoxArray.emplaceBack(anchor.x, anchor.y, x1, y1, x2, y2, featureIndex, sourceLayerIndex, bucketIndex, 0, 0);
    }
    this.boxEndIndex = collisionBoxArray.length;
};
CollisionFeature.prototype._addLineCollisionCircles = function _addLineCollisionCircles(collisionBoxArray, line, anchor, segment, labelLength, boxSize, featureIndex, sourceLayerIndex, bucketIndex, overscaling) {
    var step = boxSize / 2;
    var nBoxes = Math.floor(labelLength / step) || 1;
    var overscalingPaddingFactor = 1 + 0.4 * Math.log(overscaling) / Math.LN2;
    var nPitchPaddingBoxes = Math.floor(nBoxes * overscalingPaddingFactor / 2);
    var firstBoxOffset = -boxSize / 2;
    var p = anchor;
    var index = segment + 1;
    var anchorDistance = firstBoxOffset;
    var labelStartDistance = -labelLength / 2;
    var paddingStartDistance = labelStartDistance - labelLength / 4;
    do {
        index--;
        if (index < 0) {
            if (anchorDistance > labelStartDistance) {
                return;
            } else {
                index = 0;
                break;
            }
        } else {
            anchorDistance -= line[index].dist(p);
            p = line[index];
        }
    } while (anchorDistance > paddingStartDistance);
    var segmentLength = line[index].dist(line[index + 1]);
    for (var i = -nPitchPaddingBoxes; i < nBoxes + nPitchPaddingBoxes; i++) {
        var boxOffset = i * step;
        var boxDistanceToAnchor = labelStartDistance + boxOffset;
        if (boxOffset < 0) {
            boxDistanceToAnchor += boxOffset;
        }
        if (boxOffset > labelLength) {
            boxDistanceToAnchor += boxOffset - labelLength;
        }
        if (boxDistanceToAnchor < anchorDistance) {
            continue;
        }
        while (anchorDistance + segmentLength < boxDistanceToAnchor) {
            anchorDistance += segmentLength;
            index++;
            if (index + 1 >= line.length) {
                return;
            }
            segmentLength = line[index].dist(line[index + 1]);
        }
        var segmentBoxDistance = boxDistanceToAnchor - anchorDistance;
        var p0 = line[index];
        var p1 = line[index + 1];
        var boxAnchorPoint = p1.sub(p0)._unit()._mult(segmentBoxDistance)._add(p0)._round();
        var paddedAnchorDistance = Math.abs(boxDistanceToAnchor - firstBoxOffset) < step ? 0 : (boxDistanceToAnchor - firstBoxOffset) * 0.8;
        collisionBoxArray.emplaceBack(boxAnchorPoint.x, boxAnchorPoint.y, -boxSize / 2, -boxSize / 2, boxSize / 2, boxSize / 2, featureIndex, sourceLayerIndex, bucketIndex, boxSize / 2, paddedAnchorDistance);
    }
};

var tinyqueue = TinyQueue;
var default_1 = TinyQueue;
function TinyQueue(data, compare) {
    var this$1 = this;
    if (!(this instanceof TinyQueue)) {
        return new TinyQueue(data, compare);
    }
    this.data = data || [];
    this.length = this.data.length;
    this.compare = compare || defaultCompare;
    if (this.length > 0) {
        for (var i = (this.length >> 1) - 1; i >= 0; i--) {
            this$1._down(i);
        }
    }
}
function defaultCompare(a, b) {
    return a < b ? -1 : a > b ? 1 : 0;
}
TinyQueue.prototype = {
    push: function (item) {
        this.data.push(item);
        this.length++;
        this._up(this.length - 1);
    },
    pop: function () {
        if (this.length === 0) {
            return undefined;
        }
        var top = this.data[0];
        this.length--;
        if (this.length > 0) {
            this.data[0] = this.data[this.length];
            this._down(0);
        }
        this.data.pop();
        return top;
    },
    peek: function () {
        return this.data[0];
    },
    _up: function (pos) {
        var data = this.data;
        var compare = this.compare;
        var item = data[pos];
        while (pos > 0) {
            var parent = pos - 1 >> 1;
            var current = data[parent];
            if (compare(item, current) >= 0) {
                break;
            }
            data[pos] = current;
            pos = parent;
        }
        data[pos] = item;
    },
    _down: function (pos) {
        var this$1 = this;
        var data = this.data;
        var compare = this.compare;
        var halfLength = this.length >> 1;
        var item = data[pos];
        while (pos < halfLength) {
            var left = (pos << 1) + 1;
            var right = left + 1;
            var best = data[left];
            if (right < this$1.length && compare(data[right], best) < 0) {
                left = right;
                best = data[right];
            }
            if (compare(best, item) >= 0) {
                break;
            }
            data[pos] = best;
            pos = left;
        }
        data[pos] = item;
    }
};
tinyqueue.default = default_1;

function findPoleOfInaccessibility (polygonRings, precision, debug) {
    if (precision === void 0)
        precision = 1;
    if (debug === void 0)
        debug = false;
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    var outerRing = polygonRings[0];
    for (var i = 0; i < outerRing.length; i++) {
        var p = outerRing[i];
        if (!i || p.x < minX) {
            minX = p.x;
        }
        if (!i || p.y < minY) {
            minY = p.y;
        }
        if (!i || p.x > maxX) {
            maxX = p.x;
        }
        if (!i || p.y > maxY) {
            maxY = p.y;
        }
    }
    var width = maxX - minX;
    var height = maxY - minY;
    var cellSize = Math.min(width, height);
    var h = cellSize / 2;
    var cellQueue = new tinyqueue(null, compareMax);
    if (cellSize === 0) {
        return new __chunk_1.Point(minX, minY);
    }
    for (var x = minX; x < maxX; x += cellSize) {
        for (var y = minY; y < maxY; y += cellSize) {
            cellQueue.push(new Cell(x + h, y + h, h, polygonRings));
        }
    }
    var bestCell = getCentroidCell(polygonRings);
    var numProbes = cellQueue.length;
    while (cellQueue.length) {
        var cell = cellQueue.pop();
        if (cell.d > bestCell.d || !bestCell.d) {
            bestCell = cell;
            if (debug) {
                console.log('found best %d after %d probes', Math.round(10000 * cell.d) / 10000, numProbes);
            }
        }
        if (cell.max - bestCell.d <= precision) {
            continue;
        }
        h = cell.h / 2;
        cellQueue.push(new Cell(cell.p.x - h, cell.p.y - h, h, polygonRings));
        cellQueue.push(new Cell(cell.p.x + h, cell.p.y - h, h, polygonRings));
        cellQueue.push(new Cell(cell.p.x - h, cell.p.y + h, h, polygonRings));
        cellQueue.push(new Cell(cell.p.x + h, cell.p.y + h, h, polygonRings));
        numProbes += 4;
    }
    if (debug) {
        console.log('num probes: ' + numProbes);
        console.log('best distance: ' + bestCell.d);
    }
    return bestCell.p;
}function compareMax(a, b) {
    return b.max - a.max;
}
function Cell(x, y, h, polygon) {
    this.p = new __chunk_1.Point(x, y);
    this.h = h;
    this.d = pointToPolygonDist(this.p, polygon);
    this.max = this.d + this.h * Math.SQRT2;
}
function pointToPolygonDist(p, polygon) {
    var inside = false;
    var minDistSq = Infinity;
    for (var k = 0; k < polygon.length; k++) {
        var ring = polygon[k];
        for (var i = 0, len = ring.length, j = len - 1; i < len; j = i++) {
            var a = ring[i];
            var b = ring[j];
            if (a.y > p.y !== b.y > p.y && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) {
                inside = !inside;
            }
            minDistSq = Math.min(minDistSq, __chunk_1.distToSegmentSquared(p, a, b));
        }
    }
    return (inside ? 1 : -1) * Math.sqrt(minDistSq);
}
function getCentroidCell(polygon) {
    var area = 0;
    var x = 0;
    var y = 0;
    var points = polygon[0];
    for (var i = 0, len = points.length, j = len - 1; i < len; j = i++) {
        var a = points[i];
        var b = points[j];
        var f = a.x * b.y - b.x * a.y;
        x += (a.x + b.x) * f;
        y += (a.y + b.y) * f;
        area += f * 3;
    }
    return new Cell(x / area, y / area, 0, polygon);
}

var murmurhash3_gc = __chunk_1.createCommonjsModule(function (module) {
function murmurhash3_32_gc(key, seed) {
    var remainder, bytes, h1, h1b, c1, c2, k1, i;
    remainder = key.length & 3;
    bytes = key.length - remainder;
    h1 = seed;
    c1 = 3432918353;
    c2 = 461845907;
    i = 0;
    while (i < bytes) {
        k1 = key.charCodeAt(i) & 255 | (key.charCodeAt(++i) & 255) << 8 | (key.charCodeAt(++i) & 255) << 16 | (key.charCodeAt(++i) & 255) << 24;
        ++i;
        k1 = (k1 & 65535) * c1 + (((k1 >>> 16) * c1 & 65535) << 16) & 4294967295;
        k1 = k1 << 15 | k1 >>> 17;
        k1 = (k1 & 65535) * c2 + (((k1 >>> 16) * c2 & 65535) << 16) & 4294967295;
        h1 ^= k1;
        h1 = h1 << 13 | h1 >>> 19;
        h1b = (h1 & 65535) * 5 + (((h1 >>> 16) * 5 & 65535) << 16) & 4294967295;
        h1 = (h1b & 65535) + 27492 + (((h1b >>> 16) + 58964 & 65535) << 16);
    }
    k1 = 0;
    switch (remainder) {
    case 3:
        k1 ^= (key.charCodeAt(i + 2) & 255) << 16;
    case 2:
        k1 ^= (key.charCodeAt(i + 1) & 255) << 8;
    case 1:
        k1 ^= key.charCodeAt(i) & 255;
        k1 = (k1 & 65535) * c1 + (((k1 >>> 16) * c1 & 65535) << 16) & 4294967295;
        k1 = k1 << 15 | k1 >>> 17;
        k1 = (k1 & 65535) * c2 + (((k1 >>> 16) * c2 & 65535) << 16) & 4294967295;
        h1 ^= k1;
    }
    h1 ^= key.length;
    h1 ^= h1 >>> 16;
    h1 = (h1 & 65535) * 2246822507 + (((h1 >>> 16) * 2246822507 & 65535) << 16) & 4294967295;
    h1 ^= h1 >>> 13;
    h1 = (h1 & 65535) * 3266489909 + (((h1 >>> 16) * 3266489909 & 65535) << 16) & 4294967295;
    h1 ^= h1 >>> 16;
    return h1 >>> 0;
}
{
    module.exports = murmurhash3_32_gc;
}
});

var murmurhash2_gc = __chunk_1.createCommonjsModule(function (module) {
function murmurhash2_32_gc(str, seed) {
    var l = str.length, h = seed ^ l, i = 0, k;
    while (l >= 4) {
        k = str.charCodeAt(i) & 255 | (str.charCodeAt(++i) & 255) << 8 | (str.charCodeAt(++i) & 255) << 16 | (str.charCodeAt(++i) & 255) << 24;
        k = (k & 65535) * 1540483477 + (((k >>> 16) * 1540483477 & 65535) << 16);
        k ^= k >>> 24;
        k = (k & 65535) * 1540483477 + (((k >>> 16) * 1540483477 & 65535) << 16);
        h = (h & 65535) * 1540483477 + (((h >>> 16) * 1540483477 & 65535) << 16) ^ k;
        l -= 4;
        ++i;
    }
    switch (l) {
    case 3:
        h ^= (str.charCodeAt(i + 2) & 255) << 16;
    case 2:
        h ^= (str.charCodeAt(i + 1) & 255) << 8;
    case 1:
        h ^= str.charCodeAt(i) & 255;
        h = (h & 65535) * 1540483477 + (((h >>> 16) * 1540483477 & 65535) << 16);
    }
    h ^= h >>> 13;
    h = (h & 65535) * 1540483477 + (((h >>> 16) * 1540483477 & 65535) << 16);
    h ^= h >>> 15;
    return h >>> 0;
}
{
    module.exports = murmurhash2_32_gc;
}
});

var murmurhashJs = murmurhash3_gc;
var murmur3_1 = murmurhash3_gc;
var murmur2_1 = murmurhash2_gc;
murmurhashJs.murmur3 = murmur3_1;
murmurhashJs.murmur2 = murmur2_1;

function performSymbolLayout(bucket, glyphMap, glyphPositions, imageMap, imagePositions, showCollisionBoxes) {
    bucket.createArrays();
    var tileSize = 512 * bucket.overscaling;
    bucket.tilePixelRatio = __chunk_1.EXTENT / tileSize;
    bucket.compareText = {};
    bucket.iconsNeedLinear = false;
    var layout = bucket.layers[0].layout;
    var unevaluatedLayoutValues = bucket.layers[0]._unevaluatedLayout._values;
    var sizes = {};
    if (bucket.textSizeData.functionType === 'composite') {
        var ref = bucket.textSizeData.zoomRange;
        var min = ref.min;
        var max = ref.max;
        sizes.compositeTextSizes = [
            unevaluatedLayoutValues['text-size'].possiblyEvaluate(new __chunk_1.EvaluationParameters(min)),
            unevaluatedLayoutValues['text-size'].possiblyEvaluate(new __chunk_1.EvaluationParameters(max))
        ];
    }
    if (bucket.iconSizeData.functionType === 'composite') {
        var ref$1 = bucket.iconSizeData.zoomRange;
        var min$1 = ref$1.min;
        var max$1 = ref$1.max;
        sizes.compositeIconSizes = [
            unevaluatedLayoutValues['icon-size'].possiblyEvaluate(new __chunk_1.EvaluationParameters(min$1)),
            unevaluatedLayoutValues['icon-size'].possiblyEvaluate(new __chunk_1.EvaluationParameters(max$1))
        ];
    }
    sizes.layoutTextSize = unevaluatedLayoutValues['text-size'].possiblyEvaluate(new __chunk_1.EvaluationParameters(bucket.zoom + 1));
    sizes.layoutIconSize = unevaluatedLayoutValues['icon-size'].possiblyEvaluate(new __chunk_1.EvaluationParameters(bucket.zoom + 1));
    sizes.textMaxSize = unevaluatedLayoutValues['text-size'].possiblyEvaluate(new __chunk_1.EvaluationParameters(18));
    var oneEm = 24;
    var lineHeight = layout.get('text-line-height') * oneEm;
    var textAlongLine = layout.get('text-rotation-alignment') === 'map' && layout.get('symbol-placement') !== 'point';
    var keepUpright = layout.get('text-keep-upright');
    for (var i = 0, list = bucket.features; i < list.length; i += 1) {
        var feature = list[i];
        var fontstack = layout.get('text-font').evaluate(feature, {}).join(',');
        var glyphPositionMap = glyphPositions;
        var shapedTextOrientations = {};
        var text = feature.text;
        if (text) {
            var unformattedText = text.toString();
            var textOffset = layout.get('text-offset').evaluate(feature, {}).map(function (t) {
                return t * oneEm;
            });
            var spacing = layout.get('text-letter-spacing').evaluate(feature, {}) * oneEm;
            var spacingIfAllowed = __chunk_1.allowsLetterSpacing(unformattedText) ? spacing : 0;
            var textAnchor = layout.get('text-anchor').evaluate(feature, {});
            var textJustify = layout.get('text-justify').evaluate(feature, {});
            var maxWidth = layout.get('symbol-placement') === 'point' ? layout.get('text-max-width').evaluate(feature, {}) * oneEm : 0;
            shapedTextOrientations.horizontal = __chunk_1.shapeText(text, glyphMap, fontstack, maxWidth, lineHeight, textAnchor, textJustify, spacingIfAllowed, textOffset, oneEm, __chunk_1.WritingMode.horizontal);
            if (__chunk_1.allowsVerticalWritingMode(unformattedText) && textAlongLine && keepUpright) {
                shapedTextOrientations.vertical = __chunk_1.shapeText(text, glyphMap, fontstack, maxWidth, lineHeight, textAnchor, textJustify, spacingIfAllowed, textOffset, oneEm, __chunk_1.WritingMode.vertical);
            }
        }
        var shapedIcon = void 0;
        if (feature.icon) {
            var image = imageMap[feature.icon];
            if (image) {
                shapedIcon = __chunk_1.shapeIcon(imagePositions[feature.icon], layout.get('icon-offset').evaluate(feature, {}), layout.get('icon-anchor').evaluate(feature, {}));
                if (bucket.sdfIcons === undefined) {
                    bucket.sdfIcons = image.sdf;
                } else if (bucket.sdfIcons !== image.sdf) {
                    __chunk_1.warnOnce('Style sheet warning: Cannot mix SDF and non-SDF icons in one buffer');
                }
                if (image.pixelRatio !== bucket.pixelRatio) {
                    bucket.iconsNeedLinear = true;
                } else if (layout.get('icon-rotate').constantOr(1) !== 0) {
                    bucket.iconsNeedLinear = true;
                }
            }
        }
        if (shapedTextOrientations.horizontal || shapedIcon) {
            addFeature(bucket, feature, shapedTextOrientations, shapedIcon, glyphPositionMap, sizes);
        }
    }
    if (showCollisionBoxes) {
        bucket.generateCollisionDebugBuffers();
    }
}
function addFeature(bucket, feature, shapedTextOrientations, shapedIcon, glyphPositionMap, sizes) {
    var layoutTextSize = sizes.layoutTextSize.evaluate(feature, {});
    var layoutIconSize = sizes.layoutIconSize.evaluate(feature, {});
    var textMaxSize = sizes.textMaxSize.evaluate(feature, {});
    if (textMaxSize === undefined) {
        textMaxSize = layoutTextSize;
    }
    var layout = bucket.layers[0].layout;
    var textOffset = layout.get('text-offset').evaluate(feature, {});
    var iconOffset = layout.get('icon-offset').evaluate(feature, {});
    var glyphSize = 24, fontScale = layoutTextSize / glyphSize, textBoxScale = bucket.tilePixelRatio * fontScale, textMaxBoxScale = bucket.tilePixelRatio * textMaxSize / glyphSize, iconBoxScale = bucket.tilePixelRatio * layoutIconSize, symbolMinDistance = bucket.tilePixelRatio * layout.get('symbol-spacing'), textPadding = layout.get('text-padding') * bucket.tilePixelRatio, iconPadding = layout.get('icon-padding') * bucket.tilePixelRatio, textMaxAngle = layout.get('text-max-angle') / 180 * Math.PI, textAlongLine = layout.get('text-rotation-alignment') === 'map' && layout.get('symbol-placement') !== 'point', iconAlongLine = layout.get('icon-rotation-alignment') === 'map' && layout.get('symbol-placement') !== 'point', symbolPlacement = layout.get('symbol-placement'), textRepeatDistance = symbolMinDistance / 2;
    var addSymbolAtAnchor = function (line, anchor) {
        if (anchor.x < 0 || anchor.x >= __chunk_1.EXTENT || anchor.y < 0 || anchor.y >= __chunk_1.EXTENT) {
            return;
        }
        addSymbol(bucket, anchor, line, shapedTextOrientations, shapedIcon, bucket.layers[0], bucket.collisionBoxArray, feature.index, feature.sourceLayerIndex, bucket.index, textBoxScale, textPadding, textAlongLine, textOffset, iconBoxScale, iconPadding, iconAlongLine, iconOffset, feature, glyphPositionMap, sizes);
    };
    if (symbolPlacement === 'line') {
        for (var i$1 = 0, list$1 = clipLine(feature.geometry, 0, 0, __chunk_1.EXTENT, __chunk_1.EXTENT); i$1 < list$1.length; i$1 += 1) {
            var line = list$1[i$1];
            var anchors = getAnchors(line, symbolMinDistance, textMaxAngle, shapedTextOrientations.vertical || shapedTextOrientations.horizontal, shapedIcon, glyphSize, textMaxBoxScale, bucket.overscaling, __chunk_1.EXTENT);
            for (var i = 0, list = anchors; i < list.length; i += 1) {
                var anchor = list[i];
                var shapedText = shapedTextOrientations.horizontal;
                if (!shapedText || !anchorIsTooClose(bucket, shapedText.text, textRepeatDistance, anchor)) {
                    addSymbolAtAnchor(line, anchor);
                }
            }
        }
    } else if (symbolPlacement === 'line-center') {
        for (var i$2 = 0, list$2 = feature.geometry; i$2 < list$2.length; i$2 += 1) {
            var line$1 = list$2[i$2];
            if (line$1.length > 1) {
                var anchor$1 = getCenterAnchor(line$1, textMaxAngle, shapedTextOrientations.vertical || shapedTextOrientations.horizontal, shapedIcon, glyphSize, textMaxBoxScale);
                if (anchor$1) {
                    addSymbolAtAnchor(line$1, anchor$1);
                }
            }
        }
    } else if (feature.type === 'Polygon') {
        for (var i$3 = 0, list$3 = __chunk_1.classifyRings(feature.geometry, 0); i$3 < list$3.length; i$3 += 1) {
            var polygon = list$3[i$3];
            var poi = findPoleOfInaccessibility(polygon, 16);
            addSymbolAtAnchor(polygon[0], new __chunk_1.Anchor(poi.x, poi.y, 0));
        }
    } else if (feature.type === 'LineString') {
        for (var i$4 = 0, list$4 = feature.geometry; i$4 < list$4.length; i$4 += 1) {
            var line$2 = list$4[i$4];
            addSymbolAtAnchor(line$2, new __chunk_1.Anchor(line$2[0].x, line$2[0].y, 0));
        }
    } else if (feature.type === 'Point') {
        for (var i$6 = 0, list$6 = feature.geometry; i$6 < list$6.length; i$6 += 1) {
            var points = list$6[i$6];
            for (var i$5 = 0, list$5 = points; i$5 < list$5.length; i$5 += 1) {
                var point = list$5[i$5];
                addSymbolAtAnchor([point], new __chunk_1.Anchor(point.x, point.y, 0));
            }
        }
    }
}
var MAX_PACKED_SIZE = 65535;
function addTextVertices(bucket, anchor, shapedText, layer, textAlongLine, feature, textOffset, lineArray, writingMode, placedTextSymbolIndices, glyphPositionMap, sizes) {
    var glyphQuads = getGlyphQuads(anchor, shapedText, layer, textAlongLine, feature, glyphPositionMap);
    var sizeData = bucket.textSizeData;
    var textSizeData = null;
    if (sizeData.functionType === 'source') {
        textSizeData = [__chunk_1.SIZE_PACK_FACTOR * layer.layout.get('text-size').evaluate(feature, {})];
        if (textSizeData[0] > MAX_PACKED_SIZE) {
            __chunk_1.warnOnce(bucket.layerIds[0] + ': Value for "text-size" is >= 256. Reduce your "text-size".');
        }
    } else if (sizeData.functionType === 'composite') {
        textSizeData = [
            __chunk_1.SIZE_PACK_FACTOR * sizes.compositeTextSizes[0].evaluate(feature, {}),
            __chunk_1.SIZE_PACK_FACTOR * sizes.compositeTextSizes[1].evaluate(feature, {})
        ];
        if (textSizeData[0] > MAX_PACKED_SIZE || textSizeData[1] > MAX_PACKED_SIZE) {
            __chunk_1.warnOnce(bucket.layerIds[0] + ': Value for "text-size" is >= 256. Reduce your "text-size".');
        }
    }
    bucket.addSymbols(bucket.text, glyphQuads, textSizeData, textOffset, textAlongLine, feature, writingMode, anchor, lineArray.lineStartIndex, lineArray.lineLength);
    placedTextSymbolIndices.push(bucket.text.placedSymbolArray.length - 1);
    return glyphQuads.length * 4;
}
function addSymbol(bucket, anchor, line, shapedTextOrientations, shapedIcon, layer, collisionBoxArray, featureIndex, sourceLayerIndex, bucketIndex, textBoxScale, textPadding, textAlongLine, textOffset, iconBoxScale, iconPadding, iconAlongLine, iconOffset, feature, glyphPositionMap, sizes) {
    var lineArray = bucket.addToLineVertexArray(anchor, line);
    var textCollisionFeature, iconCollisionFeature;
    var numIconVertices = 0;
    var numGlyphVertices = 0;
    var numVerticalGlyphVertices = 0;
    var key = murmurhashJs(shapedTextOrientations.horizontal ? shapedTextOrientations.horizontal.text : '');
    var placedTextSymbolIndices = [];
    if (shapedTextOrientations.horizontal) {
        var textRotate = layer.layout.get('text-rotate').evaluate(feature, {});
        textCollisionFeature = new CollisionFeature(collisionBoxArray, line, anchor, featureIndex, sourceLayerIndex, bucketIndex, shapedTextOrientations.horizontal, textBoxScale, textPadding, textAlongLine, bucket.overscaling, textRotate);
        numGlyphVertices += addTextVertices(bucket, anchor, shapedTextOrientations.horizontal, layer, textAlongLine, feature, textOffset, lineArray, shapedTextOrientations.vertical ? __chunk_1.WritingMode.horizontal : __chunk_1.WritingMode.horizontalOnly, placedTextSymbolIndices, glyphPositionMap, sizes);
        if (shapedTextOrientations.vertical) {
            numVerticalGlyphVertices += addTextVertices(bucket, anchor, shapedTextOrientations.vertical, layer, textAlongLine, feature, textOffset, lineArray, __chunk_1.WritingMode.vertical, placedTextSymbolIndices, glyphPositionMap, sizes);
        }
    }
    var textBoxStartIndex = textCollisionFeature ? textCollisionFeature.boxStartIndex : bucket.collisionBoxArray.length;
    var textBoxEndIndex = textCollisionFeature ? textCollisionFeature.boxEndIndex : bucket.collisionBoxArray.length;
    if (shapedIcon) {
        var iconQuads = getIconQuads(anchor, shapedIcon, layer, iconAlongLine, shapedTextOrientations.horizontal, feature);
        var iconRotate = layer.layout.get('icon-rotate').evaluate(feature, {});
        iconCollisionFeature = new CollisionFeature(collisionBoxArray, line, anchor, featureIndex, sourceLayerIndex, bucketIndex, shapedIcon, iconBoxScale, iconPadding, false, bucket.overscaling, iconRotate);
        numIconVertices = iconQuads.length * 4;
        var sizeData = bucket.iconSizeData;
        var iconSizeData = null;
        if (sizeData.functionType === 'source') {
            iconSizeData = [__chunk_1.SIZE_PACK_FACTOR * layer.layout.get('icon-size').evaluate(feature, {})];
            if (iconSizeData[0] > MAX_PACKED_SIZE) {
                __chunk_1.warnOnce(bucket.layerIds[0] + ': Value for "icon-size" is >= 256. Reduce your "icon-size".');
            }
        } else if (sizeData.functionType === 'composite') {
            iconSizeData = [
                __chunk_1.SIZE_PACK_FACTOR * sizes.compositeIconSizes[0].evaluate(feature, {}),
                __chunk_1.SIZE_PACK_FACTOR * sizes.compositeIconSizes[1].evaluate(feature, {})
            ];
            if (iconSizeData[0] > MAX_PACKED_SIZE || iconSizeData[1] > MAX_PACKED_SIZE) {
                __chunk_1.warnOnce(bucket.layerIds[0] + ': Value for "icon-size" is >= 256. Reduce your "icon-size".');
            }
        }
        bucket.addSymbols(bucket.icon, iconQuads, iconSizeData, iconOffset, iconAlongLine, feature, false, anchor, lineArray.lineStartIndex, lineArray.lineLength);
    }
    var iconBoxStartIndex = iconCollisionFeature ? iconCollisionFeature.boxStartIndex : bucket.collisionBoxArray.length;
    var iconBoxEndIndex = iconCollisionFeature ? iconCollisionFeature.boxEndIndex : bucket.collisionBoxArray.length;
    if (bucket.glyphOffsetArray.length >= __chunk_1.SymbolBucket.MAX_GLYPHS) {
        __chunk_1.warnOnce('Too many glyphs being rendered in a tile. See https://github.com/mapbox/mapbox-gl-js/issues/2907');
    }
    bucket.symbolInstances.emplaceBack(anchor.x, anchor.y, placedTextSymbolIndices.length > 0 ? placedTextSymbolIndices[0] : -1, placedTextSymbolIndices.length > 1 ? placedTextSymbolIndices[1] : -1, key, textBoxStartIndex, textBoxEndIndex, iconBoxStartIndex, iconBoxEndIndex, featureIndex, numGlyphVertices, numVerticalGlyphVertices, numIconVertices, 0);
}
function anchorIsTooClose(bucket, text, repeatDistance, anchor) {
    var compareText = bucket.compareText;
    if (!(text in compareText)) {
        compareText[text] = [];
    } else {
        var otherAnchors = compareText[text];
        for (var k = otherAnchors.length - 1; k >= 0; k--) {
            if (anchor.dist(otherAnchors[k]) < repeatDistance) {
                return true;
            }
        }
    }
    compareText[text].push(anchor);
    return false;
}

var padding = 1;
var GlyphAtlas = function GlyphAtlas(stacks) {
    var positions = {};
    var bins = [];
    for (var stack in stacks) {
        var glyphs = stacks[stack];
        var stackPositions = positions[stack] = {};
        for (var id in glyphs) {
            var src = glyphs[+id];
            if (!src || src.bitmap.width === 0 || src.bitmap.height === 0) {
                continue;
            }
            var bin = {
                x: 0,
                y: 0,
                w: src.bitmap.width + 2 * padding,
                h: src.bitmap.height + 2 * padding
            };
            bins.push(bin);
            stackPositions[id] = {
                rect: bin,
                metrics: src.metrics
            };
        }
    }
    var ref = __chunk_1.potpack(bins);
    var w = ref.w;
    var h = ref.h;
    var image = new __chunk_1.AlphaImage({
        width: w || 1,
        height: h || 1
    });
    for (var stack$1 in stacks) {
        var glyphs$1 = stacks[stack$1];
        for (var id$1 in glyphs$1) {
            var src$1 = glyphs$1[+id$1];
            if (!src$1 || src$1.bitmap.width === 0 || src$1.bitmap.height === 0) {
                continue;
            }
            var bin$1 = positions[stack$1][id$1].rect;
            __chunk_1.AlphaImage.copy(src$1.bitmap, image, {
                x: 0,
                y: 0
            }, {
                x: bin$1.x + padding,
                y: bin$1.y + padding
            }, src$1.bitmap);
        }
    }
    this.image = image;
    this.positions = positions;
};
__chunk_1.register('GlyphAtlas', GlyphAtlas);

var WorkerTile = function WorkerTile(params) {
    this.tileID = new __chunk_1.OverscaledTileID(params.tileID.overscaledZ, params.tileID.wrap, params.tileID.canonical.z, params.tileID.canonical.x, params.tileID.canonical.y);
    this.uid = params.uid;
    this.zoom = params.zoom;
    this.pixelRatio = params.pixelRatio;
    this.tileSize = params.tileSize;
    this.source = params.source;
    this.overscaling = this.tileID.overscaleFactor();
    this.showCollisionBoxes = params.showCollisionBoxes;
    this.collectResourceTiming = !!params.collectResourceTiming;
    this.returnDependencies = !!params.returnDependencies;
};
WorkerTile.prototype.parse = function parse(data, layerIndex, actor, callback) {
    var this$1 = this;
    this.status = 'parsing';
    this.data = data;
    this.collisionBoxArray = new __chunk_1.CollisionBoxArray();
    var sourceLayerCoder = new __chunk_1.DictionaryCoder(Object.keys(data.layers).sort());
    var featureIndex = new __chunk_1.FeatureIndex(this.tileID);
    featureIndex.bucketLayerIDs = [];
    var buckets = {};
    var options = {
        featureIndex: featureIndex,
        iconDependencies: {},
        patternDependencies: {},
        glyphDependencies: {}
    };
    var layerFamilies = layerIndex.familiesBySource[this.source];
    for (var sourceLayerId in layerFamilies) {
        var sourceLayer = data.layers[sourceLayerId];
        if (!sourceLayer) {
            continue;
        }
        if (sourceLayer.version === 1) {
            __chunk_1.warnOnce('Vector tile source "' + this$1.source + '" layer "' + sourceLayerId + '" ' + 'does not use vector tile spec v2 and therefore may have some rendering errors.');
        }
        var sourceLayerIndex = sourceLayerCoder.encode(sourceLayerId);
        var features = [];
        for (var index = 0; index < sourceLayer.length; index++) {
            var feature = sourceLayer.feature(index);
            features.push({
                feature: feature,
                index: index,
                sourceLayerIndex: sourceLayerIndex
            });
        }
        for (var i = 0, list = layerFamilies[sourceLayerId]; i < list.length; i += 1) {
            var family = list[i];
            var layer = family[0];
            if (layer.minzoom && this$1.zoom < Math.floor(layer.minzoom)) {
                continue;
            }
            if (layer.maxzoom && this$1.zoom >= layer.maxzoom) {
                continue;
            }
            if (layer.visibility === 'none') {
                continue;
            }
            recalculateLayers(family, this$1.zoom);
            var bucket = buckets[layer.id] = layer.createBucket({
                index: featureIndex.bucketLayerIDs.length,
                layers: family,
                zoom: this$1.zoom,
                pixelRatio: this$1.pixelRatio,
                overscaling: this$1.overscaling,
                collisionBoxArray: this$1.collisionBoxArray,
                sourceLayerIndex: sourceLayerIndex,
                sourceID: this$1.source
            });
            bucket.populate(features, options);
            featureIndex.bucketLayerIDs.push(family.map(function (l) {
                return l.id;
            }));
        }
    }
    var error;
    var glyphMap;
    var iconMap;
    var patternMap;
    var stacks = __chunk_1.mapObject(options.glyphDependencies, function (glyphs) {
        return Object.keys(glyphs).map(Number);
    });
    if (Object.keys(stacks).length) {
        actor.send('getGlyphs', {
            uid: this.uid,
            stacks: stacks
        }, function (err, result) {
            if (!error) {
                error = err;
                glyphMap = result;
                maybePrepare.call(this$1);
            }
        });
    } else {
        glyphMap = {};
    }
    var icons = Object.keys(options.iconDependencies);
    if (icons.length) {
        actor.send('getImages', { icons: icons }, function (err, result) {
            if (!error) {
                error = err;
                iconMap = result;
                maybePrepare.call(this$1);
            }
        });
    } else {
        iconMap = {};
    }
    var patterns = Object.keys(options.patternDependencies);
    if (patterns.length) {
        actor.send('getImages', { icons: patterns }, function (err, result) {
            if (!error) {
                error = err;
                patternMap = result;
                maybePrepare.call(this$1);
            }
        });
    } else {
        patternMap = {};
    }
    maybePrepare.call(this);
    function maybePrepare() {
        var this$1 = this;
        if (error) {
            return callback(error);
        } else if (glyphMap && iconMap && patternMap) {
            var glyphAtlas = new GlyphAtlas(glyphMap);
            var imageAtlas = new __chunk_1.ImageAtlas(iconMap, patternMap);
            for (var key in buckets) {
                var bucket = buckets[key];
                if (bucket instanceof __chunk_1.SymbolBucket) {
                    recalculateLayers(bucket.layers, this$1.zoom);
                    performSymbolLayout(bucket, glyphMap, glyphAtlas.positions, iconMap, imageAtlas.iconPositions, this$1.showCollisionBoxes);
                } else if (bucket.hasPattern && (bucket instanceof __chunk_1.LineBucket || bucket instanceof __chunk_1.FillBucket || bucket instanceof __chunk_1.FillExtrusionBucket)) {
                    recalculateLayers(bucket.layers, this$1.zoom);
                    bucket.addFeatures(options, imageAtlas.patternPositions);
                }
            }
            this.status = 'done';
            callback(null, {
                buckets: __chunk_1.values(buckets).filter(function (b) {
                    return !b.isEmpty();
                }),
                featureIndex: featureIndex,
                collisionBoxArray: this.collisionBoxArray,
                glyphAtlasImage: glyphAtlas.image,
                imageAtlas: imageAtlas,
                glyphMap: this.returnDependencies ? glyphMap : null,
                iconMap: this.returnDependencies ? iconMap : null,
                glyphPositions: this.returnDependencies ? glyphAtlas.positions : null
            });
        }
    }
};
function recalculateLayers(layers, zoom) {
    var parameters = new __chunk_1.EvaluationParameters(zoom);
    for (var i = 0, list = layers; i < list.length; i += 1) {
        var layer = list[i];
        layer.recalculate(parameters);
    }
}

var performanceExists = typeof performance !== 'undefined';
var wrapper = {};
wrapper.getEntriesByName = function (url) {
    if (performanceExists && performance && performance.getEntriesByName) {
        return performance.getEntriesByName(url);
    } else {
        return false;
    }
};
wrapper.mark = function (name) {
    if (performanceExists && performance && performance.mark) {
        return performance.mark(name);
    } else {
        return false;
    }
};
wrapper.measure = function (name, startMark, endMark) {
    if (performanceExists && performance && performance.measure) {
        return performance.measure(name, startMark, endMark);
    } else {
        return false;
    }
};
wrapper.clearMarks = function (name) {
    if (performanceExists && performance && performance.clearMarks) {
        return performance.clearMarks(name);
    } else {
        return false;
    }
};
wrapper.clearMeasures = function (name) {
    if (performanceExists && performance && performance.clearMeasures) {
        return performance.clearMeasures(name);
    } else {
        return false;
    }
};
var Performance = function Performance(request) {
    this._marks = {
        start: [
            request.url,
            'start'
        ].join('#'),
        end: [
            request.url,
            'end'
        ].join('#'),
        measure: request.url.toString()
    };
    wrapper.mark(this._marks.start);
};
Performance.prototype.finish = function finish() {
    wrapper.mark(this._marks.end);
    var resourceTimingData = wrapper.getEntriesByName(this._marks.measure);
    if (resourceTimingData.length === 0) {
        wrapper.measure(this._marks.measure, this._marks.start, this._marks.end);
        resourceTimingData = wrapper.getEntriesByName(this._marks.measure);
        wrapper.clearMarks(this._marks.start);
        wrapper.clearMarks(this._marks.end);
        wrapper.clearMeasures(this._marks.measure);
    }
    return resourceTimingData;
};
wrapper.Performance = Performance;

function loadVectorTile(params, callback) {
    var request = __chunk_1.getArrayBuffer(params.request, function (err, data, cacheControl, expires) {
        if (err) {
            callback(err);
        } else if (data) {
            callback(null, {
                vectorTile: new __chunk_1.mvt.VectorTile(new __chunk_1.Protobuf(data)),
                rawData: data,
                cacheControl: cacheControl,
                expires: expires
            });
        }
    });
    return function () {
        request.cancel();
        callback();
    };
}
var VectorTileWorkerSource = function VectorTileWorkerSource(actor, layerIndex, loadVectorData) {
    this.actor = actor;
    this.layerIndex = layerIndex;
    this.loadVectorData = loadVectorData || loadVectorTile;
    this.loading = {};
    this.loaded = {};
};
VectorTileWorkerSource.prototype.loadTile = function loadTile(params, callback) {
    var this$1 = this;
    var uid = params.uid;
    if (!this.loading) {
        this.loading = {};
    }
    var perf = params && params.request && params.request.collectResourceTiming ? new wrapper.Performance(params.request) : false;
    var workerTile = this.loading[uid] = new WorkerTile(params);
    workerTile.abort = this.loadVectorData(params, function (err, response) {
        delete this$1.loading[uid];
        if (err || !response) {
            workerTile.status = 'done';
            this$1.loaded[uid] = workerTile;
            return callback(err);
        }
        var rawTileData = response.rawData;
        var cacheControl = {};
        if (response.expires) {
            cacheControl.expires = response.expires;
        }
        if (response.cacheControl) {
            cacheControl.cacheControl = response.cacheControl;
        }
        var resourceTiming = {};
        if (perf) {
            var resourceTimingData = perf.finish();
            if (resourceTimingData) {
                resourceTiming.resourceTiming = JSON.parse(JSON.stringify(resourceTimingData));
            }
        }
        workerTile.vectorTile = response.vectorTile;
        workerTile.parse(response.vectorTile, this$1.layerIndex, this$1.actor, function (err, result) {
            if (err || !result) {
                return callback(err);
            }
            callback(null, __chunk_1.extend({ rawTileData: rawTileData.slice(0) }, result, cacheControl, resourceTiming));
        });
        this$1.loaded = this$1.loaded || {};
        this$1.loaded[uid] = workerTile;
    });
};
VectorTileWorkerSource.prototype.reloadTile = function reloadTile(params, callback) {
    var loaded = this.loaded, uid = params.uid, vtSource = this;
    if (loaded && loaded[uid]) {
        var workerTile = loaded[uid];
        workerTile.showCollisionBoxes = params.showCollisionBoxes;
        var done = function (err, data) {
            var reloadCallback = workerTile.reloadCallback;
            if (reloadCallback) {
                delete workerTile.reloadCallback;
                workerTile.parse(workerTile.vectorTile, vtSource.layerIndex, vtSource.actor, reloadCallback);
            }
            callback(err, data);
        };
        if (workerTile.status === 'parsing') {
            workerTile.reloadCallback = done;
        } else if (workerTile.status === 'done') {
            if (workerTile.vectorTile) {
                workerTile.parse(workerTile.vectorTile, this.layerIndex, this.actor, done);
            } else {
                done();
            }
        }
    }
};
VectorTileWorkerSource.prototype.abortTile = function abortTile(params, callback) {
    var loading = this.loading, uid = params.uid;
    if (loading && loading[uid] && loading[uid].abort) {
        loading[uid].abort();
        delete loading[uid];
    }
    callback();
};
VectorTileWorkerSource.prototype.removeTile = function removeTile(params, callback) {
    var loaded = this.loaded, uid = params.uid;
    if (loaded && loaded[uid]) {
        delete loaded[uid];
    }
    callback();
};

var RasterDEMTileWorkerSource = function RasterDEMTileWorkerSource() {
    this.loaded = {};
};
RasterDEMTileWorkerSource.prototype.loadTile = function loadTile(params, callback) {
    var uid = params.uid;
    var encoding = params.encoding;
    var rawImageData = params.rawImageData;
    var dem = new __chunk_1.DEMData(uid, rawImageData, encoding);
    this.loaded = this.loaded || {};
    this.loaded[uid] = dem;
    callback(null, dem);
};
RasterDEMTileWorkerSource.prototype.removeTile = function removeTile(params) {
    var loaded = this.loaded, uid = params.uid;
    if (loaded && loaded[uid]) {
        delete loaded[uid];
    }
};

var RADIUS = 6378137;
var FLATTENING = 1 / 298.257223563;
var POLAR_RADIUS = 6356752.3142;

var wgs84 = {
	RADIUS: RADIUS,
	FLATTENING: FLATTENING,
	POLAR_RADIUS: POLAR_RADIUS
};

var geometry_1 = geometry;
var ring = ringArea;
function geometry(_) {
    var area = 0, i;
    switch (_.type) {
    case 'Polygon':
        return polygonArea(_.coordinates);
    case 'MultiPolygon':
        for (i = 0; i < _.coordinates.length; i++) {
            area += polygonArea(_.coordinates[i]);
        }
        return area;
    case 'Point':
    case 'MultiPoint':
    case 'LineString':
    case 'MultiLineString':
        return 0;
    case 'GeometryCollection':
        for (i = 0; i < _.geometries.length; i++) {
            area += geometry(_.geometries[i]);
        }
        return area;
    }
}
function polygonArea(coords) {
    var area = 0;
    if (coords && coords.length > 0) {
        area += Math.abs(ringArea(coords[0]));
        for (var i = 1; i < coords.length; i++) {
            area -= Math.abs(ringArea(coords[i]));
        }
    }
    return area;
}
function ringArea(coords) {
    var p1, p2, p3, lowerIndex, middleIndex, upperIndex, i, area = 0, coordsLength = coords.length;
    if (coordsLength > 2) {
        for (i = 0; i < coordsLength; i++) {
            if (i === coordsLength - 2) {
                lowerIndex = coordsLength - 2;
                middleIndex = coordsLength - 1;
                upperIndex = 0;
            } else if (i === coordsLength - 1) {
                lowerIndex = coordsLength - 1;
                middleIndex = 0;
                upperIndex = 1;
            } else {
                lowerIndex = i;
                middleIndex = i + 1;
                upperIndex = i + 2;
            }
            p1 = coords[lowerIndex];
            p2 = coords[middleIndex];
            p3 = coords[upperIndex];
            area += (rad(p3[0]) - rad(p1[0])) * Math.sin(rad(p2[1]));
        }
        area = area * wgs84.RADIUS * wgs84.RADIUS / 2;
    }
    return area;
}
function rad(_) {
    return _ * Math.PI / 180;
}

var geojsonArea = {
	geometry: geometry_1,
	ring: ring
};

var geojsonRewind = rewind;
function rewind(gj, outer) {
    switch (gj && gj.type || null) {
    case 'FeatureCollection':
        gj.features = gj.features.map(curryOuter(rewind, outer));
        return gj;
    case 'Feature':
        gj.geometry = rewind(gj.geometry, outer);
        return gj;
    case 'Polygon':
    case 'MultiPolygon':
        return correct(gj, outer);
    default:
        return gj;
    }
}
function curryOuter(a, b) {
    return function (_) {
        return a(_, b);
    };
}
function correct(_, outer) {
    if (_.type === 'Polygon') {
        _.coordinates = correctRings(_.coordinates, outer);
    } else if (_.type === 'MultiPolygon') {
        _.coordinates = _.coordinates.map(curryOuter(correctRings, outer));
    }
    return _;
}
function correctRings(_, outer) {
    outer = !!outer;
    _[0] = wind(_[0], outer);
    for (var i = 1; i < _.length; i++) {
        _[i] = wind(_[i], !outer);
    }
    return _;
}
function wind(_, dir) {
    return cw(_) === dir ? _ : _.reverse();
}
function cw(_) {
    return geojsonArea.ring(_) >= 0;
}

var toGeoJSON = __chunk_1.mvt.VectorTileFeature.prototype.toGeoJSON;
var FeatureWrapper = function FeatureWrapper(feature) {
    this._feature = feature;
    this.extent = __chunk_1.EXTENT;
    this.type = feature.type;
    this.properties = feature.tags;
    if ('id' in feature && !isNaN(feature.id)) {
        this.id = parseInt(feature.id, 10);
    }
};
FeatureWrapper.prototype.loadGeometry = function loadGeometry() {
    var this$1 = this;
    if (this._feature.type === 1) {
        var geometry = [];
        for (var i = 0, list = this$1._feature.geometry; i < list.length; i += 1) {
            var point = list[i];
            geometry.push([new __chunk_1.Point(point[0], point[1])]);
        }
        return geometry;
    } else {
        var geometry$1 = [];
        for (var i$2 = 0, list$2 = this$1._feature.geometry; i$2 < list$2.length; i$2 += 1) {
            var ring = list$2[i$2];
            var newRing = [];
            for (var i$1 = 0, list$1 = ring; i$1 < list$1.length; i$1 += 1) {
                var point$1 = list$1[i$1];
                newRing.push(new __chunk_1.Point(point$1[0], point$1[1]));
            }
            geometry$1.push(newRing);
        }
        return geometry$1;
    }
};
FeatureWrapper.prototype.toGeoJSON = function toGeoJSON$1(x, y, z) {
    return toGeoJSON.call(this, x, y, z);
};
var GeoJSONWrapper = function GeoJSONWrapper(features) {
    this.layers = { '_geojsonTileLayer': this };
    this.name = '_geojsonTileLayer';
    this.extent = __chunk_1.EXTENT;
    this.length = features.length;
    this._features = features;
};
GeoJSONWrapper.prototype.feature = function feature(i) {
    return new FeatureWrapper(this._features[i]);
};

var VectorTileFeature = __chunk_1.vectorTile.VectorTileFeature;
var geojson_wrapper = GeoJSONWrapper$1;
function GeoJSONWrapper$1(features, options) {
    this.options = options || {};
    this.features = features;
    this.length = features.length;
}
GeoJSONWrapper$1.prototype.feature = function (i) {
    return new FeatureWrapper$1(this.features[i], this.options.extent);
};
function FeatureWrapper$1(feature, extent) {
    this.id = typeof feature.id === 'number' ? feature.id : undefined;
    this.type = feature.type;
    this.rawGeometry = feature.type === 1 ? [feature.geometry] : feature.geometry;
    this.properties = feature.tags;
    this.extent = extent || 4096;
}
FeatureWrapper$1.prototype.loadGeometry = function () {
    var this$1 = this;
    var rings = this.rawGeometry;
    this.geometry = [];
    for (var i = 0; i < rings.length; i++) {
        var ring = rings[i];
        var newRing = [];
        for (var j = 0; j < ring.length; j++) {
            newRing.push(new __chunk_1.Point$1(ring[j][0], ring[j][1]));
        }
        this$1.geometry.push(newRing);
    }
    return this.geometry;
};
FeatureWrapper$1.prototype.bbox = function () {
    if (!this.geometry) {
        this.loadGeometry();
    }
    var rings = this.geometry;
    var x1 = Infinity;
    var x2 = -Infinity;
    var y1 = Infinity;
    var y2 = -Infinity;
    for (var i = 0; i < rings.length; i++) {
        var ring = rings[i];
        for (var j = 0; j < ring.length; j++) {
            var coord = ring[j];
            x1 = Math.min(x1, coord.x);
            x2 = Math.max(x2, coord.x);
            y1 = Math.min(y1, coord.y);
            y2 = Math.max(y2, coord.y);
        }
    }
    return [
        x1,
        y1,
        x2,
        y2
    ];
};
FeatureWrapper$1.prototype.toGeoJSON = VectorTileFeature.prototype.toGeoJSON;

var vtPbf = fromVectorTileJs;
var fromVectorTileJs_1 = fromVectorTileJs;
var fromGeojsonVt_1 = fromGeojsonVt;
var GeoJSONWrapper_1 = geojson_wrapper;
function fromVectorTileJs(tile) {
    var out = new __chunk_1.pbf();
    writeTile(tile, out);
    return out.finish();
}
function fromGeojsonVt(layers, options) {
    options = options || {};
    var l = {};
    for (var k in layers) {
        l[k] = new geojson_wrapper(layers[k].features, options);
        l[k].name = k;
        l[k].version = options.version;
        l[k].extent = options.extent;
    }
    return fromVectorTileJs({ layers: l });
}
function writeTile(tile, pbf) {
    for (var key in tile.layers) {
        pbf.writeMessage(3, writeLayer, tile.layers[key]);
    }
}
function writeLayer(layer, pbf) {
    pbf.writeVarintField(15, layer.version || 1);
    pbf.writeStringField(1, layer.name || '');
    pbf.writeVarintField(5, layer.extent || 4096);
    var i;
    var context = {
        keys: [],
        values: [],
        keycache: {},
        valuecache: {}
    };
    for (i = 0; i < layer.length; i++) {
        context.feature = layer.feature(i);
        pbf.writeMessage(2, writeFeature, context);
    }
    var keys = context.keys;
    for (i = 0; i < keys.length; i++) {
        pbf.writeStringField(3, keys[i]);
    }
    var values = context.values;
    for (i = 0; i < values.length; i++) {
        pbf.writeMessage(4, writeValue, values[i]);
    }
}
function writeFeature(context, pbf) {
    var feature = context.feature;
    if (feature.id !== undefined) {
        pbf.writeVarintField(1, feature.id);
    }
    pbf.writeMessage(2, writeProperties, context);
    pbf.writeVarintField(3, feature.type);
    pbf.writeMessage(4, writeGeometry, feature);
}
function writeProperties(context, pbf) {
    var feature = context.feature;
    var keys = context.keys;
    var values = context.values;
    var keycache = context.keycache;
    var valuecache = context.valuecache;
    for (var key in feature.properties) {
        var keyIndex = keycache[key];
        if (typeof keyIndex === 'undefined') {
            keys.push(key);
            keyIndex = keys.length - 1;
            keycache[key] = keyIndex;
        }
        pbf.writeVarint(keyIndex);
        var value = feature.properties[key];
        var type = typeof value;
        if (type !== 'string' && type !== 'boolean' && type !== 'number') {
            value = JSON.stringify(value);
        }
        var valueKey = type + ':' + value;
        var valueIndex = valuecache[valueKey];
        if (typeof valueIndex === 'undefined') {
            values.push(value);
            valueIndex = values.length - 1;
            valuecache[valueKey] = valueIndex;
        }
        pbf.writeVarint(valueIndex);
    }
}
function command(cmd, length) {
    return (length << 3) + (cmd & 7);
}
function zigzag(num) {
    return num << 1 ^ num >> 31;
}
function writeGeometry(feature, pbf) {
    var geometry = feature.loadGeometry();
    var type = feature.type;
    var x = 0;
    var y = 0;
    var rings = geometry.length;
    for (var r = 0; r < rings; r++) {
        var ring = geometry[r];
        var count = 1;
        if (type === 1) {
            count = ring.length;
        }
        pbf.writeVarint(command(1, count));
        var lineCount = type === 3 ? ring.length - 1 : ring.length;
        for (var i = 0; i < lineCount; i++) {
            if (i === 1 && type !== 1) {
                pbf.writeVarint(command(2, lineCount - 1));
            }
            var dx = ring[i].x - x;
            var dy = ring[i].y - y;
            pbf.writeVarint(zigzag(dx));
            pbf.writeVarint(zigzag(dy));
            x += dx;
            y += dy;
        }
        if (type === 3) {
            pbf.writeVarint(command(7, 0));
        }
    }
}
function writeValue(value, pbf) {
    var type = typeof value;
    if (type === 'string') {
        pbf.writeStringField(1, value);
    } else if (type === 'boolean') {
        pbf.writeBooleanField(7, value);
    } else if (type === 'number') {
        if (value % 1 !== 0) {
            pbf.writeDoubleField(3, value);
        } else if (value < 0) {
            pbf.writeSVarintField(6, value);
        } else {
            pbf.writeVarintField(5, value);
        }
    }
}
vtPbf.fromVectorTileJs = fromVectorTileJs_1;
vtPbf.fromGeojsonVt = fromGeojsonVt_1;
vtPbf.GeoJSONWrapper = GeoJSONWrapper_1;

function sortKD(ids, coords, nodeSize, left, right, depth) {
    if (right - left <= nodeSize) {
        return;
    }
    var m = Math.floor((left + right) / 2);
    select(ids, coords, m, left, right, depth % 2);
    sortKD(ids, coords, nodeSize, left, m - 1, depth + 1);
    sortKD(ids, coords, nodeSize, m + 1, right, depth + 1);
}
function select(ids, coords, k, left, right, inc) {
    while (right > left) {
        if (right - left > 600) {
            var n = right - left + 1;
            var m = k - left + 1;
            var z = Math.log(n);
            var s = 0.5 * Math.exp(2 * z / 3);
            var sd = 0.5 * Math.sqrt(z * s * (n - s) / n) * (m - n / 2 < 0 ? -1 : 1);
            var newLeft = Math.max(left, Math.floor(k - m * s / n + sd));
            var newRight = Math.min(right, Math.floor(k + (n - m) * s / n + sd));
            select(ids, coords, k, newLeft, newRight, inc);
        }
        var t = coords[2 * k + inc];
        var i = left;
        var j = right;
        swapItem(ids, coords, left, k);
        if (coords[2 * right + inc] > t) {
            swapItem(ids, coords, left, right);
        }
        while (i < j) {
            swapItem(ids, coords, i, j);
            i++;
            j--;
            while (coords[2 * i + inc] < t) {
                i++;
            }
            while (coords[2 * j + inc] > t) {
                j--;
            }
        }
        if (coords[2 * left + inc] === t) {
            swapItem(ids, coords, left, j);
        } else {
            j++;
            swapItem(ids, coords, j, right);
        }
        if (j <= k) {
            left = j + 1;
        }
        if (k <= j) {
            right = j - 1;
        }
    }
}
function swapItem(ids, coords, i, j) {
    swap(ids, i, j);
    swap(coords, 2 * i, 2 * j);
    swap(coords, 2 * i + 1, 2 * j + 1);
}
function swap(arr, i, j) {
    var tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
}

function range(ids, coords, minX, minY, maxX, maxY, nodeSize) {
    var stack = [
        0,
        ids.length - 1,
        0
    ];
    var result = [];
    var x, y;
    while (stack.length) {
        var axis = stack.pop();
        var right = stack.pop();
        var left = stack.pop();
        if (right - left <= nodeSize) {
            for (var i = left; i <= right; i++) {
                x = coords[2 * i];
                y = coords[2 * i + 1];
                if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
                    result.push(ids[i]);
                }
            }
            continue;
        }
        var m = Math.floor((left + right) / 2);
        x = coords[2 * m];
        y = coords[2 * m + 1];
        if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
            result.push(ids[m]);
        }
        var nextAxis = (axis + 1) % 2;
        if (axis === 0 ? minX <= x : minY <= y) {
            stack.push(left);
            stack.push(m - 1);
            stack.push(nextAxis);
        }
        if (axis === 0 ? maxX >= x : maxY >= y) {
            stack.push(m + 1);
            stack.push(right);
            stack.push(nextAxis);
        }
    }
    return result;
}

function within(ids, coords, qx, qy, r, nodeSize) {
    var stack = [
        0,
        ids.length - 1,
        0
    ];
    var result = [];
    var r2 = r * r;
    while (stack.length) {
        var axis = stack.pop();
        var right = stack.pop();
        var left = stack.pop();
        if (right - left <= nodeSize) {
            for (var i = left; i <= right; i++) {
                if (sqDist(coords[2 * i], coords[2 * i + 1], qx, qy) <= r2) {
                    result.push(ids[i]);
                }
            }
            continue;
        }
        var m = Math.floor((left + right) / 2);
        var x = coords[2 * m];
        var y = coords[2 * m + 1];
        if (sqDist(x, y, qx, qy) <= r2) {
            result.push(ids[m]);
        }
        var nextAxis = (axis + 1) % 2;
        if (axis === 0 ? qx - r <= x : qy - r <= y) {
            stack.push(left);
            stack.push(m - 1);
            stack.push(nextAxis);
        }
        if (axis === 0 ? qx + r >= x : qy + r >= y) {
            stack.push(m + 1);
            stack.push(right);
            stack.push(nextAxis);
        }
    }
    return result;
}
function sqDist(ax, ay, bx, by) {
    var dx = ax - bx;
    var dy = ay - by;
    return dx * dx + dy * dy;
}

function kdbush(points, getX, getY, nodeSize, ArrayType) {
    return new KDBush(points, getX, getY, nodeSize, ArrayType);
}
function KDBush(points, getX, getY, nodeSize, ArrayType) {
    var this$1 = this;
    getX = getX || defaultGetX;
    getY = getY || defaultGetY;
    ArrayType = ArrayType || Array;
    this.nodeSize = nodeSize || 64;
    this.points = points;
    this.ids = new ArrayType(points.length);
    this.coords = new ArrayType(points.length * 2);
    for (var i = 0; i < points.length; i++) {
        this$1.ids[i] = i;
        this$1.coords[2 * i] = getX(points[i]);
        this$1.coords[2 * i + 1] = getY(points[i]);
    }
    sortKD(this.ids, this.coords, this.nodeSize, 0, this.ids.length - 1, 0);
}
KDBush.prototype = {
    range: function (minX, minY, maxX, maxY) {
        return range(this.ids, this.coords, minX, minY, maxX, maxY, this.nodeSize);
    },
    within: function (x, y, r) {
        return within(this.ids, this.coords, x, y, r, this.nodeSize);
    }
};
function defaultGetX(p) {
    return p[0];
}
function defaultGetY(p) {
    return p[1];
}

function supercluster(options) {
    return new SuperCluster(options);
}
function SuperCluster(options) {
    this.options = extend(Object.create(this.options), options);
    this.trees = new Array(this.options.maxZoom + 1);
}
SuperCluster.prototype = {
    options: {
        minZoom: 0,
        maxZoom: 16,
        radius: 40,
        extent: 512,
        nodeSize: 64,
        log: false,
        reduce: null,
        initial: function () {
            return {};
        },
        map: function (props) {
            return props;
        }
    },
    load: function (points) {
        var this$1 = this;
        var log = this.options.log;
        if (log) {
            console.time('total time');
        }
        var timerId = 'prepare ' + points.length + ' points';
        if (log) {
            console.time(timerId);
        }
        this.points = points;
        var clusters = [];
        for (var i = 0; i < points.length; i++) {
            if (!points[i].geometry) {
                continue;
            }
            clusters.push(createPointCluster(points[i], i));
        }
        this.trees[this.options.maxZoom + 1] = kdbush(clusters, getX, getY, this.options.nodeSize, Float32Array);
        if (log) {
            console.timeEnd(timerId);
        }
        for (var z = this.options.maxZoom; z >= this.options.minZoom; z--) {
            var now = +Date.now();
            clusters = this$1._cluster(clusters, z);
            this$1.trees[z] = kdbush(clusters, getX, getY, this$1.options.nodeSize, Float32Array);
            if (log) {
                console.log('z%d: %d clusters in %dms', z, clusters.length, +Date.now() - now);
            }
        }
        if (log) {
            console.timeEnd('total time');
        }
        return this;
    },
    getClusters: function (bbox, zoom) {
        var this$1 = this;
        var minLng = ((bbox[0] + 180) % 360 + 360) % 360 - 180;
        var minLat = Math.max(-90, Math.min(90, bbox[1]));
        var maxLng = bbox[2] === 180 ? 180 : ((bbox[2] + 180) % 360 + 360) % 360 - 180;
        var maxLat = Math.max(-90, Math.min(90, bbox[3]));
        if (bbox[2] - bbox[0] >= 360) {
            minLng = -180;
            maxLng = 180;
        } else if (minLng > maxLng) {
            var easternHem = this.getClusters([
                minLng,
                minLat,
                180,
                maxLat
            ], zoom);
            var westernHem = this.getClusters([
                -180,
                minLat,
                maxLng,
                maxLat
            ], zoom);
            return easternHem.concat(westernHem);
        }
        var tree = this.trees[this._limitZoom(zoom)];
        var ids = tree.range(lngX(minLng), latY(maxLat), lngX(maxLng), latY(minLat));
        var clusters = [];
        for (var i = 0; i < ids.length; i++) {
            var c = tree.points[ids[i]];
            clusters.push(c.numPoints ? getClusterJSON(c) : this$1.points[c.index]);
        }
        return clusters;
    },
    getChildren: function (clusterId) {
        var this$1 = this;
        var originId = clusterId >> 5;
        var originZoom = clusterId % 32;
        var errorMsg = 'No cluster with the specified id.';
        var index = this.trees[originZoom];
        if (!index) {
            throw new Error(errorMsg);
        }
        var origin = index.points[originId];
        if (!origin) {
            throw new Error(errorMsg);
        }
        var r = this.options.radius / (this.options.extent * Math.pow(2, originZoom - 1));
        var ids = index.within(origin.x, origin.y, r);
        var children = [];
        for (var i = 0; i < ids.length; i++) {
            var c = index.points[ids[i]];
            if (c.parentId === clusterId) {
                children.push(c.numPoints ? getClusterJSON(c) : this$1.points[c.index]);
            }
        }
        if (children.length === 0) {
            throw new Error(errorMsg);
        }
        return children;
    },
    getLeaves: function (clusterId, limit, offset) {
        limit = limit || 10;
        offset = offset || 0;
        var leaves = [];
        this._appendLeaves(leaves, clusterId, limit, offset, 0);
        return leaves;
    },
    getTile: function (z, x, y) {
        var tree = this.trees[this._limitZoom(z)];
        var z2 = Math.pow(2, z);
        var extent = this.options.extent;
        var r = this.options.radius;
        var p = r / extent;
        var top = (y - p) / z2;
        var bottom = (y + 1 + p) / z2;
        var tile = { features: [] };
        this._addTileFeatures(tree.range((x - p) / z2, top, (x + 1 + p) / z2, bottom), tree.points, x, y, z2, tile);
        if (x === 0) {
            this._addTileFeatures(tree.range(1 - p / z2, top, 1, bottom), tree.points, z2, y, z2, tile);
        }
        if (x === z2 - 1) {
            this._addTileFeatures(tree.range(0, top, p / z2, bottom), tree.points, -1, y, z2, tile);
        }
        return tile.features.length ? tile : null;
    },
    getClusterExpansionZoom: function (clusterId) {
        var this$1 = this;
        var clusterZoom = clusterId % 32 - 1;
        while (clusterZoom < this.options.maxZoom) {
            var children = this$1.getChildren(clusterId);
            clusterZoom++;
            if (children.length !== 1) {
                break;
            }
            clusterId = children[0].properties.cluster_id;
        }
        return clusterZoom;
    },
    _appendLeaves: function (result, clusterId, limit, offset, skipped) {
        var this$1 = this;
        var children = this.getChildren(clusterId);
        for (var i = 0; i < children.length; i++) {
            var props = children[i].properties;
            if (props && props.cluster) {
                if (skipped + props.point_count <= offset) {
                    skipped += props.point_count;
                } else {
                    skipped = this$1._appendLeaves(result, props.cluster_id, limit, offset, skipped);
                }
            } else if (skipped < offset) {
                skipped++;
            } else {
                result.push(children[i]);
            }
            if (result.length === limit) {
                break;
            }
        }
        return skipped;
    },
    _addTileFeatures: function (ids, points, x, y, z2, tile) {
        var this$1 = this;
        for (var i = 0; i < ids.length; i++) {
            var c = points[ids[i]];
            var f = {
                type: 1,
                geometry: [[
                        Math.round(this$1.options.extent * (c.x * z2 - x)),
                        Math.round(this$1.options.extent * (c.y * z2 - y))
                    ]],
                tags: c.numPoints ? getClusterProperties(c) : this$1.points[c.index].properties
            };
            var id = c.numPoints ? c.id : this$1.points[c.index].id;
            if (id !== undefined) {
                f.id = id;
            }
            tile.features.push(f);
        }
    },
    _limitZoom: function (z) {
        return Math.max(this.options.minZoom, Math.min(z, this.options.maxZoom + 1));
    },
    _cluster: function (points, zoom) {
        var this$1 = this;
        var clusters = [];
        var r = this.options.radius / (this.options.extent * Math.pow(2, zoom));
        for (var i = 0; i < points.length; i++) {
            var p = points[i];
            if (p.zoom <= zoom) {
                continue;
            }
            p.zoom = zoom;
            var tree = this$1.trees[zoom + 1];
            var neighborIds = tree.within(p.x, p.y, r);
            var numPoints = p.numPoints || 1;
            var wx = p.x * numPoints;
            var wy = p.y * numPoints;
            var clusterProperties = null;
            if (this$1.options.reduce) {
                clusterProperties = this$1.options.initial();
                this$1._accumulate(clusterProperties, p);
            }
            var id = (i << 5) + (zoom + 1);
            for (var j = 0; j < neighborIds.length; j++) {
                var b = tree.points[neighborIds[j]];
                if (b.zoom <= zoom) {
                    continue;
                }
                b.zoom = zoom;
                var numPoints2 = b.numPoints || 1;
                wx += b.x * numPoints2;
                wy += b.y * numPoints2;
                numPoints += numPoints2;
                b.parentId = id;
                if (this$1.options.reduce) {
                    this$1._accumulate(clusterProperties, b);
                }
            }
            if (numPoints === 1) {
                clusters.push(p);
            } else {
                p.parentId = id;
                clusters.push(createCluster(wx / numPoints, wy / numPoints, id, numPoints, clusterProperties));
            }
        }
        return clusters;
    },
    _accumulate: function (clusterProperties, point) {
        var properties = point.numPoints ? point.properties : this.options.map(this.points[point.index].properties);
        this.options.reduce(clusterProperties, properties);
    }
};
function createCluster(x, y, id, numPoints, properties) {
    return {
        x: x,
        y: y,
        zoom: Infinity,
        id: id,
        parentId: -1,
        numPoints: numPoints,
        properties: properties
    };
}
function createPointCluster(p, id) {
    var coords = p.geometry.coordinates;
    return {
        x: lngX(coords[0]),
        y: latY(coords[1]),
        zoom: Infinity,
        index: id,
        parentId: -1
    };
}
function getClusterJSON(cluster) {
    return {
        type: 'Feature',
        id: cluster.id,
        properties: getClusterProperties(cluster),
        geometry: {
            type: 'Point',
            coordinates: [
                xLng(cluster.x),
                yLat(cluster.y)
            ]
        }
    };
}
function getClusterProperties(cluster) {
    var count = cluster.numPoints;
    var abbrev = count >= 10000 ? Math.round(count / 1000) + 'k' : count >= 1000 ? Math.round(count / 100) / 10 + 'k' : count;
    return extend(extend({}, cluster.properties), {
        cluster: true,
        cluster_id: cluster.id,
        point_count: count,
        point_count_abbreviated: abbrev
    });
}
function lngX(lng) {
    return lng / 360 + 0.5;
}
function latY(lat) {
    var sin = Math.sin(lat * Math.PI / 180), y = 0.5 - 0.25 * Math.log((1 + sin) / (1 - sin)) / Math.PI;
    return y < 0 ? 0 : y > 1 ? 1 : y;
}
function xLng(x) {
    return (x - 0.5) * 360;
}
function yLat(y) {
    var y2 = (180 - y * 360) * Math.PI / 180;
    return 360 * Math.atan(Math.exp(y2)) / Math.PI - 90;
}
function extend(dest, src) {
    for (var id in src) {
        dest[id] = src[id];
    }
    return dest;
}
function getX(p) {
    return p.x;
}
function getY(p) {
    return p.y;
}

function simplify(coords, first, last, sqTolerance) {
    var maxSqDist = sqTolerance;
    var mid = last - first >> 1;
    var minPosToMid = last - first;
    var index;
    var ax = coords[first];
    var ay = coords[first + 1];
    var bx = coords[last];
    var by = coords[last + 1];
    for (var i = first + 3; i < last; i += 3) {
        var d = getSqSegDist(coords[i], coords[i + 1], ax, ay, bx, by);
        if (d > maxSqDist) {
            index = i;
            maxSqDist = d;
        } else if (d === maxSqDist) {
            var posToMid = Math.abs(i - mid);
            if (posToMid < minPosToMid) {
                index = i;
                minPosToMid = posToMid;
            }
        }
    }
    if (maxSqDist > sqTolerance) {
        if (index - first > 3) {
            simplify(coords, first, index, sqTolerance);
        }
        coords[index + 2] = maxSqDist;
        if (last - index > 3) {
            simplify(coords, index, last, sqTolerance);
        }
    }
}
function getSqSegDist(px, py, x, y, bx, by) {
    var dx = bx - x;
    var dy = by - y;
    if (dx !== 0 || dy !== 0) {
        var t = ((px - x) * dx + (py - y) * dy) / (dx * dx + dy * dy);
        if (t > 1) {
            x = bx;
            y = by;
        } else if (t > 0) {
            x += dx * t;
            y += dy * t;
        }
    }
    dx = px - x;
    dy = py - y;
    return dx * dx + dy * dy;
}

function createFeature(id, type, geom, tags) {
    var feature = {
        id: typeof id === 'undefined' ? null : id,
        type: type,
        geometry: geom,
        tags: tags,
        minX: Infinity,
        minY: Infinity,
        maxX: -Infinity,
        maxY: -Infinity
    };
    calcBBox(feature);
    return feature;
}
function calcBBox(feature) {
    var geom = feature.geometry;
    var type = feature.type;
    if (type === 'Point' || type === 'MultiPoint' || type === 'LineString') {
        calcLineBBox(feature, geom);
    } else if (type === 'Polygon' || type === 'MultiLineString') {
        for (var i = 0; i < geom.length; i++) {
            calcLineBBox(feature, geom[i]);
        }
    } else if (type === 'MultiPolygon') {
        for (i = 0; i < geom.length; i++) {
            for (var j = 0; j < geom[i].length; j++) {
                calcLineBBox(feature, geom[i][j]);
            }
        }
    }
}
function calcLineBBox(feature, geom) {
    for (var i = 0; i < geom.length; i += 3) {
        feature.minX = Math.min(feature.minX, geom[i]);
        feature.minY = Math.min(feature.minY, geom[i + 1]);
        feature.maxX = Math.max(feature.maxX, geom[i]);
        feature.maxY = Math.max(feature.maxY, geom[i + 1]);
    }
}

function convert(data, options) {
    var features = [];
    if (data.type === 'FeatureCollection') {
        for (var i = 0; i < data.features.length; i++) {
            convertFeature(features, data.features[i], options, i);
        }
    } else if (data.type === 'Feature') {
        convertFeature(features, data, options);
    } else {
        convertFeature(features, { geometry: data }, options);
    }
    return features;
}
function convertFeature(features, geojson, options, index) {
    if (!geojson.geometry) {
        return;
    }
    var coords = geojson.geometry.coordinates;
    var type = geojson.geometry.type;
    var tolerance = Math.pow(options.tolerance / ((1 << options.maxZoom) * options.extent), 2);
    var geometry = [];
    var id = geojson.id;
    if (options.promoteId) {
        id = geojson.properties[options.promoteId];
    } else if (options.generateId) {
        id = index || 0;
    }
    if (type === 'Point') {
        convertPoint(coords, geometry);
    } else if (type === 'MultiPoint') {
        for (var i = 0; i < coords.length; i++) {
            convertPoint(coords[i], geometry);
        }
    } else if (type === 'LineString') {
        convertLine(coords, geometry, tolerance, false);
    } else if (type === 'MultiLineString') {
        if (options.lineMetrics) {
            for (i = 0; i < coords.length; i++) {
                geometry = [];
                convertLine(coords[i], geometry, tolerance, false);
                features.push(createFeature(id, 'LineString', geometry, geojson.properties));
            }
            return;
        } else {
            convertLines(coords, geometry, tolerance, false);
        }
    } else if (type === 'Polygon') {
        convertLines(coords, geometry, tolerance, true);
    } else if (type === 'MultiPolygon') {
        for (i = 0; i < coords.length; i++) {
            var polygon = [];
            convertLines(coords[i], polygon, tolerance, true);
            geometry.push(polygon);
        }
    } else if (type === 'GeometryCollection') {
        for (i = 0; i < geojson.geometry.geometries.length; i++) {
            convertFeature(features, {
                id: id,
                geometry: geojson.geometry.geometries[i],
                properties: geojson.properties
            }, options, index);
        }
        return;
    } else {
        throw new Error('Input data is not a valid GeoJSON object.');
    }
    features.push(createFeature(id, type, geometry, geojson.properties));
}
function convertPoint(coords, out) {
    out.push(projectX(coords[0]));
    out.push(projectY(coords[1]));
    out.push(0);
}
function convertLine(ring, out, tolerance, isPolygon) {
    var x0, y0;
    var size = 0;
    for (var j = 0; j < ring.length; j++) {
        var x = projectX(ring[j][0]);
        var y = projectY(ring[j][1]);
        out.push(x);
        out.push(y);
        out.push(0);
        if (j > 0) {
            if (isPolygon) {
                size += (x0 * y - x * y0) / 2;
            } else {
                size += Math.sqrt(Math.pow(x - x0, 2) + Math.pow(y - y0, 2));
            }
        }
        x0 = x;
        y0 = y;
    }
    var last = out.length - 3;
    out[2] = 1;
    simplify(out, 0, last, tolerance);
    out[last + 2] = 1;
    out.size = Math.abs(size);
    out.start = 0;
    out.end = out.size;
}
function convertLines(rings, out, tolerance, isPolygon) {
    for (var i = 0; i < rings.length; i++) {
        var geom = [];
        convertLine(rings[i], geom, tolerance, isPolygon);
        out.push(geom);
    }
}
function projectX(x) {
    return x / 360 + 0.5;
}
function projectY(y) {
    var sin = Math.sin(y * Math.PI / 180);
    var y2 = 0.5 - 0.25 * Math.log((1 + sin) / (1 - sin)) / Math.PI;
    return y2 < 0 ? 0 : y2 > 1 ? 1 : y2;
}

function clip(features, scale, k1, k2, axis, minAll, maxAll, options) {
    k1 /= scale;
    k2 /= scale;
    if (minAll >= k1 && maxAll < k2) {
        return features;
    } else if (maxAll < k1 || minAll >= k2) {
        return null;
    }
    var clipped = [];
    for (var i = 0; i < features.length; i++) {
        var feature = features[i];
        var geometry = feature.geometry;
        var type = feature.type;
        var min = axis === 0 ? feature.minX : feature.minY;
        var max = axis === 0 ? feature.maxX : feature.maxY;
        if (min >= k1 && max < k2) {
            clipped.push(feature);
            continue;
        } else if (max < k1 || min >= k2) {
            continue;
        }
        var newGeometry = [];
        if (type === 'Point' || type === 'MultiPoint') {
            clipPoints(geometry, newGeometry, k1, k2, axis);
        } else if (type === 'LineString') {
            clipLine$1(geometry, newGeometry, k1, k2, axis, false, options.lineMetrics);
        } else if (type === 'MultiLineString') {
            clipLines(geometry, newGeometry, k1, k2, axis, false);
        } else if (type === 'Polygon') {
            clipLines(geometry, newGeometry, k1, k2, axis, true);
        } else if (type === 'MultiPolygon') {
            for (var j = 0; j < geometry.length; j++) {
                var polygon = [];
                clipLines(geometry[j], polygon, k1, k2, axis, true);
                if (polygon.length) {
                    newGeometry.push(polygon);
                }
            }
        }
        if (newGeometry.length) {
            if (options.lineMetrics && type === 'LineString') {
                for (j = 0; j < newGeometry.length; j++) {
                    clipped.push(createFeature(feature.id, type, newGeometry[j], feature.tags));
                }
                continue;
            }
            if (type === 'LineString' || type === 'MultiLineString') {
                if (newGeometry.length === 1) {
                    type = 'LineString';
                    newGeometry = newGeometry[0];
                } else {
                    type = 'MultiLineString';
                }
            }
            if (type === 'Point' || type === 'MultiPoint') {
                type = newGeometry.length === 3 ? 'Point' : 'MultiPoint';
            }
            clipped.push(createFeature(feature.id, type, newGeometry, feature.tags));
        }
    }
    return clipped.length ? clipped : null;
}
function clipPoints(geom, newGeom, k1, k2, axis) {
    for (var i = 0; i < geom.length; i += 3) {
        var a = geom[i + axis];
        if (a >= k1 && a <= k2) {
            newGeom.push(geom[i]);
            newGeom.push(geom[i + 1]);
            newGeom.push(geom[i + 2]);
        }
    }
}
function clipLine$1(geom, newGeom, k1, k2, axis, isPolygon, trackMetrics) {
    var slice = newSlice(geom);
    var intersect = axis === 0 ? intersectX : intersectY;
    var len = geom.start;
    var segLen, t;
    for (var i = 0; i < geom.length - 3; i += 3) {
        var ax = geom[i];
        var ay = geom[i + 1];
        var az = geom[i + 2];
        var bx = geom[i + 3];
        var by = geom[i + 4];
        var a = axis === 0 ? ax : ay;
        var b = axis === 0 ? bx : by;
        var exited = false;
        if (trackMetrics) {
            segLen = Math.sqrt(Math.pow(ax - bx, 2) + Math.pow(ay - by, 2));
        }
        if (a < k1) {
            if (b >= k1) {
                t = intersect(slice, ax, ay, bx, by, k1);
                if (trackMetrics) {
                    slice.start = len + segLen * t;
                }
            }
        } else if (a >= k2) {
            if (b < k2) {
                t = intersect(slice, ax, ay, bx, by, k2);
                if (trackMetrics) {
                    slice.start = len + segLen * t;
                }
            }
        } else {
            addPoint(slice, ax, ay, az);
        }
        if (b < k1 && a >= k1) {
            t = intersect(slice, ax, ay, bx, by, k1);
            exited = true;
        }
        if (b > k2 && a <= k2) {
            t = intersect(slice, ax, ay, bx, by, k2);
            exited = true;
        }
        if (!isPolygon && exited) {
            if (trackMetrics) {
                slice.end = len + segLen * t;
            }
            newGeom.push(slice);
            slice = newSlice(geom);
        }
        if (trackMetrics) {
            len += segLen;
        }
    }
    var last = geom.length - 3;
    ax = geom[last];
    ay = geom[last + 1];
    az = geom[last + 2];
    a = axis === 0 ? ax : ay;
    if (a >= k1 && a <= k2) {
        addPoint(slice, ax, ay, az);
    }
    last = slice.length - 3;
    if (isPolygon && last >= 3 && (slice[last] !== slice[0] || slice[last + 1] !== slice[1])) {
        addPoint(slice, slice[0], slice[1], slice[2]);
    }
    if (slice.length) {
        newGeom.push(slice);
    }
}
function newSlice(line) {
    var slice = [];
    slice.size = line.size;
    slice.start = line.start;
    slice.end = line.end;
    return slice;
}
function clipLines(geom, newGeom, k1, k2, axis, isPolygon) {
    for (var i = 0; i < geom.length; i++) {
        clipLine$1(geom[i], newGeom, k1, k2, axis, isPolygon, false);
    }
}
function addPoint(out, x, y, z) {
    out.push(x);
    out.push(y);
    out.push(z);
}
function intersectX(out, ax, ay, bx, by, x) {
    var t = (x - ax) / (bx - ax);
    out.push(x);
    out.push(ay + (by - ay) * t);
    out.push(1);
    return t;
}
function intersectY(out, ax, ay, bx, by, y) {
    var t = (y - ay) / (by - ay);
    out.push(ax + (bx - ax) * t);
    out.push(y);
    out.push(1);
    return t;
}

function wrap(features, options) {
    var buffer = options.buffer / options.extent;
    var merged = features;
    var left = clip(features, 1, -1 - buffer, buffer, 0, -1, 2, options);
    var right = clip(features, 1, 1 - buffer, 2 + buffer, 0, -1, 2, options);
    if (left || right) {
        merged = clip(features, 1, -buffer, 1 + buffer, 0, -1, 2, options) || [];
        if (left) {
            merged = shiftFeatureCoords(left, 1).concat(merged);
        }
        if (right) {
            merged = merged.concat(shiftFeatureCoords(right, -1));
        }
    }
    return merged;
}
function shiftFeatureCoords(features, offset) {
    var newFeatures = [];
    for (var i = 0; i < features.length; i++) {
        var feature = features[i], type = feature.type;
        var newGeometry;
        if (type === 'Point' || type === 'MultiPoint' || type === 'LineString') {
            newGeometry = shiftCoords(feature.geometry, offset);
        } else if (type === 'MultiLineString' || type === 'Polygon') {
            newGeometry = [];
            for (var j = 0; j < feature.geometry.length; j++) {
                newGeometry.push(shiftCoords(feature.geometry[j], offset));
            }
        } else if (type === 'MultiPolygon') {
            newGeometry = [];
            for (j = 0; j < feature.geometry.length; j++) {
                var newPolygon = [];
                for (var k = 0; k < feature.geometry[j].length; k++) {
                    newPolygon.push(shiftCoords(feature.geometry[j][k], offset));
                }
                newGeometry.push(newPolygon);
            }
        }
        newFeatures.push(createFeature(feature.id, type, newGeometry, feature.tags));
    }
    return newFeatures;
}
function shiftCoords(points, offset) {
    var newPoints = [];
    newPoints.size = points.size;
    if (points.start !== undefined) {
        newPoints.start = points.start;
        newPoints.end = points.end;
    }
    for (var i = 0; i < points.length; i += 3) {
        newPoints.push(points[i] + offset, points[i + 1], points[i + 2]);
    }
    return newPoints;
}

function transformTile(tile, extent) {
    if (tile.transformed) {
        return tile;
    }
    var z2 = 1 << tile.z, tx = tile.x, ty = tile.y, i, j, k;
    for (i = 0; i < tile.features.length; i++) {
        var feature = tile.features[i], geom = feature.geometry, type = feature.type;
        feature.geometry = [];
        if (type === 1) {
            for (j = 0; j < geom.length; j += 2) {
                feature.geometry.push(transformPoint(geom[j], geom[j + 1], extent, z2, tx, ty));
            }
        } else {
            for (j = 0; j < geom.length; j++) {
                var ring = [];
                for (k = 0; k < geom[j].length; k += 2) {
                    ring.push(transformPoint(geom[j][k], geom[j][k + 1], extent, z2, tx, ty));
                }
                feature.geometry.push(ring);
            }
        }
    }
    tile.transformed = true;
    return tile;
}
function transformPoint(x, y, extent, z2, tx, ty) {
    return [
        Math.round(extent * (x * z2 - tx)),
        Math.round(extent * (y * z2 - ty))
    ];
}

function createTile(features, z, tx, ty, options) {
    var tolerance = z === options.maxZoom ? 0 : options.tolerance / ((1 << z) * options.extent);
    var tile = {
        features: [],
        numPoints: 0,
        numSimplified: 0,
        numFeatures: 0,
        source: null,
        x: tx,
        y: ty,
        z: z,
        transformed: false,
        minX: 2,
        minY: 1,
        maxX: -1,
        maxY: 0
    };
    for (var i = 0; i < features.length; i++) {
        tile.numFeatures++;
        addFeature$1(tile, features[i], tolerance, options);
        var minX = features[i].minX;
        var minY = features[i].minY;
        var maxX = features[i].maxX;
        var maxY = features[i].maxY;
        if (minX < tile.minX) {
            tile.minX = minX;
        }
        if (minY < tile.minY) {
            tile.minY = minY;
        }
        if (maxX > tile.maxX) {
            tile.maxX = maxX;
        }
        if (maxY > tile.maxY) {
            tile.maxY = maxY;
        }
    }
    return tile;
}
function addFeature$1(tile, feature, tolerance, options) {
    var geom = feature.geometry, type = feature.type, simplified = [];
    if (type === 'Point' || type === 'MultiPoint') {
        for (var i = 0; i < geom.length; i += 3) {
            simplified.push(geom[i]);
            simplified.push(geom[i + 1]);
            tile.numPoints++;
            tile.numSimplified++;
        }
    } else if (type === 'LineString') {
        addLine(simplified, geom, tile, tolerance, false, false);
    } else if (type === 'MultiLineString' || type === 'Polygon') {
        for (i = 0; i < geom.length; i++) {
            addLine(simplified, geom[i], tile, tolerance, type === 'Polygon', i === 0);
        }
    } else if (type === 'MultiPolygon') {
        for (var k = 0; k < geom.length; k++) {
            var polygon = geom[k];
            for (i = 0; i < polygon.length; i++) {
                addLine(simplified, polygon[i], tile, tolerance, true, i === 0);
            }
        }
    }
    if (simplified.length) {
        var tags = feature.tags || null;
        if (type === 'LineString' && options.lineMetrics) {
            tags = {};
            for (var key in feature.tags) {
                tags[key] = feature.tags[key];
            }
            tags['mapbox_clip_start'] = geom.start / geom.size;
            tags['mapbox_clip_end'] = geom.end / geom.size;
        }
        var tileFeature = {
            geometry: simplified,
            type: type === 'Polygon' || type === 'MultiPolygon' ? 3 : type === 'LineString' || type === 'MultiLineString' ? 2 : 1,
            tags: tags
        };
        if (feature.id !== null) {
            tileFeature.id = feature.id;
        }
        tile.features.push(tileFeature);
    }
}
function addLine(result, geom, tile, tolerance, isPolygon, isOuter) {
    var sqTolerance = tolerance * tolerance;
    if (tolerance > 0 && geom.size < (isPolygon ? sqTolerance : tolerance)) {
        tile.numPoints += geom.length / 3;
        return;
    }
    var ring = [];
    for (var i = 0; i < geom.length; i += 3) {
        if (tolerance === 0 || geom[i + 2] > sqTolerance) {
            tile.numSimplified++;
            ring.push(geom[i]);
            ring.push(geom[i + 1]);
        }
        tile.numPoints++;
    }
    if (isPolygon) {
        rewind$1(ring, isOuter);
    }
    result.push(ring);
}
function rewind$1(ring, clockwise) {
    var area = 0;
    for (var i = 0, len = ring.length, j = len - 2; i < len; j = i, i += 2) {
        area += (ring[i] - ring[j]) * (ring[i + 1] + ring[j + 1]);
    }
    if (area > 0 === clockwise) {
        for (i = 0, len = ring.length; i < len / 2; i += 2) {
            var x = ring[i];
            var y = ring[i + 1];
            ring[i] = ring[len - 2 - i];
            ring[i + 1] = ring[len - 1 - i];
            ring[len - 2 - i] = x;
            ring[len - 1 - i] = y;
        }
    }
}

function geojsonvt(data, options) {
    return new GeoJSONVT(data, options);
}
function GeoJSONVT(data, options) {
    options = this.options = extend$1(Object.create(this.options), options);
    var debug = options.debug;
    if (debug) {
        console.time('preprocess data');
    }
    if (options.maxZoom < 0 || options.maxZoom > 24) {
        throw new Error('maxZoom should be in the 0-24 range');
    }
    if (options.promoteId && options.generateId) {
        throw new Error('promoteId and generateId cannot be used together.');
    }
    var features = convert(data, options);
    this.tiles = {};
    this.tileCoords = [];
    if (debug) {
        console.timeEnd('preprocess data');
        console.log('index: maxZoom: %d, maxPoints: %d', options.indexMaxZoom, options.indexMaxPoints);
        console.time('generate tiles');
        this.stats = {};
        this.total = 0;
    }
    features = wrap(features, options);
    if (features.length) {
        this.splitTile(features, 0, 0, 0);
    }
    if (debug) {
        if (features.length) {
            console.log('features: %d, points: %d', this.tiles[0].numFeatures, this.tiles[0].numPoints);
        }
        console.timeEnd('generate tiles');
        console.log('tiles generated:', this.total, JSON.stringify(this.stats));
    }
}
GeoJSONVT.prototype.options = {
    maxZoom: 14,
    indexMaxZoom: 5,
    indexMaxPoints: 100000,
    tolerance: 3,
    extent: 4096,
    buffer: 64,
    lineMetrics: false,
    promoteId: null,
    generateId: false,
    debug: 0
};
GeoJSONVT.prototype.splitTile = function (features, z, x, y, cz, cx, cy) {
    var this$1 = this;
    var stack = [
            features,
            z,
            x,
            y
        ], options = this.options, debug = options.debug;
    while (stack.length) {
        y = stack.pop();
        x = stack.pop();
        z = stack.pop();
        features = stack.pop();
        var z2 = 1 << z, id = toID(z, x, y), tile = this$1.tiles[id];
        if (!tile) {
            if (debug > 1) {
                console.time('creation');
            }
            tile = this$1.tiles[id] = createTile(features, z, x, y, options);
            this$1.tileCoords.push({
                z: z,
                x: x,
                y: y
            });
            if (debug) {
                if (debug > 1) {
                    console.log('tile z%d-%d-%d (features: %d, points: %d, simplified: %d)', z, x, y, tile.numFeatures, tile.numPoints, tile.numSimplified);
                    console.timeEnd('creation');
                }
                var key = 'z' + z;
                this$1.stats[key] = (this$1.stats[key] || 0) + 1;
                this$1.total++;
            }
        }
        tile.source = features;
        if (!cz) {
            if (z === options.indexMaxZoom || tile.numPoints <= options.indexMaxPoints) {
                continue;
            }
        } else {
            if (z === options.maxZoom || z === cz) {
                continue;
            }
            var m = 1 << cz - z;
            if (x !== Math.floor(cx / m) || y !== Math.floor(cy / m)) {
                continue;
            }
        }
        tile.source = null;
        if (features.length === 0) {
            continue;
        }
        if (debug > 1) {
            console.time('clipping');
        }
        var k1 = 0.5 * options.buffer / options.extent, k2 = 0.5 - k1, k3 = 0.5 + k1, k4 = 1 + k1, tl, bl, tr, br, left, right;
        tl = bl = tr = br = null;
        left = clip(features, z2, x - k1, x + k3, 0, tile.minX, tile.maxX, options);
        right = clip(features, z2, x + k2, x + k4, 0, tile.minX, tile.maxX, options);
        features = null;
        if (left) {
            tl = clip(left, z2, y - k1, y + k3, 1, tile.minY, tile.maxY, options);
            bl = clip(left, z2, y + k2, y + k4, 1, tile.minY, tile.maxY, options);
            left = null;
        }
        if (right) {
            tr = clip(right, z2, y - k1, y + k3, 1, tile.minY, tile.maxY, options);
            br = clip(right, z2, y + k2, y + k4, 1, tile.minY, tile.maxY, options);
            right = null;
        }
        if (debug > 1) {
            console.timeEnd('clipping');
        }
        stack.push(tl || [], z + 1, x * 2, y * 2);
        stack.push(bl || [], z + 1, x * 2, y * 2 + 1);
        stack.push(tr || [], z + 1, x * 2 + 1, y * 2);
        stack.push(br || [], z + 1, x * 2 + 1, y * 2 + 1);
    }
};
GeoJSONVT.prototype.getTile = function (z, x, y) {
    var this$1 = this;
    var options = this.options, extent = options.extent, debug = options.debug;
    if (z < 0 || z > 24) {
        return null;
    }
    var z2 = 1 << z;
    x = (x % z2 + z2) % z2;
    var id = toID(z, x, y);
    if (this.tiles[id]) {
        return transformTile(this.tiles[id], extent);
    }
    if (debug > 1) {
        console.log('drilling down to z%d-%d-%d', z, x, y);
    }
    var z0 = z, x0 = x, y0 = y, parent;
    while (!parent && z0 > 0) {
        z0--;
        x0 = Math.floor(x0 / 2);
        y0 = Math.floor(y0 / 2);
        parent = this$1.tiles[toID(z0, x0, y0)];
    }
    if (!parent || !parent.source) {
        return null;
    }
    if (debug > 1) {
        console.log('found parent tile z%d-%d-%d', z0, x0, y0);
    }
    if (debug > 1) {
        console.time('drilling down');
    }
    this.splitTile(parent.source, z0, x0, y0, z, x, y);
    if (debug > 1) {
        console.timeEnd('drilling down');
    }
    return this.tiles[id] ? transformTile(this.tiles[id], extent) : null;
};
function toID(z, x, y) {
    return ((1 << z) * y + x) * 32 + z;
}
function extend$1(dest, src) {
    for (var i in src) {
        dest[i] = src[i];
    }
    return dest;
}

function loadGeoJSONTile(params, callback) {
    var canonical = params.tileID.canonical;
    if (!this._geoJSONIndex) {
        return callback(null, null);
    }
    var geoJSONTile = this._geoJSONIndex.getTile(canonical.z, canonical.x, canonical.y);
    if (!geoJSONTile) {
        return callback(null, null);
    }
    var geojsonWrapper = new GeoJSONWrapper(geoJSONTile.features);
    var pbf = vtPbf(geojsonWrapper);
    if (pbf.byteOffset !== 0 || pbf.byteLength !== pbf.buffer.byteLength) {
        pbf = new Uint8Array(pbf);
    }
    callback(null, {
        vectorTile: geojsonWrapper,
        rawData: pbf.buffer
    });
}
var GeoJSONWorkerSource = function (VectorTileWorkerSource$$1) {
    function GeoJSONWorkerSource(actor, layerIndex, loadGeoJSON) {
        VectorTileWorkerSource$$1.call(this, actor, layerIndex, loadGeoJSONTile);
        if (loadGeoJSON) {
            this.loadGeoJSON = loadGeoJSON;
        }
    }
    if (VectorTileWorkerSource$$1)
        GeoJSONWorkerSource.__proto__ = VectorTileWorkerSource$$1;
    GeoJSONWorkerSource.prototype = Object.create(VectorTileWorkerSource$$1 && VectorTileWorkerSource$$1.prototype);
    GeoJSONWorkerSource.prototype.constructor = GeoJSONWorkerSource;
    GeoJSONWorkerSource.prototype.loadData = function loadData(params, callback) {
        if (this._pendingCallback) {
            this._pendingCallback(null, { abandoned: true });
        }
        this._pendingCallback = callback;
        this._pendingLoadDataParams = params;
        if (this._state && this._state !== 'Idle') {
            this._state = 'NeedsLoadData';
        } else {
            this._state = 'Coalescing';
            this._loadData();
        }
    };
    GeoJSONWorkerSource.prototype._loadData = function _loadData() {
        var this$1 = this;
        if (!this._pendingCallback || !this._pendingLoadDataParams) {
            return;
        }
        var callback = this._pendingCallback;
        var params = this._pendingLoadDataParams;
        delete this._pendingCallback;
        delete this._pendingLoadDataParams;
        var perf = params && params.request && params.request.collectResourceTiming ? new wrapper.Performance(params.request) : false;
        this.loadGeoJSON(params, function (err, data) {
            if (err || !data) {
                return callback(err);
            } else if (typeof data !== 'object') {
                return callback(new Error('Input data is not a valid GeoJSON object.'));
            } else {
                geojsonRewind(data, true);
                try {
                    this$1._geoJSONIndex = params.cluster ? supercluster(params.superclusterOptions).load(data.features) : geojsonvt(data, params.geojsonVtOptions);
                } catch (err) {
                    return callback(err);
                }
                this$1.loaded = {};
                var result = {};
                if (perf) {
                    var resourceTimingData = perf.finish();
                    if (resourceTimingData) {
                        result.resourceTiming = {};
                        result.resourceTiming[params.source] = JSON.parse(JSON.stringify(resourceTimingData));
                    }
                }
                callback(null, result);
            }
        });
    };
    GeoJSONWorkerSource.prototype.coalesce = function coalesce() {
        if (this._state === 'Coalescing') {
            this._state = 'Idle';
        } else if (this._state === 'NeedsLoadData') {
            this._state = 'Coalescing';
            this._loadData();
        }
    };
    GeoJSONWorkerSource.prototype.reloadTile = function reloadTile(params, callback) {
        var loaded = this.loaded, uid = params.uid;
        if (loaded && loaded[uid]) {
            return VectorTileWorkerSource$$1.prototype.reloadTile.call(this, params, callback);
        } else {
            return this.loadTile(params, callback);
        }
    };
    GeoJSONWorkerSource.prototype.loadGeoJSON = function loadGeoJSON(params, callback) {
        if (params.request) {
            __chunk_1.getJSON(params.request, callback);
        } else if (typeof params.data === 'string') {
            try {
                return callback(null, JSON.parse(params.data));
            } catch (e) {
                return callback(new Error('Input data is not a valid GeoJSON object.'));
            }
        } else {
            return callback(new Error('Input data is not a valid GeoJSON object.'));
        }
    };
    GeoJSONWorkerSource.prototype.removeSource = function removeSource(params, callback) {
        if (this._pendingCallback) {
            this._pendingCallback(null, { abandoned: true });
        }
        callback();
    };
    GeoJSONWorkerSource.prototype.getClusterExpansionZoom = function getClusterExpansionZoom(params, callback) {
        callback(null, this._geoJSONIndex.getClusterExpansionZoom(params.clusterId));
    };
    GeoJSONWorkerSource.prototype.getClusterChildren = function getClusterChildren(params, callback) {
        callback(null, this._geoJSONIndex.getChildren(params.clusterId));
    };
    GeoJSONWorkerSource.prototype.getClusterLeaves = function getClusterLeaves(params, callback) {
        callback(null, this._geoJSONIndex.getLeaves(params.clusterId, params.limit, params.offset));
    };
    return GeoJSONWorkerSource;
}(VectorTileWorkerSource);

var Worker$1 = function Worker(self) {
    var this$1 = this;
    this.self = self;
    this.actor = new __chunk_1.Actor(self, this);
    this.layerIndexes = {};
    this.workerSourceTypes = {
        vector: VectorTileWorkerSource,
        geojson: GeoJSONWorkerSource
    };
    this.workerSources = {};
    this.demWorkerSources = {};
    this.self.registerWorkerSource = function (name, WorkerSource) {
        if (this$1.workerSourceTypes[name]) {
            throw new Error('Worker source with name "' + name + '" already registered.');
        }
        this$1.workerSourceTypes[name] = WorkerSource;
    };
    this.self.registerRTLTextPlugin = function (rtlTextPlugin) {
        if (__chunk_1.plugin.isLoaded()) {
            throw new Error('RTL text plugin already registered.');
        }
        __chunk_1.plugin['applyArabicShaping'] = rtlTextPlugin.applyArabicShaping;
        __chunk_1.plugin['processBidirectionalText'] = rtlTextPlugin.processBidirectionalText;
        __chunk_1.plugin['processStyledBidirectionalText'] = rtlTextPlugin.processStyledBidirectionalText;
    };
};
Worker$1.prototype.setReferrer = function setReferrer(mapID, referrer) {
    this.referrer = referrer;
};
Worker$1.prototype.setLayers = function setLayers(mapId, layers, callback) {
    this.getLayerIndex(mapId).replace(layers);
    callback();
};
Worker$1.prototype.updateLayers = function updateLayers(mapId, params, callback) {
    this.getLayerIndex(mapId).update(params.layers, params.removedIds);
    callback();
};
Worker$1.prototype.loadTile = function loadTile(mapId, params, callback) {
    this.getWorkerSource(mapId, params.type, params.source).loadTile(params, callback);
};
Worker$1.prototype.loadDEMTile = function loadDEMTile(mapId, params, callback) {
    this.getDEMWorkerSource(mapId, params.source).loadTile(params, callback);
};
Worker$1.prototype.reloadTile = function reloadTile(mapId, params, callback) {
    this.getWorkerSource(mapId, params.type, params.source).reloadTile(params, callback);
};
Worker$1.prototype.abortTile = function abortTile(mapId, params, callback) {
    this.getWorkerSource(mapId, params.type, params.source).abortTile(params, callback);
};
Worker$1.prototype.removeTile = function removeTile(mapId, params, callback) {
    this.getWorkerSource(mapId, params.type, params.source).removeTile(params, callback);
};
Worker$1.prototype.removeDEMTile = function removeDEMTile(mapId, params) {
    this.getDEMWorkerSource(mapId, params.source).removeTile(params);
};
Worker$1.prototype.removeSource = function removeSource(mapId, params, callback) {
    if (!this.workerSources[mapId] || !this.workerSources[mapId][params.type] || !this.workerSources[mapId][params.type][params.source]) {
        return;
    }
    var worker = this.workerSources[mapId][params.type][params.source];
    delete this.workerSources[mapId][params.type][params.source];
    if (worker.removeSource !== undefined) {
        worker.removeSource(params, callback);
    } else {
        callback();
    }
};
Worker$1.prototype.loadWorkerSource = function loadWorkerSource(map, params, callback) {
    try {
        this.self.importScripts(params.url);
        callback();
    } catch (e) {
        callback(e.toString());
    }
};
Worker$1.prototype.loadRTLTextPlugin = function loadRTLTextPlugin(map, pluginURL, callback) {
    try {
        if (!__chunk_1.plugin.isLoaded()) {
            this.self.importScripts(pluginURL);
            callback(__chunk_1.plugin.isLoaded() ? null : new Error('RTL Text Plugin failed to import scripts from ' + pluginURL));
        }
    } catch (e) {
        callback(e.toString());
    }
};
Worker$1.prototype.getLayerIndex = function getLayerIndex(mapId) {
    var layerIndexes = this.layerIndexes[mapId];
    if (!layerIndexes) {
        layerIndexes = this.layerIndexes[mapId] = new StyleLayerIndex();
    }
    return layerIndexes;
};
Worker$1.prototype.getWorkerSource = function getWorkerSource(mapId, type, source) {
    var this$1 = this;
    if (!this.workerSources[mapId]) {
        this.workerSources[mapId] = {};
    }
    if (!this.workerSources[mapId][type]) {
        this.workerSources[mapId][type] = {};
    }
    if (!this.workerSources[mapId][type][source]) {
        var actor = {
            send: function (type, data, callback) {
                this$1.actor.send(type, data, callback, mapId);
            }
        };
        this.workerSources[mapId][type][source] = new this.workerSourceTypes[type](actor, this.getLayerIndex(mapId));
    }
    return this.workerSources[mapId][type][source];
};
Worker$1.prototype.getDEMWorkerSource = function getDEMWorkerSource(mapId, source) {
    if (!this.demWorkerSources[mapId]) {
        this.demWorkerSources[mapId] = {};
    }
    if (!this.demWorkerSources[mapId][source]) {
        this.demWorkerSources[mapId][source] = new RasterDEMTileWorkerSource();
    }
    return this.demWorkerSources[mapId][source];
};
if (typeof WorkerGlobalScope !== 'undefined' && typeof self !== 'undefined' && self instanceof WorkerGlobalScope) {
    self.worker = new Worker$1(self);
}

return Worker$1;

});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2VyLmpzIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvc3R5bGUtc3BlYy9ncm91cF9ieV9sYXlvdXQuanMiLCIuLi8uLi8uLi9zcmMvc3R5bGUvc3R5bGVfbGF5ZXJfaW5kZXguanMiLCIuLi8uLi8uLi9zcmMvc3ltYm9sL2NoZWNrX21heF9hbmdsZS5qcyIsIi4uLy4uLy4uL3NyYy9zeW1ib2wvZ2V0X2FuY2hvcnMuanMiLCIuLi8uLi8uLi9zcmMvc3ltYm9sL2NsaXBfbGluZS5qcyIsIi4uLy4uLy4uL3NyYy9zeW1ib2wvcXVhZHMuanMiLCIuLi8uLi8uLi9zcmMvc3ltYm9sL2NvbGxpc2lvbl9mZWF0dXJlLmpzIiwiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL3RpbnlxdWV1ZS9pbmRleC5qcyIsIi4uLy4uLy4uL3NyYy91dGlsL2ZpbmRfcG9sZV9vZl9pbmFjY2Vzc2liaWxpdHkuanMiLCIuLi8uLi8uLi9ub2RlX21vZHVsZXMvbXVybXVyaGFzaC1qcy9tdXJtdXJoYXNoM19nYy5qcyIsIi4uLy4uLy4uL25vZGVfbW9kdWxlcy9tdXJtdXJoYXNoLWpzL211cm11cmhhc2gyX2djLmpzIiwiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL211cm11cmhhc2gtanMvaW5kZXguanMiLCIuLi8uLi8uLi9zcmMvc3ltYm9sL3N5bWJvbF9sYXlvdXQuanMiLCIuLi8uLi8uLi9zcmMvcmVuZGVyL2dseXBoX2F0bGFzLmpzIiwiLi4vLi4vLi4vc3JjL3NvdXJjZS93b3JrZXJfdGlsZS5qcyIsIi4uLy4uLy4uL3NyYy91dGlsL3BlcmZvcm1hbmNlLmpzIiwiLi4vLi4vLi4vc3JjL3NvdXJjZS92ZWN0b3JfdGlsZV93b3JrZXJfc291cmNlLmpzIiwiLi4vLi4vLi4vc3JjL3NvdXJjZS9yYXN0ZXJfZGVtX3RpbGVfd29ya2VyX3NvdXJjZS5qcyIsIi4uLy4uLy4uL25vZGVfbW9kdWxlcy93Z3M4NC9pbmRleC5qcyIsIi4uLy4uLy4uL25vZGVfbW9kdWxlcy9AbWFwYm94L2dlb2pzb24tYXJlYS9pbmRleC5qcyIsIi4uLy4uLy4uL25vZGVfbW9kdWxlcy9nZW9qc29uLXJld2luZC9pbmRleC5qcyIsIi4uLy4uLy4uL3NyYy9zb3VyY2UvZ2VvanNvbl93cmFwcGVyLmpzIiwiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL3Z0LXBiZi9saWIvZ2VvanNvbl93cmFwcGVyLmpzIiwiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL3Z0LXBiZi9pbmRleC5qcyIsIi4uLy4uLy4uL25vZGVfbW9kdWxlcy9rZGJ1c2gvc3JjL3NvcnQuanMiLCIuLi8uLi8uLi9ub2RlX21vZHVsZXMva2RidXNoL3NyYy9yYW5nZS5qcyIsIi4uLy4uLy4uL25vZGVfbW9kdWxlcy9rZGJ1c2gvc3JjL3dpdGhpbi5qcyIsIi4uLy4uLy4uL25vZGVfbW9kdWxlcy9rZGJ1c2gvc3JjL2luZGV4LmpzIiwiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL3N1cGVyY2x1c3Rlci9pbmRleC5qcyIsIi4uLy4uLy4uL25vZGVfbW9kdWxlcy9nZW9qc29uLXZ0L3NyYy9zaW1wbGlmeS5qcyIsIi4uLy4uLy4uL25vZGVfbW9kdWxlcy9nZW9qc29uLXZ0L3NyYy9mZWF0dXJlLmpzIiwiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL2dlb2pzb24tdnQvc3JjL2NvbnZlcnQuanMiLCIuLi8uLi8uLi9ub2RlX21vZHVsZXMvZ2VvanNvbi12dC9zcmMvY2xpcC5qcyIsIi4uLy4uLy4uL25vZGVfbW9kdWxlcy9nZW9qc29uLXZ0L3NyYy93cmFwLmpzIiwiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL2dlb2pzb24tdnQvc3JjL3RyYW5zZm9ybS5qcyIsIi4uLy4uLy4uL25vZGVfbW9kdWxlcy9nZW9qc29uLXZ0L3NyYy90aWxlLmpzIiwiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL2dlb2pzb24tdnQvc3JjL2luZGV4LmpzIiwiLi4vLi4vLi4vc3JjL3NvdXJjZS9nZW9qc29uX3dvcmtlcl9zb3VyY2UuanMiLCIuLi8uLi8uLi9zcmMvc291cmNlL3dvcmtlci5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyJcbmltcG9ydCByZWZQcm9wZXJ0aWVzIGZyb20gJy4vdXRpbC9yZWZfcHJvcGVydGllcyc7XG5cbmZ1bmN0aW9uIHN0cmluZ2lmeShvYmopIHtcbiAgICBjb25zdCB0eXBlID0gdHlwZW9mIG9iajtcbiAgICBpZiAodHlwZSA9PT0gJ251bWJlcicgfHwgdHlwZSA9PT0gJ2Jvb2xlYW4nIHx8IHR5cGUgPT09ICdzdHJpbmcnIHx8IG9iaiA9PT0gdW5kZWZpbmVkIHx8IG9iaiA9PT0gbnVsbClcbiAgICAgICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KG9iaik7XG5cbiAgICBpZiAoQXJyYXkuaXNBcnJheShvYmopKSB7XG4gICAgICAgIGxldCBzdHIgPSAnWyc7XG4gICAgICAgIGZvciAoY29uc3QgdmFsIG9mIG9iaikge1xuICAgICAgICAgICAgc3RyICs9IGAke3N0cmluZ2lmeSh2YWwpfSxgO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBgJHtzdHJ9XWA7XG4gICAgfVxuXG4gICAgY29uc3Qga2V5cyA9IE9iamVjdC5rZXlzKG9iaikuc29ydCgpO1xuXG4gICAgbGV0IHN0ciA9ICd7JztcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGtleXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgc3RyICs9IGAke0pTT04uc3RyaW5naWZ5KGtleXNbaV0pfToke3N0cmluZ2lmeShvYmpba2V5c1tpXV0pfSxgO1xuICAgIH1cbiAgICByZXR1cm4gYCR7c3RyfX1gO1xufVxuXG5mdW5jdGlvbiBnZXRLZXkobGF5ZXIpIHtcbiAgICBsZXQga2V5ID0gJyc7XG4gICAgZm9yIChjb25zdCBrIG9mIHJlZlByb3BlcnRpZXMpIHtcbiAgICAgICAga2V5ICs9IGAvJHtzdHJpbmdpZnkobGF5ZXJba10pfWA7XG4gICAgfVxuICAgIHJldHVybiBrZXk7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGdyb3VwQnlMYXlvdXQ7XG5cbi8qKlxuICogR2l2ZW4gYW4gYXJyYXkgb2YgbGF5ZXJzLCByZXR1cm4gYW4gYXJyYXkgb2YgYXJyYXlzIG9mIGxheWVycyB3aGVyZSBhbGxcbiAqIGxheWVycyBpbiBlYWNoIGdyb3VwIGhhdmUgaWRlbnRpY2FsIGxheW91dC1hZmZlY3RpbmcgcHJvcGVydGllcy4gVGhlc2VcbiAqIGFyZSB0aGUgcHJvcGVydGllcyB0aGF0IHdlcmUgZm9ybWVybHkgdXNlZCBieSBleHBsaWNpdCBgcmVmYCBtZWNoYW5pc21cbiAqIGZvciBsYXllcnM6ICd0eXBlJywgJ3NvdXJjZScsICdzb3VyY2UtbGF5ZXInLCAnbWluem9vbScsICdtYXh6b29tJyxcbiAqICdmaWx0ZXInLCBhbmQgJ2xheW91dCcuXG4gKlxuICogVGhlIGlucHV0IGlzIG5vdCBtb2RpZmllZC4gVGhlIG91dHB1dCBsYXllcnMgYXJlIHJlZmVyZW5jZXMgdG8gdGhlXG4gKiBpbnB1dCBsYXllcnMuXG4gKlxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7QXJyYXk8TGF5ZXI+fSBsYXllcnNcbiAqIEByZXR1cm5zIHtBcnJheTxBcnJheTxMYXllcj4+fVxuICovXG5mdW5jdGlvbiBncm91cEJ5TGF5b3V0KGxheWVycykge1xuICAgIGNvbnN0IGdyb3VwcyA9IHt9O1xuXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsYXllcnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgY29uc3QgayA9IGdldEtleShsYXllcnNbaV0pO1xuICAgICAgICBsZXQgZ3JvdXAgPSBncm91cHNba107XG4gICAgICAgIGlmICghZ3JvdXApIHtcbiAgICAgICAgICAgIGdyb3VwID0gZ3JvdXBzW2tdID0gW107XG4gICAgICAgIH1cbiAgICAgICAgZ3JvdXAucHVzaChsYXllcnNbaV0pO1xuICAgIH1cblxuICAgIGNvbnN0IHJlc3VsdCA9IFtdO1xuXG4gICAgZm9yIChjb25zdCBrIGluIGdyb3Vwcykge1xuICAgICAgICByZXN1bHQucHVzaChncm91cHNba10pO1xuICAgIH1cblxuICAgIHJldHVybiByZXN1bHQ7XG59XG4iLCIvLyBAZmxvd1xuXG5pbXBvcnQgU3R5bGVMYXllciBmcm9tICcuL3N0eWxlX2xheWVyJztcbmltcG9ydCBjcmVhdGVTdHlsZUxheWVyIGZyb20gJy4vY3JlYXRlX3N0eWxlX2xheWVyJztcblxuaW1wb3J0IHsgdmFsdWVzIH0gZnJvbSAnLi4vdXRpbC91dGlsJztcbmltcG9ydCBmZWF0dXJlRmlsdGVyIGZyb20gJy4uL3N0eWxlLXNwZWMvZmVhdHVyZV9maWx0ZXInO1xuaW1wb3J0IGdyb3VwQnlMYXlvdXQgZnJvbSAnLi4vc3R5bGUtc3BlYy9ncm91cF9ieV9sYXlvdXQnO1xuXG5pbXBvcnQgdHlwZSB7VHlwZWRTdHlsZUxheWVyfSBmcm9tICcuL3N0eWxlX2xheWVyL3R5cGVkX3N0eWxlX2xheWVyJztcbmltcG9ydCB0eXBlIHtMYXllclNwZWNpZmljYXRpb259IGZyb20gJy4uL3N0eWxlLXNwZWMvdHlwZXMnO1xuXG5leHBvcnQgdHlwZSBMYXllckNvbmZpZ3MgPSB7IFtzdHJpbmddOiBMYXllclNwZWNpZmljYXRpb24gfTtcbmV4cG9ydCB0eXBlIEZhbWlseTxMYXllcjogVHlwZWRTdHlsZUxheWVyPiA9IEFycmF5PExheWVyPjtcblxuY2xhc3MgU3R5bGVMYXllckluZGV4IHtcbiAgICBmYW1pbGllc0J5U291cmNlOiB7IFtzb3VyY2U6IHN0cmluZ106IHsgW3NvdXJjZUxheWVyOiBzdHJpbmddOiBBcnJheTxGYW1pbHk8Kj4+IH0gfTtcblxuICAgIF9sYXllckNvbmZpZ3M6IExheWVyQ29uZmlncztcbiAgICBfbGF5ZXJzOiB7IFtzdHJpbmddOiBTdHlsZUxheWVyIH07XG5cbiAgICBjb25zdHJ1Y3RvcihsYXllckNvbmZpZ3M6ID9BcnJheTxMYXllclNwZWNpZmljYXRpb24+KSB7XG4gICAgICAgIGlmIChsYXllckNvbmZpZ3MpIHtcbiAgICAgICAgICAgIHRoaXMucmVwbGFjZShsYXllckNvbmZpZ3MpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmVwbGFjZShsYXllckNvbmZpZ3M6IEFycmF5PExheWVyU3BlY2lmaWNhdGlvbj4pIHtcbiAgICAgICAgdGhpcy5fbGF5ZXJDb25maWdzID0ge307XG4gICAgICAgIHRoaXMuX2xheWVycyA9IHt9O1xuICAgICAgICB0aGlzLnVwZGF0ZShsYXllckNvbmZpZ3MsIFtdKTtcbiAgICB9XG5cbiAgICB1cGRhdGUobGF5ZXJDb25maWdzOiBBcnJheTxMYXllclNwZWNpZmljYXRpb24+LCByZW1vdmVkSWRzOiBBcnJheTxzdHJpbmc+KSB7XG4gICAgICAgIGZvciAoY29uc3QgbGF5ZXJDb25maWcgb2YgbGF5ZXJDb25maWdzKSB7XG4gICAgICAgICAgICB0aGlzLl9sYXllckNvbmZpZ3NbbGF5ZXJDb25maWcuaWRdID0gbGF5ZXJDb25maWc7XG5cbiAgICAgICAgICAgIGNvbnN0IGxheWVyID0gdGhpcy5fbGF5ZXJzW2xheWVyQ29uZmlnLmlkXSA9IGNyZWF0ZVN0eWxlTGF5ZXIobGF5ZXJDb25maWcpO1xuICAgICAgICAgICAgbGF5ZXIuX2ZlYXR1cmVGaWx0ZXIgPSBmZWF0dXJlRmlsdGVyKGxheWVyLmZpbHRlcik7XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChjb25zdCBpZCBvZiByZW1vdmVkSWRzKSB7XG4gICAgICAgICAgICBkZWxldGUgdGhpcy5fbGF5ZXJDb25maWdzW2lkXTtcbiAgICAgICAgICAgIGRlbGV0ZSB0aGlzLl9sYXllcnNbaWRdO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5mYW1pbGllc0J5U291cmNlID0ge307XG5cbiAgICAgICAgY29uc3QgZ3JvdXBzID0gZ3JvdXBCeUxheW91dCh2YWx1ZXModGhpcy5fbGF5ZXJDb25maWdzKSk7XG5cbiAgICAgICAgZm9yIChjb25zdCBsYXllckNvbmZpZ3Mgb2YgZ3JvdXBzKSB7XG4gICAgICAgICAgICBjb25zdCBsYXllcnMgPSBsYXllckNvbmZpZ3MubWFwKChsYXllckNvbmZpZykgPT4gdGhpcy5fbGF5ZXJzW2xheWVyQ29uZmlnLmlkXSk7XG5cbiAgICAgICAgICAgIGNvbnN0IGxheWVyID0gbGF5ZXJzWzBdO1xuICAgICAgICAgICAgaWYgKGxheWVyLnZpc2liaWxpdHkgPT09ICdub25lJykge1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBzb3VyY2VJZCA9IGxheWVyLnNvdXJjZSB8fCAnJztcbiAgICAgICAgICAgIGxldCBzb3VyY2VHcm91cCA9IHRoaXMuZmFtaWxpZXNCeVNvdXJjZVtzb3VyY2VJZF07XG4gICAgICAgICAgICBpZiAoIXNvdXJjZUdyb3VwKSB7XG4gICAgICAgICAgICAgICAgc291cmNlR3JvdXAgPSB0aGlzLmZhbWlsaWVzQnlTb3VyY2Vbc291cmNlSWRdID0ge307XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IHNvdXJjZUxheWVySWQgPSBsYXllci5zb3VyY2VMYXllciB8fCAnX2dlb2pzb25UaWxlTGF5ZXInO1xuICAgICAgICAgICAgbGV0IHNvdXJjZUxheWVyRmFtaWxpZXMgPSBzb3VyY2VHcm91cFtzb3VyY2VMYXllcklkXTtcbiAgICAgICAgICAgIGlmICghc291cmNlTGF5ZXJGYW1pbGllcykge1xuICAgICAgICAgICAgICAgIHNvdXJjZUxheWVyRmFtaWxpZXMgPSBzb3VyY2VHcm91cFtzb3VyY2VMYXllcklkXSA9IFtdO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBzb3VyY2VMYXllckZhbWlsaWVzLnB1c2gobGF5ZXJzKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgU3R5bGVMYXllckluZGV4O1xuIiwiLy8gQGZsb3dcblxuZXhwb3J0IGRlZmF1bHQgY2hlY2tNYXhBbmdsZTtcblxuaW1wb3J0IHR5cGUgUG9pbnQgZnJvbSAnQG1hcGJveC9wb2ludC1nZW9tZXRyeSc7XG5pbXBvcnQgdHlwZSBBbmNob3IgZnJvbSAnLi9hbmNob3InO1xuXG4vKipcbiAqIExhYmVscyBwbGFjZWQgYXJvdW5kIHJlYWxseSBzaGFycCBhbmdsZXMgYXJlbid0IHJlYWRhYmxlLiBDaGVjayBpZiBhbnlcbiAqIHBhcnQgb2YgdGhlIHBvdGVudGlhbCBsYWJlbCBoYXMgYSBjb21iaW5lZCBhbmdsZSB0aGF0IGlzIHRvbyBiaWcuXG4gKlxuICogQHBhcmFtIGxpbmVcbiAqIEBwYXJhbSBhbmNob3IgVGhlIHBvaW50IG9uIHRoZSBsaW5lIGFyb3VuZCB3aGljaCB0aGUgbGFiZWwgaXMgYW5jaG9yZWQuXG4gKiBAcGFyYW0gbGFiZWxMZW5ndGggVGhlIGxlbmd0aCBvZiB0aGUgbGFiZWwgaW4gZ2VvbWV0cnkgdW5pdHMuXG4gKiBAcGFyYW0gd2luZG93U2l6ZSBUaGUgY2hlY2sgZmFpbHMgaWYgdGhlIGNvbWJpbmVkIGFuZ2xlcyB3aXRoaW4gYSBwYXJ0IG9mIHRoZSBsaW5lIHRoYXQgaXMgYHdpbmRvd1NpemVgIGxvbmcgaXMgdG9vIGJpZy5cbiAqIEBwYXJhbSBtYXhBbmdsZSBUaGUgbWF4aW11bSBjb21iaW5lZCBhbmdsZSB0aGF0IGFueSB3aW5kb3cgYWxvbmcgdGhlIGxhYmVsIGlzIGFsbG93ZWQgdG8gaGF2ZS5cbiAqXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gd2hldGhlciB0aGUgbGFiZWwgc2hvdWxkIGJlIHBsYWNlZFxuICogQHByaXZhdGVcbiAqL1xuZnVuY3Rpb24gY2hlY2tNYXhBbmdsZShsaW5lOiBBcnJheTxQb2ludD4sIGFuY2hvcjogQW5jaG9yLCBsYWJlbExlbmd0aDogbnVtYmVyLCB3aW5kb3dTaXplOiBudW1iZXIsIG1heEFuZ2xlOiBudW1iZXIpIHtcblxuICAgIC8vIGhvcml6b250YWwgbGFiZWxzIGFsd2F5cyBwYXNzXG4gICAgaWYgKGFuY2hvci5zZWdtZW50ID09PSB1bmRlZmluZWQpIHJldHVybiB0cnVlO1xuXG4gICAgbGV0IHAgPSBhbmNob3I7XG4gICAgbGV0IGluZGV4ID0gYW5jaG9yLnNlZ21lbnQgKyAxO1xuICAgIGxldCBhbmNob3JEaXN0YW5jZSA9IDA7XG5cbiAgICAvLyBtb3ZlIGJhY2t3YXJkcyBhbG9uZyB0aGUgbGluZSB0byB0aGUgZmlyc3Qgc2VnbWVudCB0aGUgbGFiZWwgYXBwZWFycyBvblxuICAgIHdoaWxlIChhbmNob3JEaXN0YW5jZSA+IC1sYWJlbExlbmd0aCAvIDIpIHtcbiAgICAgICAgaW5kZXgtLTtcblxuICAgICAgICAvLyB0aGVyZSBpc24ndCBlbm91Z2ggcm9vbSBmb3IgdGhlIGxhYmVsIGFmdGVyIHRoZSBiZWdpbm5pbmcgb2YgdGhlIGxpbmVcbiAgICAgICAgaWYgKGluZGV4IDwgMCkgcmV0dXJuIGZhbHNlO1xuXG4gICAgICAgIGFuY2hvckRpc3RhbmNlIC09IGxpbmVbaW5kZXhdLmRpc3QocCk7XG4gICAgICAgIHAgPSBsaW5lW2luZGV4XTtcbiAgICB9XG5cbiAgICBhbmNob3JEaXN0YW5jZSArPSBsaW5lW2luZGV4XS5kaXN0KGxpbmVbaW5kZXggKyAxXSk7XG4gICAgaW5kZXgrKztcblxuICAgIC8vIHN0b3JlIHJlY2VudCBjb3JuZXJzIGFuZCB0aGVpciB0b3RhbCBhbmdsZSBkaWZmZXJlbmNlXG4gICAgY29uc3QgcmVjZW50Q29ybmVycyA9IFtdO1xuICAgIGxldCByZWNlbnRBbmdsZURlbHRhID0gMDtcblxuICAgIC8vIG1vdmUgZm9yd2FyZHMgYnkgdGhlIGxlbmd0aCBvZiB0aGUgbGFiZWwgYW5kIGNoZWNrIGFuZ2xlcyBhbG9uZyB0aGUgd2F5XG4gICAgd2hpbGUgKGFuY2hvckRpc3RhbmNlIDwgbGFiZWxMZW5ndGggLyAyKSB7XG4gICAgICAgIGNvbnN0IHByZXYgPSBsaW5lW2luZGV4IC0gMV07XG4gICAgICAgIGNvbnN0IGN1cnJlbnQgPSBsaW5lW2luZGV4XTtcbiAgICAgICAgY29uc3QgbmV4dCA9IGxpbmVbaW5kZXggKyAxXTtcblxuICAgICAgICAvLyB0aGVyZSBpc24ndCBlbm91Z2ggcm9vbSBmb3IgdGhlIGxhYmVsIGJlZm9yZSB0aGUgZW5kIG9mIHRoZSBsaW5lXG4gICAgICAgIGlmICghbmV4dCkgcmV0dXJuIGZhbHNlO1xuXG4gICAgICAgIGxldCBhbmdsZURlbHRhID0gcHJldi5hbmdsZVRvKGN1cnJlbnQpIC0gY3VycmVudC5hbmdsZVRvKG5leHQpO1xuICAgICAgICAvLyByZXN0cmljdCBhbmdsZSB0byAtcGkuLnBpIHJhbmdlXG4gICAgICAgIGFuZ2xlRGVsdGEgPSBNYXRoLmFicygoKGFuZ2xlRGVsdGEgKyAzICogTWF0aC5QSSkgJSAoTWF0aC5QSSAqIDIpKSAtIE1hdGguUEkpO1xuXG4gICAgICAgIHJlY2VudENvcm5lcnMucHVzaCh7XG4gICAgICAgICAgICBkaXN0YW5jZTogYW5jaG9yRGlzdGFuY2UsXG4gICAgICAgICAgICBhbmdsZURlbHRhOiBhbmdsZURlbHRhXG4gICAgICAgIH0pO1xuICAgICAgICByZWNlbnRBbmdsZURlbHRhICs9IGFuZ2xlRGVsdGE7XG5cbiAgICAgICAgLy8gcmVtb3ZlIGNvcm5lcnMgdGhhdCBhcmUgZmFyIGVub3VnaCBhd2F5IGZyb20gdGhlIGxpc3Qgb2YgcmVjZW50IGFuY2hvcnNcbiAgICAgICAgd2hpbGUgKGFuY2hvckRpc3RhbmNlIC0gcmVjZW50Q29ybmVyc1swXS5kaXN0YW5jZSA+IHdpbmRvd1NpemUpIHtcbiAgICAgICAgICAgIHJlY2VudEFuZ2xlRGVsdGEgLT0gcmVjZW50Q29ybmVycy5zaGlmdCgpLmFuZ2xlRGVsdGE7XG4gICAgICAgIH1cblxuICAgICAgICAvLyB0aGUgc3VtIG9mIGFuZ2xlcyB3aXRoaW4gdGhlIHdpbmRvdyBhcmVhIGV4Y2VlZHMgdGhlIG1heGltdW0gYWxsb3dlZCB2YWx1ZS4gY2hlY2sgZmFpbHMuXG4gICAgICAgIGlmIChyZWNlbnRBbmdsZURlbHRhID4gbWF4QW5nbGUpIHJldHVybiBmYWxzZTtcblxuICAgICAgICBpbmRleCsrO1xuICAgICAgICBhbmNob3JEaXN0YW5jZSArPSBjdXJyZW50LmRpc3QobmV4dCk7XG4gICAgfVxuXG4gICAgLy8gbm8gcGFydCBvZiB0aGUgbGluZSBoYWQgYW4gYW5nbGUgZ3JlYXRlciB0aGFuIHRoZSBtYXhpbXVtIGFsbG93ZWQuIGNoZWNrIHBhc3Nlcy5cbiAgICByZXR1cm4gdHJ1ZTtcbn1cbiIsIi8vIEBmbG93XG5cbmltcG9ydCB7IG51bWJlciBhcyBpbnRlcnBvbGF0ZSB9IGZyb20gJy4uL3N0eWxlLXNwZWMvdXRpbC9pbnRlcnBvbGF0ZSc7XG5cbmltcG9ydCBBbmNob3IgZnJvbSAnLi4vc3ltYm9sL2FuY2hvcic7XG5pbXBvcnQgY2hlY2tNYXhBbmdsZSBmcm9tICcuL2NoZWNrX21heF9hbmdsZSc7XG5cbmltcG9ydCB0eXBlIFBvaW50IGZyb20gJ0BtYXBib3gvcG9pbnQtZ2VvbWV0cnknO1xuaW1wb3J0IHR5cGUge1NoYXBpbmcsIFBvc2l0aW9uZWRJY29ufSBmcm9tICcuL3NoYXBpbmcnO1xuXG5leHBvcnQgeyBnZXRBbmNob3JzLCBnZXRDZW50ZXJBbmNob3IgfTtcblxuZnVuY3Rpb24gZ2V0TGluZUxlbmd0aChsaW5lOiBBcnJheTxQb2ludD4pOiBudW1iZXIge1xuICAgIGxldCBsaW5lTGVuZ3RoID0gMDtcbiAgICBmb3IgKGxldCBrID0gMDsgayA8IGxpbmUubGVuZ3RoIC0gMTsgaysrKSB7XG4gICAgICAgIGxpbmVMZW5ndGggKz0gbGluZVtrXS5kaXN0KGxpbmVbayArIDFdKTtcbiAgICB9XG4gICAgcmV0dXJuIGxpbmVMZW5ndGg7XG59XG5cbmZ1bmN0aW9uIGdldEFuZ2xlV2luZG93U2l6ZShzaGFwZWRUZXh0OiA/U2hhcGluZyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBnbHlwaFNpemU6IG51bWJlcixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBib3hTY2FsZTogbnVtYmVyKTogbnVtYmVyIHtcbiAgICByZXR1cm4gc2hhcGVkVGV4dCA/XG4gICAgICAgIDMgLyA1ICogZ2x5cGhTaXplICogYm94U2NhbGUgOlxuICAgICAgICAwO1xufVxuXG5mdW5jdGlvbiBnZXRTaGFwZWRMYWJlbExlbmd0aChzaGFwZWRUZXh0OiA/U2hhcGluZywgc2hhcGVkSWNvbjogP1Bvc2l0aW9uZWRJY29uKTogbnVtYmVyIHtcbiAgICByZXR1cm4gTWF0aC5tYXgoXG4gICAgICAgIHNoYXBlZFRleHQgPyBzaGFwZWRUZXh0LnJpZ2h0IC0gc2hhcGVkVGV4dC5sZWZ0IDogMCxcbiAgICAgICAgc2hhcGVkSWNvbiA/IHNoYXBlZEljb24ucmlnaHQgLSBzaGFwZWRJY29uLmxlZnQgOiAwKTtcbn1cblxuZnVuY3Rpb24gZ2V0Q2VudGVyQW5jaG9yKGxpbmU6IEFycmF5PFBvaW50PixcbiAgICAgICAgICAgICAgICAgICAgICAgICBtYXhBbmdsZTogbnVtYmVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgIHNoYXBlZFRleHQ6ID9TaGFwaW5nLFxuICAgICAgICAgICAgICAgICAgICAgICAgIHNoYXBlZEljb246ID9Qb3NpdGlvbmVkSWNvbixcbiAgICAgICAgICAgICAgICAgICAgICAgICBnbHlwaFNpemU6IG51bWJlcixcbiAgICAgICAgICAgICAgICAgICAgICAgICBib3hTY2FsZTogbnVtYmVyKSB7XG4gICAgY29uc3QgYW5nbGVXaW5kb3dTaXplID0gZ2V0QW5nbGVXaW5kb3dTaXplKHNoYXBlZFRleHQsIGdseXBoU2l6ZSwgYm94U2NhbGUpO1xuICAgIGNvbnN0IGxhYmVsTGVuZ3RoID0gZ2V0U2hhcGVkTGFiZWxMZW5ndGgoc2hhcGVkVGV4dCwgc2hhcGVkSWNvbikgKiBib3hTY2FsZTtcblxuICAgIGxldCBwcmV2RGlzdGFuY2UgPSAwO1xuICAgIGNvbnN0IGNlbnRlckRpc3RhbmNlID0gZ2V0TGluZUxlbmd0aChsaW5lKSAvIDI7XG5cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxpbmUubGVuZ3RoIC0gMTsgaSsrKSB7XG5cbiAgICAgICAgY29uc3QgYSA9IGxpbmVbaV0sXG4gICAgICAgICAgICBiID0gbGluZVtpICsgMV07XG5cbiAgICAgICAgY29uc3Qgc2VnbWVudERpc3RhbmNlID0gYS5kaXN0KGIpO1xuXG4gICAgICAgIGlmIChwcmV2RGlzdGFuY2UgKyBzZWdtZW50RGlzdGFuY2UgPiBjZW50ZXJEaXN0YW5jZSkge1xuICAgICAgICAgICAgLy8gVGhlIGNlbnRlciBpcyBvbiB0aGlzIHNlZ21lbnRcbiAgICAgICAgICAgIGNvbnN0IHQgPSAoY2VudGVyRGlzdGFuY2UgLSBwcmV2RGlzdGFuY2UpIC8gc2VnbWVudERpc3RhbmNlLFxuICAgICAgICAgICAgICAgIHggPSBpbnRlcnBvbGF0ZShhLngsIGIueCwgdCksXG4gICAgICAgICAgICAgICAgeSA9IGludGVycG9sYXRlKGEueSwgYi55LCB0KTtcblxuICAgICAgICAgICAgY29uc3QgYW5jaG9yID0gbmV3IEFuY2hvcih4LCB5LCBiLmFuZ2xlVG8oYSksIGkpO1xuICAgICAgICAgICAgYW5jaG9yLl9yb3VuZCgpO1xuICAgICAgICAgICAgaWYgKCFhbmdsZVdpbmRvd1NpemUgfHwgY2hlY2tNYXhBbmdsZShsaW5lLCBhbmNob3IsIGxhYmVsTGVuZ3RoLCBhbmdsZVdpbmRvd1NpemUsIG1heEFuZ2xlKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBhbmNob3I7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHByZXZEaXN0YW5jZSArPSBzZWdtZW50RGlzdGFuY2U7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBnZXRBbmNob3JzKGxpbmU6IEFycmF5PFBvaW50PixcbiAgICAgICAgICAgICAgICAgICAgc3BhY2luZzogbnVtYmVyLFxuICAgICAgICAgICAgICAgICAgICBtYXhBbmdsZTogbnVtYmVyLFxuICAgICAgICAgICAgICAgICAgICBzaGFwZWRUZXh0OiA/U2hhcGluZyxcbiAgICAgICAgICAgICAgICAgICAgc2hhcGVkSWNvbjogP1Bvc2l0aW9uZWRJY29uLFxuICAgICAgICAgICAgICAgICAgICBnbHlwaFNpemU6IG51bWJlcixcbiAgICAgICAgICAgICAgICAgICAgYm94U2NhbGU6IG51bWJlcixcbiAgICAgICAgICAgICAgICAgICAgb3ZlcnNjYWxpbmc6IG51bWJlcixcbiAgICAgICAgICAgICAgICAgICAgdGlsZUV4dGVudDogbnVtYmVyKSB7XG5cbiAgICAvLyBSZXNhbXBsZSBhIGxpbmUgdG8gZ2V0IGFuY2hvciBwb2ludHMgZm9yIGxhYmVscyBhbmQgY2hlY2sgdGhhdCBlYWNoXG4gICAgLy8gcG90ZW50aWFsIGxhYmVsIHBhc3NlcyB0ZXh0LW1heC1hbmdsZSBjaGVjayBhbmQgaGFzIGVub3VnaCBmcm9vbSB0byBmaXRcbiAgICAvLyBvbiB0aGUgbGluZS5cblxuICAgIGNvbnN0IGFuZ2xlV2luZG93U2l6ZSA9IGdldEFuZ2xlV2luZG93U2l6ZShzaGFwZWRUZXh0LCBnbHlwaFNpemUsIGJveFNjYWxlKTtcbiAgICBjb25zdCBzaGFwZWRMYWJlbExlbmd0aCA9IGdldFNoYXBlZExhYmVsTGVuZ3RoKHNoYXBlZFRleHQsIHNoYXBlZEljb24pO1xuICAgIGNvbnN0IGxhYmVsTGVuZ3RoID0gc2hhcGVkTGFiZWxMZW5ndGggKiBib3hTY2FsZTtcblxuICAgIC8vIElzIHRoZSBsaW5lIGNvbnRpbnVlZCBmcm9tIG91dHNpZGUgdGhlIHRpbGUgYm91bmRhcnk/XG4gICAgY29uc3QgaXNMaW5lQ29udGludWVkID0gbGluZVswXS54ID09PSAwIHx8IGxpbmVbMF0ueCA9PT0gdGlsZUV4dGVudCB8fCBsaW5lWzBdLnkgPT09IDAgfHwgbGluZVswXS55ID09PSB0aWxlRXh0ZW50O1xuXG4gICAgLy8gSXMgdGhlIGxhYmVsIGxvbmcsIHJlbGF0aXZlIHRvIHRoZSBzcGFjaW5nP1xuICAgIC8vIElmIHNvLCBhZGp1c3QgdGhlIHNwYWNpbmcgc28gdGhlcmUgaXMgYWx3YXlzIGEgbWluaW11bSBzcGFjZSBvZiBgc3BhY2luZyAvIDRgIGJldHdlZW4gbGFiZWwgZWRnZXMuXG4gICAgaWYgKHNwYWNpbmcgLSBsYWJlbExlbmd0aCA8IHNwYWNpbmcgLyA0KSB7XG4gICAgICAgIHNwYWNpbmcgPSBsYWJlbExlbmd0aCArIHNwYWNpbmcgLyA0O1xuICAgIH1cblxuICAgIC8vIE9mZnNldCB0aGUgZmlyc3QgYW5jaG9yIGJ5OlxuICAgIC8vIEVpdGhlciBoYWxmIHRoZSBsYWJlbCBsZW5ndGggcGx1cyBhIGZpeGVkIGV4dHJhIG9mZnNldCBpZiB0aGUgbGluZSBpcyBub3QgY29udGludWVkXG4gICAgLy8gT3IgaGFsZiB0aGUgc3BhY2luZyBpZiB0aGUgbGluZSBpcyBjb250aW51ZWQuXG5cbiAgICAvLyBGb3Igbm9uLWNvbnRpbnVlZCBsaW5lcywgYWRkIGEgYml0IG9mIGZpeGVkIGV4dHJhIG9mZnNldCB0byBhdm9pZCBjb2xsaXNpb25zIGF0IFQgaW50ZXJzZWN0aW9ucy5cbiAgICBjb25zdCBmaXhlZEV4dHJhT2Zmc2V0ID0gZ2x5cGhTaXplICogMjtcblxuICAgIGNvbnN0IG9mZnNldCA9ICFpc0xpbmVDb250aW51ZWQgP1xuICAgICAgICAoKHNoYXBlZExhYmVsTGVuZ3RoIC8gMiArIGZpeGVkRXh0cmFPZmZzZXQpICogYm94U2NhbGUgKiBvdmVyc2NhbGluZykgJSBzcGFjaW5nIDpcbiAgICAgICAgKHNwYWNpbmcgLyAyICogb3ZlcnNjYWxpbmcpICUgc3BhY2luZztcblxuICAgIHJldHVybiByZXNhbXBsZShsaW5lLCBvZmZzZXQsIHNwYWNpbmcsIGFuZ2xlV2luZG93U2l6ZSwgbWF4QW5nbGUsIGxhYmVsTGVuZ3RoLCBpc0xpbmVDb250aW51ZWQsIGZhbHNlLCB0aWxlRXh0ZW50KTtcbn1cblxuXG5mdW5jdGlvbiByZXNhbXBsZShsaW5lLCBvZmZzZXQsIHNwYWNpbmcsIGFuZ2xlV2luZG93U2l6ZSwgbWF4QW5nbGUsIGxhYmVsTGVuZ3RoLCBpc0xpbmVDb250aW51ZWQsIHBsYWNlQXRNaWRkbGUsIHRpbGVFeHRlbnQpIHtcblxuICAgIGNvbnN0IGhhbGZMYWJlbExlbmd0aCA9IGxhYmVsTGVuZ3RoIC8gMjtcbiAgICBjb25zdCBsaW5lTGVuZ3RoID0gZ2V0TGluZUxlbmd0aChsaW5lKTtcblxuICAgIGxldCBkaXN0YW5jZSA9IDAsXG4gICAgICAgIG1hcmtlZERpc3RhbmNlID0gb2Zmc2V0IC0gc3BhY2luZztcblxuICAgIGxldCBhbmNob3JzID0gW107XG5cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxpbmUubGVuZ3RoIC0gMTsgaSsrKSB7XG5cbiAgICAgICAgY29uc3QgYSA9IGxpbmVbaV0sXG4gICAgICAgICAgICBiID0gbGluZVtpICsgMV07XG5cbiAgICAgICAgY29uc3Qgc2VnbWVudERpc3QgPSBhLmRpc3QoYiksXG4gICAgICAgICAgICBhbmdsZSA9IGIuYW5nbGVUbyhhKTtcblxuICAgICAgICB3aGlsZSAobWFya2VkRGlzdGFuY2UgKyBzcGFjaW5nIDwgZGlzdGFuY2UgKyBzZWdtZW50RGlzdCkge1xuICAgICAgICAgICAgbWFya2VkRGlzdGFuY2UgKz0gc3BhY2luZztcblxuICAgICAgICAgICAgY29uc3QgdCA9IChtYXJrZWREaXN0YW5jZSAtIGRpc3RhbmNlKSAvIHNlZ21lbnREaXN0LFxuICAgICAgICAgICAgICAgIHggPSBpbnRlcnBvbGF0ZShhLngsIGIueCwgdCksXG4gICAgICAgICAgICAgICAgeSA9IGludGVycG9sYXRlKGEueSwgYi55LCB0KTtcblxuICAgICAgICAgICAgLy8gQ2hlY2sgdGhhdCB0aGUgcG9pbnQgaXMgd2l0aGluIHRoZSB0aWxlIGJvdW5kYXJpZXMgYW5kIHRoYXRcbiAgICAgICAgICAgIC8vIHRoZSBsYWJlbCB3b3VsZCBmaXQgYmVmb3JlIHRoZSBiZWdpbm5pbmcgYW5kIGVuZCBvZiB0aGUgbGluZVxuICAgICAgICAgICAgLy8gaWYgcGxhY2VkIGF0IHRoaXMgcG9pbnQuXG4gICAgICAgICAgICBpZiAoeCA+PSAwICYmIHggPCB0aWxlRXh0ZW50ICYmIHkgPj0gMCAmJiB5IDwgdGlsZUV4dGVudCAmJlxuICAgICAgICAgICAgICAgICAgICBtYXJrZWREaXN0YW5jZSAtIGhhbGZMYWJlbExlbmd0aCA+PSAwICYmXG4gICAgICAgICAgICAgICAgICAgIG1hcmtlZERpc3RhbmNlICsgaGFsZkxhYmVsTGVuZ3RoIDw9IGxpbmVMZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBhbmNob3IgPSBuZXcgQW5jaG9yKHgsIHksIGFuZ2xlLCBpKTtcbiAgICAgICAgICAgICAgICBhbmNob3IuX3JvdW5kKCk7XG5cbiAgICAgICAgICAgICAgICBpZiAoIWFuZ2xlV2luZG93U2l6ZSB8fCBjaGVja01heEFuZ2xlKGxpbmUsIGFuY2hvciwgbGFiZWxMZW5ndGgsIGFuZ2xlV2luZG93U2l6ZSwgbWF4QW5nbGUpKSB7XG4gICAgICAgICAgICAgICAgICAgIGFuY2hvcnMucHVzaChhbmNob3IpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGRpc3RhbmNlICs9IHNlZ21lbnREaXN0O1xuICAgIH1cblxuICAgIGlmICghcGxhY2VBdE1pZGRsZSAmJiAhYW5jaG9ycy5sZW5ndGggJiYgIWlzTGluZUNvbnRpbnVlZCkge1xuICAgICAgICAvLyBUaGUgZmlyc3QgYXR0ZW1wdCBhdCBmaW5kaW5nIGFuY2hvcnMgYXQgd2hpY2ggbGFiZWxzIGNhbiBiZSBwbGFjZWQgZmFpbGVkLlxuICAgICAgICAvLyBUcnkgYWdhaW4sIGJ1dCB0aGlzIHRpbWUganVzdCB0cnkgcGxhY2luZyBvbmUgYW5jaG9yIGF0IHRoZSBtaWRkbGUgb2YgdGhlIGxpbmUuXG4gICAgICAgIC8vIFRoaXMgaGFzIHRoZSBtb3N0IGVmZmVjdCBmb3Igc2hvcnQgbGluZXMgaW4gb3ZlcnNjYWxlZCB0aWxlcywgc2luY2UgdGhlXG4gICAgICAgIC8vIGluaXRpYWwgb2Zmc2V0IHVzZWQgaW4gb3ZlcnNjYWxlZCB0aWxlcyBpcyBjYWxjdWxhdGVkIHRvIGFsaWduIGxhYmVscyB3aXRoIHBvc2l0aW9ucyBpblxuICAgICAgICAvLyBwYXJlbnQgdGlsZXMgaW5zdGVhZCBvZiBwbGFjaW5nIHRoZSBsYWJlbCBhcyBjbG9zZSB0byB0aGUgYmVnaW5uaW5nIGFzIHBvc3NpYmxlLlxuICAgICAgICBhbmNob3JzID0gcmVzYW1wbGUobGluZSwgZGlzdGFuY2UgLyAyLCBzcGFjaW5nLCBhbmdsZVdpbmRvd1NpemUsIG1heEFuZ2xlLCBsYWJlbExlbmd0aCwgaXNMaW5lQ29udGludWVkLCB0cnVlLCB0aWxlRXh0ZW50KTtcbiAgICB9XG5cbiAgICByZXR1cm4gYW5jaG9ycztcbn1cbiIsIi8vIEBmbG93XG5cbmltcG9ydCBQb2ludCBmcm9tICdAbWFwYm94L3BvaW50LWdlb21ldHJ5JztcblxuZXhwb3J0IGRlZmF1bHQgY2xpcExpbmU7XG5cbi8qKlxuICogUmV0dXJucyB0aGUgcGFydCBvZiBhIG11bHRpbGluZSB0aGF0IGludGVyc2VjdHMgd2l0aCB0aGUgcHJvdmlkZWQgcmVjdGFuZ3VsYXIgYm94LlxuICpcbiAqIEBwYXJhbSBsaW5lc1xuICogQHBhcmFtIHgxIHRoZSBsZWZ0IGVkZ2Ugb2YgdGhlIGJveFxuICogQHBhcmFtIHkxIHRoZSB0b3AgZWRnZSBvZiB0aGUgYm94XG4gKiBAcGFyYW0geDIgdGhlIHJpZ2h0IGVkZ2Ugb2YgdGhlIGJveFxuICogQHBhcmFtIHkyIHRoZSBib3R0b20gZWRnZSBvZiB0aGUgYm94XG4gKiBAcmV0dXJucyBsaW5lc1xuICogQHByaXZhdGVcbiAqL1xuZnVuY3Rpb24gY2xpcExpbmUobGluZXM6IEFycmF5PEFycmF5PFBvaW50Pj4sIHgxOiBudW1iZXIsIHkxOiBudW1iZXIsIHgyOiBudW1iZXIsIHkyOiBudW1iZXIpOiBBcnJheTxBcnJheTxQb2ludD4+IHtcbiAgICBjb25zdCBjbGlwcGVkTGluZXMgPSBbXTtcblxuICAgIGZvciAobGV0IGwgPSAwOyBsIDwgbGluZXMubGVuZ3RoOyBsKyspIHtcbiAgICAgICAgY29uc3QgbGluZSA9IGxpbmVzW2xdO1xuICAgICAgICBsZXQgY2xpcHBlZExpbmU7XG5cbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsaW5lLmxlbmd0aCAtIDE7IGkrKykge1xuICAgICAgICAgICAgbGV0IHAwID0gbGluZVtpXTtcbiAgICAgICAgICAgIGxldCBwMSA9IGxpbmVbaSArIDFdO1xuXG5cbiAgICAgICAgICAgIGlmIChwMC54IDwgeDEgJiYgcDEueCA8IHgxKSB7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHAwLnggPCB4MSkge1xuICAgICAgICAgICAgICAgIHAwID0gbmV3IFBvaW50KHgxLCBwMC55ICsgKHAxLnkgLSBwMC55KSAqICgoeDEgLSBwMC54KSAvIChwMS54IC0gcDAueCkpKS5fcm91bmQoKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocDEueCA8IHgxKSB7XG4gICAgICAgICAgICAgICAgcDEgPSBuZXcgUG9pbnQoeDEsIHAwLnkgKyAocDEueSAtIHAwLnkpICogKCh4MSAtIHAwLngpIC8gKHAxLnggLSBwMC54KSkpLl9yb3VuZCgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAocDAueSA8IHkxICYmIHAxLnkgPCB5MSkge1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChwMC55IDwgeTEpIHtcbiAgICAgICAgICAgICAgICBwMCA9IG5ldyBQb2ludChwMC54ICsgKHAxLnggLSBwMC54KSAqICgoeTEgLSBwMC55KSAvIChwMS55IC0gcDAueSkpLCB5MSkuX3JvdW5kKCk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHAxLnkgPCB5MSkge1xuICAgICAgICAgICAgICAgIHAxID0gbmV3IFBvaW50KHAwLnggKyAocDEueCAtIHAwLngpICogKCh5MSAtIHAwLnkpIC8gKHAxLnkgLSBwMC55KSksIHkxKS5fcm91bmQoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKHAwLnggPj0geDIgJiYgcDEueCA+PSB4Mikge1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChwMC54ID49IHgyKSB7XG4gICAgICAgICAgICAgICAgcDAgPSBuZXcgUG9pbnQoeDIsIHAwLnkgKyAocDEueSAtIHAwLnkpICogKCh4MiAtIHAwLngpIC8gKHAxLnggLSBwMC54KSkpLl9yb3VuZCgpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChwMS54ID49IHgyKSB7XG4gICAgICAgICAgICAgICAgcDEgPSBuZXcgUG9pbnQoeDIsIHAwLnkgKyAocDEueSAtIHAwLnkpICogKCh4MiAtIHAwLngpIC8gKHAxLnggLSBwMC54KSkpLl9yb3VuZCgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAocDAueSA+PSB5MiAmJiBwMS55ID49IHkyKSB7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHAwLnkgPj0geTIpIHtcbiAgICAgICAgICAgICAgICBwMCA9IG5ldyBQb2ludChwMC54ICsgKHAxLnggLSBwMC54KSAqICgoeTIgLSBwMC55KSAvIChwMS55IC0gcDAueSkpLCB5MikuX3JvdW5kKCk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHAxLnkgPj0geTIpIHtcbiAgICAgICAgICAgICAgICBwMSA9IG5ldyBQb2ludChwMC54ICsgKHAxLnggLSBwMC54KSAqICgoeTIgLSBwMC55KSAvIChwMS55IC0gcDAueSkpLCB5MikuX3JvdW5kKCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICghY2xpcHBlZExpbmUgfHwgIXAwLmVxdWFscyhjbGlwcGVkTGluZVtjbGlwcGVkTGluZS5sZW5ndGggLSAxXSkpIHtcbiAgICAgICAgICAgICAgICBjbGlwcGVkTGluZSA9IFtwMF07XG4gICAgICAgICAgICAgICAgY2xpcHBlZExpbmVzLnB1c2goY2xpcHBlZExpbmUpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjbGlwcGVkTGluZS5wdXNoKHAxKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBjbGlwcGVkTGluZXM7XG59XG4iLCIvLyBAZmxvd1xuXG5pbXBvcnQgUG9pbnQgZnJvbSAnQG1hcGJveC9wb2ludC1nZW9tZXRyeSc7XG5cbmltcG9ydCB7IEdMWVBIX1BCRl9CT1JERVIgfSBmcm9tICcuLi9zdHlsZS9wYXJzZV9nbHlwaF9wYmYnO1xuXG5pbXBvcnQgdHlwZSBBbmNob3IgZnJvbSAnLi9hbmNob3InO1xuaW1wb3J0IHR5cGUge1Bvc2l0aW9uZWRJY29uLCBTaGFwaW5nfSBmcm9tICcuL3NoYXBpbmcnO1xuaW1wb3J0IHR5cGUgU3ltYm9sU3R5bGVMYXllciBmcm9tICcuLi9zdHlsZS9zdHlsZV9sYXllci9zeW1ib2xfc3R5bGVfbGF5ZXInO1xuaW1wb3J0IHR5cGUge0ZlYXR1cmV9IGZyb20gJy4uL3N0eWxlLXNwZWMvZXhwcmVzc2lvbic7XG5pbXBvcnQgdHlwZSB7R2x5cGhQb3NpdGlvbn0gZnJvbSAnLi4vcmVuZGVyL2dseXBoX2F0bGFzJztcblxuLyoqXG4gKiBBIHRleHR1cmVkIHF1YWQgZm9yIHJlbmRlcmluZyBhIHNpbmdsZSBpY29uIG9yIGdseXBoLlxuICpcbiAqIFRoZSB6b29tIHJhbmdlIHRoZSBnbHlwaCBjYW4gYmUgc2hvd24gaXMgZGVmaW5lZCBieSBtaW5TY2FsZSBhbmQgbWF4U2NhbGUuXG4gKlxuICogQHBhcmFtIHRsIFRoZSBvZmZzZXQgb2YgdGhlIHRvcCBsZWZ0IGNvcm5lciBmcm9tIHRoZSBhbmNob3IuXG4gKiBAcGFyYW0gdHIgVGhlIG9mZnNldCBvZiB0aGUgdG9wIHJpZ2h0IGNvcm5lciBmcm9tIHRoZSBhbmNob3IuXG4gKiBAcGFyYW0gYmwgVGhlIG9mZnNldCBvZiB0aGUgYm90dG9tIGxlZnQgY29ybmVyIGZyb20gdGhlIGFuY2hvci5cbiAqIEBwYXJhbSBiciBUaGUgb2Zmc2V0IG9mIHRoZSBib3R0b20gcmlnaHQgY29ybmVyIGZyb20gdGhlIGFuY2hvci5cbiAqIEBwYXJhbSB0ZXggVGhlIHRleHR1cmUgY29vcmRpbmF0ZXMuXG4gKlxuICogQHByaXZhdGVcbiAqL1xuZXhwb3J0IHR5cGUgU3ltYm9sUXVhZCA9IHtcbiAgICB0bDogUG9pbnQsXG4gICAgdHI6IFBvaW50LFxuICAgIGJsOiBQb2ludCxcbiAgICBicjogUG9pbnQsXG4gICAgdGV4OiB7XG4gICAgICAgIHg6IG51bWJlcixcbiAgICAgICAgeTogbnVtYmVyLFxuICAgICAgICB3OiBudW1iZXIsXG4gICAgICAgIGg6IG51bWJlclxuICAgIH0sXG4gICAgd3JpdGluZ01vZGU6IGFueSB8IHZvaWQsXG4gICAgZ2x5cGhPZmZzZXQ6IFtudW1iZXIsIG51bWJlcl1cbn07XG5cbi8qKlxuICogQ3JlYXRlIHRoZSBxdWFkcyB1c2VkIGZvciByZW5kZXJpbmcgYW4gaWNvbi5cbiAqIEBwcml2YXRlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRJY29uUXVhZHMoYW5jaG9yOiBBbmNob3IsXG4gICAgICAgICAgICAgICAgICAgICAgc2hhcGVkSWNvbjogUG9zaXRpb25lZEljb24sXG4gICAgICAgICAgICAgICAgICAgICAgbGF5ZXI6IFN5bWJvbFN0eWxlTGF5ZXIsXG4gICAgICAgICAgICAgICAgICAgICAgYWxvbmdMaW5lOiBib29sZWFuLFxuICAgICAgICAgICAgICAgICAgICAgIHNoYXBlZFRleHQ6IFNoYXBpbmcsXG4gICAgICAgICAgICAgICAgICAgICAgZmVhdHVyZTogRmVhdHVyZSk6IEFycmF5PFN5bWJvbFF1YWQ+IHtcbiAgICBjb25zdCBpbWFnZSA9IHNoYXBlZEljb24uaW1hZ2U7XG4gICAgY29uc3QgbGF5b3V0ID0gbGF5ZXIubGF5b3V0O1xuXG4gICAgLy8gSWYgeW91IGhhdmUgYSAxMHB4IGljb24gdGhhdCBpc24ndCBwZXJmZWN0bHkgYWxpZ25lZCB0byB0aGUgcGl4ZWwgZ3JpZCBpdCB3aWxsIGNvdmVyIDExIGFjdHVhbFxuICAgIC8vIHBpeGVscy4gVGhlIHF1YWQgbmVlZHMgdG8gYmUgcGFkZGVkIHRvIGFjY291bnQgZm9yIHRoaXMsIG90aGVyd2lzZSB0aGV5J2xsIGxvb2sgc2xpZ2h0bHkgY2xpcHBlZFxuICAgIC8vIG9uIG9uZSBlZGdlIGluIHNvbWUgY2FzZXMuXG4gICAgY29uc3QgYm9yZGVyID0gMTtcblxuICAgIGNvbnN0IHRvcCA9IHNoYXBlZEljb24udG9wIC0gYm9yZGVyIC8gaW1hZ2UucGl4ZWxSYXRpbztcbiAgICBjb25zdCBsZWZ0ID0gc2hhcGVkSWNvbi5sZWZ0IC0gYm9yZGVyIC8gaW1hZ2UucGl4ZWxSYXRpbztcbiAgICBjb25zdCBib3R0b20gPSBzaGFwZWRJY29uLmJvdHRvbSArIGJvcmRlciAvIGltYWdlLnBpeGVsUmF0aW87XG4gICAgY29uc3QgcmlnaHQgPSBzaGFwZWRJY29uLnJpZ2h0ICsgYm9yZGVyIC8gaW1hZ2UucGl4ZWxSYXRpbztcbiAgICBsZXQgdGwsIHRyLCBiciwgYmw7XG5cbiAgICAvLyB0ZXh0LWZpdCBtb2RlXG4gICAgaWYgKGxheW91dC5nZXQoJ2ljb24tdGV4dC1maXQnKSAhPT0gJ25vbmUnICYmIHNoYXBlZFRleHQpIHtcbiAgICAgICAgY29uc3QgaWNvbldpZHRoID0gKHJpZ2h0IC0gbGVmdCksXG4gICAgICAgICAgICBpY29uSGVpZ2h0ID0gKGJvdHRvbSAtIHRvcCksXG4gICAgICAgICAgICBzaXplID0gbGF5b3V0LmdldCgndGV4dC1zaXplJykuZXZhbHVhdGUoZmVhdHVyZSwge30pIC8gMjQsXG4gICAgICAgICAgICB0ZXh0TGVmdCA9IHNoYXBlZFRleHQubGVmdCAqIHNpemUsXG4gICAgICAgICAgICB0ZXh0UmlnaHQgPSBzaGFwZWRUZXh0LnJpZ2h0ICogc2l6ZSxcbiAgICAgICAgICAgIHRleHRUb3AgPSBzaGFwZWRUZXh0LnRvcCAqIHNpemUsXG4gICAgICAgICAgICB0ZXh0Qm90dG9tID0gc2hhcGVkVGV4dC5ib3R0b20gKiBzaXplLFxuICAgICAgICAgICAgdGV4dFdpZHRoID0gdGV4dFJpZ2h0IC0gdGV4dExlZnQsXG4gICAgICAgICAgICB0ZXh0SGVpZ2h0ID0gdGV4dEJvdHRvbSAtIHRleHRUb3AsXG4gICAgICAgICAgICBwYWRUID0gbGF5b3V0LmdldCgnaWNvbi10ZXh0LWZpdC1wYWRkaW5nJylbMF0sXG4gICAgICAgICAgICBwYWRSID0gbGF5b3V0LmdldCgnaWNvbi10ZXh0LWZpdC1wYWRkaW5nJylbMV0sXG4gICAgICAgICAgICBwYWRCID0gbGF5b3V0LmdldCgnaWNvbi10ZXh0LWZpdC1wYWRkaW5nJylbMl0sXG4gICAgICAgICAgICBwYWRMID0gbGF5b3V0LmdldCgnaWNvbi10ZXh0LWZpdC1wYWRkaW5nJylbM10sXG4gICAgICAgICAgICBvZmZzZXRZID0gbGF5b3V0LmdldCgnaWNvbi10ZXh0LWZpdCcpID09PSAnd2lkdGgnID8gKHRleHRIZWlnaHQgLSBpY29uSGVpZ2h0KSAqIDAuNSA6IDAsXG4gICAgICAgICAgICBvZmZzZXRYID0gbGF5b3V0LmdldCgnaWNvbi10ZXh0LWZpdCcpID09PSAnaGVpZ2h0JyA/ICh0ZXh0V2lkdGggLSBpY29uV2lkdGgpICogMC41IDogMCxcbiAgICAgICAgICAgIHdpZHRoID0gbGF5b3V0LmdldCgnaWNvbi10ZXh0LWZpdCcpID09PSAnd2lkdGgnIHx8IGxheW91dC5nZXQoJ2ljb24tdGV4dC1maXQnKSA9PT0gJ2JvdGgnID8gdGV4dFdpZHRoIDogaWNvbldpZHRoLFxuICAgICAgICAgICAgaGVpZ2h0ID0gbGF5b3V0LmdldCgnaWNvbi10ZXh0LWZpdCcpID09PSAnaGVpZ2h0JyB8fCBsYXlvdXQuZ2V0KCdpY29uLXRleHQtZml0JykgPT09ICdib3RoJyA/IHRleHRIZWlnaHQgOiBpY29uSGVpZ2h0O1xuICAgICAgICB0bCA9IG5ldyBQb2ludCh0ZXh0TGVmdCArIG9mZnNldFggLSBwYWRMLCAgICAgICAgIHRleHRUb3AgKyBvZmZzZXRZIC0gcGFkVCk7XG4gICAgICAgIHRyID0gbmV3IFBvaW50KHRleHRMZWZ0ICsgb2Zmc2V0WCArIHBhZFIgKyB3aWR0aCwgdGV4dFRvcCArIG9mZnNldFkgLSBwYWRUKTtcbiAgICAgICAgYnIgPSBuZXcgUG9pbnQodGV4dExlZnQgKyBvZmZzZXRYICsgcGFkUiArIHdpZHRoLCB0ZXh0VG9wICsgb2Zmc2V0WSArIHBhZEIgKyBoZWlnaHQpO1xuICAgICAgICBibCA9IG5ldyBQb2ludCh0ZXh0TGVmdCArIG9mZnNldFggLSBwYWRMLCAgICAgICAgIHRleHRUb3AgKyBvZmZzZXRZICsgcGFkQiArIGhlaWdodCk7XG4gICAgLy8gTm9ybWFsIGljb24gc2l6ZSBtb2RlXG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGwgPSBuZXcgUG9pbnQobGVmdCwgdG9wKTtcbiAgICAgICAgdHIgPSBuZXcgUG9pbnQocmlnaHQsIHRvcCk7XG4gICAgICAgIGJyID0gbmV3IFBvaW50KHJpZ2h0LCBib3R0b20pO1xuICAgICAgICBibCA9IG5ldyBQb2ludChsZWZ0LCBib3R0b20pO1xuICAgIH1cblxuICAgIGNvbnN0IGFuZ2xlID0gbGF5ZXIubGF5b3V0LmdldCgnaWNvbi1yb3RhdGUnKS5ldmFsdWF0ZShmZWF0dXJlLCB7fSkgKiBNYXRoLlBJIC8gMTgwO1xuXG4gICAgaWYgKGFuZ2xlKSB7XG4gICAgICAgIGNvbnN0IHNpbiA9IE1hdGguc2luKGFuZ2xlKSxcbiAgICAgICAgICAgIGNvcyA9IE1hdGguY29zKGFuZ2xlKSxcbiAgICAgICAgICAgIG1hdHJpeCA9IFtjb3MsIC1zaW4sIHNpbiwgY29zXTtcblxuICAgICAgICB0bC5fbWF0TXVsdChtYXRyaXgpO1xuICAgICAgICB0ci5fbWF0TXVsdChtYXRyaXgpO1xuICAgICAgICBibC5fbWF0TXVsdChtYXRyaXgpO1xuICAgICAgICBici5fbWF0TXVsdChtYXRyaXgpO1xuICAgIH1cblxuICAgIC8vIEljb24gcXVhZCBpcyBwYWRkZWQsIHNvIHRleHR1cmUgY29vcmRpbmF0ZXMgYWxzbyBuZWVkIHRvIGJlIHBhZGRlZC5cbiAgICByZXR1cm4gW3t0bCwgdHIsIGJsLCBiciwgdGV4OiBpbWFnZS5wYWRkZWRSZWN0LCB3cml0aW5nTW9kZTogdW5kZWZpbmVkLCBnbHlwaE9mZnNldDogWzAsIDBdfV07XG59XG5cbi8qKlxuICogQ3JlYXRlIHRoZSBxdWFkcyB1c2VkIGZvciByZW5kZXJpbmcgYSB0ZXh0IGxhYmVsLlxuICogQHByaXZhdGVcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEdseXBoUXVhZHMoYW5jaG9yOiBBbmNob3IsXG4gICAgICAgICAgICAgICAgICAgICAgIHNoYXBpbmc6IFNoYXBpbmcsXG4gICAgICAgICAgICAgICAgICAgICAgIGxheWVyOiBTeW1ib2xTdHlsZUxheWVyLFxuICAgICAgICAgICAgICAgICAgICAgICBhbG9uZ0xpbmU6IGJvb2xlYW4sXG4gICAgICAgICAgICAgICAgICAgICAgIGZlYXR1cmU6IEZlYXR1cmUsXG4gICAgICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uczoge1tzdHJpbmddOiB7W251bWJlcl06IEdseXBoUG9zaXRpb259fSk6IEFycmF5PFN5bWJvbFF1YWQ+IHtcblxuICAgIGNvbnN0IG9uZUVtID0gMjQ7XG4gICAgY29uc3QgdGV4dFJvdGF0ZSA9IGxheWVyLmxheW91dC5nZXQoJ3RleHQtcm90YXRlJykuZXZhbHVhdGUoZmVhdHVyZSwge30pICogTWF0aC5QSSAvIDE4MDtcbiAgICBjb25zdCB0ZXh0T2Zmc2V0ID0gbGF5ZXIubGF5b3V0LmdldCgndGV4dC1vZmZzZXQnKS5ldmFsdWF0ZShmZWF0dXJlLCB7fSkubWFwKCh0KT0+IHQgKiBvbmVFbSk7XG5cbiAgICBjb25zdCBwb3NpdGlvbmVkR2x5cGhzID0gc2hhcGluZy5wb3NpdGlvbmVkR2x5cGhzO1xuICAgIGNvbnN0IHF1YWRzID0gW107XG5cblxuICAgIGZvciAobGV0IGsgPSAwOyBrIDwgcG9zaXRpb25lZEdseXBocy5sZW5ndGg7IGsrKykge1xuICAgICAgICBjb25zdCBwb3NpdGlvbmVkR2x5cGggPSBwb3NpdGlvbmVkR2x5cGhzW2tdO1xuICAgICAgICBjb25zdCBnbHlwaFBvc2l0aW9ucyA9IHBvc2l0aW9uc1twb3NpdGlvbmVkR2x5cGguZm9udFN0YWNrXTtcbiAgICAgICAgY29uc3QgZ2x5cGggPSBnbHlwaFBvc2l0aW9ucyAmJiBnbHlwaFBvc2l0aW9uc1twb3NpdGlvbmVkR2x5cGguZ2x5cGhdO1xuICAgICAgICBpZiAoIWdseXBoKSBjb250aW51ZTtcblxuICAgICAgICBjb25zdCByZWN0ID0gZ2x5cGgucmVjdDtcbiAgICAgICAgaWYgKCFyZWN0KSBjb250aW51ZTtcblxuICAgICAgICAvLyBUaGUgcmVjdHMgaGF2ZSBhbiBhZGRkaXRpb25hbCBidWZmZXIgdGhhdCBpcyBub3QgaW5jbHVkZWQgaW4gdGhlaXIgc2l6ZS5cbiAgICAgICAgY29uc3QgZ2x5cGhQYWRkaW5nID0gMS4wO1xuICAgICAgICBjb25zdCByZWN0QnVmZmVyID0gR0xZUEhfUEJGX0JPUkRFUiArIGdseXBoUGFkZGluZztcblxuICAgICAgICBjb25zdCBoYWxmQWR2YW5jZSA9IGdseXBoLm1ldHJpY3MuYWR2YW5jZSAqIHBvc2l0aW9uZWRHbHlwaC5zY2FsZSAvIDI7XG5cbiAgICAgICAgY29uc3QgZ2x5cGhPZmZzZXQgPSBhbG9uZ0xpbmUgP1xuICAgICAgICAgICAgW3Bvc2l0aW9uZWRHbHlwaC54ICsgaGFsZkFkdmFuY2UsIHBvc2l0aW9uZWRHbHlwaC55XSA6XG4gICAgICAgICAgICBbMCwgMF07XG5cbiAgICAgICAgY29uc3QgYnVpbHRJbk9mZnNldCA9IGFsb25nTGluZSA/XG4gICAgICAgICAgICBbMCwgMF0gOlxuICAgICAgICAgICAgW3Bvc2l0aW9uZWRHbHlwaC54ICsgaGFsZkFkdmFuY2UgKyB0ZXh0T2Zmc2V0WzBdLCBwb3NpdGlvbmVkR2x5cGgueSArIHRleHRPZmZzZXRbMV1dO1xuXG4gICAgICAgIGNvbnN0IHgxID0gKGdseXBoLm1ldHJpY3MubGVmdCAtIHJlY3RCdWZmZXIpICogcG9zaXRpb25lZEdseXBoLnNjYWxlIC0gaGFsZkFkdmFuY2UgKyBidWlsdEluT2Zmc2V0WzBdO1xuICAgICAgICBjb25zdCB5MSA9ICgtZ2x5cGgubWV0cmljcy50b3AgLSByZWN0QnVmZmVyKSAqIHBvc2l0aW9uZWRHbHlwaC5zY2FsZSArIGJ1aWx0SW5PZmZzZXRbMV07XG4gICAgICAgIGNvbnN0IHgyID0geDEgKyByZWN0LncgKiBwb3NpdGlvbmVkR2x5cGguc2NhbGU7XG4gICAgICAgIGNvbnN0IHkyID0geTEgKyByZWN0LmggKiBwb3NpdGlvbmVkR2x5cGguc2NhbGU7XG5cbiAgICAgICAgY29uc3QgdGwgPSBuZXcgUG9pbnQoeDEsIHkxKTtcbiAgICAgICAgY29uc3QgdHIgPSBuZXcgUG9pbnQoeDIsIHkxKTtcbiAgICAgICAgY29uc3QgYmwgID0gbmV3IFBvaW50KHgxLCB5Mik7XG4gICAgICAgIGNvbnN0IGJyID0gbmV3IFBvaW50KHgyLCB5Mik7XG5cbiAgICAgICAgaWYgKGFsb25nTGluZSAmJiBwb3NpdGlvbmVkR2x5cGgudmVydGljYWwpIHtcbiAgICAgICAgICAgIC8vIFZlcnRpY2FsLXN1cHBvcnRpbmcgZ2x5cGhzIGFyZSBsYWlkIG91dCBpbiAyNHgyNCBwb2ludCBib3hlcyAoMSBzcXVhcmUgZW0pXG4gICAgICAgICAgICAvLyBJbiBob3Jpem9udGFsIG9yaWVudGF0aW9uLCB0aGUgeSB2YWx1ZXMgZm9yIGdseXBocyBhcmUgYmVsb3cgdGhlIG1pZGxpbmVcbiAgICAgICAgICAgIC8vIGFuZCB3ZSB1c2UgYSBcInlPZmZzZXRcIiBvZiAtMTcgdG8gcHVsbCB0aGVtIHVwIHRvIHRoZSBtaWRkbGUuXG4gICAgICAgICAgICAvLyBCeSByb3RhdGluZyBjb3VudGVyLWNsb2Nrd2lzZSBhcm91bmQgdGhlIHBvaW50IGF0IHRoZSBjZW50ZXIgb2YgdGhlIGxlZnRcbiAgICAgICAgICAgIC8vIGVkZ2Ugb2YgYSAyNHgyNCBsYXlvdXQgYm94IGNlbnRlcmVkIGJlbG93IHRoZSBtaWRsaW5lLCB3ZSBhbGlnbiB0aGUgY2VudGVyXG4gICAgICAgICAgICAvLyBvZiB0aGUgZ2x5cGhzIHdpdGggdGhlIGhvcml6b250YWwgbWlkbGluZSwgc28gdGhlIHlPZmZzZXQgaXMgbm8gbG9uZ2VyXG4gICAgICAgICAgICAvLyBuZWNlc3NhcnksIGJ1dCB3ZSBhbHNvIHB1bGwgdGhlIGdseXBoIHRvIHRoZSBsZWZ0IGFsb25nIHRoZSB4IGF4aXNcbiAgICAgICAgICAgIGNvbnN0IGNlbnRlciA9IG5ldyBQb2ludCgtaGFsZkFkdmFuY2UsIGhhbGZBZHZhbmNlKTtcbiAgICAgICAgICAgIGNvbnN0IHZlcnRpY2FsUm90YXRpb24gPSAtTWF0aC5QSSAvIDI7XG4gICAgICAgICAgICBjb25zdCB4T2Zmc2V0Q29ycmVjdGlvbiA9IG5ldyBQb2ludCg1LCAwKTtcbiAgICAgICAgICAgIHRsLl9yb3RhdGVBcm91bmQodmVydGljYWxSb3RhdGlvbiwgY2VudGVyKS5fYWRkKHhPZmZzZXRDb3JyZWN0aW9uKTtcbiAgICAgICAgICAgIHRyLl9yb3RhdGVBcm91bmQodmVydGljYWxSb3RhdGlvbiwgY2VudGVyKS5fYWRkKHhPZmZzZXRDb3JyZWN0aW9uKTtcbiAgICAgICAgICAgIGJsLl9yb3RhdGVBcm91bmQodmVydGljYWxSb3RhdGlvbiwgY2VudGVyKS5fYWRkKHhPZmZzZXRDb3JyZWN0aW9uKTtcbiAgICAgICAgICAgIGJyLl9yb3RhdGVBcm91bmQodmVydGljYWxSb3RhdGlvbiwgY2VudGVyKS5fYWRkKHhPZmZzZXRDb3JyZWN0aW9uKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0ZXh0Um90YXRlKSB7XG4gICAgICAgICAgICBjb25zdCBzaW4gPSBNYXRoLnNpbih0ZXh0Um90YXRlKSxcbiAgICAgICAgICAgICAgICBjb3MgPSBNYXRoLmNvcyh0ZXh0Um90YXRlKSxcbiAgICAgICAgICAgICAgICBtYXRyaXggPSBbY29zLCAtc2luLCBzaW4sIGNvc107XG5cbiAgICAgICAgICAgIHRsLl9tYXRNdWx0KG1hdHJpeCk7XG4gICAgICAgICAgICB0ci5fbWF0TXVsdChtYXRyaXgpO1xuICAgICAgICAgICAgYmwuX21hdE11bHQobWF0cml4KTtcbiAgICAgICAgICAgIGJyLl9tYXRNdWx0KG1hdHJpeCk7XG4gICAgICAgIH1cblxuICAgICAgICBxdWFkcy5wdXNoKHt0bCwgdHIsIGJsLCBiciwgdGV4OiByZWN0LCB3cml0aW5nTW9kZTogc2hhcGluZy53cml0aW5nTW9kZSwgZ2x5cGhPZmZzZXR9KTtcbiAgICB9XG5cbiAgICByZXR1cm4gcXVhZHM7XG59XG4iLCIvLyBAZmxvd1xuXG5pbXBvcnQgdHlwZSB7Q29sbGlzaW9uQm94QXJyYXl9IGZyb20gJy4uL2RhdGEvYXJyYXlfdHlwZXMnO1xuaW1wb3J0IFBvaW50IGZyb20gJ0BtYXBib3gvcG9pbnQtZ2VvbWV0cnknO1xuaW1wb3J0IHR5cGUgQW5jaG9yIGZyb20gJy4vYW5jaG9yJztcblxuLyoqXG4gKiBBIENvbGxpc2lvbkZlYXR1cmUgcmVwcmVzZW50cyB0aGUgYXJlYSBvZiB0aGUgdGlsZSBjb3ZlcmVkIGJ5IGEgc2luZ2xlIGxhYmVsLlxuICogSXQgaXMgdXNlZCB3aXRoIENvbGxpc2lvbkluZGV4IHRvIGNoZWNrIGlmIHRoZSBsYWJlbCBvdmVybGFwcyB3aXRoIGFueVxuICogcHJldmlvdXMgbGFiZWxzLiBBIENvbGxpc2lvbkZlYXR1cmUgaXMgbW9zdGx5IGp1c3QgYSBzZXQgb2YgQ29sbGlzaW9uQm94XG4gKiBvYmplY3RzLlxuICpcbiAqIEBwcml2YXRlXG4gKi9cbmNsYXNzIENvbGxpc2lvbkZlYXR1cmUge1xuICAgIGJveFN0YXJ0SW5kZXg6IG51bWJlcjtcbiAgICBib3hFbmRJbmRleDogbnVtYmVyO1xuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlIGEgQ29sbGlzaW9uRmVhdHVyZSwgYWRkaW5nIGl0cyBjb2xsaXNpb24gYm94IGRhdGEgdG8gdGhlIGdpdmVuIGNvbGxpc2lvbkJveEFycmF5IGluIHRoZSBwcm9jZXNzLlxuICAgICAqXG4gICAgICogQHBhcmFtIGxpbmUgVGhlIGdlb21ldHJ5IHRoZSBsYWJlbCBpcyBwbGFjZWQgb24uXG4gICAgICogQHBhcmFtIGFuY2hvciBUaGUgcG9pbnQgYWxvbmcgdGhlIGxpbmUgYXJvdW5kIHdoaWNoIHRoZSBsYWJlbCBpcyBhbmNob3JlZC5cbiAgICAgKiBAcGFyYW0gc2hhcGVkIFRoZSB0ZXh0IG9yIGljb24gc2hhcGluZyByZXN1bHRzLlxuICAgICAqIEBwYXJhbSBib3hTY2FsZSBBIG1hZ2ljIG51bWJlciB1c2VkIHRvIGNvbnZlcnQgZnJvbSBnbHlwaCBtZXRyaWNzIHVuaXRzIHRvIGdlb21ldHJ5IHVuaXRzLlxuICAgICAqIEBwYXJhbSBwYWRkaW5nIFRoZSBhbW91bnQgb2YgcGFkZGluZyB0byBhZGQgYXJvdW5kIHRoZSBsYWJlbCBlZGdlcy5cbiAgICAgKiBAcGFyYW0gYWxpZ25MaW5lIFdoZXRoZXIgdGhlIGxhYmVsIGlzIGFsaWduZWQgd2l0aCB0aGUgbGluZSBvciB0aGUgdmlld3BvcnQuXG4gICAgICovXG4gICAgY29uc3RydWN0b3IoY29sbGlzaW9uQm94QXJyYXk6IENvbGxpc2lvbkJveEFycmF5LFxuICAgICAgICAgICAgICAgIGxpbmU6IEFycmF5PFBvaW50PixcbiAgICAgICAgICAgICAgICBhbmNob3I6IEFuY2hvcixcbiAgICAgICAgICAgICAgICBmZWF0dXJlSW5kZXg6IG51bWJlcixcbiAgICAgICAgICAgICAgICBzb3VyY2VMYXllckluZGV4OiBudW1iZXIsXG4gICAgICAgICAgICAgICAgYnVja2V0SW5kZXg6IG51bWJlcixcbiAgICAgICAgICAgICAgICBzaGFwZWQ6IE9iamVjdCxcbiAgICAgICAgICAgICAgICBib3hTY2FsZTogbnVtYmVyLFxuICAgICAgICAgICAgICAgIHBhZGRpbmc6IG51bWJlcixcbiAgICAgICAgICAgICAgICBhbGlnbkxpbmU6IGJvb2xlYW4sXG4gICAgICAgICAgICAgICAgb3ZlcnNjYWxpbmc6IG51bWJlcixcbiAgICAgICAgICAgICAgICByb3RhdGU6IG51bWJlcikge1xuICAgICAgICBsZXQgeTEgPSBzaGFwZWQudG9wICogYm94U2NhbGUgLSBwYWRkaW5nO1xuICAgICAgICBsZXQgeTIgPSBzaGFwZWQuYm90dG9tICogYm94U2NhbGUgKyBwYWRkaW5nO1xuICAgICAgICBsZXQgeDEgPSBzaGFwZWQubGVmdCAqIGJveFNjYWxlIC0gcGFkZGluZztcbiAgICAgICAgbGV0IHgyID0gc2hhcGVkLnJpZ2h0ICogYm94U2NhbGUgKyBwYWRkaW5nO1xuXG4gICAgICAgIHRoaXMuYm94U3RhcnRJbmRleCA9IGNvbGxpc2lvbkJveEFycmF5Lmxlbmd0aDtcblxuICAgICAgICBpZiAoYWxpZ25MaW5lKSB7XG5cbiAgICAgICAgICAgIGxldCBoZWlnaHQgPSB5MiAtIHkxO1xuICAgICAgICAgICAgY29uc3QgbGVuZ3RoID0geDIgLSB4MTtcblxuICAgICAgICAgICAgaWYgKGhlaWdodCA+IDApIHtcbiAgICAgICAgICAgICAgICAvLyBzZXQgbWluaW11bSBib3ggaGVpZ2h0IHRvIGF2b2lkIHZlcnkgbWFueSBzbWFsbCBsYWJlbHNcbiAgICAgICAgICAgICAgICBoZWlnaHQgPSBNYXRoLm1heCgxMCAqIGJveFNjYWxlLCBoZWlnaHQpO1xuXG4gICAgICAgICAgICAgICAgdGhpcy5fYWRkTGluZUNvbGxpc2lvbkNpcmNsZXMoY29sbGlzaW9uQm94QXJyYXksIGxpbmUsIGFuY2hvciwgKGFuY2hvci5zZWdtZW50OiBhbnkpLCBsZW5ndGgsIGhlaWdodCwgZmVhdHVyZUluZGV4LCBzb3VyY2VMYXllckluZGV4LCBidWNrZXRJbmRleCwgb3ZlcnNjYWxpbmcpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAocm90YXRlKSB7XG4gICAgICAgICAgICAgICAgLy8gQWNjb3VudCBmb3IgKi1yb3RhdGUgaW4gcG9pbnQgY29sbGlzaW9uIGJveGVzXG4gICAgICAgICAgICAgICAgLy8gU2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9tYXBib3gvbWFwYm94LWdsLWpzL2lzc3Vlcy82MDc1XG4gICAgICAgICAgICAgICAgLy8gRG9lc24ndCBhY2NvdW50IGZvciBpY29uLXRleHQtZml0XG5cbiAgICAgICAgICAgICAgICBjb25zdCB0bCA9IG5ldyBQb2ludCh4MSwgeTEpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHRyID0gbmV3IFBvaW50KHgyLCB5MSk7XG4gICAgICAgICAgICAgICAgY29uc3QgYmwgPSBuZXcgUG9pbnQoeDEsIHkyKTtcbiAgICAgICAgICAgICAgICBjb25zdCBiciA9IG5ldyBQb2ludCh4MiwgeTIpO1xuXG4gICAgICAgICAgICAgICAgY29uc3Qgcm90YXRlUmFkaWFucyA9IHJvdGF0ZSAqIE1hdGguUEkgLyAxODA7XG5cbiAgICAgICAgICAgICAgICB0bC5fcm90YXRlKHJvdGF0ZVJhZGlhbnMpO1xuICAgICAgICAgICAgICAgIHRyLl9yb3RhdGUocm90YXRlUmFkaWFucyk7XG4gICAgICAgICAgICAgICAgYmwuX3JvdGF0ZShyb3RhdGVSYWRpYW5zKTtcbiAgICAgICAgICAgICAgICBici5fcm90YXRlKHJvdGF0ZVJhZGlhbnMpO1xuXG4gICAgICAgICAgICAgICAgLy8gQ29sbGlzaW9uIGZlYXR1cmVzIHJlcXVpcmUgYW4gXCJvbi1heGlzXCIgZ2VvbWV0cnksXG4gICAgICAgICAgICAgICAgLy8gc28gdGFrZSB0aGUgZW52ZWxvcGUgb2YgdGhlIHJvdGF0ZWQgZ2VvbWV0cnlcbiAgICAgICAgICAgICAgICAvLyAobWF5IGJlIHF1aXRlIGxhcmdlIGZvciB3aWRlIGxhYmVscyByb3RhdGVkIDQ1IGRlZ3JlZXMpXG4gICAgICAgICAgICAgICAgeDEgPSBNYXRoLm1pbih0bC54LCB0ci54LCBibC54LCBici54KTtcbiAgICAgICAgICAgICAgICB4MiA9IE1hdGgubWF4KHRsLngsIHRyLngsIGJsLngsIGJyLngpO1xuICAgICAgICAgICAgICAgIHkxID0gTWF0aC5taW4odGwueSwgdHIueSwgYmwueSwgYnIueSk7XG4gICAgICAgICAgICAgICAgeTIgPSBNYXRoLm1heCh0bC55LCB0ci55LCBibC55LCBici55KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbGxpc2lvbkJveEFycmF5LmVtcGxhY2VCYWNrKGFuY2hvci54LCBhbmNob3IueSwgeDEsIHkxLCB4MiwgeTIsIGZlYXR1cmVJbmRleCwgc291cmNlTGF5ZXJJbmRleCwgYnVja2V0SW5kZXgsXG4gICAgICAgICAgICAgICAgMCwgMCk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmJveEVuZEluZGV4ID0gY29sbGlzaW9uQm94QXJyYXkubGVuZ3RoO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENyZWF0ZSBhIHNldCBvZiBDb2xsaXNpb25Cb3ggb2JqZWN0cyBmb3IgYSBsaW5lLlxuICAgICAqXG4gICAgICogQHBhcmFtIGxhYmVsTGVuZ3RoIFRoZSBsZW5ndGggb2YgdGhlIGxhYmVsIGluIGdlb21ldHJ5IHVuaXRzLlxuICAgICAqIEBwYXJhbSBhbmNob3IgVGhlIHBvaW50IGFsb25nIHRoZSBsaW5lIGFyb3VuZCB3aGljaCB0aGUgbGFiZWwgaXMgYW5jaG9yZWQuXG4gICAgICogQHBhcmFtIGJveFNpemUgVGhlIHNpemUgb2YgdGhlIGNvbGxpc2lvbiBib3hlcyB0aGF0IHdpbGwgYmUgY3JlYXRlZC5cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9hZGRMaW5lQ29sbGlzaW9uQ2lyY2xlcyhjb2xsaXNpb25Cb3hBcnJheTogQ29sbGlzaW9uQm94QXJyYXksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBsaW5lOiBBcnJheTxQb2ludD4sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBhbmNob3I6IEFuY2hvcixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlZ21lbnQ6IG51bWJlcixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGxhYmVsTGVuZ3RoOiBudW1iZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBib3hTaXplOiBudW1iZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBmZWF0dXJlSW5kZXg6IG51bWJlcixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHNvdXJjZUxheWVySW5kZXg6IG51bWJlcixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGJ1Y2tldEluZGV4OiBudW1iZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBvdmVyc2NhbGluZzogbnVtYmVyKSB7XG4gICAgICAgIGNvbnN0IHN0ZXAgPSBib3hTaXplIC8gMjtcbiAgICAgICAgY29uc3QgbkJveGVzID0gTWF0aC5mbG9vcihsYWJlbExlbmd0aCAvIHN0ZXApIHx8IDE7XG4gICAgICAgIC8vIFdlIGNhbGN1bGF0ZSBsaW5lIGNvbGxpc2lvbiBjaXJjbGVzIG91dCB0byAzMDAlIG9mIHdoYXQgd291bGQgbm9ybWFsbHkgYmUgb3VyXG4gICAgICAgIC8vIG1heCBzaXplLCB0byBhbGxvdyBjb2xsaXNpb24gZGV0ZWN0aW9uIHRvIHdvcmsgb24gbGFiZWxzIHRoYXQgZXhwYW5kIGFzXG4gICAgICAgIC8vIHRoZXkgbW92ZSBpbnRvIHRoZSBkaXN0YW5jZVxuICAgICAgICAvLyBWZXJ0aWNhbGx5IG9yaWVudGVkIGxhYmVscyBpbiB0aGUgZGlzdGFudCBmaWVsZCBjYW4gZXh0ZW5kIHBhc3QgdGhpcyBwYWRkaW5nXG4gICAgICAgIC8vIFRoaXMgaXMgYSBub3RpY2VhYmxlIHByb2JsZW0gaW4gb3ZlcnNjYWxlZCB0aWxlcyB3aGVyZSB0aGUgcGl0Y2ggMC1iYXNlZFxuICAgICAgICAvLyBzeW1ib2wgc3BhY2luZyB3aWxsIHB1dCBsYWJlbHMgdmVyeSBjbG9zZSB0b2dldGhlciBpbiBhIHBpdGNoZWQgbWFwLlxuICAgICAgICAvLyBUbyByZWR1Y2UgdGhlIGNvc3Qgb2YgYWRkaW5nIGV4dHJhIGNvbGxpc2lvbiBjaXJjbGVzLCB3ZSBzbG93bHkgaW5jcmVhc2VcbiAgICAgICAgLy8gdGhlbSBmb3Igb3ZlcnNjYWxlZCB0aWxlcy5cbiAgICAgICAgY29uc3Qgb3ZlcnNjYWxpbmdQYWRkaW5nRmFjdG9yID0gMSArIC40ICogTWF0aC5sb2cob3ZlcnNjYWxpbmcpIC8gTWF0aC5MTjI7XG4gICAgICAgIGNvbnN0IG5QaXRjaFBhZGRpbmdCb3hlcyA9IE1hdGguZmxvb3IobkJveGVzICogb3ZlcnNjYWxpbmdQYWRkaW5nRmFjdG9yIC8gMik7XG5cbiAgICAgICAgLy8gb2Zmc2V0IHRoZSBjZW50ZXIgb2YgdGhlIGZpcnN0IGJveCBieSBoYWxmIGEgYm94IHNvIHRoYXQgdGhlIGVkZ2Ugb2YgdGhlXG4gICAgICAgIC8vIGJveCBpcyBhdCB0aGUgZWRnZSBvZiB0aGUgbGFiZWwuXG4gICAgICAgIGNvbnN0IGZpcnN0Qm94T2Zmc2V0ID0gLWJveFNpemUgLyAyO1xuXG4gICAgICAgIGxldCBwID0gYW5jaG9yO1xuICAgICAgICBsZXQgaW5kZXggPSBzZWdtZW50ICsgMTtcbiAgICAgICAgbGV0IGFuY2hvckRpc3RhbmNlID0gZmlyc3RCb3hPZmZzZXQ7XG4gICAgICAgIGNvbnN0IGxhYmVsU3RhcnREaXN0YW5jZSA9IC1sYWJlbExlbmd0aCAvIDI7XG4gICAgICAgIGNvbnN0IHBhZGRpbmdTdGFydERpc3RhbmNlID0gbGFiZWxTdGFydERpc3RhbmNlIC0gbGFiZWxMZW5ndGggLyA0O1xuICAgICAgICAvLyBtb3ZlIGJhY2t3YXJkcyBhbG9uZyB0aGUgbGluZSB0byB0aGUgZmlyc3Qgc2VnbWVudCB0aGUgbGFiZWwgYXBwZWFycyBvblxuICAgICAgICBkbyB7XG4gICAgICAgICAgICBpbmRleC0tO1xuXG4gICAgICAgICAgICBpZiAoaW5kZXggPCAwKSB7XG4gICAgICAgICAgICAgICAgaWYgKGFuY2hvckRpc3RhbmNlID4gbGFiZWxTdGFydERpc3RhbmNlKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIHRoZXJlIGlzbid0IGVub3VnaCByb29tIGZvciB0aGUgbGFiZWwgYWZ0ZXIgdGhlIGJlZ2lubmluZyBvZiB0aGUgbGluZVxuICAgICAgICAgICAgICAgICAgICAvLyBjaGVja01heEFuZ2xlIHNob3VsZCBoYXZlIGFscmVhZHkgY2F1Z2h0IHRoaXNcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFRoZSBsaW5lIGRvZXNuJ3QgZXh0ZW5kIGZhciBlbm91Z2ggYmFjayBmb3IgYWxsIG9mIG91ciBwYWRkaW5nLFxuICAgICAgICAgICAgICAgICAgICAvLyBidXQgd2UgZ290IGZhciBlbm91Z2ggdG8gc2hvdyB0aGUgbGFiZWwgdW5kZXIgbW9zdCBjb25kaXRpb25zLlxuICAgICAgICAgICAgICAgICAgICBpbmRleCA9IDA7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgYW5jaG9yRGlzdGFuY2UgLT0gbGluZVtpbmRleF0uZGlzdChwKTtcbiAgICAgICAgICAgICAgICBwID0gbGluZVtpbmRleF07XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gd2hpbGUgKGFuY2hvckRpc3RhbmNlID4gcGFkZGluZ1N0YXJ0RGlzdGFuY2UpO1xuXG4gICAgICAgIGxldCBzZWdtZW50TGVuZ3RoID0gbGluZVtpbmRleF0uZGlzdChsaW5lW2luZGV4ICsgMV0pO1xuXG4gICAgICAgIGZvciAobGV0IGkgPSAtblBpdGNoUGFkZGluZ0JveGVzOyBpIDwgbkJveGVzICsgblBpdGNoUGFkZGluZ0JveGVzOyBpKyspIHtcblxuICAgICAgICAgICAgLy8gdGhlIGRpc3RhbmNlIHRoZSBib3ggd2lsbCBiZSBmcm9tIHRoZSBhbmNob3JcbiAgICAgICAgICAgIGNvbnN0IGJveE9mZnNldCA9IGkgKiBzdGVwO1xuICAgICAgICAgICAgbGV0IGJveERpc3RhbmNlVG9BbmNob3IgPSBsYWJlbFN0YXJ0RGlzdGFuY2UgKyBib3hPZmZzZXQ7XG5cbiAgICAgICAgICAgIC8vIG1ha2UgdGhlIGRpc3RhbmNlIGJldHdlZW4gcGl0Y2ggcGFkZGluZyBib3hlcyBiaWdnZXJcbiAgICAgICAgICAgIGlmIChib3hPZmZzZXQgPCAwKSBib3hEaXN0YW5jZVRvQW5jaG9yICs9IGJveE9mZnNldDtcbiAgICAgICAgICAgIGlmIChib3hPZmZzZXQgPiBsYWJlbExlbmd0aCkgYm94RGlzdGFuY2VUb0FuY2hvciArPSBib3hPZmZzZXQgLSBsYWJlbExlbmd0aDtcblxuICAgICAgICAgICAgaWYgKGJveERpc3RhbmNlVG9BbmNob3IgPCBhbmNob3JEaXN0YW5jZSkge1xuICAgICAgICAgICAgICAgIC8vIFRoZSBsaW5lIGRvZXNuJ3QgZXh0ZW5kIGZhciBlbm91Z2ggYmFjayBmb3IgdGhpcyBib3gsIHNraXAgaXRcbiAgICAgICAgICAgICAgICAvLyAoVGhpcyBjb3VsZCBhbGxvdyBmb3IgbGluZSBjb2xsaXNpb25zIG9uIGRpc3RhbnQgdGlsZXMpXG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIHRoZSBib3ggaXMgbm90IG9uIHRoZSBjdXJyZW50IHNlZ21lbnQuIE1vdmUgdG8gdGhlIG5leHQgc2VnbWVudC5cbiAgICAgICAgICAgIHdoaWxlIChhbmNob3JEaXN0YW5jZSArIHNlZ21lbnRMZW5ndGggPCBib3hEaXN0YW5jZVRvQW5jaG9yKSB7XG4gICAgICAgICAgICAgICAgYW5jaG9yRGlzdGFuY2UgKz0gc2VnbWVudExlbmd0aDtcbiAgICAgICAgICAgICAgICBpbmRleCsrO1xuXG4gICAgICAgICAgICAgICAgLy8gVGhlcmUgaXNuJ3QgZW5vdWdoIHJvb20gYmVmb3JlIHRoZSBlbmQgb2YgdGhlIGxpbmUuXG4gICAgICAgICAgICAgICAgaWYgKGluZGV4ICsgMSA+PSBsaW5lLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgc2VnbWVudExlbmd0aCA9IGxpbmVbaW5kZXhdLmRpc3QobGluZVtpbmRleCArIDFdKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gdGhlIGRpc3RhbmNlIHRoZSBib3ggd2lsbCBiZSBmcm9tIHRoZSBiZWdpbm5pbmcgb2YgdGhlIHNlZ21lbnRcbiAgICAgICAgICAgIGNvbnN0IHNlZ21lbnRCb3hEaXN0YW5jZSA9IGJveERpc3RhbmNlVG9BbmNob3IgLSBhbmNob3JEaXN0YW5jZTtcblxuICAgICAgICAgICAgY29uc3QgcDAgPSBsaW5lW2luZGV4XTtcbiAgICAgICAgICAgIGNvbnN0IHAxID0gbGluZVtpbmRleCArIDFdO1xuICAgICAgICAgICAgY29uc3QgYm94QW5jaG9yUG9pbnQgPSBwMS5zdWIocDApLl91bml0KCkuX211bHQoc2VnbWVudEJveERpc3RhbmNlKS5fYWRkKHAwKS5fcm91bmQoKTtcblxuICAgICAgICAgICAgLy8gSWYgdGhlIGJveCBpcyB3aXRoaW4gYm94U2l6ZSBvZiB0aGUgYW5jaG9yLCBmb3JjZSB0aGUgYm94IHRvIGJlIHVzZWRcbiAgICAgICAgICAgIC8vIChzbyBldmVuIDAtd2lkdGggbGFiZWxzIHVzZSBhdCBsZWFzdCBvbmUgYm94KVxuICAgICAgICAgICAgLy8gT3RoZXJ3aXNlLCB0aGUgLjggbXVsdGlwbGljYXRpb24gZ2l2ZXMgdXMgYSBsaXR0bGUgYml0IG9mIGNvbnNlcnZhdGl2ZVxuICAgICAgICAgICAgLy8gcGFkZGluZyBpbiBjaG9vc2luZyB3aGljaCBib3hlcyB0byB1c2UgKHNlZSBDb2xsaXNpb25JbmRleCNwbGFjZWRDb2xsaXNpb25DaXJjbGVzKVxuICAgICAgICAgICAgY29uc3QgcGFkZGVkQW5jaG9yRGlzdGFuY2UgPSBNYXRoLmFicyhib3hEaXN0YW5jZVRvQW5jaG9yIC0gZmlyc3RCb3hPZmZzZXQpIDwgc3RlcCA/XG4gICAgICAgICAgICAgICAgMCA6XG4gICAgICAgICAgICAgICAgKGJveERpc3RhbmNlVG9BbmNob3IgLSBmaXJzdEJveE9mZnNldCkgKiAwLjg7XG5cbiAgICAgICAgICAgIGNvbGxpc2lvbkJveEFycmF5LmVtcGxhY2VCYWNrKGJveEFuY2hvclBvaW50LngsIGJveEFuY2hvclBvaW50LnksXG4gICAgICAgICAgICAgICAgLWJveFNpemUgLyAyLCAtYm94U2l6ZSAvIDIsIGJveFNpemUgLyAyLCBib3hTaXplIC8gMixcbiAgICAgICAgICAgICAgICBmZWF0dXJlSW5kZXgsIHNvdXJjZUxheWVySW5kZXgsIGJ1Y2tldEluZGV4LFxuICAgICAgICAgICAgICAgIGJveFNpemUgLyAyLCBwYWRkZWRBbmNob3JEaXN0YW5jZSk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IENvbGxpc2lvbkZlYXR1cmU7XG4iLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0gVGlueVF1ZXVlO1xubW9kdWxlLmV4cG9ydHMuZGVmYXVsdCA9IFRpbnlRdWV1ZTtcblxuZnVuY3Rpb24gVGlueVF1ZXVlKGRhdGEsIGNvbXBhcmUpIHtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgVGlueVF1ZXVlKSkgcmV0dXJuIG5ldyBUaW55UXVldWUoZGF0YSwgY29tcGFyZSk7XG5cbiAgICB0aGlzLmRhdGEgPSBkYXRhIHx8IFtdO1xuICAgIHRoaXMubGVuZ3RoID0gdGhpcy5kYXRhLmxlbmd0aDtcbiAgICB0aGlzLmNvbXBhcmUgPSBjb21wYXJlIHx8IGRlZmF1bHRDb21wYXJlO1xuXG4gICAgaWYgKHRoaXMubGVuZ3RoID4gMCkge1xuICAgICAgICBmb3IgKHZhciBpID0gKHRoaXMubGVuZ3RoID4+IDEpIC0gMTsgaSA+PSAwOyBpLS0pIHRoaXMuX2Rvd24oaSk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBkZWZhdWx0Q29tcGFyZShhLCBiKSB7XG4gICAgcmV0dXJuIGEgPCBiID8gLTEgOiBhID4gYiA/IDEgOiAwO1xufVxuXG5UaW55UXVldWUucHJvdG90eXBlID0ge1xuXG4gICAgcHVzaDogZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgICAgdGhpcy5kYXRhLnB1c2goaXRlbSk7XG4gICAgICAgIHRoaXMubGVuZ3RoKys7XG4gICAgICAgIHRoaXMuX3VwKHRoaXMubGVuZ3RoIC0gMSk7XG4gICAgfSxcblxuICAgIHBvcDogZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAodGhpcy5sZW5ndGggPT09IDApIHJldHVybiB1bmRlZmluZWQ7XG5cbiAgICAgICAgdmFyIHRvcCA9IHRoaXMuZGF0YVswXTtcbiAgICAgICAgdGhpcy5sZW5ndGgtLTtcblxuICAgICAgICBpZiAodGhpcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICB0aGlzLmRhdGFbMF0gPSB0aGlzLmRhdGFbdGhpcy5sZW5ndGhdO1xuICAgICAgICAgICAgdGhpcy5fZG93bigwKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmRhdGEucG9wKCk7XG5cbiAgICAgICAgcmV0dXJuIHRvcDtcbiAgICB9LFxuXG4gICAgcGVlazogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5kYXRhWzBdO1xuICAgIH0sXG5cbiAgICBfdXA6IGZ1bmN0aW9uIChwb3MpIHtcbiAgICAgICAgdmFyIGRhdGEgPSB0aGlzLmRhdGE7XG4gICAgICAgIHZhciBjb21wYXJlID0gdGhpcy5jb21wYXJlO1xuICAgICAgICB2YXIgaXRlbSA9IGRhdGFbcG9zXTtcblxuICAgICAgICB3aGlsZSAocG9zID4gMCkge1xuICAgICAgICAgICAgdmFyIHBhcmVudCA9IChwb3MgLSAxKSA+PiAxO1xuICAgICAgICAgICAgdmFyIGN1cnJlbnQgPSBkYXRhW3BhcmVudF07XG4gICAgICAgICAgICBpZiAoY29tcGFyZShpdGVtLCBjdXJyZW50KSA+PSAwKSBicmVhaztcbiAgICAgICAgICAgIGRhdGFbcG9zXSA9IGN1cnJlbnQ7XG4gICAgICAgICAgICBwb3MgPSBwYXJlbnQ7XG4gICAgICAgIH1cblxuICAgICAgICBkYXRhW3Bvc10gPSBpdGVtO1xuICAgIH0sXG5cbiAgICBfZG93bjogZnVuY3Rpb24gKHBvcykge1xuICAgICAgICB2YXIgZGF0YSA9IHRoaXMuZGF0YTtcbiAgICAgICAgdmFyIGNvbXBhcmUgPSB0aGlzLmNvbXBhcmU7XG4gICAgICAgIHZhciBoYWxmTGVuZ3RoID0gdGhpcy5sZW5ndGggPj4gMTtcbiAgICAgICAgdmFyIGl0ZW0gPSBkYXRhW3Bvc107XG5cbiAgICAgICAgd2hpbGUgKHBvcyA8IGhhbGZMZW5ndGgpIHtcbiAgICAgICAgICAgIHZhciBsZWZ0ID0gKHBvcyA8PCAxKSArIDE7XG4gICAgICAgICAgICB2YXIgcmlnaHQgPSBsZWZ0ICsgMTtcbiAgICAgICAgICAgIHZhciBiZXN0ID0gZGF0YVtsZWZ0XTtcblxuICAgICAgICAgICAgaWYgKHJpZ2h0IDwgdGhpcy5sZW5ndGggJiYgY29tcGFyZShkYXRhW3JpZ2h0XSwgYmVzdCkgPCAwKSB7XG4gICAgICAgICAgICAgICAgbGVmdCA9IHJpZ2h0O1xuICAgICAgICAgICAgICAgIGJlc3QgPSBkYXRhW3JpZ2h0XTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChjb21wYXJlKGJlc3QsIGl0ZW0pID49IDApIGJyZWFrO1xuXG4gICAgICAgICAgICBkYXRhW3Bvc10gPSBiZXN0O1xuICAgICAgICAgICAgcG9zID0gbGVmdDtcbiAgICAgICAgfVxuXG4gICAgICAgIGRhdGFbcG9zXSA9IGl0ZW07XG4gICAgfVxufTtcbiIsIi8vIEBmbG93XG5cbmltcG9ydCBRdWV1ZSBmcm9tICd0aW55cXVldWUnO1xuXG5pbXBvcnQgUG9pbnQgZnJvbSAnQG1hcGJveC9wb2ludC1nZW9tZXRyeSc7XG5pbXBvcnQgeyBkaXN0VG9TZWdtZW50U3F1YXJlZCB9IGZyb20gJy4vaW50ZXJzZWN0aW9uX3Rlc3RzJztcblxuLyoqXG4gKiBGaW5kcyBhbiBhcHByb3hpbWF0aW9uIG9mIGEgcG9seWdvbidzIFBvbGUgT2YgSW5hY2Nlc3NpYmlsaXkgaHR0cHM6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvUG9sZV9vZl9pbmFjY2Vzc2liaWxpdHlcbiAqIFRoaXMgaXMgYSBjb3B5IG9mIGh0dHA6Ly9naXRodWIuY29tL21hcGJveC9wb2x5bGFiZWwgYWRhcHRlZCB0byB1c2UgUG9pbnRzXG4gKlxuICogQHBhcmFtIHBvbHlnb25SaW5ncyBmaXJzdCBpdGVtIGluIGFycmF5IGlzIHRoZSBvdXRlciByaW5nIGZvbGxvd2VkIG9wdGlvbmFsbHkgYnkgdGhlIGxpc3Qgb2YgaG9sZXMsIHNob3VsZCBiZSBhbiBlbGVtZW50IG9mIHRoZSByZXN1bHQgb2YgdXRpbC9jbGFzc2lmeV9yaW5nc1xuICogQHBhcmFtIHByZWNpc2lvbiBTcGVjaWZpZWQgaW4gaW5wdXQgY29vcmRpbmF0ZSB1bml0cy4gSWYgMCByZXR1cm5zIGFmdGVyIGZpcnN0IHJ1biwgaWYgPiAwIHJlcGVhdGVkbHkgbmFycm93cyB0aGUgc2VhcmNoIHNwYWNlIHVudGlsIHRoZSByYWRpdXMgb2YgdGhlIGFyZWEgc2VhcmNoZWQgZm9yIHRoZSBiZXN0IHBvbGUgaXMgbGVzcyB0aGFuIHByZWNpc2lvblxuICogQHBhcmFtIGRlYnVnIFByaW50IHNvbWUgc3RhdGlzdGljcyB0byB0aGUgY29uc29sZSBkdXJpbmcgZXhlY3V0aW9uXG4gKiBAcmV0dXJucyBQb2xlIG9mIEluYWNjZXNzaWJpbGl5LlxuICogQHByaXZhdGVcbiAqL1xuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gKHBvbHlnb25SaW5nczogQXJyYXk8QXJyYXk8UG9pbnQ+PiwgcHJlY2lzaW9uPzogbnVtYmVyID0gMSwgZGVidWc/OiBib29sZWFuID0gZmFsc2UpOiBQb2ludCB7XG4gICAgLy8gZmluZCB0aGUgYm91bmRpbmcgYm94IG9mIHRoZSBvdXRlciByaW5nXG4gICAgbGV0IG1pblggPSBJbmZpbml0eSwgbWluWSA9IEluZmluaXR5LCBtYXhYID0gLUluZmluaXR5LCBtYXhZID0gLUluZmluaXR5O1xuICAgIGNvbnN0IG91dGVyUmluZyA9IHBvbHlnb25SaW5nc1swXTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IG91dGVyUmluZy5sZW5ndGg7IGkrKykge1xuICAgICAgICBjb25zdCBwID0gb3V0ZXJSaW5nW2ldO1xuICAgICAgICBpZiAoIWkgfHwgcC54IDwgbWluWCkgbWluWCA9IHAueDtcbiAgICAgICAgaWYgKCFpIHx8IHAueSA8IG1pblkpIG1pblkgPSBwLnk7XG4gICAgICAgIGlmICghaSB8fCBwLnggPiBtYXhYKSBtYXhYID0gcC54O1xuICAgICAgICBpZiAoIWkgfHwgcC55ID4gbWF4WSkgbWF4WSA9IHAueTtcbiAgICB9XG5cbiAgICBjb25zdCB3aWR0aCA9IG1heFggLSBtaW5YO1xuICAgIGNvbnN0IGhlaWdodCA9IG1heFkgLSBtaW5ZO1xuICAgIGNvbnN0IGNlbGxTaXplID0gTWF0aC5taW4od2lkdGgsIGhlaWdodCk7XG4gICAgbGV0IGggPSBjZWxsU2l6ZSAvIDI7XG5cbiAgICAvLyBhIHByaW9yaXR5IHF1ZXVlIG9mIGNlbGxzIGluIG9yZGVyIG9mIHRoZWlyIFwicG90ZW50aWFsXCIgKG1heCBkaXN0YW5jZSB0byBwb2x5Z29uKVxuICAgIGNvbnN0IGNlbGxRdWV1ZSA9IG5ldyBRdWV1ZShudWxsLCBjb21wYXJlTWF4KTtcblxuICAgIGlmIChjZWxsU2l6ZSA9PT0gMCkgcmV0dXJuIG5ldyBQb2ludChtaW5YLCBtaW5ZKTtcblxuICAgIC8vIGNvdmVyIHBvbHlnb24gd2l0aCBpbml0aWFsIGNlbGxzXG4gICAgZm9yIChsZXQgeCA9IG1pblg7IHggPCBtYXhYOyB4ICs9IGNlbGxTaXplKSB7XG4gICAgICAgIGZvciAobGV0IHkgPSBtaW5ZOyB5IDwgbWF4WTsgeSArPSBjZWxsU2l6ZSkge1xuICAgICAgICAgICAgY2VsbFF1ZXVlLnB1c2gobmV3IENlbGwoeCArIGgsIHkgKyBoLCBoLCBwb2x5Z29uUmluZ3MpKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIHRha2UgY2VudHJvaWQgYXMgdGhlIGZpcnN0IGJlc3QgZ3Vlc3NcbiAgICBsZXQgYmVzdENlbGwgPSBnZXRDZW50cm9pZENlbGwocG9seWdvblJpbmdzKTtcbiAgICBsZXQgbnVtUHJvYmVzID0gY2VsbFF1ZXVlLmxlbmd0aDtcblxuICAgIHdoaWxlIChjZWxsUXVldWUubGVuZ3RoKSB7XG4gICAgICAgIC8vIHBpY2sgdGhlIG1vc3QgcHJvbWlzaW5nIGNlbGwgZnJvbSB0aGUgcXVldWVcbiAgICAgICAgY29uc3QgY2VsbCA9IGNlbGxRdWV1ZS5wb3AoKTtcblxuICAgICAgICAvLyB1cGRhdGUgdGhlIGJlc3QgY2VsbCBpZiB3ZSBmb3VuZCBhIGJldHRlciBvbmVcbiAgICAgICAgaWYgKGNlbGwuZCA+IGJlc3RDZWxsLmQgfHwgIWJlc3RDZWxsLmQpIHtcbiAgICAgICAgICAgIGJlc3RDZWxsID0gY2VsbDtcbiAgICAgICAgICAgIGlmIChkZWJ1ZykgY29uc29sZS5sb2coJ2ZvdW5kIGJlc3QgJWQgYWZ0ZXIgJWQgcHJvYmVzJywgTWF0aC5yb3VuZCgxZTQgKiBjZWxsLmQpIC8gMWU0LCBudW1Qcm9iZXMpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gZG8gbm90IGRyaWxsIGRvd24gZnVydGhlciBpZiB0aGVyZSdzIG5vIGNoYW5jZSBvZiBhIGJldHRlciBzb2x1dGlvblxuICAgICAgICBpZiAoY2VsbC5tYXggLSBiZXN0Q2VsbC5kIDw9IHByZWNpc2lvbikgY29udGludWU7XG5cbiAgICAgICAgLy8gc3BsaXQgdGhlIGNlbGwgaW50byBmb3VyIGNlbGxzXG4gICAgICAgIGggPSBjZWxsLmggLyAyO1xuICAgICAgICBjZWxsUXVldWUucHVzaChuZXcgQ2VsbChjZWxsLnAueCAtIGgsIGNlbGwucC55IC0gaCwgaCwgcG9seWdvblJpbmdzKSk7XG4gICAgICAgIGNlbGxRdWV1ZS5wdXNoKG5ldyBDZWxsKGNlbGwucC54ICsgaCwgY2VsbC5wLnkgLSBoLCBoLCBwb2x5Z29uUmluZ3MpKTtcbiAgICAgICAgY2VsbFF1ZXVlLnB1c2gobmV3IENlbGwoY2VsbC5wLnggLSBoLCBjZWxsLnAueSArIGgsIGgsIHBvbHlnb25SaW5ncykpO1xuICAgICAgICBjZWxsUXVldWUucHVzaChuZXcgQ2VsbChjZWxsLnAueCArIGgsIGNlbGwucC55ICsgaCwgaCwgcG9seWdvblJpbmdzKSk7XG4gICAgICAgIG51bVByb2JlcyArPSA0O1xuICAgIH1cblxuICAgIGlmIChkZWJ1Zykge1xuICAgICAgICBjb25zb2xlLmxvZyhgbnVtIHByb2JlczogJHtudW1Qcm9iZXN9YCk7XG4gICAgICAgIGNvbnNvbGUubG9nKGBiZXN0IGRpc3RhbmNlOiAke2Jlc3RDZWxsLmR9YCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGJlc3RDZWxsLnA7XG59XG5cbmZ1bmN0aW9uIGNvbXBhcmVNYXgoYSwgYikge1xuICAgIHJldHVybiBiLm1heCAtIGEubWF4O1xufVxuXG5mdW5jdGlvbiBDZWxsKHgsIHksIGgsIHBvbHlnb24pIHtcbiAgICB0aGlzLnAgPSBuZXcgUG9pbnQoeCwgeSk7XG4gICAgdGhpcy5oID0gaDsgLy8gaGFsZiB0aGUgY2VsbCBzaXplXG4gICAgdGhpcy5kID0gcG9pbnRUb1BvbHlnb25EaXN0KHRoaXMucCwgcG9seWdvbik7IC8vIGRpc3RhbmNlIGZyb20gY2VsbCBjZW50ZXIgdG8gcG9seWdvblxuICAgIHRoaXMubWF4ID0gdGhpcy5kICsgdGhpcy5oICogTWF0aC5TUVJUMjsgLy8gbWF4IGRpc3RhbmNlIHRvIHBvbHlnb24gd2l0aGluIGEgY2VsbFxufVxuXG4vLyBzaWduZWQgZGlzdGFuY2UgZnJvbSBwb2ludCB0byBwb2x5Z29uIG91dGxpbmUgKG5lZ2F0aXZlIGlmIHBvaW50IGlzIG91dHNpZGUpXG5mdW5jdGlvbiBwb2ludFRvUG9seWdvbkRpc3QocCwgcG9seWdvbikge1xuICAgIGxldCBpbnNpZGUgPSBmYWxzZTtcbiAgICBsZXQgbWluRGlzdFNxID0gSW5maW5pdHk7XG5cbiAgICBmb3IgKGxldCBrID0gMDsgayA8IHBvbHlnb24ubGVuZ3RoOyBrKyspIHtcbiAgICAgICAgY29uc3QgcmluZyA9IHBvbHlnb25ba107XG5cbiAgICAgICAgZm9yIChsZXQgaSA9IDAsIGxlbiA9IHJpbmcubGVuZ3RoLCBqID0gbGVuIC0gMTsgaSA8IGxlbjsgaiA9IGkrKykge1xuICAgICAgICAgICAgY29uc3QgYSA9IHJpbmdbaV07XG4gICAgICAgICAgICBjb25zdCBiID0gcmluZ1tqXTtcblxuICAgICAgICAgICAgaWYgKChhLnkgPiBwLnkgIT09IGIueSA+IHAueSkgJiZcbiAgICAgICAgICAgICAgICAocC54IDwgKGIueCAtIGEueCkgKiAocC55IC0gYS55KSAvIChiLnkgLSBhLnkpICsgYS54KSkgaW5zaWRlID0gIWluc2lkZTtcblxuICAgICAgICAgICAgbWluRGlzdFNxID0gTWF0aC5taW4obWluRGlzdFNxLCBkaXN0VG9TZWdtZW50U3F1YXJlZChwLCBhLCBiKSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gKGluc2lkZSA/IDEgOiAtMSkgKiBNYXRoLnNxcnQobWluRGlzdFNxKTtcbn1cblxuLy8gZ2V0IHBvbHlnb24gY2VudHJvaWRcbmZ1bmN0aW9uIGdldENlbnRyb2lkQ2VsbChwb2x5Z29uKSB7XG4gICAgbGV0IGFyZWEgPSAwO1xuICAgIGxldCB4ID0gMDtcbiAgICBsZXQgeSA9IDA7XG4gICAgY29uc3QgcG9pbnRzID0gcG9seWdvblswXTtcbiAgICBmb3IgKGxldCBpID0gMCwgbGVuID0gcG9pbnRzLmxlbmd0aCwgaiA9IGxlbiAtIDE7IGkgPCBsZW47IGogPSBpKyspIHtcbiAgICAgICAgY29uc3QgYSA9IHBvaW50c1tpXTtcbiAgICAgICAgY29uc3QgYiA9IHBvaW50c1tqXTtcbiAgICAgICAgY29uc3QgZiA9IGEueCAqIGIueSAtIGIueCAqIGEueTtcbiAgICAgICAgeCArPSAoYS54ICsgYi54KSAqIGY7XG4gICAgICAgIHkgKz0gKGEueSArIGIueSkgKiBmO1xuICAgICAgICBhcmVhICs9IGYgKiAzO1xuICAgIH1cbiAgICByZXR1cm4gbmV3IENlbGwoeCAvIGFyZWEsIHkgLyBhcmVhLCAwLCBwb2x5Z29uKTtcbn1cbiIsIi8qKlxuICogSlMgSW1wbGVtZW50YXRpb24gb2YgTXVybXVySGFzaDMgKHIxMzYpIChhcyBvZiBNYXkgMjAsIDIwMTEpXG4gKiBcbiAqIEBhdXRob3IgPGEgaHJlZj1cIm1haWx0bzpnYXJ5LmNvdXJ0QGdtYWlsLmNvbVwiPkdhcnkgQ291cnQ8L2E+XG4gKiBAc2VlIGh0dHA6Ly9naXRodWIuY29tL2dhcnljb3VydC9tdXJtdXJoYXNoLWpzXG4gKiBAYXV0aG9yIDxhIGhyZWY9XCJtYWlsdG86YWFwcGxlYnlAZ21haWwuY29tXCI+QXVzdGluIEFwcGxlYnk8L2E+XG4gKiBAc2VlIGh0dHA6Ly9zaXRlcy5nb29nbGUuY29tL3NpdGUvbXVybXVyaGFzaC9cbiAqIFxuICogQHBhcmFtIHtzdHJpbmd9IGtleSBBU0NJSSBvbmx5XG4gKiBAcGFyYW0ge251bWJlcn0gc2VlZCBQb3NpdGl2ZSBpbnRlZ2VyIG9ubHlcbiAqIEByZXR1cm4ge251bWJlcn0gMzItYml0IHBvc2l0aXZlIGludGVnZXIgaGFzaCBcbiAqL1xuXG5mdW5jdGlvbiBtdXJtdXJoYXNoM18zMl9nYyhrZXksIHNlZWQpIHtcblx0dmFyIHJlbWFpbmRlciwgYnl0ZXMsIGgxLCBoMWIsIGMxLCBjMWIsIGMyLCBjMmIsIGsxLCBpO1xuXHRcblx0cmVtYWluZGVyID0ga2V5Lmxlbmd0aCAmIDM7IC8vIGtleS5sZW5ndGggJSA0XG5cdGJ5dGVzID0ga2V5Lmxlbmd0aCAtIHJlbWFpbmRlcjtcblx0aDEgPSBzZWVkO1xuXHRjMSA9IDB4Y2M5ZTJkNTE7XG5cdGMyID0gMHgxYjg3MzU5Mztcblx0aSA9IDA7XG5cdFxuXHR3aGlsZSAoaSA8IGJ5dGVzKSB7XG5cdCAgXHRrMSA9IFxuXHQgIFx0ICAoKGtleS5jaGFyQ29kZUF0KGkpICYgMHhmZikpIHxcblx0ICBcdCAgKChrZXkuY2hhckNvZGVBdCgrK2kpICYgMHhmZikgPDwgOCkgfFxuXHQgIFx0ICAoKGtleS5jaGFyQ29kZUF0KCsraSkgJiAweGZmKSA8PCAxNikgfFxuXHQgIFx0ICAoKGtleS5jaGFyQ29kZUF0KCsraSkgJiAweGZmKSA8PCAyNCk7XG5cdFx0KytpO1xuXHRcdFxuXHRcdGsxID0gKCgoKGsxICYgMHhmZmZmKSAqIGMxKSArICgoKChrMSA+Pj4gMTYpICogYzEpICYgMHhmZmZmKSA8PCAxNikpKSAmIDB4ZmZmZmZmZmY7XG5cdFx0azEgPSAoazEgPDwgMTUpIHwgKGsxID4+PiAxNyk7XG5cdFx0azEgPSAoKCgoazEgJiAweGZmZmYpICogYzIpICsgKCgoKGsxID4+PiAxNikgKiBjMikgJiAweGZmZmYpIDw8IDE2KSkpICYgMHhmZmZmZmZmZjtcblxuXHRcdGgxIF49IGsxO1xuICAgICAgICBoMSA9IChoMSA8PCAxMykgfCAoaDEgPj4+IDE5KTtcblx0XHRoMWIgPSAoKCgoaDEgJiAweGZmZmYpICogNSkgKyAoKCgoaDEgPj4+IDE2KSAqIDUpICYgMHhmZmZmKSA8PCAxNikpKSAmIDB4ZmZmZmZmZmY7XG5cdFx0aDEgPSAoKChoMWIgJiAweGZmZmYpICsgMHg2YjY0KSArICgoKChoMWIgPj4+IDE2KSArIDB4ZTY1NCkgJiAweGZmZmYpIDw8IDE2KSk7XG5cdH1cblx0XG5cdGsxID0gMDtcblx0XG5cdHN3aXRjaCAocmVtYWluZGVyKSB7XG5cdFx0Y2FzZSAzOiBrMSBePSAoa2V5LmNoYXJDb2RlQXQoaSArIDIpICYgMHhmZikgPDwgMTY7XG5cdFx0Y2FzZSAyOiBrMSBePSAoa2V5LmNoYXJDb2RlQXQoaSArIDEpICYgMHhmZikgPDwgODtcblx0XHRjYXNlIDE6IGsxIF49IChrZXkuY2hhckNvZGVBdChpKSAmIDB4ZmYpO1xuXHRcdFxuXHRcdGsxID0gKCgoazEgJiAweGZmZmYpICogYzEpICsgKCgoKGsxID4+PiAxNikgKiBjMSkgJiAweGZmZmYpIDw8IDE2KSkgJiAweGZmZmZmZmZmO1xuXHRcdGsxID0gKGsxIDw8IDE1KSB8IChrMSA+Pj4gMTcpO1xuXHRcdGsxID0gKCgoazEgJiAweGZmZmYpICogYzIpICsgKCgoKGsxID4+PiAxNikgKiBjMikgJiAweGZmZmYpIDw8IDE2KSkgJiAweGZmZmZmZmZmO1xuXHRcdGgxIF49IGsxO1xuXHR9XG5cdFxuXHRoMSBePSBrZXkubGVuZ3RoO1xuXG5cdGgxIF49IGgxID4+PiAxNjtcblx0aDEgPSAoKChoMSAmIDB4ZmZmZikgKiAweDg1ZWJjYTZiKSArICgoKChoMSA+Pj4gMTYpICogMHg4NWViY2E2YikgJiAweGZmZmYpIDw8IDE2KSkgJiAweGZmZmZmZmZmO1xuXHRoMSBePSBoMSA+Pj4gMTM7XG5cdGgxID0gKCgoKGgxICYgMHhmZmZmKSAqIDB4YzJiMmFlMzUpICsgKCgoKGgxID4+PiAxNikgKiAweGMyYjJhZTM1KSAmIDB4ZmZmZikgPDwgMTYpKSkgJiAweGZmZmZmZmZmO1xuXHRoMSBePSBoMSA+Pj4gMTY7XG5cblx0cmV0dXJuIGgxID4+PiAwO1xufVxuXG5pZih0eXBlb2YgbW9kdWxlICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gIG1vZHVsZS5leHBvcnRzID0gbXVybXVyaGFzaDNfMzJfZ2Ncbn0iLCIvKipcbiAqIEpTIEltcGxlbWVudGF0aW9uIG9mIE11cm11ckhhc2gyXG4gKiBcbiAqIEBhdXRob3IgPGEgaHJlZj1cIm1haWx0bzpnYXJ5LmNvdXJ0QGdtYWlsLmNvbVwiPkdhcnkgQ291cnQ8L2E+XG4gKiBAc2VlIGh0dHA6Ly9naXRodWIuY29tL2dhcnljb3VydC9tdXJtdXJoYXNoLWpzXG4gKiBAYXV0aG9yIDxhIGhyZWY9XCJtYWlsdG86YWFwcGxlYnlAZ21haWwuY29tXCI+QXVzdGluIEFwcGxlYnk8L2E+XG4gKiBAc2VlIGh0dHA6Ly9zaXRlcy5nb29nbGUuY29tL3NpdGUvbXVybXVyaGFzaC9cbiAqIFxuICogQHBhcmFtIHtzdHJpbmd9IHN0ciBBU0NJSSBvbmx5XG4gKiBAcGFyYW0ge251bWJlcn0gc2VlZCBQb3NpdGl2ZSBpbnRlZ2VyIG9ubHlcbiAqIEByZXR1cm4ge251bWJlcn0gMzItYml0IHBvc2l0aXZlIGludGVnZXIgaGFzaFxuICovXG5cbmZ1bmN0aW9uIG11cm11cmhhc2gyXzMyX2djKHN0ciwgc2VlZCkge1xuICB2YXJcbiAgICBsID0gc3RyLmxlbmd0aCxcbiAgICBoID0gc2VlZCBeIGwsXG4gICAgaSA9IDAsXG4gICAgaztcbiAgXG4gIHdoaWxlIChsID49IDQpIHtcbiAgXHRrID0gXG4gIFx0ICAoKHN0ci5jaGFyQ29kZUF0KGkpICYgMHhmZikpIHxcbiAgXHQgICgoc3RyLmNoYXJDb2RlQXQoKytpKSAmIDB4ZmYpIDw8IDgpIHxcbiAgXHQgICgoc3RyLmNoYXJDb2RlQXQoKytpKSAmIDB4ZmYpIDw8IDE2KSB8XG4gIFx0ICAoKHN0ci5jaGFyQ29kZUF0KCsraSkgJiAweGZmKSA8PCAyNCk7XG4gICAgXG4gICAgayA9ICgoKGsgJiAweGZmZmYpICogMHg1YmQxZTk5NSkgKyAoKCgoayA+Pj4gMTYpICogMHg1YmQxZTk5NSkgJiAweGZmZmYpIDw8IDE2KSk7XG4gICAgayBePSBrID4+PiAyNDtcbiAgICBrID0gKCgoayAmIDB4ZmZmZikgKiAweDViZDFlOTk1KSArICgoKChrID4+PiAxNikgKiAweDViZDFlOTk1KSAmIDB4ZmZmZikgPDwgMTYpKTtcblxuXHRoID0gKCgoaCAmIDB4ZmZmZikgKiAweDViZDFlOTk1KSArICgoKChoID4+PiAxNikgKiAweDViZDFlOTk1KSAmIDB4ZmZmZikgPDwgMTYpKSBeIGs7XG5cbiAgICBsIC09IDQ7XG4gICAgKytpO1xuICB9XG4gIFxuICBzd2l0Y2ggKGwpIHtcbiAgY2FzZSAzOiBoIF49IChzdHIuY2hhckNvZGVBdChpICsgMikgJiAweGZmKSA8PCAxNjtcbiAgY2FzZSAyOiBoIF49IChzdHIuY2hhckNvZGVBdChpICsgMSkgJiAweGZmKSA8PCA4O1xuICBjYXNlIDE6IGggXj0gKHN0ci5jaGFyQ29kZUF0KGkpICYgMHhmZik7XG4gICAgICAgICAgaCA9ICgoKGggJiAweGZmZmYpICogMHg1YmQxZTk5NSkgKyAoKCgoaCA+Pj4gMTYpICogMHg1YmQxZTk5NSkgJiAweGZmZmYpIDw8IDE2KSk7XG4gIH1cblxuICBoIF49IGggPj4+IDEzO1xuICBoID0gKCgoaCAmIDB4ZmZmZikgKiAweDViZDFlOTk1KSArICgoKChoID4+PiAxNikgKiAweDViZDFlOTk1KSAmIDB4ZmZmZikgPDwgMTYpKTtcbiAgaCBePSBoID4+PiAxNTtcblxuICByZXR1cm4gaCA+Pj4gMDtcbn1cblxuaWYodHlwZW9mIG1vZHVsZSAhPT0gdW5kZWZpbmVkKSB7XG4gIG1vZHVsZS5leHBvcnRzID0gbXVybXVyaGFzaDJfMzJfZ2Ncbn1cbiIsInZhciBtdXJtdXIzID0gcmVxdWlyZShcIi4vbXVybXVyaGFzaDNfZ2MuanNcIilcbnZhciBtdXJtdXIyID0gcmVxdWlyZShcIi4vbXVybXVyaGFzaDJfZ2MuanNcIilcblxubW9kdWxlLmV4cG9ydHMgPSBtdXJtdXIzXG5tb2R1bGUuZXhwb3J0cy5tdXJtdXIzID0gbXVybXVyM1xubW9kdWxlLmV4cG9ydHMubXVybXVyMiA9IG11cm11cjJcbiIsIi8vIEBmbG93XG5cbmltcG9ydCBBbmNob3IgZnJvbSAnLi9hbmNob3InO1xuXG5pbXBvcnQgeyBnZXRBbmNob3JzLCBnZXRDZW50ZXJBbmNob3IgfSBmcm9tICcuL2dldF9hbmNob3JzJztcbmltcG9ydCBjbGlwTGluZSBmcm9tICcuL2NsaXBfbGluZSc7XG5pbXBvcnQgeyBzaGFwZVRleHQsIHNoYXBlSWNvbiwgV3JpdGluZ01vZGUgfSBmcm9tICcuL3NoYXBpbmcnO1xuaW1wb3J0IHsgZ2V0R2x5cGhRdWFkcywgZ2V0SWNvblF1YWRzIH0gZnJvbSAnLi9xdWFkcyc7XG5pbXBvcnQgQ29sbGlzaW9uRmVhdHVyZSBmcm9tICcuL2NvbGxpc2lvbl9mZWF0dXJlJztcbmltcG9ydCB7IHdhcm5PbmNlIH0gZnJvbSAnLi4vdXRpbC91dGlsJztcbmltcG9ydCB7XG4gICAgYWxsb3dzVmVydGljYWxXcml0aW5nTW9kZSxcbiAgICBhbGxvd3NMZXR0ZXJTcGFjaW5nXG59IGZyb20gJy4uL3V0aWwvc2NyaXB0X2RldGVjdGlvbic7XG5pbXBvcnQgZmluZFBvbGVPZkluYWNjZXNzaWJpbGl0eSBmcm9tICcuLi91dGlsL2ZpbmRfcG9sZV9vZl9pbmFjY2Vzc2liaWxpdHknO1xuaW1wb3J0IGNsYXNzaWZ5UmluZ3MgZnJvbSAnLi4vdXRpbC9jbGFzc2lmeV9yaW5ncyc7XG5pbXBvcnQgRVhURU5UIGZyb20gJy4uL2RhdGEvZXh0ZW50JztcbmltcG9ydCBTeW1ib2xCdWNrZXQgZnJvbSAnLi4vZGF0YS9idWNrZXQvc3ltYm9sX2J1Y2tldCc7XG5pbXBvcnQgRXZhbHVhdGlvblBhcmFtZXRlcnMgZnJvbSAnLi4vc3R5bGUvZXZhbHVhdGlvbl9wYXJhbWV0ZXJzJztcbmltcG9ydCB7U0laRV9QQUNLX0ZBQ1RPUn0gZnJvbSAnLi9zeW1ib2xfc2l6ZSc7XG5cbmltcG9ydCB0eXBlIHtTaGFwaW5nLCBQb3NpdGlvbmVkSWNvbn0gZnJvbSAnLi9zaGFwaW5nJztcbmltcG9ydCB0eXBlIHtDb2xsaXNpb25Cb3hBcnJheX0gZnJvbSAnLi4vZGF0YS9hcnJheV90eXBlcyc7XG5pbXBvcnQgdHlwZSB7U3ltYm9sRmVhdHVyZX0gZnJvbSAnLi4vZGF0YS9idWNrZXQvc3ltYm9sX2J1Y2tldCc7XG5pbXBvcnQgdHlwZSB7U3R5bGVJbWFnZX0gZnJvbSAnLi4vc3R5bGUvc3R5bGVfaW1hZ2UnO1xuaW1wb3J0IHR5cGUge1N0eWxlR2x5cGh9IGZyb20gJy4uL3N0eWxlL3N0eWxlX2dseXBoJztcbmltcG9ydCB0eXBlIFN5bWJvbFN0eWxlTGF5ZXIgZnJvbSAnLi4vc3R5bGUvc3R5bGVfbGF5ZXIvc3ltYm9sX3N0eWxlX2xheWVyJztcbmltcG9ydCB0eXBlIHtJbWFnZVBvc2l0aW9ufSBmcm9tICcuLi9yZW5kZXIvaW1hZ2VfYXRsYXMnO1xuaW1wb3J0IHR5cGUge0dseXBoUG9zaXRpb259IGZyb20gJy4uL3JlbmRlci9nbHlwaF9hdGxhcyc7XG5pbXBvcnQgdHlwZSB7UG9zc2libHlFdmFsdWF0ZWRQcm9wZXJ0eVZhbHVlfSBmcm9tICcuLi9zdHlsZS9wcm9wZXJ0aWVzJztcblxuaW1wb3J0IFBvaW50IGZyb20gJ0BtYXBib3gvcG9pbnQtZ2VvbWV0cnknO1xuaW1wb3J0IG11cm11cjMgZnJvbSAnbXVybXVyaGFzaC1qcyc7XG5cbi8vIFRoZSBzeW1ib2wgbGF5b3V0IHByb2Nlc3MgbmVlZHMgYHRleHQtc2l6ZWAgZXZhbHVhdGVkIGF0IHVwIHRvIGZpdmUgZGlmZmVyZW50IHpvb20gbGV2ZWxzLCBhbmRcbi8vIGBpY29uLXNpemVgIGF0IHVwIHRvIHRocmVlOlxuLy9cbi8vICAgMS4gYHRleHQtc2l6ZWAgYXQgdGhlIHpvb20gbGV2ZWwgb2YgdGhlIGJ1Y2tldC4gVXNlZCB0byBjYWxjdWxhdGUgYSBwZXItZmVhdHVyZSBzaXplIGZvciBzb3VyY2UgYHRleHQtc2l6ZWBcbi8vICAgICAgIGV4cHJlc3Npb25zLCBhbmQgdG8gY2FsY3VsYXRlIHRoZSBib3ggZGltZW5zaW9ucyBmb3IgaWNvbi10ZXh0LWZpdC5cbi8vICAgMi4gYGljb24tc2l6ZWAgYXQgdGhlIHpvb20gbGV2ZWwgb2YgdGhlIGJ1Y2tldC4gVXNlZCB0byBjYWxjdWxhdGUgYSBwZXItZmVhdHVyZSBzaXplIGZvciBzb3VyY2UgYGljb24tc2l6ZWBcbi8vICAgICAgIGV4cHJlc3Npb25zLlxuLy8gICAzLiBgdGV4dC1zaXplYCBhbmQgYGljb24tc2l6ZWAgYXQgdGhlIHpvb20gbGV2ZWwgb2YgdGhlIGJ1Y2tldCwgcGx1cyBvbmUuIFVzZWQgdG8gY2FsY3VsYXRlIGNvbGxpc2lvbiBib3hlcy5cbi8vICAgNC4gYHRleHQtc2l6ZWAgYXQgem9vbSBsZXZlbCAxOC4gVXNlZCBmb3Igc29tZXRoaW5nIGxpbmUtc3ltYm9sLXBsYWNlbWVudC1yZWxhdGVkLlxuLy8gICA1LiAgRm9yIGNvbXBvc2l0ZSBgKi1zaXplYCBleHByZXNzaW9uczogdHdvIHpvb20gbGV2ZWxzIG9mIGN1cnZlIHN0b3BzIHRoYXQgXCJjb3ZlclwiIHRoZSB6b29tIGxldmVsIG9mIHRoZVxuLy8gICAgICAgYnVja2V0LiBUaGVzZSBnbyBpbnRvIGEgdmVydGV4IGJ1ZmZlciBhbmQgYXJlIHVzZWQgYnkgdGhlIHNoYWRlciB0byBpbnRlcnBvbGF0ZSB0aGUgc2l6ZSBhdCByZW5kZXIgdGltZS5cbi8vXG4vLyAoMSkgYW5kICgyKSBhcmUgc3RvcmVkIGluIGBidWNrZXQubGF5ZXJzWzBdLmxheW91dGAuIFRoZSByZW1haW5kZXIgYXJlIGJlbG93LlxuLy9cbnR5cGUgU2l6ZXMgPSB7XG4gICAgbGF5b3V0VGV4dFNpemU6IFBvc3NpYmx5RXZhbHVhdGVkUHJvcGVydHlWYWx1ZTxudW1iZXI+LCAvLyAoMylcbiAgICBsYXlvdXRJY29uU2l6ZTogUG9zc2libHlFdmFsdWF0ZWRQcm9wZXJ0eVZhbHVlPG51bWJlcj4sIC8vICgzKVxuICAgIHRleHRNYXhTaXplOiBQb3NzaWJseUV2YWx1YXRlZFByb3BlcnR5VmFsdWU8bnVtYmVyPiwgICAgLy8gKDQpXG4gICAgY29tcG9zaXRlVGV4dFNpemVzOiBbUG9zc2libHlFdmFsdWF0ZWRQcm9wZXJ0eVZhbHVlPG51bWJlcj4sIFBvc3NpYmx5RXZhbHVhdGVkUHJvcGVydHlWYWx1ZTxudW1iZXI+XSwgLy8gKDUpXG4gICAgY29tcG9zaXRlSWNvblNpemVzOiBbUG9zc2libHlFdmFsdWF0ZWRQcm9wZXJ0eVZhbHVlPG51bWJlcj4sIFBvc3NpYmx5RXZhbHVhdGVkUHJvcGVydHlWYWx1ZTxudW1iZXI+XSwgLy8gKDUpXG59O1xuXG5leHBvcnQgZnVuY3Rpb24gcGVyZm9ybVN5bWJvbExheW91dChidWNrZXQ6IFN5bWJvbEJ1Y2tldCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2x5cGhNYXA6IHtbc3RyaW5nXToge1tudW1iZXJdOiA/U3R5bGVHbHlwaH19LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBnbHlwaFBvc2l0aW9uczoge1tzdHJpbmddOiB7W251bWJlcl06IEdseXBoUG9zaXRpb259fSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaW1hZ2VNYXA6IHtbc3RyaW5nXTogU3R5bGVJbWFnZX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIGltYWdlUG9zaXRpb25zOiB7W3N0cmluZ106IEltYWdlUG9zaXRpb259LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzaG93Q29sbGlzaW9uQm94ZXM6IGJvb2xlYW4pIHtcbiAgICBidWNrZXQuY3JlYXRlQXJyYXlzKCk7XG5cbiAgICBjb25zdCB0aWxlU2l6ZSA9IDUxMiAqIGJ1Y2tldC5vdmVyc2NhbGluZztcbiAgICBidWNrZXQudGlsZVBpeGVsUmF0aW8gPSBFWFRFTlQgLyB0aWxlU2l6ZTtcbiAgICBidWNrZXQuY29tcGFyZVRleHQgPSB7fTtcbiAgICBidWNrZXQuaWNvbnNOZWVkTGluZWFyID0gZmFsc2U7XG5cbiAgICBjb25zdCBsYXlvdXQgPSBidWNrZXQubGF5ZXJzWzBdLmxheW91dDtcbiAgICBjb25zdCB1bmV2YWx1YXRlZExheW91dFZhbHVlcyA9IGJ1Y2tldC5sYXllcnNbMF0uX3VuZXZhbHVhdGVkTGF5b3V0Ll92YWx1ZXM7XG5cbiAgICBjb25zdCBzaXplcyA9IHt9O1xuXG4gICAgaWYgKGJ1Y2tldC50ZXh0U2l6ZURhdGEuZnVuY3Rpb25UeXBlID09PSAnY29tcG9zaXRlJykge1xuICAgICAgICBjb25zdCB7bWluLCBtYXh9ID0gYnVja2V0LnRleHRTaXplRGF0YS56b29tUmFuZ2U7XG4gICAgICAgIHNpemVzLmNvbXBvc2l0ZVRleHRTaXplcyA9IFtcbiAgICAgICAgICAgIHVuZXZhbHVhdGVkTGF5b3V0VmFsdWVzWyd0ZXh0LXNpemUnXS5wb3NzaWJseUV2YWx1YXRlKG5ldyBFdmFsdWF0aW9uUGFyYW1ldGVycyhtaW4pKSxcbiAgICAgICAgICAgIHVuZXZhbHVhdGVkTGF5b3V0VmFsdWVzWyd0ZXh0LXNpemUnXS5wb3NzaWJseUV2YWx1YXRlKG5ldyBFdmFsdWF0aW9uUGFyYW1ldGVycyhtYXgpKVxuICAgICAgICBdO1xuICAgIH1cblxuICAgIGlmIChidWNrZXQuaWNvblNpemVEYXRhLmZ1bmN0aW9uVHlwZSA9PT0gJ2NvbXBvc2l0ZScpIHtcbiAgICAgICAgY29uc3Qge21pbiwgbWF4fSA9IGJ1Y2tldC5pY29uU2l6ZURhdGEuem9vbVJhbmdlO1xuICAgICAgICBzaXplcy5jb21wb3NpdGVJY29uU2l6ZXMgPSBbXG4gICAgICAgICAgICB1bmV2YWx1YXRlZExheW91dFZhbHVlc1snaWNvbi1zaXplJ10ucG9zc2libHlFdmFsdWF0ZShuZXcgRXZhbHVhdGlvblBhcmFtZXRlcnMobWluKSksXG4gICAgICAgICAgICB1bmV2YWx1YXRlZExheW91dFZhbHVlc1snaWNvbi1zaXplJ10ucG9zc2libHlFdmFsdWF0ZShuZXcgRXZhbHVhdGlvblBhcmFtZXRlcnMobWF4KSlcbiAgICAgICAgXTtcbiAgICB9XG5cbiAgICBzaXplcy5sYXlvdXRUZXh0U2l6ZSA9IHVuZXZhbHVhdGVkTGF5b3V0VmFsdWVzWyd0ZXh0LXNpemUnXS5wb3NzaWJseUV2YWx1YXRlKG5ldyBFdmFsdWF0aW9uUGFyYW1ldGVycyhidWNrZXQuem9vbSArIDEpKTtcbiAgICBzaXplcy5sYXlvdXRJY29uU2l6ZSA9IHVuZXZhbHVhdGVkTGF5b3V0VmFsdWVzWydpY29uLXNpemUnXS5wb3NzaWJseUV2YWx1YXRlKG5ldyBFdmFsdWF0aW9uUGFyYW1ldGVycyhidWNrZXQuem9vbSArIDEpKTtcbiAgICBzaXplcy50ZXh0TWF4U2l6ZSA9IHVuZXZhbHVhdGVkTGF5b3V0VmFsdWVzWyd0ZXh0LXNpemUnXS5wb3NzaWJseUV2YWx1YXRlKG5ldyBFdmFsdWF0aW9uUGFyYW1ldGVycygxOCkpO1xuXG4gICAgY29uc3Qgb25lRW0gPSAyNDtcbiAgICBjb25zdCBsaW5lSGVpZ2h0ID0gbGF5b3V0LmdldCgndGV4dC1saW5lLWhlaWdodCcpICogb25lRW07XG4gICAgY29uc3QgdGV4dEFsb25nTGluZSA9IGxheW91dC5nZXQoJ3RleHQtcm90YXRpb24tYWxpZ25tZW50JykgPT09ICdtYXAnICYmIGxheW91dC5nZXQoJ3N5bWJvbC1wbGFjZW1lbnQnKSAhPT0gJ3BvaW50JztcbiAgICBjb25zdCBrZWVwVXByaWdodCA9IGxheW91dC5nZXQoJ3RleHQta2VlcC11cHJpZ2h0Jyk7XG5cblxuICAgIGZvciAoY29uc3QgZmVhdHVyZSBvZiBidWNrZXQuZmVhdHVyZXMpIHtcbiAgICAgICAgY29uc3QgZm9udHN0YWNrID0gbGF5b3V0LmdldCgndGV4dC1mb250JykuZXZhbHVhdGUoZmVhdHVyZSwge30pLmpvaW4oJywnKTtcbiAgICAgICAgY29uc3QgZ2x5cGhQb3NpdGlvbk1hcCA9IGdseXBoUG9zaXRpb25zO1xuXG4gICAgICAgIGNvbnN0IHNoYXBlZFRleHRPcmllbnRhdGlvbnMgPSB7fTtcbiAgICAgICAgY29uc3QgdGV4dCA9IGZlYXR1cmUudGV4dDtcbiAgICAgICAgaWYgKHRleHQpIHtcbiAgICAgICAgICAgIGNvbnN0IHVuZm9ybWF0dGVkVGV4dCA9IHRleHQudG9TdHJpbmcoKTtcbiAgICAgICAgICAgIGNvbnN0IHRleHRPZmZzZXQ6IFtudW1iZXIsIG51bWJlcl0gPSAobGF5b3V0LmdldCgndGV4dC1vZmZzZXQnKS5ldmFsdWF0ZShmZWF0dXJlLCB7fSkubWFwKCh0KT0+IHQgKiBvbmVFbSk6IGFueSk7XG4gICAgICAgICAgICBjb25zdCBzcGFjaW5nID0gbGF5b3V0LmdldCgndGV4dC1sZXR0ZXItc3BhY2luZycpLmV2YWx1YXRlKGZlYXR1cmUsIHt9KSAqIG9uZUVtO1xuICAgICAgICAgICAgY29uc3Qgc3BhY2luZ0lmQWxsb3dlZCA9IGFsbG93c0xldHRlclNwYWNpbmcodW5mb3JtYXR0ZWRUZXh0KSA/IHNwYWNpbmcgOiAwO1xuICAgICAgICAgICAgY29uc3QgdGV4dEFuY2hvciA9IGxheW91dC5nZXQoJ3RleHQtYW5jaG9yJykuZXZhbHVhdGUoZmVhdHVyZSwge30pO1xuICAgICAgICAgICAgY29uc3QgdGV4dEp1c3RpZnkgPSBsYXlvdXQuZ2V0KCd0ZXh0LWp1c3RpZnknKS5ldmFsdWF0ZShmZWF0dXJlLCB7fSk7XG4gICAgICAgICAgICBjb25zdCBtYXhXaWR0aCA9IGxheW91dC5nZXQoJ3N5bWJvbC1wbGFjZW1lbnQnKSA9PT0gJ3BvaW50JyA/XG4gICAgICAgICAgICAgICAgbGF5b3V0LmdldCgndGV4dC1tYXgtd2lkdGgnKS5ldmFsdWF0ZShmZWF0dXJlLCB7fSkgKiBvbmVFbSA6XG4gICAgICAgICAgICAgICAgMDtcblxuICAgICAgICAgICAgc2hhcGVkVGV4dE9yaWVudGF0aW9ucy5ob3Jpem9udGFsID0gc2hhcGVUZXh0KHRleHQsIGdseXBoTWFwLCBmb250c3RhY2ssIG1heFdpZHRoLCBsaW5lSGVpZ2h0LCB0ZXh0QW5jaG9yLCB0ZXh0SnVzdGlmeSwgc3BhY2luZ0lmQWxsb3dlZCwgdGV4dE9mZnNldCwgb25lRW0sIFdyaXRpbmdNb2RlLmhvcml6b250YWwpO1xuICAgICAgICAgICAgaWYgKGFsbG93c1ZlcnRpY2FsV3JpdGluZ01vZGUodW5mb3JtYXR0ZWRUZXh0KSAmJiB0ZXh0QWxvbmdMaW5lICYmIGtlZXBVcHJpZ2h0KSB7XG4gICAgICAgICAgICAgICAgc2hhcGVkVGV4dE9yaWVudGF0aW9ucy52ZXJ0aWNhbCA9IHNoYXBlVGV4dCh0ZXh0LCBnbHlwaE1hcCwgZm9udHN0YWNrLCBtYXhXaWR0aCwgbGluZUhlaWdodCwgdGV4dEFuY2hvciwgdGV4dEp1c3RpZnksIHNwYWNpbmdJZkFsbG93ZWQsIHRleHRPZmZzZXQsIG9uZUVtLCBXcml0aW5nTW9kZS52ZXJ0aWNhbCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgc2hhcGVkSWNvbjtcbiAgICAgICAgaWYgKGZlYXR1cmUuaWNvbikge1xuICAgICAgICAgICAgY29uc3QgaW1hZ2UgPSBpbWFnZU1hcFtmZWF0dXJlLmljb25dO1xuICAgICAgICAgICAgaWYgKGltYWdlKSB7XG4gICAgICAgICAgICAgICAgc2hhcGVkSWNvbiA9IHNoYXBlSWNvbihcbiAgICAgICAgICAgICAgICAgICAgaW1hZ2VQb3NpdGlvbnNbZmVhdHVyZS5pY29uXSxcbiAgICAgICAgICAgICAgICAgICAgbGF5b3V0LmdldCgnaWNvbi1vZmZzZXQnKS5ldmFsdWF0ZShmZWF0dXJlLCB7fSksXG4gICAgICAgICAgICAgICAgICAgIGxheW91dC5nZXQoJ2ljb24tYW5jaG9yJykuZXZhbHVhdGUoZmVhdHVyZSwge30pKTtcbiAgICAgICAgICAgICAgICBpZiAoYnVja2V0LnNkZkljb25zID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgYnVja2V0LnNkZkljb25zID0gaW1hZ2Uuc2RmO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoYnVja2V0LnNkZkljb25zICE9PSBpbWFnZS5zZGYpIHtcbiAgICAgICAgICAgICAgICAgICAgd2Fybk9uY2UoJ1N0eWxlIHNoZWV0IHdhcm5pbmc6IENhbm5vdCBtaXggU0RGIGFuZCBub24tU0RGIGljb25zIGluIG9uZSBidWZmZXInKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGltYWdlLnBpeGVsUmF0aW8gIT09IGJ1Y2tldC5waXhlbFJhdGlvKSB7XG4gICAgICAgICAgICAgICAgICAgIGJ1Y2tldC5pY29uc05lZWRMaW5lYXIgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAobGF5b3V0LmdldCgnaWNvbi1yb3RhdGUnKS5jb25zdGFudE9yKDEpICE9PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGJ1Y2tldC5pY29uc05lZWRMaW5lYXIgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChzaGFwZWRUZXh0T3JpZW50YXRpb25zLmhvcml6b250YWwgfHwgc2hhcGVkSWNvbikge1xuICAgICAgICAgICAgYWRkRmVhdHVyZShidWNrZXQsIGZlYXR1cmUsIHNoYXBlZFRleHRPcmllbnRhdGlvbnMsIHNoYXBlZEljb24sIGdseXBoUG9zaXRpb25NYXAsIHNpemVzKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGlmIChzaG93Q29sbGlzaW9uQm94ZXMpIHtcbiAgICAgICAgYnVja2V0LmdlbmVyYXRlQ29sbGlzaW9uRGVidWdCdWZmZXJzKCk7XG4gICAgfVxufVxuXG5cbi8qKlxuICogR2l2ZW4gYSBmZWF0dXJlIGFuZCBpdHMgc2hhcGVkIHRleHQgYW5kIGljb24gZGF0YSwgYWRkIGEgJ3N5bWJvbFxuICogaW5zdGFuY2UnIGZvciBlYWNoIF9wb3NzaWJsZV8gcGxhY2VtZW50IG9mIHRoZSBzeW1ib2wgZmVhdHVyZS5cbiAqIChBdCByZW5kZXIgdGltZVBsYWNlU3ltYm9scyNwbGFjZSgpIHNlbGVjdHMgd2hpY2ggb2YgdGhlc2UgaW5zdGFuY2VzIHRvXG4gKiBzaG93IG9yIGhpZGUgYmFzZWQgb24gY29sbGlzaW9ucyB3aXRoIHN5bWJvbHMgaW4gb3RoZXIgbGF5ZXJzLilcbiAqIEBwcml2YXRlXG4gKi9cbmZ1bmN0aW9uIGFkZEZlYXR1cmUoYnVja2V0OiBTeW1ib2xCdWNrZXQsXG4gICAgICAgICAgICAgICAgICAgIGZlYXR1cmU6IFN5bWJvbEZlYXR1cmUsXG4gICAgICAgICAgICAgICAgICAgIHNoYXBlZFRleHRPcmllbnRhdGlvbnM6IGFueSxcbiAgICAgICAgICAgICAgICAgICAgc2hhcGVkSWNvbjogUG9zaXRpb25lZEljb24gfCB2b2lkLFxuICAgICAgICAgICAgICAgICAgICBnbHlwaFBvc2l0aW9uTWFwOiB7W3N0cmluZ106IHtbbnVtYmVyXTogR2x5cGhQb3NpdGlvbn19LFxuICAgICAgICAgICAgICAgICAgICBzaXplczogU2l6ZXMpIHtcbiAgICBjb25zdCBsYXlvdXRUZXh0U2l6ZSA9IHNpemVzLmxheW91dFRleHRTaXplLmV2YWx1YXRlKGZlYXR1cmUsIHt9KTtcbiAgICBjb25zdCBsYXlvdXRJY29uU2l6ZSA9IHNpemVzLmxheW91dEljb25TaXplLmV2YWx1YXRlKGZlYXR1cmUsIHt9KTtcblxuICAgIC8vIFRvIHJlZHVjZSB0aGUgbnVtYmVyIG9mIGxhYmVscyB0aGF0IGp1bXAgYXJvdW5kIHdoZW4gem9vbWluZyB3ZSBuZWVkXG4gICAgLy8gdG8gdXNlIGEgdGV4dC1zaXplIHZhbHVlIHRoYXQgaXMgdGhlIHNhbWUgZm9yIGFsbCB6b29tIGxldmVscy5cbiAgICAvLyBidWNrZXQgY2FsY3VsYXRlcyB0ZXh0LXNpemUgYXQgYSBoaWdoIHpvb20gbGV2ZWwgc28gdGhhdCBhbGwgdGlsZXMgY2FuXG4gICAgLy8gdXNlIHRoZSBzYW1lIHZhbHVlIHdoZW4gY2FsY3VsYXRpbmcgYW5jaG9yIHBvc2l0aW9ucy5cbiAgICBsZXQgdGV4dE1heFNpemUgPSBzaXplcy50ZXh0TWF4U2l6ZS5ldmFsdWF0ZShmZWF0dXJlLCB7fSk7XG4gICAgaWYgKHRleHRNYXhTaXplID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGV4dE1heFNpemUgPSBsYXlvdXRUZXh0U2l6ZTtcbiAgICB9XG5cbiAgICBjb25zdCBsYXlvdXQgPSBidWNrZXQubGF5ZXJzWzBdLmxheW91dDtcbiAgICBjb25zdCB0ZXh0T2Zmc2V0ID0gbGF5b3V0LmdldCgndGV4dC1vZmZzZXQnKS5ldmFsdWF0ZShmZWF0dXJlLCB7fSk7XG4gICAgY29uc3QgaWNvbk9mZnNldCA9IGxheW91dC5nZXQoJ2ljb24tb2Zmc2V0JykuZXZhbHVhdGUoZmVhdHVyZSwge30pO1xuXG4gICAgY29uc3QgZ2x5cGhTaXplID0gMjQsXG4gICAgICAgIGZvbnRTY2FsZSA9IGxheW91dFRleHRTaXplIC8gZ2x5cGhTaXplLFxuICAgICAgICB0ZXh0Qm94U2NhbGUgPSBidWNrZXQudGlsZVBpeGVsUmF0aW8gKiBmb250U2NhbGUsXG4gICAgICAgIHRleHRNYXhCb3hTY2FsZSA9IGJ1Y2tldC50aWxlUGl4ZWxSYXRpbyAqIHRleHRNYXhTaXplIC8gZ2x5cGhTaXplLFxuICAgICAgICBpY29uQm94U2NhbGUgPSBidWNrZXQudGlsZVBpeGVsUmF0aW8gKiBsYXlvdXRJY29uU2l6ZSxcbiAgICAgICAgc3ltYm9sTWluRGlzdGFuY2UgPSBidWNrZXQudGlsZVBpeGVsUmF0aW8gKiBsYXlvdXQuZ2V0KCdzeW1ib2wtc3BhY2luZycpLFxuICAgICAgICB0ZXh0UGFkZGluZyA9IGxheW91dC5nZXQoJ3RleHQtcGFkZGluZycpICogYnVja2V0LnRpbGVQaXhlbFJhdGlvLFxuICAgICAgICBpY29uUGFkZGluZyA9IGxheW91dC5nZXQoJ2ljb24tcGFkZGluZycpICogYnVja2V0LnRpbGVQaXhlbFJhdGlvLFxuICAgICAgICB0ZXh0TWF4QW5nbGUgPSBsYXlvdXQuZ2V0KCd0ZXh0LW1heC1hbmdsZScpIC8gMTgwICogTWF0aC5QSSxcbiAgICAgICAgdGV4dEFsb25nTGluZSA9IGxheW91dC5nZXQoJ3RleHQtcm90YXRpb24tYWxpZ25tZW50JykgPT09ICdtYXAnICYmIGxheW91dC5nZXQoJ3N5bWJvbC1wbGFjZW1lbnQnKSAhPT0gJ3BvaW50JyxcbiAgICAgICAgaWNvbkFsb25nTGluZSA9IGxheW91dC5nZXQoJ2ljb24tcm90YXRpb24tYWxpZ25tZW50JykgPT09ICdtYXAnICYmIGxheW91dC5nZXQoJ3N5bWJvbC1wbGFjZW1lbnQnKSAhPT0gJ3BvaW50JyxcbiAgICAgICAgc3ltYm9sUGxhY2VtZW50ID0gbGF5b3V0LmdldCgnc3ltYm9sLXBsYWNlbWVudCcpLFxuICAgICAgICB0ZXh0UmVwZWF0RGlzdGFuY2UgPSBzeW1ib2xNaW5EaXN0YW5jZSAvIDI7XG5cbiAgICBjb25zdCBhZGRTeW1ib2xBdEFuY2hvciA9IChsaW5lLCBhbmNob3IpID0+IHtcbiAgICAgICAgaWYgKGFuY2hvci54IDwgMCB8fCBhbmNob3IueCA+PSBFWFRFTlQgfHwgYW5jaG9yLnkgPCAwIHx8IGFuY2hvci55ID49IEVYVEVOVCkge1xuICAgICAgICAgICAgLy8gU3ltYm9sIGxheWVycyBhcmUgZHJhd24gYWNyb3NzIHRpbGUgYm91bmRhcmllcywgV2UgZmlsdGVyIG91dCBzeW1ib2xzXG4gICAgICAgICAgICAvLyBvdXRzaWRlIG91ciB0aWxlIGJvdW5kYXJpZXMgKHdoaWNoIG1heSBiZSBpbmNsdWRlZCBpbiB2ZWN0b3IgdGlsZSBidWZmZXJzKVxuICAgICAgICAgICAgLy8gdG8gcHJldmVudCBkb3VibGUtZHJhd2luZyBzeW1ib2xzLlxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgYWRkU3ltYm9sKGJ1Y2tldCwgYW5jaG9yLCBsaW5lLCBzaGFwZWRUZXh0T3JpZW50YXRpb25zLCBzaGFwZWRJY29uLCBidWNrZXQubGF5ZXJzWzBdLFxuICAgICAgICAgICAgYnVja2V0LmNvbGxpc2lvbkJveEFycmF5LCBmZWF0dXJlLmluZGV4LCBmZWF0dXJlLnNvdXJjZUxheWVySW5kZXgsIGJ1Y2tldC5pbmRleCxcbiAgICAgICAgICAgIHRleHRCb3hTY2FsZSwgdGV4dFBhZGRpbmcsIHRleHRBbG9uZ0xpbmUsIHRleHRPZmZzZXQsXG4gICAgICAgICAgICBpY29uQm94U2NhbGUsIGljb25QYWRkaW5nLCBpY29uQWxvbmdMaW5lLCBpY29uT2Zmc2V0LFxuICAgICAgICAgICAgZmVhdHVyZSwgZ2x5cGhQb3NpdGlvbk1hcCwgc2l6ZXMpO1xuICAgIH07XG5cbiAgICBpZiAoc3ltYm9sUGxhY2VtZW50ID09PSAnbGluZScpIHtcbiAgICAgICAgZm9yIChjb25zdCBsaW5lIG9mIGNsaXBMaW5lKGZlYXR1cmUuZ2VvbWV0cnksIDAsIDAsIEVYVEVOVCwgRVhURU5UKSkge1xuICAgICAgICAgICAgY29uc3QgYW5jaG9ycyA9IGdldEFuY2hvcnMoXG4gICAgICAgICAgICAgICAgbGluZSxcbiAgICAgICAgICAgICAgICBzeW1ib2xNaW5EaXN0YW5jZSxcbiAgICAgICAgICAgICAgICB0ZXh0TWF4QW5nbGUsXG4gICAgICAgICAgICAgICAgc2hhcGVkVGV4dE9yaWVudGF0aW9ucy52ZXJ0aWNhbCB8fCBzaGFwZWRUZXh0T3JpZW50YXRpb25zLmhvcml6b250YWwsXG4gICAgICAgICAgICAgICAgc2hhcGVkSWNvbixcbiAgICAgICAgICAgICAgICBnbHlwaFNpemUsXG4gICAgICAgICAgICAgICAgdGV4dE1heEJveFNjYWxlLFxuICAgICAgICAgICAgICAgIGJ1Y2tldC5vdmVyc2NhbGluZyxcbiAgICAgICAgICAgICAgICBFWFRFTlRcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGFuY2hvciBvZiBhbmNob3JzKSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgc2hhcGVkVGV4dCA9IHNoYXBlZFRleHRPcmllbnRhdGlvbnMuaG9yaXpvbnRhbDtcbiAgICAgICAgICAgICAgICBpZiAoIXNoYXBlZFRleHQgfHwgIWFuY2hvcklzVG9vQ2xvc2UoYnVja2V0LCBzaGFwZWRUZXh0LnRleHQsIHRleHRSZXBlYXREaXN0YW5jZSwgYW5jaG9yKSkge1xuICAgICAgICAgICAgICAgICAgICBhZGRTeW1ib2xBdEFuY2hvcihsaW5lLCBhbmNob3IpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0gZWxzZSBpZiAoc3ltYm9sUGxhY2VtZW50ID09PSAnbGluZS1jZW50ZXInKSB7XG4gICAgICAgIC8vIE5vIGNsaXBwaW5nLCBtdWx0aXBsZSBsaW5lcyBwZXIgZmVhdHVyZSBhcmUgYWxsb3dlZFxuICAgICAgICAvLyBcImxpbmVzXCIgd2l0aCBvbmx5IG9uZSBwb2ludCBhcmUgaWdub3JlZCBhcyBpbiBjbGlwTGluZXNcbiAgICAgICAgZm9yIChjb25zdCBsaW5lIG9mIGZlYXR1cmUuZ2VvbWV0cnkpIHtcbiAgICAgICAgICAgIGlmIChsaW5lLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBhbmNob3IgPSBnZXRDZW50ZXJBbmNob3IoXG4gICAgICAgICAgICAgICAgICAgIGxpbmUsXG4gICAgICAgICAgICAgICAgICAgIHRleHRNYXhBbmdsZSxcbiAgICAgICAgICAgICAgICAgICAgc2hhcGVkVGV4dE9yaWVudGF0aW9ucy52ZXJ0aWNhbCB8fCBzaGFwZWRUZXh0T3JpZW50YXRpb25zLmhvcml6b250YWwsXG4gICAgICAgICAgICAgICAgICAgIHNoYXBlZEljb24sXG4gICAgICAgICAgICAgICAgICAgIGdseXBoU2l6ZSxcbiAgICAgICAgICAgICAgICAgICAgdGV4dE1heEJveFNjYWxlKTtcbiAgICAgICAgICAgICAgICBpZiAoYW5jaG9yKSB7XG4gICAgICAgICAgICAgICAgICAgIGFkZFN5bWJvbEF0QW5jaG9yKGxpbmUsIGFuY2hvcik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSBlbHNlIGlmIChmZWF0dXJlLnR5cGUgPT09ICdQb2x5Z29uJykge1xuICAgICAgICBmb3IgKGNvbnN0IHBvbHlnb24gb2YgY2xhc3NpZnlSaW5ncyhmZWF0dXJlLmdlb21ldHJ5LCAwKSkge1xuICAgICAgICAgICAgLy8gMTYgaGVyZSByZXByZXNlbnRzIDIgcGl4ZWxzXG4gICAgICAgICAgICBjb25zdCBwb2kgPSBmaW5kUG9sZU9mSW5hY2Nlc3NpYmlsaXR5KHBvbHlnb24sIDE2KTtcbiAgICAgICAgICAgIGFkZFN5bWJvbEF0QW5jaG9yKHBvbHlnb25bMF0sIG5ldyBBbmNob3IocG9pLngsIHBvaS55LCAwKSk7XG4gICAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGZlYXR1cmUudHlwZSA9PT0gJ0xpbmVTdHJpbmcnKSB7XG4gICAgICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9tYXBib3gvbWFwYm94LWdsLWpzL2lzc3Vlcy8zODA4XG4gICAgICAgIGZvciAoY29uc3QgbGluZSBvZiBmZWF0dXJlLmdlb21ldHJ5KSB7XG4gICAgICAgICAgICBhZGRTeW1ib2xBdEFuY2hvcihsaW5lLCBuZXcgQW5jaG9yKGxpbmVbMF0ueCwgbGluZVswXS55LCAwKSk7XG4gICAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGZlYXR1cmUudHlwZSA9PT0gJ1BvaW50Jykge1xuICAgICAgICBmb3IgKGNvbnN0IHBvaW50cyBvZiBmZWF0dXJlLmdlb21ldHJ5KSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IHBvaW50IG9mIHBvaW50cykge1xuICAgICAgICAgICAgICAgIGFkZFN5bWJvbEF0QW5jaG9yKFtwb2ludF0sIG5ldyBBbmNob3IocG9pbnQueCwgcG9pbnQueSwgMCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufVxuXG5jb25zdCBNQVhfUEFDS0VEX1NJWkUgPSA2NTUzNTtcblxuZnVuY3Rpb24gYWRkVGV4dFZlcnRpY2VzKGJ1Y2tldDogU3ltYm9sQnVja2V0LFxuICAgICAgICAgICAgICAgICAgICAgICAgIGFuY2hvcjogUG9pbnQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgc2hhcGVkVGV4dDogU2hhcGluZyxcbiAgICAgICAgICAgICAgICAgICAgICAgICBsYXllcjogU3ltYm9sU3R5bGVMYXllcixcbiAgICAgICAgICAgICAgICAgICAgICAgICB0ZXh0QWxvbmdMaW5lOiBib29sZWFuLFxuICAgICAgICAgICAgICAgICAgICAgICAgIGZlYXR1cmU6IFN5bWJvbEZlYXR1cmUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgdGV4dE9mZnNldDogW251bWJlciwgbnVtYmVyXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICBsaW5lQXJyYXk6IHtsaW5lU3RhcnRJbmRleDogbnVtYmVyLCBsaW5lTGVuZ3RoOiBudW1iZXJ9LFxuICAgICAgICAgICAgICAgICAgICAgICAgIHdyaXRpbmdNb2RlOiBudW1iZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgcGxhY2VkVGV4dFN5bWJvbEluZGljZXM6IEFycmF5PG51bWJlcj4sXG4gICAgICAgICAgICAgICAgICAgICAgICAgZ2x5cGhQb3NpdGlvbk1hcDoge1tzdHJpbmddOiB7W251bWJlcl06IEdseXBoUG9zaXRpb259fSxcbiAgICAgICAgICAgICAgICAgICAgICAgICBzaXplczogU2l6ZXMpIHtcbiAgICBjb25zdCBnbHlwaFF1YWRzID0gZ2V0R2x5cGhRdWFkcyhhbmNob3IsIHNoYXBlZFRleHQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGF5ZXIsIHRleHRBbG9uZ0xpbmUsIGZlYXR1cmUsIGdseXBoUG9zaXRpb25NYXApO1xuXG4gICAgY29uc3Qgc2l6ZURhdGEgPSBidWNrZXQudGV4dFNpemVEYXRhO1xuICAgIGxldCB0ZXh0U2l6ZURhdGEgPSBudWxsO1xuXG4gICAgaWYgKHNpemVEYXRhLmZ1bmN0aW9uVHlwZSA9PT0gJ3NvdXJjZScpIHtcbiAgICAgICAgdGV4dFNpemVEYXRhID0gW1xuICAgICAgICAgICAgU0laRV9QQUNLX0ZBQ1RPUiAqIGxheWVyLmxheW91dC5nZXQoJ3RleHQtc2l6ZScpLmV2YWx1YXRlKGZlYXR1cmUsIHt9KVxuICAgICAgICBdO1xuICAgICAgICBpZiAodGV4dFNpemVEYXRhWzBdID4gTUFYX1BBQ0tFRF9TSVpFKSB7XG4gICAgICAgICAgICB3YXJuT25jZShgJHtidWNrZXQubGF5ZXJJZHNbMF19OiBWYWx1ZSBmb3IgXCJ0ZXh0LXNpemVcIiBpcyA+PSAyNTYuIFJlZHVjZSB5b3VyIFwidGV4dC1zaXplXCIuYCk7XG4gICAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHNpemVEYXRhLmZ1bmN0aW9uVHlwZSA9PT0gJ2NvbXBvc2l0ZScpIHtcbiAgICAgICAgdGV4dFNpemVEYXRhID0gW1xuICAgICAgICAgICAgU0laRV9QQUNLX0ZBQ1RPUiAqIHNpemVzLmNvbXBvc2l0ZVRleHRTaXplc1swXS5ldmFsdWF0ZShmZWF0dXJlLCB7fSksXG4gICAgICAgICAgICBTSVpFX1BBQ0tfRkFDVE9SICogc2l6ZXMuY29tcG9zaXRlVGV4dFNpemVzWzFdLmV2YWx1YXRlKGZlYXR1cmUsIHt9KVxuICAgICAgICBdO1xuICAgICAgICBpZiAodGV4dFNpemVEYXRhWzBdID4gTUFYX1BBQ0tFRF9TSVpFIHx8IHRleHRTaXplRGF0YVsxXSA+IE1BWF9QQUNLRURfU0laRSkge1xuICAgICAgICAgICAgd2Fybk9uY2UoYCR7YnVja2V0LmxheWVySWRzWzBdfTogVmFsdWUgZm9yIFwidGV4dC1zaXplXCIgaXMgPj0gMjU2LiBSZWR1Y2UgeW91ciBcInRleHQtc2l6ZVwiLmApO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgYnVja2V0LmFkZFN5bWJvbHMoXG4gICAgICAgIGJ1Y2tldC50ZXh0LFxuICAgICAgICBnbHlwaFF1YWRzLFxuICAgICAgICB0ZXh0U2l6ZURhdGEsXG4gICAgICAgIHRleHRPZmZzZXQsXG4gICAgICAgIHRleHRBbG9uZ0xpbmUsXG4gICAgICAgIGZlYXR1cmUsXG4gICAgICAgIHdyaXRpbmdNb2RlLFxuICAgICAgICBhbmNob3IsXG4gICAgICAgIGxpbmVBcnJheS5saW5lU3RhcnRJbmRleCxcbiAgICAgICAgbGluZUFycmF5LmxpbmVMZW5ndGgpO1xuXG4gICAgLy8gVGhlIHBsYWNlZFN5bWJvbEFycmF5IGlzIHVzZWQgYXQgcmVuZGVyIHRpbWUgaW4gZHJhd1RpbGVTeW1ib2xzXG4gICAgLy8gVGhlc2UgaW5kaWNlcyBhbGxvdyBhY2Nlc3MgdG8gdGhlIGFycmF5IGF0IGNvbGxpc2lvbiBkZXRlY3Rpb24gdGltZVxuICAgIHBsYWNlZFRleHRTeW1ib2xJbmRpY2VzLnB1c2goYnVja2V0LnRleHQucGxhY2VkU3ltYm9sQXJyYXkubGVuZ3RoIC0gMSk7XG5cbiAgICByZXR1cm4gZ2x5cGhRdWFkcy5sZW5ndGggKiA0O1xufVxuXG5cbi8qKlxuICogQWRkIGEgc2luZ2xlIGxhYmVsICYgaWNvbiBwbGFjZW1lbnQuXG4gKlxuICogQHByaXZhdGVcbiAqL1xuZnVuY3Rpb24gYWRkU3ltYm9sKGJ1Y2tldDogU3ltYm9sQnVja2V0LFxuICAgICAgICAgICAgICAgICAgIGFuY2hvcjogQW5jaG9yLFxuICAgICAgICAgICAgICAgICAgIGxpbmU6IEFycmF5PFBvaW50PixcbiAgICAgICAgICAgICAgICAgICBzaGFwZWRUZXh0T3JpZW50YXRpb25zOiBhbnksXG4gICAgICAgICAgICAgICAgICAgc2hhcGVkSWNvbjogUG9zaXRpb25lZEljb24gfCB2b2lkLFxuICAgICAgICAgICAgICAgICAgIGxheWVyOiBTeW1ib2xTdHlsZUxheWVyLFxuICAgICAgICAgICAgICAgICAgIGNvbGxpc2lvbkJveEFycmF5OiBDb2xsaXNpb25Cb3hBcnJheSxcbiAgICAgICAgICAgICAgICAgICBmZWF0dXJlSW5kZXg6IG51bWJlcixcbiAgICAgICAgICAgICAgICAgICBzb3VyY2VMYXllckluZGV4OiBudW1iZXIsXG4gICAgICAgICAgICAgICAgICAgYnVja2V0SW5kZXg6IG51bWJlcixcbiAgICAgICAgICAgICAgICAgICB0ZXh0Qm94U2NhbGU6IG51bWJlcixcbiAgICAgICAgICAgICAgICAgICB0ZXh0UGFkZGluZzogbnVtYmVyLFxuICAgICAgICAgICAgICAgICAgIHRleHRBbG9uZ0xpbmU6IGJvb2xlYW4sXG4gICAgICAgICAgICAgICAgICAgdGV4dE9mZnNldDogW251bWJlciwgbnVtYmVyXSxcbiAgICAgICAgICAgICAgICAgICBpY29uQm94U2NhbGU6IG51bWJlcixcbiAgICAgICAgICAgICAgICAgICBpY29uUGFkZGluZzogbnVtYmVyLFxuICAgICAgICAgICAgICAgICAgIGljb25BbG9uZ0xpbmU6IGJvb2xlYW4sXG4gICAgICAgICAgICAgICAgICAgaWNvbk9mZnNldDogW251bWJlciwgbnVtYmVyXSxcbiAgICAgICAgICAgICAgICAgICBmZWF0dXJlOiBTeW1ib2xGZWF0dXJlLFxuICAgICAgICAgICAgICAgICAgIGdseXBoUG9zaXRpb25NYXA6IHtbc3RyaW5nXToge1tudW1iZXJdOiBHbHlwaFBvc2l0aW9ufX0sXG4gICAgICAgICAgICAgICAgICAgc2l6ZXM6IFNpemVzKSB7XG4gICAgY29uc3QgbGluZUFycmF5ID0gYnVja2V0LmFkZFRvTGluZVZlcnRleEFycmF5KGFuY2hvciwgbGluZSk7XG5cbiAgICBsZXQgdGV4dENvbGxpc2lvbkZlYXR1cmUsIGljb25Db2xsaXNpb25GZWF0dXJlO1xuXG4gICAgbGV0IG51bUljb25WZXJ0aWNlcyA9IDA7XG4gICAgbGV0IG51bUdseXBoVmVydGljZXMgPSAwO1xuICAgIGxldCBudW1WZXJ0aWNhbEdseXBoVmVydGljZXMgPSAwO1xuICAgIGNvbnN0IGtleSA9IG11cm11cjMoc2hhcGVkVGV4dE9yaWVudGF0aW9ucy5ob3Jpem9udGFsID8gc2hhcGVkVGV4dE9yaWVudGF0aW9ucy5ob3Jpem9udGFsLnRleHQgOiAnJyk7XG4gICAgY29uc3QgcGxhY2VkVGV4dFN5bWJvbEluZGljZXMgPSBbXTtcbiAgICBpZiAoc2hhcGVkVGV4dE9yaWVudGF0aW9ucy5ob3Jpem9udGFsKSB7XG4gICAgICAgIC8vIEFzIGEgY29sbGlzaW9uIGFwcHJveGltYXRpb24sIHdlIGNhbiB1c2UgZWl0aGVyIHRoZSB2ZXJ0aWNhbCBvciB0aGUgaG9yaXpvbnRhbCB2ZXJzaW9uIG9mIHRoZSBmZWF0dXJlXG4gICAgICAgIC8vIFdlJ3JlIGNvdW50aW5nIG9uIHRoZSB0d28gdmVyc2lvbnMgaGF2aW5nIHNpbWlsYXIgZGltZW5zaW9uc1xuICAgICAgICBjb25zdCB0ZXh0Um90YXRlID0gbGF5ZXIubGF5b3V0LmdldCgndGV4dC1yb3RhdGUnKS5ldmFsdWF0ZShmZWF0dXJlLCB7fSk7XG4gICAgICAgIHRleHRDb2xsaXNpb25GZWF0dXJlID0gbmV3IENvbGxpc2lvbkZlYXR1cmUoY29sbGlzaW9uQm94QXJyYXksIGxpbmUsIGFuY2hvciwgZmVhdHVyZUluZGV4LCBzb3VyY2VMYXllckluZGV4LCBidWNrZXRJbmRleCwgc2hhcGVkVGV4dE9yaWVudGF0aW9ucy5ob3Jpem9udGFsLCB0ZXh0Qm94U2NhbGUsIHRleHRQYWRkaW5nLCB0ZXh0QWxvbmdMaW5lLCBidWNrZXQub3ZlcnNjYWxpbmcsIHRleHRSb3RhdGUpO1xuICAgICAgICBudW1HbHlwaFZlcnRpY2VzICs9IGFkZFRleHRWZXJ0aWNlcyhidWNrZXQsIGFuY2hvciwgc2hhcGVkVGV4dE9yaWVudGF0aW9ucy5ob3Jpem9udGFsLCBsYXllciwgdGV4dEFsb25nTGluZSwgZmVhdHVyZSwgdGV4dE9mZnNldCwgbGluZUFycmF5LCBzaGFwZWRUZXh0T3JpZW50YXRpb25zLnZlcnRpY2FsID8gV3JpdGluZ01vZGUuaG9yaXpvbnRhbCA6IFdyaXRpbmdNb2RlLmhvcml6b250YWxPbmx5LCBwbGFjZWRUZXh0U3ltYm9sSW5kaWNlcywgZ2x5cGhQb3NpdGlvbk1hcCwgc2l6ZXMpO1xuXG4gICAgICAgIGlmIChzaGFwZWRUZXh0T3JpZW50YXRpb25zLnZlcnRpY2FsKSB7XG4gICAgICAgICAgICBudW1WZXJ0aWNhbEdseXBoVmVydGljZXMgKz0gYWRkVGV4dFZlcnRpY2VzKGJ1Y2tldCwgYW5jaG9yLCBzaGFwZWRUZXh0T3JpZW50YXRpb25zLnZlcnRpY2FsLCBsYXllciwgdGV4dEFsb25nTGluZSwgZmVhdHVyZSwgdGV4dE9mZnNldCwgbGluZUFycmF5LCBXcml0aW5nTW9kZS52ZXJ0aWNhbCwgcGxhY2VkVGV4dFN5bWJvbEluZGljZXMsIGdseXBoUG9zaXRpb25NYXAsIHNpemVzKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IHRleHRCb3hTdGFydEluZGV4ID0gdGV4dENvbGxpc2lvbkZlYXR1cmUgPyB0ZXh0Q29sbGlzaW9uRmVhdHVyZS5ib3hTdGFydEluZGV4IDogYnVja2V0LmNvbGxpc2lvbkJveEFycmF5Lmxlbmd0aDtcbiAgICBjb25zdCB0ZXh0Qm94RW5kSW5kZXggPSB0ZXh0Q29sbGlzaW9uRmVhdHVyZSA/IHRleHRDb2xsaXNpb25GZWF0dXJlLmJveEVuZEluZGV4IDogYnVja2V0LmNvbGxpc2lvbkJveEFycmF5Lmxlbmd0aDtcblxuICAgIGlmIChzaGFwZWRJY29uKSB7XG4gICAgICAgIGNvbnN0IGljb25RdWFkcyA9IGdldEljb25RdWFkcyhhbmNob3IsIHNoYXBlZEljb24sIGxheWVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGljb25BbG9uZ0xpbmUsIHNoYXBlZFRleHRPcmllbnRhdGlvbnMuaG9yaXpvbnRhbCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmZWF0dXJlKTtcbiAgICAgICAgY29uc3QgaWNvblJvdGF0ZSA9IGxheWVyLmxheW91dC5nZXQoJ2ljb24tcm90YXRlJykuZXZhbHVhdGUoZmVhdHVyZSwge30pO1xuICAgICAgICBpY29uQ29sbGlzaW9uRmVhdHVyZSA9IG5ldyBDb2xsaXNpb25GZWF0dXJlKGNvbGxpc2lvbkJveEFycmF5LCBsaW5lLCBhbmNob3IsIGZlYXR1cmVJbmRleCwgc291cmNlTGF5ZXJJbmRleCwgYnVja2V0SW5kZXgsIHNoYXBlZEljb24sIGljb25Cb3hTY2FsZSwgaWNvblBhZGRpbmcsIC8qYWxpZ24gYm94ZXMgdG8gbGluZSovZmFsc2UsIGJ1Y2tldC5vdmVyc2NhbGluZywgaWNvblJvdGF0ZSk7XG5cbiAgICAgICAgbnVtSWNvblZlcnRpY2VzID0gaWNvblF1YWRzLmxlbmd0aCAqIDQ7XG5cbiAgICAgICAgY29uc3Qgc2l6ZURhdGEgPSBidWNrZXQuaWNvblNpemVEYXRhO1xuICAgICAgICBsZXQgaWNvblNpemVEYXRhID0gbnVsbDtcblxuICAgICAgICBpZiAoc2l6ZURhdGEuZnVuY3Rpb25UeXBlID09PSAnc291cmNlJykge1xuICAgICAgICAgICAgaWNvblNpemVEYXRhID0gW1xuICAgICAgICAgICAgICAgIFNJWkVfUEFDS19GQUNUT1IgKiBsYXllci5sYXlvdXQuZ2V0KCdpY29uLXNpemUnKS5ldmFsdWF0ZShmZWF0dXJlLCB7fSlcbiAgICAgICAgICAgIF07XG4gICAgICAgICAgICBpZiAoaWNvblNpemVEYXRhWzBdID4gTUFYX1BBQ0tFRF9TSVpFKSB7XG4gICAgICAgICAgICAgICAgd2Fybk9uY2UoYCR7YnVja2V0LmxheWVySWRzWzBdfTogVmFsdWUgZm9yIFwiaWNvbi1zaXplXCIgaXMgPj0gMjU2LiBSZWR1Y2UgeW91ciBcImljb24tc2l6ZVwiLmApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKHNpemVEYXRhLmZ1bmN0aW9uVHlwZSA9PT0gJ2NvbXBvc2l0ZScpIHtcbiAgICAgICAgICAgIGljb25TaXplRGF0YSA9IFtcbiAgICAgICAgICAgICAgICBTSVpFX1BBQ0tfRkFDVE9SICogc2l6ZXMuY29tcG9zaXRlSWNvblNpemVzWzBdLmV2YWx1YXRlKGZlYXR1cmUsIHt9KSxcbiAgICAgICAgICAgICAgICBTSVpFX1BBQ0tfRkFDVE9SICogc2l6ZXMuY29tcG9zaXRlSWNvblNpemVzWzFdLmV2YWx1YXRlKGZlYXR1cmUsIHt9KVxuICAgICAgICAgICAgXTtcbiAgICAgICAgICAgIGlmIChpY29uU2l6ZURhdGFbMF0gPiBNQVhfUEFDS0VEX1NJWkUgfHwgaWNvblNpemVEYXRhWzFdID4gTUFYX1BBQ0tFRF9TSVpFKSB7XG4gICAgICAgICAgICAgICAgd2Fybk9uY2UoYCR7YnVja2V0LmxheWVySWRzWzBdfTogVmFsdWUgZm9yIFwiaWNvbi1zaXplXCIgaXMgPj0gMjU2LiBSZWR1Y2UgeW91ciBcImljb24tc2l6ZVwiLmApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgYnVja2V0LmFkZFN5bWJvbHMoXG4gICAgICAgICAgICBidWNrZXQuaWNvbixcbiAgICAgICAgICAgIGljb25RdWFkcyxcbiAgICAgICAgICAgIGljb25TaXplRGF0YSxcbiAgICAgICAgICAgIGljb25PZmZzZXQsXG4gICAgICAgICAgICBpY29uQWxvbmdMaW5lLFxuICAgICAgICAgICAgZmVhdHVyZSxcbiAgICAgICAgICAgIGZhbHNlLFxuICAgICAgICAgICAgYW5jaG9yLFxuICAgICAgICAgICAgbGluZUFycmF5LmxpbmVTdGFydEluZGV4LFxuICAgICAgICAgICAgbGluZUFycmF5LmxpbmVMZW5ndGgpO1xuICAgIH1cblxuICAgIGNvbnN0IGljb25Cb3hTdGFydEluZGV4ID0gaWNvbkNvbGxpc2lvbkZlYXR1cmUgPyBpY29uQ29sbGlzaW9uRmVhdHVyZS5ib3hTdGFydEluZGV4IDogYnVja2V0LmNvbGxpc2lvbkJveEFycmF5Lmxlbmd0aDtcbiAgICBjb25zdCBpY29uQm94RW5kSW5kZXggPSBpY29uQ29sbGlzaW9uRmVhdHVyZSA/IGljb25Db2xsaXNpb25GZWF0dXJlLmJveEVuZEluZGV4IDogYnVja2V0LmNvbGxpc2lvbkJveEFycmF5Lmxlbmd0aDtcblxuICAgIGlmIChidWNrZXQuZ2x5cGhPZmZzZXRBcnJheS5sZW5ndGggPj0gU3ltYm9sQnVja2V0Lk1BWF9HTFlQSFMpIHdhcm5PbmNlKFxuICAgICAgICBcIlRvbyBtYW55IGdseXBocyBiZWluZyByZW5kZXJlZCBpbiBhIHRpbGUuIFNlZSBodHRwczovL2dpdGh1Yi5jb20vbWFwYm94L21hcGJveC1nbC1qcy9pc3N1ZXMvMjkwN1wiXG4gICAgKTtcblxuICAgIGJ1Y2tldC5zeW1ib2xJbnN0YW5jZXMuZW1wbGFjZUJhY2soXG4gICAgICAgIGFuY2hvci54LFxuICAgICAgICBhbmNob3IueSxcbiAgICAgICAgcGxhY2VkVGV4dFN5bWJvbEluZGljZXMubGVuZ3RoID4gMCA/IHBsYWNlZFRleHRTeW1ib2xJbmRpY2VzWzBdIDogLTEsXG4gICAgICAgIHBsYWNlZFRleHRTeW1ib2xJbmRpY2VzLmxlbmd0aCA+IDEgPyBwbGFjZWRUZXh0U3ltYm9sSW5kaWNlc1sxXSA6IC0xLFxuICAgICAgICBrZXksXG4gICAgICAgIHRleHRCb3hTdGFydEluZGV4LFxuICAgICAgICB0ZXh0Qm94RW5kSW5kZXgsXG4gICAgICAgIGljb25Cb3hTdGFydEluZGV4LFxuICAgICAgICBpY29uQm94RW5kSW5kZXgsXG4gICAgICAgIGZlYXR1cmVJbmRleCxcbiAgICAgICAgbnVtR2x5cGhWZXJ0aWNlcyxcbiAgICAgICAgbnVtVmVydGljYWxHbHlwaFZlcnRpY2VzLFxuICAgICAgICBudW1JY29uVmVydGljZXMsXG4gICAgICAgIDApO1xufVxuXG5mdW5jdGlvbiBhbmNob3JJc1Rvb0Nsb3NlKGJ1Y2tldDogYW55LCB0ZXh0OiBzdHJpbmcsIHJlcGVhdERpc3RhbmNlOiBudW1iZXIsIGFuY2hvcjogUG9pbnQpIHtcbiAgICBjb25zdCBjb21wYXJlVGV4dCA9IGJ1Y2tldC5jb21wYXJlVGV4dDtcbiAgICBpZiAoISh0ZXh0IGluIGNvbXBhcmVUZXh0KSkge1xuICAgICAgICBjb21wYXJlVGV4dFt0ZXh0XSA9IFtdO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IG90aGVyQW5jaG9ycyA9IGNvbXBhcmVUZXh0W3RleHRdO1xuICAgICAgICBmb3IgKGxldCBrID0gb3RoZXJBbmNob3JzLmxlbmd0aCAtIDE7IGsgPj0gMDsgay0tKSB7XG4gICAgICAgICAgICBpZiAoYW5jaG9yLmRpc3Qob3RoZXJBbmNob3JzW2tdKSA8IHJlcGVhdERpc3RhbmNlKSB7XG4gICAgICAgICAgICAgICAgLy8gSWYgaXQncyB3aXRoaW4gcmVwZWF0RGlzdGFuY2Ugb2Ygb25lIGFuY2hvciwgc3RvcCBsb29raW5nXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgLy8gSWYgYW5jaG9yIGlzIG5vdCB3aXRoaW4gcmVwZWF0RGlzdGFuY2Ugb2YgYW55IG90aGVyIGFuY2hvciwgYWRkIHRvIGFycmF5XG4gICAgY29tcGFyZVRleHRbdGV4dF0ucHVzaChhbmNob3IpO1xuICAgIHJldHVybiBmYWxzZTtcbn1cbiIsIi8vIEBmbG93XG5cbmltcG9ydCB7IEFscGhhSW1hZ2UgfSBmcm9tICcuLi91dGlsL2ltYWdlJztcbmltcG9ydCB7IHJlZ2lzdGVyIH0gZnJvbSAnLi4vdXRpbC93ZWJfd29ya2VyX3RyYW5zZmVyJztcbmltcG9ydCBwb3RwYWNrIGZyb20gJ3BvdHBhY2snO1xuXG5pbXBvcnQgdHlwZSB7R2x5cGhNZXRyaWNzLCBTdHlsZUdseXBofSBmcm9tICcuLi9zdHlsZS9zdHlsZV9nbHlwaCc7XG5cbmNvbnN0IHBhZGRpbmcgPSAxO1xuXG50eXBlIFJlY3QgPSB7XG4gICAgeDogbnVtYmVyLFxuICAgIHk6IG51bWJlcixcbiAgICB3OiBudW1iZXIsXG4gICAgaDogbnVtYmVyXG59O1xuXG5leHBvcnQgdHlwZSBHbHlwaFBvc2l0aW9uID0ge1xuICAgIHJlY3Q6IFJlY3QsXG4gICAgbWV0cmljczogR2x5cGhNZXRyaWNzXG59O1xuXG5leHBvcnQgdHlwZSBHbHlwaFBvc2l0aW9ucyA9IHsgW3N0cmluZ106IHsgW251bWJlcl06IEdseXBoUG9zaXRpb24gfSB9XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEdseXBoQXRsYXMge1xuICAgIGltYWdlOiBBbHBoYUltYWdlO1xuICAgIHBvc2l0aW9uczogR2x5cGhQb3NpdGlvbnM7XG5cbiAgICBjb25zdHJ1Y3RvcihzdGFja3M6IHsgW3N0cmluZ106IHsgW251bWJlcl06ID9TdHlsZUdseXBoIH0gfSkge1xuICAgICAgICBjb25zdCBwb3NpdGlvbnMgPSB7fTtcbiAgICAgICAgY29uc3QgYmlucyA9IFtdO1xuXG4gICAgICAgIGZvciAoY29uc3Qgc3RhY2sgaW4gc3RhY2tzKSB7XG4gICAgICAgICAgICBjb25zdCBnbHlwaHMgPSBzdGFja3Nbc3RhY2tdO1xuICAgICAgICAgICAgY29uc3Qgc3RhY2tQb3NpdGlvbnMgPSBwb3NpdGlvbnNbc3RhY2tdID0ge307XG5cbiAgICAgICAgICAgIGZvciAoY29uc3QgaWQgaW4gZ2x5cGhzKSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgc3JjID0gZ2x5cGhzWytpZF07XG4gICAgICAgICAgICAgICAgaWYgKCFzcmMgfHwgc3JjLmJpdG1hcC53aWR0aCA9PT0gMCB8fCBzcmMuYml0bWFwLmhlaWdodCA9PT0gMCkgY29udGludWU7XG5cbiAgICAgICAgICAgICAgICBjb25zdCBiaW4gPSB7XG4gICAgICAgICAgICAgICAgICAgIHg6IDAsXG4gICAgICAgICAgICAgICAgICAgIHk6IDAsXG4gICAgICAgICAgICAgICAgICAgIHc6IHNyYy5iaXRtYXAud2lkdGggKyAyICogcGFkZGluZyxcbiAgICAgICAgICAgICAgICAgICAgaDogc3JjLmJpdG1hcC5oZWlnaHQgKyAyICogcGFkZGluZ1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgYmlucy5wdXNoKGJpbik7XG4gICAgICAgICAgICAgICAgc3RhY2tQb3NpdGlvbnNbaWRdID0ge3JlY3Q6IGJpbiwgbWV0cmljczogc3JjLm1ldHJpY3N9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgY29uc3Qge3csIGh9ID0gcG90cGFjayhiaW5zKTtcbiAgICAgICAgY29uc3QgaW1hZ2UgPSBuZXcgQWxwaGFJbWFnZSh7d2lkdGg6IHcgfHwgMSwgaGVpZ2h0OiBoIHx8IDF9KTtcblxuICAgICAgICBmb3IgKGNvbnN0IHN0YWNrIGluIHN0YWNrcykge1xuICAgICAgICAgICAgY29uc3QgZ2x5cGhzID0gc3RhY2tzW3N0YWNrXTtcblxuICAgICAgICAgICAgZm9yIChjb25zdCBpZCBpbiBnbHlwaHMpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBzcmMgPSBnbHlwaHNbK2lkXTtcbiAgICAgICAgICAgICAgICBpZiAoIXNyYyB8fCBzcmMuYml0bWFwLndpZHRoID09PSAwIHx8IHNyYy5iaXRtYXAuaGVpZ2h0ID09PSAwKSBjb250aW51ZTtcbiAgICAgICAgICAgICAgICBjb25zdCBiaW4gPSBwb3NpdGlvbnNbc3RhY2tdW2lkXS5yZWN0O1xuICAgICAgICAgICAgICAgIEFscGhhSW1hZ2UuY29weShzcmMuYml0bWFwLCBpbWFnZSwge3g6IDAsIHk6IDB9LCB7eDogYmluLnggKyBwYWRkaW5nLCB5OiBiaW4ueSArIHBhZGRpbmd9LCBzcmMuYml0bWFwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuaW1hZ2UgPSBpbWFnZTtcbiAgICAgICAgdGhpcy5wb3NpdGlvbnMgPSBwb3NpdGlvbnM7XG4gICAgfVxufVxuXG5yZWdpc3RlcignR2x5cGhBdGxhcycsIEdseXBoQXRsYXMpO1xuIiwiLy8gQGZsb3dcblxuaW1wb3J0IEZlYXR1cmVJbmRleCBmcm9tICcuLi9kYXRhL2ZlYXR1cmVfaW5kZXgnO1xuXG5pbXBvcnQgeyBwZXJmb3JtU3ltYm9sTGF5b3V0IH0gZnJvbSAnLi4vc3ltYm9sL3N5bWJvbF9sYXlvdXQnO1xuaW1wb3J0IHsgQ29sbGlzaW9uQm94QXJyYXkgfSBmcm9tICcuLi9kYXRhL2FycmF5X3R5cGVzJztcbmltcG9ydCBEaWN0aW9uYXJ5Q29kZXIgZnJvbSAnLi4vdXRpbC9kaWN0aW9uYXJ5X2NvZGVyJztcbmltcG9ydCBTeW1ib2xCdWNrZXQgZnJvbSAnLi4vZGF0YS9idWNrZXQvc3ltYm9sX2J1Y2tldCc7XG5pbXBvcnQgTGluZUJ1Y2tldCBmcm9tICcuLi9kYXRhL2J1Y2tldC9saW5lX2J1Y2tldCc7XG5pbXBvcnQgRmlsbEJ1Y2tldCBmcm9tICcuLi9kYXRhL2J1Y2tldC9maWxsX2J1Y2tldCc7XG5pbXBvcnQgRmlsbEV4dHJ1c2lvbkJ1Y2tldCBmcm9tICcuLi9kYXRhL2J1Y2tldC9maWxsX2V4dHJ1c2lvbl9idWNrZXQnO1xuaW1wb3J0IHsgd2Fybk9uY2UsIG1hcE9iamVjdCwgdmFsdWVzIH0gZnJvbSAnLi4vdXRpbC91dGlsJztcbmltcG9ydCBhc3NlcnQgZnJvbSAnYXNzZXJ0JztcbmltcG9ydCBJbWFnZUF0bGFzIGZyb20gJy4uL3JlbmRlci9pbWFnZV9hdGxhcyc7XG5pbXBvcnQgR2x5cGhBdGxhcyBmcm9tICcuLi9yZW5kZXIvZ2x5cGhfYXRsYXMnO1xuaW1wb3J0IEV2YWx1YXRpb25QYXJhbWV0ZXJzIGZyb20gJy4uL3N0eWxlL2V2YWx1YXRpb25fcGFyYW1ldGVycyc7XG5pbXBvcnQgeyBPdmVyc2NhbGVkVGlsZUlEIH0gZnJvbSAnLi90aWxlX2lkJztcblxuaW1wb3J0IHR5cGUge0J1Y2tldH0gZnJvbSAnLi4vZGF0YS9idWNrZXQnO1xuaW1wb3J0IHR5cGUgQWN0b3IgZnJvbSAnLi4vdXRpbC9hY3Rvcic7XG5pbXBvcnQgdHlwZSBTdHlsZUxheWVyIGZyb20gJy4uL3N0eWxlL3N0eWxlX2xheWVyJztcbmltcG9ydCB0eXBlIFN0eWxlTGF5ZXJJbmRleCBmcm9tICcuLi9zdHlsZS9zdHlsZV9sYXllcl9pbmRleCc7XG5pbXBvcnQgdHlwZSB7U3R5bGVJbWFnZX0gZnJvbSAnLi4vc3R5bGUvc3R5bGVfaW1hZ2UnO1xuaW1wb3J0IHR5cGUge1N0eWxlR2x5cGh9IGZyb20gJy4uL3N0eWxlL3N0eWxlX2dseXBoJztcbmltcG9ydCB0eXBlIHtcbiAgICBXb3JrZXJUaWxlUGFyYW1ldGVycyxcbiAgICBXb3JrZXJUaWxlQ2FsbGJhY2ssXG59IGZyb20gJy4uL3NvdXJjZS93b3JrZXJfc291cmNlJztcblxuY2xhc3MgV29ya2VyVGlsZSB7XG4gICAgdGlsZUlEOiBPdmVyc2NhbGVkVGlsZUlEO1xuICAgIHVpZDogc3RyaW5nO1xuICAgIHpvb206IG51bWJlcjtcbiAgICBwaXhlbFJhdGlvOiBudW1iZXI7XG4gICAgdGlsZVNpemU6IG51bWJlcjtcbiAgICBzb3VyY2U6IHN0cmluZztcbiAgICBvdmVyc2NhbGluZzogbnVtYmVyO1xuICAgIHNob3dDb2xsaXNpb25Cb3hlczogYm9vbGVhbjtcbiAgICBjb2xsZWN0UmVzb3VyY2VUaW1pbmc6IGJvb2xlYW47XG4gICAgcmV0dXJuRGVwZW5kZW5jaWVzOiBib29sZWFuO1xuXG4gICAgc3RhdHVzOiAncGFyc2luZycgfCAnZG9uZSc7XG4gICAgZGF0YTogVmVjdG9yVGlsZTtcbiAgICBjb2xsaXNpb25Cb3hBcnJheTogQ29sbGlzaW9uQm94QXJyYXk7XG5cbiAgICBhYm9ydDogPygpID0+IHZvaWQ7XG4gICAgcmVsb2FkQ2FsbGJhY2s6IFdvcmtlclRpbGVDYWxsYmFjaztcbiAgICB2ZWN0b3JUaWxlOiBWZWN0b3JUaWxlO1xuXG4gICAgY29uc3RydWN0b3IocGFyYW1zOiBXb3JrZXJUaWxlUGFyYW1ldGVycykge1xuICAgICAgICB0aGlzLnRpbGVJRCA9IG5ldyBPdmVyc2NhbGVkVGlsZUlEKHBhcmFtcy50aWxlSUQub3ZlcnNjYWxlZFosIHBhcmFtcy50aWxlSUQud3JhcCwgcGFyYW1zLnRpbGVJRC5jYW5vbmljYWwueiwgcGFyYW1zLnRpbGVJRC5jYW5vbmljYWwueCwgcGFyYW1zLnRpbGVJRC5jYW5vbmljYWwueSk7XG4gICAgICAgIHRoaXMudWlkID0gcGFyYW1zLnVpZDtcbiAgICAgICAgdGhpcy56b29tID0gcGFyYW1zLnpvb207XG4gICAgICAgIHRoaXMucGl4ZWxSYXRpbyA9IHBhcmFtcy5waXhlbFJhdGlvO1xuICAgICAgICB0aGlzLnRpbGVTaXplID0gcGFyYW1zLnRpbGVTaXplO1xuICAgICAgICB0aGlzLnNvdXJjZSA9IHBhcmFtcy5zb3VyY2U7XG4gICAgICAgIHRoaXMub3ZlcnNjYWxpbmcgPSB0aGlzLnRpbGVJRC5vdmVyc2NhbGVGYWN0b3IoKTtcbiAgICAgICAgdGhpcy5zaG93Q29sbGlzaW9uQm94ZXMgPSBwYXJhbXMuc2hvd0NvbGxpc2lvbkJveGVzO1xuICAgICAgICB0aGlzLmNvbGxlY3RSZXNvdXJjZVRpbWluZyA9ICEhcGFyYW1zLmNvbGxlY3RSZXNvdXJjZVRpbWluZztcbiAgICAgICAgdGhpcy5yZXR1cm5EZXBlbmRlbmNpZXMgPSAhIXBhcmFtcy5yZXR1cm5EZXBlbmRlbmNpZXM7XG4gICAgfVxuXG4gICAgcGFyc2UoZGF0YTogVmVjdG9yVGlsZSwgbGF5ZXJJbmRleDogU3R5bGVMYXllckluZGV4LCBhY3RvcjogQWN0b3IsIGNhbGxiYWNrOiBXb3JrZXJUaWxlQ2FsbGJhY2spIHtcbiAgICAgICAgdGhpcy5zdGF0dXMgPSAncGFyc2luZyc7XG4gICAgICAgIHRoaXMuZGF0YSA9IGRhdGE7XG5cbiAgICAgICAgdGhpcy5jb2xsaXNpb25Cb3hBcnJheSA9IG5ldyBDb2xsaXNpb25Cb3hBcnJheSgpO1xuICAgICAgICBjb25zdCBzb3VyY2VMYXllckNvZGVyID0gbmV3IERpY3Rpb25hcnlDb2RlcihPYmplY3Qua2V5cyhkYXRhLmxheWVycykuc29ydCgpKTtcblxuICAgICAgICBjb25zdCBmZWF0dXJlSW5kZXggPSBuZXcgRmVhdHVyZUluZGV4KHRoaXMudGlsZUlEKTtcbiAgICAgICAgZmVhdHVyZUluZGV4LmJ1Y2tldExheWVySURzID0gW107XG5cbiAgICAgICAgY29uc3QgYnVja2V0czoge1tzdHJpbmddOiBCdWNrZXR9ID0ge307XG5cbiAgICAgICAgY29uc3Qgb3B0aW9ucyA9IHtcbiAgICAgICAgICAgIGZlYXR1cmVJbmRleDogZmVhdHVyZUluZGV4LFxuICAgICAgICAgICAgaWNvbkRlcGVuZGVuY2llczoge30sXG4gICAgICAgICAgICBwYXR0ZXJuRGVwZW5kZW5jaWVzOiB7fSxcbiAgICAgICAgICAgIGdseXBoRGVwZW5kZW5jaWVzOiB7fVxuICAgICAgICB9O1xuXG4gICAgICAgIGNvbnN0IGxheWVyRmFtaWxpZXMgPSBsYXllckluZGV4LmZhbWlsaWVzQnlTb3VyY2VbdGhpcy5zb3VyY2VdO1xuICAgICAgICBmb3IgKGNvbnN0IHNvdXJjZUxheWVySWQgaW4gbGF5ZXJGYW1pbGllcykge1xuICAgICAgICAgICAgY29uc3Qgc291cmNlTGF5ZXIgPSBkYXRhLmxheWVyc1tzb3VyY2VMYXllcklkXTtcbiAgICAgICAgICAgIGlmICghc291cmNlTGF5ZXIpIHtcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKHNvdXJjZUxheWVyLnZlcnNpb24gPT09IDEpIHtcbiAgICAgICAgICAgICAgICB3YXJuT25jZShgVmVjdG9yIHRpbGUgc291cmNlIFwiJHt0aGlzLnNvdXJjZX1cIiBsYXllciBcIiR7c291cmNlTGF5ZXJJZH1cIiBgICtcbiAgICAgICAgICAgICAgICAgICAgYGRvZXMgbm90IHVzZSB2ZWN0b3IgdGlsZSBzcGVjIHYyIGFuZCB0aGVyZWZvcmUgbWF5IGhhdmUgc29tZSByZW5kZXJpbmcgZXJyb3JzLmApO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBzb3VyY2VMYXllckluZGV4ID0gc291cmNlTGF5ZXJDb2Rlci5lbmNvZGUoc291cmNlTGF5ZXJJZCk7XG4gICAgICAgICAgICBjb25zdCBmZWF0dXJlcyA9IFtdO1xuICAgICAgICAgICAgZm9yIChsZXQgaW5kZXggPSAwOyBpbmRleCA8IHNvdXJjZUxheWVyLmxlbmd0aDsgaW5kZXgrKykge1xuICAgICAgICAgICAgICAgIGNvbnN0IGZlYXR1cmUgPSBzb3VyY2VMYXllci5mZWF0dXJlKGluZGV4KTtcbiAgICAgICAgICAgICAgICBmZWF0dXJlcy5wdXNoKHsgZmVhdHVyZSwgaW5kZXgsIHNvdXJjZUxheWVySW5kZXggfSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGZvciAoY29uc3QgZmFtaWx5IG9mIGxheWVyRmFtaWxpZXNbc291cmNlTGF5ZXJJZF0pIHtcbiAgICAgICAgICAgICAgICBjb25zdCBsYXllciA9IGZhbWlseVswXTtcblxuICAgICAgICAgICAgICAgIGFzc2VydChsYXllci5zb3VyY2UgPT09IHRoaXMuc291cmNlKTtcbiAgICAgICAgICAgICAgICBpZiAobGF5ZXIubWluem9vbSAmJiB0aGlzLnpvb20gPCBNYXRoLmZsb29yKGxheWVyLm1pbnpvb20pKSBjb250aW51ZTtcbiAgICAgICAgICAgICAgICBpZiAobGF5ZXIubWF4em9vbSAmJiB0aGlzLnpvb20gPj0gbGF5ZXIubWF4em9vbSkgY29udGludWU7XG4gICAgICAgICAgICAgICAgaWYgKGxheWVyLnZpc2liaWxpdHkgPT09ICdub25lJykgY29udGludWU7XG5cbiAgICAgICAgICAgICAgICByZWNhbGN1bGF0ZUxheWVycyhmYW1pbHksIHRoaXMuem9vbSk7XG5cbiAgICAgICAgICAgICAgICBjb25zdCBidWNrZXQgPSBidWNrZXRzW2xheWVyLmlkXSA9IGxheWVyLmNyZWF0ZUJ1Y2tldCh7XG4gICAgICAgICAgICAgICAgICAgIGluZGV4OiBmZWF0dXJlSW5kZXguYnVja2V0TGF5ZXJJRHMubGVuZ3RoLFxuICAgICAgICAgICAgICAgICAgICBsYXllcnM6IGZhbWlseSxcbiAgICAgICAgICAgICAgICAgICAgem9vbTogdGhpcy56b29tLFxuICAgICAgICAgICAgICAgICAgICBwaXhlbFJhdGlvOiB0aGlzLnBpeGVsUmF0aW8sXG4gICAgICAgICAgICAgICAgICAgIG92ZXJzY2FsaW5nOiB0aGlzLm92ZXJzY2FsaW5nLFxuICAgICAgICAgICAgICAgICAgICBjb2xsaXNpb25Cb3hBcnJheTogdGhpcy5jb2xsaXNpb25Cb3hBcnJheSxcbiAgICAgICAgICAgICAgICAgICAgc291cmNlTGF5ZXJJbmRleDogc291cmNlTGF5ZXJJbmRleCxcbiAgICAgICAgICAgICAgICAgICAgc291cmNlSUQ6IHRoaXMuc291cmNlXG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICBidWNrZXQucG9wdWxhdGUoZmVhdHVyZXMsIG9wdGlvbnMpO1xuICAgICAgICAgICAgICAgIGZlYXR1cmVJbmRleC5idWNrZXRMYXllcklEcy5wdXNoKGZhbWlseS5tYXAoKGwpID0+IGwuaWQpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGxldCBlcnJvcjogP0Vycm9yO1xuICAgICAgICBsZXQgZ2x5cGhNYXA6ID97W3N0cmluZ106IHtbbnVtYmVyXTogP1N0eWxlR2x5cGh9fTtcbiAgICAgICAgbGV0IGljb25NYXA6ID97W3N0cmluZ106IFN0eWxlSW1hZ2V9O1xuICAgICAgICBsZXQgcGF0dGVybk1hcDogP3tbc3RyaW5nXTogU3R5bGVJbWFnZX07XG5cbiAgICAgICAgY29uc3Qgc3RhY2tzID0gbWFwT2JqZWN0KG9wdGlvbnMuZ2x5cGhEZXBlbmRlbmNpZXMsIChnbHlwaHMpID0+IE9iamVjdC5rZXlzKGdseXBocykubWFwKE51bWJlcikpO1xuICAgICAgICBpZiAoT2JqZWN0LmtleXMoc3RhY2tzKS5sZW5ndGgpIHtcbiAgICAgICAgICAgIGFjdG9yLnNlbmQoJ2dldEdseXBocycsIHt1aWQ6IHRoaXMudWlkLCBzdGFja3N9LCAoZXJyLCByZXN1bHQpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoIWVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgIGVycm9yID0gZXJyO1xuICAgICAgICAgICAgICAgICAgICBnbHlwaE1hcCA9IHJlc3VsdDtcbiAgICAgICAgICAgICAgICAgICAgbWF5YmVQcmVwYXJlLmNhbGwodGhpcyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBnbHlwaE1hcCA9IHt9O1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgaWNvbnMgPSBPYmplY3Qua2V5cyhvcHRpb25zLmljb25EZXBlbmRlbmNpZXMpO1xuICAgICAgICBpZiAoaWNvbnMubGVuZ3RoKSB7XG4gICAgICAgICAgICBhY3Rvci5zZW5kKCdnZXRJbWFnZXMnLCB7aWNvbnN9LCAoZXJyLCByZXN1bHQpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoIWVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgIGVycm9yID0gZXJyO1xuICAgICAgICAgICAgICAgICAgICBpY29uTWFwID0gcmVzdWx0O1xuICAgICAgICAgICAgICAgICAgICBtYXliZVByZXBhcmUuY2FsbCh0aGlzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGljb25NYXAgPSB7fTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHBhdHRlcm5zID0gT2JqZWN0LmtleXMob3B0aW9ucy5wYXR0ZXJuRGVwZW5kZW5jaWVzKTtcbiAgICAgICAgaWYgKHBhdHRlcm5zLmxlbmd0aCkge1xuICAgICAgICAgICAgYWN0b3Iuc2VuZCgnZ2V0SW1hZ2VzJywge2ljb25zOiBwYXR0ZXJuc30sIChlcnIsIHJlc3VsdCkgPT4ge1xuICAgICAgICAgICAgICAgIGlmICghZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgZXJyb3IgPSBlcnI7XG4gICAgICAgICAgICAgICAgICAgIHBhdHRlcm5NYXAgPSByZXN1bHQ7XG4gICAgICAgICAgICAgICAgICAgIG1heWJlUHJlcGFyZS5jYWxsKHRoaXMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcGF0dGVybk1hcCA9IHt9O1xuICAgICAgICB9XG5cblxuICAgICAgICBtYXliZVByZXBhcmUuY2FsbCh0aGlzKTtcblxuICAgICAgICBmdW5jdGlvbiBtYXliZVByZXBhcmUoKSB7XG4gICAgICAgICAgICBpZiAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyb3IpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChnbHlwaE1hcCAmJiBpY29uTWFwICYmIHBhdHRlcm5NYXApIHtcbiAgICAgICAgICAgICAgICBjb25zdCBnbHlwaEF0bGFzID0gbmV3IEdseXBoQXRsYXMoZ2x5cGhNYXApO1xuICAgICAgICAgICAgICAgIGNvbnN0IGltYWdlQXRsYXMgPSBuZXcgSW1hZ2VBdGxhcyhpY29uTWFwLCBwYXR0ZXJuTWFwKTtcblxuICAgICAgICAgICAgICAgIGZvciAoY29uc3Qga2V5IGluIGJ1Y2tldHMpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgYnVja2V0ID0gYnVja2V0c1trZXldO1xuICAgICAgICAgICAgICAgICAgICBpZiAoYnVja2V0IGluc3RhbmNlb2YgU3ltYm9sQnVja2V0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZWNhbGN1bGF0ZUxheWVycyhidWNrZXQubGF5ZXJzLCB0aGlzLnpvb20pO1xuICAgICAgICAgICAgICAgICAgICAgICAgcGVyZm9ybVN5bWJvbExheW91dChidWNrZXQsIGdseXBoTWFwLCBnbHlwaEF0bGFzLnBvc2l0aW9ucywgaWNvbk1hcCwgaW1hZ2VBdGxhcy5pY29uUG9zaXRpb25zLCB0aGlzLnNob3dDb2xsaXNpb25Cb3hlcyk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoYnVja2V0Lmhhc1BhdHRlcm4gJiZcbiAgICAgICAgICAgICAgICAgICAgICAgIChidWNrZXQgaW5zdGFuY2VvZiBMaW5lQnVja2V0IHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAgYnVja2V0IGluc3RhbmNlb2YgRmlsbEJ1Y2tldCB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgIGJ1Y2tldCBpbnN0YW5jZW9mIEZpbGxFeHRydXNpb25CdWNrZXQpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZWNhbGN1bGF0ZUxheWVycyhidWNrZXQubGF5ZXJzLCB0aGlzLnpvb20pO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnVja2V0LmFkZEZlYXR1cmVzKG9wdGlvbnMsIGltYWdlQXRsYXMucGF0dGVyblBvc2l0aW9ucyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB0aGlzLnN0YXR1cyA9ICdkb25lJztcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhudWxsLCB7XG4gICAgICAgICAgICAgICAgICAgIGJ1Y2tldHM6IHZhbHVlcyhidWNrZXRzKS5maWx0ZXIoYiA9PiAhYi5pc0VtcHR5KCkpLFxuICAgICAgICAgICAgICAgICAgICBmZWF0dXJlSW5kZXgsXG4gICAgICAgICAgICAgICAgICAgIGNvbGxpc2lvbkJveEFycmF5OiB0aGlzLmNvbGxpc2lvbkJveEFycmF5LFxuICAgICAgICAgICAgICAgICAgICBnbHlwaEF0bGFzSW1hZ2U6IGdseXBoQXRsYXMuaW1hZ2UsXG4gICAgICAgICAgICAgICAgICAgIGltYWdlQXRsYXM6IGltYWdlQXRsYXMsXG4gICAgICAgICAgICAgICAgICAgIC8vIE9ubHkgdXNlZCBmb3IgYmVuY2htYXJraW5nOlxuICAgICAgICAgICAgICAgICAgICBnbHlwaE1hcDogdGhpcy5yZXR1cm5EZXBlbmRlbmNpZXMgPyBnbHlwaE1hcCA6IG51bGwsXG4gICAgICAgICAgICAgICAgICAgIGljb25NYXA6IHRoaXMucmV0dXJuRGVwZW5kZW5jaWVzID8gaWNvbk1hcCA6IG51bGwsXG4gICAgICAgICAgICAgICAgICAgIGdseXBoUG9zaXRpb25zOiB0aGlzLnJldHVybkRlcGVuZGVuY2llcyA/IGdseXBoQXRsYXMucG9zaXRpb25zIDogbnVsbFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufVxuXG5mdW5jdGlvbiByZWNhbGN1bGF0ZUxheWVycyhsYXllcnM6ICRSZWFkT25seUFycmF5PFN0eWxlTGF5ZXI+LCB6b29tOiBudW1iZXIpIHtcbiAgICAvLyBMYXllcnMgYXJlIHNoYXJlZCBhbmQgbWF5IGhhdmUgYmVlbiB1c2VkIGJ5IGEgV29ya2VyVGlsZSB3aXRoIGEgZGlmZmVyZW50IHpvb20uXG4gICAgY29uc3QgcGFyYW1ldGVycyA9IG5ldyBFdmFsdWF0aW9uUGFyYW1ldGVycyh6b29tKTtcbiAgICBmb3IgKGNvbnN0IGxheWVyIG9mIGxheWVycykge1xuICAgICAgICBsYXllci5yZWNhbGN1bGF0ZShwYXJhbWV0ZXJzKTtcbiAgICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IFdvcmtlclRpbGU7XG4iLCIvLyBAZmxvd1xuXG5pbXBvcnQgdHlwZSB7UmVxdWVzdFBhcmFtZXRlcnN9IGZyb20gJy4uL3V0aWwvYWpheCc7XG5cbi8vIFdyYXBzIHBlcmZvcm1hbmNlIHRvIGZhY2lsaXRhdGUgdGVzdGluZ1xuLy8gTm90IGluY29ycG9yYXRlZCBpbnRvIGJyb3dzZXIuanMgYmVjYXVzZSB0aGUgbGF0dGVyIGlzIHBvaXNvbm91cyB3aGVuIHVzZWQgb3V0c2lkZSB0aGUgbWFpbiB0aHJlYWRcbmNvbnN0IHBlcmZvcm1hbmNlRXhpc3RzID0gdHlwZW9mIHBlcmZvcm1hbmNlICE9PSAndW5kZWZpbmVkJztcbmNvbnN0IHdyYXBwZXIgPSB7fTtcblxud3JhcHBlci5nZXRFbnRyaWVzQnlOYW1lID0gKHVybDogc3RyaW5nKSA9PiB7XG4gICAgaWYgKHBlcmZvcm1hbmNlRXhpc3RzICYmIHBlcmZvcm1hbmNlICYmIHBlcmZvcm1hbmNlLmdldEVudHJpZXNCeU5hbWUpXG4gICAgICAgIHJldHVybiBwZXJmb3JtYW5jZS5nZXRFbnRyaWVzQnlOYW1lKHVybCk7XG4gICAgZWxzZVxuICAgICAgICByZXR1cm4gZmFsc2U7XG59O1xuXG53cmFwcGVyLm1hcmsgPSAobmFtZTogc3RyaW5nKSA9PiB7XG4gICAgaWYgKHBlcmZvcm1hbmNlRXhpc3RzICYmIHBlcmZvcm1hbmNlICYmIHBlcmZvcm1hbmNlLm1hcmspXG4gICAgICAgIHJldHVybiBwZXJmb3JtYW5jZS5tYXJrKG5hbWUpO1xuICAgIGVsc2VcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xufTtcblxud3JhcHBlci5tZWFzdXJlID0gKG5hbWU6IHN0cmluZywgc3RhcnRNYXJrOiBzdHJpbmcsIGVuZE1hcms6IHN0cmluZykgPT4ge1xuICAgIGlmIChwZXJmb3JtYW5jZUV4aXN0cyAmJiBwZXJmb3JtYW5jZSAmJiBwZXJmb3JtYW5jZS5tZWFzdXJlKVxuICAgICAgICByZXR1cm4gcGVyZm9ybWFuY2UubWVhc3VyZShuYW1lLCBzdGFydE1hcmssIGVuZE1hcmspO1xuICAgIGVsc2VcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xufTtcblxud3JhcHBlci5jbGVhck1hcmtzID0gKG5hbWU6IHN0cmluZykgPT4ge1xuICAgIGlmIChwZXJmb3JtYW5jZUV4aXN0cyAmJiBwZXJmb3JtYW5jZSAmJiBwZXJmb3JtYW5jZS5jbGVhck1hcmtzKVxuICAgICAgICByZXR1cm4gcGVyZm9ybWFuY2UuY2xlYXJNYXJrcyhuYW1lKTtcbiAgICBlbHNlXG4gICAgICAgIHJldHVybiBmYWxzZTtcbn07XG5cbndyYXBwZXIuY2xlYXJNZWFzdXJlcyA9IChuYW1lOiBzdHJpbmcpID0+IHtcbiAgICBpZiAocGVyZm9ybWFuY2VFeGlzdHMgJiYgcGVyZm9ybWFuY2UgJiYgcGVyZm9ybWFuY2UuY2xlYXJNZWFzdXJlcylcbiAgICAgICAgcmV0dXJuIHBlcmZvcm1hbmNlLmNsZWFyTWVhc3VyZXMobmFtZSk7XG4gICAgZWxzZVxuICAgICAgICByZXR1cm4gZmFsc2U7XG59O1xuXG4vKipcbiAqIFNhZmUgd3JhcHBlciBmb3IgdGhlIHBlcmZvcm1hbmNlIHJlc291cmNlIHRpbWluZyBBUEkgaW4gd2ViIHdvcmtlcnMgd2l0aCBncmFjZWZ1bCBkZWdyYWRhdGlvblxuICpcbiAqIEBwYXJhbSB7UmVxdWVzdFBhcmFtZXRlcnN9IHJlcXVlc3RcbiAqIEBwcml2YXRlXG4gKi9cbmNsYXNzIFBlcmZvcm1hbmNlIHtcbiAgICBfbWFya3M6IHtzdGFydDogc3RyaW5nLCBlbmQ6IHN0cmluZywgbWVhc3VyZTogc3RyaW5nfTtcblxuICAgIGNvbnN0cnVjdG9yIChyZXF1ZXN0OiBSZXF1ZXN0UGFyYW1ldGVycykge1xuICAgICAgICB0aGlzLl9tYXJrcyA9IHtcbiAgICAgICAgICAgIHN0YXJ0OiBbcmVxdWVzdC51cmwsICdzdGFydCddLmpvaW4oJyMnKSxcbiAgICAgICAgICAgIGVuZDogW3JlcXVlc3QudXJsLCAnZW5kJ10uam9pbignIycpLFxuICAgICAgICAgICAgbWVhc3VyZTogcmVxdWVzdC51cmwudG9TdHJpbmcoKVxuICAgICAgICB9O1xuXG4gICAgICAgIHdyYXBwZXIubWFyayh0aGlzLl9tYXJrcy5zdGFydCk7XG4gICAgfVxuXG4gICAgZmluaXNoKCkge1xuICAgICAgICB3cmFwcGVyLm1hcmsodGhpcy5fbWFya3MuZW5kKTtcbiAgICAgICAgbGV0IHJlc291cmNlVGltaW5nRGF0YSA9IHdyYXBwZXIuZ2V0RW50cmllc0J5TmFtZSh0aGlzLl9tYXJrcy5tZWFzdXJlKTtcblxuICAgICAgICAvLyBmYWxsYmFjayBpZiB3ZWIgd29ya2VyIGltcGxlbWVudGF0aW9uIG9mIHBlcmYuZ2V0RW50cmllc0J5TmFtZSByZXR1cm5zIGVtcHR5XG4gICAgICAgIGlmIChyZXNvdXJjZVRpbWluZ0RhdGEubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICB3cmFwcGVyLm1lYXN1cmUodGhpcy5fbWFya3MubWVhc3VyZSwgdGhpcy5fbWFya3Muc3RhcnQsIHRoaXMuX21hcmtzLmVuZCk7XG4gICAgICAgICAgICByZXNvdXJjZVRpbWluZ0RhdGEgPSB3cmFwcGVyLmdldEVudHJpZXNCeU5hbWUodGhpcy5fbWFya3MubWVhc3VyZSk7XG5cbiAgICAgICAgICAgIC8vIGNsZWFudXBcbiAgICAgICAgICAgIHdyYXBwZXIuY2xlYXJNYXJrcyh0aGlzLl9tYXJrcy5zdGFydCk7XG4gICAgICAgICAgICB3cmFwcGVyLmNsZWFyTWFya3ModGhpcy5fbWFya3MuZW5kKTtcbiAgICAgICAgICAgIHdyYXBwZXIuY2xlYXJNZWFzdXJlcyh0aGlzLl9tYXJrcy5tZWFzdXJlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiByZXNvdXJjZVRpbWluZ0RhdGE7XG4gICAgfVxufVxuXG53cmFwcGVyLlBlcmZvcm1hbmNlID0gUGVyZm9ybWFuY2U7XG5cbmV4cG9ydCBkZWZhdWx0IHdyYXBwZXI7XG4iLCIvLyBAZmxvd1xuXG5pbXBvcnQgeyBnZXRBcnJheUJ1ZmZlciB9IGZyb20gJy4uL3V0aWwvYWpheCc7XG5cbmltcG9ydCB2dCBmcm9tICdAbWFwYm94L3ZlY3Rvci10aWxlJztcbmltcG9ydCBQcm90b2J1ZiBmcm9tICdwYmYnO1xuaW1wb3J0IFdvcmtlclRpbGUgZnJvbSAnLi93b3JrZXJfdGlsZSc7XG5pbXBvcnQgeyBleHRlbmQgfSBmcm9tICcuLi91dGlsL3V0aWwnO1xuaW1wb3J0IHBlcmZvcm1hbmNlIGZyb20gJy4uL3V0aWwvcGVyZm9ybWFuY2UnO1xuXG5pbXBvcnQgdHlwZSB7XG4gICAgV29ya2VyU291cmNlLFxuICAgIFdvcmtlclRpbGVQYXJhbWV0ZXJzLFxuICAgIFdvcmtlclRpbGVDYWxsYmFjayxcbiAgICBUaWxlUGFyYW1ldGVyc1xufSBmcm9tICcuLi9zb3VyY2Uvd29ya2VyX3NvdXJjZSc7XG5cbmltcG9ydCB0eXBlIHtQZXJmb3JtYW5jZVJlc291cmNlVGltaW5nfSBmcm9tICcuLi90eXBlcy9wZXJmb3JtYW5jZV9yZXNvdXJjZV90aW1pbmcnO1xuaW1wb3J0IHR5cGUgQWN0b3IgZnJvbSAnLi4vdXRpbC9hY3Rvcic7XG5pbXBvcnQgdHlwZSBTdHlsZUxheWVySW5kZXggZnJvbSAnLi4vc3R5bGUvc3R5bGVfbGF5ZXJfaW5kZXgnO1xuaW1wb3J0IHR5cGUge0NhbGxiYWNrfSBmcm9tICcuLi90eXBlcy9jYWxsYmFjayc7XG5cbmV4cG9ydCB0eXBlIExvYWRWZWN0b3JUaWxlUmVzdWx0ID0ge1xuICAgIHZlY3RvclRpbGU6IFZlY3RvclRpbGU7XG4gICAgcmF3RGF0YTogQXJyYXlCdWZmZXI7XG4gICAgZXhwaXJlcz86IGFueTtcbiAgICBjYWNoZUNvbnRyb2w/OiBhbnk7XG4gICAgcmVzb3VyY2VUaW1pbmc/OiBBcnJheTxQZXJmb3JtYW5jZVJlc291cmNlVGltaW5nPjtcbn07XG5cbi8qKlxuICogQGNhbGxiYWNrIExvYWRWZWN0b3JEYXRhQ2FsbGJhY2tcbiAqIEBwYXJhbSBlcnJvclxuICogQHBhcmFtIHZlY3RvclRpbGVcbiAqIEBwcml2YXRlXG4gKi9cbmV4cG9ydCB0eXBlIExvYWRWZWN0b3JEYXRhQ2FsbGJhY2sgPSBDYWxsYmFjazw/TG9hZFZlY3RvclRpbGVSZXN1bHQ+O1xuXG5leHBvcnQgdHlwZSBBYm9ydFZlY3RvckRhdGEgPSAoKSA9PiB2b2lkO1xuZXhwb3J0IHR5cGUgTG9hZFZlY3RvckRhdGEgPSAocGFyYW1zOiBXb3JrZXJUaWxlUGFyYW1ldGVycywgY2FsbGJhY2s6IExvYWRWZWN0b3JEYXRhQ2FsbGJhY2spID0+ID9BYm9ydFZlY3RvckRhdGE7XG5cbi8qKlxuICogQHByaXZhdGVcbiAqL1xuZnVuY3Rpb24gbG9hZFZlY3RvclRpbGUocGFyYW1zOiBXb3JrZXJUaWxlUGFyYW1ldGVycywgY2FsbGJhY2s6IExvYWRWZWN0b3JEYXRhQ2FsbGJhY2spIHtcbiAgICBjb25zdCByZXF1ZXN0ID0gZ2V0QXJyYXlCdWZmZXIocGFyYW1zLnJlcXVlc3QsIChlcnI6ID9FcnJvciwgZGF0YTogP0FycmF5QnVmZmVyLCBjYWNoZUNvbnRyb2w6ID9zdHJpbmcsIGV4cGlyZXM6ID9zdHJpbmcpID0+IHtcbiAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgY2FsbGJhY2soZXJyKTtcbiAgICAgICAgfSBlbHNlIGlmIChkYXRhKSB7XG4gICAgICAgICAgICBjYWxsYmFjayhudWxsLCB7XG4gICAgICAgICAgICAgICAgdmVjdG9yVGlsZTogbmV3IHZ0LlZlY3RvclRpbGUobmV3IFByb3RvYnVmKGRhdGEpKSxcbiAgICAgICAgICAgICAgICByYXdEYXRhOiBkYXRhLFxuICAgICAgICAgICAgICAgIGNhY2hlQ29udHJvbDogY2FjaGVDb250cm9sLFxuICAgICAgICAgICAgICAgIGV4cGlyZXM6IGV4cGlyZXNcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuICgpID0+IHtcbiAgICAgICAgcmVxdWVzdC5jYW5jZWwoKTtcbiAgICAgICAgY2FsbGJhY2soKTtcbiAgICB9O1xufVxuXG4vKipcbiAqIFRoZSB7QGxpbmsgV29ya2VyU291cmNlfSBpbXBsZW1lbnRhdGlvbiB0aGF0IHN1cHBvcnRzIHtAbGluayBWZWN0b3JUaWxlU291cmNlfS5cbiAqIFRoaXMgY2xhc3MgaXMgZGVzaWduZWQgdG8gYmUgZWFzaWx5IHJldXNlZCB0byBzdXBwb3J0IGN1c3RvbSBzb3VyY2UgdHlwZXNcbiAqIGZvciBkYXRhIGZvcm1hdHMgdGhhdCBjYW4gYmUgcGFyc2VkL2NvbnZlcnRlZCBpbnRvIGFuIGluLW1lbW9yeSBWZWN0b3JUaWxlXG4gKiByZXByZXNlbnRhdGlvbi4gIFRvIGRvIHNvLCBjcmVhdGUgaXQgd2l0aFxuICogYG5ldyBWZWN0b3JUaWxlV29ya2VyU291cmNlKGFjdG9yLCBzdHlsZUxheWVycywgY3VzdG9tTG9hZFZlY3RvckRhdGFGdW5jdGlvbilgLlxuICpcbiAqIEBwcml2YXRlXG4gKi9cbmNsYXNzIFZlY3RvclRpbGVXb3JrZXJTb3VyY2UgaW1wbGVtZW50cyBXb3JrZXJTb3VyY2Uge1xuICAgIGFjdG9yOiBBY3RvcjtcbiAgICBsYXllckluZGV4OiBTdHlsZUxheWVySW5kZXg7XG4gICAgbG9hZFZlY3RvckRhdGE6IExvYWRWZWN0b3JEYXRhO1xuICAgIGxvYWRpbmc6IHsgW3N0cmluZ106IFdvcmtlclRpbGUgfTtcbiAgICBsb2FkZWQ6IHsgW3N0cmluZ106IFdvcmtlclRpbGUgfTtcblxuICAgIC8qKlxuICAgICAqIEBwYXJhbSBbbG9hZFZlY3RvckRhdGFdIE9wdGlvbmFsIG1ldGhvZCBmb3IgY3VzdG9tIGxvYWRpbmcgb2YgYSBWZWN0b3JUaWxlXG4gICAgICogb2JqZWN0IGJhc2VkIG9uIHBhcmFtZXRlcnMgcGFzc2VkIGZyb20gdGhlIG1haW4tdGhyZWFkIFNvdXJjZS4gU2VlXG4gICAgICoge0BsaW5rIFZlY3RvclRpbGVXb3JrZXJTb3VyY2UjbG9hZFRpbGV9LiBUaGUgZGVmYXVsdCBpbXBsZW1lbnRhdGlvbiBzaW1wbHlcbiAgICAgKiBsb2FkcyB0aGUgcGJmIGF0IGBwYXJhbXMudXJsYC5cbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihhY3RvcjogQWN0b3IsIGxheWVySW5kZXg6IFN0eWxlTGF5ZXJJbmRleCwgbG9hZFZlY3RvckRhdGE6ID9Mb2FkVmVjdG9yRGF0YSkge1xuICAgICAgICB0aGlzLmFjdG9yID0gYWN0b3I7XG4gICAgICAgIHRoaXMubGF5ZXJJbmRleCA9IGxheWVySW5kZXg7XG4gICAgICAgIHRoaXMubG9hZFZlY3RvckRhdGEgPSBsb2FkVmVjdG9yRGF0YSB8fCBsb2FkVmVjdG9yVGlsZTtcbiAgICAgICAgdGhpcy5sb2FkaW5nID0ge307XG4gICAgICAgIHRoaXMubG9hZGVkID0ge307XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogSW1wbGVtZW50cyB7QGxpbmsgV29ya2VyU291cmNlI2xvYWRUaWxlfS4gRGVsZWdhdGVzIHRvXG4gICAgICoge0BsaW5rIFZlY3RvclRpbGVXb3JrZXJTb3VyY2UjbG9hZFZlY3RvckRhdGF9ICh3aGljaCBieSBkZWZhdWx0IGV4cGVjdHNcbiAgICAgKiBhIGBwYXJhbXMudXJsYCBwcm9wZXJ0eSkgZm9yIGZldGNoaW5nIGFuZCBwcm9kdWNpbmcgYSBWZWN0b3JUaWxlIG9iamVjdC5cbiAgICAgKi9cbiAgICBsb2FkVGlsZShwYXJhbXM6IFdvcmtlclRpbGVQYXJhbWV0ZXJzLCBjYWxsYmFjazogV29ya2VyVGlsZUNhbGxiYWNrKSB7XG4gICAgICAgIGNvbnN0IHVpZCA9IHBhcmFtcy51aWQ7XG5cbiAgICAgICAgaWYgKCF0aGlzLmxvYWRpbmcpXG4gICAgICAgICAgICB0aGlzLmxvYWRpbmcgPSB7fTtcblxuICAgICAgICBjb25zdCBwZXJmID0gKHBhcmFtcyAmJiBwYXJhbXMucmVxdWVzdCAmJiBwYXJhbXMucmVxdWVzdC5jb2xsZWN0UmVzb3VyY2VUaW1pbmcpID9cbiAgICAgICAgICAgIG5ldyBwZXJmb3JtYW5jZS5QZXJmb3JtYW5jZShwYXJhbXMucmVxdWVzdCkgOiBmYWxzZTtcblxuICAgICAgICBjb25zdCB3b3JrZXJUaWxlID0gdGhpcy5sb2FkaW5nW3VpZF0gPSBuZXcgV29ya2VyVGlsZShwYXJhbXMpO1xuICAgICAgICB3b3JrZXJUaWxlLmFib3J0ID0gdGhpcy5sb2FkVmVjdG9yRGF0YShwYXJhbXMsIChlcnIsIHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBkZWxldGUgdGhpcy5sb2FkaW5nW3VpZF07XG5cbiAgICAgICAgICAgIGlmIChlcnIgfHwgIXJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgd29ya2VyVGlsZS5zdGF0dXMgPSAnZG9uZSc7XG4gICAgICAgICAgICAgICAgdGhpcy5sb2FkZWRbdWlkXSA9IHdvcmtlclRpbGU7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IHJhd1RpbGVEYXRhID0gcmVzcG9uc2UucmF3RGF0YTtcbiAgICAgICAgICAgIGNvbnN0IGNhY2hlQ29udHJvbCA9IHt9O1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLmV4cGlyZXMpIGNhY2hlQ29udHJvbC5leHBpcmVzID0gcmVzcG9uc2UuZXhwaXJlcztcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5jYWNoZUNvbnRyb2wpIGNhY2hlQ29udHJvbC5jYWNoZUNvbnRyb2wgPSByZXNwb25zZS5jYWNoZUNvbnRyb2w7XG5cbiAgICAgICAgICAgIGNvbnN0IHJlc291cmNlVGltaW5nID0ge307XG4gICAgICAgICAgICBpZiAocGVyZikge1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlc291cmNlVGltaW5nRGF0YSA9IHBlcmYuZmluaXNoKCk7XG4gICAgICAgICAgICAgICAgLy8gaXQncyBuZWNlc3NhcnkgdG8gZXZhbCB0aGUgcmVzdWx0IG9mIGdldEVudHJpZXNCeU5hbWUoKSBoZXJlIHZpYSBwYXJzZS9zdHJpbmdpZnlcbiAgICAgICAgICAgICAgICAvLyBsYXRlIGV2YWx1YXRpb24gaW4gdGhlIG1haW4gdGhyZWFkIGNhdXNlcyBUeXBlRXJyb3I6IGlsbGVnYWwgaW52b2NhdGlvblxuICAgICAgICAgICAgICAgIGlmIChyZXNvdXJjZVRpbWluZ0RhdGEpXG4gICAgICAgICAgICAgICAgICAgIHJlc291cmNlVGltaW5nLnJlc291cmNlVGltaW5nID0gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShyZXNvdXJjZVRpbWluZ0RhdGEpKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgd29ya2VyVGlsZS52ZWN0b3JUaWxlID0gcmVzcG9uc2UudmVjdG9yVGlsZTtcbiAgICAgICAgICAgIHdvcmtlclRpbGUucGFyc2UocmVzcG9uc2UudmVjdG9yVGlsZSwgdGhpcy5sYXllckluZGV4LCB0aGlzLmFjdG9yLCAoZXJyLCByZXN1bHQpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoZXJyIHx8ICFyZXN1bHQpIHJldHVybiBjYWxsYmFjayhlcnIpO1xuXG4gICAgICAgICAgICAgICAgLy8gVHJhbnNmZXJyaW5nIGEgY29weSBvZiByYXdUaWxlRGF0YSBiZWNhdXNlIHRoZSB3b3JrZXIgbmVlZHMgdG8gcmV0YWluIGl0cyBjb3B5LlxuICAgICAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIGV4dGVuZCh7cmF3VGlsZURhdGE6IHJhd1RpbGVEYXRhLnNsaWNlKDApfSwgcmVzdWx0LCBjYWNoZUNvbnRyb2wsIHJlc291cmNlVGltaW5nKSk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgdGhpcy5sb2FkZWQgPSB0aGlzLmxvYWRlZCB8fCB7fTtcbiAgICAgICAgICAgIHRoaXMubG9hZGVkW3VpZF0gPSB3b3JrZXJUaWxlO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBJbXBsZW1lbnRzIHtAbGluayBXb3JrZXJTb3VyY2UjcmVsb2FkVGlsZX0uXG4gICAgICovXG4gICAgcmVsb2FkVGlsZShwYXJhbXM6IFdvcmtlclRpbGVQYXJhbWV0ZXJzLCBjYWxsYmFjazogV29ya2VyVGlsZUNhbGxiYWNrKSB7XG4gICAgICAgIGNvbnN0IGxvYWRlZCA9IHRoaXMubG9hZGVkLFxuICAgICAgICAgICAgdWlkID0gcGFyYW1zLnVpZCxcbiAgICAgICAgICAgIHZ0U291cmNlID0gdGhpcztcbiAgICAgICAgaWYgKGxvYWRlZCAmJiBsb2FkZWRbdWlkXSkge1xuICAgICAgICAgICAgY29uc3Qgd29ya2VyVGlsZSA9IGxvYWRlZFt1aWRdO1xuICAgICAgICAgICAgd29ya2VyVGlsZS5zaG93Q29sbGlzaW9uQm94ZXMgPSBwYXJhbXMuc2hvd0NvbGxpc2lvbkJveGVzO1xuXG4gICAgICAgICAgICBjb25zdCBkb25lID0gKGVyciwgZGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlbG9hZENhbGxiYWNrID0gd29ya2VyVGlsZS5yZWxvYWRDYWxsYmFjaztcbiAgICAgICAgICAgICAgICBpZiAocmVsb2FkQ2FsbGJhY2spIHtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHdvcmtlclRpbGUucmVsb2FkQ2FsbGJhY2s7XG4gICAgICAgICAgICAgICAgICAgIHdvcmtlclRpbGUucGFyc2Uod29ya2VyVGlsZS52ZWN0b3JUaWxlLCB2dFNvdXJjZS5sYXllckluZGV4LCB2dFNvdXJjZS5hY3RvciwgcmVsb2FkQ2FsbGJhY2spO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjYWxsYmFjayhlcnIsIGRhdGEpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgaWYgKHdvcmtlclRpbGUuc3RhdHVzID09PSAncGFyc2luZycpIHtcbiAgICAgICAgICAgICAgICB3b3JrZXJUaWxlLnJlbG9hZENhbGxiYWNrID0gZG9uZTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAod29ya2VyVGlsZS5zdGF0dXMgPT09ICdkb25lJykge1xuICAgICAgICAgICAgICAgIC8vIGlmIHRoZXJlIHdhcyBubyB2ZWN0b3IgdGlsZSBkYXRhIG9uIHRoZSBpbml0aWFsIGxvYWQsIGRvbid0IHRyeSBhbmQgcmUtcGFyc2UgdGlsZVxuICAgICAgICAgICAgICAgIGlmICh3b3JrZXJUaWxlLnZlY3RvclRpbGUpIHtcbiAgICAgICAgICAgICAgICAgICAgd29ya2VyVGlsZS5wYXJzZSh3b3JrZXJUaWxlLnZlY3RvclRpbGUsIHRoaXMubGF5ZXJJbmRleCwgdGhpcy5hY3RvciwgZG9uZSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZG9uZSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEltcGxlbWVudHMge0BsaW5rIFdvcmtlclNvdXJjZSNhYm9ydFRpbGV9LlxuICAgICAqXG4gICAgICogQHBhcmFtIHBhcmFtc1xuICAgICAqIEBwYXJhbSBwYXJhbXMudWlkIFRoZSBVSUQgZm9yIHRoaXMgdGlsZS5cbiAgICAgKi9cbiAgICBhYm9ydFRpbGUocGFyYW1zOiBUaWxlUGFyYW1ldGVycywgY2FsbGJhY2s6IFdvcmtlclRpbGVDYWxsYmFjaykge1xuICAgICAgICBjb25zdCBsb2FkaW5nID0gdGhpcy5sb2FkaW5nLFxuICAgICAgICAgICAgdWlkID0gcGFyYW1zLnVpZDtcbiAgICAgICAgaWYgKGxvYWRpbmcgJiYgbG9hZGluZ1t1aWRdICYmIGxvYWRpbmdbdWlkXS5hYm9ydCkge1xuICAgICAgICAgICAgbG9hZGluZ1t1aWRdLmFib3J0KCk7XG4gICAgICAgICAgICBkZWxldGUgbG9hZGluZ1t1aWRdO1xuICAgICAgICB9XG4gICAgICAgIGNhbGxiYWNrKCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogSW1wbGVtZW50cyB7QGxpbmsgV29ya2VyU291cmNlI3JlbW92ZVRpbGV9LlxuICAgICAqXG4gICAgICogQHBhcmFtIHBhcmFtc1xuICAgICAqIEBwYXJhbSBwYXJhbXMudWlkIFRoZSBVSUQgZm9yIHRoaXMgdGlsZS5cbiAgICAgKi9cbiAgICByZW1vdmVUaWxlKHBhcmFtczogVGlsZVBhcmFtZXRlcnMsIGNhbGxiYWNrOiBXb3JrZXJUaWxlQ2FsbGJhY2spIHtcbiAgICAgICAgY29uc3QgbG9hZGVkID0gdGhpcy5sb2FkZWQsXG4gICAgICAgICAgICB1aWQgPSBwYXJhbXMudWlkO1xuICAgICAgICBpZiAobG9hZGVkICYmIGxvYWRlZFt1aWRdKSB7XG4gICAgICAgICAgICBkZWxldGUgbG9hZGVkW3VpZF07XG4gICAgICAgIH1cbiAgICAgICAgY2FsbGJhY2soKTtcbiAgICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IFZlY3RvclRpbGVXb3JrZXJTb3VyY2U7XG4iLCIvLyBAZmxvd1xuXG5pbXBvcnQgREVNRGF0YSBmcm9tICcuLi9kYXRhL2RlbV9kYXRhJztcblxuaW1wb3J0IHR5cGUgQWN0b3IgZnJvbSAnLi4vdXRpbC9hY3Rvcic7XG5pbXBvcnQgdHlwZSB7XG4gICAgV29ya2VyREVNVGlsZVBhcmFtZXRlcnMsXG4gICAgV29ya2VyREVNVGlsZUNhbGxiYWNrLFxuICAgIFRpbGVQYXJhbWV0ZXJzXG59IGZyb20gJy4vd29ya2VyX3NvdXJjZSc7XG5cblxuY2xhc3MgUmFzdGVyREVNVGlsZVdvcmtlclNvdXJjZSB7XG4gICAgYWN0b3I6IEFjdG9yO1xuICAgIGxvYWRlZDoge1tzdHJpbmddOiBERU1EYXRhfTtcblxuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICB0aGlzLmxvYWRlZCA9IHt9O1xuICAgIH1cblxuICAgIGxvYWRUaWxlKHBhcmFtczogV29ya2VyREVNVGlsZVBhcmFtZXRlcnMsIGNhbGxiYWNrOiBXb3JrZXJERU1UaWxlQ2FsbGJhY2spIHtcbiAgICAgICAgY29uc3Qge3VpZCwgZW5jb2RpbmcsIHJhd0ltYWdlRGF0YX0gPSBwYXJhbXM7XG4gICAgICAgIGNvbnN0IGRlbSA9IG5ldyBERU1EYXRhKHVpZCwgcmF3SW1hZ2VEYXRhLCBlbmNvZGluZyk7XG5cbiAgICAgICAgdGhpcy5sb2FkZWQgPSB0aGlzLmxvYWRlZCB8fCB7fTtcbiAgICAgICAgdGhpcy5sb2FkZWRbdWlkXSA9IGRlbTtcbiAgICAgICAgY2FsbGJhY2sobnVsbCwgZGVtKTtcbiAgICB9XG5cbiAgICByZW1vdmVUaWxlKHBhcmFtczogVGlsZVBhcmFtZXRlcnMpIHtcbiAgICAgICAgY29uc3QgbG9hZGVkID0gdGhpcy5sb2FkZWQsXG4gICAgICAgICAgICB1aWQgPSBwYXJhbXMudWlkO1xuICAgICAgICBpZiAobG9hZGVkICYmIGxvYWRlZFt1aWRdKSB7XG4gICAgICAgICAgICBkZWxldGUgbG9hZGVkW3VpZF07XG4gICAgICAgIH1cbiAgICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IFJhc3RlckRFTVRpbGVXb3JrZXJTb3VyY2U7XG4iLCJtb2R1bGUuZXhwb3J0cy5SQURJVVMgPSA2Mzc4MTM3O1xubW9kdWxlLmV4cG9ydHMuRkxBVFRFTklORyA9IDEvMjk4LjI1NzIyMzU2Mztcbm1vZHVsZS5leHBvcnRzLlBPTEFSX1JBRElVUyA9IDYzNTY3NTIuMzE0MjtcbiIsInZhciB3Z3M4NCA9IHJlcXVpcmUoJ3dnczg0Jyk7XG5cbm1vZHVsZS5leHBvcnRzLmdlb21ldHJ5ID0gZ2VvbWV0cnk7XG5tb2R1bGUuZXhwb3J0cy5yaW5nID0gcmluZ0FyZWE7XG5cbmZ1bmN0aW9uIGdlb21ldHJ5KF8pIHtcbiAgICB2YXIgYXJlYSA9IDAsIGk7XG4gICAgc3dpdGNoIChfLnR5cGUpIHtcbiAgICAgICAgY2FzZSAnUG9seWdvbic6XG4gICAgICAgICAgICByZXR1cm4gcG9seWdvbkFyZWEoXy5jb29yZGluYXRlcyk7XG4gICAgICAgIGNhc2UgJ011bHRpUG9seWdvbic6XG4gICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwgXy5jb29yZGluYXRlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIGFyZWEgKz0gcG9seWdvbkFyZWEoXy5jb29yZGluYXRlc1tpXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gYXJlYTtcbiAgICAgICAgY2FzZSAnUG9pbnQnOlxuICAgICAgICBjYXNlICdNdWx0aVBvaW50JzpcbiAgICAgICAgY2FzZSAnTGluZVN0cmluZyc6XG4gICAgICAgIGNhc2UgJ011bHRpTGluZVN0cmluZyc6XG4gICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgY2FzZSAnR2VvbWV0cnlDb2xsZWN0aW9uJzpcbiAgICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCBfLmdlb21ldHJpZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICBhcmVhICs9IGdlb21ldHJ5KF8uZ2VvbWV0cmllc1tpXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gYXJlYTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIHBvbHlnb25BcmVhKGNvb3Jkcykge1xuICAgIHZhciBhcmVhID0gMDtcbiAgICBpZiAoY29vcmRzICYmIGNvb3Jkcy5sZW5ndGggPiAwKSB7XG4gICAgICAgIGFyZWEgKz0gTWF0aC5hYnMocmluZ0FyZWEoY29vcmRzWzBdKSk7XG4gICAgICAgIGZvciAodmFyIGkgPSAxOyBpIDwgY29vcmRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBhcmVhIC09IE1hdGguYWJzKHJpbmdBcmVhKGNvb3Jkc1tpXSkpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBhcmVhO1xufVxuXG4vKipcbiAqIENhbGN1bGF0ZSB0aGUgYXBwcm94aW1hdGUgYXJlYSBvZiB0aGUgcG9seWdvbiB3ZXJlIGl0IHByb2plY3RlZCBvbnRvXG4gKiAgICAgdGhlIGVhcnRoLiAgTm90ZSB0aGF0IHRoaXMgYXJlYSB3aWxsIGJlIHBvc2l0aXZlIGlmIHJpbmcgaXMgb3JpZW50ZWRcbiAqICAgICBjbG9ja3dpc2UsIG90aGVyd2lzZSBpdCB3aWxsIGJlIG5lZ2F0aXZlLlxuICpcbiAqIFJlZmVyZW5jZTpcbiAqIFJvYmVydC4gRy4gQ2hhbWJlcmxhaW4gYW5kIFdpbGxpYW0gSC4gRHVxdWV0dGUsIFwiU29tZSBBbGdvcml0aG1zIGZvclxuICogICAgIFBvbHlnb25zIG9uIGEgU3BoZXJlXCIsIEpQTCBQdWJsaWNhdGlvbiAwNy0wMywgSmV0IFByb3B1bHNpb25cbiAqICAgICBMYWJvcmF0b3J5LCBQYXNhZGVuYSwgQ0EsIEp1bmUgMjAwNyBodHRwOi8vdHJzLW5ldy5qcGwubmFzYS5nb3YvZHNwYWNlL2hhbmRsZS8yMDE0LzQwNDA5XG4gKlxuICogUmV0dXJuczpcbiAqIHtmbG9hdH0gVGhlIGFwcHJveGltYXRlIHNpZ25lZCBnZW9kZXNpYyBhcmVhIG9mIHRoZSBwb2x5Z29uIGluIHNxdWFyZVxuICogICAgIG1ldGVycy5cbiAqL1xuXG5mdW5jdGlvbiByaW5nQXJlYShjb29yZHMpIHtcbiAgICB2YXIgcDEsIHAyLCBwMywgbG93ZXJJbmRleCwgbWlkZGxlSW5kZXgsIHVwcGVySW5kZXgsIGksXG4gICAgYXJlYSA9IDAsXG4gICAgY29vcmRzTGVuZ3RoID0gY29vcmRzLmxlbmd0aDtcblxuICAgIGlmIChjb29yZHNMZW5ndGggPiAyKSB7XG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBjb29yZHNMZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgaWYgKGkgPT09IGNvb3Jkc0xlbmd0aCAtIDIpIHsvLyBpID0gTi0yXG4gICAgICAgICAgICAgICAgbG93ZXJJbmRleCA9IGNvb3Jkc0xlbmd0aCAtIDI7XG4gICAgICAgICAgICAgICAgbWlkZGxlSW5kZXggPSBjb29yZHNMZW5ndGggLTE7XG4gICAgICAgICAgICAgICAgdXBwZXJJbmRleCA9IDA7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGkgPT09IGNvb3Jkc0xlbmd0aCAtIDEpIHsvLyBpID0gTi0xXG4gICAgICAgICAgICAgICAgbG93ZXJJbmRleCA9IGNvb3Jkc0xlbmd0aCAtIDE7XG4gICAgICAgICAgICAgICAgbWlkZGxlSW5kZXggPSAwO1xuICAgICAgICAgICAgICAgIHVwcGVySW5kZXggPSAxO1xuICAgICAgICAgICAgfSBlbHNlIHsgLy8gaSA9IDAgdG8gTi0zXG4gICAgICAgICAgICAgICAgbG93ZXJJbmRleCA9IGk7XG4gICAgICAgICAgICAgICAgbWlkZGxlSW5kZXggPSBpKzE7XG4gICAgICAgICAgICAgICAgdXBwZXJJbmRleCA9IGkrMjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHAxID0gY29vcmRzW2xvd2VySW5kZXhdO1xuICAgICAgICAgICAgcDIgPSBjb29yZHNbbWlkZGxlSW5kZXhdO1xuICAgICAgICAgICAgcDMgPSBjb29yZHNbdXBwZXJJbmRleF07XG4gICAgICAgICAgICBhcmVhICs9ICggcmFkKHAzWzBdKSAtIHJhZChwMVswXSkgKSAqIE1hdGguc2luKCByYWQocDJbMV0pKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGFyZWEgPSBhcmVhICogd2dzODQuUkFESVVTICogd2dzODQuUkFESVVTIC8gMjtcbiAgICB9XG5cbiAgICByZXR1cm4gYXJlYTtcbn1cblxuZnVuY3Rpb24gcmFkKF8pIHtcbiAgICByZXR1cm4gXyAqIE1hdGguUEkgLyAxODA7XG59IiwidmFyIGdlb2pzb25BcmVhID0gcmVxdWlyZSgnQG1hcGJveC9nZW9qc29uLWFyZWEnKTtcblxubW9kdWxlLmV4cG9ydHMgPSByZXdpbmQ7XG5cbmZ1bmN0aW9uIHJld2luZChnaiwgb3V0ZXIpIHtcbiAgICBzd2l0Y2ggKChnaiAmJiBnai50eXBlKSB8fCBudWxsKSB7XG4gICAgICAgIGNhc2UgJ0ZlYXR1cmVDb2xsZWN0aW9uJzpcbiAgICAgICAgICAgIGdqLmZlYXR1cmVzID0gZ2ouZmVhdHVyZXMubWFwKGN1cnJ5T3V0ZXIocmV3aW5kLCBvdXRlcikpO1xuICAgICAgICAgICAgcmV0dXJuIGdqO1xuICAgICAgICBjYXNlICdGZWF0dXJlJzpcbiAgICAgICAgICAgIGdqLmdlb21ldHJ5ID0gcmV3aW5kKGdqLmdlb21ldHJ5LCBvdXRlcik7XG4gICAgICAgICAgICByZXR1cm4gZ2o7XG4gICAgICAgIGNhc2UgJ1BvbHlnb24nOlxuICAgICAgICBjYXNlICdNdWx0aVBvbHlnb24nOlxuICAgICAgICAgICAgcmV0dXJuIGNvcnJlY3QoZ2osIG91dGVyKTtcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIHJldHVybiBnajtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGN1cnJ5T3V0ZXIoYSwgYikge1xuICAgIHJldHVybiBmdW5jdGlvbihfKSB7IHJldHVybiBhKF8sIGIpOyB9O1xufVxuXG5mdW5jdGlvbiBjb3JyZWN0KF8sIG91dGVyKSB7XG4gICAgaWYgKF8udHlwZSA9PT0gJ1BvbHlnb24nKSB7XG4gICAgICAgIF8uY29vcmRpbmF0ZXMgPSBjb3JyZWN0UmluZ3MoXy5jb29yZGluYXRlcywgb3V0ZXIpO1xuICAgIH0gZWxzZSBpZiAoXy50eXBlID09PSAnTXVsdGlQb2x5Z29uJykge1xuICAgICAgICBfLmNvb3JkaW5hdGVzID0gXy5jb29yZGluYXRlcy5tYXAoY3VycnlPdXRlcihjb3JyZWN0UmluZ3MsIG91dGVyKSk7XG4gICAgfVxuICAgIHJldHVybiBfO1xufVxuXG5mdW5jdGlvbiBjb3JyZWN0UmluZ3MoXywgb3V0ZXIpIHtcbiAgICBvdXRlciA9ICEhb3V0ZXI7XG4gICAgX1swXSA9IHdpbmQoX1swXSwgb3V0ZXIpO1xuICAgIGZvciAodmFyIGkgPSAxOyBpIDwgXy5sZW5ndGg7IGkrKykge1xuICAgICAgICBfW2ldID0gd2luZChfW2ldLCAhb3V0ZXIpO1xuICAgIH1cbiAgICByZXR1cm4gXztcbn1cblxuZnVuY3Rpb24gd2luZChfLCBkaXIpIHtcbiAgICByZXR1cm4gY3coXykgPT09IGRpciA/IF8gOiBfLnJldmVyc2UoKTtcbn1cblxuZnVuY3Rpb24gY3coXykge1xuICAgIHJldHVybiBnZW9qc29uQXJlYS5yaW5nKF8pID49IDA7XG59XG4iLCIvLyBAZmxvd1xuXG5pbXBvcnQgUG9pbnQgZnJvbSAnQG1hcGJveC9wb2ludC1nZW9tZXRyeSc7XG5cbmltcG9ydCBtdnQgZnJvbSAnQG1hcGJveC92ZWN0b3ItdGlsZSc7XG5jb25zdCB0b0dlb0pTT04gPSBtdnQuVmVjdG9yVGlsZUZlYXR1cmUucHJvdG90eXBlLnRvR2VvSlNPTjtcbmltcG9ydCBFWFRFTlQgZnJvbSAnLi4vZGF0YS9leHRlbnQnO1xuXG4vLyBUaGUgZmVhdHVyZSB0eXBlIHVzZWQgYnkgZ2VvanNvbi12dCBhbmQgc3VwZXJjbHVzdGVyLiBTaG91bGQgYmUgZXh0cmFjdGVkIHRvXG4vLyBnbG9iYWwgdHlwZSBhbmQgdXNlZCBpbiBtb2R1bGUgZGVmaW5pdGlvbnMgZm9yIHRob3NlIHR3byBtb2R1bGVzLlxudHlwZSBGZWF0dXJlID0ge1xuICAgIHR5cGU6IDEsXG4gICAgaWQ6IG1peGVkLFxuICAgIHRhZ3M6IHtbc3RyaW5nXTogc3RyaW5nIHwgbnVtYmVyIHwgYm9vbGVhbn0sXG4gICAgZ2VvbWV0cnk6IEFycmF5PFtudW1iZXIsIG51bWJlcl0+LFxufSB8IHtcbiAgICB0eXBlOiAyIHwgMyxcbiAgICBpZDogbWl4ZWQsXG4gICAgdGFnczoge1tzdHJpbmddOiBzdHJpbmcgfCBudW1iZXIgfCBib29sZWFufSxcbiAgICBnZW9tZXRyeTogQXJyYXk8QXJyYXk8W251bWJlciwgbnVtYmVyXT4+LFxufVxuXG5jbGFzcyBGZWF0dXJlV3JhcHBlciBpbXBsZW1lbnRzIFZlY3RvclRpbGVGZWF0dXJlIHtcbiAgICBfZmVhdHVyZTogRmVhdHVyZTtcblxuICAgIGV4dGVudDogbnVtYmVyO1xuICAgIHR5cGU6IDEgfCAyIHwgMztcbiAgICBpZDogbnVtYmVyO1xuICAgIHByb3BlcnRpZXM6IHtbc3RyaW5nXTogc3RyaW5nIHwgbnVtYmVyIHwgYm9vbGVhbn07XG5cbiAgICBjb25zdHJ1Y3RvcihmZWF0dXJlOiBGZWF0dXJlKSB7XG4gICAgICAgIHRoaXMuX2ZlYXR1cmUgPSBmZWF0dXJlO1xuXG4gICAgICAgIHRoaXMuZXh0ZW50ID0gRVhURU5UO1xuICAgICAgICB0aGlzLnR5cGUgPSBmZWF0dXJlLnR5cGU7XG4gICAgICAgIHRoaXMucHJvcGVydGllcyA9IGZlYXR1cmUudGFncztcblxuICAgICAgICAvLyBJZiB0aGUgZmVhdHVyZSBoYXMgYSB0b3AtbGV2ZWwgYGlkYCBwcm9wZXJ0eSwgY29weSBpdCBvdmVyLCBidXQgb25seVxuICAgICAgICAvLyBpZiBpdCBjYW4gYmUgY29lcmNlZCB0byBhbiBpbnRlZ2VyLCBiZWNhdXNlIHRoaXMgd3JhcHBlciBpcyB1c2VkIGZvclxuICAgICAgICAvLyBzZXJpYWxpemluZyBnZW9qc29uIGZlYXR1cmUgZGF0YSBpbnRvIHZlY3RvciB0aWxlIFBCRiBkYXRhLCBhbmQgdGhlXG4gICAgICAgIC8vIHZlY3RvciB0aWxlIHNwZWMgb25seSBzdXBwb3J0cyBpbnRlZ2VyIHZhbHVlcyBmb3IgZmVhdHVyZSBpZHMgLS1cbiAgICAgICAgLy8gYWxsb3dpbmcgbm9uLWludGVnZXIgdmFsdWVzIGhlcmUgcmVzdWx0cyBpbiBhIG5vbi1jb21wbGlhbnQgUEJGXG4gICAgICAgIC8vIHRoYXQgY2F1c2VzIGFuIGV4Y2VwdGlvbiB3aGVuIGl0IGlzIHBhcnNlZCB3aXRoIHZlY3Rvci10aWxlLWpzXG4gICAgICAgIGlmICgnaWQnIGluIGZlYXR1cmUgJiYgIWlzTmFOKGZlYXR1cmUuaWQpKSB7XG4gICAgICAgICAgICB0aGlzLmlkID0gcGFyc2VJbnQoZmVhdHVyZS5pZCwgMTApO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgbG9hZEdlb21ldHJ5KCkge1xuICAgICAgICBpZiAodGhpcy5fZmVhdHVyZS50eXBlID09PSAxKSB7XG4gICAgICAgICAgICBjb25zdCBnZW9tZXRyeSA9IFtdO1xuICAgICAgICAgICAgZm9yIChjb25zdCBwb2ludCBvZiB0aGlzLl9mZWF0dXJlLmdlb21ldHJ5KSB7XG4gICAgICAgICAgICAgICAgZ2VvbWV0cnkucHVzaChbbmV3IFBvaW50KHBvaW50WzBdLCBwb2ludFsxXSldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBnZW9tZXRyeTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IGdlb21ldHJ5ID0gW107XG4gICAgICAgICAgICBmb3IgKGNvbnN0IHJpbmcgb2YgdGhpcy5fZmVhdHVyZS5nZW9tZXRyeSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IG5ld1JpbmcgPSBbXTtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IHBvaW50IG9mIHJpbmcpIHtcbiAgICAgICAgICAgICAgICAgICAgbmV3UmluZy5wdXNoKG5ldyBQb2ludChwb2ludFswXSwgcG9pbnRbMV0pKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZ2VvbWV0cnkucHVzaChuZXdSaW5nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBnZW9tZXRyeTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHRvR2VvSlNPTih4OiBudW1iZXIsIHk6IG51bWJlciwgejogbnVtYmVyKSB7XG4gICAgICAgIHJldHVybiB0b0dlb0pTT04uY2FsbCh0aGlzLCB4LCB5LCB6KTtcbiAgICB9XG59XG5cbmNsYXNzIEdlb0pTT05XcmFwcGVyIGltcGxlbWVudHMgVmVjdG9yVGlsZSwgVmVjdG9yVGlsZUxheWVyIHtcbiAgICBsYXllcnM6IHtbc3RyaW5nXTogVmVjdG9yVGlsZUxheWVyfTtcbiAgICBuYW1lOiBzdHJpbmc7XG4gICAgZXh0ZW50OiBudW1iZXI7XG4gICAgbGVuZ3RoOiBudW1iZXI7XG4gICAgX2ZlYXR1cmVzOiBBcnJheTxGZWF0dXJlPjtcblxuICAgIGNvbnN0cnVjdG9yKGZlYXR1cmVzOiBBcnJheTxGZWF0dXJlPikge1xuICAgICAgICB0aGlzLmxheWVycyA9IHsgJ19nZW9qc29uVGlsZUxheWVyJzogdGhpcyB9O1xuICAgICAgICB0aGlzLm5hbWUgPSAnX2dlb2pzb25UaWxlTGF5ZXInO1xuICAgICAgICB0aGlzLmV4dGVudCA9IEVYVEVOVDtcbiAgICAgICAgdGhpcy5sZW5ndGggPSBmZWF0dXJlcy5sZW5ndGg7XG4gICAgICAgIHRoaXMuX2ZlYXR1cmVzID0gZmVhdHVyZXM7XG4gICAgfVxuXG4gICAgZmVhdHVyZShpOiBudW1iZXIpOiBWZWN0b3JUaWxlRmVhdHVyZSB7XG4gICAgICAgIHJldHVybiBuZXcgRmVhdHVyZVdyYXBwZXIodGhpcy5fZmVhdHVyZXNbaV0pO1xuICAgIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgR2VvSlNPTldyYXBwZXI7XG4iLCIndXNlIHN0cmljdCdcblxudmFyIFBvaW50ID0gcmVxdWlyZSgnQG1hcGJveC9wb2ludC1nZW9tZXRyeScpXG52YXIgVmVjdG9yVGlsZUZlYXR1cmUgPSByZXF1aXJlKCdAbWFwYm94L3ZlY3Rvci10aWxlJykuVmVjdG9yVGlsZUZlYXR1cmVcblxubW9kdWxlLmV4cG9ydHMgPSBHZW9KU09OV3JhcHBlclxuXG4vLyBjb25mb3JtIHRvIHZlY3RvcnRpbGUgYXBpXG5mdW5jdGlvbiBHZW9KU09OV3JhcHBlciAoZmVhdHVyZXMsIG9wdGlvbnMpIHtcbiAgdGhpcy5vcHRpb25zID0gb3B0aW9ucyB8fCB7fVxuICB0aGlzLmZlYXR1cmVzID0gZmVhdHVyZXNcbiAgdGhpcy5sZW5ndGggPSBmZWF0dXJlcy5sZW5ndGhcbn1cblxuR2VvSlNPTldyYXBwZXIucHJvdG90eXBlLmZlYXR1cmUgPSBmdW5jdGlvbiAoaSkge1xuICByZXR1cm4gbmV3IEZlYXR1cmVXcmFwcGVyKHRoaXMuZmVhdHVyZXNbaV0sIHRoaXMub3B0aW9ucy5leHRlbnQpXG59XG5cbmZ1bmN0aW9uIEZlYXR1cmVXcmFwcGVyIChmZWF0dXJlLCBleHRlbnQpIHtcbiAgdGhpcy5pZCA9IHR5cGVvZiBmZWF0dXJlLmlkID09PSAnbnVtYmVyJyA/IGZlYXR1cmUuaWQgOiB1bmRlZmluZWRcbiAgdGhpcy50eXBlID0gZmVhdHVyZS50eXBlXG4gIHRoaXMucmF3R2VvbWV0cnkgPSBmZWF0dXJlLnR5cGUgPT09IDEgPyBbZmVhdHVyZS5nZW9tZXRyeV0gOiBmZWF0dXJlLmdlb21ldHJ5XG4gIHRoaXMucHJvcGVydGllcyA9IGZlYXR1cmUudGFnc1xuICB0aGlzLmV4dGVudCA9IGV4dGVudCB8fCA0MDk2XG59XG5cbkZlYXR1cmVXcmFwcGVyLnByb3RvdHlwZS5sb2FkR2VvbWV0cnkgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciByaW5ncyA9IHRoaXMucmF3R2VvbWV0cnlcbiAgdGhpcy5nZW9tZXRyeSA9IFtdXG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCByaW5ncy5sZW5ndGg7IGkrKykge1xuICAgIHZhciByaW5nID0gcmluZ3NbaV1cbiAgICB2YXIgbmV3UmluZyA9IFtdXG4gICAgZm9yICh2YXIgaiA9IDA7IGogPCByaW5nLmxlbmd0aDsgaisrKSB7XG4gICAgICBuZXdSaW5nLnB1c2gobmV3IFBvaW50KHJpbmdbal1bMF0sIHJpbmdbal1bMV0pKVxuICAgIH1cbiAgICB0aGlzLmdlb21ldHJ5LnB1c2gobmV3UmluZylcbiAgfVxuICByZXR1cm4gdGhpcy5nZW9tZXRyeVxufVxuXG5GZWF0dXJlV3JhcHBlci5wcm90b3R5cGUuYmJveCA9IGZ1bmN0aW9uICgpIHtcbiAgaWYgKCF0aGlzLmdlb21ldHJ5KSB0aGlzLmxvYWRHZW9tZXRyeSgpXG5cbiAgdmFyIHJpbmdzID0gdGhpcy5nZW9tZXRyeVxuICB2YXIgeDEgPSBJbmZpbml0eVxuICB2YXIgeDIgPSAtSW5maW5pdHlcbiAgdmFyIHkxID0gSW5maW5pdHlcbiAgdmFyIHkyID0gLUluZmluaXR5XG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCByaW5ncy5sZW5ndGg7IGkrKykge1xuICAgIHZhciByaW5nID0gcmluZ3NbaV1cblxuICAgIGZvciAodmFyIGogPSAwOyBqIDwgcmluZy5sZW5ndGg7IGorKykge1xuICAgICAgdmFyIGNvb3JkID0gcmluZ1tqXVxuXG4gICAgICB4MSA9IE1hdGgubWluKHgxLCBjb29yZC54KVxuICAgICAgeDIgPSBNYXRoLm1heCh4MiwgY29vcmQueClcbiAgICAgIHkxID0gTWF0aC5taW4oeTEsIGNvb3JkLnkpXG4gICAgICB5MiA9IE1hdGgubWF4KHkyLCBjb29yZC55KVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBbeDEsIHkxLCB4MiwgeTJdXG59XG5cbkZlYXR1cmVXcmFwcGVyLnByb3RvdHlwZS50b0dlb0pTT04gPSBWZWN0b3JUaWxlRmVhdHVyZS5wcm90b3R5cGUudG9HZW9KU09OXG4iLCJ2YXIgUGJmID0gcmVxdWlyZSgncGJmJylcbnZhciBHZW9KU09OV3JhcHBlciA9IHJlcXVpcmUoJy4vbGliL2dlb2pzb25fd3JhcHBlcicpXG5cbm1vZHVsZS5leHBvcnRzID0gZnJvbVZlY3RvclRpbGVKc1xubW9kdWxlLmV4cG9ydHMuZnJvbVZlY3RvclRpbGVKcyA9IGZyb21WZWN0b3JUaWxlSnNcbm1vZHVsZS5leHBvcnRzLmZyb21HZW9qc29uVnQgPSBmcm9tR2VvanNvblZ0XG5tb2R1bGUuZXhwb3J0cy5HZW9KU09OV3JhcHBlciA9IEdlb0pTT05XcmFwcGVyXG5cbi8qKlxuICogU2VyaWFsaXplIGEgdmVjdG9yLXRpbGUtanMtY3JlYXRlZCB0aWxlIHRvIHBiZlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSB0aWxlXG4gKiBAcmV0dXJuIHtCdWZmZXJ9IHVuY29tcHJlc3NlZCwgcGJmLXNlcmlhbGl6ZWQgdGlsZSBkYXRhXG4gKi9cbmZ1bmN0aW9uIGZyb21WZWN0b3JUaWxlSnMgKHRpbGUpIHtcbiAgdmFyIG91dCA9IG5ldyBQYmYoKVxuICB3cml0ZVRpbGUodGlsZSwgb3V0KVxuICByZXR1cm4gb3V0LmZpbmlzaCgpXG59XG5cbi8qKlxuICogU2VyaWFsaXplZCBhIGdlb2pzb24tdnQtY3JlYXRlZCB0aWxlIHRvIHBiZi5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gbGF5ZXJzIC0gQW4gb2JqZWN0IG1hcHBpbmcgbGF5ZXIgbmFtZXMgdG8gZ2VvanNvbi12dC1jcmVhdGVkIHZlY3RvciB0aWxlIG9iamVjdHNcbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gLSBBbiBvYmplY3Qgc3BlY2lmeWluZyB0aGUgdmVjdG9yLXRpbGUgc3BlY2lmaWNhdGlvbiB2ZXJzaW9uIGFuZCBleHRlbnQgdGhhdCB3ZXJlIHVzZWQgdG8gY3JlYXRlIGBsYXllcnNgLlxuICogQHBhcmFtIHtOdW1iZXJ9IFtvcHRpb25zLnZlcnNpb249MV0gLSBWZXJzaW9uIG9mIHZlY3Rvci10aWxlIHNwZWMgdXNlZFxuICogQHBhcmFtIHtOdW1iZXJ9IFtvcHRpb25zLmV4dGVudD00MDk2XSAtIEV4dGVudCBvZiB0aGUgdmVjdG9yIHRpbGVcbiAqIEByZXR1cm4ge0J1ZmZlcn0gdW5jb21wcmVzc2VkLCBwYmYtc2VyaWFsaXplZCB0aWxlIGRhdGFcbiAqL1xuZnVuY3Rpb24gZnJvbUdlb2pzb25WdCAobGF5ZXJzLCBvcHRpb25zKSB7XG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9XG4gIHZhciBsID0ge31cbiAgZm9yICh2YXIgayBpbiBsYXllcnMpIHtcbiAgICBsW2tdID0gbmV3IEdlb0pTT05XcmFwcGVyKGxheWVyc1trXS5mZWF0dXJlcywgb3B0aW9ucylcbiAgICBsW2tdLm5hbWUgPSBrXG4gICAgbFtrXS52ZXJzaW9uID0gb3B0aW9ucy52ZXJzaW9uXG4gICAgbFtrXS5leHRlbnQgPSBvcHRpb25zLmV4dGVudFxuICB9XG4gIHJldHVybiBmcm9tVmVjdG9yVGlsZUpzKHtsYXllcnM6IGx9KVxufVxuXG5mdW5jdGlvbiB3cml0ZVRpbGUgKHRpbGUsIHBiZikge1xuICBmb3IgKHZhciBrZXkgaW4gdGlsZS5sYXllcnMpIHtcbiAgICBwYmYud3JpdGVNZXNzYWdlKDMsIHdyaXRlTGF5ZXIsIHRpbGUubGF5ZXJzW2tleV0pXG4gIH1cbn1cblxuZnVuY3Rpb24gd3JpdGVMYXllciAobGF5ZXIsIHBiZikge1xuICBwYmYud3JpdGVWYXJpbnRGaWVsZCgxNSwgbGF5ZXIudmVyc2lvbiB8fCAxKVxuICBwYmYud3JpdGVTdHJpbmdGaWVsZCgxLCBsYXllci5uYW1lIHx8ICcnKVxuICBwYmYud3JpdGVWYXJpbnRGaWVsZCg1LCBsYXllci5leHRlbnQgfHwgNDA5NilcblxuICB2YXIgaVxuICB2YXIgY29udGV4dCA9IHtcbiAgICBrZXlzOiBbXSxcbiAgICB2YWx1ZXM6IFtdLFxuICAgIGtleWNhY2hlOiB7fSxcbiAgICB2YWx1ZWNhY2hlOiB7fVxuICB9XG5cbiAgZm9yIChpID0gMDsgaSA8IGxheWVyLmxlbmd0aDsgaSsrKSB7XG4gICAgY29udGV4dC5mZWF0dXJlID0gbGF5ZXIuZmVhdHVyZShpKVxuICAgIHBiZi53cml0ZU1lc3NhZ2UoMiwgd3JpdGVGZWF0dXJlLCBjb250ZXh0KVxuICB9XG5cbiAgdmFyIGtleXMgPSBjb250ZXh0LmtleXNcbiAgZm9yIChpID0gMDsgaSA8IGtleXMubGVuZ3RoOyBpKyspIHtcbiAgICBwYmYud3JpdGVTdHJpbmdGaWVsZCgzLCBrZXlzW2ldKVxuICB9XG5cbiAgdmFyIHZhbHVlcyA9IGNvbnRleHQudmFsdWVzXG4gIGZvciAoaSA9IDA7IGkgPCB2YWx1ZXMubGVuZ3RoOyBpKyspIHtcbiAgICBwYmYud3JpdGVNZXNzYWdlKDQsIHdyaXRlVmFsdWUsIHZhbHVlc1tpXSlcbiAgfVxufVxuXG5mdW5jdGlvbiB3cml0ZUZlYXR1cmUgKGNvbnRleHQsIHBiZikge1xuICB2YXIgZmVhdHVyZSA9IGNvbnRleHQuZmVhdHVyZVxuXG4gIGlmIChmZWF0dXJlLmlkICE9PSB1bmRlZmluZWQpIHtcbiAgICBwYmYud3JpdGVWYXJpbnRGaWVsZCgxLCBmZWF0dXJlLmlkKVxuICB9XG5cbiAgcGJmLndyaXRlTWVzc2FnZSgyLCB3cml0ZVByb3BlcnRpZXMsIGNvbnRleHQpXG4gIHBiZi53cml0ZVZhcmludEZpZWxkKDMsIGZlYXR1cmUudHlwZSlcbiAgcGJmLndyaXRlTWVzc2FnZSg0LCB3cml0ZUdlb21ldHJ5LCBmZWF0dXJlKVxufVxuXG5mdW5jdGlvbiB3cml0ZVByb3BlcnRpZXMgKGNvbnRleHQsIHBiZikge1xuICB2YXIgZmVhdHVyZSA9IGNvbnRleHQuZmVhdHVyZVxuICB2YXIga2V5cyA9IGNvbnRleHQua2V5c1xuICB2YXIgdmFsdWVzID0gY29udGV4dC52YWx1ZXNcbiAgdmFyIGtleWNhY2hlID0gY29udGV4dC5rZXljYWNoZVxuICB2YXIgdmFsdWVjYWNoZSA9IGNvbnRleHQudmFsdWVjYWNoZVxuXG4gIGZvciAodmFyIGtleSBpbiBmZWF0dXJlLnByb3BlcnRpZXMpIHtcbiAgICB2YXIga2V5SW5kZXggPSBrZXljYWNoZVtrZXldXG4gICAgaWYgKHR5cGVvZiBrZXlJbmRleCA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIGtleXMucHVzaChrZXkpXG4gICAgICBrZXlJbmRleCA9IGtleXMubGVuZ3RoIC0gMVxuICAgICAga2V5Y2FjaGVba2V5XSA9IGtleUluZGV4XG4gICAgfVxuICAgIHBiZi53cml0ZVZhcmludChrZXlJbmRleClcblxuICAgIHZhciB2YWx1ZSA9IGZlYXR1cmUucHJvcGVydGllc1trZXldXG4gICAgdmFyIHR5cGUgPSB0eXBlb2YgdmFsdWVcbiAgICBpZiAodHlwZSAhPT0gJ3N0cmluZycgJiYgdHlwZSAhPT0gJ2Jvb2xlYW4nICYmIHR5cGUgIT09ICdudW1iZXInKSB7XG4gICAgICB2YWx1ZSA9IEpTT04uc3RyaW5naWZ5KHZhbHVlKVxuICAgIH1cbiAgICB2YXIgdmFsdWVLZXkgPSB0eXBlICsgJzonICsgdmFsdWVcbiAgICB2YXIgdmFsdWVJbmRleCA9IHZhbHVlY2FjaGVbdmFsdWVLZXldXG4gICAgaWYgKHR5cGVvZiB2YWx1ZUluZGV4ID09PSAndW5kZWZpbmVkJykge1xuICAgICAgdmFsdWVzLnB1c2godmFsdWUpXG4gICAgICB2YWx1ZUluZGV4ID0gdmFsdWVzLmxlbmd0aCAtIDFcbiAgICAgIHZhbHVlY2FjaGVbdmFsdWVLZXldID0gdmFsdWVJbmRleFxuICAgIH1cbiAgICBwYmYud3JpdGVWYXJpbnQodmFsdWVJbmRleClcbiAgfVxufVxuXG5mdW5jdGlvbiBjb21tYW5kIChjbWQsIGxlbmd0aCkge1xuICByZXR1cm4gKGxlbmd0aCA8PCAzKSArIChjbWQgJiAweDcpXG59XG5cbmZ1bmN0aW9uIHppZ3phZyAobnVtKSB7XG4gIHJldHVybiAobnVtIDw8IDEpIF4gKG51bSA+PiAzMSlcbn1cblxuZnVuY3Rpb24gd3JpdGVHZW9tZXRyeSAoZmVhdHVyZSwgcGJmKSB7XG4gIHZhciBnZW9tZXRyeSA9IGZlYXR1cmUubG9hZEdlb21ldHJ5KClcbiAgdmFyIHR5cGUgPSBmZWF0dXJlLnR5cGVcbiAgdmFyIHggPSAwXG4gIHZhciB5ID0gMFxuICB2YXIgcmluZ3MgPSBnZW9tZXRyeS5sZW5ndGhcbiAgZm9yICh2YXIgciA9IDA7IHIgPCByaW5nczsgcisrKSB7XG4gICAgdmFyIHJpbmcgPSBnZW9tZXRyeVtyXVxuICAgIHZhciBjb3VudCA9IDFcbiAgICBpZiAodHlwZSA9PT0gMSkge1xuICAgICAgY291bnQgPSByaW5nLmxlbmd0aFxuICAgIH1cbiAgICBwYmYud3JpdGVWYXJpbnQoY29tbWFuZCgxLCBjb3VudCkpIC8vIG1vdmV0b1xuICAgIC8vIGRvIG5vdCB3cml0ZSBwb2x5Z29uIGNsb3NpbmcgcGF0aCBhcyBsaW5ldG9cbiAgICB2YXIgbGluZUNvdW50ID0gdHlwZSA9PT0gMyA/IHJpbmcubGVuZ3RoIC0gMSA6IHJpbmcubGVuZ3RoXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsaW5lQ291bnQ7IGkrKykge1xuICAgICAgaWYgKGkgPT09IDEgJiYgdHlwZSAhPT0gMSkge1xuICAgICAgICBwYmYud3JpdGVWYXJpbnQoY29tbWFuZCgyLCBsaW5lQ291bnQgLSAxKSkgLy8gbGluZXRvXG4gICAgICB9XG4gICAgICB2YXIgZHggPSByaW5nW2ldLnggLSB4XG4gICAgICB2YXIgZHkgPSByaW5nW2ldLnkgLSB5XG4gICAgICBwYmYud3JpdGVWYXJpbnQoemlnemFnKGR4KSlcbiAgICAgIHBiZi53cml0ZVZhcmludCh6aWd6YWcoZHkpKVxuICAgICAgeCArPSBkeFxuICAgICAgeSArPSBkeVxuICAgIH1cbiAgICBpZiAodHlwZSA9PT0gMykge1xuICAgICAgcGJmLndyaXRlVmFyaW50KGNvbW1hbmQoNywgMCkpIC8vIGNsb3NlcGF0aFxuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiB3cml0ZVZhbHVlICh2YWx1ZSwgcGJmKSB7XG4gIHZhciB0eXBlID0gdHlwZW9mIHZhbHVlXG4gIGlmICh0eXBlID09PSAnc3RyaW5nJykge1xuICAgIHBiZi53cml0ZVN0cmluZ0ZpZWxkKDEsIHZhbHVlKVxuICB9IGVsc2UgaWYgKHR5cGUgPT09ICdib29sZWFuJykge1xuICAgIHBiZi53cml0ZUJvb2xlYW5GaWVsZCg3LCB2YWx1ZSlcbiAgfSBlbHNlIGlmICh0eXBlID09PSAnbnVtYmVyJykge1xuICAgIGlmICh2YWx1ZSAlIDEgIT09IDApIHtcbiAgICAgIHBiZi53cml0ZURvdWJsZUZpZWxkKDMsIHZhbHVlKVxuICAgIH0gZWxzZSBpZiAodmFsdWUgPCAwKSB7XG4gICAgICBwYmYud3JpdGVTVmFyaW50RmllbGQoNiwgdmFsdWUpXG4gICAgfSBlbHNlIHtcbiAgICAgIHBiZi53cml0ZVZhcmludEZpZWxkKDUsIHZhbHVlKVxuICAgIH1cbiAgfVxufVxuIiwiXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBzb3J0S0QoaWRzLCBjb29yZHMsIG5vZGVTaXplLCBsZWZ0LCByaWdodCwgZGVwdGgpIHtcbiAgICBpZiAocmlnaHQgLSBsZWZ0IDw9IG5vZGVTaXplKSByZXR1cm47XG5cbiAgICB2YXIgbSA9IE1hdGguZmxvb3IoKGxlZnQgKyByaWdodCkgLyAyKTtcblxuICAgIHNlbGVjdChpZHMsIGNvb3JkcywgbSwgbGVmdCwgcmlnaHQsIGRlcHRoICUgMik7XG5cbiAgICBzb3J0S0QoaWRzLCBjb29yZHMsIG5vZGVTaXplLCBsZWZ0LCBtIC0gMSwgZGVwdGggKyAxKTtcbiAgICBzb3J0S0QoaWRzLCBjb29yZHMsIG5vZGVTaXplLCBtICsgMSwgcmlnaHQsIGRlcHRoICsgMSk7XG59XG5cbmZ1bmN0aW9uIHNlbGVjdChpZHMsIGNvb3JkcywgaywgbGVmdCwgcmlnaHQsIGluYykge1xuXG4gICAgd2hpbGUgKHJpZ2h0ID4gbGVmdCkge1xuICAgICAgICBpZiAocmlnaHQgLSBsZWZ0ID4gNjAwKSB7XG4gICAgICAgICAgICB2YXIgbiA9IHJpZ2h0IC0gbGVmdCArIDE7XG4gICAgICAgICAgICB2YXIgbSA9IGsgLSBsZWZ0ICsgMTtcbiAgICAgICAgICAgIHZhciB6ID0gTWF0aC5sb2cobik7XG4gICAgICAgICAgICB2YXIgcyA9IDAuNSAqIE1hdGguZXhwKDIgKiB6IC8gMyk7XG4gICAgICAgICAgICB2YXIgc2QgPSAwLjUgKiBNYXRoLnNxcnQoeiAqIHMgKiAobiAtIHMpIC8gbikgKiAobSAtIG4gLyAyIDwgMCA/IC0xIDogMSk7XG4gICAgICAgICAgICB2YXIgbmV3TGVmdCA9IE1hdGgubWF4KGxlZnQsIE1hdGguZmxvb3IoayAtIG0gKiBzIC8gbiArIHNkKSk7XG4gICAgICAgICAgICB2YXIgbmV3UmlnaHQgPSBNYXRoLm1pbihyaWdodCwgTWF0aC5mbG9vcihrICsgKG4gLSBtKSAqIHMgLyBuICsgc2QpKTtcbiAgICAgICAgICAgIHNlbGVjdChpZHMsIGNvb3JkcywgaywgbmV3TGVmdCwgbmV3UmlnaHQsIGluYyk7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgdCA9IGNvb3Jkc1syICogayArIGluY107XG4gICAgICAgIHZhciBpID0gbGVmdDtcbiAgICAgICAgdmFyIGogPSByaWdodDtcblxuICAgICAgICBzd2FwSXRlbShpZHMsIGNvb3JkcywgbGVmdCwgayk7XG4gICAgICAgIGlmIChjb29yZHNbMiAqIHJpZ2h0ICsgaW5jXSA+IHQpIHN3YXBJdGVtKGlkcywgY29vcmRzLCBsZWZ0LCByaWdodCk7XG5cbiAgICAgICAgd2hpbGUgKGkgPCBqKSB7XG4gICAgICAgICAgICBzd2FwSXRlbShpZHMsIGNvb3JkcywgaSwgaik7XG4gICAgICAgICAgICBpKys7XG4gICAgICAgICAgICBqLS07XG4gICAgICAgICAgICB3aGlsZSAoY29vcmRzWzIgKiBpICsgaW5jXSA8IHQpIGkrKztcbiAgICAgICAgICAgIHdoaWxlIChjb29yZHNbMiAqIGogKyBpbmNdID4gdCkgai0tO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNvb3Jkc1syICogbGVmdCArIGluY10gPT09IHQpIHN3YXBJdGVtKGlkcywgY29vcmRzLCBsZWZ0LCBqKTtcbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBqKys7XG4gICAgICAgICAgICBzd2FwSXRlbShpZHMsIGNvb3JkcywgaiwgcmlnaHQpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGogPD0gaykgbGVmdCA9IGogKyAxO1xuICAgICAgICBpZiAoayA8PSBqKSByaWdodCA9IGogLSAxO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gc3dhcEl0ZW0oaWRzLCBjb29yZHMsIGksIGopIHtcbiAgICBzd2FwKGlkcywgaSwgaik7XG4gICAgc3dhcChjb29yZHMsIDIgKiBpLCAyICogaik7XG4gICAgc3dhcChjb29yZHMsIDIgKiBpICsgMSwgMiAqIGogKyAxKTtcbn1cblxuZnVuY3Rpb24gc3dhcChhcnIsIGksIGopIHtcbiAgICB2YXIgdG1wID0gYXJyW2ldO1xuICAgIGFycltpXSA9IGFycltqXTtcbiAgICBhcnJbal0gPSB0bXA7XG59XG4iLCJcbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIHJhbmdlKGlkcywgY29vcmRzLCBtaW5YLCBtaW5ZLCBtYXhYLCBtYXhZLCBub2RlU2l6ZSkge1xuICAgIHZhciBzdGFjayA9IFswLCBpZHMubGVuZ3RoIC0gMSwgMF07XG4gICAgdmFyIHJlc3VsdCA9IFtdO1xuICAgIHZhciB4LCB5O1xuXG4gICAgd2hpbGUgKHN0YWNrLmxlbmd0aCkge1xuICAgICAgICB2YXIgYXhpcyA9IHN0YWNrLnBvcCgpO1xuICAgICAgICB2YXIgcmlnaHQgPSBzdGFjay5wb3AoKTtcbiAgICAgICAgdmFyIGxlZnQgPSBzdGFjay5wb3AoKTtcblxuICAgICAgICBpZiAocmlnaHQgLSBsZWZ0IDw9IG5vZGVTaXplKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gbGVmdDsgaSA8PSByaWdodDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgeCA9IGNvb3Jkc1syICogaV07XG4gICAgICAgICAgICAgICAgeSA9IGNvb3Jkc1syICogaSArIDFdO1xuICAgICAgICAgICAgICAgIGlmICh4ID49IG1pblggJiYgeCA8PSBtYXhYICYmIHkgPj0gbWluWSAmJiB5IDw9IG1heFkpIHJlc3VsdC5wdXNoKGlkc1tpXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBtID0gTWF0aC5mbG9vcigobGVmdCArIHJpZ2h0KSAvIDIpO1xuXG4gICAgICAgIHggPSBjb29yZHNbMiAqIG1dO1xuICAgICAgICB5ID0gY29vcmRzWzIgKiBtICsgMV07XG5cbiAgICAgICAgaWYgKHggPj0gbWluWCAmJiB4IDw9IG1heFggJiYgeSA+PSBtaW5ZICYmIHkgPD0gbWF4WSkgcmVzdWx0LnB1c2goaWRzW21dKTtcblxuICAgICAgICB2YXIgbmV4dEF4aXMgPSAoYXhpcyArIDEpICUgMjtcblxuICAgICAgICBpZiAoYXhpcyA9PT0gMCA/IG1pblggPD0geCA6IG1pblkgPD0geSkge1xuICAgICAgICAgICAgc3RhY2sucHVzaChsZWZ0KTtcbiAgICAgICAgICAgIHN0YWNrLnB1c2gobSAtIDEpO1xuICAgICAgICAgICAgc3RhY2sucHVzaChuZXh0QXhpcyk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGF4aXMgPT09IDAgPyBtYXhYID49IHggOiBtYXhZID49IHkpIHtcbiAgICAgICAgICAgIHN0YWNrLnB1c2gobSArIDEpO1xuICAgICAgICAgICAgc3RhY2sucHVzaChyaWdodCk7XG4gICAgICAgICAgICBzdGFjay5wdXNoKG5leHRBeGlzKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiByZXN1bHQ7XG59XG4iLCJcbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIHdpdGhpbihpZHMsIGNvb3JkcywgcXgsIHF5LCByLCBub2RlU2l6ZSkge1xuICAgIHZhciBzdGFjayA9IFswLCBpZHMubGVuZ3RoIC0gMSwgMF07XG4gICAgdmFyIHJlc3VsdCA9IFtdO1xuICAgIHZhciByMiA9IHIgKiByO1xuXG4gICAgd2hpbGUgKHN0YWNrLmxlbmd0aCkge1xuICAgICAgICB2YXIgYXhpcyA9IHN0YWNrLnBvcCgpO1xuICAgICAgICB2YXIgcmlnaHQgPSBzdGFjay5wb3AoKTtcbiAgICAgICAgdmFyIGxlZnQgPSBzdGFjay5wb3AoKTtcblxuICAgICAgICBpZiAocmlnaHQgLSBsZWZ0IDw9IG5vZGVTaXplKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gbGVmdDsgaSA8PSByaWdodDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgaWYgKHNxRGlzdChjb29yZHNbMiAqIGldLCBjb29yZHNbMiAqIGkgKyAxXSwgcXgsIHF5KSA8PSByMikgcmVzdWx0LnB1c2goaWRzW2ldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIG0gPSBNYXRoLmZsb29yKChsZWZ0ICsgcmlnaHQpIC8gMik7XG5cbiAgICAgICAgdmFyIHggPSBjb29yZHNbMiAqIG1dO1xuICAgICAgICB2YXIgeSA9IGNvb3Jkc1syICogbSArIDFdO1xuXG4gICAgICAgIGlmIChzcURpc3QoeCwgeSwgcXgsIHF5KSA8PSByMikgcmVzdWx0LnB1c2goaWRzW21dKTtcblxuICAgICAgICB2YXIgbmV4dEF4aXMgPSAoYXhpcyArIDEpICUgMjtcblxuICAgICAgICBpZiAoYXhpcyA9PT0gMCA/IHF4IC0gciA8PSB4IDogcXkgLSByIDw9IHkpIHtcbiAgICAgICAgICAgIHN0YWNrLnB1c2gobGVmdCk7XG4gICAgICAgICAgICBzdGFjay5wdXNoKG0gLSAxKTtcbiAgICAgICAgICAgIHN0YWNrLnB1c2gobmV4dEF4aXMpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChheGlzID09PSAwID8gcXggKyByID49IHggOiBxeSArIHIgPj0geSkge1xuICAgICAgICAgICAgc3RhY2sucHVzaChtICsgMSk7XG4gICAgICAgICAgICBzdGFjay5wdXNoKHJpZ2h0KTtcbiAgICAgICAgICAgIHN0YWNrLnB1c2gobmV4dEF4aXMpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlc3VsdDtcbn1cblxuZnVuY3Rpb24gc3FEaXN0KGF4LCBheSwgYngsIGJ5KSB7XG4gICAgdmFyIGR4ID0gYXggLSBieDtcbiAgICB2YXIgZHkgPSBheSAtIGJ5O1xuICAgIHJldHVybiBkeCAqIGR4ICsgZHkgKiBkeTtcbn1cbiIsIlxuaW1wb3J0IHNvcnQgZnJvbSAnLi9zb3J0JztcbmltcG9ydCByYW5nZSBmcm9tICcuL3JhbmdlJztcbmltcG9ydCB3aXRoaW4gZnJvbSAnLi93aXRoaW4nO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBrZGJ1c2gocG9pbnRzLCBnZXRYLCBnZXRZLCBub2RlU2l6ZSwgQXJyYXlUeXBlKSB7XG4gICAgcmV0dXJuIG5ldyBLREJ1c2gocG9pbnRzLCBnZXRYLCBnZXRZLCBub2RlU2l6ZSwgQXJyYXlUeXBlKTtcbn1cblxuZnVuY3Rpb24gS0RCdXNoKHBvaW50cywgZ2V0WCwgZ2V0WSwgbm9kZVNpemUsIEFycmF5VHlwZSkge1xuICAgIGdldFggPSBnZXRYIHx8IGRlZmF1bHRHZXRYO1xuICAgIGdldFkgPSBnZXRZIHx8IGRlZmF1bHRHZXRZO1xuICAgIEFycmF5VHlwZSA9IEFycmF5VHlwZSB8fCBBcnJheTtcblxuICAgIHRoaXMubm9kZVNpemUgPSBub2RlU2l6ZSB8fCA2NDtcbiAgICB0aGlzLnBvaW50cyA9IHBvaW50cztcblxuICAgIHRoaXMuaWRzID0gbmV3IEFycmF5VHlwZShwb2ludHMubGVuZ3RoKTtcbiAgICB0aGlzLmNvb3JkcyA9IG5ldyBBcnJheVR5cGUocG9pbnRzLmxlbmd0aCAqIDIpO1xuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwb2ludHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdGhpcy5pZHNbaV0gPSBpO1xuICAgICAgICB0aGlzLmNvb3Jkc1syICogaV0gPSBnZXRYKHBvaW50c1tpXSk7XG4gICAgICAgIHRoaXMuY29vcmRzWzIgKiBpICsgMV0gPSBnZXRZKHBvaW50c1tpXSk7XG4gICAgfVxuXG4gICAgc29ydCh0aGlzLmlkcywgdGhpcy5jb29yZHMsIHRoaXMubm9kZVNpemUsIDAsIHRoaXMuaWRzLmxlbmd0aCAtIDEsIDApO1xufVxuXG5LREJ1c2gucHJvdG90eXBlID0ge1xuICAgIHJhbmdlOiBmdW5jdGlvbiAobWluWCwgbWluWSwgbWF4WCwgbWF4WSkge1xuICAgICAgICByZXR1cm4gcmFuZ2UodGhpcy5pZHMsIHRoaXMuY29vcmRzLCBtaW5YLCBtaW5ZLCBtYXhYLCBtYXhZLCB0aGlzLm5vZGVTaXplKTtcbiAgICB9LFxuXG4gICAgd2l0aGluOiBmdW5jdGlvbiAoeCwgeSwgcikge1xuICAgICAgICByZXR1cm4gd2l0aGluKHRoaXMuaWRzLCB0aGlzLmNvb3JkcywgeCwgeSwgciwgdGhpcy5ub2RlU2l6ZSk7XG4gICAgfVxufTtcblxuZnVuY3Rpb24gZGVmYXVsdEdldFgocCkgeyByZXR1cm4gcFswXTsgfVxuZnVuY3Rpb24gZGVmYXVsdEdldFkocCkgeyByZXR1cm4gcFsxXTsgfVxuIiwiXG5pbXBvcnQga2RidXNoIGZyb20gJ2tkYnVzaCc7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIHN1cGVyY2x1c3RlcihvcHRpb25zKSB7XG4gICAgcmV0dXJuIG5ldyBTdXBlckNsdXN0ZXIob3B0aW9ucyk7XG59XG5cbmZ1bmN0aW9uIFN1cGVyQ2x1c3RlcihvcHRpb25zKSB7XG4gICAgdGhpcy5vcHRpb25zID0gZXh0ZW5kKE9iamVjdC5jcmVhdGUodGhpcy5vcHRpb25zKSwgb3B0aW9ucyk7XG4gICAgdGhpcy50cmVlcyA9IG5ldyBBcnJheSh0aGlzLm9wdGlvbnMubWF4Wm9vbSArIDEpO1xufVxuXG5TdXBlckNsdXN0ZXIucHJvdG90eXBlID0ge1xuICAgIG9wdGlvbnM6IHtcbiAgICAgICAgbWluWm9vbTogMCwgICAvLyBtaW4gem9vbSB0byBnZW5lcmF0ZSBjbHVzdGVycyBvblxuICAgICAgICBtYXhab29tOiAxNiwgIC8vIG1heCB6b29tIGxldmVsIHRvIGNsdXN0ZXIgdGhlIHBvaW50cyBvblxuICAgICAgICByYWRpdXM6IDQwLCAgIC8vIGNsdXN0ZXIgcmFkaXVzIGluIHBpeGVsc1xuICAgICAgICBleHRlbnQ6IDUxMiwgIC8vIHRpbGUgZXh0ZW50IChyYWRpdXMgaXMgY2FsY3VsYXRlZCByZWxhdGl2ZSB0byBpdClcbiAgICAgICAgbm9kZVNpemU6IDY0LCAvLyBzaXplIG9mIHRoZSBLRC10cmVlIGxlYWYgbm9kZSwgYWZmZWN0cyBwZXJmb3JtYW5jZVxuICAgICAgICBsb2c6IGZhbHNlLCAgIC8vIHdoZXRoZXIgdG8gbG9nIHRpbWluZyBpbmZvXG5cbiAgICAgICAgLy8gYSByZWR1Y2UgZnVuY3Rpb24gZm9yIGNhbGN1bGF0aW5nIGN1c3RvbSBjbHVzdGVyIHByb3BlcnRpZXNcbiAgICAgICAgcmVkdWNlOiBudWxsLCAvLyBmdW5jdGlvbiAoYWNjdW11bGF0ZWQsIHByb3BzKSB7IGFjY3VtdWxhdGVkLnN1bSArPSBwcm9wcy5zdW07IH1cblxuICAgICAgICAvLyBpbml0aWFsIHByb3BlcnRpZXMgb2YgYSBjbHVzdGVyIChiZWZvcmUgcnVubmluZyB0aGUgcmVkdWNlcilcbiAgICAgICAgaW5pdGlhbDogZnVuY3Rpb24gKCkgeyByZXR1cm4ge307IH0sIC8vIGZ1bmN0aW9uICgpIHsgcmV0dXJuIHtzdW06IDB9OyB9LFxuXG4gICAgICAgIC8vIHByb3BlcnRpZXMgdG8gdXNlIGZvciBpbmRpdmlkdWFsIHBvaW50cyB3aGVuIHJ1bm5pbmcgdGhlIHJlZHVjZXJcbiAgICAgICAgbWFwOiBmdW5jdGlvbiAocHJvcHMpIHsgcmV0dXJuIHByb3BzOyB9IC8vIGZ1bmN0aW9uIChwcm9wcykgeyByZXR1cm4ge3N1bTogcHJvcHMubXlfdmFsdWV9OyB9LFxuICAgIH0sXG5cbiAgICBsb2FkOiBmdW5jdGlvbiAocG9pbnRzKSB7XG4gICAgICAgIHZhciBsb2cgPSB0aGlzLm9wdGlvbnMubG9nO1xuXG4gICAgICAgIGlmIChsb2cpIGNvbnNvbGUudGltZSgndG90YWwgdGltZScpO1xuXG4gICAgICAgIHZhciB0aW1lcklkID0gJ3ByZXBhcmUgJyArIHBvaW50cy5sZW5ndGggKyAnIHBvaW50cyc7XG4gICAgICAgIGlmIChsb2cpIGNvbnNvbGUudGltZSh0aW1lcklkKTtcblxuICAgICAgICB0aGlzLnBvaW50cyA9IHBvaW50cztcblxuICAgICAgICAvLyBnZW5lcmF0ZSBhIGNsdXN0ZXIgb2JqZWN0IGZvciBlYWNoIHBvaW50IGFuZCBpbmRleCBpbnB1dCBwb2ludHMgaW50byBhIEtELXRyZWVcbiAgICAgICAgdmFyIGNsdXN0ZXJzID0gW107XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcG9pbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBpZiAoIXBvaW50c1tpXS5nZW9tZXRyeSkge1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2x1c3RlcnMucHVzaChjcmVhdGVQb2ludENsdXN0ZXIocG9pbnRzW2ldLCBpKSk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy50cmVlc1t0aGlzLm9wdGlvbnMubWF4Wm9vbSArIDFdID0ga2RidXNoKGNsdXN0ZXJzLCBnZXRYLCBnZXRZLCB0aGlzLm9wdGlvbnMubm9kZVNpemUsIEZsb2F0MzJBcnJheSk7XG5cbiAgICAgICAgaWYgKGxvZykgY29uc29sZS50aW1lRW5kKHRpbWVySWQpO1xuXG4gICAgICAgIC8vIGNsdXN0ZXIgcG9pbnRzIG9uIG1heCB6b29tLCB0aGVuIGNsdXN0ZXIgdGhlIHJlc3VsdHMgb24gcHJldmlvdXMgem9vbSwgZXRjLjtcbiAgICAgICAgLy8gcmVzdWx0cyBpbiBhIGNsdXN0ZXIgaGllcmFyY2h5IGFjcm9zcyB6b29tIGxldmVsc1xuICAgICAgICBmb3IgKHZhciB6ID0gdGhpcy5vcHRpb25zLm1heFpvb207IHogPj0gdGhpcy5vcHRpb25zLm1pblpvb207IHotLSkge1xuICAgICAgICAgICAgdmFyIG5vdyA9ICtEYXRlLm5vdygpO1xuXG4gICAgICAgICAgICAvLyBjcmVhdGUgYSBuZXcgc2V0IG9mIGNsdXN0ZXJzIGZvciB0aGUgem9vbSBhbmQgaW5kZXggdGhlbSB3aXRoIGEgS0QtdHJlZVxuICAgICAgICAgICAgY2x1c3RlcnMgPSB0aGlzLl9jbHVzdGVyKGNsdXN0ZXJzLCB6KTtcbiAgICAgICAgICAgIHRoaXMudHJlZXNbel0gPSBrZGJ1c2goY2x1c3RlcnMsIGdldFgsIGdldFksIHRoaXMub3B0aW9ucy5ub2RlU2l6ZSwgRmxvYXQzMkFycmF5KTtcblxuICAgICAgICAgICAgaWYgKGxvZykgY29uc29sZS5sb2coJ3olZDogJWQgY2x1c3RlcnMgaW4gJWRtcycsIHosIGNsdXN0ZXJzLmxlbmd0aCwgK0RhdGUubm93KCkgLSBub3cpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGxvZykgY29uc29sZS50aW1lRW5kKCd0b3RhbCB0aW1lJyk7XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuICAgIGdldENsdXN0ZXJzOiBmdW5jdGlvbiAoYmJveCwgem9vbSkge1xuICAgICAgICB2YXIgbWluTG5nID0gKChiYm94WzBdICsgMTgwKSAlIDM2MCArIDM2MCkgJSAzNjAgLSAxODA7XG4gICAgICAgIHZhciBtaW5MYXQgPSBNYXRoLm1heCgtOTAsIE1hdGgubWluKDkwLCBiYm94WzFdKSk7XG4gICAgICAgIHZhciBtYXhMbmcgPSBiYm94WzJdID09PSAxODAgPyAxODAgOiAoKGJib3hbMl0gKyAxODApICUgMzYwICsgMzYwKSAlIDM2MCAtIDE4MDtcbiAgICAgICAgdmFyIG1heExhdCA9IE1hdGgubWF4KC05MCwgTWF0aC5taW4oOTAsIGJib3hbM10pKTtcblxuICAgICAgICBpZiAoYmJveFsyXSAtIGJib3hbMF0gPj0gMzYwKSB7XG4gICAgICAgICAgICBtaW5MbmcgPSAtMTgwO1xuICAgICAgICAgICAgbWF4TG5nID0gMTgwO1xuICAgICAgICB9IGVsc2UgaWYgKG1pbkxuZyA+IG1heExuZykge1xuICAgICAgICAgICAgdmFyIGVhc3Rlcm5IZW0gPSB0aGlzLmdldENsdXN0ZXJzKFttaW5MbmcsIG1pbkxhdCwgMTgwLCBtYXhMYXRdLCB6b29tKTtcbiAgICAgICAgICAgIHZhciB3ZXN0ZXJuSGVtID0gdGhpcy5nZXRDbHVzdGVycyhbLTE4MCwgbWluTGF0LCBtYXhMbmcsIG1heExhdF0sIHpvb20pO1xuICAgICAgICAgICAgcmV0dXJuIGVhc3Rlcm5IZW0uY29uY2F0KHdlc3Rlcm5IZW0pO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHRyZWUgPSB0aGlzLnRyZWVzW3RoaXMuX2xpbWl0Wm9vbSh6b29tKV07XG4gICAgICAgIHZhciBpZHMgPSB0cmVlLnJhbmdlKGxuZ1gobWluTG5nKSwgbGF0WShtYXhMYXQpLCBsbmdYKG1heExuZyksIGxhdFkobWluTGF0KSk7XG4gICAgICAgIHZhciBjbHVzdGVycyA9IFtdO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGlkcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIGMgPSB0cmVlLnBvaW50c1tpZHNbaV1dO1xuICAgICAgICAgICAgY2x1c3RlcnMucHVzaChjLm51bVBvaW50cyA/IGdldENsdXN0ZXJKU09OKGMpIDogdGhpcy5wb2ludHNbYy5pbmRleF0pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBjbHVzdGVycztcbiAgICB9LFxuXG4gICAgZ2V0Q2hpbGRyZW46IGZ1bmN0aW9uIChjbHVzdGVySWQpIHtcbiAgICAgICAgdmFyIG9yaWdpbklkID0gY2x1c3RlcklkID4+IDU7XG4gICAgICAgIHZhciBvcmlnaW5ab29tID0gY2x1c3RlcklkICUgMzI7XG4gICAgICAgIHZhciBlcnJvck1zZyA9ICdObyBjbHVzdGVyIHdpdGggdGhlIHNwZWNpZmllZCBpZC4nO1xuXG4gICAgICAgIHZhciBpbmRleCA9IHRoaXMudHJlZXNbb3JpZ2luWm9vbV07XG4gICAgICAgIGlmICghaW5kZXgpIHRocm93IG5ldyBFcnJvcihlcnJvck1zZyk7XG5cbiAgICAgICAgdmFyIG9yaWdpbiA9IGluZGV4LnBvaW50c1tvcmlnaW5JZF07XG4gICAgICAgIGlmICghb3JpZ2luKSB0aHJvdyBuZXcgRXJyb3IoZXJyb3JNc2cpO1xuXG4gICAgICAgIHZhciByID0gdGhpcy5vcHRpb25zLnJhZGl1cyAvICh0aGlzLm9wdGlvbnMuZXh0ZW50ICogTWF0aC5wb3coMiwgb3JpZ2luWm9vbSAtIDEpKTtcbiAgICAgICAgdmFyIGlkcyA9IGluZGV4LndpdGhpbihvcmlnaW4ueCwgb3JpZ2luLnksIHIpO1xuICAgICAgICB2YXIgY2hpbGRyZW4gPSBbXTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBpZHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBjID0gaW5kZXgucG9pbnRzW2lkc1tpXV07XG4gICAgICAgICAgICBpZiAoYy5wYXJlbnRJZCA9PT0gY2x1c3RlcklkKSB7XG4gICAgICAgICAgICAgICAgY2hpbGRyZW4ucHVzaChjLm51bVBvaW50cyA/IGdldENsdXN0ZXJKU09OKGMpIDogdGhpcy5wb2ludHNbYy5pbmRleF0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNoaWxkcmVuLmxlbmd0aCA9PT0gMCkgdGhyb3cgbmV3IEVycm9yKGVycm9yTXNnKTtcblxuICAgICAgICByZXR1cm4gY2hpbGRyZW47XG4gICAgfSxcblxuICAgIGdldExlYXZlczogZnVuY3Rpb24gKGNsdXN0ZXJJZCwgbGltaXQsIG9mZnNldCkge1xuICAgICAgICBsaW1pdCA9IGxpbWl0IHx8IDEwO1xuICAgICAgICBvZmZzZXQgPSBvZmZzZXQgfHwgMDtcblxuICAgICAgICB2YXIgbGVhdmVzID0gW107XG4gICAgICAgIHRoaXMuX2FwcGVuZExlYXZlcyhsZWF2ZXMsIGNsdXN0ZXJJZCwgbGltaXQsIG9mZnNldCwgMCk7XG5cbiAgICAgICAgcmV0dXJuIGxlYXZlcztcbiAgICB9LFxuXG4gICAgZ2V0VGlsZTogZnVuY3Rpb24gKHosIHgsIHkpIHtcbiAgICAgICAgdmFyIHRyZWUgPSB0aGlzLnRyZWVzW3RoaXMuX2xpbWl0Wm9vbSh6KV07XG4gICAgICAgIHZhciB6MiA9IE1hdGgucG93KDIsIHopO1xuICAgICAgICB2YXIgZXh0ZW50ID0gdGhpcy5vcHRpb25zLmV4dGVudDtcbiAgICAgICAgdmFyIHIgPSB0aGlzLm9wdGlvbnMucmFkaXVzO1xuICAgICAgICB2YXIgcCA9IHIgLyBleHRlbnQ7XG4gICAgICAgIHZhciB0b3AgPSAoeSAtIHApIC8gejI7XG4gICAgICAgIHZhciBib3R0b20gPSAoeSArIDEgKyBwKSAvIHoyO1xuXG4gICAgICAgIHZhciB0aWxlID0ge1xuICAgICAgICAgICAgZmVhdHVyZXM6IFtdXG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5fYWRkVGlsZUZlYXR1cmVzKFxuICAgICAgICAgICAgdHJlZS5yYW5nZSgoeCAtIHApIC8gejIsIHRvcCwgKHggKyAxICsgcCkgLyB6MiwgYm90dG9tKSxcbiAgICAgICAgICAgIHRyZWUucG9pbnRzLCB4LCB5LCB6MiwgdGlsZSk7XG5cbiAgICAgICAgaWYgKHggPT09IDApIHtcbiAgICAgICAgICAgIHRoaXMuX2FkZFRpbGVGZWF0dXJlcyhcbiAgICAgICAgICAgICAgICB0cmVlLnJhbmdlKDEgLSBwIC8gejIsIHRvcCwgMSwgYm90dG9tKSxcbiAgICAgICAgICAgICAgICB0cmVlLnBvaW50cywgejIsIHksIHoyLCB0aWxlKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoeCA9PT0gejIgLSAxKSB7XG4gICAgICAgICAgICB0aGlzLl9hZGRUaWxlRmVhdHVyZXMoXG4gICAgICAgICAgICAgICAgdHJlZS5yYW5nZSgwLCB0b3AsIHAgLyB6MiwgYm90dG9tKSxcbiAgICAgICAgICAgICAgICB0cmVlLnBvaW50cywgLTEsIHksIHoyLCB0aWxlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aWxlLmZlYXR1cmVzLmxlbmd0aCA/IHRpbGUgOiBudWxsO1xuICAgIH0sXG5cbiAgICBnZXRDbHVzdGVyRXhwYW5zaW9uWm9vbTogZnVuY3Rpb24gKGNsdXN0ZXJJZCkge1xuICAgICAgICB2YXIgY2x1c3Rlclpvb20gPSAoY2x1c3RlcklkICUgMzIpIC0gMTtcbiAgICAgICAgd2hpbGUgKGNsdXN0ZXJab29tIDwgdGhpcy5vcHRpb25zLm1heFpvb20pIHtcbiAgICAgICAgICAgIHZhciBjaGlsZHJlbiA9IHRoaXMuZ2V0Q2hpbGRyZW4oY2x1c3RlcklkKTtcbiAgICAgICAgICAgIGNsdXN0ZXJab29tKys7XG4gICAgICAgICAgICBpZiAoY2hpbGRyZW4ubGVuZ3RoICE9PSAxKSBicmVhaztcbiAgICAgICAgICAgIGNsdXN0ZXJJZCA9IGNoaWxkcmVuWzBdLnByb3BlcnRpZXMuY2x1c3Rlcl9pZDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gY2x1c3Rlclpvb207XG4gICAgfSxcblxuICAgIF9hcHBlbmRMZWF2ZXM6IGZ1bmN0aW9uIChyZXN1bHQsIGNsdXN0ZXJJZCwgbGltaXQsIG9mZnNldCwgc2tpcHBlZCkge1xuICAgICAgICB2YXIgY2hpbGRyZW4gPSB0aGlzLmdldENoaWxkcmVuKGNsdXN0ZXJJZCk7XG5cbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjaGlsZHJlbi5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIHByb3BzID0gY2hpbGRyZW5baV0ucHJvcGVydGllcztcblxuICAgICAgICAgICAgaWYgKHByb3BzICYmIHByb3BzLmNsdXN0ZXIpIHtcbiAgICAgICAgICAgICAgICBpZiAoc2tpcHBlZCArIHByb3BzLnBvaW50X2NvdW50IDw9IG9mZnNldCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBza2lwIHRoZSB3aG9sZSBjbHVzdGVyXG4gICAgICAgICAgICAgICAgICAgIHNraXBwZWQgKz0gcHJvcHMucG9pbnRfY291bnQ7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gZW50ZXIgdGhlIGNsdXN0ZXJcbiAgICAgICAgICAgICAgICAgICAgc2tpcHBlZCA9IHRoaXMuX2FwcGVuZExlYXZlcyhyZXN1bHQsIHByb3BzLmNsdXN0ZXJfaWQsIGxpbWl0LCBvZmZzZXQsIHNraXBwZWQpO1xuICAgICAgICAgICAgICAgICAgICAvLyBleGl0IHRoZSBjbHVzdGVyXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChza2lwcGVkIDwgb2Zmc2V0KSB7XG4gICAgICAgICAgICAgICAgLy8gc2tpcCBhIHNpbmdsZSBwb2ludFxuICAgICAgICAgICAgICAgIHNraXBwZWQrKztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gYWRkIGEgc2luZ2xlIHBvaW50XG4gICAgICAgICAgICAgICAgcmVzdWx0LnB1c2goY2hpbGRyZW5baV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHJlc3VsdC5sZW5ndGggPT09IGxpbWl0KSBicmVhaztcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBza2lwcGVkO1xuICAgIH0sXG5cbiAgICBfYWRkVGlsZUZlYXR1cmVzOiBmdW5jdGlvbiAoaWRzLCBwb2ludHMsIHgsIHksIHoyLCB0aWxlKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgaWRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgYyA9IHBvaW50c1tpZHNbaV1dO1xuICAgICAgICAgICAgdmFyIGYgPSB7XG4gICAgICAgICAgICAgICAgdHlwZTogMSxcbiAgICAgICAgICAgICAgICBnZW9tZXRyeTogW1tcbiAgICAgICAgICAgICAgICAgICAgTWF0aC5yb3VuZCh0aGlzLm9wdGlvbnMuZXh0ZW50ICogKGMueCAqIHoyIC0geCkpLFxuICAgICAgICAgICAgICAgICAgICBNYXRoLnJvdW5kKHRoaXMub3B0aW9ucy5leHRlbnQgKiAoYy55ICogejIgLSB5KSlcbiAgICAgICAgICAgICAgICBdXSxcbiAgICAgICAgICAgICAgICB0YWdzOiBjLm51bVBvaW50cyA/IGdldENsdXN0ZXJQcm9wZXJ0aWVzKGMpIDogdGhpcy5wb2ludHNbYy5pbmRleF0ucHJvcGVydGllc1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHZhciBpZCA9IGMubnVtUG9pbnRzID8gYy5pZCA6IHRoaXMucG9pbnRzW2MuaW5kZXhdLmlkO1xuICAgICAgICAgICAgaWYgKGlkICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBmLmlkID0gaWQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aWxlLmZlYXR1cmVzLnB1c2goZik7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgX2xpbWl0Wm9vbTogZnVuY3Rpb24gKHopIHtcbiAgICAgICAgcmV0dXJuIE1hdGgubWF4KHRoaXMub3B0aW9ucy5taW5ab29tLCBNYXRoLm1pbih6LCB0aGlzLm9wdGlvbnMubWF4Wm9vbSArIDEpKTtcbiAgICB9LFxuXG4gICAgX2NsdXN0ZXI6IGZ1bmN0aW9uIChwb2ludHMsIHpvb20pIHtcbiAgICAgICAgdmFyIGNsdXN0ZXJzID0gW107XG4gICAgICAgIHZhciByID0gdGhpcy5vcHRpb25zLnJhZGl1cyAvICh0aGlzLm9wdGlvbnMuZXh0ZW50ICogTWF0aC5wb3coMiwgem9vbSkpO1xuXG4gICAgICAgIC8vIGxvb3AgdGhyb3VnaCBlYWNoIHBvaW50XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcG9pbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgcCA9IHBvaW50c1tpXTtcbiAgICAgICAgICAgIC8vIGlmIHdlJ3ZlIGFscmVhZHkgdmlzaXRlZCB0aGUgcG9pbnQgYXQgdGhpcyB6b29tIGxldmVsLCBza2lwIGl0XG4gICAgICAgICAgICBpZiAocC56b29tIDw9IHpvb20pIGNvbnRpbnVlO1xuICAgICAgICAgICAgcC56b29tID0gem9vbTtcblxuICAgICAgICAgICAgLy8gZmluZCBhbGwgbmVhcmJ5IHBvaW50c1xuICAgICAgICAgICAgdmFyIHRyZWUgPSB0aGlzLnRyZWVzW3pvb20gKyAxXTtcbiAgICAgICAgICAgIHZhciBuZWlnaGJvcklkcyA9IHRyZWUud2l0aGluKHAueCwgcC55LCByKTtcblxuICAgICAgICAgICAgdmFyIG51bVBvaW50cyA9IHAubnVtUG9pbnRzIHx8IDE7XG4gICAgICAgICAgICB2YXIgd3ggPSBwLnggKiBudW1Qb2ludHM7XG4gICAgICAgICAgICB2YXIgd3kgPSBwLnkgKiBudW1Qb2ludHM7XG5cbiAgICAgICAgICAgIHZhciBjbHVzdGVyUHJvcGVydGllcyA9IG51bGw7XG5cbiAgICAgICAgICAgIGlmICh0aGlzLm9wdGlvbnMucmVkdWNlKSB7XG4gICAgICAgICAgICAgICAgY2x1c3RlclByb3BlcnRpZXMgPSB0aGlzLm9wdGlvbnMuaW5pdGlhbCgpO1xuICAgICAgICAgICAgICAgIHRoaXMuX2FjY3VtdWxhdGUoY2x1c3RlclByb3BlcnRpZXMsIHApO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBlbmNvZGUgYm90aCB6b29tIGFuZCBwb2ludCBpbmRleCBvbiB3aGljaCB0aGUgY2x1c3RlciBvcmlnaW5hdGVkXG4gICAgICAgICAgICB2YXIgaWQgPSAoaSA8PCA1KSArICh6b29tICsgMSk7XG5cbiAgICAgICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgbmVpZ2hib3JJZHMubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgYiA9IHRyZWUucG9pbnRzW25laWdoYm9ySWRzW2pdXTtcbiAgICAgICAgICAgICAgICAvLyBmaWx0ZXIgb3V0IG5laWdoYm9ycyB0aGF0IGFyZSBhbHJlYWR5IHByb2Nlc3NlZFxuICAgICAgICAgICAgICAgIGlmIChiLnpvb20gPD0gem9vbSkgY29udGludWU7XG4gICAgICAgICAgICAgICAgYi56b29tID0gem9vbTsgLy8gc2F2ZSB0aGUgem9vbSAoc28gaXQgZG9lc24ndCBnZXQgcHJvY2Vzc2VkIHR3aWNlKVxuXG4gICAgICAgICAgICAgICAgdmFyIG51bVBvaW50czIgPSBiLm51bVBvaW50cyB8fCAxO1xuICAgICAgICAgICAgICAgIHd4ICs9IGIueCAqIG51bVBvaW50czI7IC8vIGFjY3VtdWxhdGUgY29vcmRpbmF0ZXMgZm9yIGNhbGN1bGF0aW5nIHdlaWdodGVkIGNlbnRlclxuICAgICAgICAgICAgICAgIHd5ICs9IGIueSAqIG51bVBvaW50czI7XG5cbiAgICAgICAgICAgICAgICBudW1Qb2ludHMgKz0gbnVtUG9pbnRzMjtcbiAgICAgICAgICAgICAgICBiLnBhcmVudElkID0gaWQ7XG5cbiAgICAgICAgICAgICAgICBpZiAodGhpcy5vcHRpb25zLnJlZHVjZSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9hY2N1bXVsYXRlKGNsdXN0ZXJQcm9wZXJ0aWVzLCBiKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChudW1Qb2ludHMgPT09IDEpIHtcbiAgICAgICAgICAgICAgICBjbHVzdGVycy5wdXNoKHApO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBwLnBhcmVudElkID0gaWQ7XG4gICAgICAgICAgICAgICAgY2x1c3RlcnMucHVzaChjcmVhdGVDbHVzdGVyKHd4IC8gbnVtUG9pbnRzLCB3eSAvIG51bVBvaW50cywgaWQsIG51bVBvaW50cywgY2x1c3RlclByb3BlcnRpZXMpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBjbHVzdGVycztcbiAgICB9LFxuXG4gICAgX2FjY3VtdWxhdGU6IGZ1bmN0aW9uIChjbHVzdGVyUHJvcGVydGllcywgcG9pbnQpIHtcbiAgICAgICAgdmFyIHByb3BlcnRpZXMgPSBwb2ludC5udW1Qb2ludHMgP1xuICAgICAgICAgICAgcG9pbnQucHJvcGVydGllcyA6XG4gICAgICAgICAgICB0aGlzLm9wdGlvbnMubWFwKHRoaXMucG9pbnRzW3BvaW50LmluZGV4XS5wcm9wZXJ0aWVzKTtcblxuICAgICAgICB0aGlzLm9wdGlvbnMucmVkdWNlKGNsdXN0ZXJQcm9wZXJ0aWVzLCBwcm9wZXJ0aWVzKTtcbiAgICB9XG59O1xuXG5mdW5jdGlvbiBjcmVhdGVDbHVzdGVyKHgsIHksIGlkLCBudW1Qb2ludHMsIHByb3BlcnRpZXMpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICB4OiB4LCAvLyB3ZWlnaHRlZCBjbHVzdGVyIGNlbnRlclxuICAgICAgICB5OiB5LFxuICAgICAgICB6b29tOiBJbmZpbml0eSwgLy8gdGhlIGxhc3Qgem9vbSB0aGUgY2x1c3RlciB3YXMgcHJvY2Vzc2VkIGF0XG4gICAgICAgIGlkOiBpZCwgLy8gZW5jb2RlcyBpbmRleCBvZiB0aGUgZmlyc3QgY2hpbGQgb2YgdGhlIGNsdXN0ZXIgYW5kIGl0cyB6b29tIGxldmVsXG4gICAgICAgIHBhcmVudElkOiAtMSwgLy8gcGFyZW50IGNsdXN0ZXIgaWRcbiAgICAgICAgbnVtUG9pbnRzOiBudW1Qb2ludHMsXG4gICAgICAgIHByb3BlcnRpZXM6IHByb3BlcnRpZXNcbiAgICB9O1xufVxuXG5mdW5jdGlvbiBjcmVhdGVQb2ludENsdXN0ZXIocCwgaWQpIHtcbiAgICB2YXIgY29vcmRzID0gcC5nZW9tZXRyeS5jb29yZGluYXRlcztcbiAgICByZXR1cm4ge1xuICAgICAgICB4OiBsbmdYKGNvb3Jkc1swXSksIC8vIHByb2plY3RlZCBwb2ludCBjb29yZGluYXRlc1xuICAgICAgICB5OiBsYXRZKGNvb3Jkc1sxXSksXG4gICAgICAgIHpvb206IEluZmluaXR5LCAvLyB0aGUgbGFzdCB6b29tIHRoZSBwb2ludCB3YXMgcHJvY2Vzc2VkIGF0XG4gICAgICAgIGluZGV4OiBpZCwgLy8gaW5kZXggb2YgdGhlIHNvdXJjZSBmZWF0dXJlIGluIHRoZSBvcmlnaW5hbCBpbnB1dCBhcnJheSxcbiAgICAgICAgcGFyZW50SWQ6IC0xIC8vIHBhcmVudCBjbHVzdGVyIGlkXG4gICAgfTtcbn1cblxuZnVuY3Rpb24gZ2V0Q2x1c3RlckpTT04oY2x1c3Rlcikge1xuICAgIHJldHVybiB7XG4gICAgICAgIHR5cGU6ICdGZWF0dXJlJyxcbiAgICAgICAgaWQ6IGNsdXN0ZXIuaWQsXG4gICAgICAgIHByb3BlcnRpZXM6IGdldENsdXN0ZXJQcm9wZXJ0aWVzKGNsdXN0ZXIpLFxuICAgICAgICBnZW9tZXRyeToge1xuICAgICAgICAgICAgdHlwZTogJ1BvaW50JyxcbiAgICAgICAgICAgIGNvb3JkaW5hdGVzOiBbeExuZyhjbHVzdGVyLngpLCB5TGF0KGNsdXN0ZXIueSldXG4gICAgICAgIH1cbiAgICB9O1xufVxuXG5mdW5jdGlvbiBnZXRDbHVzdGVyUHJvcGVydGllcyhjbHVzdGVyKSB7XG4gICAgdmFyIGNvdW50ID0gY2x1c3Rlci5udW1Qb2ludHM7XG4gICAgdmFyIGFiYnJldiA9XG4gICAgICAgIGNvdW50ID49IDEwMDAwID8gTWF0aC5yb3VuZChjb3VudCAvIDEwMDApICsgJ2snIDpcbiAgICAgICAgY291bnQgPj0gMTAwMCA/IChNYXRoLnJvdW5kKGNvdW50IC8gMTAwKSAvIDEwKSArICdrJyA6IGNvdW50O1xuICAgIHJldHVybiBleHRlbmQoZXh0ZW5kKHt9LCBjbHVzdGVyLnByb3BlcnRpZXMpLCB7XG4gICAgICAgIGNsdXN0ZXI6IHRydWUsXG4gICAgICAgIGNsdXN0ZXJfaWQ6IGNsdXN0ZXIuaWQsXG4gICAgICAgIHBvaW50X2NvdW50OiBjb3VudCxcbiAgICAgICAgcG9pbnRfY291bnRfYWJicmV2aWF0ZWQ6IGFiYnJldlxuICAgIH0pO1xufVxuXG4vLyBsb25naXR1ZGUvbGF0aXR1ZGUgdG8gc3BoZXJpY2FsIG1lcmNhdG9yIGluIFswLi4xXSByYW5nZVxuZnVuY3Rpb24gbG5nWChsbmcpIHtcbiAgICByZXR1cm4gbG5nIC8gMzYwICsgMC41O1xufVxuZnVuY3Rpb24gbGF0WShsYXQpIHtcbiAgICB2YXIgc2luID0gTWF0aC5zaW4obGF0ICogTWF0aC5QSSAvIDE4MCksXG4gICAgICAgIHkgPSAoMC41IC0gMC4yNSAqIE1hdGgubG9nKCgxICsgc2luKSAvICgxIC0gc2luKSkgLyBNYXRoLlBJKTtcbiAgICByZXR1cm4geSA8IDAgPyAwIDogeSA+IDEgPyAxIDogeTtcbn1cblxuLy8gc3BoZXJpY2FsIG1lcmNhdG9yIHRvIGxvbmdpdHVkZS9sYXRpdHVkZVxuZnVuY3Rpb24geExuZyh4KSB7XG4gICAgcmV0dXJuICh4IC0gMC41KSAqIDM2MDtcbn1cbmZ1bmN0aW9uIHlMYXQoeSkge1xuICAgIHZhciB5MiA9ICgxODAgLSB5ICogMzYwKSAqIE1hdGguUEkgLyAxODA7XG4gICAgcmV0dXJuIDM2MCAqIE1hdGguYXRhbihNYXRoLmV4cCh5MikpIC8gTWF0aC5QSSAtIDkwO1xufVxuXG5mdW5jdGlvbiBleHRlbmQoZGVzdCwgc3JjKSB7XG4gICAgZm9yICh2YXIgaWQgaW4gc3JjKSBkZXN0W2lkXSA9IHNyY1tpZF07XG4gICAgcmV0dXJuIGRlc3Q7XG59XG5cbmZ1bmN0aW9uIGdldFgocCkge1xuICAgIHJldHVybiBwLng7XG59XG5mdW5jdGlvbiBnZXRZKHApIHtcbiAgICByZXR1cm4gcC55O1xufVxuIiwiXG4vLyBjYWxjdWxhdGUgc2ltcGxpZmljYXRpb24gZGF0YSB1c2luZyBvcHRpbWl6ZWQgRG91Z2xhcy1QZXVja2VyIGFsZ29yaXRobVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBzaW1wbGlmeShjb29yZHMsIGZpcnN0LCBsYXN0LCBzcVRvbGVyYW5jZSkge1xuICAgIHZhciBtYXhTcURpc3QgPSBzcVRvbGVyYW5jZTtcbiAgICB2YXIgbWlkID0gKGxhc3QgLSBmaXJzdCkgPj4gMTtcbiAgICB2YXIgbWluUG9zVG9NaWQgPSBsYXN0IC0gZmlyc3Q7XG4gICAgdmFyIGluZGV4O1xuXG4gICAgdmFyIGF4ID0gY29vcmRzW2ZpcnN0XTtcbiAgICB2YXIgYXkgPSBjb29yZHNbZmlyc3QgKyAxXTtcbiAgICB2YXIgYnggPSBjb29yZHNbbGFzdF07XG4gICAgdmFyIGJ5ID0gY29vcmRzW2xhc3QgKyAxXTtcblxuICAgIGZvciAodmFyIGkgPSBmaXJzdCArIDM7IGkgPCBsYXN0OyBpICs9IDMpIHtcbiAgICAgICAgdmFyIGQgPSBnZXRTcVNlZ0Rpc3QoY29vcmRzW2ldLCBjb29yZHNbaSArIDFdLCBheCwgYXksIGJ4LCBieSk7XG5cbiAgICAgICAgaWYgKGQgPiBtYXhTcURpc3QpIHtcbiAgICAgICAgICAgIGluZGV4ID0gaTtcbiAgICAgICAgICAgIG1heFNxRGlzdCA9IGQ7XG5cbiAgICAgICAgfSBlbHNlIGlmIChkID09PSBtYXhTcURpc3QpIHtcbiAgICAgICAgICAgIC8vIGEgd29ya2Fyb3VuZCB0byBlbnN1cmUgd2UgY2hvb3NlIGEgcGl2b3QgY2xvc2UgdG8gdGhlIG1pZGRsZSBvZiB0aGUgbGlzdCxcbiAgICAgICAgICAgIC8vIHJlZHVjaW5nIHJlY3Vyc2lvbiBkZXB0aCwgZm9yIGNlcnRhaW4gZGVnZW5lcmF0ZSBpbnB1dHNcbiAgICAgICAgICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9tYXBib3gvZ2VvanNvbi12dC9pc3N1ZXMvMTA0XG4gICAgICAgICAgICB2YXIgcG9zVG9NaWQgPSBNYXRoLmFicyhpIC0gbWlkKTtcbiAgICAgICAgICAgIGlmIChwb3NUb01pZCA8IG1pblBvc1RvTWlkKSB7XG4gICAgICAgICAgICAgICAgaW5kZXggPSBpO1xuICAgICAgICAgICAgICAgIG1pblBvc1RvTWlkID0gcG9zVG9NaWQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAobWF4U3FEaXN0ID4gc3FUb2xlcmFuY2UpIHtcbiAgICAgICAgaWYgKGluZGV4IC0gZmlyc3QgPiAzKSBzaW1wbGlmeShjb29yZHMsIGZpcnN0LCBpbmRleCwgc3FUb2xlcmFuY2UpO1xuICAgICAgICBjb29yZHNbaW5kZXggKyAyXSA9IG1heFNxRGlzdDtcbiAgICAgICAgaWYgKGxhc3QgLSBpbmRleCA+IDMpIHNpbXBsaWZ5KGNvb3JkcywgaW5kZXgsIGxhc3QsIHNxVG9sZXJhbmNlKTtcbiAgICB9XG59XG5cbi8vIHNxdWFyZSBkaXN0YW5jZSBmcm9tIGEgcG9pbnQgdG8gYSBzZWdtZW50XG5mdW5jdGlvbiBnZXRTcVNlZ0Rpc3QocHgsIHB5LCB4LCB5LCBieCwgYnkpIHtcblxuICAgIHZhciBkeCA9IGJ4IC0geDtcbiAgICB2YXIgZHkgPSBieSAtIHk7XG5cbiAgICBpZiAoZHggIT09IDAgfHwgZHkgIT09IDApIHtcblxuICAgICAgICB2YXIgdCA9ICgocHggLSB4KSAqIGR4ICsgKHB5IC0geSkgKiBkeSkgLyAoZHggKiBkeCArIGR5ICogZHkpO1xuXG4gICAgICAgIGlmICh0ID4gMSkge1xuICAgICAgICAgICAgeCA9IGJ4O1xuICAgICAgICAgICAgeSA9IGJ5O1xuXG4gICAgICAgIH0gZWxzZSBpZiAodCA+IDApIHtcbiAgICAgICAgICAgIHggKz0gZHggKiB0O1xuICAgICAgICAgICAgeSArPSBkeSAqIHQ7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBkeCA9IHB4IC0geDtcbiAgICBkeSA9IHB5IC0geTtcblxuICAgIHJldHVybiBkeCAqIGR4ICsgZHkgKiBkeTtcbn1cbiIsIlxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gY3JlYXRlRmVhdHVyZShpZCwgdHlwZSwgZ2VvbSwgdGFncykge1xuICAgIHZhciBmZWF0dXJlID0ge1xuICAgICAgICBpZDogdHlwZW9mIGlkID09PSAndW5kZWZpbmVkJyA/IG51bGwgOiBpZCxcbiAgICAgICAgdHlwZTogdHlwZSxcbiAgICAgICAgZ2VvbWV0cnk6IGdlb20sXG4gICAgICAgIHRhZ3M6IHRhZ3MsXG4gICAgICAgIG1pblg6IEluZmluaXR5LFxuICAgICAgICBtaW5ZOiBJbmZpbml0eSxcbiAgICAgICAgbWF4WDogLUluZmluaXR5LFxuICAgICAgICBtYXhZOiAtSW5maW5pdHlcbiAgICB9O1xuICAgIGNhbGNCQm94KGZlYXR1cmUpO1xuICAgIHJldHVybiBmZWF0dXJlO1xufVxuXG5mdW5jdGlvbiBjYWxjQkJveChmZWF0dXJlKSB7XG4gICAgdmFyIGdlb20gPSBmZWF0dXJlLmdlb21ldHJ5O1xuICAgIHZhciB0eXBlID0gZmVhdHVyZS50eXBlO1xuXG4gICAgaWYgKHR5cGUgPT09ICdQb2ludCcgfHwgdHlwZSA9PT0gJ011bHRpUG9pbnQnIHx8IHR5cGUgPT09ICdMaW5lU3RyaW5nJykge1xuICAgICAgICBjYWxjTGluZUJCb3goZmVhdHVyZSwgZ2VvbSk7XG5cbiAgICB9IGVsc2UgaWYgKHR5cGUgPT09ICdQb2x5Z29uJyB8fCB0eXBlID09PSAnTXVsdGlMaW5lU3RyaW5nJykge1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGdlb20ubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGNhbGNMaW5lQkJveChmZWF0dXJlLCBnZW9tW2ldKTtcbiAgICAgICAgfVxuXG4gICAgfSBlbHNlIGlmICh0eXBlID09PSAnTXVsdGlQb2x5Z29uJykge1xuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgZ2VvbS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBnZW9tW2ldLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICAgICAgY2FsY0xpbmVCQm94KGZlYXR1cmUsIGdlb21baV1bal0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufVxuXG5mdW5jdGlvbiBjYWxjTGluZUJCb3goZmVhdHVyZSwgZ2VvbSkge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZ2VvbS5sZW5ndGg7IGkgKz0gMykge1xuICAgICAgICBmZWF0dXJlLm1pblggPSBNYXRoLm1pbihmZWF0dXJlLm1pblgsIGdlb21baV0pO1xuICAgICAgICBmZWF0dXJlLm1pblkgPSBNYXRoLm1pbihmZWF0dXJlLm1pblksIGdlb21baSArIDFdKTtcbiAgICAgICAgZmVhdHVyZS5tYXhYID0gTWF0aC5tYXgoZmVhdHVyZS5tYXhYLCBnZW9tW2ldKTtcbiAgICAgICAgZmVhdHVyZS5tYXhZID0gTWF0aC5tYXgoZmVhdHVyZS5tYXhZLCBnZW9tW2kgKyAxXSk7XG4gICAgfVxufVxuIiwiXG5pbXBvcnQgc2ltcGxpZnkgZnJvbSAnLi9zaW1wbGlmeSc7XG5pbXBvcnQgY3JlYXRlRmVhdHVyZSBmcm9tICcuL2ZlYXR1cmUnO1xuXG4vLyBjb252ZXJ0cyBHZW9KU09OIGZlYXR1cmUgaW50byBhbiBpbnRlcm1lZGlhdGUgcHJvamVjdGVkIEpTT04gdmVjdG9yIGZvcm1hdCB3aXRoIHNpbXBsaWZpY2F0aW9uIGRhdGFcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gY29udmVydChkYXRhLCBvcHRpb25zKSB7XG4gICAgdmFyIGZlYXR1cmVzID0gW107XG4gICAgaWYgKGRhdGEudHlwZSA9PT0gJ0ZlYXR1cmVDb2xsZWN0aW9uJykge1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGRhdGEuZmVhdHVyZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGNvbnZlcnRGZWF0dXJlKGZlYXR1cmVzLCBkYXRhLmZlYXR1cmVzW2ldLCBvcHRpb25zLCBpKTtcbiAgICAgICAgfVxuXG4gICAgfSBlbHNlIGlmIChkYXRhLnR5cGUgPT09ICdGZWF0dXJlJykge1xuICAgICAgICBjb252ZXJ0RmVhdHVyZShmZWF0dXJlcywgZGF0YSwgb3B0aW9ucyk7XG5cbiAgICB9IGVsc2Uge1xuICAgICAgICAvLyBzaW5nbGUgZ2VvbWV0cnkgb3IgYSBnZW9tZXRyeSBjb2xsZWN0aW9uXG4gICAgICAgIGNvbnZlcnRGZWF0dXJlKGZlYXR1cmVzLCB7Z2VvbWV0cnk6IGRhdGF9LCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICByZXR1cm4gZmVhdHVyZXM7XG59XG5cbmZ1bmN0aW9uIGNvbnZlcnRGZWF0dXJlKGZlYXR1cmVzLCBnZW9qc29uLCBvcHRpb25zLCBpbmRleCkge1xuICAgIGlmICghZ2VvanNvbi5nZW9tZXRyeSkgcmV0dXJuO1xuXG4gICAgdmFyIGNvb3JkcyA9IGdlb2pzb24uZ2VvbWV0cnkuY29vcmRpbmF0ZXM7XG4gICAgdmFyIHR5cGUgPSBnZW9qc29uLmdlb21ldHJ5LnR5cGU7XG4gICAgdmFyIHRvbGVyYW5jZSA9IE1hdGgucG93KG9wdGlvbnMudG9sZXJhbmNlIC8gKCgxIDw8IG9wdGlvbnMubWF4Wm9vbSkgKiBvcHRpb25zLmV4dGVudCksIDIpO1xuICAgIHZhciBnZW9tZXRyeSA9IFtdO1xuICAgIHZhciBpZCA9IGdlb2pzb24uaWQ7XG4gICAgaWYgKG9wdGlvbnMucHJvbW90ZUlkKSB7XG4gICAgICAgIGlkID0gZ2VvanNvbi5wcm9wZXJ0aWVzW29wdGlvbnMucHJvbW90ZUlkXTtcbiAgICB9IGVsc2UgaWYgKG9wdGlvbnMuZ2VuZXJhdGVJZCkge1xuICAgICAgICBpZCA9IGluZGV4IHx8IDA7XG4gICAgfVxuICAgIGlmICh0eXBlID09PSAnUG9pbnQnKSB7XG4gICAgICAgIGNvbnZlcnRQb2ludChjb29yZHMsIGdlb21ldHJ5KTtcblxuICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gJ011bHRpUG9pbnQnKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY29vcmRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBjb252ZXJ0UG9pbnQoY29vcmRzW2ldLCBnZW9tZXRyeSk7XG4gICAgICAgIH1cblxuICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gJ0xpbmVTdHJpbmcnKSB7XG4gICAgICAgIGNvbnZlcnRMaW5lKGNvb3JkcywgZ2VvbWV0cnksIHRvbGVyYW5jZSwgZmFsc2UpO1xuXG4gICAgfSBlbHNlIGlmICh0eXBlID09PSAnTXVsdGlMaW5lU3RyaW5nJykge1xuICAgICAgICBpZiAob3B0aW9ucy5saW5lTWV0cmljcykge1xuICAgICAgICAgICAgLy8gZXhwbG9kZSBpbnRvIGxpbmVzdHJpbmdzIHRvIGJlIGFibGUgdG8gdHJhY2sgbWV0cmljc1xuICAgICAgICAgICAgZm9yIChpID0gMDsgaSA8IGNvb3Jkcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIGdlb21ldHJ5ID0gW107XG4gICAgICAgICAgICAgICAgY29udmVydExpbmUoY29vcmRzW2ldLCBnZW9tZXRyeSwgdG9sZXJhbmNlLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgZmVhdHVyZXMucHVzaChjcmVhdGVGZWF0dXJlKGlkLCAnTGluZVN0cmluZycsIGdlb21ldHJ5LCBnZW9qc29uLnByb3BlcnRpZXMpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnZlcnRMaW5lcyhjb29yZHMsIGdlb21ldHJ5LCB0b2xlcmFuY2UsIGZhbHNlKTtcbiAgICAgICAgfVxuXG4gICAgfSBlbHNlIGlmICh0eXBlID09PSAnUG9seWdvbicpIHtcbiAgICAgICAgY29udmVydExpbmVzKGNvb3JkcywgZ2VvbWV0cnksIHRvbGVyYW5jZSwgdHJ1ZSk7XG5cbiAgICB9IGVsc2UgaWYgKHR5cGUgPT09ICdNdWx0aVBvbHlnb24nKSB7XG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBjb29yZHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBwb2x5Z29uID0gW107XG4gICAgICAgICAgICBjb252ZXJ0TGluZXMoY29vcmRzW2ldLCBwb2x5Z29uLCB0b2xlcmFuY2UsIHRydWUpO1xuICAgICAgICAgICAgZ2VvbWV0cnkucHVzaChwb2x5Z29uKTtcbiAgICAgICAgfVxuICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gJ0dlb21ldHJ5Q29sbGVjdGlvbicpIHtcbiAgICAgICAgZm9yIChpID0gMDsgaSA8IGdlb2pzb24uZ2VvbWV0cnkuZ2VvbWV0cmllcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgY29udmVydEZlYXR1cmUoZmVhdHVyZXMsIHtcbiAgICAgICAgICAgICAgICBpZDogaWQsXG4gICAgICAgICAgICAgICAgZ2VvbWV0cnk6IGdlb2pzb24uZ2VvbWV0cnkuZ2VvbWV0cmllc1tpXSxcbiAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiBnZW9qc29uLnByb3BlcnRpZXNcbiAgICAgICAgICAgIH0sIG9wdGlvbnMsIGluZGV4KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm47XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnB1dCBkYXRhIGlzIG5vdCBhIHZhbGlkIEdlb0pTT04gb2JqZWN0LicpO1xuICAgIH1cblxuICAgIGZlYXR1cmVzLnB1c2goY3JlYXRlRmVhdHVyZShpZCwgdHlwZSwgZ2VvbWV0cnksIGdlb2pzb24ucHJvcGVydGllcykpO1xufVxuXG5mdW5jdGlvbiBjb252ZXJ0UG9pbnQoY29vcmRzLCBvdXQpIHtcbiAgICBvdXQucHVzaChwcm9qZWN0WChjb29yZHNbMF0pKTtcbiAgICBvdXQucHVzaChwcm9qZWN0WShjb29yZHNbMV0pKTtcbiAgICBvdXQucHVzaCgwKTtcbn1cblxuZnVuY3Rpb24gY29udmVydExpbmUocmluZywgb3V0LCB0b2xlcmFuY2UsIGlzUG9seWdvbikge1xuICAgIHZhciB4MCwgeTA7XG4gICAgdmFyIHNpemUgPSAwO1xuXG4gICAgZm9yICh2YXIgaiA9IDA7IGogPCByaW5nLmxlbmd0aDsgaisrKSB7XG4gICAgICAgIHZhciB4ID0gcHJvamVjdFgocmluZ1tqXVswXSk7XG4gICAgICAgIHZhciB5ID0gcHJvamVjdFkocmluZ1tqXVsxXSk7XG5cbiAgICAgICAgb3V0LnB1c2goeCk7XG4gICAgICAgIG91dC5wdXNoKHkpO1xuICAgICAgICBvdXQucHVzaCgwKTtcblxuICAgICAgICBpZiAoaiA+IDApIHtcbiAgICAgICAgICAgIGlmIChpc1BvbHlnb24pIHtcbiAgICAgICAgICAgICAgICBzaXplICs9ICh4MCAqIHkgLSB4ICogeTApIC8gMjsgLy8gYXJlYVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBzaXplICs9IE1hdGguc3FydChNYXRoLnBvdyh4IC0geDAsIDIpICsgTWF0aC5wb3coeSAtIHkwLCAyKSk7IC8vIGxlbmd0aFxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHgwID0geDtcbiAgICAgICAgeTAgPSB5O1xuICAgIH1cblxuICAgIHZhciBsYXN0ID0gb3V0Lmxlbmd0aCAtIDM7XG4gICAgb3V0WzJdID0gMTtcbiAgICBzaW1wbGlmeShvdXQsIDAsIGxhc3QsIHRvbGVyYW5jZSk7XG4gICAgb3V0W2xhc3QgKyAyXSA9IDE7XG5cbiAgICBvdXQuc2l6ZSA9IE1hdGguYWJzKHNpemUpO1xuICAgIG91dC5zdGFydCA9IDA7XG4gICAgb3V0LmVuZCA9IG91dC5zaXplO1xufVxuXG5mdW5jdGlvbiBjb252ZXJ0TGluZXMocmluZ3MsIG91dCwgdG9sZXJhbmNlLCBpc1BvbHlnb24pIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHJpbmdzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBnZW9tID0gW107XG4gICAgICAgIGNvbnZlcnRMaW5lKHJpbmdzW2ldLCBnZW9tLCB0b2xlcmFuY2UsIGlzUG9seWdvbik7XG4gICAgICAgIG91dC5wdXNoKGdlb20pO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gcHJvamVjdFgoeCkge1xuICAgIHJldHVybiB4IC8gMzYwICsgMC41O1xufVxuXG5mdW5jdGlvbiBwcm9qZWN0WSh5KSB7XG4gICAgdmFyIHNpbiA9IE1hdGguc2luKHkgKiBNYXRoLlBJIC8gMTgwKTtcbiAgICB2YXIgeTIgPSAwLjUgLSAwLjI1ICogTWF0aC5sb2coKDEgKyBzaW4pIC8gKDEgLSBzaW4pKSAvIE1hdGguUEk7XG4gICAgcmV0dXJuIHkyIDwgMCA/IDAgOiB5MiA+IDEgPyAxIDogeTI7XG59XG4iLCJcbmltcG9ydCBjcmVhdGVGZWF0dXJlIGZyb20gJy4vZmVhdHVyZSc7XG5cbi8qIGNsaXAgZmVhdHVyZXMgYmV0d2VlbiB0d28gYXhpcy1wYXJhbGxlbCBsaW5lczpcbiAqICAgICB8ICAgICAgICB8XG4gKiAgX19ffF9fXyAgICAgfCAgICAgL1xuICogLyAgIHwgICBcXF9fX198X19fXy9cbiAqICAgICB8ICAgICAgICB8XG4gKi9cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gY2xpcChmZWF0dXJlcywgc2NhbGUsIGsxLCBrMiwgYXhpcywgbWluQWxsLCBtYXhBbGwsIG9wdGlvbnMpIHtcblxuICAgIGsxIC89IHNjYWxlO1xuICAgIGsyIC89IHNjYWxlO1xuXG4gICAgaWYgKG1pbkFsbCA+PSBrMSAmJiBtYXhBbGwgPCBrMikgcmV0dXJuIGZlYXR1cmVzOyAvLyB0cml2aWFsIGFjY2VwdFxuICAgIGVsc2UgaWYgKG1heEFsbCA8IGsxIHx8IG1pbkFsbCA+PSBrMikgcmV0dXJuIG51bGw7IC8vIHRyaXZpYWwgcmVqZWN0XG5cbiAgICB2YXIgY2xpcHBlZCA9IFtdO1xuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBmZWF0dXJlcy5sZW5ndGg7IGkrKykge1xuXG4gICAgICAgIHZhciBmZWF0dXJlID0gZmVhdHVyZXNbaV07XG4gICAgICAgIHZhciBnZW9tZXRyeSA9IGZlYXR1cmUuZ2VvbWV0cnk7XG4gICAgICAgIHZhciB0eXBlID0gZmVhdHVyZS50eXBlO1xuXG4gICAgICAgIHZhciBtaW4gPSBheGlzID09PSAwID8gZmVhdHVyZS5taW5YIDogZmVhdHVyZS5taW5ZO1xuICAgICAgICB2YXIgbWF4ID0gYXhpcyA9PT0gMCA/IGZlYXR1cmUubWF4WCA6IGZlYXR1cmUubWF4WTtcblxuICAgICAgICBpZiAobWluID49IGsxICYmIG1heCA8IGsyKSB7IC8vIHRyaXZpYWwgYWNjZXB0XG4gICAgICAgICAgICBjbGlwcGVkLnB1c2goZmVhdHVyZSk7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfSBlbHNlIGlmIChtYXggPCBrMSB8fCBtaW4gPj0gazIpIHsgLy8gdHJpdmlhbCByZWplY3RcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIG5ld0dlb21ldHJ5ID0gW107XG5cbiAgICAgICAgaWYgKHR5cGUgPT09ICdQb2ludCcgfHwgdHlwZSA9PT0gJ011bHRpUG9pbnQnKSB7XG4gICAgICAgICAgICBjbGlwUG9pbnRzKGdlb21ldHJ5LCBuZXdHZW9tZXRyeSwgazEsIGsyLCBheGlzKTtcblxuICAgICAgICB9IGVsc2UgaWYgKHR5cGUgPT09ICdMaW5lU3RyaW5nJykge1xuICAgICAgICAgICAgY2xpcExpbmUoZ2VvbWV0cnksIG5ld0dlb21ldHJ5LCBrMSwgazIsIGF4aXMsIGZhbHNlLCBvcHRpb25zLmxpbmVNZXRyaWNzKTtcblxuICAgICAgICB9IGVsc2UgaWYgKHR5cGUgPT09ICdNdWx0aUxpbmVTdHJpbmcnKSB7XG4gICAgICAgICAgICBjbGlwTGluZXMoZ2VvbWV0cnksIG5ld0dlb21ldHJ5LCBrMSwgazIsIGF4aXMsIGZhbHNlKTtcblxuICAgICAgICB9IGVsc2UgaWYgKHR5cGUgPT09ICdQb2x5Z29uJykge1xuICAgICAgICAgICAgY2xpcExpbmVzKGdlb21ldHJ5LCBuZXdHZW9tZXRyeSwgazEsIGsyLCBheGlzLCB0cnVlKTtcblxuICAgICAgICB9IGVsc2UgaWYgKHR5cGUgPT09ICdNdWx0aVBvbHlnb24nKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBqID0gMDsgaiA8IGdlb21ldHJ5Lmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICAgICAgdmFyIHBvbHlnb24gPSBbXTtcbiAgICAgICAgICAgICAgICBjbGlwTGluZXMoZ2VvbWV0cnlbal0sIHBvbHlnb24sIGsxLCBrMiwgYXhpcywgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgaWYgKHBvbHlnb24ubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIG5ld0dlb21ldHJ5LnB1c2gocG9seWdvbik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG5ld0dlb21ldHJ5Lmxlbmd0aCkge1xuICAgICAgICAgICAgaWYgKG9wdGlvbnMubGluZU1ldHJpY3MgJiYgdHlwZSA9PT0gJ0xpbmVTdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgZm9yIChqID0gMDsgaiA8IG5ld0dlb21ldHJ5Lmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICAgICAgICAgIGNsaXBwZWQucHVzaChjcmVhdGVGZWF0dXJlKGZlYXR1cmUuaWQsIHR5cGUsIG5ld0dlb21ldHJ5W2pdLCBmZWF0dXJlLnRhZ3MpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICh0eXBlID09PSAnTGluZVN0cmluZycgfHwgdHlwZSA9PT0gJ011bHRpTGluZVN0cmluZycpIHtcbiAgICAgICAgICAgICAgICBpZiAobmV3R2VvbWV0cnkubGVuZ3RoID09PSAxKSB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGUgPSAnTGluZVN0cmluZyc7XG4gICAgICAgICAgICAgICAgICAgIG5ld0dlb21ldHJ5ID0gbmV3R2VvbWV0cnlbMF07XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZSA9ICdNdWx0aUxpbmVTdHJpbmcnO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0eXBlID09PSAnUG9pbnQnIHx8IHR5cGUgPT09ICdNdWx0aVBvaW50Jykge1xuICAgICAgICAgICAgICAgIHR5cGUgPSBuZXdHZW9tZXRyeS5sZW5ndGggPT09IDMgPyAnUG9pbnQnIDogJ011bHRpUG9pbnQnO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjbGlwcGVkLnB1c2goY3JlYXRlRmVhdHVyZShmZWF0dXJlLmlkLCB0eXBlLCBuZXdHZW9tZXRyeSwgZmVhdHVyZS50YWdzKSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gY2xpcHBlZC5sZW5ndGggPyBjbGlwcGVkIDogbnVsbDtcbn1cblxuZnVuY3Rpb24gY2xpcFBvaW50cyhnZW9tLCBuZXdHZW9tLCBrMSwgazIsIGF4aXMpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGdlb20ubGVuZ3RoOyBpICs9IDMpIHtcbiAgICAgICAgdmFyIGEgPSBnZW9tW2kgKyBheGlzXTtcblxuICAgICAgICBpZiAoYSA+PSBrMSAmJiBhIDw9IGsyKSB7XG4gICAgICAgICAgICBuZXdHZW9tLnB1c2goZ2VvbVtpXSk7XG4gICAgICAgICAgICBuZXdHZW9tLnB1c2goZ2VvbVtpICsgMV0pO1xuICAgICAgICAgICAgbmV3R2VvbS5wdXNoKGdlb21baSArIDJdKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuZnVuY3Rpb24gY2xpcExpbmUoZ2VvbSwgbmV3R2VvbSwgazEsIGsyLCBheGlzLCBpc1BvbHlnb24sIHRyYWNrTWV0cmljcykge1xuXG4gICAgdmFyIHNsaWNlID0gbmV3U2xpY2UoZ2VvbSk7XG4gICAgdmFyIGludGVyc2VjdCA9IGF4aXMgPT09IDAgPyBpbnRlcnNlY3RYIDogaW50ZXJzZWN0WTtcbiAgICB2YXIgbGVuID0gZ2VvbS5zdGFydDtcbiAgICB2YXIgc2VnTGVuLCB0O1xuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBnZW9tLmxlbmd0aCAtIDM7IGkgKz0gMykge1xuICAgICAgICB2YXIgYXggPSBnZW9tW2ldO1xuICAgICAgICB2YXIgYXkgPSBnZW9tW2kgKyAxXTtcbiAgICAgICAgdmFyIGF6ID0gZ2VvbVtpICsgMl07XG4gICAgICAgIHZhciBieCA9IGdlb21baSArIDNdO1xuICAgICAgICB2YXIgYnkgPSBnZW9tW2kgKyA0XTtcbiAgICAgICAgdmFyIGEgPSBheGlzID09PSAwID8gYXggOiBheTtcbiAgICAgICAgdmFyIGIgPSBheGlzID09PSAwID8gYnggOiBieTtcbiAgICAgICAgdmFyIGV4aXRlZCA9IGZhbHNlO1xuXG4gICAgICAgIGlmICh0cmFja01ldHJpY3MpIHNlZ0xlbiA9IE1hdGguc3FydChNYXRoLnBvdyhheCAtIGJ4LCAyKSArIE1hdGgucG93KGF5IC0gYnksIDIpKTtcblxuICAgICAgICBpZiAoYSA8IGsxKSB7XG4gICAgICAgICAgICAvLyAtLS18LS0+ICB8IChsaW5lIGVudGVycyB0aGUgY2xpcCByZWdpb24gZnJvbSB0aGUgbGVmdClcbiAgICAgICAgICAgIGlmIChiID49IGsxKSB7XG4gICAgICAgICAgICAgICAgdCA9IGludGVyc2VjdChzbGljZSwgYXgsIGF5LCBieCwgYnksIGsxKTtcbiAgICAgICAgICAgICAgICBpZiAodHJhY2tNZXRyaWNzKSBzbGljZS5zdGFydCA9IGxlbiArIHNlZ0xlbiAqIHQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoYSA+PSBrMikge1xuICAgICAgICAgICAgLy8gfCAgPC0tfC0tLSAobGluZSBlbnRlcnMgdGhlIGNsaXAgcmVnaW9uIGZyb20gdGhlIHJpZ2h0KVxuICAgICAgICAgICAgaWYgKGIgPCBrMikge1xuICAgICAgICAgICAgICAgIHQgPSBpbnRlcnNlY3Qoc2xpY2UsIGF4LCBheSwgYngsIGJ5LCBrMik7XG4gICAgICAgICAgICAgICAgaWYgKHRyYWNrTWV0cmljcykgc2xpY2Uuc3RhcnQgPSBsZW4gKyBzZWdMZW4gKiB0O1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYWRkUG9pbnQoc2xpY2UsIGF4LCBheSwgYXopO1xuICAgICAgICB9XG4gICAgICAgIGlmIChiIDwgazEgJiYgYSA+PSBrMSkge1xuICAgICAgICAgICAgLy8gPC0tfC0tLSAgfCBvciA8LS18LS0tLS18LS0tIChsaW5lIGV4aXRzIHRoZSBjbGlwIHJlZ2lvbiBvbiB0aGUgbGVmdClcbiAgICAgICAgICAgIHQgPSBpbnRlcnNlY3Qoc2xpY2UsIGF4LCBheSwgYngsIGJ5LCBrMSk7XG4gICAgICAgICAgICBleGl0ZWQgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIGlmIChiID4gazIgJiYgYSA8PSBrMikge1xuICAgICAgICAgICAgLy8gfCAgLS0tfC0tPiBvciAtLS18LS0tLS18LS0+IChsaW5lIGV4aXRzIHRoZSBjbGlwIHJlZ2lvbiBvbiB0aGUgcmlnaHQpXG4gICAgICAgICAgICB0ID0gaW50ZXJzZWN0KHNsaWNlLCBheCwgYXksIGJ4LCBieSwgazIpO1xuICAgICAgICAgICAgZXhpdGVkID0gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghaXNQb2x5Z29uICYmIGV4aXRlZCkge1xuICAgICAgICAgICAgaWYgKHRyYWNrTWV0cmljcykgc2xpY2UuZW5kID0gbGVuICsgc2VnTGVuICogdDtcbiAgICAgICAgICAgIG5ld0dlb20ucHVzaChzbGljZSk7XG4gICAgICAgICAgICBzbGljZSA9IG5ld1NsaWNlKGdlb20pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRyYWNrTWV0cmljcykgbGVuICs9IHNlZ0xlbjtcbiAgICB9XG5cbiAgICAvLyBhZGQgdGhlIGxhc3QgcG9pbnRcbiAgICB2YXIgbGFzdCA9IGdlb20ubGVuZ3RoIC0gMztcbiAgICBheCA9IGdlb21bbGFzdF07XG4gICAgYXkgPSBnZW9tW2xhc3QgKyAxXTtcbiAgICBheiA9IGdlb21bbGFzdCArIDJdO1xuICAgIGEgPSBheGlzID09PSAwID8gYXggOiBheTtcbiAgICBpZiAoYSA+PSBrMSAmJiBhIDw9IGsyKSBhZGRQb2ludChzbGljZSwgYXgsIGF5LCBheik7XG5cbiAgICAvLyBjbG9zZSB0aGUgcG9seWdvbiBpZiBpdHMgZW5kcG9pbnRzIGFyZSBub3QgdGhlIHNhbWUgYWZ0ZXIgY2xpcHBpbmdcbiAgICBsYXN0ID0gc2xpY2UubGVuZ3RoIC0gMztcbiAgICBpZiAoaXNQb2x5Z29uICYmIGxhc3QgPj0gMyAmJiAoc2xpY2VbbGFzdF0gIT09IHNsaWNlWzBdIHx8IHNsaWNlW2xhc3QgKyAxXSAhPT0gc2xpY2VbMV0pKSB7XG4gICAgICAgIGFkZFBvaW50KHNsaWNlLCBzbGljZVswXSwgc2xpY2VbMV0sIHNsaWNlWzJdKTtcbiAgICB9XG5cbiAgICAvLyBhZGQgdGhlIGZpbmFsIHNsaWNlXG4gICAgaWYgKHNsaWNlLmxlbmd0aCkge1xuICAgICAgICBuZXdHZW9tLnB1c2goc2xpY2UpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gbmV3U2xpY2UobGluZSkge1xuICAgIHZhciBzbGljZSA9IFtdO1xuICAgIHNsaWNlLnNpemUgPSBsaW5lLnNpemU7XG4gICAgc2xpY2Uuc3RhcnQgPSBsaW5lLnN0YXJ0O1xuICAgIHNsaWNlLmVuZCA9IGxpbmUuZW5kO1xuICAgIHJldHVybiBzbGljZTtcbn1cblxuZnVuY3Rpb24gY2xpcExpbmVzKGdlb20sIG5ld0dlb20sIGsxLCBrMiwgYXhpcywgaXNQb2x5Z29uKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBnZW9tLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGNsaXBMaW5lKGdlb21baV0sIG5ld0dlb20sIGsxLCBrMiwgYXhpcywgaXNQb2x5Z29uLCBmYWxzZSk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBhZGRQb2ludChvdXQsIHgsIHksIHopIHtcbiAgICBvdXQucHVzaCh4KTtcbiAgICBvdXQucHVzaCh5KTtcbiAgICBvdXQucHVzaCh6KTtcbn1cblxuZnVuY3Rpb24gaW50ZXJzZWN0WChvdXQsIGF4LCBheSwgYngsIGJ5LCB4KSB7XG4gICAgdmFyIHQgPSAoeCAtIGF4KSAvIChieCAtIGF4KTtcbiAgICBvdXQucHVzaCh4KTtcbiAgICBvdXQucHVzaChheSArIChieSAtIGF5KSAqIHQpO1xuICAgIG91dC5wdXNoKDEpO1xuICAgIHJldHVybiB0O1xufVxuXG5mdW5jdGlvbiBpbnRlcnNlY3RZKG91dCwgYXgsIGF5LCBieCwgYnksIHkpIHtcbiAgICB2YXIgdCA9ICh5IC0gYXkpIC8gKGJ5IC0gYXkpO1xuICAgIG91dC5wdXNoKGF4ICsgKGJ4IC0gYXgpICogdCk7XG4gICAgb3V0LnB1c2goeSk7XG4gICAgb3V0LnB1c2goMSk7XG4gICAgcmV0dXJuIHQ7XG59XG4iLCJcbmltcG9ydCBjbGlwIGZyb20gJy4vY2xpcCc7XG5pbXBvcnQgY3JlYXRlRmVhdHVyZSBmcm9tICcuL2ZlYXR1cmUnO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiB3cmFwKGZlYXR1cmVzLCBvcHRpb25zKSB7XG4gICAgdmFyIGJ1ZmZlciA9IG9wdGlvbnMuYnVmZmVyIC8gb3B0aW9ucy5leHRlbnQ7XG4gICAgdmFyIG1lcmdlZCA9IGZlYXR1cmVzO1xuICAgIHZhciBsZWZ0ICA9IGNsaXAoZmVhdHVyZXMsIDEsIC0xIC0gYnVmZmVyLCBidWZmZXIsICAgICAwLCAtMSwgMiwgb3B0aW9ucyk7IC8vIGxlZnQgd29ybGQgY29weVxuICAgIHZhciByaWdodCA9IGNsaXAoZmVhdHVyZXMsIDEsICAxIC0gYnVmZmVyLCAyICsgYnVmZmVyLCAwLCAtMSwgMiwgb3B0aW9ucyk7IC8vIHJpZ2h0IHdvcmxkIGNvcHlcblxuICAgIGlmIChsZWZ0IHx8IHJpZ2h0KSB7XG4gICAgICAgIG1lcmdlZCA9IGNsaXAoZmVhdHVyZXMsIDEsIC1idWZmZXIsIDEgKyBidWZmZXIsIDAsIC0xLCAyLCBvcHRpb25zKSB8fCBbXTsgLy8gY2VudGVyIHdvcmxkIGNvcHlcblxuICAgICAgICBpZiAobGVmdCkgbWVyZ2VkID0gc2hpZnRGZWF0dXJlQ29vcmRzKGxlZnQsIDEpLmNvbmNhdChtZXJnZWQpOyAvLyBtZXJnZSBsZWZ0IGludG8gY2VudGVyXG4gICAgICAgIGlmIChyaWdodCkgbWVyZ2VkID0gbWVyZ2VkLmNvbmNhdChzaGlmdEZlYXR1cmVDb29yZHMocmlnaHQsIC0xKSk7IC8vIG1lcmdlIHJpZ2h0IGludG8gY2VudGVyXG4gICAgfVxuXG4gICAgcmV0dXJuIG1lcmdlZDtcbn1cblxuZnVuY3Rpb24gc2hpZnRGZWF0dXJlQ29vcmRzKGZlYXR1cmVzLCBvZmZzZXQpIHtcbiAgICB2YXIgbmV3RmVhdHVyZXMgPSBbXTtcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZmVhdHVyZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIGZlYXR1cmUgPSBmZWF0dXJlc1tpXSxcbiAgICAgICAgICAgIHR5cGUgPSBmZWF0dXJlLnR5cGU7XG5cbiAgICAgICAgdmFyIG5ld0dlb21ldHJ5O1xuXG4gICAgICAgIGlmICh0eXBlID09PSAnUG9pbnQnIHx8IHR5cGUgPT09ICdNdWx0aVBvaW50JyB8fCB0eXBlID09PSAnTGluZVN0cmluZycpIHtcbiAgICAgICAgICAgIG5ld0dlb21ldHJ5ID0gc2hpZnRDb29yZHMoZmVhdHVyZS5nZW9tZXRyeSwgb2Zmc2V0KTtcblxuICAgICAgICB9IGVsc2UgaWYgKHR5cGUgPT09ICdNdWx0aUxpbmVTdHJpbmcnIHx8IHR5cGUgPT09ICdQb2x5Z29uJykge1xuICAgICAgICAgICAgbmV3R2VvbWV0cnkgPSBbXTtcbiAgICAgICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgZmVhdHVyZS5nZW9tZXRyeS5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgICAgIG5ld0dlb21ldHJ5LnB1c2goc2hpZnRDb29yZHMoZmVhdHVyZS5nZW9tZXRyeVtqXSwgb2Zmc2V0KSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gJ011bHRpUG9seWdvbicpIHtcbiAgICAgICAgICAgIG5ld0dlb21ldHJ5ID0gW107XG4gICAgICAgICAgICBmb3IgKGogPSAwOyBqIDwgZmVhdHVyZS5nZW9tZXRyeS5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgICAgIHZhciBuZXdQb2x5Z29uID0gW107XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgayA9IDA7IGsgPCBmZWF0dXJlLmdlb21ldHJ5W2pdLmxlbmd0aDsgaysrKSB7XG4gICAgICAgICAgICAgICAgICAgIG5ld1BvbHlnb24ucHVzaChzaGlmdENvb3JkcyhmZWF0dXJlLmdlb21ldHJ5W2pdW2tdLCBvZmZzZXQpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgbmV3R2VvbWV0cnkucHVzaChuZXdQb2x5Z29uKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIG5ld0ZlYXR1cmVzLnB1c2goY3JlYXRlRmVhdHVyZShmZWF0dXJlLmlkLCB0eXBlLCBuZXdHZW9tZXRyeSwgZmVhdHVyZS50YWdzKSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIG5ld0ZlYXR1cmVzO1xufVxuXG5mdW5jdGlvbiBzaGlmdENvb3Jkcyhwb2ludHMsIG9mZnNldCkge1xuICAgIHZhciBuZXdQb2ludHMgPSBbXTtcbiAgICBuZXdQb2ludHMuc2l6ZSA9IHBvaW50cy5zaXplO1xuXG4gICAgaWYgKHBvaW50cy5zdGFydCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIG5ld1BvaW50cy5zdGFydCA9IHBvaW50cy5zdGFydDtcbiAgICAgICAgbmV3UG9pbnRzLmVuZCA9IHBvaW50cy5lbmQ7XG4gICAgfVxuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwb2ludHMubGVuZ3RoOyBpICs9IDMpIHtcbiAgICAgICAgbmV3UG9pbnRzLnB1c2gocG9pbnRzW2ldICsgb2Zmc2V0LCBwb2ludHNbaSArIDFdLCBwb2ludHNbaSArIDJdKTtcbiAgICB9XG4gICAgcmV0dXJuIG5ld1BvaW50cztcbn1cbiIsIlxuLy8gVHJhbnNmb3JtcyB0aGUgY29vcmRpbmF0ZXMgb2YgZWFjaCBmZWF0dXJlIGluIHRoZSBnaXZlbiB0aWxlIGZyb21cbi8vIG1lcmNhdG9yLXByb2plY3RlZCBzcGFjZSBpbnRvIChleHRlbnQgeCBleHRlbnQpIHRpbGUgc3BhY2UuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiB0cmFuc2Zvcm1UaWxlKHRpbGUsIGV4dGVudCkge1xuICAgIGlmICh0aWxlLnRyYW5zZm9ybWVkKSByZXR1cm4gdGlsZTtcblxuICAgIHZhciB6MiA9IDEgPDwgdGlsZS56LFxuICAgICAgICB0eCA9IHRpbGUueCxcbiAgICAgICAgdHkgPSB0aWxlLnksXG4gICAgICAgIGksIGosIGs7XG5cbiAgICBmb3IgKGkgPSAwOyBpIDwgdGlsZS5mZWF0dXJlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgZmVhdHVyZSA9IHRpbGUuZmVhdHVyZXNbaV0sXG4gICAgICAgICAgICBnZW9tID0gZmVhdHVyZS5nZW9tZXRyeSxcbiAgICAgICAgICAgIHR5cGUgPSBmZWF0dXJlLnR5cGU7XG5cbiAgICAgICAgZmVhdHVyZS5nZW9tZXRyeSA9IFtdO1xuXG4gICAgICAgIGlmICh0eXBlID09PSAxKSB7XG4gICAgICAgICAgICBmb3IgKGogPSAwOyBqIDwgZ2VvbS5sZW5ndGg7IGogKz0gMikge1xuICAgICAgICAgICAgICAgIGZlYXR1cmUuZ2VvbWV0cnkucHVzaCh0cmFuc2Zvcm1Qb2ludChnZW9tW2pdLCBnZW9tW2ogKyAxXSwgZXh0ZW50LCB6MiwgdHgsIHR5KSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBmb3IgKGogPSAwOyBqIDwgZ2VvbS5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgICAgIHZhciByaW5nID0gW107XG4gICAgICAgICAgICAgICAgZm9yIChrID0gMDsgayA8IGdlb21bal0ubGVuZ3RoOyBrICs9IDIpIHtcbiAgICAgICAgICAgICAgICAgICAgcmluZy5wdXNoKHRyYW5zZm9ybVBvaW50KGdlb21bal1ba10sIGdlb21bal1bayArIDFdLCBleHRlbnQsIHoyLCB0eCwgdHkpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZmVhdHVyZS5nZW9tZXRyeS5wdXNoKHJpbmcpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgdGlsZS50cmFuc2Zvcm1lZCA9IHRydWU7XG5cbiAgICByZXR1cm4gdGlsZTtcbn1cblxuZnVuY3Rpb24gdHJhbnNmb3JtUG9pbnQoeCwgeSwgZXh0ZW50LCB6MiwgdHgsIHR5KSB7XG4gICAgcmV0dXJuIFtcbiAgICAgICAgTWF0aC5yb3VuZChleHRlbnQgKiAoeCAqIHoyIC0gdHgpKSxcbiAgICAgICAgTWF0aC5yb3VuZChleHRlbnQgKiAoeSAqIHoyIC0gdHkpKV07XG59XG4iLCJcbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGNyZWF0ZVRpbGUoZmVhdHVyZXMsIHosIHR4LCB0eSwgb3B0aW9ucykge1xuICAgIHZhciB0b2xlcmFuY2UgPSB6ID09PSBvcHRpb25zLm1heFpvb20gPyAwIDogb3B0aW9ucy50b2xlcmFuY2UgLyAoKDEgPDwgeikgKiBvcHRpb25zLmV4dGVudCk7XG4gICAgdmFyIHRpbGUgPSB7XG4gICAgICAgIGZlYXR1cmVzOiBbXSxcbiAgICAgICAgbnVtUG9pbnRzOiAwLFxuICAgICAgICBudW1TaW1wbGlmaWVkOiAwLFxuICAgICAgICBudW1GZWF0dXJlczogMCxcbiAgICAgICAgc291cmNlOiBudWxsLFxuICAgICAgICB4OiB0eCxcbiAgICAgICAgeTogdHksXG4gICAgICAgIHo6IHosXG4gICAgICAgIHRyYW5zZm9ybWVkOiBmYWxzZSxcbiAgICAgICAgbWluWDogMixcbiAgICAgICAgbWluWTogMSxcbiAgICAgICAgbWF4WDogLTEsXG4gICAgICAgIG1heFk6IDBcbiAgICB9O1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZmVhdHVyZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdGlsZS5udW1GZWF0dXJlcysrO1xuICAgICAgICBhZGRGZWF0dXJlKHRpbGUsIGZlYXR1cmVzW2ldLCB0b2xlcmFuY2UsIG9wdGlvbnMpO1xuXG4gICAgICAgIHZhciBtaW5YID0gZmVhdHVyZXNbaV0ubWluWDtcbiAgICAgICAgdmFyIG1pblkgPSBmZWF0dXJlc1tpXS5taW5ZO1xuICAgICAgICB2YXIgbWF4WCA9IGZlYXR1cmVzW2ldLm1heFg7XG4gICAgICAgIHZhciBtYXhZID0gZmVhdHVyZXNbaV0ubWF4WTtcblxuICAgICAgICBpZiAobWluWCA8IHRpbGUubWluWCkgdGlsZS5taW5YID0gbWluWDtcbiAgICAgICAgaWYgKG1pblkgPCB0aWxlLm1pblkpIHRpbGUubWluWSA9IG1pblk7XG4gICAgICAgIGlmIChtYXhYID4gdGlsZS5tYXhYKSB0aWxlLm1heFggPSBtYXhYO1xuICAgICAgICBpZiAobWF4WSA+IHRpbGUubWF4WSkgdGlsZS5tYXhZID0gbWF4WTtcbiAgICB9XG4gICAgcmV0dXJuIHRpbGU7XG59XG5cbmZ1bmN0aW9uIGFkZEZlYXR1cmUodGlsZSwgZmVhdHVyZSwgdG9sZXJhbmNlLCBvcHRpb25zKSB7XG5cbiAgICB2YXIgZ2VvbSA9IGZlYXR1cmUuZ2VvbWV0cnksXG4gICAgICAgIHR5cGUgPSBmZWF0dXJlLnR5cGUsXG4gICAgICAgIHNpbXBsaWZpZWQgPSBbXTtcblxuICAgIGlmICh0eXBlID09PSAnUG9pbnQnIHx8IHR5cGUgPT09ICdNdWx0aVBvaW50Jykge1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGdlb20ubGVuZ3RoOyBpICs9IDMpIHtcbiAgICAgICAgICAgIHNpbXBsaWZpZWQucHVzaChnZW9tW2ldKTtcbiAgICAgICAgICAgIHNpbXBsaWZpZWQucHVzaChnZW9tW2kgKyAxXSk7XG4gICAgICAgICAgICB0aWxlLm51bVBvaW50cysrO1xuICAgICAgICAgICAgdGlsZS5udW1TaW1wbGlmaWVkKys7XG4gICAgICAgIH1cblxuICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gJ0xpbmVTdHJpbmcnKSB7XG4gICAgICAgIGFkZExpbmUoc2ltcGxpZmllZCwgZ2VvbSwgdGlsZSwgdG9sZXJhbmNlLCBmYWxzZSwgZmFsc2UpO1xuXG4gICAgfSBlbHNlIGlmICh0eXBlID09PSAnTXVsdGlMaW5lU3RyaW5nJyB8fCB0eXBlID09PSAnUG9seWdvbicpIHtcbiAgICAgICAgZm9yIChpID0gMDsgaSA8IGdlb20ubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGFkZExpbmUoc2ltcGxpZmllZCwgZ2VvbVtpXSwgdGlsZSwgdG9sZXJhbmNlLCB0eXBlID09PSAnUG9seWdvbicsIGkgPT09IDApO1xuICAgICAgICB9XG5cbiAgICB9IGVsc2UgaWYgKHR5cGUgPT09ICdNdWx0aVBvbHlnb24nKSB7XG5cbiAgICAgICAgZm9yICh2YXIgayA9IDA7IGsgPCBnZW9tLmxlbmd0aDsgaysrKSB7XG4gICAgICAgICAgICB2YXIgcG9seWdvbiA9IGdlb21ba107XG4gICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwgcG9seWdvbi5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIGFkZExpbmUoc2ltcGxpZmllZCwgcG9seWdvbltpXSwgdGlsZSwgdG9sZXJhbmNlLCB0cnVlLCBpID09PSAwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGlmIChzaW1wbGlmaWVkLmxlbmd0aCkge1xuICAgICAgICB2YXIgdGFncyA9IGZlYXR1cmUudGFncyB8fCBudWxsO1xuICAgICAgICBpZiAodHlwZSA9PT0gJ0xpbmVTdHJpbmcnICYmIG9wdGlvbnMubGluZU1ldHJpY3MpIHtcbiAgICAgICAgICAgIHRhZ3MgPSB7fTtcbiAgICAgICAgICAgIGZvciAodmFyIGtleSBpbiBmZWF0dXJlLnRhZ3MpIHRhZ3Nba2V5XSA9IGZlYXR1cmUudGFnc1trZXldO1xuICAgICAgICAgICAgdGFnc1snbWFwYm94X2NsaXBfc3RhcnQnXSA9IGdlb20uc3RhcnQgLyBnZW9tLnNpemU7XG4gICAgICAgICAgICB0YWdzWydtYXBib3hfY2xpcF9lbmQnXSA9IGdlb20uZW5kIC8gZ2VvbS5zaXplO1xuICAgICAgICB9XG4gICAgICAgIHZhciB0aWxlRmVhdHVyZSA9IHtcbiAgICAgICAgICAgIGdlb21ldHJ5OiBzaW1wbGlmaWVkLFxuICAgICAgICAgICAgdHlwZTogdHlwZSA9PT0gJ1BvbHlnb24nIHx8IHR5cGUgPT09ICdNdWx0aVBvbHlnb24nID8gMyA6XG4gICAgICAgICAgICAgICAgdHlwZSA9PT0gJ0xpbmVTdHJpbmcnIHx8IHR5cGUgPT09ICdNdWx0aUxpbmVTdHJpbmcnID8gMiA6IDEsXG4gICAgICAgICAgICB0YWdzOiB0YWdzXG4gICAgICAgIH07XG4gICAgICAgIGlmIChmZWF0dXJlLmlkICE9PSBudWxsKSB7XG4gICAgICAgICAgICB0aWxlRmVhdHVyZS5pZCA9IGZlYXR1cmUuaWQ7XG4gICAgICAgIH1cbiAgICAgICAgdGlsZS5mZWF0dXJlcy5wdXNoKHRpbGVGZWF0dXJlKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGFkZExpbmUocmVzdWx0LCBnZW9tLCB0aWxlLCB0b2xlcmFuY2UsIGlzUG9seWdvbiwgaXNPdXRlcikge1xuICAgIHZhciBzcVRvbGVyYW5jZSA9IHRvbGVyYW5jZSAqIHRvbGVyYW5jZTtcblxuICAgIGlmICh0b2xlcmFuY2UgPiAwICYmIChnZW9tLnNpemUgPCAoaXNQb2x5Z29uID8gc3FUb2xlcmFuY2UgOiB0b2xlcmFuY2UpKSkge1xuICAgICAgICB0aWxlLm51bVBvaW50cyArPSBnZW9tLmxlbmd0aCAvIDM7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgcmluZyA9IFtdO1xuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBnZW9tLmxlbmd0aDsgaSArPSAzKSB7XG4gICAgICAgIGlmICh0b2xlcmFuY2UgPT09IDAgfHwgZ2VvbVtpICsgMl0gPiBzcVRvbGVyYW5jZSkge1xuICAgICAgICAgICAgdGlsZS5udW1TaW1wbGlmaWVkKys7XG4gICAgICAgICAgICByaW5nLnB1c2goZ2VvbVtpXSk7XG4gICAgICAgICAgICByaW5nLnB1c2goZ2VvbVtpICsgMV0pO1xuICAgICAgICB9XG4gICAgICAgIHRpbGUubnVtUG9pbnRzKys7XG4gICAgfVxuXG4gICAgaWYgKGlzUG9seWdvbikgcmV3aW5kKHJpbmcsIGlzT3V0ZXIpO1xuXG4gICAgcmVzdWx0LnB1c2gocmluZyk7XG59XG5cbmZ1bmN0aW9uIHJld2luZChyaW5nLCBjbG9ja3dpc2UpIHtcbiAgICB2YXIgYXJlYSA9IDA7XG4gICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IHJpbmcubGVuZ3RoLCBqID0gbGVuIC0gMjsgaSA8IGxlbjsgaiA9IGksIGkgKz0gMikge1xuICAgICAgICBhcmVhICs9IChyaW5nW2ldIC0gcmluZ1tqXSkgKiAocmluZ1tpICsgMV0gKyByaW5nW2ogKyAxXSk7XG4gICAgfVxuICAgIGlmIChhcmVhID4gMCA9PT0gY2xvY2t3aXNlKSB7XG4gICAgICAgIGZvciAoaSA9IDAsIGxlbiA9IHJpbmcubGVuZ3RoOyBpIDwgbGVuIC8gMjsgaSArPSAyKSB7XG4gICAgICAgICAgICB2YXIgeCA9IHJpbmdbaV07XG4gICAgICAgICAgICB2YXIgeSA9IHJpbmdbaSArIDFdO1xuICAgICAgICAgICAgcmluZ1tpXSA9IHJpbmdbbGVuIC0gMiAtIGldO1xuICAgICAgICAgICAgcmluZ1tpICsgMV0gPSByaW5nW2xlbiAtIDEgLSBpXTtcbiAgICAgICAgICAgIHJpbmdbbGVuIC0gMiAtIGldID0geDtcbiAgICAgICAgICAgIHJpbmdbbGVuIC0gMSAtIGldID0geTtcbiAgICAgICAgfVxuICAgIH1cbn1cbiIsIlxuaW1wb3J0IGNvbnZlcnQgZnJvbSAnLi9jb252ZXJ0JzsgICAgIC8vIEdlb0pTT04gY29udmVyc2lvbiBhbmQgcHJlcHJvY2Vzc2luZ1xuaW1wb3J0IGNsaXAgZnJvbSAnLi9jbGlwJzsgICAgICAgICAgIC8vIHN0cmlwZSBjbGlwcGluZyBhbGdvcml0aG1cbmltcG9ydCB3cmFwIGZyb20gJy4vd3JhcCc7ICAgICAgICAgICAvLyBkYXRlIGxpbmUgcHJvY2Vzc2luZ1xuaW1wb3J0IHRyYW5zZm9ybSBmcm9tICcuL3RyYW5zZm9ybSc7IC8vIGNvb3JkaW5hdGUgdHJhbnNmb3JtYXRpb25cbmltcG9ydCBjcmVhdGVUaWxlIGZyb20gJy4vdGlsZSc7ICAgICAvLyBmaW5hbCBzaW1wbGlmaWVkIHRpbGUgZ2VuZXJhdGlvblxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBnZW9qc29udnQoZGF0YSwgb3B0aW9ucykge1xuICAgIHJldHVybiBuZXcgR2VvSlNPTlZUKGRhdGEsIG9wdGlvbnMpO1xufVxuXG5mdW5jdGlvbiBHZW9KU09OVlQoZGF0YSwgb3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSB0aGlzLm9wdGlvbnMgPSBleHRlbmQoT2JqZWN0LmNyZWF0ZSh0aGlzLm9wdGlvbnMpLCBvcHRpb25zKTtcblxuICAgIHZhciBkZWJ1ZyA9IG9wdGlvbnMuZGVidWc7XG5cbiAgICBpZiAoZGVidWcpIGNvbnNvbGUudGltZSgncHJlcHJvY2VzcyBkYXRhJyk7XG5cbiAgICBpZiAob3B0aW9ucy5tYXhab29tIDwgMCB8fCBvcHRpb25zLm1heFpvb20gPiAyNCkgdGhyb3cgbmV3IEVycm9yKCdtYXhab29tIHNob3VsZCBiZSBpbiB0aGUgMC0yNCByYW5nZScpO1xuICAgIGlmIChvcHRpb25zLnByb21vdGVJZCAmJiBvcHRpb25zLmdlbmVyYXRlSWQpIHRocm93IG5ldyBFcnJvcigncHJvbW90ZUlkIGFuZCBnZW5lcmF0ZUlkIGNhbm5vdCBiZSB1c2VkIHRvZ2V0aGVyLicpO1xuXG4gICAgdmFyIGZlYXR1cmVzID0gY29udmVydChkYXRhLCBvcHRpb25zKTtcblxuICAgIHRoaXMudGlsZXMgPSB7fTtcbiAgICB0aGlzLnRpbGVDb29yZHMgPSBbXTtcblxuICAgIGlmIChkZWJ1Zykge1xuICAgICAgICBjb25zb2xlLnRpbWVFbmQoJ3ByZXByb2Nlc3MgZGF0YScpO1xuICAgICAgICBjb25zb2xlLmxvZygnaW5kZXg6IG1heFpvb206ICVkLCBtYXhQb2ludHM6ICVkJywgb3B0aW9ucy5pbmRleE1heFpvb20sIG9wdGlvbnMuaW5kZXhNYXhQb2ludHMpO1xuICAgICAgICBjb25zb2xlLnRpbWUoJ2dlbmVyYXRlIHRpbGVzJyk7XG4gICAgICAgIHRoaXMuc3RhdHMgPSB7fTtcbiAgICAgICAgdGhpcy50b3RhbCA9IDA7XG4gICAgfVxuXG4gICAgZmVhdHVyZXMgPSB3cmFwKGZlYXR1cmVzLCBvcHRpb25zKTtcblxuICAgIC8vIHN0YXJ0IHNsaWNpbmcgZnJvbSB0aGUgdG9wIHRpbGUgZG93blxuICAgIGlmIChmZWF0dXJlcy5sZW5ndGgpIHRoaXMuc3BsaXRUaWxlKGZlYXR1cmVzLCAwLCAwLCAwKTtcblxuICAgIGlmIChkZWJ1Zykge1xuICAgICAgICBpZiAoZmVhdHVyZXMubGVuZ3RoKSBjb25zb2xlLmxvZygnZmVhdHVyZXM6ICVkLCBwb2ludHM6ICVkJywgdGhpcy50aWxlc1swXS5udW1GZWF0dXJlcywgdGhpcy50aWxlc1swXS5udW1Qb2ludHMpO1xuICAgICAgICBjb25zb2xlLnRpbWVFbmQoJ2dlbmVyYXRlIHRpbGVzJyk7XG4gICAgICAgIGNvbnNvbGUubG9nKCd0aWxlcyBnZW5lcmF0ZWQ6JywgdGhpcy50b3RhbCwgSlNPTi5zdHJpbmdpZnkodGhpcy5zdGF0cykpO1xuICAgIH1cbn1cblxuR2VvSlNPTlZULnByb3RvdHlwZS5vcHRpb25zID0ge1xuICAgIG1heFpvb206IDE0LCAgICAgICAgICAgIC8vIG1heCB6b29tIHRvIHByZXNlcnZlIGRldGFpbCBvblxuICAgIGluZGV4TWF4Wm9vbTogNSwgICAgICAgIC8vIG1heCB6b29tIGluIHRoZSB0aWxlIGluZGV4XG4gICAgaW5kZXhNYXhQb2ludHM6IDEwMDAwMCwgLy8gbWF4IG51bWJlciBvZiBwb2ludHMgcGVyIHRpbGUgaW4gdGhlIHRpbGUgaW5kZXhcbiAgICB0b2xlcmFuY2U6IDMsICAgICAgICAgICAvLyBzaW1wbGlmaWNhdGlvbiB0b2xlcmFuY2UgKGhpZ2hlciBtZWFucyBzaW1wbGVyKVxuICAgIGV4dGVudDogNDA5NiwgICAgICAgICAgIC8vIHRpbGUgZXh0ZW50XG4gICAgYnVmZmVyOiA2NCwgICAgICAgICAgICAgLy8gdGlsZSBidWZmZXIgb24gZWFjaCBzaWRlXG4gICAgbGluZU1ldHJpY3M6IGZhbHNlLCAgICAgLy8gd2hldGhlciB0byBjYWxjdWxhdGUgbGluZSBtZXRyaWNzXG4gICAgcHJvbW90ZUlkOiBudWxsLCAgICAgICAgLy8gbmFtZSBvZiBhIGZlYXR1cmUgcHJvcGVydHkgdG8gYmUgcHJvbW90ZWQgdG8gZmVhdHVyZS5pZFxuICAgIGdlbmVyYXRlSWQ6IGZhbHNlLCAgICAgIC8vIHdoZXRoZXIgdG8gZ2VuZXJhdGUgZmVhdHVyZSBpZHMuIENhbm5vdCBiZSB1c2VkIHdpdGggcHJvbW90ZUlkXG4gICAgZGVidWc6IDAgICAgICAgICAgICAgICAgLy8gbG9nZ2luZyBsZXZlbCAoMCwgMSBvciAyKVxufTtcblxuR2VvSlNPTlZULnByb3RvdHlwZS5zcGxpdFRpbGUgPSBmdW5jdGlvbiAoZmVhdHVyZXMsIHosIHgsIHksIGN6LCBjeCwgY3kpIHtcblxuICAgIHZhciBzdGFjayA9IFtmZWF0dXJlcywgeiwgeCwgeV0sXG4gICAgICAgIG9wdGlvbnMgPSB0aGlzLm9wdGlvbnMsXG4gICAgICAgIGRlYnVnID0gb3B0aW9ucy5kZWJ1ZztcblxuICAgIC8vIGF2b2lkIHJlY3Vyc2lvbiBieSB1c2luZyBhIHByb2Nlc3NpbmcgcXVldWVcbiAgICB3aGlsZSAoc3RhY2subGVuZ3RoKSB7XG4gICAgICAgIHkgPSBzdGFjay5wb3AoKTtcbiAgICAgICAgeCA9IHN0YWNrLnBvcCgpO1xuICAgICAgICB6ID0gc3RhY2sucG9wKCk7XG4gICAgICAgIGZlYXR1cmVzID0gc3RhY2sucG9wKCk7XG5cbiAgICAgICAgdmFyIHoyID0gMSA8PCB6LFxuICAgICAgICAgICAgaWQgPSB0b0lEKHosIHgsIHkpLFxuICAgICAgICAgICAgdGlsZSA9IHRoaXMudGlsZXNbaWRdO1xuXG4gICAgICAgIGlmICghdGlsZSkge1xuICAgICAgICAgICAgaWYgKGRlYnVnID4gMSkgY29uc29sZS50aW1lKCdjcmVhdGlvbicpO1xuXG4gICAgICAgICAgICB0aWxlID0gdGhpcy50aWxlc1tpZF0gPSBjcmVhdGVUaWxlKGZlYXR1cmVzLCB6LCB4LCB5LCBvcHRpb25zKTtcbiAgICAgICAgICAgIHRoaXMudGlsZUNvb3Jkcy5wdXNoKHt6OiB6LCB4OiB4LCB5OiB5fSk7XG5cbiAgICAgICAgICAgIGlmIChkZWJ1Zykge1xuICAgICAgICAgICAgICAgIGlmIChkZWJ1ZyA+IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3RpbGUgeiVkLSVkLSVkIChmZWF0dXJlczogJWQsIHBvaW50czogJWQsIHNpbXBsaWZpZWQ6ICVkKScsXG4gICAgICAgICAgICAgICAgICAgICAgICB6LCB4LCB5LCB0aWxlLm51bUZlYXR1cmVzLCB0aWxlLm51bVBvaW50cywgdGlsZS5udW1TaW1wbGlmaWVkKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS50aW1lRW5kKCdjcmVhdGlvbicpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2YXIga2V5ID0gJ3onICsgejtcbiAgICAgICAgICAgICAgICB0aGlzLnN0YXRzW2tleV0gPSAodGhpcy5zdGF0c1trZXldIHx8IDApICsgMTtcbiAgICAgICAgICAgICAgICB0aGlzLnRvdGFsKys7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBzYXZlIHJlZmVyZW5jZSB0byBvcmlnaW5hbCBnZW9tZXRyeSBpbiB0aWxlIHNvIHRoYXQgd2UgY2FuIGRyaWxsIGRvd24gbGF0ZXIgaWYgd2Ugc3RvcCBub3dcbiAgICAgICAgdGlsZS5zb3VyY2UgPSBmZWF0dXJlcztcblxuICAgICAgICAvLyBpZiBpdCdzIHRoZSBmaXJzdC1wYXNzIHRpbGluZ1xuICAgICAgICBpZiAoIWN6KSB7XG4gICAgICAgICAgICAvLyBzdG9wIHRpbGluZyBpZiB3ZSByZWFjaGVkIG1heCB6b29tLCBvciBpZiB0aGUgdGlsZSBpcyB0b28gc2ltcGxlXG4gICAgICAgICAgICBpZiAoeiA9PT0gb3B0aW9ucy5pbmRleE1heFpvb20gfHwgdGlsZS5udW1Qb2ludHMgPD0gb3B0aW9ucy5pbmRleE1heFBvaW50cykgY29udGludWU7XG5cbiAgICAgICAgLy8gaWYgYSBkcmlsbGRvd24gdG8gYSBzcGVjaWZpYyB0aWxlXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBzdG9wIHRpbGluZyBpZiB3ZSByZWFjaGVkIGJhc2Ugem9vbSBvciBvdXIgdGFyZ2V0IHRpbGUgem9vbVxuICAgICAgICAgICAgaWYgKHogPT09IG9wdGlvbnMubWF4Wm9vbSB8fCB6ID09PSBjeikgY29udGludWU7XG5cbiAgICAgICAgICAgIC8vIHN0b3AgdGlsaW5nIGlmIGl0J3Mgbm90IGFuIGFuY2VzdG9yIG9mIHRoZSB0YXJnZXQgdGlsZVxuICAgICAgICAgICAgdmFyIG0gPSAxIDw8IChjeiAtIHopO1xuICAgICAgICAgICAgaWYgKHggIT09IE1hdGguZmxvb3IoY3ggLyBtKSB8fCB5ICE9PSBNYXRoLmZsb29yKGN5IC8gbSkpIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gaWYgd2Ugc2xpY2UgZnVydGhlciBkb3duLCBubyBuZWVkIHRvIGtlZXAgc291cmNlIGdlb21ldHJ5XG4gICAgICAgIHRpbGUuc291cmNlID0gbnVsbDtcblxuICAgICAgICBpZiAoZmVhdHVyZXMubGVuZ3RoID09PSAwKSBjb250aW51ZTtcblxuICAgICAgICBpZiAoZGVidWcgPiAxKSBjb25zb2xlLnRpbWUoJ2NsaXBwaW5nJyk7XG5cbiAgICAgICAgLy8gdmFsdWVzIHdlJ2xsIHVzZSBmb3IgY2xpcHBpbmdcbiAgICAgICAgdmFyIGsxID0gMC41ICogb3B0aW9ucy5idWZmZXIgLyBvcHRpb25zLmV4dGVudCxcbiAgICAgICAgICAgIGsyID0gMC41IC0gazEsXG4gICAgICAgICAgICBrMyA9IDAuNSArIGsxLFxuICAgICAgICAgICAgazQgPSAxICsgazEsXG4gICAgICAgICAgICB0bCwgYmwsIHRyLCBiciwgbGVmdCwgcmlnaHQ7XG5cbiAgICAgICAgdGwgPSBibCA9IHRyID0gYnIgPSBudWxsO1xuXG4gICAgICAgIGxlZnQgID0gY2xpcChmZWF0dXJlcywgejIsIHggLSBrMSwgeCArIGszLCAwLCB0aWxlLm1pblgsIHRpbGUubWF4WCwgb3B0aW9ucyk7XG4gICAgICAgIHJpZ2h0ID0gY2xpcChmZWF0dXJlcywgejIsIHggKyBrMiwgeCArIGs0LCAwLCB0aWxlLm1pblgsIHRpbGUubWF4WCwgb3B0aW9ucyk7XG4gICAgICAgIGZlYXR1cmVzID0gbnVsbDtcblxuICAgICAgICBpZiAobGVmdCkge1xuICAgICAgICAgICAgdGwgPSBjbGlwKGxlZnQsIHoyLCB5IC0gazEsIHkgKyBrMywgMSwgdGlsZS5taW5ZLCB0aWxlLm1heFksIG9wdGlvbnMpO1xuICAgICAgICAgICAgYmwgPSBjbGlwKGxlZnQsIHoyLCB5ICsgazIsIHkgKyBrNCwgMSwgdGlsZS5taW5ZLCB0aWxlLm1heFksIG9wdGlvbnMpO1xuICAgICAgICAgICAgbGVmdCA9IG51bGw7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAocmlnaHQpIHtcbiAgICAgICAgICAgIHRyID0gY2xpcChyaWdodCwgejIsIHkgLSBrMSwgeSArIGszLCAxLCB0aWxlLm1pblksIHRpbGUubWF4WSwgb3B0aW9ucyk7XG4gICAgICAgICAgICBiciA9IGNsaXAocmlnaHQsIHoyLCB5ICsgazIsIHkgKyBrNCwgMSwgdGlsZS5taW5ZLCB0aWxlLm1heFksIG9wdGlvbnMpO1xuICAgICAgICAgICAgcmlnaHQgPSBudWxsO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGRlYnVnID4gMSkgY29uc29sZS50aW1lRW5kKCdjbGlwcGluZycpO1xuXG4gICAgICAgIHN0YWNrLnB1c2godGwgfHwgW10sIHogKyAxLCB4ICogMiwgICAgIHkgKiAyKTtcbiAgICAgICAgc3RhY2sucHVzaChibCB8fCBbXSwgeiArIDEsIHggKiAyLCAgICAgeSAqIDIgKyAxKTtcbiAgICAgICAgc3RhY2sucHVzaCh0ciB8fCBbXSwgeiArIDEsIHggKiAyICsgMSwgeSAqIDIpO1xuICAgICAgICBzdGFjay5wdXNoKGJyIHx8IFtdLCB6ICsgMSwgeCAqIDIgKyAxLCB5ICogMiArIDEpO1xuICAgIH1cbn07XG5cbkdlb0pTT05WVC5wcm90b3R5cGUuZ2V0VGlsZSA9IGZ1bmN0aW9uICh6LCB4LCB5KSB7XG4gICAgdmFyIG9wdGlvbnMgPSB0aGlzLm9wdGlvbnMsXG4gICAgICAgIGV4dGVudCA9IG9wdGlvbnMuZXh0ZW50LFxuICAgICAgICBkZWJ1ZyA9IG9wdGlvbnMuZGVidWc7XG5cbiAgICBpZiAoeiA8IDAgfHwgeiA+IDI0KSByZXR1cm4gbnVsbDtcblxuICAgIHZhciB6MiA9IDEgPDwgejtcbiAgICB4ID0gKCh4ICUgejIpICsgejIpICUgejI7IC8vIHdyYXAgdGlsZSB4IGNvb3JkaW5hdGVcblxuICAgIHZhciBpZCA9IHRvSUQoeiwgeCwgeSk7XG4gICAgaWYgKHRoaXMudGlsZXNbaWRdKSByZXR1cm4gdHJhbnNmb3JtKHRoaXMudGlsZXNbaWRdLCBleHRlbnQpO1xuXG4gICAgaWYgKGRlYnVnID4gMSkgY29uc29sZS5sb2coJ2RyaWxsaW5nIGRvd24gdG8geiVkLSVkLSVkJywgeiwgeCwgeSk7XG5cbiAgICB2YXIgejAgPSB6LFxuICAgICAgICB4MCA9IHgsXG4gICAgICAgIHkwID0geSxcbiAgICAgICAgcGFyZW50O1xuXG4gICAgd2hpbGUgKCFwYXJlbnQgJiYgejAgPiAwKSB7XG4gICAgICAgIHowLS07XG4gICAgICAgIHgwID0gTWF0aC5mbG9vcih4MCAvIDIpO1xuICAgICAgICB5MCA9IE1hdGguZmxvb3IoeTAgLyAyKTtcbiAgICAgICAgcGFyZW50ID0gdGhpcy50aWxlc1t0b0lEKHowLCB4MCwgeTApXTtcbiAgICB9XG5cbiAgICBpZiAoIXBhcmVudCB8fCAhcGFyZW50LnNvdXJjZSkgcmV0dXJuIG51bGw7XG5cbiAgICAvLyBpZiB3ZSBmb3VuZCBhIHBhcmVudCB0aWxlIGNvbnRhaW5pbmcgdGhlIG9yaWdpbmFsIGdlb21ldHJ5LCB3ZSBjYW4gZHJpbGwgZG93biBmcm9tIGl0XG4gICAgaWYgKGRlYnVnID4gMSkgY29uc29sZS5sb2coJ2ZvdW5kIHBhcmVudCB0aWxlIHolZC0lZC0lZCcsIHowLCB4MCwgeTApO1xuXG4gICAgaWYgKGRlYnVnID4gMSkgY29uc29sZS50aW1lKCdkcmlsbGluZyBkb3duJyk7XG4gICAgdGhpcy5zcGxpdFRpbGUocGFyZW50LnNvdXJjZSwgejAsIHgwLCB5MCwgeiwgeCwgeSk7XG4gICAgaWYgKGRlYnVnID4gMSkgY29uc29sZS50aW1lRW5kKCdkcmlsbGluZyBkb3duJyk7XG5cbiAgICByZXR1cm4gdGhpcy50aWxlc1tpZF0gPyB0cmFuc2Zvcm0odGhpcy50aWxlc1tpZF0sIGV4dGVudCkgOiBudWxsO1xufTtcblxuZnVuY3Rpb24gdG9JRCh6LCB4LCB5KSB7XG4gICAgcmV0dXJuICgoKDEgPDwgeikgKiB5ICsgeCkgKiAzMikgKyB6O1xufVxuXG5mdW5jdGlvbiBleHRlbmQoZGVzdCwgc3JjKSB7XG4gICAgZm9yICh2YXIgaSBpbiBzcmMpIGRlc3RbaV0gPSBzcmNbaV07XG4gICAgcmV0dXJuIGRlc3Q7XG59XG4iLCIvLyBAZmxvd1xuXG5pbXBvcnQgeyBnZXRKU09OIH0gZnJvbSAnLi4vdXRpbC9hamF4JztcblxuaW1wb3J0IHBlcmZvcm1hbmNlIGZyb20gJy4uL3V0aWwvcGVyZm9ybWFuY2UnO1xuaW1wb3J0IHJld2luZCBmcm9tICdnZW9qc29uLXJld2luZCc7XG5pbXBvcnQgR2VvSlNPTldyYXBwZXIgZnJvbSAnLi9nZW9qc29uX3dyYXBwZXInO1xuaW1wb3J0IHZ0cGJmIGZyb20gJ3Z0LXBiZic7XG5pbXBvcnQgc3VwZXJjbHVzdGVyIGZyb20gJ3N1cGVyY2x1c3Rlcic7XG5pbXBvcnQgZ2VvanNvbnZ0IGZyb20gJ2dlb2pzb24tdnQnO1xuaW1wb3J0IGFzc2VydCBmcm9tICdhc3NlcnQnO1xuaW1wb3J0IFZlY3RvclRpbGVXb3JrZXJTb3VyY2UgZnJvbSAnLi92ZWN0b3JfdGlsZV93b3JrZXJfc291cmNlJztcblxuaW1wb3J0IHR5cGUge1xuICAgIFdvcmtlclRpbGVQYXJhbWV0ZXJzLFxuICAgIFdvcmtlclRpbGVDYWxsYmFjayxcbn0gZnJvbSAnLi4vc291cmNlL3dvcmtlcl9zb3VyY2UnO1xuXG5pbXBvcnQgdHlwZSBBY3RvciBmcm9tICcuLi91dGlsL2FjdG9yJztcbmltcG9ydCB0eXBlIFN0eWxlTGF5ZXJJbmRleCBmcm9tICcuLi9zdHlsZS9zdHlsZV9sYXllcl9pbmRleCc7XG5cbmltcG9ydCB0eXBlIHtMb2FkVmVjdG9yRGF0YUNhbGxiYWNrfSBmcm9tICcuL3ZlY3Rvcl90aWxlX3dvcmtlcl9zb3VyY2UnO1xuaW1wb3J0IHR5cGUgeyBSZXF1ZXN0UGFyYW1ldGVycywgUmVzcG9uc2VDYWxsYmFjayB9IGZyb20gJy4uL3V0aWwvYWpheCc7XG5pbXBvcnQgdHlwZSB7IENhbGxiYWNrIH0gZnJvbSAnLi4vdHlwZXMvY2FsbGJhY2snO1xuaW1wb3J0IHR5cGUge0dlb0pTT05GZWF0dXJlfSBmcm9tICdAbWFwYm94L2dlb2pzb24tdHlwZXMnO1xuXG5leHBvcnQgdHlwZSBMb2FkR2VvSlNPTlBhcmFtZXRlcnMgPSB7XG4gICAgcmVxdWVzdD86IFJlcXVlc3RQYXJhbWV0ZXJzLFxuICAgIGRhdGE/OiBzdHJpbmcsXG4gICAgc291cmNlOiBzdHJpbmcsXG4gICAgY2x1c3RlcjogYm9vbGVhbixcbiAgICBzdXBlcmNsdXN0ZXJPcHRpb25zPzogT2JqZWN0LFxuICAgIGdlb2pzb25WdE9wdGlvbnM/OiBPYmplY3Rcbn07XG5cbmV4cG9ydCB0eXBlIExvYWRHZW9KU09OID0gKHBhcmFtczogTG9hZEdlb0pTT05QYXJhbWV0ZXJzLCBjYWxsYmFjazogUmVzcG9uc2VDYWxsYmFjazxPYmplY3Q+KSA9PiB2b2lkO1xuXG5leHBvcnQgaW50ZXJmYWNlIEdlb0pTT05JbmRleCB7XG4gICAgZ2V0VGlsZSh6OiBudW1iZXIsIHg6IG51bWJlciwgeTogbnVtYmVyKTogT2JqZWN0O1xuXG4gICAgLy8gc3VwZXJjbHVzdGVyIG1ldGhvZHNcbiAgICBnZXRDbHVzdGVyRXhwYW5zaW9uWm9vbShjbHVzdGVySWQ6IG51bWJlcik6IG51bWJlcjtcbiAgICBnZXRDaGlsZHJlbihjbHVzdGVySWQ6IG51bWJlcik6IEFycmF5PEdlb0pTT05GZWF0dXJlPjtcbiAgICBnZXRMZWF2ZXMoY2x1c3RlcklkOiBudW1iZXIsIGxpbWl0OiBudW1iZXIsIG9mZnNldDogbnVtYmVyKTogQXJyYXk8R2VvSlNPTkZlYXR1cmU+O1xufVxuXG5mdW5jdGlvbiBsb2FkR2VvSlNPTlRpbGUocGFyYW1zOiBXb3JrZXJUaWxlUGFyYW1ldGVycywgY2FsbGJhY2s6IExvYWRWZWN0b3JEYXRhQ2FsbGJhY2spIHtcbiAgICBjb25zdCBjYW5vbmljYWwgPSBwYXJhbXMudGlsZUlELmNhbm9uaWNhbDtcblxuICAgIGlmICghdGhpcy5fZ2VvSlNPTkluZGV4KSB7XG4gICAgICAgIHJldHVybiBjYWxsYmFjayhudWxsLCBudWxsKTsgIC8vIHdlIGNvdWxkbid0IGxvYWQgdGhlIGZpbGVcbiAgICB9XG5cbiAgICBjb25zdCBnZW9KU09OVGlsZSA9IHRoaXMuX2dlb0pTT05JbmRleC5nZXRUaWxlKGNhbm9uaWNhbC56LCBjYW5vbmljYWwueCwgY2Fub25pY2FsLnkpO1xuICAgIGlmICghZ2VvSlNPTlRpbGUpIHtcbiAgICAgICAgcmV0dXJuIGNhbGxiYWNrKG51bGwsIG51bGwpOyAvLyBub3RoaW5nIGluIHRoZSBnaXZlbiB0aWxlXG4gICAgfVxuXG4gICAgY29uc3QgZ2VvanNvbldyYXBwZXIgPSBuZXcgR2VvSlNPTldyYXBwZXIoZ2VvSlNPTlRpbGUuZmVhdHVyZXMpO1xuXG4gICAgLy8gRW5jb2RlIHRoZSBnZW9qc29uLXZ0IHRpbGUgaW50byBiaW5hcnkgdmVjdG9yIHRpbGUgZm9ybS4gIFRoaXNcbiAgICAvLyBpcyBhIGNvbnZlbmllbmNlIHRoYXQgYWxsb3dzIGBGZWF0dXJlSW5kZXhgIHRvIG9wZXJhdGUgdGhlIHNhbWUgd2F5XG4gICAgLy8gYWNyb3NzIGBWZWN0b3JUaWxlU291cmNlYCBhbmQgYEdlb0pTT05Tb3VyY2VgIGRhdGEuXG4gICAgbGV0IHBiZiA9IHZ0cGJmKGdlb2pzb25XcmFwcGVyKTtcbiAgICBpZiAocGJmLmJ5dGVPZmZzZXQgIT09IDAgfHwgcGJmLmJ5dGVMZW5ndGggIT09IHBiZi5idWZmZXIuYnl0ZUxlbmd0aCkge1xuICAgICAgICAvLyBDb21wYXRpYmlsaXR5IHdpdGggbm9kZSBCdWZmZXIgKGh0dHBzOi8vZ2l0aHViLmNvbS9tYXBib3gvcGJmL2lzc3Vlcy8zNSlcbiAgICAgICAgcGJmID0gbmV3IFVpbnQ4QXJyYXkocGJmKTtcbiAgICB9XG5cbiAgICBjYWxsYmFjayhudWxsLCB7XG4gICAgICAgIHZlY3RvclRpbGU6IGdlb2pzb25XcmFwcGVyLFxuICAgICAgICByYXdEYXRhOiBwYmYuYnVmZmVyXG4gICAgfSk7XG59XG5cbmV4cG9ydCB0eXBlIFNvdXJjZVN0YXRlID1cbiAgICB8ICdJZGxlJyAgICAgICAgICAgIC8vIFNvdXJjZSBlbXB0eSBvciBkYXRhIGxvYWRlZFxuICAgIHwgJ0NvYWxlc2NpbmcnICAgICAgLy8gRGF0YSBmaW5pc2hlZCBsb2FkaW5nLCBidXQgZGlzY2FyZCAnbG9hZERhdGEnIG1lc3NhZ2VzIHVudGlsIHJlY2VpdmluZyAnY29hbGVzY2VkJ1xuICAgIHwgJ05lZWRzTG9hZERhdGEnOyAgLy8gJ2xvYWREYXRhJyByZWNlaXZlZCB3aGlsZSBjb2FsZXNjaW5nLCB0cmlnZ2VyIG9uZSBtb3JlICdsb2FkRGF0YScgb24gcmVjZWl2aW5nICdjb2FsZXNjZWQnXG5cbi8qKlxuICogVGhlIHtAbGluayBXb3JrZXJTb3VyY2V9IGltcGxlbWVudGF0aW9uIHRoYXQgc3VwcG9ydHMge0BsaW5rIEdlb0pTT05Tb3VyY2V9LlxuICogVGhpcyBjbGFzcyBpcyBkZXNpZ25lZCB0byBiZSBlYXNpbHkgcmV1c2VkIHRvIHN1cHBvcnQgY3VzdG9tIHNvdXJjZSB0eXBlc1xuICogZm9yIGRhdGEgZm9ybWF0cyB0aGF0IGNhbiBiZSBwYXJzZWQvY29udmVydGVkIGludG8gYW4gaW4tbWVtb3J5IEdlb0pTT05cbiAqIHJlcHJlc2VudGF0aW9uLiAgVG8gZG8gc28sIGNyZWF0ZSBpdCB3aXRoXG4gKiBgbmV3IEdlb0pTT05Xb3JrZXJTb3VyY2UoYWN0b3IsIGxheWVySW5kZXgsIGN1c3RvbUxvYWRHZW9KU09ORnVuY3Rpb24pYC5cbiAqIEZvciBhIGZ1bGwgZXhhbXBsZSwgc2VlIFttYXBib3gtZ2wtdG9wb2pzb25dKGh0dHBzOi8vZ2l0aHViLmNvbS9kZXZlbG9wbWVudHNlZWQvbWFwYm94LWdsLXRvcG9qc29uKS5cbiAqXG4gKiBAcHJpdmF0ZVxuICovXG5jbGFzcyBHZW9KU09OV29ya2VyU291cmNlIGV4dGVuZHMgVmVjdG9yVGlsZVdvcmtlclNvdXJjZSB7XG4gICAgbG9hZEdlb0pTT046IExvYWRHZW9KU09OO1xuICAgIF9zdGF0ZTogU291cmNlU3RhdGU7XG4gICAgX3BlbmRpbmdDYWxsYmFjazogQ2FsbGJhY2s8e1xuICAgICAgICByZXNvdXJjZVRpbWluZz86IHtbc3RyaW5nXTogQXJyYXk8UGVyZm9ybWFuY2VSZXNvdXJjZVRpbWluZz59LFxuICAgICAgICBhYmFuZG9uZWQ/OiBib29sZWFuIH0+O1xuICAgIF9wZW5kaW5nTG9hZERhdGFQYXJhbXM6IExvYWRHZW9KU09OUGFyYW1ldGVycztcbiAgICBfZ2VvSlNPTkluZGV4OiBHZW9KU09OSW5kZXhcblxuICAgIC8qKlxuICAgICAqIEBwYXJhbSBbbG9hZEdlb0pTT05dIE9wdGlvbmFsIG1ldGhvZCBmb3IgY3VzdG9tIGxvYWRpbmcvcGFyc2luZyBvZlxuICAgICAqIEdlb0pTT04gYmFzZWQgb24gcGFyYW1ldGVycyBwYXNzZWQgZnJvbSB0aGUgbWFpbi10aHJlYWQgU291cmNlLlxuICAgICAqIFNlZSB7QGxpbmsgR2VvSlNPTldvcmtlclNvdXJjZSNsb2FkR2VvSlNPTn0uXG4gICAgICovXG4gICAgY29uc3RydWN0b3IoYWN0b3I6IEFjdG9yLCBsYXllckluZGV4OiBTdHlsZUxheWVySW5kZXgsIGxvYWRHZW9KU09OOiA/TG9hZEdlb0pTT04pIHtcbiAgICAgICAgc3VwZXIoYWN0b3IsIGxheWVySW5kZXgsIGxvYWRHZW9KU09OVGlsZSk7XG4gICAgICAgIGlmIChsb2FkR2VvSlNPTikge1xuICAgICAgICAgICAgdGhpcy5sb2FkR2VvSlNPTiA9IGxvYWRHZW9KU09OO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRmV0Y2hlcyAoaWYgYXBwcm9wcmlhdGUpLCBwYXJzZXMsIGFuZCBpbmRleCBnZW9qc29uIGRhdGEgaW50byB0aWxlcy4gVGhpc1xuICAgICAqIHByZXBhcmF0b3J5IG1ldGhvZCBtdXN0IGJlIGNhbGxlZCBiZWZvcmUge0BsaW5rIEdlb0pTT05Xb3JrZXJTb3VyY2UjbG9hZFRpbGV9XG4gICAgICogY2FuIGNvcnJlY3RseSBzZXJ2ZSB1cCB0aWxlcy5cbiAgICAgKlxuICAgICAqIERlZmVycyB0byB7QGxpbmsgR2VvSlNPTldvcmtlclNvdXJjZSNsb2FkR2VvSlNPTn0gZm9yIHRoZSBmZXRjaGluZy9wYXJzaW5nLFxuICAgICAqIGV4cGVjdGluZyBgY2FsbGJhY2soZXJyb3IsIGRhdGEpYCB0byBiZSBjYWxsZWQgd2l0aCBlaXRoZXIgYW4gZXJyb3Igb3IgYVxuICAgICAqIHBhcnNlZCBHZW9KU09OIG9iamVjdC5cbiAgICAgKlxuICAgICAqIFdoZW4gYGxvYWREYXRhYCByZXF1ZXN0cyBjb21lIGluIGZhc3RlciB0aGFuIHRoZXkgY2FuIGJlIHByb2Nlc3NlZCxcbiAgICAgKiB0aGV5IGFyZSBjb2FsZXNjZWQgaW50byBhIHNpbmdsZSByZXF1ZXN0IHVzaW5nIHRoZSBsYXRlc3QgZGF0YS5cbiAgICAgKiBTZWUge0BsaW5rIEdlb0pTT05Xb3JrZXJTb3VyY2UjY29hbGVzY2V9XG4gICAgICpcbiAgICAgKiBAcGFyYW0gcGFyYW1zXG4gICAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAgICovXG4gICAgbG9hZERhdGEocGFyYW1zOiBMb2FkR2VvSlNPTlBhcmFtZXRlcnMsIGNhbGxiYWNrOiBDYWxsYmFjazx7XG4gICAgICAgIHJlc291cmNlVGltaW5nPzoge1tzdHJpbmddOiBBcnJheTxQZXJmb3JtYW5jZVJlc291cmNlVGltaW5nPn0sXG4gICAgICAgIGFiYW5kb25lZD86IGJvb2xlYW4gfT4pIHtcbiAgICAgICAgaWYgKHRoaXMuX3BlbmRpbmdDYWxsYmFjaykge1xuICAgICAgICAgICAgLy8gVGVsbCB0aGUgZm9yZWdyb3VuZCB0aGUgcHJldmlvdXMgY2FsbCBoYXMgYmVlbiBhYmFuZG9uZWRcbiAgICAgICAgICAgIHRoaXMuX3BlbmRpbmdDYWxsYmFjayhudWxsLCB7IGFiYW5kb25lZDogdHJ1ZSB9KTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9wZW5kaW5nQ2FsbGJhY2sgPSBjYWxsYmFjaztcbiAgICAgICAgdGhpcy5fcGVuZGluZ0xvYWREYXRhUGFyYW1zID0gcGFyYW1zO1xuXG4gICAgICAgIGlmICh0aGlzLl9zdGF0ZSAmJlxuICAgICAgICAgICAgdGhpcy5fc3RhdGUgIT09ICdJZGxlJykge1xuICAgICAgICAgICAgdGhpcy5fc3RhdGUgPSAnTmVlZHNMb2FkRGF0YSc7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9zdGF0ZSA9ICdDb2FsZXNjaW5nJztcbiAgICAgICAgICAgIHRoaXMuX2xvYWREYXRhKCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBJbnRlcm5hbCBpbXBsZW1lbnRhdGlvbjogY2FsbGVkIGRpcmVjdGx5IGJ5IGBsb2FkRGF0YWBcbiAgICAgKiBvciBieSBgY29hbGVzY2VgIHVzaW5nIHN0b3JlZCBwYXJhbWV0ZXJzLlxuICAgICAqL1xuICAgIF9sb2FkRGF0YSgpIHtcbiAgICAgICAgaWYgKCF0aGlzLl9wZW5kaW5nQ2FsbGJhY2sgfHwgIXRoaXMuX3BlbmRpbmdMb2FkRGF0YVBhcmFtcykge1xuICAgICAgICAgICAgYXNzZXJ0KGZhbHNlKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBjYWxsYmFjayA9IHRoaXMuX3BlbmRpbmdDYWxsYmFjaztcbiAgICAgICAgY29uc3QgcGFyYW1zID0gdGhpcy5fcGVuZGluZ0xvYWREYXRhUGFyYW1zO1xuICAgICAgICBkZWxldGUgdGhpcy5fcGVuZGluZ0NhbGxiYWNrO1xuICAgICAgICBkZWxldGUgdGhpcy5fcGVuZGluZ0xvYWREYXRhUGFyYW1zO1xuXG4gICAgICAgIGNvbnN0IHBlcmYgPSAocGFyYW1zICYmIHBhcmFtcy5yZXF1ZXN0ICYmIHBhcmFtcy5yZXF1ZXN0LmNvbGxlY3RSZXNvdXJjZVRpbWluZykgP1xuICAgICAgICAgICAgbmV3IHBlcmZvcm1hbmNlLlBlcmZvcm1hbmNlKHBhcmFtcy5yZXF1ZXN0KSA6IGZhbHNlO1xuXG4gICAgICAgIHRoaXMubG9hZEdlb0pTT04ocGFyYW1zLCAoZXJyOiA/RXJyb3IsIGRhdGE6ID9PYmplY3QpID0+IHtcbiAgICAgICAgICAgIGlmIChlcnIgfHwgIWRhdGEpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGRhdGEgIT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKG5ldyBFcnJvcihcIklucHV0IGRhdGEgaXMgbm90IGEgdmFsaWQgR2VvSlNPTiBvYmplY3QuXCIpKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV3aW5kKGRhdGEsIHRydWUpO1xuXG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fZ2VvSlNPTkluZGV4ID0gcGFyYW1zLmNsdXN0ZXIgP1xuICAgICAgICAgICAgICAgICAgICAgICAgc3VwZXJjbHVzdGVyKHBhcmFtcy5zdXBlcmNsdXN0ZXJPcHRpb25zKS5sb2FkKGRhdGEuZmVhdHVyZXMpIDpcbiAgICAgICAgICAgICAgICAgICAgICAgIGdlb2pzb252dChkYXRhLCBwYXJhbXMuZ2VvanNvblZ0T3B0aW9ucyk7XG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHRoaXMubG9hZGVkID0ge307XG5cbiAgICAgICAgICAgICAgICBjb25zdCByZXN1bHQgPSB7fTtcbiAgICAgICAgICAgICAgICBpZiAocGVyZikge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCByZXNvdXJjZVRpbWluZ0RhdGEgPSBwZXJmLmZpbmlzaCgpO1xuICAgICAgICAgICAgICAgICAgICAvLyBpdCdzIG5lY2Vzc2FyeSB0byBldmFsIHRoZSByZXN1bHQgb2YgZ2V0RW50cmllc0J5TmFtZSgpIGhlcmUgdmlhIHBhcnNlL3N0cmluZ2lmeVxuICAgICAgICAgICAgICAgICAgICAvLyBsYXRlIGV2YWx1YXRpb24gaW4gdGhlIG1haW4gdGhyZWFkIGNhdXNlcyBUeXBlRXJyb3I6IGlsbGVnYWwgaW52b2NhdGlvblxuICAgICAgICAgICAgICAgICAgICBpZiAocmVzb3VyY2VUaW1pbmdEYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQucmVzb3VyY2VUaW1pbmcgPSB7fTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdC5yZXNvdXJjZVRpbWluZ1twYXJhbXMuc291cmNlXSA9IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkocmVzb3VyY2VUaW1pbmdEYXRhKSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwgcmVzdWx0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogV2hpbGUgcHJvY2Vzc2luZyBgbG9hZERhdGFgLCB3ZSBjb2FsZXNjZSBhbGwgZnVydGhlclxuICAgICAqIGBsb2FkRGF0YWAgbWVzc2FnZXMgaW50byBhIHNpbmdsZSBjYWxsIHRvIF9sb2FkRGF0YVxuICAgICAqIHRoYXQgd2lsbCBoYXBwZW4gb25jZSB3ZSd2ZSBmaW5pc2hlZCBwcm9jZXNzaW5nIHRoZVxuICAgICAqIGZpcnN0IG1lc3NhZ2UuIHtAbGluayBHZW9KU09OU291cmNlI191cGRhdGVXb3JrZXJEYXRhfVxuICAgICAqIGlzIHJlc3BvbnNpYmxlIGZvciBzZW5kaW5nIHVzIHRoZSBgY29hbGVzY2VgIG1lc3NhZ2VcbiAgICAgKiBhdCB0aGUgdGltZSBpdCByZWNlaXZlcyBhIHJlc3BvbnNlIGZyb20gYGxvYWREYXRhYFxuICAgICAqXG4gICAgICogICAgICAgICAgU3RhdGU6IElkbGVcbiAgICAgKiAgICAgICAgICDihpEgICAgICAgICAgfFxuICAgICAqICAgICAnY29hbGVzY2UnICAgJ2xvYWREYXRhJ1xuICAgICAqICAgICAgICAgIHwgICAgICh0cmlnZ2VycyBsb2FkKVxuICAgICAqICAgICAgICAgIHwgICAgICAgICAg4oaTXG4gICAgICogICAgICAgIFN0YXRlOiBDb2FsZXNjaW5nXG4gICAgICogICAgICAgICAg4oaRICAgICAgICAgIHxcbiAgICAgKiAgICh0cmlnZ2VycyBsb2FkKSAgIHxcbiAgICAgKiAgICAgJ2NvYWxlc2NlJyAgICdsb2FkRGF0YSdcbiAgICAgKiAgICAgICAgICB8ICAgICAgICAgIOKGk1xuICAgICAqICAgICAgICBTdGF0ZTogTmVlZHNMb2FkRGF0YVxuICAgICAqL1xuICAgIGNvYWxlc2NlKCkge1xuICAgICAgICBpZiAodGhpcy5fc3RhdGUgPT09ICdDb2FsZXNjaW5nJykge1xuICAgICAgICAgICAgdGhpcy5fc3RhdGUgPSAnSWRsZSc7XG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5fc3RhdGUgPT09ICdOZWVkc0xvYWREYXRhJykge1xuICAgICAgICAgICAgdGhpcy5fc3RhdGUgPSAnQ29hbGVzY2luZyc7XG4gICAgICAgICAgICB0aGlzLl9sb2FkRGF0YSgpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgKiBJbXBsZW1lbnRzIHtAbGluayBXb3JrZXJTb3VyY2UjcmVsb2FkVGlsZX0uXG4gICAgKlxuICAgICogSWYgdGhlIHRpbGUgaXMgbG9hZGVkLCB1c2VzIHRoZSBpbXBsZW1lbnRhdGlvbiBpbiBWZWN0b3JUaWxlV29ya2VyU291cmNlLlxuICAgICogT3RoZXJ3aXNlLCBzdWNoIGFzIGFmdGVyIGEgc2V0RGF0YSgpIGNhbGwsIHdlIGxvYWQgdGhlIHRpbGUgZnJlc2guXG4gICAgKlxuICAgICogQHBhcmFtIHBhcmFtc1xuICAgICogQHBhcmFtIHBhcmFtcy51aWQgVGhlIFVJRCBmb3IgdGhpcyB0aWxlLlxuICAgICovXG4gICAgcmVsb2FkVGlsZShwYXJhbXM6IFdvcmtlclRpbGVQYXJhbWV0ZXJzLCBjYWxsYmFjazogV29ya2VyVGlsZUNhbGxiYWNrKSB7XG4gICAgICAgIGNvbnN0IGxvYWRlZCA9IHRoaXMubG9hZGVkLFxuICAgICAgICAgICAgdWlkID0gcGFyYW1zLnVpZDtcblxuICAgICAgICBpZiAobG9hZGVkICYmIGxvYWRlZFt1aWRdKSB7XG4gICAgICAgICAgICByZXR1cm4gc3VwZXIucmVsb2FkVGlsZShwYXJhbXMsIGNhbGxiYWNrKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmxvYWRUaWxlKHBhcmFtcywgY2FsbGJhY2spO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRmV0Y2ggYW5kIHBhcnNlIEdlb0pTT04gYWNjb3JkaW5nIHRvIHRoZSBnaXZlbiBwYXJhbXMuICBDYWxscyBgY2FsbGJhY2tgXG4gICAgICogd2l0aCBgKGVyciwgZGF0YSlgLCB3aGVyZSBgZGF0YWAgaXMgYSBwYXJzZWQgR2VvSlNPTiBvYmplY3QuXG4gICAgICpcbiAgICAgKiBHZW9KU09OIGlzIGxvYWRlZCBhbmQgcGFyc2VkIGZyb20gYHBhcmFtcy51cmxgIGlmIGl0IGV4aXN0cywgb3IgZWxzZVxuICAgICAqIGV4cGVjdGVkIGFzIGEgbGl0ZXJhbCAoc3RyaW5nIG9yIG9iamVjdCkgYHBhcmFtcy5kYXRhYC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSBwYXJhbXNcbiAgICAgKiBAcGFyYW0gW3BhcmFtcy51cmxdIEEgVVJMIHRvIHRoZSByZW1vdGUgR2VvSlNPTiBkYXRhLlxuICAgICAqIEBwYXJhbSBbcGFyYW1zLmRhdGFdIExpdGVyYWwgR2VvSlNPTiBkYXRhLiBNdXN0IGJlIHByb3ZpZGVkIGlmIGBwYXJhbXMudXJsYCBpcyBub3QuXG4gICAgICovXG4gICAgbG9hZEdlb0pTT04ocGFyYW1zOiBMb2FkR2VvSlNPTlBhcmFtZXRlcnMsIGNhbGxiYWNrOiBSZXNwb25zZUNhbGxiYWNrPE9iamVjdD4pIHtcbiAgICAgICAgLy8gQmVjYXVzZSBvZiBzYW1lIG9yaWdpbiBpc3N1ZXMsIHVybHMgbXVzdCBlaXRoZXIgaW5jbHVkZSBhbiBleHBsaWNpdFxuICAgICAgICAvLyBvcmlnaW4gb3IgYWJzb2x1dGUgcGF0aC5cbiAgICAgICAgLy8gaWU6IC9mb28vYmFyLmpzb24gb3IgaHR0cDovL2V4YW1wbGUuY29tL2Jhci5qc29uXG4gICAgICAgIC8vIGJ1dCBub3QgLi4vZm9vL2Jhci5qc29uXG4gICAgICAgIGlmIChwYXJhbXMucmVxdWVzdCkge1xuICAgICAgICAgICAgZ2V0SlNPTihwYXJhbXMucmVxdWVzdCwgY2FsbGJhY2spO1xuICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBwYXJhbXMuZGF0YSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKG51bGwsIEpTT04ucGFyc2UocGFyYW1zLmRhdGEpKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2sobmV3IEVycm9yKFwiSW5wdXQgZGF0YSBpcyBub3QgYSB2YWxpZCBHZW9KU09OIG9iamVjdC5cIikpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKG5ldyBFcnJvcihcIklucHV0IGRhdGEgaXMgbm90IGEgdmFsaWQgR2VvSlNPTiBvYmplY3QuXCIpKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJlbW92ZVNvdXJjZShwYXJhbXM6IHtzb3VyY2U6IHN0cmluZ30sIGNhbGxiYWNrOiBDYWxsYmFjazxtaXhlZD4pIHtcbiAgICAgICAgaWYgKHRoaXMuX3BlbmRpbmdDYWxsYmFjaykge1xuICAgICAgICAgICAgLy8gRG9uJ3QgbGVhayBjYWxsYmFja3NcbiAgICAgICAgICAgIHRoaXMuX3BlbmRpbmdDYWxsYmFjayhudWxsLCB7IGFiYW5kb25lZDogdHJ1ZSB9KTtcbiAgICAgICAgfVxuICAgICAgICBjYWxsYmFjaygpO1xuICAgIH1cblxuICAgIGdldENsdXN0ZXJFeHBhbnNpb25ab29tKHBhcmFtczoge2NsdXN0ZXJJZDogbnVtYmVyfSwgY2FsbGJhY2s6IENhbGxiYWNrPG51bWJlcj4pIHtcbiAgICAgICAgY2FsbGJhY2sobnVsbCwgdGhpcy5fZ2VvSlNPTkluZGV4LmdldENsdXN0ZXJFeHBhbnNpb25ab29tKHBhcmFtcy5jbHVzdGVySWQpKTtcbiAgICB9XG5cbiAgICBnZXRDbHVzdGVyQ2hpbGRyZW4ocGFyYW1zOiB7Y2x1c3RlcklkOiBudW1iZXJ9LCBjYWxsYmFjazogQ2FsbGJhY2s8QXJyYXk8R2VvSlNPTkZlYXR1cmU+Pikge1xuICAgICAgICBjYWxsYmFjayhudWxsLCB0aGlzLl9nZW9KU09OSW5kZXguZ2V0Q2hpbGRyZW4ocGFyYW1zLmNsdXN0ZXJJZCkpO1xuICAgIH1cblxuICAgIGdldENsdXN0ZXJMZWF2ZXMocGFyYW1zOiB7Y2x1c3RlcklkOiBudW1iZXIsIGxpbWl0OiBudW1iZXIsIG9mZnNldDogbnVtYmVyfSwgY2FsbGJhY2s6IENhbGxiYWNrPEFycmF5PEdlb0pTT05GZWF0dXJlPj4pIHtcbiAgICAgICAgY2FsbGJhY2sobnVsbCwgdGhpcy5fZ2VvSlNPTkluZGV4LmdldExlYXZlcyhwYXJhbXMuY2x1c3RlcklkLCBwYXJhbXMubGltaXQsIHBhcmFtcy5vZmZzZXQpKTtcbiAgICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IEdlb0pTT05Xb3JrZXJTb3VyY2U7XG4iLCIvLyBAZmxvd1xuXG5pbXBvcnQgQWN0b3IgZnJvbSAnLi4vdXRpbC9hY3Rvcic7XG5cbmltcG9ydCBTdHlsZUxheWVySW5kZXggZnJvbSAnLi4vc3R5bGUvc3R5bGVfbGF5ZXJfaW5kZXgnO1xuaW1wb3J0IFZlY3RvclRpbGVXb3JrZXJTb3VyY2UgZnJvbSAnLi92ZWN0b3JfdGlsZV93b3JrZXJfc291cmNlJztcbmltcG9ydCBSYXN0ZXJERU1UaWxlV29ya2VyU291cmNlIGZyb20gJy4vcmFzdGVyX2RlbV90aWxlX3dvcmtlcl9zb3VyY2UnO1xuaW1wb3J0IEdlb0pTT05Xb3JrZXJTb3VyY2UgZnJvbSAnLi9nZW9qc29uX3dvcmtlcl9zb3VyY2UnO1xuaW1wb3J0IGFzc2VydCBmcm9tICdhc3NlcnQnO1xuaW1wb3J0IHsgcGx1Z2luIGFzIGdsb2JhbFJUTFRleHRQbHVnaW4gfSBmcm9tICcuL3J0bF90ZXh0X3BsdWdpbic7XG5cbmltcG9ydCB0eXBlIHtcbiAgICBXb3JrZXJTb3VyY2UsXG4gICAgV29ya2VyVGlsZVBhcmFtZXRlcnMsXG4gICAgV29ya2VyREVNVGlsZVBhcmFtZXRlcnMsXG4gICAgV29ya2VyVGlsZUNhbGxiYWNrLFxuICAgIFdvcmtlckRFTVRpbGVDYWxsYmFjayxcbiAgICBUaWxlUGFyYW1ldGVyc1xufSBmcm9tICcuLi9zb3VyY2Uvd29ya2VyX3NvdXJjZSc7XG5cbmltcG9ydCB0eXBlIHtXb3JrZXJHbG9iYWxTY29wZUludGVyZmFjZX0gZnJvbSAnLi4vdXRpbC93ZWJfd29ya2VyJztcbmltcG9ydCB0eXBlIHtDYWxsYmFja30gZnJvbSAnLi4vdHlwZXMvY2FsbGJhY2snO1xuaW1wb3J0IHR5cGUge0xheWVyU3BlY2lmaWNhdGlvbn0gZnJvbSAnLi4vc3R5bGUtc3BlYy90eXBlcyc7XG5cbi8qKlxuICogQHByaXZhdGVcbiAqL1xuZXhwb3J0IGRlZmF1bHQgY2xhc3MgV29ya2VyIHtcbiAgICBzZWxmOiBXb3JrZXJHbG9iYWxTY29wZUludGVyZmFjZTtcbiAgICBhY3RvcjogQWN0b3I7XG4gICAgbGF5ZXJJbmRleGVzOiB7IFtzdHJpbmddOiBTdHlsZUxheWVySW5kZXggfTtcbiAgICB3b3JrZXJTb3VyY2VUeXBlczogeyBbc3RyaW5nXTogQ2xhc3M8V29ya2VyU291cmNlPiB9O1xuICAgIHdvcmtlclNvdXJjZXM6IHsgW3N0cmluZ106IHsgW3N0cmluZ106IHsgW3N0cmluZ106IFdvcmtlclNvdXJjZSB9IH0gfTtcbiAgICBkZW1Xb3JrZXJTb3VyY2VzOiB7IFtzdHJpbmddOiB7IFtzdHJpbmddOiBSYXN0ZXJERU1UaWxlV29ya2VyU291cmNlIH0gfTtcbiAgICByZWZlcnJlcjogP3N0cmluZztcblxuICAgIGNvbnN0cnVjdG9yKHNlbGY6IFdvcmtlckdsb2JhbFNjb3BlSW50ZXJmYWNlKSB7XG4gICAgICAgIHRoaXMuc2VsZiA9IHNlbGY7XG4gICAgICAgIHRoaXMuYWN0b3IgPSBuZXcgQWN0b3Ioc2VsZiwgdGhpcyk7XG5cbiAgICAgICAgdGhpcy5sYXllckluZGV4ZXMgPSB7fTtcblxuICAgICAgICB0aGlzLndvcmtlclNvdXJjZVR5cGVzID0ge1xuICAgICAgICAgICAgdmVjdG9yOiBWZWN0b3JUaWxlV29ya2VyU291cmNlLFxuICAgICAgICAgICAgZ2VvanNvbjogR2VvSlNPTldvcmtlclNvdXJjZVxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIFttYXBJZF1bc291cmNlVHlwZV1bc291cmNlTmFtZV0gPT4gd29ya2VyIHNvdXJjZSBpbnN0YW5jZVxuICAgICAgICB0aGlzLndvcmtlclNvdXJjZXMgPSB7fTtcbiAgICAgICAgdGhpcy5kZW1Xb3JrZXJTb3VyY2VzID0ge307XG5cbiAgICAgICAgdGhpcy5zZWxmLnJlZ2lzdGVyV29ya2VyU291cmNlID0gKG5hbWU6IHN0cmluZywgV29ya2VyU291cmNlOiBDbGFzczxXb3JrZXJTb3VyY2U+KSA9PiB7XG4gICAgICAgICAgICBpZiAodGhpcy53b3JrZXJTb3VyY2VUeXBlc1tuYW1lXSkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgV29ya2VyIHNvdXJjZSB3aXRoIG5hbWUgXCIke25hbWV9XCIgYWxyZWFkeSByZWdpc3RlcmVkLmApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy53b3JrZXJTb3VyY2VUeXBlc1tuYW1lXSA9IFdvcmtlclNvdXJjZTtcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLnNlbGYucmVnaXN0ZXJSVExUZXh0UGx1Z2luID0gKHJ0bFRleHRQbHVnaW46IHthcHBseUFyYWJpY1NoYXBpbmc6IEZ1bmN0aW9uLCBwcm9jZXNzQmlkaXJlY3Rpb25hbFRleHQ6IEZ1bmN0aW9uLCBwcm9jZXNzU3R5bGVkQmlkaXJlY3Rpb25hbFRleHQ/OiBGdW5jdGlvbn0pID0+IHtcbiAgICAgICAgICAgIGlmIChnbG9iYWxSVExUZXh0UGx1Z2luLmlzTG9hZGVkKCkpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1JUTCB0ZXh0IHBsdWdpbiBhbHJlYWR5IHJlZ2lzdGVyZWQuJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBnbG9iYWxSVExUZXh0UGx1Z2luWydhcHBseUFyYWJpY1NoYXBpbmcnXSA9IHJ0bFRleHRQbHVnaW4uYXBwbHlBcmFiaWNTaGFwaW5nO1xuICAgICAgICAgICAgZ2xvYmFsUlRMVGV4dFBsdWdpblsncHJvY2Vzc0JpZGlyZWN0aW9uYWxUZXh0J10gPSBydGxUZXh0UGx1Z2luLnByb2Nlc3NCaWRpcmVjdGlvbmFsVGV4dDtcbiAgICAgICAgICAgIGdsb2JhbFJUTFRleHRQbHVnaW5bJ3Byb2Nlc3NTdHlsZWRCaWRpcmVjdGlvbmFsVGV4dCddID0gcnRsVGV4dFBsdWdpbi5wcm9jZXNzU3R5bGVkQmlkaXJlY3Rpb25hbFRleHQ7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgc2V0UmVmZXJyZXIobWFwSUQ6IHN0cmluZywgcmVmZXJyZXI6IHN0cmluZykge1xuICAgICAgICB0aGlzLnJlZmVycmVyID0gcmVmZXJyZXI7XG4gICAgfVxuXG4gICAgc2V0TGF5ZXJzKG1hcElkOiBzdHJpbmcsIGxheWVyczogQXJyYXk8TGF5ZXJTcGVjaWZpY2F0aW9uPiwgY2FsbGJhY2s6IFdvcmtlclRpbGVDYWxsYmFjaykge1xuICAgICAgICB0aGlzLmdldExheWVySW5kZXgobWFwSWQpLnJlcGxhY2UobGF5ZXJzKTtcbiAgICAgICAgY2FsbGJhY2soKTtcbiAgICB9XG5cbiAgICB1cGRhdGVMYXllcnMobWFwSWQ6IHN0cmluZywgcGFyYW1zOiB7bGF5ZXJzOiBBcnJheTxMYXllclNwZWNpZmljYXRpb24+LCByZW1vdmVkSWRzOiBBcnJheTxzdHJpbmc+fSwgY2FsbGJhY2s6IFdvcmtlclRpbGVDYWxsYmFjaykge1xuICAgICAgICB0aGlzLmdldExheWVySW5kZXgobWFwSWQpLnVwZGF0ZShwYXJhbXMubGF5ZXJzLCBwYXJhbXMucmVtb3ZlZElkcyk7XG4gICAgICAgIGNhbGxiYWNrKCk7XG4gICAgfVxuXG4gICAgbG9hZFRpbGUobWFwSWQ6IHN0cmluZywgcGFyYW1zOiBXb3JrZXJUaWxlUGFyYW1ldGVycyAmIHt0eXBlOiBzdHJpbmd9LCBjYWxsYmFjazogV29ya2VyVGlsZUNhbGxiYWNrKSB7XG4gICAgICAgIGFzc2VydChwYXJhbXMudHlwZSk7XG4gICAgICAgIHRoaXMuZ2V0V29ya2VyU291cmNlKG1hcElkLCBwYXJhbXMudHlwZSwgcGFyYW1zLnNvdXJjZSkubG9hZFRpbGUocGFyYW1zLCBjYWxsYmFjayk7XG4gICAgfVxuXG4gICAgbG9hZERFTVRpbGUobWFwSWQ6IHN0cmluZywgcGFyYW1zOiBXb3JrZXJERU1UaWxlUGFyYW1ldGVycywgY2FsbGJhY2s6IFdvcmtlckRFTVRpbGVDYWxsYmFjaykge1xuICAgICAgICB0aGlzLmdldERFTVdvcmtlclNvdXJjZShtYXBJZCwgcGFyYW1zLnNvdXJjZSkubG9hZFRpbGUocGFyYW1zLCBjYWxsYmFjayk7XG4gICAgfVxuXG4gICAgcmVsb2FkVGlsZShtYXBJZDogc3RyaW5nLCBwYXJhbXM6IFdvcmtlclRpbGVQYXJhbWV0ZXJzICYge3R5cGU6IHN0cmluZ30sIGNhbGxiYWNrOiBXb3JrZXJUaWxlQ2FsbGJhY2spIHtcbiAgICAgICAgYXNzZXJ0KHBhcmFtcy50eXBlKTtcbiAgICAgICAgdGhpcy5nZXRXb3JrZXJTb3VyY2UobWFwSWQsIHBhcmFtcy50eXBlLCBwYXJhbXMuc291cmNlKS5yZWxvYWRUaWxlKHBhcmFtcywgY2FsbGJhY2spO1xuICAgIH1cblxuICAgIGFib3J0VGlsZShtYXBJZDogc3RyaW5nLCBwYXJhbXM6IFRpbGVQYXJhbWV0ZXJzICYge3R5cGU6IHN0cmluZ30sIGNhbGxiYWNrOiBXb3JrZXJUaWxlQ2FsbGJhY2spIHtcbiAgICAgICAgYXNzZXJ0KHBhcmFtcy50eXBlKTtcbiAgICAgICAgdGhpcy5nZXRXb3JrZXJTb3VyY2UobWFwSWQsIHBhcmFtcy50eXBlLCBwYXJhbXMuc291cmNlKS5hYm9ydFRpbGUocGFyYW1zLCBjYWxsYmFjayk7XG4gICAgfVxuXG4gICAgcmVtb3ZlVGlsZShtYXBJZDogc3RyaW5nLCBwYXJhbXM6IFRpbGVQYXJhbWV0ZXJzICYge3R5cGU6IHN0cmluZ30sIGNhbGxiYWNrOiBXb3JrZXJUaWxlQ2FsbGJhY2spIHtcbiAgICAgICAgYXNzZXJ0KHBhcmFtcy50eXBlKTtcbiAgICAgICAgdGhpcy5nZXRXb3JrZXJTb3VyY2UobWFwSWQsIHBhcmFtcy50eXBlLCBwYXJhbXMuc291cmNlKS5yZW1vdmVUaWxlKHBhcmFtcywgY2FsbGJhY2spO1xuICAgIH1cblxuICAgIHJlbW92ZURFTVRpbGUobWFwSWQ6IHN0cmluZywgcGFyYW1zOiBUaWxlUGFyYW1ldGVycykge1xuICAgICAgICB0aGlzLmdldERFTVdvcmtlclNvdXJjZShtYXBJZCwgcGFyYW1zLnNvdXJjZSkucmVtb3ZlVGlsZShwYXJhbXMpO1xuICAgIH1cblxuICAgIHJlbW92ZVNvdXJjZShtYXBJZDogc3RyaW5nLCBwYXJhbXM6IHtzb3VyY2U6IHN0cmluZ30gJiB7dHlwZTogc3RyaW5nfSwgY2FsbGJhY2s6IFdvcmtlclRpbGVDYWxsYmFjaykge1xuICAgICAgICBhc3NlcnQocGFyYW1zLnR5cGUpO1xuICAgICAgICBhc3NlcnQocGFyYW1zLnNvdXJjZSk7XG5cbiAgICAgICAgaWYgKCF0aGlzLndvcmtlclNvdXJjZXNbbWFwSWRdIHx8XG4gICAgICAgICAgICAhdGhpcy53b3JrZXJTb3VyY2VzW21hcElkXVtwYXJhbXMudHlwZV0gfHxcbiAgICAgICAgICAgICF0aGlzLndvcmtlclNvdXJjZXNbbWFwSWRdW3BhcmFtcy50eXBlXVtwYXJhbXMuc291cmNlXSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3Qgd29ya2VyID0gdGhpcy53b3JrZXJTb3VyY2VzW21hcElkXVtwYXJhbXMudHlwZV1bcGFyYW1zLnNvdXJjZV07XG4gICAgICAgIGRlbGV0ZSB0aGlzLndvcmtlclNvdXJjZXNbbWFwSWRdW3BhcmFtcy50eXBlXVtwYXJhbXMuc291cmNlXTtcblxuICAgICAgICBpZiAod29ya2VyLnJlbW92ZVNvdXJjZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICB3b3JrZXIucmVtb3ZlU291cmNlKHBhcmFtcywgY2FsbGJhY2spO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIExvYWQgYSB7QGxpbmsgV29ya2VyU291cmNlfSBzY3JpcHQgYXQgcGFyYW1zLnVybC4gIFRoZSBzY3JpcHQgaXMgcnVuXG4gICAgICogKHVzaW5nIGltcG9ydFNjcmlwdHMpIHdpdGggYHJlZ2lzdGVyV29ya2VyU291cmNlYCBpbiBzY29wZSwgd2hpY2ggaXMgYVxuICAgICAqIGZ1bmN0aW9uIHRha2luZyBgKG5hbWUsIHdvcmtlclNvdXJjZU9iamVjdClgLlxuICAgICAqICBAcHJpdmF0ZVxuICAgICAqL1xuICAgIGxvYWRXb3JrZXJTb3VyY2UobWFwOiBzdHJpbmcsIHBhcmFtczogeyB1cmw6IHN0cmluZyB9LCBjYWxsYmFjazogQ2FsbGJhY2s8dm9pZD4pIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHRoaXMuc2VsZi5pbXBvcnRTY3JpcHRzKHBhcmFtcy51cmwpO1xuICAgICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgY2FsbGJhY2soZS50b1N0cmluZygpKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGxvYWRSVExUZXh0UGx1Z2luKG1hcDogc3RyaW5nLCBwbHVnaW5VUkw6IHN0cmluZywgY2FsbGJhY2s6IENhbGxiYWNrPHZvaWQ+KSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBpZiAoIWdsb2JhbFJUTFRleHRQbHVnaW4uaXNMb2FkZWQoKSkge1xuICAgICAgICAgICAgICAgIHRoaXMuc2VsZi5pbXBvcnRTY3JpcHRzKHBsdWdpblVSTCk7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZ2xvYmFsUlRMVGV4dFBsdWdpbi5pc0xvYWRlZCgpID9cbiAgICAgICAgICAgICAgICAgICAgbnVsbCA6XG4gICAgICAgICAgICAgICAgICAgIG5ldyBFcnJvcihgUlRMIFRleHQgUGx1Z2luIGZhaWxlZCB0byBpbXBvcnQgc2NyaXB0cyBmcm9tICR7cGx1Z2luVVJMfWApKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgY2FsbGJhY2soZS50b1N0cmluZygpKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGdldExheWVySW5kZXgobWFwSWQ6IHN0cmluZykge1xuICAgICAgICBsZXQgbGF5ZXJJbmRleGVzID0gdGhpcy5sYXllckluZGV4ZXNbbWFwSWRdO1xuICAgICAgICBpZiAoIWxheWVySW5kZXhlcykge1xuICAgICAgICAgICAgbGF5ZXJJbmRleGVzID0gdGhpcy5sYXllckluZGV4ZXNbbWFwSWRdID0gbmV3IFN0eWxlTGF5ZXJJbmRleCgpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBsYXllckluZGV4ZXM7XG4gICAgfVxuXG4gICAgZ2V0V29ya2VyU291cmNlKG1hcElkOiBzdHJpbmcsIHR5cGU6IHN0cmluZywgc291cmNlOiBzdHJpbmcpIHtcbiAgICAgICAgaWYgKCF0aGlzLndvcmtlclNvdXJjZXNbbWFwSWRdKVxuICAgICAgICAgICAgdGhpcy53b3JrZXJTb3VyY2VzW21hcElkXSA9IHt9O1xuICAgICAgICBpZiAoIXRoaXMud29ya2VyU291cmNlc1ttYXBJZF1bdHlwZV0pXG4gICAgICAgICAgICB0aGlzLndvcmtlclNvdXJjZXNbbWFwSWRdW3R5cGVdID0ge307XG5cbiAgICAgICAgaWYgKCF0aGlzLndvcmtlclNvdXJjZXNbbWFwSWRdW3R5cGVdW3NvdXJjZV0pIHtcbiAgICAgICAgICAgIC8vIHVzZSBhIHdyYXBwZWQgYWN0b3Igc28gdGhhdCB3ZSBjYW4gYXR0YWNoIGEgdGFyZ2V0IG1hcElkIHBhcmFtXG4gICAgICAgICAgICAvLyB0byBhbnkgbWVzc2FnZXMgaW52b2tlZCBieSB0aGUgV29ya2VyU291cmNlXG4gICAgICAgICAgICBjb25zdCBhY3RvciA9IHtcbiAgICAgICAgICAgICAgICBzZW5kOiAodHlwZSwgZGF0YSwgY2FsbGJhY2spID0+IHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5hY3Rvci5zZW5kKHR5cGUsIGRhdGEsIGNhbGxiYWNrLCBtYXBJZCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgdGhpcy53b3JrZXJTb3VyY2VzW21hcElkXVt0eXBlXVtzb3VyY2VdID0gbmV3ICh0aGlzLndvcmtlclNvdXJjZVR5cGVzW3R5cGVdOiBhbnkpKChhY3RvcjogYW55KSwgdGhpcy5nZXRMYXllckluZGV4KG1hcElkKSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhpcy53b3JrZXJTb3VyY2VzW21hcElkXVt0eXBlXVtzb3VyY2VdO1xuICAgIH1cblxuICAgIGdldERFTVdvcmtlclNvdXJjZShtYXBJZDogc3RyaW5nLCBzb3VyY2U6IHN0cmluZykge1xuICAgICAgICBpZiAoIXRoaXMuZGVtV29ya2VyU291cmNlc1ttYXBJZF0pXG4gICAgICAgICAgICB0aGlzLmRlbVdvcmtlclNvdXJjZXNbbWFwSWRdID0ge307XG5cbiAgICAgICAgaWYgKCF0aGlzLmRlbVdvcmtlclNvdXJjZXNbbWFwSWRdW3NvdXJjZV0pIHtcbiAgICAgICAgICAgIHRoaXMuZGVtV29ya2VyU291cmNlc1ttYXBJZF1bc291cmNlXSA9IG5ldyBSYXN0ZXJERU1UaWxlV29ya2VyU291cmNlKCk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhpcy5kZW1Xb3JrZXJTb3VyY2VzW21hcElkXVtzb3VyY2VdO1xuICAgIH1cbn1cblxuLyogZ2xvYmFsIHNlbGYsIFdvcmtlckdsb2JhbFNjb3BlICovXG5pZiAodHlwZW9mIFdvcmtlckdsb2JhbFNjb3BlICE9PSAndW5kZWZpbmVkJyAmJlxuICAgIHR5cGVvZiBzZWxmICE9PSAndW5kZWZpbmVkJyAmJlxuICAgIHNlbGYgaW5zdGFuY2VvZiBXb3JrZXJHbG9iYWxTY29wZSkge1xuICAgIHNlbGYud29ya2VyID0gbmV3IFdvcmtlcihzZWxmKTtcbn1cbiJdLCJuYW1lcyI6WyJzdHJpbmdpZnkiLCJvYmoiLCJjb25zdCIsInR5cGUiLCJ1bmRlZmluZWQiLCJKU09OIiwiQXJyYXkiLCJpc0FycmF5IiwibGV0Iiwic3RyIiwidmFsIiwia2V5cyIsIk9iamVjdCIsInNvcnQiLCJpIiwibGVuZ3RoIiwiZ2V0S2V5IiwibGF5ZXIiLCJrZXkiLCJyZWZQcm9wZXJ0aWVzIiwiayIsImdyb3VwQnlMYXlvdXQiLCJsYXllcnMiLCJncm91cHMiLCJncm91cCIsInB1c2giLCJyZXN1bHQiLCJTdHlsZUxheWVySW5kZXgiLCJsYXllckNvbmZpZ3MiLCJyZXBsYWNlIiwiX2xheWVyQ29uZmlncyIsIl9sYXllcnMiLCJ1cGRhdGUiLCJyZW1vdmVkSWRzIiwibGF5ZXJDb25maWciLCJ0aGlzIiwiaWQiLCJjcmVhdGVTdHlsZUxheWVyIiwiX2ZlYXR1cmVGaWx0ZXIiLCJmZWF0dXJlRmlsdGVyIiwiZmlsdGVyIiwiZmFtaWxpZXNCeVNvdXJjZSIsInZhbHVlcyIsIm1hcCIsInZpc2liaWxpdHkiLCJzb3VyY2VJZCIsInNvdXJjZSIsInNvdXJjZUdyb3VwIiwic291cmNlTGF5ZXJJZCIsInNvdXJjZUxheWVyIiwic291cmNlTGF5ZXJGYW1pbGllcyIsImNoZWNrTWF4QW5nbGUiLCJsaW5lIiwiYW5jaG9yIiwibGFiZWxMZW5ndGgiLCJ3aW5kb3dTaXplIiwibWF4QW5nbGUiLCJzZWdtZW50IiwicCIsImluZGV4IiwiYW5jaG9yRGlzdGFuY2UiLCJkaXN0IiwicmVjZW50Q29ybmVycyIsInJlY2VudEFuZ2xlRGVsdGEiLCJwcmV2IiwiY3VycmVudCIsIm5leHQiLCJhbmdsZURlbHRhIiwiYW5nbGVUbyIsIk1hdGgiLCJhYnMiLCJQSSIsImRpc3RhbmNlIiwic2hpZnQiLCJnZXRMaW5lTGVuZ3RoIiwibGluZUxlbmd0aCIsImdldEFuZ2xlV2luZG93U2l6ZSIsInNoYXBlZFRleHQiLCJnbHlwaFNpemUiLCJib3hTY2FsZSIsImdldFNoYXBlZExhYmVsTGVuZ3RoIiwic2hhcGVkSWNvbiIsIm1heCIsInJpZ2h0IiwibGVmdCIsImdldENlbnRlckFuY2hvciIsImFuZ2xlV2luZG93U2l6ZSIsInByZXZEaXN0YW5jZSIsImNlbnRlckRpc3RhbmNlIiwiYSIsImIiLCJzZWdtZW50RGlzdGFuY2UiLCJ0IiwieCIsImludGVycG9sYXRlIiwieSIsIkFuY2hvciIsIl9yb3VuZCIsImdldEFuY2hvcnMiLCJzcGFjaW5nIiwib3ZlcnNjYWxpbmciLCJ0aWxlRXh0ZW50Iiwic2hhcGVkTGFiZWxMZW5ndGgiLCJpc0xpbmVDb250aW51ZWQiLCJmaXhlZEV4dHJhT2Zmc2V0Iiwib2Zmc2V0IiwicmVzYW1wbGUiLCJwbGFjZUF0TWlkZGxlIiwiaGFsZkxhYmVsTGVuZ3RoIiwibWFya2VkRGlzdGFuY2UiLCJhbmNob3JzIiwic2VnbWVudERpc3QiLCJhbmdsZSIsImNsaXBMaW5lIiwibGluZXMiLCJ4MSIsInkxIiwieDIiLCJ5MiIsImNsaXBwZWRMaW5lcyIsImwiLCJjbGlwcGVkTGluZSIsInAwIiwicDEiLCJQb2ludCIsImVxdWFscyIsImdldEljb25RdWFkcyIsImFsb25nTGluZSIsImZlYXR1cmUiLCJpbWFnZSIsImxheW91dCIsImJvcmRlciIsInRvcCIsInBpeGVsUmF0aW8iLCJib3R0b20iLCJ0bCIsInRyIiwiYnIiLCJibCIsImdldCIsImljb25XaWR0aCIsImljb25IZWlnaHQiLCJzaXplIiwiZXZhbHVhdGUiLCJ0ZXh0TGVmdCIsInRleHRSaWdodCIsInRleHRUb3AiLCJ0ZXh0Qm90dG9tIiwidGV4dFdpZHRoIiwidGV4dEhlaWdodCIsInBhZFQiLCJwYWRSIiwicGFkQiIsInBhZEwiLCJvZmZzZXRZIiwib2Zmc2V0WCIsIndpZHRoIiwiaGVpZ2h0Iiwic2luIiwiY29zIiwibWF0cml4IiwiX21hdE11bHQiLCJ0ZXgiLCJwYWRkZWRSZWN0Iiwid3JpdGluZ01vZGUiLCJnbHlwaE9mZnNldCIsImdldEdseXBoUXVhZHMiLCJzaGFwaW5nIiwicG9zaXRpb25zIiwib25lRW0iLCJ0ZXh0Um90YXRlIiwidGV4dE9mZnNldCIsInBvc2l0aW9uZWRHbHlwaHMiLCJxdWFkcyIsInBvc2l0aW9uZWRHbHlwaCIsImdseXBoUG9zaXRpb25zIiwiZm9udFN0YWNrIiwiZ2x5cGgiLCJyZWN0IiwiZ2x5cGhQYWRkaW5nIiwicmVjdEJ1ZmZlciIsIkdMWVBIX1BCRl9CT1JERVIiLCJoYWxmQWR2YW5jZSIsIm1ldHJpY3MiLCJhZHZhbmNlIiwic2NhbGUiLCJidWlsdEluT2Zmc2V0IiwidyIsImgiLCJ2ZXJ0aWNhbCIsImNlbnRlciIsInZlcnRpY2FsUm90YXRpb24iLCJ4T2Zmc2V0Q29ycmVjdGlvbiIsIl9yb3RhdGVBcm91bmQiLCJfYWRkIiwiQ29sbGlzaW9uRmVhdHVyZSIsImNvbGxpc2lvbkJveEFycmF5IiwiZmVhdHVyZUluZGV4Iiwic291cmNlTGF5ZXJJbmRleCIsImJ1Y2tldEluZGV4Iiwic2hhcGVkIiwicGFkZGluZyIsImFsaWduTGluZSIsInJvdGF0ZSIsImJveFN0YXJ0SW5kZXgiLCJfYWRkTGluZUNvbGxpc2lvbkNpcmNsZXMiLCJyb3RhdGVSYWRpYW5zIiwiX3JvdGF0ZSIsIm1pbiIsImVtcGxhY2VCYWNrIiwiYm94RW5kSW5kZXgiLCJib3hTaXplIiwic3RlcCIsIm5Cb3hlcyIsImZsb29yIiwib3ZlcnNjYWxpbmdQYWRkaW5nRmFjdG9yIiwibG9nIiwiTE4yIiwiblBpdGNoUGFkZGluZ0JveGVzIiwiZmlyc3RCb3hPZmZzZXQiLCJsYWJlbFN0YXJ0RGlzdGFuY2UiLCJwYWRkaW5nU3RhcnREaXN0YW5jZSIsInNlZ21lbnRMZW5ndGgiLCJib3hPZmZzZXQiLCJib3hEaXN0YW5jZVRvQW5jaG9yIiwic2VnbWVudEJveERpc3RhbmNlIiwiYm94QW5jaG9yUG9pbnQiLCJzdWIiLCJfdW5pdCIsIl9tdWx0IiwicGFkZGVkQW5jaG9yRGlzdGFuY2UiLCJtb2R1bGUiLCJUaW55UXVldWUiLCJkYXRhIiwiY29tcGFyZSIsImRlZmF1bHRDb21wYXJlIiwiX2Rvd24iLCJwcm90b3R5cGUiLCJpdGVtIiwiX3VwIiwicG9wIiwicGVlayIsInBvcyIsInBhcmVudCIsImhhbGZMZW5ndGgiLCJiZXN0IiwiY29tcGFyZU1heCIsIkNlbGwiLCJwb2x5Z29uIiwiZCIsInBvaW50VG9Qb2x5Z29uRGlzdCIsIlNRUlQyIiwiaW5zaWRlIiwibWluRGlzdFNxIiwiSW5maW5pdHkiLCJyaW5nIiwibGVuIiwiaiIsImRpc3RUb1NlZ21lbnRTcXVhcmVkIiwic3FydCIsImdldENlbnRyb2lkQ2VsbCIsImFyZWEiLCJwb2ludHMiLCJmIiwibXVybXVyaGFzaDNfMzJfZ2MiLCJzZWVkIiwicmVtYWluZGVyIiwiYnl0ZXMiLCJoMSIsImgxYiIsImMxIiwiYzFiIiwiYzIiLCJjMmIiLCJrMSIsImNoYXJDb2RlQXQiLCJtdXJtdXJoYXNoMl8zMl9nYyIsIm11cm11cjMiLCJtdXJtdXIyIiwicGVyZm9ybVN5bWJvbExheW91dCIsImJ1Y2tldCIsImdseXBoTWFwIiwiaW1hZ2VNYXAiLCJpbWFnZVBvc2l0aW9ucyIsInNob3dDb2xsaXNpb25Cb3hlcyIsImNyZWF0ZUFycmF5cyIsInRpbGVTaXplIiwidGlsZVBpeGVsUmF0aW8iLCJFWFRFTlQiLCJjb21wYXJlVGV4dCIsImljb25zTmVlZExpbmVhciIsInVuZXZhbHVhdGVkTGF5b3V0VmFsdWVzIiwiX3VuZXZhbHVhdGVkTGF5b3V0IiwiX3ZhbHVlcyIsInNpemVzIiwidGV4dFNpemVEYXRhIiwiZnVuY3Rpb25UeXBlIiwiem9vbVJhbmdlIiwiY29tcG9zaXRlVGV4dFNpemVzIiwicG9zc2libHlFdmFsdWF0ZSIsIkV2YWx1YXRpb25QYXJhbWV0ZXJzIiwiaWNvblNpemVEYXRhIiwiY29tcG9zaXRlSWNvblNpemVzIiwibGF5b3V0VGV4dFNpemUiLCJ6b29tIiwibGF5b3V0SWNvblNpemUiLCJ0ZXh0TWF4U2l6ZSIsImxpbmVIZWlnaHQiLCJ0ZXh0QWxvbmdMaW5lIiwia2VlcFVwcmlnaHQiLCJmZWF0dXJlcyIsImZvbnRzdGFjayIsImpvaW4iLCJnbHlwaFBvc2l0aW9uTWFwIiwic2hhcGVkVGV4dE9yaWVudGF0aW9ucyIsInRleHQiLCJ1bmZvcm1hdHRlZFRleHQiLCJ0b1N0cmluZyIsInNwYWNpbmdJZkFsbG93ZWQiLCJhbGxvd3NMZXR0ZXJTcGFjaW5nIiwidGV4dEFuY2hvciIsInRleHRKdXN0aWZ5IiwibWF4V2lkdGgiLCJob3Jpem9udGFsIiwic2hhcGVUZXh0IiwiV3JpdGluZ01vZGUiLCJhbGxvd3NWZXJ0aWNhbFdyaXRpbmdNb2RlIiwiaWNvbiIsInNoYXBlSWNvbiIsInNkZkljb25zIiwic2RmIiwid2Fybk9uY2UiLCJjb25zdGFudE9yIiwiYWRkRmVhdHVyZSIsImdlbmVyYXRlQ29sbGlzaW9uRGVidWdCdWZmZXJzIiwiaWNvbk9mZnNldCIsImZvbnRTY2FsZSIsInRleHRCb3hTY2FsZSIsInRleHRNYXhCb3hTY2FsZSIsImljb25Cb3hTY2FsZSIsInN5bWJvbE1pbkRpc3RhbmNlIiwidGV4dFBhZGRpbmciLCJpY29uUGFkZGluZyIsInRleHRNYXhBbmdsZSIsImljb25BbG9uZ0xpbmUiLCJzeW1ib2xQbGFjZW1lbnQiLCJ0ZXh0UmVwZWF0RGlzdGFuY2UiLCJhZGRTeW1ib2xBdEFuY2hvciIsImFkZFN5bWJvbCIsImdlb21ldHJ5IiwiYW5jaG9ySXNUb29DbG9zZSIsImNsYXNzaWZ5UmluZ3MiLCJwb2kiLCJmaW5kUG9sZU9mSW5hY2Nlc3NpYmlsaXR5IiwicG9pbnQiLCJNQVhfUEFDS0VEX1NJWkUiLCJhZGRUZXh0VmVydGljZXMiLCJsaW5lQXJyYXkiLCJwbGFjZWRUZXh0U3ltYm9sSW5kaWNlcyIsImdseXBoUXVhZHMiLCJzaXplRGF0YSIsIlNJWkVfUEFDS19GQUNUT1IiLCJsYXllcklkcyIsImFkZFN5bWJvbHMiLCJsaW5lU3RhcnRJbmRleCIsInBsYWNlZFN5bWJvbEFycmF5IiwiYWRkVG9MaW5lVmVydGV4QXJyYXkiLCJ0ZXh0Q29sbGlzaW9uRmVhdHVyZSIsImljb25Db2xsaXNpb25GZWF0dXJlIiwibnVtSWNvblZlcnRpY2VzIiwibnVtR2x5cGhWZXJ0aWNlcyIsIm51bVZlcnRpY2FsR2x5cGhWZXJ0aWNlcyIsImhvcml6b250YWxPbmx5IiwidGV4dEJveFN0YXJ0SW5kZXgiLCJ0ZXh0Qm94RW5kSW5kZXgiLCJpY29uUXVhZHMiLCJpY29uUm90YXRlIiwiaWNvbkJveFN0YXJ0SW5kZXgiLCJpY29uQm94RW5kSW5kZXgiLCJnbHlwaE9mZnNldEFycmF5IiwiU3ltYm9sQnVja2V0IiwiTUFYX0dMWVBIUyIsInN5bWJvbEluc3RhbmNlcyIsInJlcGVhdERpc3RhbmNlIiwib3RoZXJBbmNob3JzIiwiR2x5cGhBdGxhcyIsInN0YWNrcyIsImJpbnMiLCJzdGFjayIsImdseXBocyIsInN0YWNrUG9zaXRpb25zIiwic3JjIiwiYml0bWFwIiwiYmluIiwicG90cGFjayIsIkFscGhhSW1hZ2UiLCJjb3B5IiwicmVnaXN0ZXIiLCJXb3JrZXJUaWxlIiwicGFyYW1zIiwidGlsZUlEIiwiT3ZlcnNjYWxlZFRpbGVJRCIsIm92ZXJzY2FsZWRaIiwid3JhcCIsImNhbm9uaWNhbCIsInoiLCJ1aWQiLCJvdmVyc2NhbGVGYWN0b3IiLCJjb2xsZWN0UmVzb3VyY2VUaW1pbmciLCJyZXR1cm5EZXBlbmRlbmNpZXMiLCJwYXJzZSIsImxheWVySW5kZXgiLCJhY3RvciIsImNhbGxiYWNrIiwic3RhdHVzIiwiQ29sbGlzaW9uQm94QXJyYXkiLCJzb3VyY2VMYXllckNvZGVyIiwiRGljdGlvbmFyeUNvZGVyIiwiRmVhdHVyZUluZGV4IiwiYnVja2V0TGF5ZXJJRHMiLCJidWNrZXRzIiwib3B0aW9ucyIsImljb25EZXBlbmRlbmNpZXMiLCJwYXR0ZXJuRGVwZW5kZW5jaWVzIiwiZ2x5cGhEZXBlbmRlbmNpZXMiLCJsYXllckZhbWlsaWVzIiwidmVyc2lvbiIsImVuY29kZSIsImZhbWlseSIsIm1pbnpvb20iLCJtYXh6b29tIiwicmVjYWxjdWxhdGVMYXllcnMiLCJjcmVhdGVCdWNrZXQiLCJzb3VyY2VJRCIsInBvcHVsYXRlIiwiZXJyb3IiLCJpY29uTWFwIiwicGF0dGVybk1hcCIsIm1hcE9iamVjdCIsIk51bWJlciIsInNlbmQiLCJlcnIiLCJtYXliZVByZXBhcmUiLCJjYWxsIiwiaWNvbnMiLCJwYXR0ZXJucyIsImdseXBoQXRsYXMiLCJpbWFnZUF0bGFzIiwiSW1hZ2VBdGxhcyIsImljb25Qb3NpdGlvbnMiLCJoYXNQYXR0ZXJuIiwiTGluZUJ1Y2tldCIsIkZpbGxCdWNrZXQiLCJGaWxsRXh0cnVzaW9uQnVja2V0IiwiYWRkRmVhdHVyZXMiLCJwYXR0ZXJuUG9zaXRpb25zIiwiaXNFbXB0eSIsImdseXBoQXRsYXNJbWFnZSIsInBhcmFtZXRlcnMiLCJyZWNhbGN1bGF0ZSIsInBlcmZvcm1hbmNlRXhpc3RzIiwicGVyZm9ybWFuY2UiLCJ3cmFwcGVyIiwiZ2V0RW50cmllc0J5TmFtZSIsInVybCIsIm1hcmsiLCJuYW1lIiwibWVhc3VyZSIsInN0YXJ0TWFyayIsImVuZE1hcmsiLCJjbGVhck1hcmtzIiwiY2xlYXJNZWFzdXJlcyIsIlBlcmZvcm1hbmNlIiwicmVxdWVzdCIsIl9tYXJrcyIsInN0YXJ0IiwiZW5kIiwiZmluaXNoIiwicmVzb3VyY2VUaW1pbmdEYXRhIiwibG9hZFZlY3RvclRpbGUiLCJnZXRBcnJheUJ1ZmZlciIsImNhY2hlQ29udHJvbCIsImV4cGlyZXMiLCJ2ZWN0b3JUaWxlIiwidnQiLCJWZWN0b3JUaWxlIiwiUHJvdG9idWYiLCJyYXdEYXRhIiwiY2FuY2VsIiwiVmVjdG9yVGlsZVdvcmtlclNvdXJjZSIsImxvYWRWZWN0b3JEYXRhIiwibG9hZGluZyIsImxvYWRlZCIsImxvYWRUaWxlIiwicGVyZiIsIndvcmtlclRpbGUiLCJhYm9ydCIsInJlc3BvbnNlIiwidGhpcyQxIiwicmF3VGlsZURhdGEiLCJyZXNvdXJjZVRpbWluZyIsImV4dGVuZCIsInNsaWNlIiwicmVsb2FkVGlsZSIsInZ0U291cmNlIiwiZG9uZSIsInJlbG9hZENhbGxiYWNrIiwiYWJvcnRUaWxlIiwicmVtb3ZlVGlsZSIsIlJhc3RlckRFTVRpbGVXb3JrZXJTb3VyY2UiLCJlbmNvZGluZyIsInJhd0ltYWdlRGF0YSIsImRlbSIsIkRFTURhdGEiLCJyaW5nQXJlYSIsIl8iLCJwb2x5Z29uQXJlYSIsImNvb3JkaW5hdGVzIiwiZ2VvbWV0cmllcyIsImNvb3JkcyIsInAyIiwicDMiLCJsb3dlckluZGV4IiwibWlkZGxlSW5kZXgiLCJ1cHBlckluZGV4IiwiY29vcmRzTGVuZ3RoIiwicmFkIiwid2dzODQiLCJSQURJVVMiLCJyZXdpbmQiLCJnaiIsIm91dGVyIiwiY3VycnlPdXRlciIsImNvcnJlY3QiLCJjb3JyZWN0UmluZ3MiLCJ3aW5kIiwiZGlyIiwiY3ciLCJyZXZlcnNlIiwiZ2VvanNvbkFyZWEiLCJ0b0dlb0pTT04iLCJtdnQiLCJWZWN0b3JUaWxlRmVhdHVyZSIsIkZlYXR1cmVXcmFwcGVyIiwiX2ZlYXR1cmUiLCJleHRlbnQiLCJwcm9wZXJ0aWVzIiwidGFncyIsImlzTmFOIiwicGFyc2VJbnQiLCJsb2FkR2VvbWV0cnkiLCJuZXdSaW5nIiwiR2VvSlNPTldyYXBwZXIiLCJfZmVhdHVyZXMiLCJyZXF1aXJlIiwicmF3R2VvbWV0cnkiLCJyaW5ncyIsImJib3giLCJjb29yZCIsImZyb21WZWN0b3JUaWxlSnMiLCJmcm9tR2VvanNvblZ0IiwidGlsZSIsIm91dCIsIlBiZiIsIndyaXRlVGlsZSIsInBiZiIsIndyaXRlTWVzc2FnZSIsIndyaXRlTGF5ZXIiLCJ3cml0ZVZhcmludEZpZWxkIiwid3JpdGVTdHJpbmdGaWVsZCIsImNvbnRleHQiLCJrZXljYWNoZSIsInZhbHVlY2FjaGUiLCJ3cml0ZUZlYXR1cmUiLCJ3cml0ZVZhbHVlIiwid3JpdGVQcm9wZXJ0aWVzIiwid3JpdGVHZW9tZXRyeSIsImtleUluZGV4Iiwid3JpdGVWYXJpbnQiLCJ2YWx1ZSIsInZhbHVlS2V5IiwidmFsdWVJbmRleCIsImNvbW1hbmQiLCJjbWQiLCJ6aWd6YWciLCJudW0iLCJyIiwiY291bnQiLCJsaW5lQ291bnQiLCJkeCIsImR5Iiwid3JpdGVCb29sZWFuRmllbGQiLCJ3cml0ZURvdWJsZUZpZWxkIiwid3JpdGVTVmFyaW50RmllbGQiLCJzb3J0S0QiLCJpZHMiLCJub2RlU2l6ZSIsImRlcHRoIiwibSIsInNlbGVjdCIsImluYyIsIm4iLCJzIiwiZXhwIiwic2QiLCJuZXdMZWZ0IiwibmV3UmlnaHQiLCJzd2FwSXRlbSIsInN3YXAiLCJhcnIiLCJ0bXAiLCJyYW5nZSIsIm1pblgiLCJtaW5ZIiwibWF4WCIsIm1heFkiLCJheGlzIiwibmV4dEF4aXMiLCJ3aXRoaW4iLCJxeCIsInF5IiwicjIiLCJzcURpc3QiLCJheCIsImF5IiwiYngiLCJieSIsImtkYnVzaCIsImdldFgiLCJnZXRZIiwiQXJyYXlUeXBlIiwiS0RCdXNoIiwiZGVmYXVsdEdldFgiLCJkZWZhdWx0R2V0WSIsInN1cGVyY2x1c3RlciIsIlN1cGVyQ2x1c3RlciIsImNyZWF0ZSIsInRyZWVzIiwibWF4Wm9vbSIsIm1pblpvb20iLCJyYWRpdXMiLCJyZWR1Y2UiLCJpbml0aWFsIiwicHJvcHMiLCJsb2FkIiwiY29uc29sZSIsInRpbWUiLCJ0aW1lcklkIiwiY2x1c3RlcnMiLCJjcmVhdGVQb2ludENsdXN0ZXIiLCJGbG9hdDMyQXJyYXkiLCJ0aW1lRW5kIiwibm93IiwiRGF0ZSIsIl9jbHVzdGVyIiwiZ2V0Q2x1c3RlcnMiLCJtaW5MbmciLCJtaW5MYXQiLCJtYXhMbmciLCJtYXhMYXQiLCJlYXN0ZXJuSGVtIiwid2VzdGVybkhlbSIsImNvbmNhdCIsInRyZWUiLCJfbGltaXRab29tIiwibG5nWCIsImxhdFkiLCJjIiwibnVtUG9pbnRzIiwiZ2V0Q2x1c3RlckpTT04iLCJnZXRDaGlsZHJlbiIsImNsdXN0ZXJJZCIsIm9yaWdpbklkIiwib3JpZ2luWm9vbSIsImVycm9yTXNnIiwiRXJyb3IiLCJvcmlnaW4iLCJwb3ciLCJjaGlsZHJlbiIsInBhcmVudElkIiwiZ2V0TGVhdmVzIiwibGltaXQiLCJsZWF2ZXMiLCJfYXBwZW5kTGVhdmVzIiwiZ2V0VGlsZSIsInoyIiwiX2FkZFRpbGVGZWF0dXJlcyIsImdldENsdXN0ZXJFeHBhbnNpb25ab29tIiwiY2x1c3Rlclpvb20iLCJjbHVzdGVyX2lkIiwic2tpcHBlZCIsImNsdXN0ZXIiLCJwb2ludF9jb3VudCIsInJvdW5kIiwiZ2V0Q2x1c3RlclByb3BlcnRpZXMiLCJuZWlnaGJvcklkcyIsInd4Iiwid3kiLCJjbHVzdGVyUHJvcGVydGllcyIsIl9hY2N1bXVsYXRlIiwibnVtUG9pbnRzMiIsImNyZWF0ZUNsdXN0ZXIiLCJ4TG5nIiwieUxhdCIsImFiYnJldiIsInBvaW50X2NvdW50X2FiYnJldmlhdGVkIiwibG5nIiwibGF0IiwiYXRhbiIsImRlc3QiLCJzaW1wbGlmeSIsImZpcnN0IiwibGFzdCIsInNxVG9sZXJhbmNlIiwibWF4U3FEaXN0IiwibWlkIiwibWluUG9zVG9NaWQiLCJnZXRTcVNlZ0Rpc3QiLCJwb3NUb01pZCIsInB4IiwicHkiLCJjcmVhdGVGZWF0dXJlIiwiZ2VvbSIsImNhbGNCQm94IiwiY2FsY0xpbmVCQm94IiwiY29udmVydCIsImNvbnZlcnRGZWF0dXJlIiwiZ2VvanNvbiIsInRvbGVyYW5jZSIsInByb21vdGVJZCIsImdlbmVyYXRlSWQiLCJjb252ZXJ0UG9pbnQiLCJjb252ZXJ0TGluZSIsImxpbmVNZXRyaWNzIiwiY29udmVydExpbmVzIiwicHJvamVjdFgiLCJwcm9qZWN0WSIsImlzUG9seWdvbiIsIngwIiwieTAiLCJjbGlwIiwiazIiLCJtaW5BbGwiLCJtYXhBbGwiLCJjbGlwcGVkIiwibmV3R2VvbWV0cnkiLCJjbGlwUG9pbnRzIiwiY2xpcExpbmVzIiwibmV3R2VvbSIsInRyYWNrTWV0cmljcyIsIm5ld1NsaWNlIiwiaW50ZXJzZWN0IiwiaW50ZXJzZWN0WCIsImludGVyc2VjdFkiLCJzZWdMZW4iLCJheiIsImV4aXRlZCIsImFkZFBvaW50IiwiYnVmZmVyIiwibWVyZ2VkIiwic2hpZnRGZWF0dXJlQ29vcmRzIiwibmV3RmVhdHVyZXMiLCJzaGlmdENvb3JkcyIsIm5ld1BvbHlnb24iLCJuZXdQb2ludHMiLCJ0cmFuc2Zvcm1UaWxlIiwidHJhbnNmb3JtZWQiLCJ0eCIsInR5IiwidHJhbnNmb3JtUG9pbnQiLCJjcmVhdGVUaWxlIiwibnVtU2ltcGxpZmllZCIsIm51bUZlYXR1cmVzIiwic2ltcGxpZmllZCIsImFkZExpbmUiLCJ0aWxlRmVhdHVyZSIsImlzT3V0ZXIiLCJjbG9ja3dpc2UiLCJnZW9qc29udnQiLCJHZW9KU09OVlQiLCJkZWJ1ZyIsInRpbGVzIiwidGlsZUNvb3JkcyIsImluZGV4TWF4Wm9vbSIsImluZGV4TWF4UG9pbnRzIiwic3RhdHMiLCJ0b3RhbCIsInNwbGl0VGlsZSIsImN6IiwiY3giLCJjeSIsInRvSUQiLCJrMyIsIms0IiwidHJhbnNmb3JtIiwiejAiLCJsb2FkR2VvSlNPTlRpbGUiLCJfZ2VvSlNPTkluZGV4IiwiZ2VvSlNPTlRpbGUiLCJnZW9qc29uV3JhcHBlciIsInZ0cGJmIiwiYnl0ZU9mZnNldCIsImJ5dGVMZW5ndGgiLCJVaW50OEFycmF5IiwiR2VvSlNPTldvcmtlclNvdXJjZSIsImxvYWRHZW9KU09OIiwic3VwZXIiLCJsb2FkRGF0YSIsIl9wZW5kaW5nQ2FsbGJhY2siLCJhYmFuZG9uZWQiLCJfcGVuZGluZ0xvYWREYXRhUGFyYW1zIiwiX3N0YXRlIiwiX2xvYWREYXRhIiwic3VwZXJjbHVzdGVyT3B0aW9ucyIsImdlb2pzb25WdE9wdGlvbnMiLCJjb2FsZXNjZSIsImdldEpTT04iLCJlIiwicmVtb3ZlU291cmNlIiwiZ2V0Q2x1c3RlckNoaWxkcmVuIiwiZ2V0Q2x1c3RlckxlYXZlcyIsIldvcmtlciIsInNlbGYiLCJBY3RvciIsImxheWVySW5kZXhlcyIsIndvcmtlclNvdXJjZVR5cGVzIiwidmVjdG9yIiwid29ya2VyU291cmNlcyIsImRlbVdvcmtlclNvdXJjZXMiLCJyZWdpc3RlcldvcmtlclNvdXJjZSIsIldvcmtlclNvdXJjZSIsInJlZ2lzdGVyUlRMVGV4dFBsdWdpbiIsInJ0bFRleHRQbHVnaW4iLCJnbG9iYWxSVExUZXh0UGx1Z2luIiwiaXNMb2FkZWQiLCJhcHBseUFyYWJpY1NoYXBpbmciLCJwcm9jZXNzQmlkaXJlY3Rpb25hbFRleHQiLCJwcm9jZXNzU3R5bGVkQmlkaXJlY3Rpb25hbFRleHQiLCJzZXRSZWZlcnJlciIsIm1hcElEIiwicmVmZXJyZXIiLCJzZXRMYXllcnMiLCJtYXBJZCIsImdldExheWVySW5kZXgiLCJ1cGRhdGVMYXllcnMiLCJnZXRXb3JrZXJTb3VyY2UiLCJsb2FkREVNVGlsZSIsImdldERFTVdvcmtlclNvdXJjZSIsInJlbW92ZURFTVRpbGUiLCJ3b3JrZXIiLCJsb2FkV29ya2VyU291cmNlIiwiaW1wb3J0U2NyaXB0cyIsImxvYWRSVExUZXh0UGx1Z2luIiwicGx1Z2luVVJMIiwiV29ya2VyR2xvYmFsU2NvcGUiXSwibWFwcGluZ3MiOiI7O0FBR0EsU0FBU0EsU0FBVCxDQUFtQkMsR0FBbkIsRUFBd0I7SUFDcEJDLElBQU1DLElBQUEsR0FBTyxPQUFPRixHQUFwQkMsQ0FEb0I7SUFFcEIsSUFBSUMsSUFBQSxLQUFTLFFBQVQsSUFBcUJBLElBQUEsS0FBUyxTQUE5QixJQUEyQ0EsSUFBQSxLQUFTLFFBQXBELElBQWdFRixHQUFBLEtBQVFHLFNBQXhFLElBQXFGSCxHQUFBLEtBQVEsSUFBakc7UUFDSSxPQUFPSSxJQUFBLENBQUtMLFNBQUwsQ0FBZUMsR0FBZixDQUFQO0tBSGdCO0lBS3BCLElBQUlLLEtBQUEsQ0FBTUMsT0FBTixDQUFjTixHQUFkLENBQUosRUFBd0I7UUFDcEJPLElBQUlDLEtBQUFBLEdBQU0sR0FBVkQsQ0FEb0I7UUFFcEIsS0FBSyxXQUFBLFNBQWFQLEdBQWIsbUJBQUwsVUFBQSxFQUF1QjtZQUFsQkMsSUFBTVEsR0FBQSxZQUFOUixDQUFrQjtZQUNuQk8sS0FBQUEsSUFBVVQsU0FBQSxDQUFVVSxHQUFWLENBQUgsTUFBUEQsQ0FEbUI7U0FGSDtRQUtwQixPQUFVQSxLQUFBQSxNQUFWLENBTG9CO0tBTEo7SUFhcEJQLElBQU1TLElBQUEsR0FBT0MsTUFBQSxDQUFPRCxJQUFQLENBQVlWLEdBQVosRUFBaUJZLElBQWpCLEVBQWJYLENBYm9CO0lBZXBCTSxJQUFJQyxHQUFBLEdBQU0sR0FBVkQsQ0Fmb0I7SUFnQnBCLEtBQUtBLElBQUlNLENBQUEsR0FBSSxDQUFSTixFQUFXTSxDQUFBLEdBQUlILElBQUEsQ0FBS0ksTUFBekIsRUFBaUNELENBQUEsRUFBakMsRUFBc0M7UUFDbENMLEdBQUEsSUFBVUosSUFBQSxDQUFLTCxT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
