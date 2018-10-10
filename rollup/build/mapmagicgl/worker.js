define(['./shared.js'], function (__chunk_1) { 'use strict';

function stringify(obj) {
    var type = typeof obj;
    if (type === 'number' || type === 'boolean' || type === 'string' || obj === undefined || obj === null)
        { return JSON.stringify(obj); }

    if (Array.isArray(obj)) {
        var str$1 = '[';
        for (var i$1 = 0, list = obj; i$1 < list.length; i$1 += 1) {
            var val = list[i$1];

            str$1 += (stringify(val)) + ",";
        }
        return (str$1 + "]");
    }

    var keys = Object.keys(obj).sort();

    var str = '{';
    for (var i = 0; i < keys.length; i++) {
        str += (JSON.stringify(keys[i])) + ":" + (stringify(obj[keys[i]])) + ",";
    }
    return (str + "}");
}

function getKey(layer) {
    var key = '';
    for (var i = 0, list = __chunk_1.refProperties; i < list.length; i += 1) {
        var k = list[i];

        key += "/" + (stringify(layer[k]));
    }
    return key;
}

/**
 * Given an array of layers, return an array of arrays of layers where all
 * layers in each group have identical layout-affecting properties. These
 * are the properties that were formerly used by explicit `ref` mechanism
 * for layers: 'type', 'source', 'source-layer', 'minzoom', 'maxzoom',
 * 'filter', and 'layout'.
 *
 * The input is not modified. The output layers are references to the
 * input layers.
 *
 * @private
 * @param {Array<Layer>} layers
 * @returns {Array<Array<Layer>>}
 */
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

//      

                                                                     
                                                            

                                                            
                                                          

var StyleLayerIndex = function StyleLayerIndex(layerConfigs                        ) {
    if (layerConfigs) {
        this.replace(layerConfigs);
    }
};

StyleLayerIndex.prototype.replace = function replace (layerConfigs                       ) {
    this._layerConfigs = {};
    this._layers = {};
    this.update(layerConfigs, []);
};

StyleLayerIndex.prototype.update = function update (layerConfigs                       , removedIds           ) {
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

            var layers = layerConfigs$1.map(function (layerConfig) { return this$1._layers[layerConfig.id]; });

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

//      

                                                
                                   

/**
 * Labels placed around really sharp angles aren't readable. Check if any
 * part of the potential label has a combined angle that is too big.
 *
 * @param line
 * @param anchor The point on the line around which the label is anchored.
 * @param labelLength The length of the label in geometry units.
 * @param windowSize The check fails if the combined angles within a part of the line that is `windowSize` long is too big.
 * @param maxAngle The maximum combined angle that any window along the label is allowed to have.
 *
 * @returns {boolean} whether the label should be placed
 * @private
 */
function checkMaxAngle(line              , anchor        , labelLength        , windowSize        , maxAngle        ) {

    // horizontal labels always pass
    if (anchor.segment === undefined) { return true; }

    var p = anchor;
    var index = anchor.segment + 1;
    var anchorDistance = 0;

    // move backwards along the line to the first segment the label appears on
    while (anchorDistance > -labelLength / 2) {
        index--;

        // there isn't enough room for the label after the beginning of the line
        if (index < 0) { return false; }

        anchorDistance -= line[index].dist(p);
        p = line[index];
    }

    anchorDistance += line[index].dist(line[index + 1]);
    index++;

    // store recent corners and their total angle difference
    var recentCorners = [];
    var recentAngleDelta = 0;

    // move forwards by the length of the label and check angles along the way
    while (anchorDistance < labelLength / 2) {
        var prev = line[index - 1];
        var current = line[index];
        var next = line[index + 1];

        // there isn't enough room for the label before the end of the line
        if (!next) { return false; }

        var angleDelta = prev.angleTo(current) - current.angleTo(next);
        // restrict angle to -pi..pi range
        angleDelta = Math.abs(((angleDelta + 3 * Math.PI) % (Math.PI * 2)) - Math.PI);

        recentCorners.push({
            distance: anchorDistance,
            angleDelta: angleDelta
        });
        recentAngleDelta += angleDelta;

        // remove corners that are far enough away from the list of recent anchors
        while (anchorDistance - recentCorners[0].distance > windowSize) {
            recentAngleDelta -= recentCorners.shift().angleDelta;
        }

        // the sum of angles within the window area exceeds the maximum allowed value. check fails.
        if (recentAngleDelta > maxAngle) { return false; }

        index++;
        anchorDistance += current.dist(next);
    }

    // no part of the line had an angle greater than the maximum allowed. check passes.
    return true;
}

//      

function getLineLength(line              )         {
    var lineLength = 0;
    for (var k = 0; k < line.length - 1; k++) {
        lineLength += line[k].dist(line[k + 1]);
    }
    return lineLength;
}

function getAngleWindowSize(shapedText          ,
                            glyphSize        ,
                            boxScale        )         {
    return shapedText ?
        3 / 5 * glyphSize * boxScale :
        0;
}

function getShapedLabelLength(shapedText          , shapedIcon                 )         {
    return Math.max(
        shapedText ? shapedText.right - shapedText.left : 0,
        shapedIcon ? shapedIcon.right - shapedIcon.left : 0);
}

function getCenterAnchor(line              ,
                         maxAngle        ,
                         shapedText          ,
                         shapedIcon                 ,
                         glyphSize        ,
                         boxScale        ) {
    var angleWindowSize = getAngleWindowSize(shapedText, glyphSize, boxScale);
    var labelLength = getShapedLabelLength(shapedText, shapedIcon) * boxScale;

    var prevDistance = 0;
    var centerDistance = getLineLength(line) / 2;

    for (var i = 0; i < line.length - 1; i++) {

        var a = line[i],
            b = line[i + 1];

        var segmentDistance = a.dist(b);

        if (prevDistance + segmentDistance > centerDistance) {
            // The center is on this segment
            var t = (centerDistance - prevDistance) / segmentDistance,
                x = __chunk_1.number(a.x, b.x, t),
                y = __chunk_1.number(a.y, b.y, t);

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

function getAnchors(line              ,
                    spacing        ,
                    maxAngle        ,
                    shapedText          ,
                    shapedIcon                 ,
                    glyphSize        ,
                    boxScale        ,
                    overscaling        ,
                    tileExtent        ) {

    // Resample a line to get anchor points for labels and check that each
    // potential label passes text-max-angle check and has enough froom to fit
    // on the line.

    var angleWindowSize = getAngleWindowSize(shapedText, glyphSize, boxScale);
    var shapedLabelLength = getShapedLabelLength(shapedText, shapedIcon);
    var labelLength = shapedLabelLength * boxScale;

    // Is the line continued from outside the tile boundary?
    var isLineContinued = line[0].x === 0 || line[0].x === tileExtent || line[0].y === 0 || line[0].y === tileExtent;

    // Is the label long, relative to the spacing?
    // If so, adjust the spacing so there is always a minimum space of `spacing / 4` between label edges.
    if (spacing - labelLength < spacing / 4) {
        spacing = labelLength + spacing / 4;
    }

    // Offset the first anchor by:
    // Either half the label length plus a fixed extra offset if the line is not continued
    // Or half the spacing if the line is continued.

    // For non-continued lines, add a bit of fixed extra offset to avoid collisions at T intersections.
    var fixedExtraOffset = glyphSize * 2;

    var offset = !isLineContinued ?
        ((shapedLabelLength / 2 + fixedExtraOffset) * boxScale * overscaling) % spacing :
        (spacing / 2 * overscaling) % spacing;

    return resample(line, offset, spacing, angleWindowSize, maxAngle, labelLength, isLineContinued, false, tileExtent);
}


function resample(line, offset, spacing, angleWindowSize, maxAngle, labelLength, isLineContinued, placeAtMiddle, tileExtent) {

    var halfLabelLength = labelLength / 2;
    var lineLength = getLineLength(line);

    var distance = 0,
        markedDistance = offset - spacing;

    var anchors = [];

    for (var i = 0; i < line.length - 1; i++) {

        var a = line[i],
            b = line[i + 1];

        var segmentDist = a.dist(b),
            angle = b.angleTo(a);

        while (markedDistance + spacing < distance + segmentDist) {
            markedDistance += spacing;

            var t = (markedDistance - distance) / segmentDist,
                x = __chunk_1.number(a.x, b.x, t),
                y = __chunk_1.number(a.y, b.y, t);

            // Check that the point is within the tile boundaries and that
            // the label would fit before the beginning and end of the line
            // if placed at this point.
            if (x >= 0 && x < tileExtent && y >= 0 && y < tileExtent &&
                    markedDistance - halfLabelLength >= 0 &&
                    markedDistance + halfLabelLength <= lineLength) {
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
        // The first attempt at finding anchors at which labels can be placed failed.
        // Try again, but this time just try placing one anchor at the middle of the line.
        // This has the most effect for short lines in overscaled tiles, since the
        // initial offset used in overscaled tiles is calculated to align labels with positions in
        // parent tiles instead of placing the label as close to the beginning as possible.
        anchors = resample(line, distance / 2, spacing, angleWindowSize, maxAngle, labelLength, isLineContinued, true, tileExtent);
    }

    return anchors;
}

//      

/**
 * Returns the part of a multiline that intersects with the provided rectangular box.
 *
 * @param lines
 * @param x1 the left edge of the box
 * @param y1 the top edge of the box
 * @param x2 the right edge of the box
 * @param y2 the bottom edge of the box
 * @returns lines
 * @private
 */
function clipLine(lines                     , x1        , y1        , x2        , y2        )                      {
    var clippedLines = [];

    for (var l = 0; l < lines.length; l++) {
        var line = lines[l];
        var clippedLine = (void 0);

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

//      

                                   
                                                       
                                                                            
                                                      
                                                         

/**
 * A textured quad for rendering a single icon or glyph.
 *
 * The zoom range the glyph can be shown is defined by minScale and maxScale.
 *
 * @param tl The offset of the top left corner from the anchor.
 * @param tr The offset of the top right corner from the anchor.
 * @param bl The offset of the bottom left corner from the anchor.
 * @param br The offset of the bottom right corner from the anchor.
 * @param tex The texture coordinates.
 *
 * @private
 */
                          
              
              
              
              
          
                  
                  
                  
                 
      
                            
                                 
  

/**
 * Create the quads used for rendering an icon.
 * @private
 */
function getIconQuads(anchor        ,
                      shapedIcon                ,
                      layer                  ,
                      alongLine         ,
                      shapedText         ,
                      feature         )                    {
    var image = shapedIcon.image;
    var layout = layer.layout;

    // If you have a 10px icon that isn't perfectly aligned to the pixel grid it will cover 11 actual
    // pixels. The quad needs to be padded to account for this, otherwise they'll look slightly clipped
    // on one edge in some cases.
    var border = 1;

    var top = shapedIcon.top - border / image.pixelRatio;
    var left = shapedIcon.left - border / image.pixelRatio;
    var bottom = shapedIcon.bottom + border / image.pixelRatio;
    var right = shapedIcon.right + border / image.pixelRatio;
    var tl, tr, br, bl;

    // text-fit mode
    if (layout.get('icon-text-fit') !== 'none' && shapedText) {
        var iconWidth = (right - left),
            iconHeight = (bottom - top),
            size = layout.get('text-size').evaluate(feature, {}) / 24,
            textLeft = shapedText.left * size,
            textRight = shapedText.right * size,
            textTop = shapedText.top * size,
            textBottom = shapedText.bottom * size,
            textWidth = textRight - textLeft,
            textHeight = textBottom - textTop,
            padT = layout.get('icon-text-fit-padding')[0],
            padR = layout.get('icon-text-fit-padding')[1],
            padB = layout.get('icon-text-fit-padding')[2],
            padL = layout.get('icon-text-fit-padding')[3],
            offsetY = layout.get('icon-text-fit') === 'width' ? (textHeight - iconHeight) * 0.5 : 0,
            offsetX = layout.get('icon-text-fit') === 'height' ? (textWidth - iconWidth) * 0.5 : 0,
            width = layout.get('icon-text-fit') === 'width' || layout.get('icon-text-fit') === 'both' ? textWidth : iconWidth,
            height = layout.get('icon-text-fit') === 'height' || layout.get('icon-text-fit') === 'both' ? textHeight : iconHeight;
        tl = new __chunk_1.Point(textLeft + offsetX - padL,         textTop + offsetY - padT);
        tr = new __chunk_1.Point(textLeft + offsetX + padR + width, textTop + offsetY - padT);
        br = new __chunk_1.Point(textLeft + offsetX + padR + width, textTop + offsetY + padB + height);
        bl = new __chunk_1.Point(textLeft + offsetX - padL,         textTop + offsetY + padB + height);
    // Normal icon size mode
    } else {
        tl = new __chunk_1.Point(left, top);
        tr = new __chunk_1.Point(right, top);
        br = new __chunk_1.Point(right, bottom);
        bl = new __chunk_1.Point(left, bottom);
    }

    var angle = layer.layout.get('icon-rotate').evaluate(feature, {}) * Math.PI / 180;

    if (angle) {
        var sin = Math.sin(angle),
            cos = Math.cos(angle),
            matrix = [cos, -sin, sin, cos];

        tl._matMult(matrix);
        tr._matMult(matrix);
        bl._matMult(matrix);
        br._matMult(matrix);
    }

    // Icon quad is padded, so texture coordinates also need to be padded.
    return [{tl: tl, tr: tr, bl: bl, br: br, tex: image.paddedRect, writingMode: undefined, glyphOffset: [0, 0]}];
}

/**
 * Create the quads used for rendering a text label.
 * @private
 */
function getGlyphQuads(anchor        ,
                       shaping         ,
                       layer                  ,
                       alongLine         ,
                       feature         ,
                       positions                                       )                    {

    var oneEm = 24;
    var textRotate = layer.layout.get('text-rotate').evaluate(feature, {}) * Math.PI / 180;
    var textOffset = layer.layout.get('text-offset').evaluate(feature, {}).map(function (t){ return t * oneEm; });

    var positionedGlyphs = shaping.positionedGlyphs;
    var quads = [];


    for (var k = 0; k < positionedGlyphs.length; k++) {
        var positionedGlyph = positionedGlyphs[k];
        var glyphPositions = positions[positionedGlyph.fontStack];
        var glyph = glyphPositions && glyphPositions[positionedGlyph.glyph];
        if (!glyph) { continue; }

        var rect = glyph.rect;
        if (!rect) { continue; }

        // The rects have an addditional buffer that is not included in their size.
        var glyphPadding = 1.0;
        var rectBuffer = __chunk_1.GLYPH_PBF_BORDER + glyphPadding;

        var halfAdvance = glyph.metrics.advance * positionedGlyph.scale / 2;

        var glyphOffset = alongLine ?
            [positionedGlyph.x + halfAdvance, positionedGlyph.y] :
            [0, 0];

        var builtInOffset = alongLine ?
            [0, 0] :
            [positionedGlyph.x + halfAdvance + textOffset[0], positionedGlyph.y + textOffset[1]];

        var x1 = (glyph.metrics.left - rectBuffer) * positionedGlyph.scale - halfAdvance + builtInOffset[0];
        var y1 = (-glyph.metrics.top - rectBuffer) * positionedGlyph.scale + builtInOffset[1];
        var x2 = x1 + rect.w * positionedGlyph.scale;
        var y2 = y1 + rect.h * positionedGlyph.scale;

        var tl = new __chunk_1.Point(x1, y1);
        var tr = new __chunk_1.Point(x2, y1);
        var bl  = new __chunk_1.Point(x1, y2);
        var br = new __chunk_1.Point(x2, y2);

        if (alongLine && positionedGlyph.vertical) {
            // Vertical-supporting glyphs are laid out in 24x24 point boxes (1 square em)
            // In horizontal orientation, the y values for glyphs are below the midline
            // and we use a "yOffset" of -17 to pull them up to the middle.
            // By rotating counter-clockwise around the point at the center of the left
            // edge of a 24x24 layout box centered below the midline, we align the center
            // of the glyphs with the horizontal midline, so the yOffset is no longer
            // necessary, but we also pull the glyph to the left along the x axis
            var center = new __chunk_1.Point(-halfAdvance, halfAdvance);
            var verticalRotation = -Math.PI / 2;
            var xOffsetCorrection = new __chunk_1.Point(5, 0);
            tl._rotateAround(verticalRotation, center)._add(xOffsetCorrection);
            tr._rotateAround(verticalRotation, center)._add(xOffsetCorrection);
            bl._rotateAround(verticalRotation, center)._add(xOffsetCorrection);
            br._rotateAround(verticalRotation, center)._add(xOffsetCorrection);
        }

        if (textRotate) {
            var sin = Math.sin(textRotate),
                cos = Math.cos(textRotate),
                matrix = [cos, -sin, sin, cos];

            tl._matMult(matrix);
            tr._matMult(matrix);
            bl._matMult(matrix);
            br._matMult(matrix);
        }

        quads.push({tl: tl, tr: tr, bl: bl, br: br, tex: rect, writingMode: shaping.writingMode, glyphOffset: glyphOffset});
    }

    return quads;
}

//      
                                   

/**
 * A CollisionFeature represents the area of the tile covered by a single label.
 * It is used with CollisionIndex to check if the label overlaps with any
 * previous labels. A CollisionFeature is mostly just a set of CollisionBox
 * objects.
 *
 * @private
 */
var CollisionFeature = function CollisionFeature(collisionBoxArray               ,
            line          ,
            anchor    ,
            featureIndex    ,
            sourceLayerIndex    ,
            bucketIndex    ,
            shaped    ,
            boxScale    ,
            padding    ,
            alignLine     ,
            overscaling    ,
            rotate    ) {
    var y1 = shaped.top * boxScale - padding;
    var y2 = shaped.bottom * boxScale + padding;
    var x1 = shaped.left * boxScale - padding;
    var x2 = shaped.right * boxScale + padding;

    this.boxStartIndex = collisionBoxArray.length;

    if (alignLine) {

        var height = y2 - y1;
        var length = x2 - x1;

        if (height > 0) {
            // set minimum box height to avoid very many small labels
            height = Math.max(10 * boxScale, height);

            this._addLineCollisionCircles(collisionBoxArray, line, anchor, (anchor.segment ), length, height, featureIndex, sourceLayerIndex, bucketIndex, overscaling);
        }

    } else {
        if (rotate) {
            // Account for *-rotate in point collision boxes
            // See https://github.com/mapbox/mapbox-gl-js/issues/6075
            // Doesn't account for icon-text-fit

            var tl = new __chunk_1.Point(x1, y1);
            var tr = new __chunk_1.Point(x2, y1);
            var bl = new __chunk_1.Point(x1, y2);
            var br = new __chunk_1.Point(x2, y2);

            var rotateRadians = rotate * Math.PI / 180;

            tl._rotate(rotateRadians);
            tr._rotate(rotateRadians);
            bl._rotate(rotateRadians);
            br._rotate(rotateRadians);

            // Collision features require an "on-axis" geometry,
            // so take the envelope of the rotated geometry
            // (may be quite large for wide labels rotated 45 degrees)
            x1 = Math.min(tl.x, tr.x, bl.x, br.x);
            x2 = Math.max(tl.x, tr.x, bl.x, br.x);
            y1 = Math.min(tl.y, tr.y, bl.y, br.y);
            y2 = Math.max(tl.y, tr.y, bl.y, br.y);
        }
        collisionBoxArray.emplaceBack(anchor.x, anchor.y, x1, y1, x2, y2, featureIndex, sourceLayerIndex, bucketIndex,
            0, 0);
    }

    this.boxEndIndex = collisionBoxArray.length;
};

/**
 * Create a set of CollisionBox objects for a line.
 *
 * @param labelLength The length of the label in geometry units.
 * @param anchor The point along the line around which the label is anchored.
 * @param boxSize The size of the collision boxes that will be created.
 * @private
 */
CollisionFeature.prototype._addLineCollisionCircles = function _addLineCollisionCircles (collisionBoxArray               ,
                       line          ,
                       anchor    ,
                       segment    ,
                       labelLength    ,
                       boxSize    ,
                       featureIndex    ,
                       sourceLayerIndex    ,
                       bucketIndex    ,
                       overscaling    ) {
    var step = boxSize / 2;
    var nBoxes = Math.floor(labelLength / step) || 1;
    // We calculate line collision circles out to 300% of what would normally be our
    // max size, to allow collision detection to work on labels that expand as
    // they move into the distance
    // Vertically oriented labels in the distant field can extend past this padding
    // This is a noticeable problem in overscaled tiles where the pitch 0-based
    // symbol spacing will put labels very close together in a pitched map.
    // To reduce the cost of adding extra collision circles, we slowly increase
    // them for overscaled tiles.
    var overscalingPaddingFactor = 1 + .4 * Math.log(overscaling) / Math.LN2;
    var nPitchPaddingBoxes = Math.floor(nBoxes * overscalingPaddingFactor / 2);

    // offset the center of the first box by half a box so that the edge of the
    // box is at the edge of the label.
    var firstBoxOffset = -boxSize / 2;

    var p = anchor;
    var index = segment + 1;
    var anchorDistance = firstBoxOffset;
    var labelStartDistance = -labelLength / 2;
    var paddingStartDistance = labelStartDistance - labelLength / 4;
    // move backwards along the line to the first segment the label appears on
    do {
        index--;

        if (index < 0) {
            if (anchorDistance > labelStartDistance) {
                // there isn't enough room for the label after the beginning of the line
                // checkMaxAngle should have already caught this
                return;
            } else {
                // The line doesn't extend far enough back for all of our padding,
                // but we got far enough to show the label under most conditions.
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

        // the distance the box will be from the anchor
        var boxOffset = i * step;
        var boxDistanceToAnchor = labelStartDistance + boxOffset;

        // make the distance between pitch padding boxes bigger
        if (boxOffset < 0) { boxDistanceToAnchor += boxOffset; }
        if (boxOffset > labelLength) { boxDistanceToAnchor += boxOffset - labelLength; }

        if (boxDistanceToAnchor < anchorDistance) {
            // The line doesn't extend far enough back for this box, skip it
            // (This could allow for line collisions on distant tiles)
            continue;
        }

        // the box is not on the current segment. Move to the next segment.
        while (anchorDistance + segmentLength < boxDistanceToAnchor) {
            anchorDistance += segmentLength;
            index++;

            // There isn't enough room before the end of the line.
            if (index + 1 >= line.length) {
                return;
            }

            segmentLength = line[index].dist(line[index + 1]);
        }

        // the distance the box will be from the beginning of the segment
        var segmentBoxDistance = boxDistanceToAnchor - anchorDistance;

        var p0 = line[index];
        var p1 = line[index + 1];
        var boxAnchorPoint = p1.sub(p0)._unit()._mult(segmentBoxDistance)._add(p0)._round();

        // If the box is within boxSize of the anchor, force the box to be used
        // (so even 0-width labels use at least one box)
        // Otherwise, the .8 multiplication gives us a little bit of conservative
        // padding in choosing which boxes to use (see CollisionIndex#placedCollisionCircles)
        var paddedAnchorDistance = Math.abs(boxDistanceToAnchor - firstBoxOffset) < step ?
            0 :
            (boxDistanceToAnchor - firstBoxOffset) * 0.8;

        collisionBoxArray.emplaceBack(boxAnchorPoint.x, boxAnchorPoint.y,
            -boxSize / 2, -boxSize / 2, boxSize / 2, boxSize / 2,
            featureIndex, sourceLayerIndex, bucketIndex,
            boxSize / 2, paddedAnchorDistance);
    }
};

'use strict';

var tinyqueue = TinyQueue;
var default_1 = TinyQueue;

function TinyQueue(data, compare) {
    var this$1 = this;

    if (!(this instanceof TinyQueue)) { return new TinyQueue(data, compare); }

    this.data = data || [];
    this.length = this.data.length;
    this.compare = compare || defaultCompare;

    if (this.length > 0) {
        for (var i = (this.length >> 1) - 1; i >= 0; i--) { this$1._down(i); }
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
        if (this.length === 0) { return undefined; }

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
            var parent = (pos - 1) >> 1;
            var current = data[parent];
            if (compare(item, current) >= 0) { break; }
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
            if (compare(best, item) >= 0) { break; }

            data[pos] = best;
            pos = left;
        }

        data[pos] = item;
    }
};
tinyqueue.default = default_1;

//      

/**
 * Finds an approximation of a polygon's Pole Of Inaccessibiliy https://en.wikipedia.org/wiki/Pole_of_inaccessibility
 * This is a copy of http://github.com/mapbox/polylabel adapted to use Points
 *
 * @param polygonRings first item in array is the outer ring followed optionally by the list of holes, should be an element of the result of util/classify_rings
 * @param precision Specified in input coordinate units. If 0 returns after first run, if > 0 repeatedly narrows the search space until the radius of the area searched for the best pole is less than precision
 * @param debug Print some statistics to the console during execution
 * @returns Pole of Inaccessibiliy.
 * @private
 */
function findPoleOfInaccessibility (polygonRings                     , precision, debug)        {
    if ( precision === void 0 ) precision          = 1;
    if ( debug === void 0 ) debug           = false;

    // find the bounding box of the outer ring
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    var outerRing = polygonRings[0];
    for (var i = 0; i < outerRing.length; i++) {
        var p = outerRing[i];
        if (!i || p.x < minX) { minX = p.x; }
        if (!i || p.y < minY) { minY = p.y; }
        if (!i || p.x > maxX) { maxX = p.x; }
        if (!i || p.y > maxY) { maxY = p.y; }
    }

    var width = maxX - minX;
    var height = maxY - minY;
    var cellSize = Math.min(width, height);
    var h = cellSize / 2;

    // a priority queue of cells in order of their "potential" (max distance to polygon)
    var cellQueue = new tinyqueue(null, compareMax);

    if (cellSize === 0) { return new __chunk_1.Point(minX, minY); }

    // cover polygon with initial cells
    for (var x = minX; x < maxX; x += cellSize) {
        for (var y = minY; y < maxY; y += cellSize) {
            cellQueue.push(new Cell(x + h, y + h, h, polygonRings));
        }
    }

    // take centroid as the first best guess
    var bestCell = getCentroidCell(polygonRings);
    var numProbes = cellQueue.length;

    while (cellQueue.length) {
        // pick the most promising cell from the queue
        var cell = cellQueue.pop();

        // update the best cell if we found a better one
        if (cell.d > bestCell.d || !bestCell.d) {
            bestCell = cell;
            if (debug) { console.log('found best %d after %d probes', Math.round(1e4 * cell.d) / 1e4, numProbes); }
        }

        // do not drill down further if there's no chance of a better solution
        if (cell.max - bestCell.d <= precision) { continue; }

        // split the cell into four cells
        h = cell.h / 2;
        cellQueue.push(new Cell(cell.p.x - h, cell.p.y - h, h, polygonRings));
        cellQueue.push(new Cell(cell.p.x + h, cell.p.y - h, h, polygonRings));
        cellQueue.push(new Cell(cell.p.x - h, cell.p.y + h, h, polygonRings));
        cellQueue.push(new Cell(cell.p.x + h, cell.p.y + h, h, polygonRings));
        numProbes += 4;
    }

    if (debug) {
        console.log(("num probes: " + numProbes));
        console.log(("best distance: " + (bestCell.d)));
    }

    return bestCell.p;
}

function compareMax(a, b) {
    return b.max - a.max;
}

function Cell(x, y, h, polygon) {
    this.p = new __chunk_1.Point(x, y);
    this.h = h; // half the cell size
    this.d = pointToPolygonDist(this.p, polygon); // distance from cell center to polygon
    this.max = this.d + this.h * Math.SQRT2; // max distance to polygon within a cell
}

// signed distance from point to polygon outline (negative if point is outside)
function pointToPolygonDist(p, polygon) {
    var inside = false;
    var minDistSq = Infinity;

    for (var k = 0; k < polygon.length; k++) {
        var ring = polygon[k];

        for (var i = 0, len = ring.length, j = len - 1; i < len; j = i++) {
            var a = ring[i];
            var b = ring[j];

            if ((a.y > p.y !== b.y > p.y) &&
                (p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x)) { inside = !inside; }

            minDistSq = Math.min(minDistSq, __chunk_1.distToSegmentSquared(p, a, b));
        }
    }

    return (inside ? 1 : -1) * Math.sqrt(minDistSq);
}

// get polygon centroid
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
/**
 * JS Implementation of MurmurHash3 (r136) (as of May 20, 2011)
 * 
 * @author <a href="mailto:gary.court@gmail.com">Gary Court</a>
 * @see http://github.com/garycourt/murmurhash-js
 * @author <a href="mailto:aappleby@gmail.com">Austin Appleby</a>
 * @see http://sites.google.com/site/murmurhash/
 * 
 * @param {string} key ASCII only
 * @param {number} seed Positive integer only
 * @return {number} 32-bit positive integer hash 
 */

function murmurhash3_32_gc(key, seed) {
	var remainder, bytes, h1, h1b, c1, c1b, c2, c2b, k1, i;
	
	remainder = key.length & 3; // key.length % 4
	bytes = key.length - remainder;
	h1 = seed;
	c1 = 0xcc9e2d51;
	c2 = 0x1b873593;
	i = 0;
	
	while (i < bytes) {
	  	k1 = 
	  	  ((key.charCodeAt(i) & 0xff)) |
	  	  ((key.charCodeAt(++i) & 0xff) << 8) |
	  	  ((key.charCodeAt(++i) & 0xff) << 16) |
	  	  ((key.charCodeAt(++i) & 0xff) << 24);
		++i;
		
		k1 = ((((k1 & 0xffff) * c1) + ((((k1 >>> 16) * c1) & 0xffff) << 16))) & 0xffffffff;
		k1 = (k1 << 15) | (k1 >>> 17);
		k1 = ((((k1 & 0xffff) * c2) + ((((k1 >>> 16) * c2) & 0xffff) << 16))) & 0xffffffff;

		h1 ^= k1;
        h1 = (h1 << 13) | (h1 >>> 19);
		h1b = ((((h1 & 0xffff) * 5) + ((((h1 >>> 16) * 5) & 0xffff) << 16))) & 0xffffffff;
		h1 = (((h1b & 0xffff) + 0x6b64) + ((((h1b >>> 16) + 0xe654) & 0xffff) << 16));
	}
	
	k1 = 0;
	
	switch (remainder) {
		case 3: k1 ^= (key.charCodeAt(i + 2) & 0xff) << 16;
		case 2: k1 ^= (key.charCodeAt(i + 1) & 0xff) << 8;
		case 1: k1 ^= (key.charCodeAt(i) & 0xff);
		
		k1 = (((k1 & 0xffff) * c1) + ((((k1 >>> 16) * c1) & 0xffff) << 16)) & 0xffffffff;
		k1 = (k1 << 15) | (k1 >>> 17);
		k1 = (((k1 & 0xffff) * c2) + ((((k1 >>> 16) * c2) & 0xffff) << 16)) & 0xffffffff;
		h1 ^= k1;
	}
	
	h1 ^= key.length;

	h1 ^= h1 >>> 16;
	h1 = (((h1 & 0xffff) * 0x85ebca6b) + ((((h1 >>> 16) * 0x85ebca6b) & 0xffff) << 16)) & 0xffffffff;
	h1 ^= h1 >>> 13;
	h1 = ((((h1 & 0xffff) * 0xc2b2ae35) + ((((h1 >>> 16) * 0xc2b2ae35) & 0xffff) << 16))) & 0xffffffff;
	h1 ^= h1 >>> 16;

	return h1 >>> 0;
}

if('object' !== "undefined") {
  module.exports = murmurhash3_32_gc;
}
});

var murmurhash2_gc = __chunk_1.createCommonjsModule(function (module) {
/**
 * JS Implementation of MurmurHash2
 * 
 * @author <a href="mailto:gary.court@gmail.com">Gary Court</a>
 * @see http://github.com/garycourt/murmurhash-js
 * @author <a href="mailto:aappleby@gmail.com">Austin Appleby</a>
 * @see http://sites.google.com/site/murmurhash/
 * 
 * @param {string} str ASCII only
 * @param {number} seed Positive integer only
 * @return {number} 32-bit positive integer hash
 */

function murmurhash2_32_gc(str, seed) {
  var
    l = str.length,
    h = seed ^ l,
    i = 0,
    k;
  
  while (l >= 4) {
  	k = 
  	  ((str.charCodeAt(i) & 0xff)) |
  	  ((str.charCodeAt(++i) & 0xff) << 8) |
  	  ((str.charCodeAt(++i) & 0xff) << 16) |
  	  ((str.charCodeAt(++i) & 0xff) << 24);
    
    k = (((k & 0xffff) * 0x5bd1e995) + ((((k >>> 16) * 0x5bd1e995) & 0xffff) << 16));
    k ^= k >>> 24;
    k = (((k & 0xffff) * 0x5bd1e995) + ((((k >>> 16) * 0x5bd1e995) & 0xffff) << 16));

	h = (((h & 0xffff) * 0x5bd1e995) + ((((h >>> 16) * 0x5bd1e995) & 0xffff) << 16)) ^ k;

    l -= 4;
    ++i;
  }
  
  switch (l) {
  case 3: h ^= (str.charCodeAt(i + 2) & 0xff) << 16;
  case 2: h ^= (str.charCodeAt(i + 1) & 0xff) << 8;
  case 1: h ^= (str.charCodeAt(i) & 0xff);
          h = (((h & 0xffff) * 0x5bd1e995) + ((((h >>> 16) * 0x5bd1e995) & 0xffff) << 16));
  }

  h ^= h >>> 13;
  h = (((h & 0xffff) * 0x5bd1e995) + ((((h >>> 16) * 0x5bd1e995) & 0xffff) << 16));
  h ^= h >>> 15;

  return h >>> 0;
}

if('object' !== undefined) {
  module.exports = murmurhash2_32_gc;
}
});

var murmurhashJs = murmurhash3_gc;
var murmur3_1 = murmurhash3_gc;
var murmur2_1 = murmurhash2_gc;
murmurhashJs.murmur3 = murmur3_1;
murmurhashJs.murmur2 = murmur2_1;

//      

// The symbol layout process needs `text-size` evaluated at up to five different zoom levels, and
// `icon-size` at up to three:
//
//   1. `text-size` at the zoom level of the bucket. Used to calculate a per-feature size for source `text-size`
//       expressions, and to calculate the box dimensions for icon-text-fit.
//   2. `icon-size` at the zoom level of the bucket. Used to calculate a per-feature size for source `icon-size`
//       expressions.
//   3. `text-size` and `icon-size` at the zoom level of the bucket, plus one. Used to calculate collision boxes.
//   4. `text-size` at zoom level 18. Used for something line-symbol-placement-related.
//   5.  For composite `*-size` expressions: two zoom levels of curve stops that "cover" the zoom level of the
//       bucket. These go into a vertex buffer and are used by the shader to interpolate the size at render time.
//
// (1) and (2) are stored in `bucket.layers[0].layout`. The remainder are below.
//
              
                                                                  
                                                                  
                                                                  
                                                                                                                
                                                                                                                
  

function performSymbolLayout(bucket              ,
                             glyphMap                                     ,
                             glyphPositions                                       ,
                             imageMap                        ,
                             imagePositions                           ,
                             showCollisionBoxes         ) {
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
            var textOffset                   = (layout.get('text-offset').evaluate(feature, {}).map(function (t){ return t * oneEm; })     );
            var spacing = layout.get('text-letter-spacing').evaluate(feature, {}) * oneEm;
            var spacingIfAllowed = __chunk_1.allowsLetterSpacing(unformattedText) ? spacing : 0;
            var textAnchor = layout.get('text-anchor').evaluate(feature, {});
            var textJustify = layout.get('text-justify').evaluate(feature, {});
            var maxWidth = layout.get('symbol-placement') === 'point' ?
                layout.get('text-max-width').evaluate(feature, {}) * oneEm :
                0;

            shapedTextOrientations.horizontal = __chunk_1.shapeText(text, glyphMap, fontstack, maxWidth, lineHeight, textAnchor, textJustify, spacingIfAllowed, textOffset, oneEm, __chunk_1.WritingMode.horizontal);
            if (__chunk_1.allowsVerticalWritingMode(unformattedText) && textAlongLine && keepUpright) {
                shapedTextOrientations.vertical = __chunk_1.shapeText(text, glyphMap, fontstack, maxWidth, lineHeight, textAnchor, textJustify, spacingIfAllowed, textOffset, oneEm, __chunk_1.WritingMode.vertical);
            }
        }

        var shapedIcon = (void 0);
        if (feature.icon) {
            var image = imageMap[feature.icon];
            if (image) {
                shapedIcon = __chunk_1.shapeIcon(
                    imagePositions[feature.icon],
                    layout.get('icon-offset').evaluate(feature, {}),
                    layout.get('icon-anchor').evaluate(feature, {}));
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


/**
 * Given a feature and its shaped text and icon data, add a 'symbol
 * instance' for each _possible_ placement of the symbol feature.
 * (At render timePlaceSymbols#place() selects which of these instances to
 * show or hide based on collisions with symbols in other layers.)
 * @private
 */
function addFeature(bucket              ,
                    feature               ,
                    shapedTextOrientations     ,
                    shapedIcon                       ,
                    glyphPositionMap                                       ,
                    sizes       ) {
    var layoutTextSize = sizes.layoutTextSize.evaluate(feature, {});
    var layoutIconSize = sizes.layoutIconSize.evaluate(feature, {});

    // To reduce the number of labels that jump around when zooming we need
    // to use a text-size value that is the same for all zoom levels.
    // bucket calculates text-size at a high zoom level so that all tiles can
    // use the same value when calculating anchor positions.
    var textMaxSize = sizes.textMaxSize.evaluate(feature, {});
    if (textMaxSize === undefined) {
        textMaxSize = layoutTextSize;
    }

    var layout = bucket.layers[0].layout;
    var textOffset = layout.get('text-offset').evaluate(feature, {});
    var iconOffset = layout.get('icon-offset').evaluate(feature, {});

    var glyphSize = 24,
        fontScale = layoutTextSize / glyphSize,
        textBoxScale = bucket.tilePixelRatio * fontScale,
        textMaxBoxScale = bucket.tilePixelRatio * textMaxSize / glyphSize,
        iconBoxScale = bucket.tilePixelRatio * layoutIconSize,
        symbolMinDistance = bucket.tilePixelRatio * layout.get('symbol-spacing'),
        textPadding = layout.get('text-padding') * bucket.tilePixelRatio,
        iconPadding = layout.get('icon-padding') * bucket.tilePixelRatio,
        textMaxAngle = layout.get('text-max-angle') / 180 * Math.PI,
        textAlongLine = layout.get('text-rotation-alignment') === 'map' && layout.get('symbol-placement') !== 'point',
        iconAlongLine = layout.get('icon-rotation-alignment') === 'map' && layout.get('symbol-placement') !== 'point',
        symbolPlacement = layout.get('symbol-placement'),
        textRepeatDistance = symbolMinDistance / 2;

    var addSymbolAtAnchor = function (line, anchor) {
        if (anchor.x < 0 || anchor.x >= __chunk_1.EXTENT || anchor.y < 0 || anchor.y >= __chunk_1.EXTENT) {
            // Symbol layers are drawn across tile boundaries, We filter out symbols
            // outside our tile boundaries (which may be included in vector tile buffers)
            // to prevent double-drawing symbols.
            return;
        }

        addSymbol(bucket, anchor, line, shapedTextOrientations, shapedIcon, bucket.layers[0],
            bucket.collisionBoxArray, feature.index, feature.sourceLayerIndex, bucket.index,
            textBoxScale, textPadding, textAlongLine, textOffset,
            iconBoxScale, iconPadding, iconAlongLine, iconOffset,
            feature, glyphPositionMap, sizes);
    };

    if (symbolPlacement === 'line') {
        for (var i$1 = 0, list$1 = clipLine(feature.geometry, 0, 0, __chunk_1.EXTENT, __chunk_1.EXTENT); i$1 < list$1.length; i$1 += 1) {
            var line = list$1[i$1];

          var anchors = getAnchors(
                line,
                symbolMinDistance,
                textMaxAngle,
                shapedTextOrientations.vertical || shapedTextOrientations.horizontal,
                shapedIcon,
                glyphSize,
                textMaxBoxScale,
                bucket.overscaling,
                __chunk_1.EXTENT
            );
            for (var i = 0, list = anchors; i < list.length; i += 1) {
                var anchor = list[i];

              var shapedText = shapedTextOrientations.horizontal;
                if (!shapedText || !anchorIsTooClose(bucket, shapedText.text, textRepeatDistance, anchor)) {
                    addSymbolAtAnchor(line, anchor);
                }
            }
        }
    } else if (symbolPlacement === 'line-center') {
        // No clipping, multiple lines per feature are allowed
        // "lines" with only one point are ignored as in clipLines
        for (var i$2 = 0, list$2 = feature.geometry; i$2 < list$2.length; i$2 += 1) {
            var line$1 = list$2[i$2];

          if (line$1.length > 1) {
                var anchor$1 = getCenterAnchor(
                    line$1,
                    textMaxAngle,
                    shapedTextOrientations.vertical || shapedTextOrientations.horizontal,
                    shapedIcon,
                    glyphSize,
                    textMaxBoxScale);
                if (anchor$1) {
                    addSymbolAtAnchor(line$1, anchor$1);
                }
            }
        }
    } else if (feature.type === 'Polygon') {
        for (var i$3 = 0, list$3 = __chunk_1.classifyRings(feature.geometry, 0); i$3 < list$3.length; i$3 += 1) {
            // 16 here represents 2 pixels
            var polygon = list$3[i$3];

          var poi = findPoleOfInaccessibility(polygon, 16);
            addSymbolAtAnchor(polygon[0], new __chunk_1.Anchor(poi.x, poi.y, 0));
        }
    } else if (feature.type === 'LineString') {
        // https://github.com/mapbox/mapbox-gl-js/issues/3808
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

function addTextVertices(bucket              ,
                         anchor       ,
                         shapedText         ,
                         layer                  ,
                         textAlongLine         ,
                         feature               ,
                         textOffset                  ,
                         lineArray                                              ,
                         writingMode        ,
                         placedTextSymbolIndices               ,
                         glyphPositionMap                                       ,
                         sizes       ) {
    var glyphQuads = getGlyphQuads(anchor, shapedText,
                            layer, textAlongLine, feature, glyphPositionMap);

    var sizeData = bucket.textSizeData;
    var textSizeData = null;

    if (sizeData.functionType === 'source') {
        textSizeData = [
            __chunk_1.SIZE_PACK_FACTOR * layer.layout.get('text-size').evaluate(feature, {})
        ];
        if (textSizeData[0] > MAX_PACKED_SIZE) {
            __chunk_1.warnOnce(((bucket.layerIds[0]) + ": Value for \"text-size\" is >= 256. Reduce your \"text-size\"."));
        }
    } else if (sizeData.functionType === 'composite') {
        textSizeData = [
            __chunk_1.SIZE_PACK_FACTOR * sizes.compositeTextSizes[0].evaluate(feature, {}),
            __chunk_1.SIZE_PACK_FACTOR * sizes.compositeTextSizes[1].evaluate(feature, {})
        ];
        if (textSizeData[0] > MAX_PACKED_SIZE || textSizeData[1] > MAX_PACKED_SIZE) {
            __chunk_1.warnOnce(((bucket.layerIds[0]) + ": Value for \"text-size\" is >= 256. Reduce your \"text-size\"."));
        }
    }

    bucket.addSymbols(
        bucket.text,
        glyphQuads,
        textSizeData,
        textOffset,
        textAlongLine,
        feature,
        writingMode,
        anchor,
        lineArray.lineStartIndex,
        lineArray.lineLength);

    // The placedSymbolArray is used at render time in drawTileSymbols
    // These indices allow access to the array at collision detection time
    placedTextSymbolIndices.push(bucket.text.placedSymbolArray.length - 1);

    return glyphQuads.length * 4;
}


/**
 * Add a single label & icon placement.
 *
 * @private
 */
function addSymbol(bucket              ,
                   anchor        ,
                   line              ,
                   shapedTextOrientations     ,
                   shapedIcon                       ,
                   layer                  ,
                   collisionBoxArray                   ,
                   featureIndex        ,
                   sourceLayerIndex        ,
                   bucketIndex        ,
                   textBoxScale        ,
                   textPadding        ,
                   textAlongLine         ,
                   textOffset                  ,
                   iconBoxScale        ,
                   iconPadding        ,
                   iconAlongLine         ,
                   iconOffset                  ,
                   feature               ,
                   glyphPositionMap                                       ,
                   sizes       ) {
    var lineArray = bucket.addToLineVertexArray(anchor, line);

    var textCollisionFeature, iconCollisionFeature;

    var numIconVertices = 0;
    var numGlyphVertices = 0;
    var numVerticalGlyphVertices = 0;
    var key = murmurhashJs(shapedTextOrientations.horizontal ? shapedTextOrientations.horizontal.text : '');
    var placedTextSymbolIndices = [];
    if (shapedTextOrientations.horizontal) {
        // As a collision approximation, we can use either the vertical or the horizontal version of the feature
        // We're counting on the two versions having similar dimensions
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
        var iconQuads = getIconQuads(anchor, shapedIcon, layer,
                            iconAlongLine, shapedTextOrientations.horizontal,
                            feature);
        var iconRotate = layer.layout.get('icon-rotate').evaluate(feature, {});
        iconCollisionFeature = new CollisionFeature(collisionBoxArray, line, anchor, featureIndex, sourceLayerIndex, bucketIndex, shapedIcon, iconBoxScale, iconPadding, /*align boxes to line*/false, bucket.overscaling, iconRotate);

        numIconVertices = iconQuads.length * 4;

        var sizeData = bucket.iconSizeData;
        var iconSizeData = null;

        if (sizeData.functionType === 'source') {
            iconSizeData = [
                __chunk_1.SIZE_PACK_FACTOR * layer.layout.get('icon-size').evaluate(feature, {})
            ];
            if (iconSizeData[0] > MAX_PACKED_SIZE) {
                __chunk_1.warnOnce(((bucket.layerIds[0]) + ": Value for \"icon-size\" is >= 256. Reduce your \"icon-size\"."));
            }
        } else if (sizeData.functionType === 'composite') {
            iconSizeData = [
                __chunk_1.SIZE_PACK_FACTOR * sizes.compositeIconSizes[0].evaluate(feature, {}),
                __chunk_1.SIZE_PACK_FACTOR * sizes.compositeIconSizes[1].evaluate(feature, {})
            ];
            if (iconSizeData[0] > MAX_PACKED_SIZE || iconSizeData[1] > MAX_PACKED_SIZE) {
                __chunk_1.warnOnce(((bucket.layerIds[0]) + ": Value for \"icon-size\" is >= 256. Reduce your \"icon-size\"."));
            }
        }

        bucket.addSymbols(
            bucket.icon,
            iconQuads,
            iconSizeData,
            iconOffset,
            iconAlongLine,
            feature,
            false,
            anchor,
            lineArray.lineStartIndex,
            lineArray.lineLength);
    }

    var iconBoxStartIndex = iconCollisionFeature ? iconCollisionFeature.boxStartIndex : bucket.collisionBoxArray.length;
    var iconBoxEndIndex = iconCollisionFeature ? iconCollisionFeature.boxEndIndex : bucket.collisionBoxArray.length;

    if (bucket.glyphOffsetArray.length >= __chunk_1.SymbolBucket.MAX_GLYPHS) { __chunk_1.warnOnce(
        "Too many glyphs being rendered in a tile. See https://github.com/mapbox/mapbox-gl-js/issues/2907"
    ); }

    bucket.symbolInstances.emplaceBack(
        anchor.x,
        anchor.y,
        placedTextSymbolIndices.length > 0 ? placedTextSymbolIndices[0] : -1,
        placedTextSymbolIndices.length > 1 ? placedTextSymbolIndices[1] : -1,
        key,
        textBoxStartIndex,
        textBoxEndIndex,
        iconBoxStartIndex,
        iconBoxEndIndex,
        featureIndex,
        numGlyphVertices,
        numVerticalGlyphVertices,
        numIconVertices,
        0);
}

function anchorIsTooClose(bucket     , text        , repeatDistance        , anchor       ) {
    var compareText = bucket.compareText;
    if (!(text in compareText)) {
        compareText[text] = [];
    } else {
        var otherAnchors = compareText[text];
        for (var k = otherAnchors.length - 1; k >= 0; k--) {
            if (anchor.dist(otherAnchors[k]) < repeatDistance) {
                // If it's within repeatDistance of one anchor, stop looking
                return true;
            }
        }
    }
    // If anchor is not within repeatDistance of any other anchor, add to array
    compareText[text].push(anchor);
    return false;
}

//      

                                                                   

var padding = 1;

             
              
              
              
             
  

                             
               
                         
  

var GlyphAtlas = function GlyphAtlas(stacks                                       ) {
      var positions = {};
      var bins = [];

      for (var stack in stacks) {
          var glyphs = stacks[stack];
          var stackPositions = positions[stack] = {};

          for (var id in glyphs) {
              var src = glyphs[+id];
              if (!src || src.bitmap.width === 0 || src.bitmap.height === 0) { continue; }

              var bin = {
                  x: 0,
                  y: 0,
                  w: src.bitmap.width + 2 * padding,
                  h: src.bitmap.height + 2 * padding
              };
              bins.push(bin);
              stackPositions[id] = {rect: bin, metrics: src.metrics};
          }
      }

      var ref = __chunk_1.potpack(bins);
      var w = ref.w;
      var h = ref.h;
      var image = new __chunk_1.AlphaImage({width: w || 1, height: h || 1});

      for (var stack$1 in stacks) {
          var glyphs$1 = stacks[stack$1];

          for (var id$1 in glyphs$1) {
              var src$1 = glyphs$1[+id$1];
              if (!src$1 || src$1.bitmap.width === 0 || src$1.bitmap.height === 0) { continue; }
              var bin$1 = positions[stack$1][id$1].rect;
              __chunk_1.AlphaImage.copy(src$1.bitmap, image, {x: 0, y: 0}, {x: bin$1.x + padding, y: bin$1.y + padding}, src$1.bitmap);
          }
      }

      this.image = image;
      this.positions = positions;
  };

__chunk_1.register('GlyphAtlas', GlyphAtlas);

//      

                                           
                                       
                                                   
                                                              
                                                     
                                                     
             
                         
                       
                                 

var WorkerTile = function WorkerTile(params                  ) {
    this.tileID = new __chunk_1.OverscaledTileID(params.tileID.overscaledZ, params.tileID.wrap, params.tileID.canonical.z, params.tileID.canonical.x, params.tileID.canonical.y);
    this.uid = params.uid;
    this.zoom = params.zoom;
    this.pixelRatio = params.pixelRatio;
    this.tileSize = params.tileSize;
    this.source = params.source;
    this.overscaling = this.tileID.overscaleFactor();
    this.showCollisionBoxes = params.showCollisionBoxes;
    this.collectResourceTiming = !!params.collectResourceTiming;
};

WorkerTile.prototype.parse = function parse (data        , layerIndex             , actor   , callback                ) {
        var this$1 = this;

    this.status = 'parsing';
    this.data = data;

    this.collisionBoxArray = new __chunk_1.CollisionBoxArray();
    var sourceLayerCoder = new __chunk_1.DictionaryCoder(Object.keys(data.layers).sort());

    var featureIndex = new __chunk_1.FeatureIndex(this.tileID);
    featureIndex.bucketLayerIDs = [];

    var buckets                 = {};

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
            __chunk_1.warnOnce("Vector tile source \"" + (this$1.source) + "\" layer \"" + sourceLayerId + "\" " +
                "does not use vector tile spec v2 and therefore may have some rendering errors.");
        }

        var sourceLayerIndex = sourceLayerCoder.encode(sourceLayerId);
        var features = [];
        for (var index = 0; index < sourceLayer.length; index++) {
            var feature = sourceLayer.feature(index);
            features.push({ feature: feature, index: index, sourceLayerIndex: sourceLayerIndex });
        }

        for (var i = 0, list = layerFamilies[sourceLayerId]; i < list.length; i += 1) {
            var family = list[i];

                var layer = family[0];

            __chunk_1.assert(layer.source === this$1.source);
            if (layer.minzoom && this$1.zoom < Math.floor(layer.minzoom)) { continue; }
            if (layer.maxzoom && this$1.zoom >= layer.maxzoom) { continue; }
            if (layer.visibility === 'none') { continue; }

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
            featureIndex.bucketLayerIDs.push(family.map(function (l) { return l.id; }));
        }
    }

    var error    ;
    var glyphMap                                  ;
    var iconMap                     ;
    var patternMap                     ;

    var stacks = __chunk_1.mapObject(options.glyphDependencies, function (glyphs) { return Object.keys(glyphs).map(Number); });
    if (Object.keys(stacks).length) {
        actor.send('getGlyphs', {uid: this.uid, stacks: stacks}, function (err, result) {
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
        actor.send('getImages', {icons: icons}, function (err, result) {
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
        actor.send('getImages', {icons: patterns}, function (err, result) {
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
                } else if (bucket.hasPattern &&
                    (bucket instanceof __chunk_1.LineBucket ||
                     bucket instanceof __chunk_1.FillBucket ||
                     bucket instanceof __chunk_1.FillExtrusionBucket)) {
                    recalculateLayers(bucket.layers, this$1.zoom);
                    bucket.addFeatures(options, imageAtlas.patternPositions);
                }
            }

            this.status = 'done';
            callback(null, {
                buckets: __chunk_1.values(buckets).filter(function (b) { return !b.isEmpty(); }),
                featureIndex: featureIndex,
                collisionBoxArray: this.collisionBoxArray,
                glyphAtlasImage: glyphAtlas.image,
                imageAtlas: imageAtlas
            });
        }
    }
};

function recalculateLayers(layers                            , zoom        ) {
    // Layers are shared and may have been used by a WorkerTile with a different zoom.
    var parameters = new __chunk_1.EvaluationParameters(zoom);
    for (var i = 0, list = layers; i < list.length; i += 1) {
        var layer = list[i];

        layer.recalculate(parameters);
    }
}

//      

                                                    

// Wraps performance to facilitate testing
// Not incorporated into browser.js because the latter is poisonous when used outside the main thread
var performanceExists = typeof performance !== 'undefined';
var wrapper = {};

wrapper.getEntriesByName = function (url        ) {
    if (performanceExists && performance && performance.getEntriesByName)
        { return performance.getEntriesByName(url); }
    else
        { return false; }
};

wrapper.mark = function (name        ) {
    if (performanceExists && performance && performance.mark)
        { return performance.mark(name); }
    else
        { return false; }
};

wrapper.measure = function (name        , startMark        , endMark        ) {
    if (performanceExists && performance && performance.measure)
        { return performance.measure(name, startMark, endMark); }
    else
        { return false; }
};

wrapper.clearMarks = function (name        ) {
    if (performanceExists && performance && performance.clearMarks)
        { return performance.clearMarks(name); }
    else
        { return false; }
};

wrapper.clearMeasures = function (name        ) {
    if (performanceExists && performance && performance.clearMeasures)
        { return performance.clearMeasures(name); }
    else
        { return false; }
};

/**
 * Safe wrapper for the performance resource timing API in web workers with graceful degradation
 *
 * @param {RequestParameters} request
 * @private
 */
var Performance = function Performance (request               ) {
    this._marks = {
        start: [request.url, 'start'].join('#'),
        end: [request.url, 'end'].join('#'),
        measure: request.url.toString()
    };

    wrapper.mark(this._marks.start);
};

Performance.prototype.finish = function finish () {
    wrapper.mark(this._marks.end);
    var resourceTimingData = wrapper.getEntriesByName(this._marks.measure);

    // fallback if web worker implementation of perf.getEntriesByName returns empty
    if (resourceTimingData.length === 0) {
        wrapper.measure(this._marks.measure, this._marks.start, this._marks.end);
        resourceTimingData = wrapper.getEntriesByName(this._marks.measure);

        // cleanup
        wrapper.clearMarks(this._marks.start);
        wrapper.clearMarks(this._marks.end);
        wrapper.clearMeasures(this._marks.measure);
    }

    return resourceTimingData;
};

wrapper.Performance = Performance;

//      

             
                 
                         
                       
                  
                                 

                                                                                    
                                       
                                                              
                                                

                                    
                           
                         
                  
                       
                                                      
  

/**
 * @callback LoadVectorDataCallback
 * @param error
 * @param vectorTile
 * @private
 */
                                                                     

                                         
                                                                                                                  

/**
 * @private
 */
function loadVectorTile(params                      , callback                        ) {
    var request = __chunk_1.getArrayBuffer(params.request, function (err, response) {
        if (err) {
            callback(err);
        } else if (response) {
            callback(null, {
                vectorTile: new __chunk_1.mvt.VectorTile(new __chunk_1.Protobuf(response.data)),
                rawData: response.data,
                cacheControl: response.cacheControl,
                expires: response.expires
            });
        }
    });
    return function () {
        request.cancel();
        callback();
    };
}

/**
 * The {@link WorkerSource} implementation that supports {@link VectorTileSource}.
 * This class is designed to be easily reused to support custom source types
 * for data formats that can be parsed/converted into an in-memory VectorTile
 * representation.  To do so, create it with
 * `new VectorTileWorkerSource(actor, styleLayers, customLoadVectorDataFunction)`.
 *
 * @private
 */
var VectorTileWorkerSource = function VectorTileWorkerSource(actor     , layerIndex               , loadVectorData               ) {
      this.actor = actor;
      this.layerIndex = layerIndex;
      this.loadVectorData = loadVectorData || loadVectorTile;
      this.loading = {};
      this.loaded = {};
  };

  /**
   * Implements {@link WorkerSource#loadTile}. Delegates to
   * {@link VectorTileWorkerSource#loadVectorData} (which by default expects
   * a `params.url` property) for fetching and producing a VectorTile object.
   */
  VectorTileWorkerSource.prototype.loadTile = function loadTile (params                    , callback                  ) {
        var this$1 = this;

      var uid = params.uid;

      if (!this.loading)
          { this.loading = {}; }

      var perf = (params && params.request && params.request.collectResourceTiming) ?
          new wrapper.Performance(params.request) : false;

      var workerTile = this.loading[uid] = new WorkerTile(params);
      workerTile.abort = this.loadVectorData(params, function (err, response) {
          delete this$1.loading[uid];

          if (err || !response) {
              return callback(err);
          }

          var rawTileData = response.rawData;
          var cacheControl = {};
          if (response.expires) { cacheControl.expires = response.expires; }
          if (response.cacheControl) { cacheControl.cacheControl = response.cacheControl; }

          var resourceTiming = {};
          if (perf) {
              var resourceTimingData = perf.finish();
              // it's necessary to eval the result of getEntriesByName() here via parse/stringify
              // late evaluation in the main thread causes TypeError: illegal invocation
              if (resourceTimingData)
                  { resourceTiming.resourceTiming = JSON.parse(JSON.stringify(resourceTimingData)); }
          }

          workerTile.vectorTile = response.vectorTile;
          workerTile.parse(response.vectorTile, this$1.layerIndex, this$1.actor, function (err, result) {
              if (err || !result) { return callback(err); }

              // Transferring a copy of rawTileData because the worker needs to retain its copy.
              callback(null, __chunk_1.extend({rawTileData: rawTileData.slice(0)}, result, cacheControl, resourceTiming));
          });

          this$1.loaded = this$1.loaded || {};
          this$1.loaded[uid] = workerTile;
      });
  };

  /**
   * Implements {@link WorkerSource#reloadTile}.
   */
  VectorTileWorkerSource.prototype.reloadTile = function reloadTile (params                    , callback                  ) {
      var loaded = this.loaded,
          uid = params.uid,
          vtSource = this;
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
              workerTile.parse(workerTile.vectorTile, this.layerIndex, this.actor, done);
          }
      }
  };

  /**
   * Implements {@link WorkerSource#abortTile}.
   *
   * @param params
   * @param params.uid The UID for this tile.
   */
  VectorTileWorkerSource.prototype.abortTile = function abortTile (params              , callback                  ) {
      var loading = this.loading,
          uid = params.uid;
      if (loading && loading[uid] && loading[uid].abort) {
          loading[uid].abort();
          delete loading[uid];
      }
      callback();
  };

  /**
   * Implements {@link WorkerSource#removeTile}.
   *
   * @param params
   * @param params.uid The UID for this tile.
   */
  VectorTileWorkerSource.prototype.removeTile = function removeTile (params              , callback                  ) {
      var loaded = this.loaded,
          uid = params.uid;
      if (loaded && loaded[uid]) {
          delete loaded[uid];
      }
      callback();
  };

//      

                                       
             
                            
                          
                  
                         


var RasterDEMTileWorkerSource = function RasterDEMTileWorkerSource() {
    this.loaded = {};
};

RasterDEMTileWorkerSource.prototype.loadTile = function loadTile (params                     , callback                   ) {
    var uid = params.uid;
        var encoding = params.encoding;
        var rawImageData = params.rawImageData;
    var dem = new __chunk_1.DEMData(uid, rawImageData, encoding);

    this.loaded = this.loaded || {};
    this.loaded[uid] = dem;
    callback(null, dem);
};

RasterDEMTileWorkerSource.prototype.removeTile = function removeTile (params            ) {
    var loaded = this.loaded,
        uid = params.uid;
    if (loaded && loaded[uid]) {
        delete loaded[uid];
    }
};

var RADIUS = 6378137;
var FLATTENING = 1/298.257223563;
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

/**
 * Calculate the approximate area of the polygon were it projected onto
 *     the earth.  Note that this area will be positive if ring is oriented
 *     clockwise, otherwise it will be negative.
 *
 * Reference:
 * Robert. G. Chamberlain and William H. Duquette, "Some Algorithms for
 *     Polygons on a Sphere", JPL Publication 07-03, Jet Propulsion
 *     Laboratory, Pasadena, CA, June 2007 http://trs-new.jpl.nasa.gov/dspace/handle/2014/40409
 *
 * Returns:
 * {float} The approximate signed geodesic area of the polygon in square
 *     meters.
 */

function ringArea(coords) {
    var p1, p2, p3, lowerIndex, middleIndex, upperIndex, i,
    area = 0,
    coordsLength = coords.length;

    if (coordsLength > 2) {
        for (i = 0; i < coordsLength; i++) {
            if (i === coordsLength - 2) {// i = N-2
                lowerIndex = coordsLength - 2;
                middleIndex = coordsLength -1;
                upperIndex = 0;
            } else if (i === coordsLength - 1) {// i = N-1
                lowerIndex = coordsLength - 1;
                middleIndex = 0;
                upperIndex = 1;
            } else { // i = 0 to N-3
                lowerIndex = i;
                middleIndex = i+1;
                upperIndex = i+2;
            }
            p1 = coords[lowerIndex];
            p2 = coords[middleIndex];
            p3 = coords[upperIndex];
            area += ( rad(p3[0]) - rad(p1[0]) ) * Math.sin( rad(p2[1]));
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
    switch ((gj && gj.type) || null) {
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
    return function(_) { return a(_, b); };
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

//      
var toGeoJSON = __chunk_1.mvt.VectorTileFeature.prototype.toGeoJSON;

// The feature type used by geojson-vt and supercluster. Should be extracted to
// global type and used in module definitions for those two modules.
                
            
              
                                                
                                      
     
                
              
                                                
                                             
 

var FeatureWrapper = function FeatureWrapper(feature     ) {
    this._feature = feature;

    this.extent = __chunk_1.EXTENT;
    this.type = feature.type;
    this.properties = feature.tags;

    // If the feature has a top-level `id` property, copy it over, but only
    // if it can be coerced to an integer, because this wrapper is used for
    // serializing geojson feature data into vector tile PBF data, and the
    // vector tile spec only supports integer values for feature ids --
    // allowing non-integer values here results in a non-compliant PBF
    // that causes an exception when it is parsed with vector-tile-js
    if ('id' in feature && !isNaN(feature.id)) {
        this.id = parseInt(feature.id, 10);
    }
};

FeatureWrapper.prototype.loadGeometry = function loadGeometry () {
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

FeatureWrapper.prototype.toGeoJSON = function toGeoJSON$1 (x    , y    , z    ) {
    return toGeoJSON.call(this, x, y, z);
};

var GeoJSONWrapper = function GeoJSONWrapper(features            ) {
    this.layers = { '_geojsonTileLayer': this };
    this.name = '_geojsonTileLayer';
    this.extent = __chunk_1.EXTENT;
    this.length = features.length;
    this._features = features;
};

GeoJSONWrapper.prototype.feature = function feature (i    )                {
    return new FeatureWrapper(this._features[i]);
};

'use strict';


var VectorTileFeature = __chunk_1.vectorTile.VectorTileFeature;

var geojson_wrapper = GeoJSONWrapper$1;

// conform to vectortile api
function GeoJSONWrapper$1 (features, options) {
  this.options = options || {};
  this.features = features;
  this.length = features.length;
}

GeoJSONWrapper$1.prototype.feature = function (i) {
  return new FeatureWrapper$1(this.features[i], this.options.extent)
};

function FeatureWrapper$1 (feature, extent) {
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
  return this.geometry
};

FeatureWrapper$1.prototype.bbox = function () {
  if (!this.geometry) { this.loadGeometry(); }

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

  return [x1, y1, x2, y2]
};

FeatureWrapper$1.prototype.toGeoJSON = VectorTileFeature.prototype.toGeoJSON;

var vtPbf = fromVectorTileJs;
var fromVectorTileJs_1 = fromVectorTileJs;
var fromGeojsonVt_1 = fromGeojsonVt;
var GeoJSONWrapper_1 = geojson_wrapper;

/**
 * Serialize a vector-tile-js-created tile to pbf
 *
 * @param {Object} tile
 * @return {Buffer} uncompressed, pbf-serialized tile data
 */
function fromVectorTileJs (tile) {
  var out = new __chunk_1.pbf();
  writeTile(tile, out);
  return out.finish()
}

/**
 * Serialized a geojson-vt-created tile to pbf.
 *
 * @param {Object} layers - An object mapping layer names to geojson-vt-created vector tile objects
 * @param {Object} [options] - An object specifying the vector-tile specification version and extent that were used to create `layers`.
 * @param {Number} [options.version=1] - Version of vector-tile spec used
 * @param {Number} [options.extent=4096] - Extent of the vector tile
 * @return {Buffer} uncompressed, pbf-serialized tile data
 */
function fromGeojsonVt (layers, options) {
  options = options || {};
  var l = {};
  for (var k in layers) {
    l[k] = new geojson_wrapper(layers[k].features, options);
    l[k].name = k;
    l[k].version = options.version;
    l[k].extent = options.extent;
  }
  return fromVectorTileJs({layers: l})
}

function writeTile (tile, pbf) {
  for (var key in tile.layers) {
    pbf.writeMessage(3, writeLayer, tile.layers[key]);
  }
}

function writeLayer (layer, pbf) {
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

function writeFeature (context, pbf) {
  var feature = context.feature;

  if (feature.id !== undefined) {
    pbf.writeVarintField(1, feature.id);
  }

  pbf.writeMessage(2, writeProperties, context);
  pbf.writeVarintField(3, feature.type);
  pbf.writeMessage(4, writeGeometry, feature);
}

function writeProperties (context, pbf) {
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

function command (cmd, length) {
  return (length << 3) + (cmd & 0x7)
}

function zigzag (num) {
  return (num << 1) ^ (num >> 31)
}

function writeGeometry (feature, pbf) {
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
    pbf.writeVarint(command(1, count)); // moveto
    // do not write polygon closing path as lineto
    var lineCount = type === 3 ? ring.length - 1 : ring.length;
    for (var i = 0; i < lineCount; i++) {
      if (i === 1 && type !== 1) {
        pbf.writeVarint(command(2, lineCount - 1)); // lineto
      }
      var dx = ring[i].x - x;
      var dy = ring[i].y - y;
      pbf.writeVarint(zigzag(dx));
      pbf.writeVarint(zigzag(dy));
      x += dx;
      y += dy;
    }
    if (type === 3) {
      pbf.writeVarint(command(7, 0)); // closepath
    }
  }
}

function writeValue (value, pbf) {
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
    if (right - left <= nodeSize) { return; }

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
        if (coords[2 * right + inc] > t) { swapItem(ids, coords, left, right); }

        while (i < j) {
            swapItem(ids, coords, i, j);
            i++;
            j--;
            while (coords[2 * i + inc] < t) { i++; }
            while (coords[2 * j + inc] > t) { j--; }
        }

        if (coords[2 * left + inc] === t) { swapItem(ids, coords, left, j); }
        else {
            j++;
            swapItem(ids, coords, j, right);
        }

        if (j <= k) { left = j + 1; }
        if (k <= j) { right = j - 1; }
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
    var stack = [0, ids.length - 1, 0];
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
                if (x >= minX && x <= maxX && y >= minY && y <= maxY) { result.push(ids[i]); }
            }
            continue;
        }

        var m = Math.floor((left + right) / 2);

        x = coords[2 * m];
        y = coords[2 * m + 1];

        if (x >= minX && x <= maxX && y >= minY && y <= maxY) { result.push(ids[m]); }

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
    var stack = [0, ids.length - 1, 0];
    var result = [];
    var r2 = r * r;

    while (stack.length) {
        var axis = stack.pop();
        var right = stack.pop();
        var left = stack.pop();

        if (right - left <= nodeSize) {
            for (var i = left; i <= right; i++) {
                if (sqDist(coords[2 * i], coords[2 * i + 1], qx, qy) <= r2) { result.push(ids[i]); }
            }
            continue;
        }

        var m = Math.floor((left + right) / 2);

        var x = coords[2 * m];
        var y = coords[2 * m + 1];

        if (sqDist(x, y, qx, qy) <= r2) { result.push(ids[m]); }

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

function defaultGetX(p) { return p[0]; }
function defaultGetY(p) { return p[1]; }

function supercluster(options) {
    return new SuperCluster(options);
}

function SuperCluster(options) {
    this.options = extend(Object.create(this.options), options);
    this.trees = new Array(this.options.maxZoom + 1);
}

SuperCluster.prototype = {
    options: {
        minZoom: 0,   // min zoom to generate clusters on
        maxZoom: 16,  // max zoom level to cluster the points on
        radius: 40,   // cluster radius in pixels
        extent: 512,  // tile extent (radius is calculated relative to it)
        nodeSize: 64, // size of the KD-tree leaf node, affects performance
        log: false,   // whether to log timing info

        // a reduce function for calculating custom cluster properties
        reduce: null, // function (accumulated, props) { accumulated.sum += props.sum; }

        // initial properties of a cluster (before running the reducer)
        initial: function () { return {}; }, // function () { return {sum: 0}; },

        // properties to use for individual points when running the reducer
        map: function (props) { return props; } // function (props) { return {sum: props.my_value}; },
    },

    load: function (points) {
        var this$1 = this;

        var log = this.options.log;

        if (log) { console.time('total time'); }

        var timerId = 'prepare ' + points.length + ' points';
        if (log) { console.time(timerId); }

        this.points = points;

        // generate a cluster object for each point and index input points into a KD-tree
        var clusters = [];
        for (var i = 0; i < points.length; i++) {
            if (!points[i].geometry) {
                continue;
            }
            clusters.push(createPointCluster(points[i], i));
        }
        this.trees[this.options.maxZoom + 1] = kdbush(clusters, getX, getY, this.options.nodeSize, Float32Array);

        if (log) { console.timeEnd(timerId); }

        // cluster points on max zoom, then cluster the results on previous zoom, etc.;
        // results in a cluster hierarchy across zoom levels
        for (var z = this.options.maxZoom; z >= this.options.minZoom; z--) {
            var now = +Date.now();

            // create a new set of clusters for the zoom and index them with a KD-tree
            clusters = this$1._cluster(clusters, z);
            this$1.trees[z] = kdbush(clusters, getX, getY, this$1.options.nodeSize, Float32Array);

            if (log) { console.log('z%d: %d clusters in %dms', z, clusters.length, +Date.now() - now); }
        }

        if (log) { console.timeEnd('total time'); }

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
            var easternHem = this.getClusters([minLng, minLat, 180, maxLat], zoom);
            var westernHem = this.getClusters([-180, minLat, maxLng, maxLat], zoom);
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
        if (!index) { throw new Error(errorMsg); }

        var origin = index.points[originId];
        if (!origin) { throw new Error(errorMsg); }

        var r = this.options.radius / (this.options.extent * Math.pow(2, originZoom - 1));
        var ids = index.within(origin.x, origin.y, r);
        var children = [];
        for (var i = 0; i < ids.length; i++) {
            var c = index.points[ids[i]];
            if (c.parentId === clusterId) {
                children.push(c.numPoints ? getClusterJSON(c) : this$1.points[c.index]);
            }
        }

        if (children.length === 0) { throw new Error(errorMsg); }

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

        var tile = {
            features: []
        };

        this._addTileFeatures(
            tree.range((x - p) / z2, top, (x + 1 + p) / z2, bottom),
            tree.points, x, y, z2, tile);

        if (x === 0) {
            this._addTileFeatures(
                tree.range(1 - p / z2, top, 1, bottom),
                tree.points, z2, y, z2, tile);
        }
        if (x === z2 - 1) {
            this._addTileFeatures(
                tree.range(0, top, p / z2, bottom),
                tree.points, -1, y, z2, tile);
        }

        return tile.features.length ? tile : null;
    },

    getClusterExpansionZoom: function (clusterId) {
        var this$1 = this;

        var clusterZoom = (clusterId % 32) - 1;
        while (clusterZoom < this.options.maxZoom) {
            var children = this$1.getChildren(clusterId);
            clusterZoom++;
            if (children.length !== 1) { break; }
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
                    // skip the whole cluster
                    skipped += props.point_count;
                } else {
                    // enter the cluster
                    skipped = this$1._appendLeaves(result, props.cluster_id, limit, offset, skipped);
                    // exit the cluster
                }
            } else if (skipped < offset) {
                // skip a single point
                skipped++;
            } else {
                // add a single point
                result.push(children[i]);
            }
            if (result.length === limit) { break; }
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

        // loop through each point
        for (var i = 0; i < points.length; i++) {
            var p = points[i];
            // if we've already visited the point at this zoom level, skip it
            if (p.zoom <= zoom) { continue; }
            p.zoom = zoom;

            // find all nearby points
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

            // encode both zoom and point index on which the cluster originated
            var id = (i << 5) + (zoom + 1);

            for (var j = 0; j < neighborIds.length; j++) {
                var b = tree.points[neighborIds[j]];
                // filter out neighbors that are already processed
                if (b.zoom <= zoom) { continue; }
                b.zoom = zoom; // save the zoom (so it doesn't get processed twice)

                var numPoints2 = b.numPoints || 1;
                wx += b.x * numPoints2; // accumulate coordinates for calculating weighted center
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
        var properties = point.numPoints ?
            point.properties :
            this.options.map(this.points[point.index].properties);

        this.options.reduce(clusterProperties, properties);
    }
};

function createCluster(x, y, id, numPoints, properties) {
    return {
        x: x, // weighted cluster center
        y: y,
        zoom: Infinity, // the last zoom the cluster was processed at
        id: id, // encodes index of the first child of the cluster and its zoom level
        parentId: -1, // parent cluster id
        numPoints: numPoints,
        properties: properties
    };
}

function createPointCluster(p, id) {
    var coords = p.geometry.coordinates;
    return {
        x: lngX(coords[0]), // projected point coordinates
        y: latY(coords[1]),
        zoom: Infinity, // the last zoom the point was processed at
        index: id, // index of the source feature in the original input array,
        parentId: -1 // parent cluster id
    };
}

function getClusterJSON(cluster) {
    return {
        type: 'Feature',
        id: cluster.id,
        properties: getClusterProperties(cluster),
        geometry: {
            type: 'Point',
            coordinates: [xLng(cluster.x), yLat(cluster.y)]
        }
    };
}

function getClusterProperties(cluster) {
    var count = cluster.numPoints;
    var abbrev =
        count >= 10000 ? Math.round(count / 1000) + 'k' :
        count >= 1000 ? (Math.round(count / 100) / 10) + 'k' : count;
    return extend(extend({}, cluster.properties), {
        cluster: true,
        cluster_id: cluster.id,
        point_count: count,
        point_count_abbreviated: abbrev
    });
}

// longitude/latitude to spherical mercator in [0..1] range
function lngX(lng) {
    return lng / 360 + 0.5;
}
function latY(lat) {
    var sin = Math.sin(lat * Math.PI / 180),
        y = (0.5 - 0.25 * Math.log((1 + sin) / (1 - sin)) / Math.PI);
    return y < 0 ? 0 : y > 1 ? 1 : y;
}

// spherical mercator to longitude/latitude
function xLng(x) {
    return (x - 0.5) * 360;
}
function yLat(y) {
    var y2 = (180 - y * 360) * Math.PI / 180;
    return 360 * Math.atan(Math.exp(y2)) / Math.PI - 90;
}

function extend(dest, src) {
    for (var id in src) { dest[id] = src[id]; }
    return dest;
}

function getX(p) {
    return p.x;
}
function getY(p) {
    return p.y;
}

// calculate simplification data using optimized Douglas-Peucker algorithm

function simplify(coords, first, last, sqTolerance) {
    var maxSqDist = sqTolerance;
    var mid = (last - first) >> 1;
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
            // a workaround to ensure we choose a pivot close to the middle of the list,
            // reducing recursion depth, for certain degenerate inputs
            // https://github.com/mapbox/geojson-vt/issues/104
            var posToMid = Math.abs(i - mid);
            if (posToMid < minPosToMid) {
                index = i;
                minPosToMid = posToMid;
            }
        }
    }

    if (maxSqDist > sqTolerance) {
        if (index - first > 3) { simplify(coords, first, index, sqTolerance); }
        coords[index + 2] = maxSqDist;
        if (last - index > 3) { simplify(coords, index, last, sqTolerance); }
    }
}

// square distance from a point to a segment
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

// converts GeoJSON feature into an intermediate projected JSON vector format with simplification data

function convert(data, options) {
    var features = [];
    if (data.type === 'FeatureCollection') {
        for (var i = 0; i < data.features.length; i++) {
            convertFeature(features, data.features[i], options, i);
        }

    } else if (data.type === 'Feature') {
        convertFeature(features, data, options);

    } else {
        // single geometry or a geometry collection
        convertFeature(features, {geometry: data}, options);
    }

    return features;
}

function convertFeature(features, geojson, options, index) {
    if (!geojson.geometry) { return; }

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
            // explode into linestrings to be able to track metrics
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
                size += (x0 * y - x * y0) / 2; // area
            } else {
                size += Math.sqrt(Math.pow(x - x0, 2) + Math.pow(y - y0, 2)); // length
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

/* clip features between two axis-parallel lines:
 *     |        |
 *  ___|___     |     /
 * /   |   \____|____/
 *     |        |
 */

function clip(features, scale, k1, k2, axis, minAll, maxAll, options) {

    k1 /= scale;
    k2 /= scale;

    if (minAll >= k1 && maxAll < k2) { return features; } // trivial accept
    else if (maxAll < k1 || minAll >= k2) { return null; } // trivial reject

    var clipped = [];

    for (var i = 0; i < features.length; i++) {

        var feature = features[i];
        var geometry = feature.geometry;
        var type = feature.type;

        var min = axis === 0 ? feature.minX : feature.minY;
        var max = axis === 0 ? feature.maxX : feature.maxY;

        if (min >= k1 && max < k2) { // trivial accept
            clipped.push(feature);
            continue;
        } else if (max < k1 || min >= k2) { // trivial reject
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

        if (trackMetrics) { segLen = Math.sqrt(Math.pow(ax - bx, 2) + Math.pow(ay - by, 2)); }

        if (a < k1) {
            // ---|-->  | (line enters the clip region from the left)
            if (b >= k1) {
                t = intersect(slice, ax, ay, bx, by, k1);
                if (trackMetrics) { slice.start = len + segLen * t; }
            }
        } else if (a >= k2) {
            // |  <--|--- (line enters the clip region from the right)
            if (b < k2) {
                t = intersect(slice, ax, ay, bx, by, k2);
                if (trackMetrics) { slice.start = len + segLen * t; }
            }
        } else {
            addPoint(slice, ax, ay, az);
        }
        if (b < k1 && a >= k1) {
            // <--|---  | or <--|-----|--- (line exits the clip region on the left)
            t = intersect(slice, ax, ay, bx, by, k1);
            exited = true;
        }
        if (b > k2 && a <= k2) {
            // |  ---|--> or ---|-----|--> (line exits the clip region on the right)
            t = intersect(slice, ax, ay, bx, by, k2);
            exited = true;
        }

        if (!isPolygon && exited) {
            if (trackMetrics) { slice.end = len + segLen * t; }
            newGeom.push(slice);
            slice = newSlice(geom);
        }

        if (trackMetrics) { len += segLen; }
    }

    // add the last point
    var last = geom.length - 3;
    ax = geom[last];
    ay = geom[last + 1];
    az = geom[last + 2];
    a = axis === 0 ? ax : ay;
    if (a >= k1 && a <= k2) { addPoint(slice, ax, ay, az); }

    // close the polygon if its endpoints are not the same after clipping
    last = slice.length - 3;
    if (isPolygon && last >= 3 && (slice[last] !== slice[0] || slice[last + 1] !== slice[1])) {
        addPoint(slice, slice[0], slice[1], slice[2]);
    }

    // add the final slice
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
    var left  = clip(features, 1, -1 - buffer, buffer,     0, -1, 2, options); // left world copy
    var right = clip(features, 1,  1 - buffer, 2 + buffer, 0, -1, 2, options); // right world copy

    if (left || right) {
        merged = clip(features, 1, -buffer, 1 + buffer, 0, -1, 2, options) || []; // center world copy

        if (left) { merged = shiftFeatureCoords(left, 1).concat(merged); } // merge left into center
        if (right) { merged = merged.concat(shiftFeatureCoords(right, -1)); } // merge right into center
    }

    return merged;
}

function shiftFeatureCoords(features, offset) {
    var newFeatures = [];

    for (var i = 0; i < features.length; i++) {
        var feature = features[i],
            type = feature.type;

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

// Transforms the coordinates of each feature in the given tile from
// mercator-projected space into (extent x extent) tile space.
function transformTile(tile, extent) {
    if (tile.transformed) { return tile; }

    var z2 = 1 << tile.z,
        tx = tile.x,
        ty = tile.y,
        i, j, k;

    for (i = 0; i < tile.features.length; i++) {
        var feature = tile.features[i],
            geom = feature.geometry,
            type = feature.type;

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
        Math.round(extent * (y * z2 - ty))];
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

        if (minX < tile.minX) { tile.minX = minX; }
        if (minY < tile.minY) { tile.minY = minY; }
        if (maxX > tile.maxX) { tile.maxX = maxX; }
        if (maxY > tile.maxY) { tile.maxY = maxY; }
    }
    return tile;
}

function addFeature$1(tile, feature, tolerance, options) {

    var geom = feature.geometry,
        type = feature.type,
        simplified = [];

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
            for (var key in feature.tags) { tags[key] = feature.tags[key]; }
            tags['mapbox_clip_start'] = geom.start / geom.size;
            tags['mapbox_clip_end'] = geom.end / geom.size;
        }
        var tileFeature = {
            geometry: simplified,
            type: type === 'Polygon' || type === 'MultiPolygon' ? 3 :
                type === 'LineString' || type === 'MultiLineString' ? 2 : 1,
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

    if (tolerance > 0 && (geom.size < (isPolygon ? sqTolerance : tolerance))) {
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

    if (isPolygon) { rewind$1(ring, isOuter); }

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

    if (debug) { console.time('preprocess data'); }

    if (options.maxZoom < 0 || options.maxZoom > 24) { throw new Error('maxZoom should be in the 0-24 range'); }
    if (options.promoteId && options.generateId) { throw new Error('promoteId and generateId cannot be used together.'); }

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

    // start slicing from the top tile down
    if (features.length) { this.splitTile(features, 0, 0, 0); }

    if (debug) {
        if (features.length) { console.log('features: %d, points: %d', this.tiles[0].numFeatures, this.tiles[0].numPoints); }
        console.timeEnd('generate tiles');
        console.log('tiles generated:', this.total, JSON.stringify(this.stats));
    }
}

GeoJSONVT.prototype.options = {
    maxZoom: 14,            // max zoom to preserve detail on
    indexMaxZoom: 5,        // max zoom in the tile index
    indexMaxPoints: 100000, // max number of points per tile in the tile index
    tolerance: 3,           // simplification tolerance (higher means simpler)
    extent: 4096,           // tile extent
    buffer: 64,             // tile buffer on each side
    lineMetrics: false,     // whether to calculate line metrics
    promoteId: null,        // name of a feature property to be promoted to feature.id
    generateId: false,      // whether to generate feature ids. Cannot be used with promoteId
    debug: 0                // logging level (0, 1 or 2)
};

GeoJSONVT.prototype.splitTile = function (features, z, x, y, cz, cx, cy) {
    var this$1 = this;


    var stack = [features, z, x, y],
        options = this.options,
        debug = options.debug;

    // avoid recursion by using a processing queue
    while (stack.length) {
        y = stack.pop();
        x = stack.pop();
        z = stack.pop();
        features = stack.pop();

        var z2 = 1 << z,
            id = toID(z, x, y),
            tile = this$1.tiles[id];

        if (!tile) {
            if (debug > 1) { console.time('creation'); }

            tile = this$1.tiles[id] = createTile(features, z, x, y, options);
            this$1.tileCoords.push({z: z, x: x, y: y});

            if (debug) {
                if (debug > 1) {
                    console.log('tile z%d-%d-%d (features: %d, points: %d, simplified: %d)',
                        z, x, y, tile.numFeatures, tile.numPoints, tile.numSimplified);
                    console.timeEnd('creation');
                }
                var key = 'z' + z;
                this$1.stats[key] = (this$1.stats[key] || 0) + 1;
                this$1.total++;
            }
        }

        // save reference to original geometry in tile so that we can drill down later if we stop now
        tile.source = features;

        // if it's the first-pass tiling
        if (!cz) {
            // stop tiling if we reached max zoom, or if the tile is too simple
            if (z === options.indexMaxZoom || tile.numPoints <= options.indexMaxPoints) { continue; }

        // if a drilldown to a specific tile
        } else {
            // stop tiling if we reached base zoom or our target tile zoom
            if (z === options.maxZoom || z === cz) { continue; }

            // stop tiling if it's not an ancestor of the target tile
            var m = 1 << (cz - z);
            if (x !== Math.floor(cx / m) || y !== Math.floor(cy / m)) { continue; }
        }

        // if we slice further down, no need to keep source geometry
        tile.source = null;

        if (features.length === 0) { continue; }

        if (debug > 1) { console.time('clipping'); }

        // values we'll use for clipping
        var k1 = 0.5 * options.buffer / options.extent,
            k2 = 0.5 - k1,
            k3 = 0.5 + k1,
            k4 = 1 + k1,
            tl, bl, tr, br, left, right;

        tl = bl = tr = br = null;

        left  = clip(features, z2, x - k1, x + k3, 0, tile.minX, tile.maxX, options);
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

        if (debug > 1) { console.timeEnd('clipping'); }

        stack.push(tl || [], z + 1, x * 2,     y * 2);
        stack.push(bl || [], z + 1, x * 2,     y * 2 + 1);
        stack.push(tr || [], z + 1, x * 2 + 1, y * 2);
        stack.push(br || [], z + 1, x * 2 + 1, y * 2 + 1);
    }
};

GeoJSONVT.prototype.getTile = function (z, x, y) {
    var this$1 = this;

    var options = this.options,
        extent = options.extent,
        debug = options.debug;

    if (z < 0 || z > 24) { return null; }

    var z2 = 1 << z;
    x = ((x % z2) + z2) % z2; // wrap tile x coordinate

    var id = toID(z, x, y);
    if (this.tiles[id]) { return transformTile(this.tiles[id], extent); }

    if (debug > 1) { console.log('drilling down to z%d-%d-%d', z, x, y); }

    var z0 = z,
        x0 = x,
        y0 = y,
        parent;

    while (!parent && z0 > 0) {
        z0--;
        x0 = Math.floor(x0 / 2);
        y0 = Math.floor(y0 / 2);
        parent = this$1.tiles[toID(z0, x0, y0)];
    }

    if (!parent || !parent.source) { return null; }

    // if we found a parent tile containing the original geometry, we can drill down from it
    if (debug > 1) { console.log('found parent tile z%d-%d-%d', z0, x0, y0); }

    if (debug > 1) { console.time('drilling down'); }
    this.splitTile(parent.source, z0, x0, y0, z, x, y);
    if (debug > 1) { console.timeEnd('drilling down'); }

    return this.tiles[id] ? transformTile(this.tiles[id], extent) : null;
};

function toID(z, x, y) {
    return (((1 << z) * y + x) * 32) + z;
}

function extend$1(dest, src) {
    for (var i in src) { dest[i] = src[i]; }
    return dest;
}

//      

             
                         
                       
                                 

                                       
                                                              

                                                                        
                                                    
                                                  
                                                          

                                     
                                
                  
                   
                     
                                 
                             
  

                                                                                             

                               
                                                     

                           
                                                       
                                                          
                                                                                       
 

function loadGeoJSONTile(params                      , callback                        ) {
    var canonical = params.tileID.canonical;

    if (!this._geoJSONIndex) {
        return callback(null, null);  // we couldn't load the file
    }

    var geoJSONTile = this._geoJSONIndex.getTile(canonical.z, canonical.x, canonical.y);
    if (!geoJSONTile) {
        return callback(null, null); // nothing in the given tile
    }

    var geojsonWrapper = new GeoJSONWrapper(geoJSONTile.features);

    // Encode the geojson-vt tile into binary vector tile form.  This
    // is a convenience that allows `FeatureIndex` to operate the same way
    // across `VectorTileSource` and `GeoJSONSource` data.
    var pbf = vtPbf(geojsonWrapper);
    if (pbf.byteOffset !== 0 || pbf.byteLength !== pbf.buffer.byteLength) {
        // Compatibility with node Buffer (https://github.com/mapbox/pbf/issues/35)
        pbf = new Uint8Array(pbf);
    }

    callback(null, {
        vectorTile: geojsonWrapper,
        rawData: pbf.buffer
    });
}

                         
                                                      
                                                                                                             
                        // 'loadData' received while coalescing, trigger one more 'loadData' on receiving 'coalesced'

/**
 * The {@link WorkerSource} implementation that supports {@link GeoJSONSource}.
 * This class is designed to be easily reused to support custom source types
 * for data formats that can be parsed/converted into an in-memory GeoJSON
 * representation.  To do so, create it with
 * `new GeoJSONWorkerSource(actor, layerIndex, customLoadGeoJSONFunction)`.
 * For a full example, see [mapbox-gl-topojson](https://github.com/developmentseed/mapbox-gl-topojson).
 *
 * @private
 */
var GeoJSONWorkerSource = (function (VectorTileWorkerSource$$1) {
  function GeoJSONWorkerSource(actor       , layerIndex                 , loadGeoJSON              ) {
        VectorTileWorkerSource$$1.call(this, actor, layerIndex, loadGeoJSONTile);
        if (loadGeoJSON) {
            this.loadGeoJSON = loadGeoJSON;
        }
    }

  if ( VectorTileWorkerSource$$1 ) GeoJSONWorkerSource.__proto__ = VectorTileWorkerSource$$1;
  GeoJSONWorkerSource.prototype = Object.create( VectorTileWorkerSource$$1 && VectorTileWorkerSource$$1.prototype );
  GeoJSONWorkerSource.prototype.constructor = GeoJSONWorkerSource;

    /**
     * Fetches (if appropriate), parses, and index geojson data into tiles. This
     * preparatory method must be called before {@link GeoJSONWorkerSource#loadTile}
     * can correctly serve up tiles.
     *
     * Defers to {@link GeoJSONWorkerSource#loadGeoJSON} for the fetching/parsing,
     * expecting `callback(error, data)` to be called with either an error or a
     * parsed GeoJSON object.
     *
     * When `loadData` requests come in faster than they can be processed,
     * they are coalesced into a single request using the latest data.
     * See {@link GeoJSONWorkerSource#coalesce}
     *
     * @param params
     * @param callback
     */
    GeoJSONWorkerSource.prototype.loadData = function loadData (params                       , callback            
                                                                      
                              ) {
        if (this._pendingCallback) {
            // Tell the foreground the previous call has been abandoned
            this._pendingCallback(null, { abandoned: true });
        }
        this._pendingCallback = callback;
        this._pendingLoadDataParams = params;

        if (this._state &&
            this._state !== 'Idle') {
            this._state = 'NeedsLoadData';
        } else {
            this._state = 'Coalescing';
            this._loadData();
        }
    };

    /**
     * Internal implementation: called directly by `loadData`
     * or by `coalesce` using stored parameters.
     */
    GeoJSONWorkerSource.prototype._loadData = function _loadData () {
        var this$1 = this;

        if (!this._pendingCallback || !this._pendingLoadDataParams) {
            __chunk_1.assert(false);
            return;
        }
        var callback = this._pendingCallback;
        var params = this._pendingLoadDataParams;
        delete this._pendingCallback;
        delete this._pendingLoadDataParams;

        var perf = (params && params.request && params.request.collectResourceTiming) ?
            new wrapper.Performance(params.request) : false;

        this.loadGeoJSON(params, function (err, data) {
            if (err || !data) {
                return callback(err);
            } else if (typeof data !== 'object') {
                return callback(new Error("Input data is not a valid GeoJSON object."));
            } else {
                geojsonRewind(data, true);

                try {
                    this$1._geoJSONIndex = params.cluster ?
                        supercluster(params.superclusterOptions).load(data.features) :
                        geojsonvt(data, params.geojsonVtOptions);
                } catch (err) {
                    return callback(err);
                }

                this$1.loaded = {};

                var result = {};
                if (perf) {
                    var resourceTimingData = perf.finish();
                    // it's necessary to eval the result of getEntriesByName() here via parse/stringify
                    // late evaluation in the main thread causes TypeError: illegal invocation
                    if (resourceTimingData) {
                        result.resourceTiming = {};
                        result.resourceTiming[params.source] = JSON.parse(JSON.stringify(resourceTimingData));
                    }
                }
                callback(null, result);
            }
        });
    };

    /**
     * While processing `loadData`, we coalesce all further
     * `loadData` messages into a single call to _loadData
     * that will happen once we've finished processing the
     * first message. {@link GeoJSONSource#_updateWorkerData}
     * is responsible for sending us the `coalesce` message
     * at the time it receives a response from `loadData`
     *
     *          State: Idle
     *          ↑          |
     *     'coalesce'   'loadData'
     *          |     (triggers load)
     *          |          ↓
     *        State: Coalescing
     *          ↑          |
     *   (triggers load)   |
     *     'coalesce'   'loadData'
     *          |          ↓
     *        State: NeedsLoadData
     */
    GeoJSONWorkerSource.prototype.coalesce = function coalesce () {
        if (this._state === 'Coalescing') {
            this._state = 'Idle';
        } else if (this._state === 'NeedsLoadData') {
            this._state = 'Coalescing';
            this._loadData();
        }
    };

    /**
    * Implements {@link WorkerSource#reloadTile}.
    *
    * If the tile is loaded, uses the implementation in VectorTileWorkerSource.
    * Otherwise, such as after a setData() call, we load the tile fresh.
    *
    * @param params
    * @param params.uid The UID for this tile.
    */
    GeoJSONWorkerSource.prototype.reloadTile = function reloadTile (params                      , callback                    ) {
        var loaded = this.loaded,
            uid = params.uid;

        if (loaded && loaded[uid]) {
            return VectorTileWorkerSource$$1.prototype.reloadTile.call(this, params, callback);
        } else {
            return this.loadTile(params, callback);
        }
    };

    /**
     * Fetch and parse GeoJSON according to the given params.  Calls `callback`
     * with `(err, data)`, where `data` is a parsed GeoJSON object.
     *
     * GeoJSON is loaded and parsed from `params.url` if it exists, or else
     * expected as a literal (string or object) `params.data`.
     *
     * @param params
     * @param [params.url] A URL to the remote GeoJSON data.
     * @param [params.data] Literal GeoJSON data. Must be provided if `params.url` is not.
     */
    GeoJSONWorkerSource.prototype.loadGeoJSON = function loadGeoJSON (params                       , callback                 ) {
        // Because of same origin issues, urls must either include an explicit
        // origin or absolute path.
        // ie: /foo/bar.json or http://example.com/bar.json
        // but not ../foo/bar.json
        if (params.request) {
            __chunk_1.getJSON(params.request, callback);
        } else if (typeof params.data === 'string') {
            try {
                return callback(null, JSON.parse(params.data));
            } catch (e) {
                return callback(new Error("Input data is not a valid GeoJSON object."));
            }
        } else {
            return callback(new Error("Input data is not a valid GeoJSON object."));
        }
    };

    GeoJSONWorkerSource.prototype.removeSource = function removeSource (params                  , callback                 ) {
        if (this._pendingCallback) {
            // Don't leak callbacks
            this._pendingCallback(null, { abandoned: true });
        }
        callback();
    };

    GeoJSONWorkerSource.prototype.getClusterExpansionZoom = function getClusterExpansionZoom (params                     , callback                  ) {
        callback(null, this._geoJSONIndex.getClusterExpansionZoom(params.clusterId));
    };

    GeoJSONWorkerSource.prototype.getClusterChildren = function getClusterChildren (params                     , callback                                 ) {
        callback(null, this._geoJSONIndex.getChildren(params.clusterId));
    };

    GeoJSONWorkerSource.prototype.getClusterLeaves = function getClusterLeaves (params                                                    , callback                                 ) {
        callback(null, this._geoJSONIndex.getLeaves(params.clusterId, params.limit, params.offset));
    };

  return GeoJSONWorkerSource;
}(VectorTileWorkerSource));

//      

             
                 
                         
                            
                       
                          
                  
                                 

                                                                   
                                                
                                                            

/**
 * @private
 */
var Worker$1 = function Worker(self                        ) {
    var this$1 = this;

    this.self = self;
    this.actor = new __chunk_1.Actor(self, this);

    this.layerIndexes = {};

    this.workerSourceTypes = {
        vector: VectorTileWorkerSource,
        geojson: GeoJSONWorkerSource
    };

    // [mapId][sourceType][sourceName] => worker source instance
    this.workerSources = {};
    this.demWorkerSources = {};

    this.self.registerWorkerSource = function (name    , WorkerSource                 ) {
        if (this$1.workerSourceTypes[name]) {
            throw new Error(("Worker source with name \"" + name + "\" already registered."));
        }
        this$1.workerSourceTypes[name] = WorkerSource;
    };

    this.self.registerRTLTextPlugin = function (rtlTextPlugin                                                                                                           ) {
        if (__chunk_1.plugin.isLoaded()) {
            throw new Error('RTL text plugin already registered.');
        }
        __chunk_1.plugin['applyArabicShaping'] = rtlTextPlugin.applyArabicShaping;
        __chunk_1.plugin['processBidirectionalText'] = rtlTextPlugin.processBidirectionalText;
        __chunk_1.plugin['processStyledBidirectionalText'] = rtlTextPlugin.processStyledBidirectionalText;
    };
};

Worker$1.prototype.setLayers = function setLayers (mapId    , layers                       , callback                ) {
    this.getLayerIndex(mapId).replace(layers);
    callback();
};

Worker$1.prototype.updateLayers = function updateLayers (mapId    , params                                                            , callback                ) {
    this.getLayerIndex(mapId).update(params.layers, params.removedIds);
    callback();
};

Worker$1.prototype.loadTile = function loadTile (mapId    , params                                   , callback                ) {
    __chunk_1.assert(params.type);
    this.getWorkerSource(mapId, params.type, params.source).loadTile(params, callback);
};

Worker$1.prototype.loadDEMTile = function loadDEMTile (mapId    , params                     , callback                   ) {
    this.getDEMWorkerSource(mapId, params.source).loadTile(params, callback);
};

Worker$1.prototype.reloadTile = function reloadTile (mapId    , params                                   , callback                ) {
    __chunk_1.assert(params.type);
    this.getWorkerSource(mapId, params.type, params.source).reloadTile(params, callback);
};

Worker$1.prototype.abortTile = function abortTile (mapId    , params                             , callback                ) {
    __chunk_1.assert(params.type);
    this.getWorkerSource(mapId, params.type, params.source).abortTile(params, callback);
};

Worker$1.prototype.removeTile = function removeTile (mapId    , params                             , callback                ) {
    __chunk_1.assert(params.type);
    this.getWorkerSource(mapId, params.type, params.source).removeTile(params, callback);
};

Worker$1.prototype.removeDEMTile = function removeDEMTile (mapId    , params            ) {
    this.getDEMWorkerSource(mapId, params.source).removeTile(params);
};

Worker$1.prototype.removeSource = function removeSource (mapId    , params                               , callback                ) {
    __chunk_1.assert(params.type);
    __chunk_1.assert(params.source);

    if (!this.workerSources[mapId] ||
        !this.workerSources[mapId][params.type] ||
        !this.workerSources[mapId][params.type][params.source]) {
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

/**
 * Load a {@link WorkerSource} script at params.url.  The script is run
 * (using importScripts) with `registerWorkerSource` in scope, which is a
 * function taking `(name, workerSourceObject)`.
 *  @private
 */
Worker$1.prototype.loadWorkerSource = function loadWorkerSource (map    , params             , callback            ) {
    try {
        this.self.importScripts(params.url);
        callback();
    } catch (e) {
        callback(e.toString());
    }
};

Worker$1.prototype.loadRTLTextPlugin = function loadRTLTextPlugin (map    , pluginURL    , callback            ) {
    try {
        if (!__chunk_1.plugin.isLoaded()) {
            this.self.importScripts(pluginURL);
            callback(__chunk_1.plugin.isLoaded() ?
                null :
                new Error(("RTL Text Plugin failed to import scripts from " + pluginURL)));
        }
    } catch (e) {
        callback(e.toString());
    }
};

Worker$1.prototype.getLayerIndex = function getLayerIndex (mapId    ) {
    var layerIndexes = this.layerIndexes[mapId];
    if (!layerIndexes) {
        layerIndexes = this.layerIndexes[mapId] = new StyleLayerIndex();
    }
    return layerIndexes;
};

Worker$1.prototype.getWorkerSource = function getWorkerSource (mapId    , type    , source    ) {
        var this$1 = this;

    if (!this.workerSources[mapId])
        { this.workerSources[mapId] = {}; }
    if (!this.workerSources[mapId][type])
        { this.workerSources[mapId][type] = {}; }

    if (!this.workerSources[mapId][type][source]) {
        // use a wrapped actor so that we can attach a target mapId param
        // to any messages invoked by the WorkerSource
        var actor = {
            send: function (type, data, callback) {
                this$1.actor.send(type, data, callback, mapId);
            }
        };

        this.workerSources[mapId][type][source] = new (this.workerSourceTypes[type] )((actor ), this.getLayerIndex(mapId));
    }

    return this.workerSources[mapId][type][source];
};

Worker$1.prototype.getDEMWorkerSource = function getDEMWorkerSource (mapId    , source    ) {
    if (!this.demWorkerSources[mapId])
        { this.demWorkerSources[mapId] = {}; }

    if (!this.demWorkerSources[mapId][source]) {
        this.demWorkerSources[mapId][source] = new RasterDEMTileWorkerSource();
    }

    return this.demWorkerSources[mapId][source];
};

/* global self, WorkerGlobalScope */
if (typeof WorkerGlobalScope !== 'undefined' &&
    typeof self !== 'undefined' &&
    self instanceof WorkerGlobalScope) {
    new Worker$1(self);
}

return Worker$1;

});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2VyLmpzIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvc3R5bGUtc3BlYy9ncm91cF9ieV9sYXlvdXQuanMiLCIuLi8uLi8uLi9zcmMvc3R5bGUvc3R5bGVfbGF5ZXJfaW5kZXguanMiLCIuLi8uLi8uLi9zcmMvc3ltYm9sL2NoZWNrX21heF9hbmdsZS5qcyIsIi4uLy4uLy4uL3NyYy9zeW1ib2wvZ2V0X2FuY2hvcnMuanMiLCIuLi8uLi8uLi9zcmMvc3ltYm9sL2NsaXBfbGluZS5qcyIsIi4uLy4uLy4uL3NyYy9zeW1ib2wvcXVhZHMuanMiLCIuLi8uLi8uLi9zcmMvc3ltYm9sL2NvbGxpc2lvbl9mZWF0dXJlLmpzIiwiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL3RpbnlxdWV1ZS9pbmRleC5qcyIsIi4uLy4uLy4uL3NyYy91dGlsL2ZpbmRfcG9sZV9vZl9pbmFjY2Vzc2liaWxpdHkuanMiLCIuLi8uLi8uLi9ub2RlX21vZHVsZXMvbXVybXVyaGFzaC1qcy9tdXJtdXJoYXNoM19nYy5qcyIsIi4uLy4uLy4uL25vZGVfbW9kdWxlcy9tdXJtdXJoYXNoLWpzL211cm11cmhhc2gyX2djLmpzIiwiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL211cm11cmhhc2gtanMvaW5kZXguanMiLCIuLi8uLi8uLi9zcmMvc3ltYm9sL3N5bWJvbF9sYXlvdXQuanMiLCIuLi8uLi8uLi9zcmMvcmVuZGVyL2dseXBoX2F0bGFzLmpzIiwiLi4vLi4vLi4vc3JjL3NvdXJjZS93b3JrZXJfdGlsZS5qcyIsIi4uLy4uLy4uL3NyYy91dGlsL3BlcmZvcm1hbmNlLmpzIiwiLi4vLi4vLi4vc3JjL3NvdXJjZS92ZWN0b3JfdGlsZV93b3JrZXJfc291cmNlLmpzIiwiLi4vLi4vLi4vc3JjL3NvdXJjZS9yYXN0ZXJfZGVtX3RpbGVfd29ya2VyX3NvdXJjZS5qcyIsIi4uLy4uLy4uL25vZGVfbW9kdWxlcy93Z3M4NC9pbmRleC5qcyIsIi4uLy4uLy4uL25vZGVfbW9kdWxlcy9AbWFwYm94L2dlb2pzb24tYXJlYS9pbmRleC5qcyIsIi4uLy4uLy4uL25vZGVfbW9kdWxlcy9nZW9qc29uLXJld2luZC9pbmRleC5qcyIsIi4uLy4uLy4uL3NyYy9zb3VyY2UvZ2VvanNvbl93cmFwcGVyLmpzIiwiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL3Z0LXBiZi9saWIvZ2VvanNvbl93cmFwcGVyLmpzIiwiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL3Z0LXBiZi9pbmRleC5qcyIsIi4uLy4uLy4uL25vZGVfbW9kdWxlcy9rZGJ1c2gvc3JjL3NvcnQuanMiLCIuLi8uLi8uLi9ub2RlX21vZHVsZXMva2RidXNoL3NyYy9yYW5nZS5qcyIsIi4uLy4uLy4uL25vZGVfbW9kdWxlcy9rZGJ1c2gvc3JjL3dpdGhpbi5qcyIsIi4uLy4uLy4uL25vZGVfbW9kdWxlcy9rZGJ1c2gvc3JjL2luZGV4LmpzIiwiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL3N1cGVyY2x1c3Rlci9pbmRleC5qcyIsIi4uLy4uLy4uL25vZGVfbW9kdWxlcy9nZW9qc29uLXZ0L3NyYy9zaW1wbGlmeS5qcyIsIi4uLy4uLy4uL25vZGVfbW9kdWxlcy9nZW9qc29uLXZ0L3NyYy9mZWF0dXJlLmpzIiwiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL2dlb2pzb24tdnQvc3JjL2NvbnZlcnQuanMiLCIuLi8uLi8uLi9ub2RlX21vZHVsZXMvZ2VvanNvbi12dC9zcmMvY2xpcC5qcyIsIi4uLy4uLy4uL25vZGVfbW9kdWxlcy9nZW9qc29uLXZ0L3NyYy93cmFwLmpzIiwiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL2dlb2pzb24tdnQvc3JjL3RyYW5zZm9ybS5qcyIsIi4uLy4uLy4uL25vZGVfbW9kdWxlcy9nZW9qc29uLXZ0L3NyYy90aWxlLmpzIiwiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL2dlb2pzb24tdnQvc3JjL2luZGV4LmpzIiwiLi4vLi4vLi4vc3JjL3NvdXJjZS9nZW9qc29uX3dvcmtlcl9zb3VyY2UuanMiLCIuLi8uLi8uLi9zcmMvc291cmNlL3dvcmtlci5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyJcbmltcG9ydCByZWZQcm9wZXJ0aWVzIGZyb20gJy4vdXRpbC9yZWZfcHJvcGVydGllcyc7XG5cbmZ1bmN0aW9uIHN0cmluZ2lmeShvYmopIHtcbiAgICBjb25zdCB0eXBlID0gdHlwZW9mIG9iajtcbiAgICBpZiAodHlwZSA9PT0gJ251bWJlcicgfHwgdHlwZSA9PT0gJ2Jvb2xlYW4nIHx8IHR5cGUgPT09ICdzdHJpbmcnIHx8IG9iaiA9PT0gdW5kZWZpbmVkIHx8IG9iaiA9PT0gbnVsbClcbiAgICAgICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KG9iaik7XG5cbiAgICBpZiAoQXJyYXkuaXNBcnJheShvYmopKSB7XG4gICAgICAgIGxldCBzdHIgPSAnWyc7XG4gICAgICAgIGZvciAoY29uc3QgdmFsIG9mIG9iaikge1xuICAgICAgICAgICAgc3RyICs9IGAke3N0cmluZ2lmeSh2YWwpfSxgO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBgJHtzdHJ9XWA7XG4gICAgfVxuXG4gICAgY29uc3Qga2V5cyA9IE9iamVjdC5rZXlzKG9iaikuc29ydCgpO1xuXG4gICAgbGV0IHN0ciA9ICd7JztcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGtleXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgc3RyICs9IGAke0pTT04uc3RyaW5naWZ5KGtleXNbaV0pfToke3N0cmluZ2lmeShvYmpba2V5c1tpXV0pfSxgO1xuICAgIH1cbiAgICByZXR1cm4gYCR7c3RyfX1gO1xufVxuXG5mdW5jdGlvbiBnZXRLZXkobGF5ZXIpIHtcbiAgICBsZXQga2V5ID0gJyc7XG4gICAgZm9yIChjb25zdCBrIG9mIHJlZlByb3BlcnRpZXMpIHtcbiAgICAgICAga2V5ICs9IGAvJHtzdHJpbmdpZnkobGF5ZXJba10pfWA7XG4gICAgfVxuICAgIHJldHVybiBrZXk7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGdyb3VwQnlMYXlvdXQ7XG5cbi8qKlxuICogR2l2ZW4gYW4gYXJyYXkgb2YgbGF5ZXJzLCByZXR1cm4gYW4gYXJyYXkgb2YgYXJyYXlzIG9mIGxheWVycyB3aGVyZSBhbGxcbiAqIGxheWVycyBpbiBlYWNoIGdyb3VwIGhhdmUgaWRlbnRpY2FsIGxheW91dC1hZmZlY3RpbmcgcHJvcGVydGllcy4gVGhlc2VcbiAqIGFyZSB0aGUgcHJvcGVydGllcyB0aGF0IHdlcmUgZm9ybWVybHkgdXNlZCBieSBleHBsaWNpdCBgcmVmYCBtZWNoYW5pc21cbiAqIGZvciBsYXllcnM6ICd0eXBlJywgJ3NvdXJjZScsICdzb3VyY2UtbGF5ZXInLCAnbWluem9vbScsICdtYXh6b29tJyxcbiAqICdmaWx0ZXInLCBhbmQgJ2xheW91dCcuXG4gKlxuICogVGhlIGlucHV0IGlzIG5vdCBtb2RpZmllZC4gVGhlIG91dHB1dCBsYXllcnMgYXJlIHJlZmVyZW5jZXMgdG8gdGhlXG4gKiBpbnB1dCBsYXllcnMuXG4gKlxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7QXJyYXk8TGF5ZXI+fSBsYXllcnNcbiAqIEByZXR1cm5zIHtBcnJheTxBcnJheTxMYXllcj4+fVxuICovXG5mdW5jdGlvbiBncm91cEJ5TGF5b3V0KGxheWVycykge1xuICAgIGNvbnN0IGdyb3VwcyA9IHt9O1xuXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsYXllcnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgY29uc3QgayA9IGdldEtleShsYXllcnNbaV0pO1xuICAgICAgICBsZXQgZ3JvdXAgPSBncm91cHNba107XG4gICAgICAgIGlmICghZ3JvdXApIHtcbiAgICAgICAgICAgIGdyb3VwID0gZ3JvdXBzW2tdID0gW107XG4gICAgICAgIH1cbiAgICAgICAgZ3JvdXAucHVzaChsYXllcnNbaV0pO1xuICAgIH1cblxuICAgIGNvbnN0IHJlc3VsdCA9IFtdO1xuXG4gICAgZm9yIChjb25zdCBrIGluIGdyb3Vwcykge1xuICAgICAgICByZXN1bHQucHVzaChncm91cHNba10pO1xuICAgIH1cblxuICAgIHJldHVybiByZXN1bHQ7XG59XG4iLCIvLyBAZmxvd1xuXG5pbXBvcnQgU3R5bGVMYXllciBmcm9tICcuL3N0eWxlX2xheWVyJztcbmltcG9ydCBjcmVhdGVTdHlsZUxheWVyIGZyb20gJy4vY3JlYXRlX3N0eWxlX2xheWVyJztcblxuaW1wb3J0IHsgdmFsdWVzIH0gZnJvbSAnLi4vdXRpbC91dGlsJztcbmltcG9ydCBmZWF0dXJlRmlsdGVyIGZyb20gJy4uL3N0eWxlLXNwZWMvZmVhdHVyZV9maWx0ZXInO1xuaW1wb3J0IGdyb3VwQnlMYXlvdXQgZnJvbSAnLi4vc3R5bGUtc3BlYy9ncm91cF9ieV9sYXlvdXQnO1xuXG5pbXBvcnQgdHlwZSB7VHlwZWRTdHlsZUxheWVyfSBmcm9tICcuL3N0eWxlX2xheWVyL3R5cGVkX3N0eWxlX2xheWVyJztcbmltcG9ydCB0eXBlIHtMYXllclNwZWNpZmljYXRpb259IGZyb20gJy4uL3N0eWxlLXNwZWMvdHlwZXMnO1xuXG5leHBvcnQgdHlwZSBMYXllckNvbmZpZ3MgPSB7IFtzdHJpbmddOiBMYXllclNwZWNpZmljYXRpb24gfTtcbmV4cG9ydCB0eXBlIEZhbWlseTxMYXllcjogVHlwZWRTdHlsZUxheWVyPiA9IEFycmF5PExheWVyPjtcblxuY2xhc3MgU3R5bGVMYXllckluZGV4IHtcbiAgICBmYW1pbGllc0J5U291cmNlOiB7IFtzb3VyY2U6IHN0cmluZ106IHsgW3NvdXJjZUxheWVyOiBzdHJpbmddOiBBcnJheTxGYW1pbHk8Kj4+IH0gfTtcblxuICAgIF9sYXllckNvbmZpZ3M6IExheWVyQ29uZmlncztcbiAgICBfbGF5ZXJzOiB7IFtzdHJpbmddOiBTdHlsZUxheWVyIH07XG5cbiAgICBjb25zdHJ1Y3RvcihsYXllckNvbmZpZ3M6ID9BcnJheTxMYXllclNwZWNpZmljYXRpb24+KSB7XG4gICAgICAgIGlmIChsYXllckNvbmZpZ3MpIHtcbiAgICAgICAgICAgIHRoaXMucmVwbGFjZShsYXllckNvbmZpZ3MpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmVwbGFjZShsYXllckNvbmZpZ3M6IEFycmF5PExheWVyU3BlY2lmaWNhdGlvbj4pIHtcbiAgICAgICAgdGhpcy5fbGF5ZXJDb25maWdzID0ge307XG4gICAgICAgIHRoaXMuX2xheWVycyA9IHt9O1xuICAgICAgICB0aGlzLnVwZGF0ZShsYXllckNvbmZpZ3MsIFtdKTtcbiAgICB9XG5cbiAgICB1cGRhdGUobGF5ZXJDb25maWdzOiBBcnJheTxMYXllclNwZWNpZmljYXRpb24+LCByZW1vdmVkSWRzOiBBcnJheTxzdHJpbmc+KSB7XG4gICAgICAgIGZvciAoY29uc3QgbGF5ZXJDb25maWcgb2YgbGF5ZXJDb25maWdzKSB7XG4gICAgICAgICAgICB0aGlzLl9sYXllckNvbmZpZ3NbbGF5ZXJDb25maWcuaWRdID0gbGF5ZXJDb25maWc7XG5cbiAgICAgICAgICAgIGNvbnN0IGxheWVyID0gdGhpcy5fbGF5ZXJzW2xheWVyQ29uZmlnLmlkXSA9IGNyZWF0ZVN0eWxlTGF5ZXIobGF5ZXJDb25maWcpO1xuICAgICAgICAgICAgbGF5ZXIuX2ZlYXR1cmVGaWx0ZXIgPSBmZWF0dXJlRmlsdGVyKGxheWVyLmZpbHRlcik7XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChjb25zdCBpZCBvZiByZW1vdmVkSWRzKSB7XG4gICAgICAgICAgICBkZWxldGUgdGhpcy5fbGF5ZXJDb25maWdzW2lkXTtcbiAgICAgICAgICAgIGRlbGV0ZSB0aGlzLl9sYXllcnNbaWRdO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5mYW1pbGllc0J5U291cmNlID0ge307XG5cbiAgICAgICAgY29uc3QgZ3JvdXBzID0gZ3JvdXBCeUxheW91dCh2YWx1ZXModGhpcy5fbGF5ZXJDb25maWdzKSk7XG5cbiAgICAgICAgZm9yIChjb25zdCBsYXllckNvbmZpZ3Mgb2YgZ3JvdXBzKSB7XG4gICAgICAgICAgICBjb25zdCBsYXllcnMgPSBsYXllckNvbmZpZ3MubWFwKChsYXllckNvbmZpZykgPT4gdGhpcy5fbGF5ZXJzW2xheWVyQ29uZmlnLmlkXSk7XG5cbiAgICAgICAgICAgIGNvbnN0IGxheWVyID0gbGF5ZXJzWzBdO1xuICAgICAgICAgICAgaWYgKGxheWVyLnZpc2liaWxpdHkgPT09ICdub25lJykge1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBzb3VyY2VJZCA9IGxheWVyLnNvdXJjZSB8fCAnJztcbiAgICAgICAgICAgIGxldCBzb3VyY2VHcm91cCA9IHRoaXMuZmFtaWxpZXNCeVNvdXJjZVtzb3VyY2VJZF07XG4gICAgICAgICAgICBpZiAoIXNvdXJjZUdyb3VwKSB7XG4gICAgICAgICAgICAgICAgc291cmNlR3JvdXAgPSB0aGlzLmZhbWlsaWVzQnlTb3VyY2Vbc291cmNlSWRdID0ge307XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IHNvdXJjZUxheWVySWQgPSBsYXllci5zb3VyY2VMYXllciB8fCAnX2dlb2pzb25UaWxlTGF5ZXInO1xuICAgICAgICAgICAgbGV0IHNvdXJjZUxheWVyRmFtaWxpZXMgPSBzb3VyY2VHcm91cFtzb3VyY2VMYXllcklkXTtcbiAgICAgICAgICAgIGlmICghc291cmNlTGF5ZXJGYW1pbGllcykge1xuICAgICAgICAgICAgICAgIHNvdXJjZUxheWVyRmFtaWxpZXMgPSBzb3VyY2VHcm91cFtzb3VyY2VMYXllcklkXSA9IFtdO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBzb3VyY2VMYXllckZhbWlsaWVzLnB1c2gobGF5ZXJzKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgU3R5bGVMYXllckluZGV4O1xuIiwiLy8gQGZsb3dcblxuZXhwb3J0IGRlZmF1bHQgY2hlY2tNYXhBbmdsZTtcblxuaW1wb3J0IHR5cGUgUG9pbnQgZnJvbSAnQG1hcGJveC9wb2ludC1nZW9tZXRyeSc7XG5pbXBvcnQgdHlwZSBBbmNob3IgZnJvbSAnLi9hbmNob3InO1xuXG4vKipcbiAqIExhYmVscyBwbGFjZWQgYXJvdW5kIHJlYWxseSBzaGFycCBhbmdsZXMgYXJlbid0IHJlYWRhYmxlLiBDaGVjayBpZiBhbnlcbiAqIHBhcnQgb2YgdGhlIHBvdGVudGlhbCBsYWJlbCBoYXMgYSBjb21iaW5lZCBhbmdsZSB0aGF0IGlzIHRvbyBiaWcuXG4gKlxuICogQHBhcmFtIGxpbmVcbiAqIEBwYXJhbSBhbmNob3IgVGhlIHBvaW50IG9uIHRoZSBsaW5lIGFyb3VuZCB3aGljaCB0aGUgbGFiZWwgaXMgYW5jaG9yZWQuXG4gKiBAcGFyYW0gbGFiZWxMZW5ndGggVGhlIGxlbmd0aCBvZiB0aGUgbGFiZWwgaW4gZ2VvbWV0cnkgdW5pdHMuXG4gKiBAcGFyYW0gd2luZG93U2l6ZSBUaGUgY2hlY2sgZmFpbHMgaWYgdGhlIGNvbWJpbmVkIGFuZ2xlcyB3aXRoaW4gYSBwYXJ0IG9mIHRoZSBsaW5lIHRoYXQgaXMgYHdpbmRvd1NpemVgIGxvbmcgaXMgdG9vIGJpZy5cbiAqIEBwYXJhbSBtYXhBbmdsZSBUaGUgbWF4aW11bSBjb21iaW5lZCBhbmdsZSB0aGF0IGFueSB3aW5kb3cgYWxvbmcgdGhlIGxhYmVsIGlzIGFsbG93ZWQgdG8gaGF2ZS5cbiAqXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gd2hldGhlciB0aGUgbGFiZWwgc2hvdWxkIGJlIHBsYWNlZFxuICogQHByaXZhdGVcbiAqL1xuZnVuY3Rpb24gY2hlY2tNYXhBbmdsZShsaW5lOiBBcnJheTxQb2ludD4sIGFuY2hvcjogQW5jaG9yLCBsYWJlbExlbmd0aDogbnVtYmVyLCB3aW5kb3dTaXplOiBudW1iZXIsIG1heEFuZ2xlOiBudW1iZXIpIHtcblxuICAgIC8vIGhvcml6b250YWwgbGFiZWxzIGFsd2F5cyBwYXNzXG4gICAgaWYgKGFuY2hvci5zZWdtZW50ID09PSB1bmRlZmluZWQpIHJldHVybiB0cnVlO1xuXG4gICAgbGV0IHAgPSBhbmNob3I7XG4gICAgbGV0IGluZGV4ID0gYW5jaG9yLnNlZ21lbnQgKyAxO1xuICAgIGxldCBhbmNob3JEaXN0YW5jZSA9IDA7XG5cbiAgICAvLyBtb3ZlIGJhY2t3YXJkcyBhbG9uZyB0aGUgbGluZSB0byB0aGUgZmlyc3Qgc2VnbWVudCB0aGUgbGFiZWwgYXBwZWFycyBvblxuICAgIHdoaWxlIChhbmNob3JEaXN0YW5jZSA+IC1sYWJlbExlbmd0aCAvIDIpIHtcbiAgICAgICAgaW5kZXgtLTtcblxuICAgICAgICAvLyB0aGVyZSBpc24ndCBlbm91Z2ggcm9vbSBmb3IgdGhlIGxhYmVsIGFmdGVyIHRoZSBiZWdpbm5pbmcgb2YgdGhlIGxpbmVcbiAgICAgICAgaWYgKGluZGV4IDwgMCkgcmV0dXJuIGZhbHNlO1xuXG4gICAgICAgIGFuY2hvckRpc3RhbmNlIC09IGxpbmVbaW5kZXhdLmRpc3QocCk7XG4gICAgICAgIHAgPSBsaW5lW2luZGV4XTtcbiAgICB9XG5cbiAgICBhbmNob3JEaXN0YW5jZSArPSBsaW5lW2luZGV4XS5kaXN0KGxpbmVbaW5kZXggKyAxXSk7XG4gICAgaW5kZXgrKztcblxuICAgIC8vIHN0b3JlIHJlY2VudCBjb3JuZXJzIGFuZCB0aGVpciB0b3RhbCBhbmdsZSBkaWZmZXJlbmNlXG4gICAgY29uc3QgcmVjZW50Q29ybmVycyA9IFtdO1xuICAgIGxldCByZWNlbnRBbmdsZURlbHRhID0gMDtcblxuICAgIC8vIG1vdmUgZm9yd2FyZHMgYnkgdGhlIGxlbmd0aCBvZiB0aGUgbGFiZWwgYW5kIGNoZWNrIGFuZ2xlcyBhbG9uZyB0aGUgd2F5XG4gICAgd2hpbGUgKGFuY2hvckRpc3RhbmNlIDwgbGFiZWxMZW5ndGggLyAyKSB7XG4gICAgICAgIGNvbnN0IHByZXYgPSBsaW5lW2luZGV4IC0gMV07XG4gICAgICAgIGNvbnN0IGN1cnJlbnQgPSBsaW5lW2luZGV4XTtcbiAgICAgICAgY29uc3QgbmV4dCA9IGxpbmVbaW5kZXggKyAxXTtcblxuICAgICAgICAvLyB0aGVyZSBpc24ndCBlbm91Z2ggcm9vbSBmb3IgdGhlIGxhYmVsIGJlZm9yZSB0aGUgZW5kIG9mIHRoZSBsaW5lXG4gICAgICAgIGlmICghbmV4dCkgcmV0dXJuIGZhbHNlO1xuXG4gICAgICAgIGxldCBhbmdsZURlbHRhID0gcHJldi5hbmdsZVRvKGN1cnJlbnQpIC0gY3VycmVudC5hbmdsZVRvKG5leHQpO1xuICAgICAgICAvLyByZXN0cmljdCBhbmdsZSB0byAtcGkuLnBpIHJhbmdlXG4gICAgICAgIGFuZ2xlRGVsdGEgPSBNYXRoLmFicygoKGFuZ2xlRGVsdGEgKyAzICogTWF0aC5QSSkgJSAoTWF0aC5QSSAqIDIpKSAtIE1hdGguUEkpO1xuXG4gICAgICAgIHJlY2VudENvcm5lcnMucHVzaCh7XG4gICAgICAgICAgICBkaXN0YW5jZTogYW5jaG9yRGlzdGFuY2UsXG4gICAgICAgICAgICBhbmdsZURlbHRhOiBhbmdsZURlbHRhXG4gICAgICAgIH0pO1xuICAgICAgICByZWNlbnRBbmdsZURlbHRhICs9IGFuZ2xlRGVsdGE7XG5cbiAgICAgICAgLy8gcmVtb3ZlIGNvcm5lcnMgdGhhdCBhcmUgZmFyIGVub3VnaCBhd2F5IGZyb20gdGhlIGxpc3Qgb2YgcmVjZW50IGFuY2hvcnNcbiAgICAgICAgd2hpbGUgKGFuY2hvckRpc3RhbmNlIC0gcmVjZW50Q29ybmVyc1swXS5kaXN0YW5jZSA+IHdpbmRvd1NpemUpIHtcbiAgICAgICAgICAgIHJlY2VudEFuZ2xlRGVsdGEgLT0gcmVjZW50Q29ybmVycy5zaGlmdCgpLmFuZ2xlRGVsdGE7XG4gICAgICAgIH1cblxuICAgICAgICAvLyB0aGUgc3VtIG9mIGFuZ2xlcyB3aXRoaW4gdGhlIHdpbmRvdyBhcmVhIGV4Y2VlZHMgdGhlIG1heGltdW0gYWxsb3dlZCB2YWx1ZS4gY2hlY2sgZmFpbHMuXG4gICAgICAgIGlmIChyZWNlbnRBbmdsZURlbHRhID4gbWF4QW5nbGUpIHJldHVybiBmYWxzZTtcblxuICAgICAgICBpbmRleCsrO1xuICAgICAgICBhbmNob3JEaXN0YW5jZSArPSBjdXJyZW50LmRpc3QobmV4dCk7XG4gICAgfVxuXG4gICAgLy8gbm8gcGFydCBvZiB0aGUgbGluZSBoYWQgYW4gYW5nbGUgZ3JlYXRlciB0aGFuIHRoZSBtYXhpbXVtIGFsbG93ZWQuIGNoZWNrIHBhc3Nlcy5cbiAgICByZXR1cm4gdHJ1ZTtcbn1cbiIsIi8vIEBmbG93XG5cbmltcG9ydCB7IG51bWJlciBhcyBpbnRlcnBvbGF0ZSB9IGZyb20gJy4uL3N0eWxlLXNwZWMvdXRpbC9pbnRlcnBvbGF0ZSc7XG5cbmltcG9ydCBBbmNob3IgZnJvbSAnLi4vc3ltYm9sL2FuY2hvcic7XG5pbXBvcnQgY2hlY2tNYXhBbmdsZSBmcm9tICcuL2NoZWNrX21heF9hbmdsZSc7XG5cbmltcG9ydCB0eXBlIFBvaW50IGZyb20gJ0BtYXBib3gvcG9pbnQtZ2VvbWV0cnknO1xuaW1wb3J0IHR5cGUge1NoYXBpbmcsIFBvc2l0aW9uZWRJY29ufSBmcm9tICcuL3NoYXBpbmcnO1xuXG5leHBvcnQgeyBnZXRBbmNob3JzLCBnZXRDZW50ZXJBbmNob3IgfTtcblxuZnVuY3Rpb24gZ2V0TGluZUxlbmd0aChsaW5lOiBBcnJheTxQb2ludD4pOiBudW1iZXIge1xuICAgIGxldCBsaW5lTGVuZ3RoID0gMDtcbiAgICBmb3IgKGxldCBrID0gMDsgayA8IGxpbmUubGVuZ3RoIC0gMTsgaysrKSB7XG4gICAgICAgIGxpbmVMZW5ndGggKz0gbGluZVtrXS5kaXN0KGxpbmVbayArIDFdKTtcbiAgICB9XG4gICAgcmV0dXJuIGxpbmVMZW5ndGg7XG59XG5cbmZ1bmN0aW9uIGdldEFuZ2xlV2luZG93U2l6ZShzaGFwZWRUZXh0OiA/U2hhcGluZyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBnbHlwaFNpemU6IG51bWJlcixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBib3hTY2FsZTogbnVtYmVyKTogbnVtYmVyIHtcbiAgICByZXR1cm4gc2hhcGVkVGV4dCA/XG4gICAgICAgIDMgLyA1ICogZ2x5cGhTaXplICogYm94U2NhbGUgOlxuICAgICAgICAwO1xufVxuXG5mdW5jdGlvbiBnZXRTaGFwZWRMYWJlbExlbmd0aChzaGFwZWRUZXh0OiA/U2hhcGluZywgc2hhcGVkSWNvbjogP1Bvc2l0aW9uZWRJY29uKTogbnVtYmVyIHtcbiAgICByZXR1cm4gTWF0aC5tYXgoXG4gICAgICAgIHNoYXBlZFRleHQgPyBzaGFwZWRUZXh0LnJpZ2h0IC0gc2hhcGVkVGV4dC5sZWZ0IDogMCxcbiAgICAgICAgc2hhcGVkSWNvbiA/IHNoYXBlZEljb24ucmlnaHQgLSBzaGFwZWRJY29uLmxlZnQgOiAwKTtcbn1cblxuZnVuY3Rpb24gZ2V0Q2VudGVyQW5jaG9yKGxpbmU6IEFycmF5PFBvaW50PixcbiAgICAgICAgICAgICAgICAgICAgICAgICBtYXhBbmdsZTogbnVtYmVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgIHNoYXBlZFRleHQ6ID9TaGFwaW5nLFxuICAgICAgICAgICAgICAgICAgICAgICAgIHNoYXBlZEljb246ID9Qb3NpdGlvbmVkSWNvbixcbiAgICAgICAgICAgICAgICAgICAgICAgICBnbHlwaFNpemU6IG51bWJlcixcbiAgICAgICAgICAgICAgICAgICAgICAgICBib3hTY2FsZTogbnVtYmVyKSB7XG4gICAgY29uc3QgYW5nbGVXaW5kb3dTaXplID0gZ2V0QW5nbGVXaW5kb3dTaXplKHNoYXBlZFRleHQsIGdseXBoU2l6ZSwgYm94U2NhbGUpO1xuICAgIGNvbnN0IGxhYmVsTGVuZ3RoID0gZ2V0U2hhcGVkTGFiZWxMZW5ndGgoc2hhcGVkVGV4dCwgc2hhcGVkSWNvbikgKiBib3hTY2FsZTtcblxuICAgIGxldCBwcmV2RGlzdGFuY2UgPSAwO1xuICAgIGNvbnN0IGNlbnRlckRpc3RhbmNlID0gZ2V0TGluZUxlbmd0aChsaW5lKSAvIDI7XG5cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxpbmUubGVuZ3RoIC0gMTsgaSsrKSB7XG5cbiAgICAgICAgY29uc3QgYSA9IGxpbmVbaV0sXG4gICAgICAgICAgICBiID0gbGluZVtpICsgMV07XG5cbiAgICAgICAgY29uc3Qgc2VnbWVudERpc3RhbmNlID0gYS5kaXN0KGIpO1xuXG4gICAgICAgIGlmIChwcmV2RGlzdGFuY2UgKyBzZWdtZW50RGlzdGFuY2UgPiBjZW50ZXJEaXN0YW5jZSkge1xuICAgICAgICAgICAgLy8gVGhlIGNlbnRlciBpcyBvbiB0aGlzIHNlZ21lbnRcbiAgICAgICAgICAgIGNvbnN0IHQgPSAoY2VudGVyRGlzdGFuY2UgLSBwcmV2RGlzdGFuY2UpIC8gc2VnbWVudERpc3RhbmNlLFxuICAgICAgICAgICAgICAgIHggPSBpbnRlcnBvbGF0ZShhLngsIGIueCwgdCksXG4gICAgICAgICAgICAgICAgeSA9IGludGVycG9sYXRlKGEueSwgYi55LCB0KTtcblxuICAgICAgICAgICAgY29uc3QgYW5jaG9yID0gbmV3IEFuY2hvcih4LCB5LCBiLmFuZ2xlVG8oYSksIGkpO1xuICAgICAgICAgICAgYW5jaG9yLl9yb3VuZCgpO1xuICAgICAgICAgICAgaWYgKCFhbmdsZVdpbmRvd1NpemUgfHwgY2hlY2tNYXhBbmdsZShsaW5lLCBhbmNob3IsIGxhYmVsTGVuZ3RoLCBhbmdsZVdpbmRvd1NpemUsIG1heEFuZ2xlKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBhbmNob3I7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHByZXZEaXN0YW5jZSArPSBzZWdtZW50RGlzdGFuY2U7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBnZXRBbmNob3JzKGxpbmU6IEFycmF5PFBvaW50PixcbiAgICAgICAgICAgICAgICAgICAgc3BhY2luZzogbnVtYmVyLFxuICAgICAgICAgICAgICAgICAgICBtYXhBbmdsZTogbnVtYmVyLFxuICAgICAgICAgICAgICAgICAgICBzaGFwZWRUZXh0OiA/U2hhcGluZyxcbiAgICAgICAgICAgICAgICAgICAgc2hhcGVkSWNvbjogP1Bvc2l0aW9uZWRJY29uLFxuICAgICAgICAgICAgICAgICAgICBnbHlwaFNpemU6IG51bWJlcixcbiAgICAgICAgICAgICAgICAgICAgYm94U2NhbGU6IG51bWJlcixcbiAgICAgICAgICAgICAgICAgICAgb3ZlcnNjYWxpbmc6IG51bWJlcixcbiAgICAgICAgICAgICAgICAgICAgdGlsZUV4dGVudDogbnVtYmVyKSB7XG5cbiAgICAvLyBSZXNhbXBsZSBhIGxpbmUgdG8gZ2V0IGFuY2hvciBwb2ludHMgZm9yIGxhYmVscyBhbmQgY2hlY2sgdGhhdCBlYWNoXG4gICAgLy8gcG90ZW50aWFsIGxhYmVsIHBhc3NlcyB0ZXh0LW1heC1hbmdsZSBjaGVjayBhbmQgaGFzIGVub3VnaCBmcm9vbSB0byBmaXRcbiAgICAvLyBvbiB0aGUgbGluZS5cblxuICAgIGNvbnN0IGFuZ2xlV2luZG93U2l6ZSA9IGdldEFuZ2xlV2luZG93U2l6ZShzaGFwZWRUZXh0LCBnbHlwaFNpemUsIGJveFNjYWxlKTtcbiAgICBjb25zdCBzaGFwZWRMYWJlbExlbmd0aCA9IGdldFNoYXBlZExhYmVsTGVuZ3RoKHNoYXBlZFRleHQsIHNoYXBlZEljb24pO1xuICAgIGNvbnN0IGxhYmVsTGVuZ3RoID0gc2hhcGVkTGFiZWxMZW5ndGggKiBib3hTY2FsZTtcblxuICAgIC8vIElzIHRoZSBsaW5lIGNvbnRpbnVlZCBmcm9tIG91dHNpZGUgdGhlIHRpbGUgYm91bmRhcnk/XG4gICAgY29uc3QgaXNMaW5lQ29udGludWVkID0gbGluZVswXS54ID09PSAwIHx8IGxpbmVbMF0ueCA9PT0gdGlsZUV4dGVudCB8fCBsaW5lWzBdLnkgPT09IDAgfHwgbGluZVswXS55ID09PSB0aWxlRXh0ZW50O1xuXG4gICAgLy8gSXMgdGhlIGxhYmVsIGxvbmcsIHJlbGF0aXZlIHRvIHRoZSBzcGFjaW5nP1xuICAgIC8vIElmIHNvLCBhZGp1c3QgdGhlIHNwYWNpbmcgc28gdGhlcmUgaXMgYWx3YXlzIGEgbWluaW11bSBzcGFjZSBvZiBgc3BhY2luZyAvIDRgIGJldHdlZW4gbGFiZWwgZWRnZXMuXG4gICAgaWYgKHNwYWNpbmcgLSBsYWJlbExlbmd0aCA8IHNwYWNpbmcgLyA0KSB7XG4gICAgICAgIHNwYWNpbmcgPSBsYWJlbExlbmd0aCArIHNwYWNpbmcgLyA0O1xuICAgIH1cblxuICAgIC8vIE9mZnNldCB0aGUgZmlyc3QgYW5jaG9yIGJ5OlxuICAgIC8vIEVpdGhlciBoYWxmIHRoZSBsYWJlbCBsZW5ndGggcGx1cyBhIGZpeGVkIGV4dHJhIG9mZnNldCBpZiB0aGUgbGluZSBpcyBub3QgY29udGludWVkXG4gICAgLy8gT3IgaGFsZiB0aGUgc3BhY2luZyBpZiB0aGUgbGluZSBpcyBjb250aW51ZWQuXG5cbiAgICAvLyBGb3Igbm9uLWNvbnRpbnVlZCBsaW5lcywgYWRkIGEgYml0IG9mIGZpeGVkIGV4dHJhIG9mZnNldCB0byBhdm9pZCBjb2xsaXNpb25zIGF0IFQgaW50ZXJzZWN0aW9ucy5cbiAgICBjb25zdCBmaXhlZEV4dHJhT2Zmc2V0ID0gZ2x5cGhTaXplICogMjtcblxuICAgIGNvbnN0IG9mZnNldCA9ICFpc0xpbmVDb250aW51ZWQgP1xuICAgICAgICAoKHNoYXBlZExhYmVsTGVuZ3RoIC8gMiArIGZpeGVkRXh0cmFPZmZzZXQpICogYm94U2NhbGUgKiBvdmVyc2NhbGluZykgJSBzcGFjaW5nIDpcbiAgICAgICAgKHNwYWNpbmcgLyAyICogb3ZlcnNjYWxpbmcpICUgc3BhY2luZztcblxuICAgIHJldHVybiByZXNhbXBsZShsaW5lLCBvZmZzZXQsIHNwYWNpbmcsIGFuZ2xlV2luZG93U2l6ZSwgbWF4QW5nbGUsIGxhYmVsTGVuZ3RoLCBpc0xpbmVDb250aW51ZWQsIGZhbHNlLCB0aWxlRXh0ZW50KTtcbn1cblxuXG5mdW5jdGlvbiByZXNhbXBsZShsaW5lLCBvZmZzZXQsIHNwYWNpbmcsIGFuZ2xlV2luZG93U2l6ZSwgbWF4QW5nbGUsIGxhYmVsTGVuZ3RoLCBpc0xpbmVDb250aW51ZWQsIHBsYWNlQXRNaWRkbGUsIHRpbGVFeHRlbnQpIHtcblxuICAgIGNvbnN0IGhhbGZMYWJlbExlbmd0aCA9IGxhYmVsTGVuZ3RoIC8gMjtcbiAgICBjb25zdCBsaW5lTGVuZ3RoID0gZ2V0TGluZUxlbmd0aChsaW5lKTtcblxuICAgIGxldCBkaXN0YW5jZSA9IDAsXG4gICAgICAgIG1hcmtlZERpc3RhbmNlID0gb2Zmc2V0IC0gc3BhY2luZztcblxuICAgIGxldCBhbmNob3JzID0gW107XG5cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxpbmUubGVuZ3RoIC0gMTsgaSsrKSB7XG5cbiAgICAgICAgY29uc3QgYSA9IGxpbmVbaV0sXG4gICAgICAgICAgICBiID0gbGluZVtpICsgMV07XG5cbiAgICAgICAgY29uc3Qgc2VnbWVudERpc3QgPSBhLmRpc3QoYiksXG4gICAgICAgICAgICBhbmdsZSA9IGIuYW5nbGVUbyhhKTtcblxuICAgICAgICB3aGlsZSAobWFya2VkRGlzdGFuY2UgKyBzcGFjaW5nIDwgZGlzdGFuY2UgKyBzZWdtZW50RGlzdCkge1xuICAgICAgICAgICAgbWFya2VkRGlzdGFuY2UgKz0gc3BhY2luZztcblxuICAgICAgICAgICAgY29uc3QgdCA9IChtYXJrZWREaXN0YW5jZSAtIGRpc3RhbmNlKSAvIHNlZ21lbnREaXN0LFxuICAgICAgICAgICAgICAgIHggPSBpbnRlcnBvbGF0ZShhLngsIGIueCwgdCksXG4gICAgICAgICAgICAgICAgeSA9IGludGVycG9sYXRlKGEueSwgYi55LCB0KTtcblxuICAgICAgICAgICAgLy8gQ2hlY2sgdGhhdCB0aGUgcG9pbnQgaXMgd2l0aGluIHRoZSB0aWxlIGJvdW5kYXJpZXMgYW5kIHRoYXRcbiAgICAgICAgICAgIC8vIHRoZSBsYWJlbCB3b3VsZCBmaXQgYmVmb3JlIHRoZSBiZWdpbm5pbmcgYW5kIGVuZCBvZiB0aGUgbGluZVxuICAgICAgICAgICAgLy8gaWYgcGxhY2VkIGF0IHRoaXMgcG9pbnQuXG4gICAgICAgICAgICBpZiAoeCA+PSAwICYmIHggPCB0aWxlRXh0ZW50ICYmIHkgPj0gMCAmJiB5IDwgdGlsZUV4dGVudCAmJlxuICAgICAgICAgICAgICAgICAgICBtYXJrZWREaXN0YW5jZSAtIGhhbGZMYWJlbExlbmd0aCA+PSAwICYmXG4gICAgICAgICAgICAgICAgICAgIG1hcmtlZERpc3RhbmNlICsgaGFsZkxhYmVsTGVuZ3RoIDw9IGxpbmVMZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBhbmNob3IgPSBuZXcgQW5jaG9yKHgsIHksIGFuZ2xlLCBpKTtcbiAgICAgICAgICAgICAgICBhbmNob3IuX3JvdW5kKCk7XG5cbiAgICAgICAgICAgICAgICBpZiAoIWFuZ2xlV2luZG93U2l6ZSB8fCBjaGVja01heEFuZ2xlKGxpbmUsIGFuY2hvciwgbGFiZWxMZW5ndGgsIGFuZ2xlV2luZG93U2l6ZSwgbWF4QW5nbGUpKSB7XG4gICAgICAgICAgICAgICAgICAgIGFuY2hvcnMucHVzaChhbmNob3IpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGRpc3RhbmNlICs9IHNlZ21lbnREaXN0O1xuICAgIH1cblxuICAgIGlmICghcGxhY2VBdE1pZGRsZSAmJiAhYW5jaG9ycy5sZW5ndGggJiYgIWlzTGluZUNvbnRpbnVlZCkge1xuICAgICAgICAvLyBUaGUgZmlyc3QgYXR0ZW1wdCBhdCBmaW5kaW5nIGFuY2hvcnMgYXQgd2hpY2ggbGFiZWxzIGNhbiBiZSBwbGFjZWQgZmFpbGVkLlxuICAgICAgICAvLyBUcnkgYWdhaW4sIGJ1dCB0aGlzIHRpbWUganVzdCB0cnkgcGxhY2luZyBvbmUgYW5jaG9yIGF0IHRoZSBtaWRkbGUgb2YgdGhlIGxpbmUuXG4gICAgICAgIC8vIFRoaXMgaGFzIHRoZSBtb3N0IGVmZmVjdCBmb3Igc2hvcnQgbGluZXMgaW4gb3ZlcnNjYWxlZCB0aWxlcywgc2luY2UgdGhlXG4gICAgICAgIC8vIGluaXRpYWwgb2Zmc2V0IHVzZWQgaW4gb3ZlcnNjYWxlZCB0aWxlcyBpcyBjYWxjdWxhdGVkIHRvIGFsaWduIGxhYmVscyB3aXRoIHBvc2l0aW9ucyBpblxuICAgICAgICAvLyBwYXJlbnQgdGlsZXMgaW5zdGVhZCBvZiBwbGFjaW5nIHRoZSBsYWJlbCBhcyBjbG9zZSB0byB0aGUgYmVnaW5uaW5nIGFzIHBvc3NpYmxlLlxuICAgICAgICBhbmNob3JzID0gcmVzYW1wbGUobGluZSwgZGlzdGFuY2UgLyAyLCBzcGFjaW5nLCBhbmdsZVdpbmRvd1NpemUsIG1heEFuZ2xlLCBsYWJlbExlbmd0aCwgaXNMaW5lQ29udGludWVkLCB0cnVlLCB0aWxlRXh0ZW50KTtcbiAgICB9XG5cbiAgICByZXR1cm4gYW5jaG9ycztcbn1cbiIsIi8vIEBmbG93XG5cbmltcG9ydCBQb2ludCBmcm9tICdAbWFwYm94L3BvaW50LWdlb21ldHJ5JztcblxuZXhwb3J0IGRlZmF1bHQgY2xpcExpbmU7XG5cbi8qKlxuICogUmV0dXJucyB0aGUgcGFydCBvZiBhIG11bHRpbGluZSB0aGF0IGludGVyc2VjdHMgd2l0aCB0aGUgcHJvdmlkZWQgcmVjdGFuZ3VsYXIgYm94LlxuICpcbiAqIEBwYXJhbSBsaW5lc1xuICogQHBhcmFtIHgxIHRoZSBsZWZ0IGVkZ2Ugb2YgdGhlIGJveFxuICogQHBhcmFtIHkxIHRoZSB0b3AgZWRnZSBvZiB0aGUgYm94XG4gKiBAcGFyYW0geDIgdGhlIHJpZ2h0IGVkZ2Ugb2YgdGhlIGJveFxuICogQHBhcmFtIHkyIHRoZSBib3R0b20gZWRnZSBvZiB0aGUgYm94XG4gKiBAcmV0dXJucyBsaW5lc1xuICogQHByaXZhdGVcbiAqL1xuZnVuY3Rpb24gY2xpcExpbmUobGluZXM6IEFycmF5PEFycmF5PFBvaW50Pj4sIHgxOiBudW1iZXIsIHkxOiBudW1iZXIsIHgyOiBudW1iZXIsIHkyOiBudW1iZXIpOiBBcnJheTxBcnJheTxQb2ludD4+IHtcbiAgICBjb25zdCBjbGlwcGVkTGluZXMgPSBbXTtcblxuICAgIGZvciAobGV0IGwgPSAwOyBsIDwgbGluZXMubGVuZ3RoOyBsKyspIHtcbiAgICAgICAgY29uc3QgbGluZSA9IGxpbmVzW2xdO1xuICAgICAgICBsZXQgY2xpcHBlZExpbmU7XG5cbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsaW5lLmxlbmd0aCAtIDE7IGkrKykge1xuICAgICAgICAgICAgbGV0IHAwID0gbGluZVtpXTtcbiAgICAgICAgICAgIGxldCBwMSA9IGxpbmVbaSArIDFdO1xuXG5cbiAgICAgICAgICAgIGlmIChwMC54IDwgeDEgJiYgcDEueCA8IHgxKSB7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHAwLnggPCB4MSkge1xuICAgICAgICAgICAgICAgIHAwID0gbmV3IFBvaW50KHgxLCBwMC55ICsgKHAxLnkgLSBwMC55KSAqICgoeDEgLSBwMC54KSAvIChwMS54IC0gcDAueCkpKS5fcm91bmQoKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocDEueCA8IHgxKSB7XG4gICAgICAgICAgICAgICAgcDEgPSBuZXcgUG9pbnQoeDEsIHAwLnkgKyAocDEueSAtIHAwLnkpICogKCh4MSAtIHAwLngpIC8gKHAxLnggLSBwMC54KSkpLl9yb3VuZCgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAocDAueSA8IHkxICYmIHAxLnkgPCB5MSkge1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChwMC55IDwgeTEpIHtcbiAgICAgICAgICAgICAgICBwMCA9IG5ldyBQb2ludChwMC54ICsgKHAxLnggLSBwMC54KSAqICgoeTEgLSBwMC55KSAvIChwMS55IC0gcDAueSkpLCB5MSkuX3JvdW5kKCk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHAxLnkgPCB5MSkge1xuICAgICAgICAgICAgICAgIHAxID0gbmV3IFBvaW50KHAwLnggKyAocDEueCAtIHAwLngpICogKCh5MSAtIHAwLnkpIC8gKHAxLnkgLSBwMC55KSksIHkxKS5fcm91bmQoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKHAwLnggPj0geDIgJiYgcDEueCA+PSB4Mikge1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChwMC54ID49IHgyKSB7XG4gICAgICAgICAgICAgICAgcDAgPSBuZXcgUG9pbnQoeDIsIHAwLnkgKyAocDEueSAtIHAwLnkpICogKCh4MiAtIHAwLngpIC8gKHAxLnggLSBwMC54KSkpLl9yb3VuZCgpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChwMS54ID49IHgyKSB7XG4gICAgICAgICAgICAgICAgcDEgPSBuZXcgUG9pbnQoeDIsIHAwLnkgKyAocDEueSAtIHAwLnkpICogKCh4MiAtIHAwLngpIC8gKHAxLnggLSBwMC54KSkpLl9yb3VuZCgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAocDAueSA+PSB5MiAmJiBwMS55ID49IHkyKSB7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHAwLnkgPj0geTIpIHtcbiAgICAgICAgICAgICAgICBwMCA9IG5ldyBQb2ludChwMC54ICsgKHAxLnggLSBwMC54KSAqICgoeTIgLSBwMC55KSAvIChwMS55IC0gcDAueSkpLCB5MikuX3JvdW5kKCk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHAxLnkgPj0geTIpIHtcbiAgICAgICAgICAgICAgICBwMSA9IG5ldyBQb2ludChwMC54ICsgKHAxLnggLSBwMC54KSAqICgoeTIgLSBwMC55KSAvIChwMS55IC0gcDAueSkpLCB5MikuX3JvdW5kKCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICghY2xpcHBlZExpbmUgfHwgIXAwLmVxdWFscyhjbGlwcGVkTGluZVtjbGlwcGVkTGluZS5sZW5ndGggLSAxXSkpIHtcbiAgICAgICAgICAgICAgICBjbGlwcGVkTGluZSA9IFtwMF07XG4gICAgICAgICAgICAgICAgY2xpcHBlZExpbmVzLnB1c2goY2xpcHBlZExpbmUpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjbGlwcGVkTGluZS5wdXNoKHAxKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBjbGlwcGVkTGluZXM7XG59XG4iLCIvLyBAZmxvd1xuXG5pbXBvcnQgUG9pbnQgZnJvbSAnQG1hcGJveC9wb2ludC1nZW9tZXRyeSc7XG5cbmltcG9ydCB7IEdMWVBIX1BCRl9CT1JERVIgfSBmcm9tICcuLi9zdHlsZS9wYXJzZV9nbHlwaF9wYmYnO1xuXG5pbXBvcnQgdHlwZSBBbmNob3IgZnJvbSAnLi9hbmNob3InO1xuaW1wb3J0IHR5cGUge1Bvc2l0aW9uZWRJY29uLCBTaGFwaW5nfSBmcm9tICcuL3NoYXBpbmcnO1xuaW1wb3J0IHR5cGUgU3ltYm9sU3R5bGVMYXllciBmcm9tICcuLi9zdHlsZS9zdHlsZV9sYXllci9zeW1ib2xfc3R5bGVfbGF5ZXInO1xuaW1wb3J0IHR5cGUge0ZlYXR1cmV9IGZyb20gJy4uL3N0eWxlLXNwZWMvZXhwcmVzc2lvbic7XG5pbXBvcnQgdHlwZSB7R2x5cGhQb3NpdGlvbn0gZnJvbSAnLi4vcmVuZGVyL2dseXBoX2F0bGFzJztcblxuLyoqXG4gKiBBIHRleHR1cmVkIHF1YWQgZm9yIHJlbmRlcmluZyBhIHNpbmdsZSBpY29uIG9yIGdseXBoLlxuICpcbiAqIFRoZSB6b29tIHJhbmdlIHRoZSBnbHlwaCBjYW4gYmUgc2hvd24gaXMgZGVmaW5lZCBieSBtaW5TY2FsZSBhbmQgbWF4U2NhbGUuXG4gKlxuICogQHBhcmFtIHRsIFRoZSBvZmZzZXQgb2YgdGhlIHRvcCBsZWZ0IGNvcm5lciBmcm9tIHRoZSBhbmNob3IuXG4gKiBAcGFyYW0gdHIgVGhlIG9mZnNldCBvZiB0aGUgdG9wIHJpZ2h0IGNvcm5lciBmcm9tIHRoZSBhbmNob3IuXG4gKiBAcGFyYW0gYmwgVGhlIG9mZnNldCBvZiB0aGUgYm90dG9tIGxlZnQgY29ybmVyIGZyb20gdGhlIGFuY2hvci5cbiAqIEBwYXJhbSBiciBUaGUgb2Zmc2V0IG9mIHRoZSBib3R0b20gcmlnaHQgY29ybmVyIGZyb20gdGhlIGFuY2hvci5cbiAqIEBwYXJhbSB0ZXggVGhlIHRleHR1cmUgY29vcmRpbmF0ZXMuXG4gKlxuICogQHByaXZhdGVcbiAqL1xuZXhwb3J0IHR5cGUgU3ltYm9sUXVhZCA9IHtcbiAgICB0bDogUG9pbnQsXG4gICAgdHI6IFBvaW50LFxuICAgIGJsOiBQb2ludCxcbiAgICBicjogUG9pbnQsXG4gICAgdGV4OiB7XG4gICAgICAgIHg6IG51bWJlcixcbiAgICAgICAgeTogbnVtYmVyLFxuICAgICAgICB3OiBudW1iZXIsXG4gICAgICAgIGg6IG51bWJlclxuICAgIH0sXG4gICAgd3JpdGluZ01vZGU6IGFueSB8IHZvaWQsXG4gICAgZ2x5cGhPZmZzZXQ6IFtudW1iZXIsIG51bWJlcl1cbn07XG5cbi8qKlxuICogQ3JlYXRlIHRoZSBxdWFkcyB1c2VkIGZvciByZW5kZXJpbmcgYW4gaWNvbi5cbiAqIEBwcml2YXRlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRJY29uUXVhZHMoYW5jaG9yOiBBbmNob3IsXG4gICAgICAgICAgICAgICAgICAgICAgc2hhcGVkSWNvbjogUG9zaXRpb25lZEljb24sXG4gICAgICAgICAgICAgICAgICAgICAgbGF5ZXI6IFN5bWJvbFN0eWxlTGF5ZXIsXG4gICAgICAgICAgICAgICAgICAgICAgYWxvbmdMaW5lOiBib29sZWFuLFxuICAgICAgICAgICAgICAgICAgICAgIHNoYXBlZFRleHQ6IFNoYXBpbmcsXG4gICAgICAgICAgICAgICAgICAgICAgZmVhdHVyZTogRmVhdHVyZSk6IEFycmF5PFN5bWJvbFF1YWQ+IHtcbiAgICBjb25zdCBpbWFnZSA9IHNoYXBlZEljb24uaW1hZ2U7XG4gICAgY29uc3QgbGF5b3V0ID0gbGF5ZXIubGF5b3V0O1xuXG4gICAgLy8gSWYgeW91IGhhdmUgYSAxMHB4IGljb24gdGhhdCBpc24ndCBwZXJmZWN0bHkgYWxpZ25lZCB0byB0aGUgcGl4ZWwgZ3JpZCBpdCB3aWxsIGNvdmVyIDExIGFjdHVhbFxuICAgIC8vIHBpeGVscy4gVGhlIHF1YWQgbmVlZHMgdG8gYmUgcGFkZGVkIHRvIGFjY291bnQgZm9yIHRoaXMsIG90aGVyd2lzZSB0aGV5J2xsIGxvb2sgc2xpZ2h0bHkgY2xpcHBlZFxuICAgIC8vIG9uIG9uZSBlZGdlIGluIHNvbWUgY2FzZXMuXG4gICAgY29uc3QgYm9yZGVyID0gMTtcblxuICAgIGNvbnN0IHRvcCA9IHNoYXBlZEljb24udG9wIC0gYm9yZGVyIC8gaW1hZ2UucGl4ZWxSYXRpbztcbiAgICBjb25zdCBsZWZ0ID0gc2hhcGVkSWNvbi5sZWZ0IC0gYm9yZGVyIC8gaW1hZ2UucGl4ZWxSYXRpbztcbiAgICBjb25zdCBib3R0b20gPSBzaGFwZWRJY29uLmJvdHRvbSArIGJvcmRlciAvIGltYWdlLnBpeGVsUmF0aW87XG4gICAgY29uc3QgcmlnaHQgPSBzaGFwZWRJY29uLnJpZ2h0ICsgYm9yZGVyIC8gaW1hZ2UucGl4ZWxSYXRpbztcbiAgICBsZXQgdGwsIHRyLCBiciwgYmw7XG5cbiAgICAvLyB0ZXh0LWZpdCBtb2RlXG4gICAgaWYgKGxheW91dC5nZXQoJ2ljb24tdGV4dC1maXQnKSAhPT0gJ25vbmUnICYmIHNoYXBlZFRleHQpIHtcbiAgICAgICAgY29uc3QgaWNvbldpZHRoID0gKHJpZ2h0IC0gbGVmdCksXG4gICAgICAgICAgICBpY29uSGVpZ2h0ID0gKGJvdHRvbSAtIHRvcCksXG4gICAgICAgICAgICBzaXplID0gbGF5b3V0LmdldCgndGV4dC1zaXplJykuZXZhbHVhdGUoZmVhdHVyZSwge30pIC8gMjQsXG4gICAgICAgICAgICB0ZXh0TGVmdCA9IHNoYXBlZFRleHQubGVmdCAqIHNpemUsXG4gICAgICAgICAgICB0ZXh0UmlnaHQgPSBzaGFwZWRUZXh0LnJpZ2h0ICogc2l6ZSxcbiAgICAgICAgICAgIHRleHRUb3AgPSBzaGFwZWRUZXh0LnRvcCAqIHNpemUsXG4gICAgICAgICAgICB0ZXh0Qm90dG9tID0gc2hhcGVkVGV4dC5ib3R0b20gKiBzaXplLFxuICAgICAgICAgICAgdGV4dFdpZHRoID0gdGV4dFJpZ2h0IC0gdGV4dExlZnQsXG4gICAgICAgICAgICB0ZXh0SGVpZ2h0ID0gdGV4dEJvdHRvbSAtIHRleHRUb3AsXG4gICAgICAgICAgICBwYWRUID0gbGF5b3V0LmdldCgnaWNvbi10ZXh0LWZpdC1wYWRkaW5nJylbMF0sXG4gICAgICAgICAgICBwYWRSID0gbGF5b3V0LmdldCgnaWNvbi10ZXh0LWZpdC1wYWRkaW5nJylbMV0sXG4gICAgICAgICAgICBwYWRCID0gbGF5b3V0LmdldCgnaWNvbi10ZXh0LWZpdC1wYWRkaW5nJylbMl0sXG4gICAgICAgICAgICBwYWRMID0gbGF5b3V0LmdldCgnaWNvbi10ZXh0LWZpdC1wYWRkaW5nJylbM10sXG4gICAgICAgICAgICBvZmZzZXRZID0gbGF5b3V0LmdldCgnaWNvbi10ZXh0LWZpdCcpID09PSAnd2lkdGgnID8gKHRleHRIZWlnaHQgLSBpY29uSGVpZ2h0KSAqIDAuNSA6IDAsXG4gICAgICAgICAgICBvZmZzZXRYID0gbGF5b3V0LmdldCgnaWNvbi10ZXh0LWZpdCcpID09PSAnaGVpZ2h0JyA/ICh0ZXh0V2lkdGggLSBpY29uV2lkdGgpICogMC41IDogMCxcbiAgICAgICAgICAgIHdpZHRoID0gbGF5b3V0LmdldCgnaWNvbi10ZXh0LWZpdCcpID09PSAnd2lkdGgnIHx8IGxheW91dC5nZXQoJ2ljb24tdGV4dC1maXQnKSA9PT0gJ2JvdGgnID8gdGV4dFdpZHRoIDogaWNvbldpZHRoLFxuICAgICAgICAgICAgaGVpZ2h0ID0gbGF5b3V0LmdldCgnaWNvbi10ZXh0LWZpdCcpID09PSAnaGVpZ2h0JyB8fCBsYXlvdXQuZ2V0KCdpY29uLXRleHQtZml0JykgPT09ICdib3RoJyA/IHRleHRIZWlnaHQgOiBpY29uSGVpZ2h0O1xuICAgICAgICB0bCA9IG5ldyBQb2ludCh0ZXh0TGVmdCArIG9mZnNldFggLSBwYWRMLCAgICAgICAgIHRleHRUb3AgKyBvZmZzZXRZIC0gcGFkVCk7XG4gICAgICAgIHRyID0gbmV3IFBvaW50KHRleHRMZWZ0ICsgb2Zmc2V0WCArIHBhZFIgKyB3aWR0aCwgdGV4dFRvcCArIG9mZnNldFkgLSBwYWRUKTtcbiAgICAgICAgYnIgPSBuZXcgUG9pbnQodGV4dExlZnQgKyBvZmZzZXRYICsgcGFkUiArIHdpZHRoLCB0ZXh0VG9wICsgb2Zmc2V0WSArIHBhZEIgKyBoZWlnaHQpO1xuICAgICAgICBibCA9IG5ldyBQb2ludCh0ZXh0TGVmdCArIG9mZnNldFggLSBwYWRMLCAgICAgICAgIHRleHRUb3AgKyBvZmZzZXRZICsgcGFkQiArIGhlaWdodCk7XG4gICAgLy8gTm9ybWFsIGljb24gc2l6ZSBtb2RlXG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGwgPSBuZXcgUG9pbnQobGVmdCwgdG9wKTtcbiAgICAgICAgdHIgPSBuZXcgUG9pbnQocmlnaHQsIHRvcCk7XG4gICAgICAgIGJyID0gbmV3IFBvaW50KHJpZ2h0LCBib3R0b20pO1xuICAgICAgICBibCA9IG5ldyBQb2ludChsZWZ0LCBib3R0b20pO1xuICAgIH1cblxuICAgIGNvbnN0IGFuZ2xlID0gbGF5ZXIubGF5b3V0LmdldCgnaWNvbi1yb3RhdGUnKS5ldmFsdWF0ZShmZWF0dXJlLCB7fSkgKiBNYXRoLlBJIC8gMTgwO1xuXG4gICAgaWYgKGFuZ2xlKSB7XG4gICAgICAgIGNvbnN0IHNpbiA9IE1hdGguc2luKGFuZ2xlKSxcbiAgICAgICAgICAgIGNvcyA9IE1hdGguY29zKGFuZ2xlKSxcbiAgICAgICAgICAgIG1hdHJpeCA9IFtjb3MsIC1zaW4sIHNpbiwgY29zXTtcblxuICAgICAgICB0bC5fbWF0TXVsdChtYXRyaXgpO1xuICAgICAgICB0ci5fbWF0TXVsdChtYXRyaXgpO1xuICAgICAgICBibC5fbWF0TXVsdChtYXRyaXgpO1xuICAgICAgICBici5fbWF0TXVsdChtYXRyaXgpO1xuICAgIH1cblxuICAgIC8vIEljb24gcXVhZCBpcyBwYWRkZWQsIHNvIHRleHR1cmUgY29vcmRpbmF0ZXMgYWxzbyBuZWVkIHRvIGJlIHBhZGRlZC5cbiAgICByZXR1cm4gW3t0bCwgdHIsIGJsLCBiciwgdGV4OiBpbWFnZS5wYWRkZWRSZWN0LCB3cml0aW5nTW9kZTogdW5kZWZpbmVkLCBnbHlwaE9mZnNldDogWzAsIDBdfV07XG59XG5cbi8qKlxuICogQ3JlYXRlIHRoZSBxdWFkcyB1c2VkIGZvciByZW5kZXJpbmcgYSB0ZXh0IGxhYmVsLlxuICogQHByaXZhdGVcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEdseXBoUXVhZHMoYW5jaG9yOiBBbmNob3IsXG4gICAgICAgICAgICAgICAgICAgICAgIHNoYXBpbmc6IFNoYXBpbmcsXG4gICAgICAgICAgICAgICAgICAgICAgIGxheWVyOiBTeW1ib2xTdHlsZUxheWVyLFxuICAgICAgICAgICAgICAgICAgICAgICBhbG9uZ0xpbmU6IGJvb2xlYW4sXG4gICAgICAgICAgICAgICAgICAgICAgIGZlYXR1cmU6IEZlYXR1cmUsXG4gICAgICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uczoge1tzdHJpbmddOiB7W251bWJlcl06IEdseXBoUG9zaXRpb259fSk6IEFycmF5PFN5bWJvbFF1YWQ+IHtcblxuICAgIGNvbnN0IG9uZUVtID0gMjQ7XG4gICAgY29uc3QgdGV4dFJvdGF0ZSA9IGxheWVyLmxheW91dC5nZXQoJ3RleHQtcm90YXRlJykuZXZhbHVhdGUoZmVhdHVyZSwge30pICogTWF0aC5QSSAvIDE4MDtcbiAgICBjb25zdCB0ZXh0T2Zmc2V0ID0gbGF5ZXIubGF5b3V0LmdldCgndGV4dC1vZmZzZXQnKS5ldmFsdWF0ZShmZWF0dXJlLCB7fSkubWFwKCh0KT0+IHQgKiBvbmVFbSk7XG5cbiAgICBjb25zdCBwb3NpdGlvbmVkR2x5cGhzID0gc2hhcGluZy5wb3NpdGlvbmVkR2x5cGhzO1xuICAgIGNvbnN0IHF1YWRzID0gW107XG5cblxuICAgIGZvciAobGV0IGsgPSAwOyBrIDwgcG9zaXRpb25lZEdseXBocy5sZW5ndGg7IGsrKykge1xuICAgICAgICBjb25zdCBwb3NpdGlvbmVkR2x5cGggPSBwb3NpdGlvbmVkR2x5cGhzW2tdO1xuICAgICAgICBjb25zdCBnbHlwaFBvc2l0aW9ucyA9IHBvc2l0aW9uc1twb3NpdGlvbmVkR2x5cGguZm9udFN0YWNrXTtcbiAgICAgICAgY29uc3QgZ2x5cGggPSBnbHlwaFBvc2l0aW9ucyAmJiBnbHlwaFBvc2l0aW9uc1twb3NpdGlvbmVkR2x5cGguZ2x5cGhdO1xuICAgICAgICBpZiAoIWdseXBoKSBjb250aW51ZTtcblxuICAgICAgICBjb25zdCByZWN0ID0gZ2x5cGgucmVjdDtcbiAgICAgICAgaWYgKCFyZWN0KSBjb250aW51ZTtcblxuICAgICAgICAvLyBUaGUgcmVjdHMgaGF2ZSBhbiBhZGRkaXRpb25hbCBidWZmZXIgdGhhdCBpcyBub3QgaW5jbHVkZWQgaW4gdGhlaXIgc2l6ZS5cbiAgICAgICAgY29uc3QgZ2x5cGhQYWRkaW5nID0gMS4wO1xuICAgICAgICBjb25zdCByZWN0QnVmZmVyID0gR0xZUEhfUEJGX0JPUkRFUiArIGdseXBoUGFkZGluZztcblxuICAgICAgICBjb25zdCBoYWxmQWR2YW5jZSA9IGdseXBoLm1ldHJpY3MuYWR2YW5jZSAqIHBvc2l0aW9uZWRHbHlwaC5zY2FsZSAvIDI7XG5cbiAgICAgICAgY29uc3QgZ2x5cGhPZmZzZXQgPSBhbG9uZ0xpbmUgP1xuICAgICAgICAgICAgW3Bvc2l0aW9uZWRHbHlwaC54ICsgaGFsZkFkdmFuY2UsIHBvc2l0aW9uZWRHbHlwaC55XSA6XG4gICAgICAgICAgICBbMCwgMF07XG5cbiAgICAgICAgY29uc3QgYnVpbHRJbk9mZnNldCA9IGFsb25nTGluZSA/XG4gICAgICAgICAgICBbMCwgMF0gOlxuICAgICAgICAgICAgW3Bvc2l0aW9uZWRHbHlwaC54ICsgaGFsZkFkdmFuY2UgKyB0ZXh0T2Zmc2V0WzBdLCBwb3NpdGlvbmVkR2x5cGgueSArIHRleHRPZmZzZXRbMV1dO1xuXG4gICAgICAgIGNvbnN0IHgxID0gKGdseXBoLm1ldHJpY3MubGVmdCAtIHJlY3RCdWZmZXIpICogcG9zaXRpb25lZEdseXBoLnNjYWxlIC0gaGFsZkFkdmFuY2UgKyBidWlsdEluT2Zmc2V0WzBdO1xuICAgICAgICBjb25zdCB5MSA9ICgtZ2x5cGgubWV0cmljcy50b3AgLSByZWN0QnVmZmVyKSAqIHBvc2l0aW9uZWRHbHlwaC5zY2FsZSArIGJ1aWx0SW5PZmZzZXRbMV07XG4gICAgICAgIGNvbnN0IHgyID0geDEgKyByZWN0LncgKiBwb3NpdGlvbmVkR2x5cGguc2NhbGU7XG4gICAgICAgIGNvbnN0IHkyID0geTEgKyByZWN0LmggKiBwb3NpdGlvbmVkR2x5cGguc2NhbGU7XG5cbiAgICAgICAgY29uc3QgdGwgPSBuZXcgUG9pbnQoeDEsIHkxKTtcbiAgICAgICAgY29uc3QgdHIgPSBuZXcgUG9pbnQoeDIsIHkxKTtcbiAgICAgICAgY29uc3QgYmwgID0gbmV3IFBvaW50KHgxLCB5Mik7XG4gICAgICAgIGNvbnN0IGJyID0gbmV3IFBvaW50KHgyLCB5Mik7XG5cbiAgICAgICAgaWYgKGFsb25nTGluZSAmJiBwb3NpdGlvbmVkR2x5cGgudmVydGljYWwpIHtcbiAgICAgICAgICAgIC8vIFZlcnRpY2FsLXN1cHBvcnRpbmcgZ2x5cGhzIGFyZSBsYWlkIG91dCBpbiAyNHgyNCBwb2ludCBib3hlcyAoMSBzcXVhcmUgZW0pXG4gICAgICAgICAgICAvLyBJbiBob3Jpem9udGFsIG9yaWVudGF0aW9uLCB0aGUgeSB2YWx1ZXMgZm9yIGdseXBocyBhcmUgYmVsb3cgdGhlIG1pZGxpbmVcbiAgICAgICAgICAgIC8vIGFuZCB3ZSB1c2UgYSBcInlPZmZzZXRcIiBvZiAtMTcgdG8gcHVsbCB0aGVtIHVwIHRvIHRoZSBtaWRkbGUuXG4gICAgICAgICAgICAvLyBCeSByb3RhdGluZyBjb3VudGVyLWNsb2Nrd2lzZSBhcm91bmQgdGhlIHBvaW50IGF0IHRoZSBjZW50ZXIgb2YgdGhlIGxlZnRcbiAgICAgICAgICAgIC8vIGVkZ2Ugb2YgYSAyNHgyNCBsYXlvdXQgYm94IGNlbnRlcmVkIGJlbG93IHRoZSBtaWRsaW5lLCB3ZSBhbGlnbiB0aGUgY2VudGVyXG4gICAgICAgICAgICAvLyBvZiB0aGUgZ2x5cGhzIHdpdGggdGhlIGhvcml6b250YWwgbWlkbGluZSwgc28gdGhlIHlPZmZzZXQgaXMgbm8gbG9uZ2VyXG4gICAgICAgICAgICAvLyBuZWNlc3NhcnksIGJ1dCB3ZSBhbHNvIHB1bGwgdGhlIGdseXBoIHRvIHRoZSBsZWZ0IGFsb25nIHRoZSB4IGF4aXNcbiAgICAgICAgICAgIGNvbnN0IGNlbnRlciA9IG5ldyBQb2ludCgtaGFsZkFkdmFuY2UsIGhhbGZBZHZhbmNlKTtcbiAgICAgICAgICAgIGNvbnN0IHZlcnRpY2FsUm90YXRpb24gPSAtTWF0aC5QSSAvIDI7XG4gICAgICAgICAgICBjb25zdCB4T2Zmc2V0Q29ycmVjdGlvbiA9IG5ldyBQb2ludCg1LCAwKTtcbiAgICAgICAgICAgIHRsLl9yb3RhdGVBcm91bmQodmVydGljYWxSb3RhdGlvbiwgY2VudGVyKS5fYWRkKHhPZmZzZXRDb3JyZWN0aW9uKTtcbiAgICAgICAgICAgIHRyLl9yb3RhdGVBcm91bmQodmVydGljYWxSb3RhdGlvbiwgY2VudGVyKS5fYWRkKHhPZmZzZXRDb3JyZWN0aW9uKTtcbiAgICAgICAgICAgIGJsLl9yb3RhdGVBcm91bmQodmVydGljYWxSb3RhdGlvbiwgY2VudGVyKS5fYWRkKHhPZmZzZXRDb3JyZWN0aW9uKTtcbiAgICAgICAgICAgIGJyLl9yb3RhdGVBcm91bmQodmVydGljYWxSb3RhdGlvbiwgY2VudGVyKS5fYWRkKHhPZmZzZXRDb3JyZWN0aW9uKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0ZXh0Um90YXRlKSB7XG4gICAgICAgICAgICBjb25zdCBzaW4gPSBNYXRoLnNpbih0ZXh0Um90YXRlKSxcbiAgICAgICAgICAgICAgICBjb3MgPSBNYXRoLmNvcyh0ZXh0Um90YXRlKSxcbiAgICAgICAgICAgICAgICBtYXRyaXggPSBbY29zLCAtc2luLCBzaW4sIGNvc107XG5cbiAgICAgICAgICAgIHRsLl9tYXRNdWx0KG1hdHJpeCk7XG4gICAgICAgICAgICB0ci5fbWF0TXVsdChtYXRyaXgpO1xuICAgICAgICAgICAgYmwuX21hdE11bHQobWF0cml4KTtcbiAgICAgICAgICAgIGJyLl9tYXRNdWx0KG1hdHJpeCk7XG4gICAgICAgIH1cblxuICAgICAgICBxdWFkcy5wdXNoKHt0bCwgdHIsIGJsLCBiciwgdGV4OiByZWN0LCB3cml0aW5nTW9kZTogc2hhcGluZy53cml0aW5nTW9kZSwgZ2x5cGhPZmZzZXR9KTtcbiAgICB9XG5cbiAgICByZXR1cm4gcXVhZHM7XG59XG4iLCIvLyBAZmxvd1xuXG5pbXBvcnQgdHlwZSB7Q29sbGlzaW9uQm94QXJyYXl9IGZyb20gJy4uL2RhdGEvYXJyYXlfdHlwZXMnO1xuaW1wb3J0IFBvaW50IGZyb20gJ0BtYXBib3gvcG9pbnQtZ2VvbWV0cnknO1xuaW1wb3J0IHR5cGUgQW5jaG9yIGZyb20gJy4vYW5jaG9yJztcblxuLyoqXG4gKiBBIENvbGxpc2lvbkZlYXR1cmUgcmVwcmVzZW50cyB0aGUgYXJlYSBvZiB0aGUgdGlsZSBjb3ZlcmVkIGJ5IGEgc2luZ2xlIGxhYmVsLlxuICogSXQgaXMgdXNlZCB3aXRoIENvbGxpc2lvbkluZGV4IHRvIGNoZWNrIGlmIHRoZSBsYWJlbCBvdmVybGFwcyB3aXRoIGFueVxuICogcHJldmlvdXMgbGFiZWxzLiBBIENvbGxpc2lvbkZlYXR1cmUgaXMgbW9zdGx5IGp1c3QgYSBzZXQgb2YgQ29sbGlzaW9uQm94XG4gKiBvYmplY3RzLlxuICpcbiAqIEBwcml2YXRlXG4gKi9cbmNsYXNzIENvbGxpc2lvbkZlYXR1cmUge1xuICAgIGJveFN0YXJ0SW5kZXg6IG51bWJlcjtcbiAgICBib3hFbmRJbmRleDogbnVtYmVyO1xuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlIGEgQ29sbGlzaW9uRmVhdHVyZSwgYWRkaW5nIGl0cyBjb2xsaXNpb24gYm94IGRhdGEgdG8gdGhlIGdpdmVuIGNvbGxpc2lvbkJveEFycmF5IGluIHRoZSBwcm9jZXNzLlxuICAgICAqXG4gICAgICogQHBhcmFtIGxpbmUgVGhlIGdlb21ldHJ5IHRoZSBsYWJlbCBpcyBwbGFjZWQgb24uXG4gICAgICogQHBhcmFtIGFuY2hvciBUaGUgcG9pbnQgYWxvbmcgdGhlIGxpbmUgYXJvdW5kIHdoaWNoIHRoZSBsYWJlbCBpcyBhbmNob3JlZC5cbiAgICAgKiBAcGFyYW0gc2hhcGVkIFRoZSB0ZXh0IG9yIGljb24gc2hhcGluZyByZXN1bHRzLlxuICAgICAqIEBwYXJhbSBib3hTY2FsZSBBIG1hZ2ljIG51bWJlciB1c2VkIHRvIGNvbnZlcnQgZnJvbSBnbHlwaCBtZXRyaWNzIHVuaXRzIHRvIGdlb21ldHJ5IHVuaXRzLlxuICAgICAqIEBwYXJhbSBwYWRkaW5nIFRoZSBhbW91bnQgb2YgcGFkZGluZyB0byBhZGQgYXJvdW5kIHRoZSBsYWJlbCBlZGdlcy5cbiAgICAgKiBAcGFyYW0gYWxpZ25MaW5lIFdoZXRoZXIgdGhlIGxhYmVsIGlzIGFsaWduZWQgd2l0aCB0aGUgbGluZSBvciB0aGUgdmlld3BvcnQuXG4gICAgICovXG4gICAgY29uc3RydWN0b3IoY29sbGlzaW9uQm94QXJyYXk6IENvbGxpc2lvbkJveEFycmF5LFxuICAgICAgICAgICAgICAgIGxpbmU6IEFycmF5PFBvaW50PixcbiAgICAgICAgICAgICAgICBhbmNob3I6IEFuY2hvcixcbiAgICAgICAgICAgICAgICBmZWF0dXJlSW5kZXg6IG51bWJlcixcbiAgICAgICAgICAgICAgICBzb3VyY2VMYXllckluZGV4OiBudW1iZXIsXG4gICAgICAgICAgICAgICAgYnVja2V0SW5kZXg6IG51bWJlcixcbiAgICAgICAgICAgICAgICBzaGFwZWQ6IE9iamVjdCxcbiAgICAgICAgICAgICAgICBib3hTY2FsZTogbnVtYmVyLFxuICAgICAgICAgICAgICAgIHBhZGRpbmc6IG51bWJlcixcbiAgICAgICAgICAgICAgICBhbGlnbkxpbmU6IGJvb2xlYW4sXG4gICAgICAgICAgICAgICAgb3ZlcnNjYWxpbmc6IG51bWJlcixcbiAgICAgICAgICAgICAgICByb3RhdGU6IG51bWJlcikge1xuICAgICAgICBsZXQgeTEgPSBzaGFwZWQudG9wICogYm94U2NhbGUgLSBwYWRkaW5nO1xuICAgICAgICBsZXQgeTIgPSBzaGFwZWQuYm90dG9tICogYm94U2NhbGUgKyBwYWRkaW5nO1xuICAgICAgICBsZXQgeDEgPSBzaGFwZWQubGVmdCAqIGJveFNjYWxlIC0gcGFkZGluZztcbiAgICAgICAgbGV0IHgyID0gc2hhcGVkLnJpZ2h0ICogYm94U2NhbGUgKyBwYWRkaW5nO1xuXG4gICAgICAgIHRoaXMuYm94U3RhcnRJbmRleCA9IGNvbGxpc2lvbkJveEFycmF5Lmxlbmd0aDtcblxuICAgICAgICBpZiAoYWxpZ25MaW5lKSB7XG5cbiAgICAgICAgICAgIGxldCBoZWlnaHQgPSB5MiAtIHkxO1xuICAgICAgICAgICAgY29uc3QgbGVuZ3RoID0geDIgLSB4MTtcblxuICAgICAgICAgICAgaWYgKGhlaWdodCA+IDApIHtcbiAgICAgICAgICAgICAgICAvLyBzZXQgbWluaW11bSBib3ggaGVpZ2h0IHRvIGF2b2lkIHZlcnkgbWFueSBzbWFsbCBsYWJlbHNcbiAgICAgICAgICAgICAgICBoZWlnaHQgPSBNYXRoLm1heCgxMCAqIGJveFNjYWxlLCBoZWlnaHQpO1xuXG4gICAgICAgICAgICAgICAgdGhpcy5fYWRkTGluZUNvbGxpc2lvbkNpcmNsZXMoY29sbGlzaW9uQm94QXJyYXksIGxpbmUsIGFuY2hvciwgKGFuY2hvci5zZWdtZW50OiBhbnkpLCBsZW5ndGgsIGhlaWdodCwgZmVhdHVyZUluZGV4LCBzb3VyY2VMYXllckluZGV4LCBidWNrZXRJbmRleCwgb3ZlcnNjYWxpbmcpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAocm90YXRlKSB7XG4gICAgICAgICAgICAgICAgLy8gQWNjb3VudCBmb3IgKi1yb3RhdGUgaW4gcG9pbnQgY29sbGlzaW9uIGJveGVzXG4gICAgICAgICAgICAgICAgLy8gU2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9tYXBib3gvbWFwYm94LWdsLWpzL2lzc3Vlcy82MDc1XG4gICAgICAgICAgICAgICAgLy8gRG9lc24ndCBhY2NvdW50IGZvciBpY29uLXRleHQtZml0XG5cbiAgICAgICAgICAgICAgICBjb25zdCB0bCA9IG5ldyBQb2ludCh4MSwgeTEpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHRyID0gbmV3IFBvaW50KHgyLCB5MSk7XG4gICAgICAgICAgICAgICAgY29uc3QgYmwgPSBuZXcgUG9pbnQoeDEsIHkyKTtcbiAgICAgICAgICAgICAgICBjb25zdCBiciA9IG5ldyBQb2ludCh4MiwgeTIpO1xuXG4gICAgICAgICAgICAgICAgY29uc3Qgcm90YXRlUmFkaWFucyA9IHJvdGF0ZSAqIE1hdGguUEkgLyAxODA7XG5cbiAgICAgICAgICAgICAgICB0bC5fcm90YXRlKHJvdGF0ZVJhZGlhbnMpO1xuICAgICAgICAgICAgICAgIHRyLl9yb3RhdGUocm90YXRlUmFkaWFucyk7XG4gICAgICAgICAgICAgICAgYmwuX3JvdGF0ZShyb3RhdGVSYWRpYW5zKTtcbiAgICAgICAgICAgICAgICBici5fcm90YXRlKHJvdGF0ZVJhZGlhbnMpO1xuXG4gICAgICAgICAgICAgICAgLy8gQ29sbGlzaW9uIGZlYXR1cmVzIHJlcXVpcmUgYW4gXCJvbi1heGlzXCIgZ2VvbWV0cnksXG4gICAgICAgICAgICAgICAgLy8gc28gdGFrZSB0aGUgZW52ZWxvcGUgb2YgdGhlIHJvdGF0ZWQgZ2VvbWV0cnlcbiAgICAgICAgICAgICAgICAvLyAobWF5IGJlIHF1aXRlIGxhcmdlIGZvciB3aWRlIGxhYmVscyByb3RhdGVkIDQ1IGRlZ3JlZXMpXG4gICAgICAgICAgICAgICAgeDEgPSBNYXRoLm1pbih0bC54LCB0ci54LCBibC54LCBici54KTtcbiAgICAgICAgICAgICAgICB4MiA9IE1hdGgubWF4KHRsLngsIHRyLngsIGJsLngsIGJyLngpO1xuICAgICAgICAgICAgICAgIHkxID0gTWF0aC5taW4odGwueSwgdHIueSwgYmwueSwgYnIueSk7XG4gICAgICAgICAgICAgICAgeTIgPSBNYXRoLm1heCh0bC55LCB0ci55LCBibC55LCBici55KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbGxpc2lvbkJveEFycmF5LmVtcGxhY2VCYWNrKGFuY2hvci54LCBhbmNob3IueSwgeDEsIHkxLCB4MiwgeTIsIGZlYXR1cmVJbmRleCwgc291cmNlTGF5ZXJJbmRleCwgYnVja2V0SW5kZXgsXG4gICAgICAgICAgICAgICAgMCwgMCk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmJveEVuZEluZGV4ID0gY29sbGlzaW9uQm94QXJyYXkubGVuZ3RoO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENyZWF0ZSBhIHNldCBvZiBDb2xsaXNpb25Cb3ggb2JqZWN0cyBmb3IgYSBsaW5lLlxuICAgICAqXG4gICAgICogQHBhcmFtIGxhYmVsTGVuZ3RoIFRoZSBsZW5ndGggb2YgdGhlIGxhYmVsIGluIGdlb21ldHJ5IHVuaXRzLlxuICAgICAqIEBwYXJhbSBhbmNob3IgVGhlIHBvaW50IGFsb25nIHRoZSBsaW5lIGFyb3VuZCB3aGljaCB0aGUgbGFiZWwgaXMgYW5jaG9yZWQuXG4gICAgICogQHBhcmFtIGJveFNpemUgVGhlIHNpemUgb2YgdGhlIGNvbGxpc2lvbiBib3hlcyB0aGF0IHdpbGwgYmUgY3JlYXRlZC5cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9hZGRMaW5lQ29sbGlzaW9uQ2lyY2xlcyhjb2xsaXNpb25Cb3hBcnJheTogQ29sbGlzaW9uQm94QXJyYXksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBsaW5lOiBBcnJheTxQb2ludD4sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBhbmNob3I6IEFuY2hvcixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlZ21lbnQ6IG51bWJlcixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGxhYmVsTGVuZ3RoOiBudW1iZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBib3hTaXplOiBudW1iZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBmZWF0dXJlSW5kZXg6IG51bWJlcixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHNvdXJjZUxheWVySW5kZXg6IG51bWJlcixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGJ1Y2tldEluZGV4OiBudW1iZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBvdmVyc2NhbGluZzogbnVtYmVyKSB7XG4gICAgICAgIGNvbnN0IHN0ZXAgPSBib3hTaXplIC8gMjtcbiAgICAgICAgY29uc3QgbkJveGVzID0gTWF0aC5mbG9vcihsYWJlbExlbmd0aCAvIHN0ZXApIHx8IDE7XG4gICAgICAgIC8vIFdlIGNhbGN1bGF0ZSBsaW5lIGNvbGxpc2lvbiBjaXJjbGVzIG91dCB0byAzMDAlIG9mIHdoYXQgd291bGQgbm9ybWFsbHkgYmUgb3VyXG4gICAgICAgIC8vIG1heCBzaXplLCB0byBhbGxvdyBjb2xsaXNpb24gZGV0ZWN0aW9uIHRvIHdvcmsgb24gbGFiZWxzIHRoYXQgZXhwYW5kIGFzXG4gICAgICAgIC8vIHRoZXkgbW92ZSBpbnRvIHRoZSBkaXN0YW5jZVxuICAgICAgICAvLyBWZXJ0aWNhbGx5IG9yaWVudGVkIGxhYmVscyBpbiB0aGUgZGlzdGFudCBmaWVsZCBjYW4gZXh0ZW5kIHBhc3QgdGhpcyBwYWRkaW5nXG4gICAgICAgIC8vIFRoaXMgaXMgYSBub3RpY2VhYmxlIHByb2JsZW0gaW4gb3ZlcnNjYWxlZCB0aWxlcyB3aGVyZSB0aGUgcGl0Y2ggMC1iYXNlZFxuICAgICAgICAvLyBzeW1ib2wgc3BhY2luZyB3aWxsIHB1dCBsYWJlbHMgdmVyeSBjbG9zZSB0b2dldGhlciBpbiBhIHBpdGNoZWQgbWFwLlxuICAgICAgICAvLyBUbyByZWR1Y2UgdGhlIGNvc3Qgb2YgYWRkaW5nIGV4dHJhIGNvbGxpc2lvbiBjaXJjbGVzLCB3ZSBzbG93bHkgaW5jcmVhc2VcbiAgICAgICAgLy8gdGhlbSBmb3Igb3ZlcnNjYWxlZCB0aWxlcy5cbiAgICAgICAgY29uc3Qgb3ZlcnNjYWxpbmdQYWRkaW5nRmFjdG9yID0gMSArIC40ICogTWF0aC5sb2cob3ZlcnNjYWxpbmcpIC8gTWF0aC5MTjI7XG4gICAgICAgIGNvbnN0IG5QaXRjaFBhZGRpbmdCb3hlcyA9IE1hdGguZmxvb3IobkJveGVzICogb3ZlcnNjYWxpbmdQYWRkaW5nRmFjdG9yIC8gMik7XG5cbiAgICAgICAgLy8gb2Zmc2V0IHRoZSBjZW50ZXIgb2YgdGhlIGZpcnN0IGJveCBieSBoYWxmIGEgYm94IHNvIHRoYXQgdGhlIGVkZ2Ugb2YgdGhlXG4gICAgICAgIC8vIGJveCBpcyBhdCB0aGUgZWRnZSBvZiB0aGUgbGFiZWwuXG4gICAgICAgIGNvbnN0IGZpcnN0Qm94T2Zmc2V0ID0gLWJveFNpemUgLyAyO1xuXG4gICAgICAgIGxldCBwID0gYW5jaG9yO1xuICAgICAgICBsZXQgaW5kZXggPSBzZWdtZW50ICsgMTtcbiAgICAgICAgbGV0IGFuY2hvckRpc3RhbmNlID0gZmlyc3RCb3hPZmZzZXQ7XG4gICAgICAgIGNvbnN0IGxhYmVsU3RhcnREaXN0YW5jZSA9IC1sYWJlbExlbmd0aCAvIDI7XG4gICAgICAgIGNvbnN0IHBhZGRpbmdTdGFydERpc3RhbmNlID0gbGFiZWxTdGFydERpc3RhbmNlIC0gbGFiZWxMZW5ndGggLyA0O1xuICAgICAgICAvLyBtb3ZlIGJhY2t3YXJkcyBhbG9uZyB0aGUgbGluZSB0byB0aGUgZmlyc3Qgc2VnbWVudCB0aGUgbGFiZWwgYXBwZWFycyBvblxuICAgICAgICBkbyB7XG4gICAgICAgICAgICBpbmRleC0tO1xuXG4gICAgICAgICAgICBpZiAoaW5kZXggPCAwKSB7XG4gICAgICAgICAgICAgICAgaWYgKGFuY2hvckRpc3RhbmNlID4gbGFiZWxTdGFydERpc3RhbmNlKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIHRoZXJlIGlzbid0IGVub3VnaCByb29tIGZvciB0aGUgbGFiZWwgYWZ0ZXIgdGhlIGJlZ2lubmluZyBvZiB0aGUgbGluZVxuICAgICAgICAgICAgICAgICAgICAvLyBjaGVja01heEFuZ2xlIHNob3VsZCBoYXZlIGFscmVhZHkgY2F1Z2h0IHRoaXNcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFRoZSBsaW5lIGRvZXNuJ3QgZXh0ZW5kIGZhciBlbm91Z2ggYmFjayBmb3IgYWxsIG9mIG91ciBwYWRkaW5nLFxuICAgICAgICAgICAgICAgICAgICAvLyBidXQgd2UgZ290IGZhciBlbm91Z2ggdG8gc2hvdyB0aGUgbGFiZWwgdW5kZXIgbW9zdCBjb25kaXRpb25zLlxuICAgICAgICAgICAgICAgICAgICBpbmRleCA9IDA7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgYW5jaG9yRGlzdGFuY2UgLT0gbGluZVtpbmRleF0uZGlzdChwKTtcbiAgICAgICAgICAgICAgICBwID0gbGluZVtpbmRleF07XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gd2hpbGUgKGFuY2hvckRpc3RhbmNlID4gcGFkZGluZ1N0YXJ0RGlzdGFuY2UpO1xuXG4gICAgICAgIGxldCBzZWdtZW50TGVuZ3RoID0gbGluZVtpbmRleF0uZGlzdChsaW5lW2luZGV4ICsgMV0pO1xuXG4gICAgICAgIGZvciAobGV0IGkgPSAtblBpdGNoUGFkZGluZ0JveGVzOyBpIDwgbkJveGVzICsgblBpdGNoUGFkZGluZ0JveGVzOyBpKyspIHtcblxuICAgICAgICAgICAgLy8gdGhlIGRpc3RhbmNlIHRoZSBib3ggd2lsbCBiZSBmcm9tIHRoZSBhbmNob3JcbiAgICAgICAgICAgIGNvbnN0IGJveE9mZnNldCA9IGkgKiBzdGVwO1xuICAgICAgICAgICAgbGV0IGJveERpc3RhbmNlVG9BbmNob3IgPSBsYWJlbFN0YXJ0RGlzdGFuY2UgKyBib3hPZmZzZXQ7XG5cbiAgICAgICAgICAgIC8vIG1ha2UgdGhlIGRpc3RhbmNlIGJldHdlZW4gcGl0Y2ggcGFkZGluZyBib3hlcyBiaWdnZXJcbiAgICAgICAgICAgIGlmIChib3hPZmZzZXQgPCAwKSBib3hEaXN0YW5jZVRvQW5jaG9yICs9IGJveE9mZnNldDtcbiAgICAgICAgICAgIGlmIChib3hPZmZzZXQgPiBsYWJlbExlbmd0aCkgYm94RGlzdGFuY2VUb0FuY2hvciArPSBib3hPZmZzZXQgLSBsYWJlbExlbmd0aDtcblxuICAgICAgICAgICAgaWYgKGJveERpc3RhbmNlVG9BbmNob3IgPCBhbmNob3JEaXN0YW5jZSkge1xuICAgICAgICAgICAgICAgIC8vIFRoZSBsaW5lIGRvZXNuJ3QgZXh0ZW5kIGZhciBlbm91Z2ggYmFjayBmb3IgdGhpcyBib3gsIHNraXAgaXRcbiAgICAgICAgICAgICAgICAvLyAoVGhpcyBjb3VsZCBhbGxvdyBmb3IgbGluZSBjb2xsaXNpb25zIG9uIGRpc3RhbnQgdGlsZXMpXG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIHRoZSBib3ggaXMgbm90IG9uIHRoZSBjdXJyZW50IHNlZ21lbnQuIE1vdmUgdG8gdGhlIG5leHQgc2VnbWVudC5cbiAgICAgICAgICAgIHdoaWxlIChhbmNob3JEaXN0YW5jZSArIHNlZ21lbnRMZW5ndGggPCBib3hEaXN0YW5jZVRvQW5jaG9yKSB7XG4gICAgICAgICAgICAgICAgYW5jaG9yRGlzdGFuY2UgKz0gc2VnbWVudExlbmd0aDtcbiAgICAgICAgICAgICAgICBpbmRleCsrO1xuXG4gICAgICAgICAgICAgICAgLy8gVGhlcmUgaXNuJ3QgZW5vdWdoIHJvb20gYmVmb3JlIHRoZSBlbmQgb2YgdGhlIGxpbmUuXG4gICAgICAgICAgICAgICAgaWYgKGluZGV4ICsgMSA+PSBsaW5lLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgc2VnbWVudExlbmd0aCA9IGxpbmVbaW5kZXhdLmRpc3QobGluZVtpbmRleCArIDFdKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gdGhlIGRpc3RhbmNlIHRoZSBib3ggd2lsbCBiZSBmcm9tIHRoZSBiZWdpbm5pbmcgb2YgdGhlIHNlZ21lbnRcbiAgICAgICAgICAgIGNvbnN0IHNlZ21lbnRCb3hEaXN0YW5jZSA9IGJveERpc3RhbmNlVG9BbmNob3IgLSBhbmNob3JEaXN0YW5jZTtcblxuICAgICAgICAgICAgY29uc3QgcDAgPSBsaW5lW2luZGV4XTtcbiAgICAgICAgICAgIGNvbnN0IHAxID0gbGluZVtpbmRleCArIDFdO1xuICAgICAgICAgICAgY29uc3QgYm94QW5jaG9yUG9pbnQgPSBwMS5zdWIocDApLl91bml0KCkuX211bHQoc2VnbWVudEJveERpc3RhbmNlKS5fYWRkKHAwKS5fcm91bmQoKTtcblxuICAgICAgICAgICAgLy8gSWYgdGhlIGJveCBpcyB3aXRoaW4gYm94U2l6ZSBvZiB0aGUgYW5jaG9yLCBmb3JjZSB0aGUgYm94IHRvIGJlIHVzZWRcbiAgICAgICAgICAgIC8vIChzbyBldmVuIDAtd2lkdGggbGFiZWxzIHVzZSBhdCBsZWFzdCBvbmUgYm94KVxuICAgICAgICAgICAgLy8gT3RoZXJ3aXNlLCB0aGUgLjggbXVsdGlwbGljYXRpb24gZ2l2ZXMgdXMgYSBsaXR0bGUgYml0IG9mIGNvbnNlcnZhdGl2ZVxuICAgICAgICAgICAgLy8gcGFkZGluZyBpbiBjaG9vc2luZyB3aGljaCBib3hlcyB0byB1c2UgKHNlZSBDb2xsaXNpb25JbmRleCNwbGFjZWRDb2xsaXNpb25DaXJjbGVzKVxuICAgICAgICAgICAgY29uc3QgcGFkZGVkQW5jaG9yRGlzdGFuY2UgPSBNYXRoLmFicyhib3hEaXN0YW5jZVRvQW5jaG9yIC0gZmlyc3RCb3hPZmZzZXQpIDwgc3RlcCA/XG4gICAgICAgICAgICAgICAgMCA6XG4gICAgICAgICAgICAgICAgKGJveERpc3RhbmNlVG9BbmNob3IgLSBmaXJzdEJveE9mZnNldCkgKiAwLjg7XG5cbiAgICAgICAgICAgIGNvbGxpc2lvbkJveEFycmF5LmVtcGxhY2VCYWNrKGJveEFuY2hvclBvaW50LngsIGJveEFuY2hvclBvaW50LnksXG4gICAgICAgICAgICAgICAgLWJveFNpemUgLyAyLCAtYm94U2l6ZSAvIDIsIGJveFNpemUgLyAyLCBib3hTaXplIC8gMixcbiAgICAgICAgICAgICAgICBmZWF0dXJlSW5kZXgsIHNvdXJjZUxheWVySW5kZXgsIGJ1Y2tldEluZGV4LFxuICAgICAgICAgICAgICAgIGJveFNpemUgLyAyLCBwYWRkZWRBbmNob3JEaXN0YW5jZSk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IENvbGxpc2lvbkZlYXR1cmU7XG4iLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0gVGlueVF1ZXVlO1xubW9kdWxlLmV4cG9ydHMuZGVmYXVsdCA9IFRpbnlRdWV1ZTtcblxuZnVuY3Rpb24gVGlueVF1ZXVlKGRhdGEsIGNvbXBhcmUpIHtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgVGlueVF1ZXVlKSkgcmV0dXJuIG5ldyBUaW55UXVldWUoZGF0YSwgY29tcGFyZSk7XG5cbiAgICB0aGlzLmRhdGEgPSBkYXRhIHx8IFtdO1xuICAgIHRoaXMubGVuZ3RoID0gdGhpcy5kYXRhLmxlbmd0aDtcbiAgICB0aGlzLmNvbXBhcmUgPSBjb21wYXJlIHx8IGRlZmF1bHRDb21wYXJlO1xuXG4gICAgaWYgKHRoaXMubGVuZ3RoID4gMCkge1xuICAgICAgICBmb3IgKHZhciBpID0gKHRoaXMubGVuZ3RoID4+IDEpIC0gMTsgaSA+PSAwOyBpLS0pIHRoaXMuX2Rvd24oaSk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBkZWZhdWx0Q29tcGFyZShhLCBiKSB7XG4gICAgcmV0dXJuIGEgPCBiID8gLTEgOiBhID4gYiA/IDEgOiAwO1xufVxuXG5UaW55UXVldWUucHJvdG90eXBlID0ge1xuXG4gICAgcHVzaDogZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgICAgdGhpcy5kYXRhLnB1c2goaXRlbSk7XG4gICAgICAgIHRoaXMubGVuZ3RoKys7XG4gICAgICAgIHRoaXMuX3VwKHRoaXMubGVuZ3RoIC0gMSk7XG4gICAgfSxcblxuICAgIHBvcDogZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAodGhpcy5sZW5ndGggPT09IDApIHJldHVybiB1bmRlZmluZWQ7XG5cbiAgICAgICAgdmFyIHRvcCA9IHRoaXMuZGF0YVswXTtcbiAgICAgICAgdGhpcy5sZW5ndGgtLTtcblxuICAgICAgICBpZiAodGhpcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICB0aGlzLmRhdGFbMF0gPSB0aGlzLmRhdGFbdGhpcy5sZW5ndGhdO1xuICAgICAgICAgICAgdGhpcy5fZG93bigwKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmRhdGEucG9wKCk7XG5cbiAgICAgICAgcmV0dXJuIHRvcDtcbiAgICB9LFxuXG4gICAgcGVlazogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5kYXRhWzBdO1xuICAgIH0sXG5cbiAgICBfdXA6IGZ1bmN0aW9uIChwb3MpIHtcbiAgICAgICAgdmFyIGRhdGEgPSB0aGlzLmRhdGE7XG4gICAgICAgIHZhciBjb21wYXJlID0gdGhpcy5jb21wYXJlO1xuICAgICAgICB2YXIgaXRlbSA9IGRhdGFbcG9zXTtcblxuICAgICAgICB3aGlsZSAocG9zID4gMCkge1xuICAgICAgICAgICAgdmFyIHBhcmVudCA9IChwb3MgLSAxKSA+PiAxO1xuICAgICAgICAgICAgdmFyIGN1cnJlbnQgPSBkYXRhW3BhcmVudF07XG4gICAgICAgICAgICBpZiAoY29tcGFyZShpdGVtLCBjdXJyZW50KSA+PSAwKSBicmVhaztcbiAgICAgICAgICAgIGRhdGFbcG9zXSA9IGN1cnJlbnQ7XG4gICAgICAgICAgICBwb3MgPSBwYXJlbnQ7XG4gICAgICAgIH1cblxuICAgICAgICBkYXRhW3Bvc10gPSBpdGVtO1xuICAgIH0sXG5cbiAgICBfZG93bjogZnVuY3Rpb24gKHBvcykge1xuICAgICAgICB2YXIgZGF0YSA9IHRoaXMuZGF0YTtcbiAgICAgICAgdmFyIGNvbXBhcmUgPSB0aGlzLmNvbXBhcmU7XG4gICAgICAgIHZhciBoYWxmTGVuZ3RoID0gdGhpcy5sZW5ndGggPj4gMTtcbiAgICAgICAgdmFyIGl0ZW0gPSBkYXRhW3Bvc107XG5cbiAgICAgICAgd2hpbGUgKHBvcyA8IGhhbGZMZW5ndGgpIHtcbiAgICAgICAgICAgIHZhciBsZWZ0ID0gKHBvcyA8PCAxKSArIDE7XG4gICAgICAgICAgICB2YXIgcmlnaHQgPSBsZWZ0ICsgMTtcbiAgICAgICAgICAgIHZhciBiZXN0ID0gZGF0YVtsZWZ0XTtcblxuICAgICAgICAgICAgaWYgKHJpZ2h0IDwgdGhpcy5sZW5ndGggJiYgY29tcGFyZShkYXRhW3JpZ2h0XSwgYmVzdCkgPCAwKSB7XG4gICAgICAgICAgICAgICAgbGVmdCA9IHJpZ2h0O1xuICAgICAgICAgICAgICAgIGJlc3QgPSBkYXRhW3JpZ2h0XTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChjb21wYXJlKGJlc3QsIGl0ZW0pID49IDApIGJyZWFrO1xuXG4gICAgICAgICAgICBkYXRhW3Bvc10gPSBiZXN0O1xuICAgICAgICAgICAgcG9zID0gbGVmdDtcbiAgICAgICAgfVxuXG4gICAgICAgIGRhdGFbcG9zXSA9IGl0ZW07XG4gICAgfVxufTtcbiIsIi8vIEBmbG93XG5cbmltcG9ydCBRdWV1ZSBmcm9tICd0aW55cXVldWUnO1xuXG5pbXBvcnQgUG9pbnQgZnJvbSAnQG1hcGJveC9wb2ludC1nZW9tZXRyeSc7XG5pbXBvcnQgeyBkaXN0VG9TZWdtZW50U3F1YXJlZCB9IGZyb20gJy4vaW50ZXJzZWN0aW9uX3Rlc3RzJztcblxuLyoqXG4gKiBGaW5kcyBhbiBhcHByb3hpbWF0aW9uIG9mIGEgcG9seWdvbidzIFBvbGUgT2YgSW5hY2Nlc3NpYmlsaXkgaHR0cHM6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvUG9sZV9vZl9pbmFjY2Vzc2liaWxpdHlcbiAqIFRoaXMgaXMgYSBjb3B5IG9mIGh0dHA6Ly9naXRodWIuY29tL21hcGJveC9wb2x5bGFiZWwgYWRhcHRlZCB0byB1c2UgUG9pbnRzXG4gKlxuICogQHBhcmFtIHBvbHlnb25SaW5ncyBmaXJzdCBpdGVtIGluIGFycmF5IGlzIHRoZSBvdXRlciByaW5nIGZvbGxvd2VkIG9wdGlvbmFsbHkgYnkgdGhlIGxpc3Qgb2YgaG9sZXMsIHNob3VsZCBiZSBhbiBlbGVtZW50IG9mIHRoZSByZXN1bHQgb2YgdXRpbC9jbGFzc2lmeV9yaW5nc1xuICogQHBhcmFtIHByZWNpc2lvbiBTcGVjaWZpZWQgaW4gaW5wdXQgY29vcmRpbmF0ZSB1bml0cy4gSWYgMCByZXR1cm5zIGFmdGVyIGZpcnN0IHJ1biwgaWYgPiAwIHJlcGVhdGVkbHkgbmFycm93cyB0aGUgc2VhcmNoIHNwYWNlIHVudGlsIHRoZSByYWRpdXMgb2YgdGhlIGFyZWEgc2VhcmNoZWQgZm9yIHRoZSBiZXN0IHBvbGUgaXMgbGVzcyB0aGFuIHByZWNpc2lvblxuICogQHBhcmFtIGRlYnVnIFByaW50IHNvbWUgc3RhdGlzdGljcyB0byB0aGUgY29uc29sZSBkdXJpbmcgZXhlY3V0aW9uXG4gKiBAcmV0dXJucyBQb2xlIG9mIEluYWNjZXNzaWJpbGl5LlxuICogQHByaXZhdGVcbiAqL1xuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gKHBvbHlnb25SaW5nczogQXJyYXk8QXJyYXk8UG9pbnQ+PiwgcHJlY2lzaW9uPzogbnVtYmVyID0gMSwgZGVidWc/OiBib29sZWFuID0gZmFsc2UpOiBQb2ludCB7XG4gICAgLy8gZmluZCB0aGUgYm91bmRpbmcgYm94IG9mIHRoZSBvdXRlciByaW5nXG4gICAgbGV0IG1pblggPSBJbmZpbml0eSwgbWluWSA9IEluZmluaXR5LCBtYXhYID0gLUluZmluaXR5LCBtYXhZID0gLUluZmluaXR5O1xuICAgIGNvbnN0IG91dGVyUmluZyA9IHBvbHlnb25SaW5nc1swXTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IG91dGVyUmluZy5sZW5ndGg7IGkrKykge1xuICAgICAgICBjb25zdCBwID0gb3V0ZXJSaW5nW2ldO1xuICAgICAgICBpZiAoIWkgfHwgcC54IDwgbWluWCkgbWluWCA9IHAueDtcbiAgICAgICAgaWYgKCFpIHx8IHAueSA8IG1pblkpIG1pblkgPSBwLnk7XG4gICAgICAgIGlmICghaSB8fCBwLnggPiBtYXhYKSBtYXhYID0gcC54O1xuICAgICAgICBpZiAoIWkgfHwgcC55ID4gbWF4WSkgbWF4WSA9IHAueTtcbiAgICB9XG5cbiAgICBjb25zdCB3aWR0aCA9IG1heFggLSBtaW5YO1xuICAgIGNvbnN0IGhlaWdodCA9IG1heFkgLSBtaW5ZO1xuICAgIGNvbnN0IGNlbGxTaXplID0gTWF0aC5taW4od2lkdGgsIGhlaWdodCk7XG4gICAgbGV0IGggPSBjZWxsU2l6ZSAvIDI7XG5cbiAgICAvLyBhIHByaW9yaXR5IHF1ZXVlIG9mIGNlbGxzIGluIG9yZGVyIG9mIHRoZWlyIFwicG90ZW50aWFsXCIgKG1heCBkaXN0YW5jZSB0byBwb2x5Z29uKVxuICAgIGNvbnN0IGNlbGxRdWV1ZSA9IG5ldyBRdWV1ZShudWxsLCBjb21wYXJlTWF4KTtcblxuICAgIGlmIChjZWxsU2l6ZSA9PT0gMCkgcmV0dXJuIG5ldyBQb2ludChtaW5YLCBtaW5ZKTtcblxuICAgIC8vIGNvdmVyIHBvbHlnb24gd2l0aCBpbml0aWFsIGNlbGxzXG4gICAgZm9yIChsZXQgeCA9IG1pblg7IHggPCBtYXhYOyB4ICs9IGNlbGxTaXplKSB7XG4gICAgICAgIGZvciAobGV0IHkgPSBtaW5ZOyB5IDwgbWF4WTsgeSArPSBjZWxsU2l6ZSkge1xuICAgICAgICAgICAgY2VsbFF1ZXVlLnB1c2gobmV3IENlbGwoeCArIGgsIHkgKyBoLCBoLCBwb2x5Z29uUmluZ3MpKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIHRha2UgY2VudHJvaWQgYXMgdGhlIGZpcnN0IGJlc3QgZ3Vlc3NcbiAgICBsZXQgYmVzdENlbGwgPSBnZXRDZW50cm9pZENlbGwocG9seWdvblJpbmdzKTtcbiAgICBsZXQgbnVtUHJvYmVzID0gY2VsbFF1ZXVlLmxlbmd0aDtcblxuICAgIHdoaWxlIChjZWxsUXVldWUubGVuZ3RoKSB7XG4gICAgICAgIC8vIHBpY2sgdGhlIG1vc3QgcHJvbWlzaW5nIGNlbGwgZnJvbSB0aGUgcXVldWVcbiAgICAgICAgY29uc3QgY2VsbCA9IGNlbGxRdWV1ZS5wb3AoKTtcblxuICAgICAgICAvLyB1cGRhdGUgdGhlIGJlc3QgY2VsbCBpZiB3ZSBmb3VuZCBhIGJldHRlciBvbmVcbiAgICAgICAgaWYgKGNlbGwuZCA+IGJlc3RDZWxsLmQgfHwgIWJlc3RDZWxsLmQpIHtcbiAgICAgICAgICAgIGJlc3RDZWxsID0gY2VsbDtcbiAgICAgICAgICAgIGlmIChkZWJ1ZykgY29uc29sZS5sb2coJ2ZvdW5kIGJlc3QgJWQgYWZ0ZXIgJWQgcHJvYmVzJywgTWF0aC5yb3VuZCgxZTQgKiBjZWxsLmQpIC8gMWU0LCBudW1Qcm9iZXMpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gZG8gbm90IGRyaWxsIGRvd24gZnVydGhlciBpZiB0aGVyZSdzIG5vIGNoYW5jZSBvZiBhIGJldHRlciBzb2x1dGlvblxuICAgICAgICBpZiAoY2VsbC5tYXggLSBiZXN0Q2VsbC5kIDw9IHByZWNpc2lvbikgY29udGludWU7XG5cbiAgICAgICAgLy8gc3BsaXQgdGhlIGNlbGwgaW50byBmb3VyIGNlbGxzXG4gICAgICAgIGggPSBjZWxsLmggLyAyO1xuICAgICAgICBjZWxsUXVldWUucHVzaChuZXcgQ2VsbChjZWxsLnAueCAtIGgsIGNlbGwucC55IC0gaCwgaCwgcG9seWdvblJpbmdzKSk7XG4gICAgICAgIGNlbGxRdWV1ZS5wdXNoKG5ldyBDZWxsKGNlbGwucC54ICsgaCwgY2VsbC5wLnkgLSBoLCBoLCBwb2x5Z29uUmluZ3MpKTtcbiAgICAgICAgY2VsbFF1ZXVlLnB1c2gobmV3IENlbGwoY2VsbC5wLnggLSBoLCBjZWxsLnAueSArIGgsIGgsIHBvbHlnb25SaW5ncykpO1xuICAgICAgICBjZWxsUXVldWUucHVzaChuZXcgQ2VsbChjZWxsLnAueCArIGgsIGNlbGwucC55ICsgaCwgaCwgcG9seWdvblJpbmdzKSk7XG4gICAgICAgIG51bVByb2JlcyArPSA0O1xuICAgIH1cblxuICAgIGlmIChkZWJ1Zykge1xuICAgICAgICBjb25zb2xlLmxvZyhgbnVtIHByb2JlczogJHtudW1Qcm9iZXN9YCk7XG4gICAgICAgIGNvbnNvbGUubG9nKGBiZXN0IGRpc3RhbmNlOiAke2Jlc3RDZWxsLmR9YCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGJlc3RDZWxsLnA7XG59XG5cbmZ1bmN0aW9uIGNvbXBhcmVNYXgoYSwgYikge1xuICAgIHJldHVybiBiLm1heCAtIGEubWF4O1xufVxuXG5mdW5jdGlvbiBDZWxsKHgsIHksIGgsIHBvbHlnb24pIHtcbiAgICB0aGlzLnAgPSBuZXcgUG9pbnQoeCwgeSk7XG4gICAgdGhpcy5oID0gaDsgLy8gaGFsZiB0aGUgY2VsbCBzaXplXG4gICAgdGhpcy5kID0gcG9pbnRUb1BvbHlnb25EaXN0KHRoaXMucCwgcG9seWdvbik7IC8vIGRpc3RhbmNlIGZyb20gY2VsbCBjZW50ZXIgdG8gcG9seWdvblxuICAgIHRoaXMubWF4ID0gdGhpcy5kICsgdGhpcy5oICogTWF0aC5TUVJUMjsgLy8gbWF4IGRpc3RhbmNlIHRvIHBvbHlnb24gd2l0aGluIGEgY2VsbFxufVxuXG4vLyBzaWduZWQgZGlzdGFuY2UgZnJvbSBwb2ludCB0byBwb2x5Z29uIG91dGxpbmUgKG5lZ2F0aXZlIGlmIHBvaW50IGlzIG91dHNpZGUpXG5mdW5jdGlvbiBwb2ludFRvUG9seWdvbkRpc3QocCwgcG9seWdvbikge1xuICAgIGxldCBpbnNpZGUgPSBmYWxzZTtcbiAgICBsZXQgbWluRGlzdFNxID0gSW5maW5pdHk7XG5cbiAgICBmb3IgKGxldCBrID0gMDsgayA8IHBvbHlnb24ubGVuZ3RoOyBrKyspIHtcbiAgICAgICAgY29uc3QgcmluZyA9IHBvbHlnb25ba107XG5cbiAgICAgICAgZm9yIChsZXQgaSA9IDAsIGxlbiA9IHJpbmcubGVuZ3RoLCBqID0gbGVuIC0gMTsgaSA8IGxlbjsgaiA9IGkrKykge1xuICAgICAgICAgICAgY29uc3QgYSA9IHJpbmdbaV07XG4gICAgICAgICAgICBjb25zdCBiID0gcmluZ1tqXTtcblxuICAgICAgICAgICAgaWYgKChhLnkgPiBwLnkgIT09IGIueSA+IHAueSkgJiZcbiAgICAgICAgICAgICAgICAocC54IDwgKGIueCAtIGEueCkgKiAocC55IC0gYS55KSAvIChiLnkgLSBhLnkpICsgYS54KSkgaW5zaWRlID0gIWluc2lkZTtcblxuICAgICAgICAgICAgbWluRGlzdFNxID0gTWF0aC5taW4obWluRGlzdFNxLCBkaXN0VG9TZWdtZW50U3F1YXJlZChwLCBhLCBiKSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gKGluc2lkZSA/IDEgOiAtMSkgKiBNYXRoLnNxcnQobWluRGlzdFNxKTtcbn1cblxuLy8gZ2V0IHBvbHlnb24gY2VudHJvaWRcbmZ1bmN0aW9uIGdldENlbnRyb2lkQ2VsbChwb2x5Z29uKSB7XG4gICAgbGV0IGFyZWEgPSAwO1xuICAgIGxldCB4ID0gMDtcbiAgICBsZXQgeSA9IDA7XG4gICAgY29uc3QgcG9pbnRzID0gcG9seWdvblswXTtcbiAgICBmb3IgKGxldCBpID0gMCwgbGVuID0gcG9pbnRzLmxlbmd0aCwgaiA9IGxlbiAtIDE7IGkgPCBsZW47IGogPSBpKyspIHtcbiAgICAgICAgY29uc3QgYSA9IHBvaW50c1tpXTtcbiAgICAgICAgY29uc3QgYiA9IHBvaW50c1tqXTtcbiAgICAgICAgY29uc3QgZiA9IGEueCAqIGIueSAtIGIueCAqIGEueTtcbiAgICAgICAgeCArPSAoYS54ICsgYi54KSAqIGY7XG4gICAgICAgIHkgKz0gKGEueSArIGIueSkgKiBmO1xuICAgICAgICBhcmVhICs9IGYgKiAzO1xuICAgIH1cbiAgICByZXR1cm4gbmV3IENlbGwoeCAvIGFyZWEsIHkgLyBhcmVhLCAwLCBwb2x5Z29uKTtcbn1cbiIsIi8qKlxuICogSlMgSW1wbGVtZW50YXRpb24gb2YgTXVybXVySGFzaDMgKHIxMzYpIChhcyBvZiBNYXkgMjAsIDIwMTEpXG4gKiBcbiAqIEBhdXRob3IgPGEgaHJlZj1cIm1haWx0bzpnYXJ5LmNvdXJ0QGdtYWlsLmNvbVwiPkdhcnkgQ291cnQ8L2E+XG4gKiBAc2VlIGh0dHA6Ly9naXRodWIuY29tL2dhcnljb3VydC9tdXJtdXJoYXNoLWpzXG4gKiBAYXV0aG9yIDxhIGhyZWY9XCJtYWlsdG86YWFwcGxlYnlAZ21haWwuY29tXCI+QXVzdGluIEFwcGxlYnk8L2E+XG4gKiBAc2VlIGh0dHA6Ly9zaXRlcy5nb29nbGUuY29tL3NpdGUvbXVybXVyaGFzaC9cbiAqIFxuICogQHBhcmFtIHtzdHJpbmd9IGtleSBBU0NJSSBvbmx5XG4gKiBAcGFyYW0ge251bWJlcn0gc2VlZCBQb3NpdGl2ZSBpbnRlZ2VyIG9ubHlcbiAqIEByZXR1cm4ge251bWJlcn0gMzItYml0IHBvc2l0aXZlIGludGVnZXIgaGFzaCBcbiAqL1xuXG5mdW5jdGlvbiBtdXJtdXJoYXNoM18zMl9nYyhrZXksIHNlZWQpIHtcblx0dmFyIHJlbWFpbmRlciwgYnl0ZXMsIGgxLCBoMWIsIGMxLCBjMWIsIGMyLCBjMmIsIGsxLCBpO1xuXHRcblx0cmVtYWluZGVyID0ga2V5Lmxlbmd0aCAmIDM7IC8vIGtleS5sZW5ndGggJSA0XG5cdGJ5dGVzID0ga2V5Lmxlbmd0aCAtIHJlbWFpbmRlcjtcblx0aDEgPSBzZWVkO1xuXHRjMSA9IDB4Y2M5ZTJkNTE7XG5cdGMyID0gMHgxYjg3MzU5Mztcblx0aSA9IDA7XG5cdFxuXHR3aGlsZSAoaSA8IGJ5dGVzKSB7XG5cdCAgXHRrMSA9IFxuXHQgIFx0ICAoKGtleS5jaGFyQ29kZUF0KGkpICYgMHhmZikpIHxcblx0ICBcdCAgKChrZXkuY2hhckNvZGVBdCgrK2kpICYgMHhmZikgPDwgOCkgfFxuXHQgIFx0ICAoKGtleS5jaGFyQ29kZUF0KCsraSkgJiAweGZmKSA8PCAxNikgfFxuXHQgIFx0ICAoKGtleS5jaGFyQ29kZUF0KCsraSkgJiAweGZmKSA8PCAyNCk7XG5cdFx0KytpO1xuXHRcdFxuXHRcdGsxID0gKCgoKGsxICYgMHhmZmZmKSAqIGMxKSArICgoKChrMSA+Pj4gMTYpICogYzEpICYgMHhmZmZmKSA8PCAxNikpKSAmIDB4ZmZmZmZmZmY7XG5cdFx0azEgPSAoazEgPDwgMTUpIHwgKGsxID4+PiAxNyk7XG5cdFx0azEgPSAoKCgoazEgJiAweGZmZmYpICogYzIpICsgKCgoKGsxID4+PiAxNikgKiBjMikgJiAweGZmZmYpIDw8IDE2KSkpICYgMHhmZmZmZmZmZjtcblxuXHRcdGgxIF49IGsxO1xuICAgICAgICBoMSA9IChoMSA8PCAxMykgfCAoaDEgPj4+IDE5KTtcblx0XHRoMWIgPSAoKCgoaDEgJiAweGZmZmYpICogNSkgKyAoKCgoaDEgPj4+IDE2KSAqIDUpICYgMHhmZmZmKSA8PCAxNikpKSAmIDB4ZmZmZmZmZmY7XG5cdFx0aDEgPSAoKChoMWIgJiAweGZmZmYpICsgMHg2YjY0KSArICgoKChoMWIgPj4+IDE2KSArIDB4ZTY1NCkgJiAweGZmZmYpIDw8IDE2KSk7XG5cdH1cblx0XG5cdGsxID0gMDtcblx0XG5cdHN3aXRjaCAocmVtYWluZGVyKSB7XG5cdFx0Y2FzZSAzOiBrMSBePSAoa2V5LmNoYXJDb2RlQXQoaSArIDIpICYgMHhmZikgPDwgMTY7XG5cdFx0Y2FzZSAyOiBrMSBePSAoa2V5LmNoYXJDb2RlQXQoaSArIDEpICYgMHhmZikgPDwgODtcblx0XHRjYXNlIDE6IGsxIF49IChrZXkuY2hhckNvZGVBdChpKSAmIDB4ZmYpO1xuXHRcdFxuXHRcdGsxID0gKCgoazEgJiAweGZmZmYpICogYzEpICsgKCgoKGsxID4+PiAxNikgKiBjMSkgJiAweGZmZmYpIDw8IDE2KSkgJiAweGZmZmZmZmZmO1xuXHRcdGsxID0gKGsxIDw8IDE1KSB8IChrMSA+Pj4gMTcpO1xuXHRcdGsxID0gKCgoazEgJiAweGZmZmYpICogYzIpICsgKCgoKGsxID4+PiAxNikgKiBjMikgJiAweGZmZmYpIDw8IDE2KSkgJiAweGZmZmZmZmZmO1xuXHRcdGgxIF49IGsxO1xuXHR9XG5cdFxuXHRoMSBePSBrZXkubGVuZ3RoO1xuXG5cdGgxIF49IGgxID4+PiAxNjtcblx0aDEgPSAoKChoMSAmIDB4ZmZmZikgKiAweDg1ZWJjYTZiKSArICgoKChoMSA+Pj4gMTYpICogMHg4NWViY2E2YikgJiAweGZmZmYpIDw8IDE2KSkgJiAweGZmZmZmZmZmO1xuXHRoMSBePSBoMSA+Pj4gMTM7XG5cdGgxID0gKCgoKGgxICYgMHhmZmZmKSAqIDB4YzJiMmFlMzUpICsgKCgoKGgxID4+PiAxNikgKiAweGMyYjJhZTM1KSAmIDB4ZmZmZikgPDwgMTYpKSkgJiAweGZmZmZmZmZmO1xuXHRoMSBePSBoMSA+Pj4gMTY7XG5cblx0cmV0dXJuIGgxID4+PiAwO1xufVxuXG5pZih0eXBlb2YgbW9kdWxlICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gIG1vZHVsZS5leHBvcnRzID0gbXVybXVyaGFzaDNfMzJfZ2Ncbn0iLCIvKipcbiAqIEpTIEltcGxlbWVudGF0aW9uIG9mIE11cm11ckhhc2gyXG4gKiBcbiAqIEBhdXRob3IgPGEgaHJlZj1cIm1haWx0bzpnYXJ5LmNvdXJ0QGdtYWlsLmNvbVwiPkdhcnkgQ291cnQ8L2E+XG4gKiBAc2VlIGh0dHA6Ly9naXRodWIuY29tL2dhcnljb3VydC9tdXJtdXJoYXNoLWpzXG4gKiBAYXV0aG9yIDxhIGhyZWY9XCJtYWlsdG86YWFwcGxlYnlAZ21haWwuY29tXCI+QXVzdGluIEFwcGxlYnk8L2E+XG4gKiBAc2VlIGh0dHA6Ly9zaXRlcy5nb29nbGUuY29tL3NpdGUvbXVybXVyaGFzaC9cbiAqIFxuICogQHBhcmFtIHtzdHJpbmd9IHN0ciBBU0NJSSBvbmx5XG4gKiBAcGFyYW0ge251bWJlcn0gc2VlZCBQb3NpdGl2ZSBpbnRlZ2VyIG9ubHlcbiAqIEByZXR1cm4ge251bWJlcn0gMzItYml0IHBvc2l0aXZlIGludGVnZXIgaGFzaFxuICovXG5cbmZ1bmN0aW9uIG11cm11cmhhc2gyXzMyX2djKHN0ciwgc2VlZCkge1xuICB2YXJcbiAgICBsID0gc3RyLmxlbmd0aCxcbiAgICBoID0gc2VlZCBeIGwsXG4gICAgaSA9IDAsXG4gICAgaztcbiAgXG4gIHdoaWxlIChsID49IDQpIHtcbiAgXHRrID0gXG4gIFx0ICAoKHN0ci5jaGFyQ29kZUF0KGkpICYgMHhmZikpIHxcbiAgXHQgICgoc3RyLmNoYXJDb2RlQXQoKytpKSAmIDB4ZmYpIDw8IDgpIHxcbiAgXHQgICgoc3RyLmNoYXJDb2RlQXQoKytpKSAmIDB4ZmYpIDw8IDE2KSB8XG4gIFx0ICAoKHN0ci5jaGFyQ29kZUF0KCsraSkgJiAweGZmKSA8PCAyNCk7XG4gICAgXG4gICAgayA9ICgoKGsgJiAweGZmZmYpICogMHg1YmQxZTk5NSkgKyAoKCgoayA+Pj4gMTYpICogMHg1YmQxZTk5NSkgJiAweGZmZmYpIDw8IDE2KSk7XG4gICAgayBePSBrID4+PiAyNDtcbiAgICBrID0gKCgoayAmIDB4ZmZmZikgKiAweDViZDFlOTk1KSArICgoKChrID4+PiAxNikgKiAweDViZDFlOTk1KSAmIDB4ZmZmZikgPDwgMTYpKTtcblxuXHRoID0gKCgoaCAmIDB4ZmZmZikgKiAweDViZDFlOTk1KSArICgoKChoID4+PiAxNikgKiAweDViZDFlOTk1KSAmIDB4ZmZmZikgPDwgMTYpKSBeIGs7XG5cbiAgICBsIC09IDQ7XG4gICAgKytpO1xuICB9XG4gIFxuICBzd2l0Y2ggKGwpIHtcbiAgY2FzZSAzOiBoIF49IChzdHIuY2hhckNvZGVBdChpICsgMikgJiAweGZmKSA8PCAxNjtcbiAgY2FzZSAyOiBoIF49IChzdHIuY2hhckNvZGVBdChpICsgMSkgJiAweGZmKSA8PCA4O1xuICBjYXNlIDE6IGggXj0gKHN0ci5jaGFyQ29kZUF0KGkpICYgMHhmZik7XG4gICAgICAgICAgaCA9ICgoKGggJiAweGZmZmYpICogMHg1YmQxZTk5NSkgKyAoKCgoaCA+Pj4gMTYpICogMHg1YmQxZTk5NSkgJiAweGZmZmYpIDw8IDE2KSk7XG4gIH1cblxuICBoIF49IGggPj4+IDEzO1xuICBoID0gKCgoaCAmIDB4ZmZmZikgKiAweDViZDFlOTk1KSArICgoKChoID4+PiAxNikgKiAweDViZDFlOTk1KSAmIDB4ZmZmZikgPDwgMTYpKTtcbiAgaCBePSBoID4+PiAxNTtcblxuICByZXR1cm4gaCA+Pj4gMDtcbn1cblxuaWYodHlwZW9mIG1vZHVsZSAhPT0gdW5kZWZpbmVkKSB7XG4gIG1vZHVsZS5leHBvcnRzID0gbXVybXVyaGFzaDJfMzJfZ2Ncbn1cbiIsInZhciBtdXJtdXIzID0gcmVxdWlyZShcIi4vbXVybXVyaGFzaDNfZ2MuanNcIilcbnZhciBtdXJtdXIyID0gcmVxdWlyZShcIi4vbXVybXVyaGFzaDJfZ2MuanNcIilcblxubW9kdWxlLmV4cG9ydHMgPSBtdXJtdXIzXG5tb2R1bGUuZXhwb3J0cy5tdXJtdXIzID0gbXVybXVyM1xubW9kdWxlLmV4cG9ydHMubXVybXVyMiA9IG11cm11cjJcbiIsIi8vIEBmbG93XG5cbmltcG9ydCBBbmNob3IgZnJvbSAnLi9hbmNob3InO1xuXG5pbXBvcnQgeyBnZXRBbmNob3JzLCBnZXRDZW50ZXJBbmNob3IgfSBmcm9tICcuL2dldF9hbmNob3JzJztcbmltcG9ydCBjbGlwTGluZSBmcm9tICcuL2NsaXBfbGluZSc7XG5pbXBvcnQgeyBzaGFwZVRleHQsIHNoYXBlSWNvbiwgV3JpdGluZ01vZGUgfSBmcm9tICcuL3NoYXBpbmcnO1xuaW1wb3J0IHsgZ2V0R2x5cGhRdWFkcywgZ2V0SWNvblF1YWRzIH0gZnJvbSAnLi9xdWFkcyc7XG5pbXBvcnQgQ29sbGlzaW9uRmVhdHVyZSBmcm9tICcuL2NvbGxpc2lvbl9mZWF0dXJlJztcbmltcG9ydCB7IHdhcm5PbmNlIH0gZnJvbSAnLi4vdXRpbC91dGlsJztcbmltcG9ydCB7XG4gICAgYWxsb3dzVmVydGljYWxXcml0aW5nTW9kZSxcbiAgICBhbGxvd3NMZXR0ZXJTcGFjaW5nXG59IGZyb20gJy4uL3V0aWwvc2NyaXB0X2RldGVjdGlvbic7XG5pbXBvcnQgZmluZFBvbGVPZkluYWNjZXNzaWJpbGl0eSBmcm9tICcuLi91dGlsL2ZpbmRfcG9sZV9vZl9pbmFjY2Vzc2liaWxpdHknO1xuaW1wb3J0IGNsYXNzaWZ5UmluZ3MgZnJvbSAnLi4vdXRpbC9jbGFzc2lmeV9yaW5ncyc7XG5pbXBvcnQgRVhURU5UIGZyb20gJy4uL2RhdGEvZXh0ZW50JztcbmltcG9ydCBTeW1ib2xCdWNrZXQgZnJvbSAnLi4vZGF0YS9idWNrZXQvc3ltYm9sX2J1Y2tldCc7XG5pbXBvcnQgRXZhbHVhdGlvblBhcmFtZXRlcnMgZnJvbSAnLi4vc3R5bGUvZXZhbHVhdGlvbl9wYXJhbWV0ZXJzJztcbmltcG9ydCB7U0laRV9QQUNLX0ZBQ1RPUn0gZnJvbSAnLi9zeW1ib2xfc2l6ZSc7XG5cbmltcG9ydCB0eXBlIHtTaGFwaW5nLCBQb3NpdGlvbmVkSWNvbn0gZnJvbSAnLi9zaGFwaW5nJztcbmltcG9ydCB0eXBlIHtDb2xsaXNpb25Cb3hBcnJheX0gZnJvbSAnLi4vZGF0YS9hcnJheV90eXBlcyc7XG5pbXBvcnQgdHlwZSB7U3ltYm9sRmVhdHVyZX0gZnJvbSAnLi4vZGF0YS9idWNrZXQvc3ltYm9sX2J1Y2tldCc7XG5pbXBvcnQgdHlwZSB7U3R5bGVJbWFnZX0gZnJvbSAnLi4vc3R5bGUvc3R5bGVfaW1hZ2UnO1xuaW1wb3J0IHR5cGUge1N0eWxlR2x5cGh9IGZyb20gJy4uL3N0eWxlL3N0eWxlX2dseXBoJztcbmltcG9ydCB0eXBlIFN5bWJvbFN0eWxlTGF5ZXIgZnJvbSAnLi4vc3R5bGUvc3R5bGVfbGF5ZXIvc3ltYm9sX3N0eWxlX2xheWVyJztcbmltcG9ydCB0eXBlIHtJbWFnZVBvc2l0aW9ufSBmcm9tICcuLi9yZW5kZXIvaW1hZ2VfYXRsYXMnO1xuaW1wb3J0IHR5cGUge0dseXBoUG9zaXRpb259IGZyb20gJy4uL3JlbmRlci9nbHlwaF9hdGxhcyc7XG5pbXBvcnQgdHlwZSB7UG9zc2libHlFdmFsdWF0ZWRQcm9wZXJ0eVZhbHVlfSBmcm9tICcuLi9zdHlsZS9wcm9wZXJ0aWVzJztcblxuaW1wb3J0IFBvaW50IGZyb20gJ0BtYXBib3gvcG9pbnQtZ2VvbWV0cnknO1xuaW1wb3J0IG11cm11cjMgZnJvbSAnbXVybXVyaGFzaC1qcyc7XG5cbi8vIFRoZSBzeW1ib2wgbGF5b3V0IHByb2Nlc3MgbmVlZHMgYHRleHQtc2l6ZWAgZXZhbHVhdGVkIGF0IHVwIHRvIGZpdmUgZGlmZmVyZW50IHpvb20gbGV2ZWxzLCBhbmRcbi8vIGBpY29uLXNpemVgIGF0IHVwIHRvIHRocmVlOlxuLy9cbi8vICAgMS4gYHRleHQtc2l6ZWAgYXQgdGhlIHpvb20gbGV2ZWwgb2YgdGhlIGJ1Y2tldC4gVXNlZCB0byBjYWxjdWxhdGUgYSBwZXItZmVhdHVyZSBzaXplIGZvciBzb3VyY2UgYHRleHQtc2l6ZWBcbi8vICAgICAgIGV4cHJlc3Npb25zLCBhbmQgdG8gY2FsY3VsYXRlIHRoZSBib3ggZGltZW5zaW9ucyBmb3IgaWNvbi10ZXh0LWZpdC5cbi8vICAgMi4gYGljb24tc2l6ZWAgYXQgdGhlIHpvb20gbGV2ZWwgb2YgdGhlIGJ1Y2tldC4gVXNlZCB0byBjYWxjdWxhdGUgYSBwZXItZmVhdHVyZSBzaXplIGZvciBzb3VyY2UgYGljb24tc2l6ZWBcbi8vICAgICAgIGV4cHJlc3Npb25zLlxuLy8gICAzLiBgdGV4dC1zaXplYCBhbmQgYGljb24tc2l6ZWAgYXQgdGhlIHpvb20gbGV2ZWwgb2YgdGhlIGJ1Y2tldCwgcGx1cyBvbmUuIFVzZWQgdG8gY2FsY3VsYXRlIGNvbGxpc2lvbiBib3hlcy5cbi8vICAgNC4gYHRleHQtc2l6ZWAgYXQgem9vbSBsZXZlbCAxOC4gVXNlZCBmb3Igc29tZXRoaW5nIGxpbmUtc3ltYm9sLXBsYWNlbWVudC1yZWxhdGVkLlxuLy8gICA1LiAgRm9yIGNvbXBvc2l0ZSBgKi1zaXplYCBleHByZXNzaW9uczogdHdvIHpvb20gbGV2ZWxzIG9mIGN1cnZlIHN0b3BzIHRoYXQgXCJjb3ZlclwiIHRoZSB6b29tIGxldmVsIG9mIHRoZVxuLy8gICAgICAgYnVja2V0LiBUaGVzZSBnbyBpbnRvIGEgdmVydGV4IGJ1ZmZlciBhbmQgYXJlIHVzZWQgYnkgdGhlIHNoYWRlciB0byBpbnRlcnBvbGF0ZSB0aGUgc2l6ZSBhdCByZW5kZXIgdGltZS5cbi8vXG4vLyAoMSkgYW5kICgyKSBhcmUgc3RvcmVkIGluIGBidWNrZXQubGF5ZXJzWzBdLmxheW91dGAuIFRoZSByZW1haW5kZXIgYXJlIGJlbG93LlxuLy9cbnR5cGUgU2l6ZXMgPSB7XG4gICAgbGF5b3V0VGV4dFNpemU6IFBvc3NpYmx5RXZhbHVhdGVkUHJvcGVydHlWYWx1ZTxudW1iZXI+LCAvLyAoMylcbiAgICBsYXlvdXRJY29uU2l6ZTogUG9zc2libHlFdmFsdWF0ZWRQcm9wZXJ0eVZhbHVlPG51bWJlcj4sIC8vICgzKVxuICAgIHRleHRNYXhTaXplOiBQb3NzaWJseUV2YWx1YXRlZFByb3BlcnR5VmFsdWU8bnVtYmVyPiwgICAgLy8gKDQpXG4gICAgY29tcG9zaXRlVGV4dFNpemVzOiBbUG9zc2libHlFdmFsdWF0ZWRQcm9wZXJ0eVZhbHVlPG51bWJlcj4sIFBvc3NpYmx5RXZhbHVhdGVkUHJvcGVydHlWYWx1ZTxudW1iZXI+XSwgLy8gKDUpXG4gICAgY29tcG9zaXRlSWNvblNpemVzOiBbUG9zc2libHlFdmFsdWF0ZWRQcm9wZXJ0eVZhbHVlPG51bWJlcj4sIFBvc3NpYmx5RXZhbHVhdGVkUHJvcGVydHlWYWx1ZTxudW1iZXI+XSwgLy8gKDUpXG59O1xuXG5leHBvcnQgZnVuY3Rpb24gcGVyZm9ybVN5bWJvbExheW91dChidWNrZXQ6IFN5bWJvbEJ1Y2tldCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2x5cGhNYXA6IHtbc3RyaW5nXToge1tudW1iZXJdOiA/U3R5bGVHbHlwaH19LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBnbHlwaFBvc2l0aW9uczoge1tzdHJpbmddOiB7W251bWJlcl06IEdseXBoUG9zaXRpb259fSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaW1hZ2VNYXA6IHtbc3RyaW5nXTogU3R5bGVJbWFnZX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIGltYWdlUG9zaXRpb25zOiB7W3N0cmluZ106IEltYWdlUG9zaXRpb259LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzaG93Q29sbGlzaW9uQm94ZXM6IGJvb2xlYW4pIHtcbiAgICBidWNrZXQuY3JlYXRlQXJyYXlzKCk7XG5cbiAgICBjb25zdCB0aWxlU2l6ZSA9IDUxMiAqIGJ1Y2tldC5vdmVyc2NhbGluZztcbiAgICBidWNrZXQudGlsZVBpeGVsUmF0aW8gPSBFWFRFTlQgLyB0aWxlU2l6ZTtcbiAgICBidWNrZXQuY29tcGFyZVRleHQgPSB7fTtcbiAgICBidWNrZXQuaWNvbnNOZWVkTGluZWFyID0gZmFsc2U7XG5cbiAgICBjb25zdCBsYXlvdXQgPSBidWNrZXQubGF5ZXJzWzBdLmxheW91dDtcbiAgICBjb25zdCB1bmV2YWx1YXRlZExheW91dFZhbHVlcyA9IGJ1Y2tldC5sYXllcnNbMF0uX3VuZXZhbHVhdGVkTGF5b3V0Ll92YWx1ZXM7XG5cbiAgICBjb25zdCBzaXplcyA9IHt9O1xuXG4gICAgaWYgKGJ1Y2tldC50ZXh0U2l6ZURhdGEuZnVuY3Rpb25UeXBlID09PSAnY29tcG9zaXRlJykge1xuICAgICAgICBjb25zdCB7bWluLCBtYXh9ID0gYnVja2V0LnRleHRTaXplRGF0YS56b29tUmFuZ2U7XG4gICAgICAgIHNpemVzLmNvbXBvc2l0ZVRleHRTaXplcyA9IFtcbiAgICAgICAgICAgIHVuZXZhbHVhdGVkTGF5b3V0VmFsdWVzWyd0ZXh0LXNpemUnXS5wb3NzaWJseUV2YWx1YXRlKG5ldyBFdmFsdWF0aW9uUGFyYW1ldGVycyhtaW4pKSxcbiAgICAgICAgICAgIHVuZXZhbHVhdGVkTGF5b3V0VmFsdWVzWyd0ZXh0LXNpemUnXS5wb3NzaWJseUV2YWx1YXRlKG5ldyBFdmFsdWF0aW9uUGFyYW1ldGVycyhtYXgpKVxuICAgICAgICBdO1xuICAgIH1cblxuICAgIGlmIChidWNrZXQuaWNvblNpemVEYXRhLmZ1bmN0aW9uVHlwZSA9PT0gJ2NvbXBvc2l0ZScpIHtcbiAgICAgICAgY29uc3Qge21pbiwgbWF4fSA9IGJ1Y2tldC5pY29uU2l6ZURhdGEuem9vbVJhbmdlO1xuICAgICAgICBzaXplcy5jb21wb3NpdGVJY29uU2l6ZXMgPSBbXG4gICAgICAgICAgICB1bmV2YWx1YXRlZExheW91dFZhbHVlc1snaWNvbi1zaXplJ10ucG9zc2libHlFdmFsdWF0ZShuZXcgRXZhbHVhdGlvblBhcmFtZXRlcnMobWluKSksXG4gICAgICAgICAgICB1bmV2YWx1YXRlZExheW91dFZhbHVlc1snaWNvbi1zaXplJ10ucG9zc2libHlFdmFsdWF0ZShuZXcgRXZhbHVhdGlvblBhcmFtZXRlcnMobWF4KSlcbiAgICAgICAgXTtcbiAgICB9XG5cbiAgICBzaXplcy5sYXlvdXRUZXh0U2l6ZSA9IHVuZXZhbHVhdGVkTGF5b3V0VmFsdWVzWyd0ZXh0LXNpemUnXS5wb3NzaWJseUV2YWx1YXRlKG5ldyBFdmFsdWF0aW9uUGFyYW1ldGVycyhidWNrZXQuem9vbSArIDEpKTtcbiAgICBzaXplcy5sYXlvdXRJY29uU2l6ZSA9IHVuZXZhbHVhdGVkTGF5b3V0VmFsdWVzWydpY29uLXNpemUnXS5wb3NzaWJseUV2YWx1YXRlKG5ldyBFdmFsdWF0aW9uUGFyYW1ldGVycyhidWNrZXQuem9vbSArIDEpKTtcbiAgICBzaXplcy50ZXh0TWF4U2l6ZSA9IHVuZXZhbHVhdGVkTGF5b3V0VmFsdWVzWyd0ZXh0LXNpemUnXS5wb3NzaWJseUV2YWx1YXRlKG5ldyBFdmFsdWF0aW9uUGFyYW1ldGVycygxOCkpO1xuXG4gICAgY29uc3Qgb25lRW0gPSAyNDtcbiAgICBjb25zdCBsaW5lSGVpZ2h0ID0gbGF5b3V0LmdldCgndGV4dC1saW5lLWhlaWdodCcpICogb25lRW07XG4gICAgY29uc3QgdGV4dEFsb25nTGluZSA9IGxheW91dC5nZXQoJ3RleHQtcm90YXRpb24tYWxpZ25tZW50JykgPT09ICdtYXAnICYmIGxheW91dC5nZXQoJ3N5bWJvbC1wbGFjZW1lbnQnKSAhPT0gJ3BvaW50JztcbiAgICBjb25zdCBrZWVwVXByaWdodCA9IGxheW91dC5nZXQoJ3RleHQta2VlcC11cHJpZ2h0Jyk7XG5cblxuICAgIGZvciAoY29uc3QgZmVhdHVyZSBvZiBidWNrZXQuZmVhdHVyZXMpIHtcbiAgICAgICAgY29uc3QgZm9udHN0YWNrID0gbGF5b3V0LmdldCgndGV4dC1mb250JykuZXZhbHVhdGUoZmVhdHVyZSwge30pLmpvaW4oJywnKTtcbiAgICAgICAgY29uc3QgZ2x5cGhQb3NpdGlvbk1hcCA9IGdseXBoUG9zaXRpb25zO1xuXG4gICAgICAgIGNvbnN0IHNoYXBlZFRleHRPcmllbnRhdGlvbnMgPSB7fTtcbiAgICAgICAgY29uc3QgdGV4dCA9IGZlYXR1cmUudGV4dDtcbiAgICAgICAgaWYgKHRleHQpIHtcbiAgICAgICAgICAgIGNvbnN0IHVuZm9ybWF0dGVkVGV4dCA9IHRleHQudG9TdHJpbmcoKTtcbiAgICAgICAgICAgIGNvbnN0IHRleHRPZmZzZXQ6IFtudW1iZXIsIG51bWJlcl0gPSAobGF5b3V0LmdldCgndGV4dC1vZmZzZXQnKS5ldmFsdWF0ZShmZWF0dXJlLCB7fSkubWFwKCh0KT0+IHQgKiBvbmVFbSk6IGFueSk7XG4gICAgICAgICAgICBjb25zdCBzcGFjaW5nID0gbGF5b3V0LmdldCgndGV4dC1sZXR0ZXItc3BhY2luZycpLmV2YWx1YXRlKGZlYXR1cmUsIHt9KSAqIG9uZUVtO1xuICAgICAgICAgICAgY29uc3Qgc3BhY2luZ0lmQWxsb3dlZCA9IGFsbG93c0xldHRlclNwYWNpbmcodW5mb3JtYXR0ZWRUZXh0KSA/IHNwYWNpbmcgOiAwO1xuICAgICAgICAgICAgY29uc3QgdGV4dEFuY2hvciA9IGxheW91dC5nZXQoJ3RleHQtYW5jaG9yJykuZXZhbHVhdGUoZmVhdHVyZSwge30pO1xuICAgICAgICAgICAgY29uc3QgdGV4dEp1c3RpZnkgPSBsYXlvdXQuZ2V0KCd0ZXh0LWp1c3RpZnknKS5ldmFsdWF0ZShmZWF0dXJlLCB7fSk7XG4gICAgICAgICAgICBjb25zdCBtYXhXaWR0aCA9IGxheW91dC5nZXQoJ3N5bWJvbC1wbGFjZW1lbnQnKSA9PT0gJ3BvaW50JyA/XG4gICAgICAgICAgICAgICAgbGF5b3V0LmdldCgndGV4dC1tYXgtd2lkdGgnKS5ldmFsdWF0ZShmZWF0dXJlLCB7fSkgKiBvbmVFbSA6XG4gICAgICAgICAgICAgICAgMDtcblxuICAgICAgICAgICAgc2hhcGVkVGV4dE9yaWVudGF0aW9ucy5ob3Jpem9udGFsID0gc2hhcGVUZXh0KHRleHQsIGdseXBoTWFwLCBmb250c3RhY2ssIG1heFdpZHRoLCBsaW5lSGVpZ2h0LCB0ZXh0QW5jaG9yLCB0ZXh0SnVzdGlmeSwgc3BhY2luZ0lmQWxsb3dlZCwgdGV4dE9mZnNldCwgb25lRW0sIFdyaXRpbmdNb2RlLmhvcml6b250YWwpO1xuICAgICAgICAgICAgaWYgKGFsbG93c1ZlcnRpY2FsV3JpdGluZ01vZGUodW5mb3JtYXR0ZWRUZXh0KSAmJiB0ZXh0QWxvbmdMaW5lICYmIGtlZXBVcHJpZ2h0KSB7XG4gICAgICAgICAgICAgICAgc2hhcGVkVGV4dE9yaWVudGF0aW9ucy52ZXJ0aWNhbCA9IHNoYXBlVGV4dCh0ZXh0LCBnbHlwaE1hcCwgZm9udHN0YWNrLCBtYXhXaWR0aCwgbGluZUhlaWdodCwgdGV4dEFuY2hvciwgdGV4dEp1c3RpZnksIHNwYWNpbmdJZkFsbG93ZWQsIHRleHRPZmZzZXQsIG9uZUVtLCBXcml0aW5nTW9kZS52ZXJ0aWNhbCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgc2hhcGVkSWNvbjtcbiAgICAgICAgaWYgKGZlYXR1cmUuaWNvbikge1xuICAgICAgICAgICAgY29uc3QgaW1hZ2UgPSBpbWFnZU1hcFtmZWF0dXJlLmljb25dO1xuICAgICAgICAgICAgaWYgKGltYWdlKSB7XG4gICAgICAgICAgICAgICAgc2hhcGVkSWNvbiA9IHNoYXBlSWNvbihcbiAgICAgICAgICAgICAgICAgICAgaW1hZ2VQb3NpdGlvbnNbZmVhdHVyZS5pY29uXSxcbiAgICAgICAgICAgICAgICAgICAgbGF5b3V0LmdldCgnaWNvbi1vZmZzZXQnKS5ldmFsdWF0ZShmZWF0dXJlLCB7fSksXG4gICAgICAgICAgICAgICAgICAgIGxheW91dC5nZXQoJ2ljb24tYW5jaG9yJykuZXZhbHVhdGUoZmVhdHVyZSwge30pKTtcbiAgICAgICAgICAgICAgICBpZiAoYnVja2V0LnNkZkljb25zID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgYnVja2V0LnNkZkljb25zID0gaW1hZ2Uuc2RmO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoYnVja2V0LnNkZkljb25zICE9PSBpbWFnZS5zZGYpIHtcbiAgICAgICAgICAgICAgICAgICAgd2Fybk9uY2UoJ1N0eWxlIHNoZWV0IHdhcm5pbmc6IENhbm5vdCBtaXggU0RGIGFuZCBub24tU0RGIGljb25zIGluIG9uZSBidWZmZXInKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGltYWdlLnBpeGVsUmF0aW8gIT09IGJ1Y2tldC5waXhlbFJhdGlvKSB7XG4gICAgICAgICAgICAgICAgICAgIGJ1Y2tldC5pY29uc05lZWRMaW5lYXIgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAobGF5b3V0LmdldCgnaWNvbi1yb3RhdGUnKS5jb25zdGFudE9yKDEpICE9PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGJ1Y2tldC5pY29uc05lZWRMaW5lYXIgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChzaGFwZWRUZXh0T3JpZW50YXRpb25zLmhvcml6b250YWwgfHwgc2hhcGVkSWNvbikge1xuICAgICAgICAgICAgYWRkRmVhdHVyZShidWNrZXQsIGZlYXR1cmUsIHNoYXBlZFRleHRPcmllbnRhdGlvbnMsIHNoYXBlZEljb24sIGdseXBoUG9zaXRpb25NYXAsIHNpemVzKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGlmIChzaG93Q29sbGlzaW9uQm94ZXMpIHtcbiAgICAgICAgYnVja2V0LmdlbmVyYXRlQ29sbGlzaW9uRGVidWdCdWZmZXJzKCk7XG4gICAgfVxufVxuXG5cbi8qKlxuICogR2l2ZW4gYSBmZWF0dXJlIGFuZCBpdHMgc2hhcGVkIHRleHQgYW5kIGljb24gZGF0YSwgYWRkIGEgJ3N5bWJvbFxuICogaW5zdGFuY2UnIGZvciBlYWNoIF9wb3NzaWJsZV8gcGxhY2VtZW50IG9mIHRoZSBzeW1ib2wgZmVhdHVyZS5cbiAqIChBdCByZW5kZXIgdGltZVBsYWNlU3ltYm9scyNwbGFjZSgpIHNlbGVjdHMgd2hpY2ggb2YgdGhlc2UgaW5zdGFuY2VzIHRvXG4gKiBzaG93IG9yIGhpZGUgYmFzZWQgb24gY29sbGlzaW9ucyB3aXRoIHN5bWJvbHMgaW4gb3RoZXIgbGF5ZXJzLilcbiAqIEBwcml2YXRlXG4gKi9cbmZ1bmN0aW9uIGFkZEZlYXR1cmUoYnVja2V0OiBTeW1ib2xCdWNrZXQsXG4gICAgICAgICAgICAgICAgICAgIGZlYXR1cmU6IFN5bWJvbEZlYXR1cmUsXG4gICAgICAgICAgICAgICAgICAgIHNoYXBlZFRleHRPcmllbnRhdGlvbnM6IGFueSxcbiAgICAgICAgICAgICAgICAgICAgc2hhcGVkSWNvbjogUG9zaXRpb25lZEljb24gfCB2b2lkLFxuICAgICAgICAgICAgICAgICAgICBnbHlwaFBvc2l0aW9uTWFwOiB7W3N0cmluZ106IHtbbnVtYmVyXTogR2x5cGhQb3NpdGlvbn19LFxuICAgICAgICAgICAgICAgICAgICBzaXplczogU2l6ZXMpIHtcbiAgICBjb25zdCBsYXlvdXRUZXh0U2l6ZSA9IHNpemVzLmxheW91dFRleHRTaXplLmV2YWx1YXRlKGZlYXR1cmUsIHt9KTtcbiAgICBjb25zdCBsYXlvdXRJY29uU2l6ZSA9IHNpemVzLmxheW91dEljb25TaXplLmV2YWx1YXRlKGZlYXR1cmUsIHt9KTtcblxuICAgIC8vIFRvIHJlZHVjZSB0aGUgbnVtYmVyIG9mIGxhYmVscyB0aGF0IGp1bXAgYXJvdW5kIHdoZW4gem9vbWluZyB3ZSBuZWVkXG4gICAgLy8gdG8gdXNlIGEgdGV4dC1zaXplIHZhbHVlIHRoYXQgaXMgdGhlIHNhbWUgZm9yIGFsbCB6b29tIGxldmVscy5cbiAgICAvLyBidWNrZXQgY2FsY3VsYXRlcyB0ZXh0LXNpemUgYXQgYSBoaWdoIHpvb20gbGV2ZWwgc28gdGhhdCBhbGwgdGlsZXMgY2FuXG4gICAgLy8gdXNlIHRoZSBzYW1lIHZhbHVlIHdoZW4gY2FsY3VsYXRpbmcgYW5jaG9yIHBvc2l0aW9ucy5cbiAgICBsZXQgdGV4dE1heFNpemUgPSBzaXplcy50ZXh0TWF4U2l6ZS5ldmFsdWF0ZShmZWF0dXJlLCB7fSk7XG4gICAgaWYgKHRleHRNYXhTaXplID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGV4dE1heFNpemUgPSBsYXlvdXRUZXh0U2l6ZTtcbiAgICB9XG5cbiAgICBjb25zdCBsYXlvdXQgPSBidWNrZXQubGF5ZXJzWzBdLmxheW91dDtcbiAgICBjb25zdCB0ZXh0T2Zmc2V0ID0gbGF5b3V0LmdldCgndGV4dC1vZmZzZXQnKS5ldmFsdWF0ZShmZWF0dXJlLCB7fSk7XG4gICAgY29uc3QgaWNvbk9mZnNldCA9IGxheW91dC5nZXQoJ2ljb24tb2Zmc2V0JykuZXZhbHVhdGUoZmVhdHVyZSwge30pO1xuXG4gICAgY29uc3QgZ2x5cGhTaXplID0gMjQsXG4gICAgICAgIGZvbnRTY2FsZSA9IGxheW91dFRleHRTaXplIC8gZ2x5cGhTaXplLFxuICAgICAgICB0ZXh0Qm94U2NhbGUgPSBidWNrZXQudGlsZVBpeGVsUmF0aW8gKiBmb250U2NhbGUsXG4gICAgICAgIHRleHRNYXhCb3hTY2FsZSA9IGJ1Y2tldC50aWxlUGl4ZWxSYXRpbyAqIHRleHRNYXhTaXplIC8gZ2x5cGhTaXplLFxuICAgICAgICBpY29uQm94U2NhbGUgPSBidWNrZXQudGlsZVBpeGVsUmF0aW8gKiBsYXlvdXRJY29uU2l6ZSxcbiAgICAgICAgc3ltYm9sTWluRGlzdGFuY2UgPSBidWNrZXQudGlsZVBpeGVsUmF0aW8gKiBsYXlvdXQuZ2V0KCdzeW1ib2wtc3BhY2luZycpLFxuICAgICAgICB0ZXh0UGFkZGluZyA9IGxheW91dC5nZXQoJ3RleHQtcGFkZGluZycpICogYnVja2V0LnRpbGVQaXhlbFJhdGlvLFxuICAgICAgICBpY29uUGFkZGluZyA9IGxheW91dC5nZXQoJ2ljb24tcGFkZGluZycpICogYnVja2V0LnRpbGVQaXhlbFJhdGlvLFxuICAgICAgICB0ZXh0TWF4QW5nbGUgPSBsYXlvdXQuZ2V0KCd0ZXh0LW1heC1hbmdsZScpIC8gMTgwICogTWF0aC5QSSxcbiAgICAgICAgdGV4dEFsb25nTGluZSA9IGxheW91dC5nZXQoJ3RleHQtcm90YXRpb24tYWxpZ25tZW50JykgPT09ICdtYXAnICYmIGxheW91dC5nZXQoJ3N5bWJvbC1wbGFjZW1lbnQnKSAhPT0gJ3BvaW50JyxcbiAgICAgICAgaWNvbkFsb25nTGluZSA9IGxheW91dC5nZXQoJ2ljb24tcm90YXRpb24tYWxpZ25tZW50JykgPT09ICdtYXAnICYmIGxheW91dC5nZXQoJ3N5bWJvbC1wbGFjZW1lbnQnKSAhPT0gJ3BvaW50JyxcbiAgICAgICAgc3ltYm9sUGxhY2VtZW50ID0gbGF5b3V0LmdldCgnc3ltYm9sLXBsYWNlbWVudCcpLFxuICAgICAgICB0ZXh0UmVwZWF0RGlzdGFuY2UgPSBzeW1ib2xNaW5EaXN0YW5jZSAvIDI7XG5cbiAgICBjb25zdCBhZGRTeW1ib2xBdEFuY2hvciA9IChsaW5lLCBhbmNob3IpID0+IHtcbiAgICAgICAgaWYgKGFuY2hvci54IDwgMCB8fCBhbmNob3IueCA+PSBFWFRFTlQgfHwgYW5jaG9yLnkgPCAwIHx8IGFuY2hvci55ID49IEVYVEVOVCkge1xuICAgICAgICAgICAgLy8gU3ltYm9sIGxheWVycyBhcmUgZHJhd24gYWNyb3NzIHRpbGUgYm91bmRhcmllcywgV2UgZmlsdGVyIG91dCBzeW1ib2xzXG4gICAgICAgICAgICAvLyBvdXRzaWRlIG91ciB0aWxlIGJvdW5kYXJpZXMgKHdoaWNoIG1heSBiZSBpbmNsdWRlZCBpbiB2ZWN0b3IgdGlsZSBidWZmZXJzKVxuICAgICAgICAgICAgLy8gdG8gcHJldmVudCBkb3VibGUtZHJhd2luZyBzeW1ib2xzLlxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgYWRkU3ltYm9sKGJ1Y2tldCwgYW5jaG9yLCBsaW5lLCBzaGFwZWRUZXh0T3JpZW50YXRpb25zLCBzaGFwZWRJY29uLCBidWNrZXQubGF5ZXJzWzBdLFxuICAgICAgICAgICAgYnVja2V0LmNvbGxpc2lvbkJveEFycmF5LCBmZWF0dXJlLmluZGV4LCBmZWF0dXJlLnNvdXJjZUxheWVySW5kZXgsIGJ1Y2tldC5pbmRleCxcbiAgICAgICAgICAgIHRleHRCb3hTY2FsZSwgdGV4dFBhZGRpbmcsIHRleHRBbG9uZ0xpbmUsIHRleHRPZmZzZXQsXG4gICAgICAgICAgICBpY29uQm94U2NhbGUsIGljb25QYWRkaW5nLCBpY29uQWxvbmdMaW5lLCBpY29uT2Zmc2V0LFxuICAgICAgICAgICAgZmVhdHVyZSwgZ2x5cGhQb3NpdGlvbk1hcCwgc2l6ZXMpO1xuICAgIH07XG5cbiAgICBpZiAoc3ltYm9sUGxhY2VtZW50ID09PSAnbGluZScpIHtcbiAgICAgICAgZm9yIChjb25zdCBsaW5lIG9mIGNsaXBMaW5lKGZlYXR1cmUuZ2VvbWV0cnksIDAsIDAsIEVYVEVOVCwgRVhURU5UKSkge1xuICAgICAgICAgICAgY29uc3QgYW5jaG9ycyA9IGdldEFuY2hvcnMoXG4gICAgICAgICAgICAgICAgbGluZSxcbiAgICAgICAgICAgICAgICBzeW1ib2xNaW5EaXN0YW5jZSxcbiAgICAgICAgICAgICAgICB0ZXh0TWF4QW5nbGUsXG4gICAgICAgICAgICAgICAgc2hhcGVkVGV4dE9yaWVudGF0aW9ucy52ZXJ0aWNhbCB8fCBzaGFwZWRUZXh0T3JpZW50YXRpb25zLmhvcml6b250YWwsXG4gICAgICAgICAgICAgICAgc2hhcGVkSWNvbixcbiAgICAgICAgICAgICAgICBnbHlwaFNpemUsXG4gICAgICAgICAgICAgICAgdGV4dE1heEJveFNjYWxlLFxuICAgICAgICAgICAgICAgIGJ1Y2tldC5vdmVyc2NhbGluZyxcbiAgICAgICAgICAgICAgICBFWFRFTlRcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGFuY2hvciBvZiBhbmNob3JzKSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgc2hhcGVkVGV4dCA9IHNoYXBlZFRleHRPcmllbnRhdGlvbnMuaG9yaXpvbnRhbDtcbiAgICAgICAgICAgICAgICBpZiAoIXNoYXBlZFRleHQgfHwgIWFuY2hvcklzVG9vQ2xvc2UoYnVja2V0LCBzaGFwZWRUZXh0LnRleHQsIHRleHRSZXBlYXREaXN0YW5jZSwgYW5jaG9yKSkge1xuICAgICAgICAgICAgICAgICAgICBhZGRTeW1ib2xBdEFuY2hvcihsaW5lLCBhbmNob3IpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0gZWxzZSBpZiAoc3ltYm9sUGxhY2VtZW50ID09PSAnbGluZS1jZW50ZXInKSB7XG4gICAgICAgIC8vIE5vIGNsaXBwaW5nLCBtdWx0aXBsZSBsaW5lcyBwZXIgZmVhdHVyZSBhcmUgYWxsb3dlZFxuICAgICAgICAvLyBcImxpbmVzXCIgd2l0aCBvbmx5IG9uZSBwb2ludCBhcmUgaWdub3JlZCBhcyBpbiBjbGlwTGluZXNcbiAgICAgICAgZm9yIChjb25zdCBsaW5lIG9mIGZlYXR1cmUuZ2VvbWV0cnkpIHtcbiAgICAgICAgICAgIGlmIChsaW5lLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBhbmNob3IgPSBnZXRDZW50ZXJBbmNob3IoXG4gICAgICAgICAgICAgICAgICAgIGxpbmUsXG4gICAgICAgICAgICAgICAgICAgIHRleHRNYXhBbmdsZSxcbiAgICAgICAgICAgICAgICAgICAgc2hhcGVkVGV4dE9yaWVudGF0aW9ucy52ZXJ0aWNhbCB8fCBzaGFwZWRUZXh0T3JpZW50YXRpb25zLmhvcml6b250YWwsXG4gICAgICAgICAgICAgICAgICAgIHNoYXBlZEljb24sXG4gICAgICAgICAgICAgICAgICAgIGdseXBoU2l6ZSxcbiAgICAgICAgICAgICAgICAgICAgdGV4dE1heEJveFNjYWxlKTtcbiAgICAgICAgICAgICAgICBpZiAoYW5jaG9yKSB7XG4gICAgICAgICAgICAgICAgICAgIGFkZFN5bWJvbEF0QW5jaG9yKGxpbmUsIGFuY2hvcik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSBlbHNlIGlmIChmZWF0dXJlLnR5cGUgPT09ICdQb2x5Z29uJykge1xuICAgICAgICBmb3IgKGNvbnN0IHBvbHlnb24gb2YgY2xhc3NpZnlSaW5ncyhmZWF0dXJlLmdlb21ldHJ5LCAwKSkge1xuICAgICAgICAgICAgLy8gMTYgaGVyZSByZXByZXNlbnRzIDIgcGl4ZWxzXG4gICAgICAgICAgICBjb25zdCBwb2kgPSBmaW5kUG9sZU9mSW5hY2Nlc3NpYmlsaXR5KHBvbHlnb24sIDE2KTtcbiAgICAgICAgICAgIGFkZFN5bWJvbEF0QW5jaG9yKHBvbHlnb25bMF0sIG5ldyBBbmNob3IocG9pLngsIHBvaS55LCAwKSk7XG4gICAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGZlYXR1cmUudHlwZSA9PT0gJ0xpbmVTdHJpbmcnKSB7XG4gICAgICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9tYXBib3gvbWFwYm94LWdsLWpzL2lzc3Vlcy8zODA4XG4gICAgICAgIGZvciAoY29uc3QgbGluZSBvZiBmZWF0dXJlLmdlb21ldHJ5KSB7XG4gICAgICAgICAgICBhZGRTeW1ib2xBdEFuY2hvcihsaW5lLCBuZXcgQW5jaG9yKGxpbmVbMF0ueCwgbGluZVswXS55LCAwKSk7XG4gICAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGZlYXR1cmUudHlwZSA9PT0gJ1BvaW50Jykge1xuICAgICAgICBmb3IgKGNvbnN0IHBvaW50cyBvZiBmZWF0dXJlLmdlb21ldHJ5KSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IHBvaW50IG9mIHBvaW50cykge1xuICAgICAgICAgICAgICAgIGFkZFN5bWJvbEF0QW5jaG9yKFtwb2ludF0sIG5ldyBBbmNob3IocG9pbnQueCwgcG9pbnQueSwgMCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufVxuXG5jb25zdCBNQVhfUEFDS0VEX1NJWkUgPSA2NTUzNTtcblxuZnVuY3Rpb24gYWRkVGV4dFZlcnRpY2VzKGJ1Y2tldDogU3ltYm9sQnVja2V0LFxuICAgICAgICAgICAgICAgICAgICAgICAgIGFuY2hvcjogUG9pbnQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgc2hhcGVkVGV4dDogU2hhcGluZyxcbiAgICAgICAgICAgICAgICAgICAgICAgICBsYXllcjogU3ltYm9sU3R5bGVMYXllcixcbiAgICAgICAgICAgICAgICAgICAgICAgICB0ZXh0QWxvbmdMaW5lOiBib29sZWFuLFxuICAgICAgICAgICAgICAgICAgICAgICAgIGZlYXR1cmU6IFN5bWJvbEZlYXR1cmUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgdGV4dE9mZnNldDogW251bWJlciwgbnVtYmVyXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICBsaW5lQXJyYXk6IHtsaW5lU3RhcnRJbmRleDogbnVtYmVyLCBsaW5lTGVuZ3RoOiBudW1iZXJ9LFxuICAgICAgICAgICAgICAgICAgICAgICAgIHdyaXRpbmdNb2RlOiBudW1iZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgcGxhY2VkVGV4dFN5bWJvbEluZGljZXM6IEFycmF5PG51bWJlcj4sXG4gICAgICAgICAgICAgICAgICAgICAgICAgZ2x5cGhQb3NpdGlvbk1hcDoge1tzdHJpbmddOiB7W251bWJlcl06IEdseXBoUG9zaXRpb259fSxcbiAgICAgICAgICAgICAgICAgICAgICAgICBzaXplczogU2l6ZXMpIHtcbiAgICBjb25zdCBnbHlwaFF1YWRzID0gZ2V0R2x5cGhRdWFkcyhhbmNob3IsIHNoYXBlZFRleHQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGF5ZXIsIHRleHRBbG9uZ0xpbmUsIGZlYXR1cmUsIGdseXBoUG9zaXRpb25NYXApO1xuXG4gICAgY29uc3Qgc2l6ZURhdGEgPSBidWNrZXQudGV4dFNpemVEYXRhO1xuICAgIGxldCB0ZXh0U2l6ZURhdGEgPSBudWxsO1xuXG4gICAgaWYgKHNpemVEYXRhLmZ1bmN0aW9uVHlwZSA9PT0gJ3NvdXJjZScpIHtcbiAgICAgICAgdGV4dFNpemVEYXRhID0gW1xuICAgICAgICAgICAgU0laRV9QQUNLX0ZBQ1RPUiAqIGxheWVyLmxheW91dC5nZXQoJ3RleHQtc2l6ZScpLmV2YWx1YXRlKGZlYXR1cmUsIHt9KVxuICAgICAgICBdO1xuICAgICAgICBpZiAodGV4dFNpemVEYXRhWzBdID4gTUFYX1BBQ0tFRF9TSVpFKSB7XG4gICAgICAgICAgICB3YXJuT25jZShgJHtidWNrZXQubGF5ZXJJZHNbMF19OiBWYWx1ZSBmb3IgXCJ0ZXh0LXNpemVcIiBpcyA+PSAyNTYuIFJlZHVjZSB5b3VyIFwidGV4dC1zaXplXCIuYCk7XG4gICAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHNpemVEYXRhLmZ1bmN0aW9uVHlwZSA9PT0gJ2NvbXBvc2l0ZScpIHtcbiAgICAgICAgdGV4dFNpemVEYXRhID0gW1xuICAgICAgICAgICAgU0laRV9QQUNLX0ZBQ1RPUiAqIHNpemVzLmNvbXBvc2l0ZVRleHRTaXplc1swXS5ldmFsdWF0ZShmZWF0dXJlLCB7fSksXG4gICAgICAgICAgICBTSVpFX1BBQ0tfRkFDVE9SICogc2l6ZXMuY29tcG9zaXRlVGV4dFNpemVzWzFdLmV2YWx1YXRlKGZlYXR1cmUsIHt9KVxuICAgICAgICBdO1xuICAgICAgICBpZiAodGV4dFNpemVEYXRhWzBdID4gTUFYX1BBQ0tFRF9TSVpFIHx8IHRleHRTaXplRGF0YVsxXSA+IE1BWF9QQUNLRURfU0laRSkge1xuICAgICAgICAgICAgd2Fybk9uY2UoYCR7YnVja2V0LmxheWVySWRzWzBdfTogVmFsdWUgZm9yIFwidGV4dC1zaXplXCIgaXMgPj0gMjU2LiBSZWR1Y2UgeW91ciBcInRleHQtc2l6ZVwiLmApO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgYnVja2V0LmFkZFN5bWJvbHMoXG4gICAgICAgIGJ1Y2tldC50ZXh0LFxuICAgICAgICBnbHlwaFF1YWRzLFxuICAgICAgICB0ZXh0U2l6ZURhdGEsXG4gICAgICAgIHRleHRPZmZzZXQsXG4gICAgICAgIHRleHRBbG9uZ0xpbmUsXG4gICAgICAgIGZlYXR1cmUsXG4gICAgICAgIHdyaXRpbmdNb2RlLFxuICAgICAgICBhbmNob3IsXG4gICAgICAgIGxpbmVBcnJheS5saW5lU3RhcnRJbmRleCxcbiAgICAgICAgbGluZUFycmF5LmxpbmVMZW5ndGgpO1xuXG4gICAgLy8gVGhlIHBsYWNlZFN5bWJvbEFycmF5IGlzIHVzZWQgYXQgcmVuZGVyIHRpbWUgaW4gZHJhd1RpbGVTeW1ib2xzXG4gICAgLy8gVGhlc2UgaW5kaWNlcyBhbGxvdyBhY2Nlc3MgdG8gdGhlIGFycmF5IGF0IGNvbGxpc2lvbiBkZXRlY3Rpb24gdGltZVxuICAgIHBsYWNlZFRleHRTeW1ib2xJbmRpY2VzLnB1c2goYnVja2V0LnRleHQucGxhY2VkU3ltYm9sQXJyYXkubGVuZ3RoIC0gMSk7XG5cbiAgICByZXR1cm4gZ2x5cGhRdWFkcy5sZW5ndGggKiA0O1xufVxuXG5cbi8qKlxuICogQWRkIGEgc2luZ2xlIGxhYmVsICYgaWNvbiBwbGFjZW1lbnQuXG4gKlxuICogQHByaXZhdGVcbiAqL1xuZnVuY3Rpb24gYWRkU3ltYm9sKGJ1Y2tldDogU3ltYm9sQnVja2V0LFxuICAgICAgICAgICAgICAgICAgIGFuY2hvcjogQW5jaG9yLFxuICAgICAgICAgICAgICAgICAgIGxpbmU6IEFycmF5PFBvaW50PixcbiAgICAgICAgICAgICAgICAgICBzaGFwZWRUZXh0T3JpZW50YXRpb25zOiBhbnksXG4gICAgICAgICAgICAgICAgICAgc2hhcGVkSWNvbjogUG9zaXRpb25lZEljb24gfCB2b2lkLFxuICAgICAgICAgICAgICAgICAgIGxheWVyOiBTeW1ib2xTdHlsZUxheWVyLFxuICAgICAgICAgICAgICAgICAgIGNvbGxpc2lvbkJveEFycmF5OiBDb2xsaXNpb25Cb3hBcnJheSxcbiAgICAgICAgICAgICAgICAgICBmZWF0dXJlSW5kZXg6IG51bWJlcixcbiAgICAgICAgICAgICAgICAgICBzb3VyY2VMYXllckluZGV4OiBudW1iZXIsXG4gICAgICAgICAgICAgICAgICAgYnVja2V0SW5kZXg6IG51bWJlcixcbiAgICAgICAgICAgICAgICAgICB0ZXh0Qm94U2NhbGU6IG51bWJlcixcbiAgICAgICAgICAgICAgICAgICB0ZXh0UGFkZGluZzogbnVtYmVyLFxuICAgICAgICAgICAgICAgICAgIHRleHRBbG9uZ0xpbmU6IGJvb2xlYW4sXG4gICAgICAgICAgICAgICAgICAgdGV4dE9mZnNldDogW251bWJlciwgbnVtYmVyXSxcbiAgICAgICAgICAgICAgICAgICBpY29uQm94U2NhbGU6IG51bWJlcixcbiAgICAgICAgICAgICAgICAgICBpY29uUGFkZGluZzogbnVtYmVyLFxuICAgICAgICAgICAgICAgICAgIGljb25BbG9uZ0xpbmU6IGJvb2xlYW4sXG4gICAgICAgICAgICAgICAgICAgaWNvbk9mZnNldDogW251bWJlciwgbnVtYmVyXSxcbiAgICAgICAgICAgICAgICAgICBmZWF0dXJlOiBTeW1ib2xGZWF0dXJlLFxuICAgICAgICAgICAgICAgICAgIGdseXBoUG9zaXRpb25NYXA6IHtbc3RyaW5nXToge1tudW1iZXJdOiBHbHlwaFBvc2l0aW9ufX0sXG4gICAgICAgICAgICAgICAgICAgc2l6ZXM6IFNpemVzKSB7XG4gICAgY29uc3QgbGluZUFycmF5ID0gYnVja2V0LmFkZFRvTGluZVZlcnRleEFycmF5KGFuY2hvciwgbGluZSk7XG5cbiAgICBsZXQgdGV4dENvbGxpc2lvbkZlYXR1cmUsIGljb25Db2xsaXNpb25GZWF0dXJlO1xuXG4gICAgbGV0IG51bUljb25WZXJ0aWNlcyA9IDA7XG4gICAgbGV0IG51bUdseXBoVmVydGljZXMgPSAwO1xuICAgIGxldCBudW1WZXJ0aWNhbEdseXBoVmVydGljZXMgPSAwO1xuICAgIGNvbnN0IGtleSA9IG11cm11cjMoc2hhcGVkVGV4dE9yaWVudGF0aW9ucy5ob3Jpem9udGFsID8gc2hhcGVkVGV4dE9yaWVudGF0aW9ucy5ob3Jpem9udGFsLnRleHQgOiAnJyk7XG4gICAgY29uc3QgcGxhY2VkVGV4dFN5bWJvbEluZGljZXMgPSBbXTtcbiAgICBpZiAoc2hhcGVkVGV4dE9yaWVudGF0aW9ucy5ob3Jpem9udGFsKSB7XG4gICAgICAgIC8vIEFzIGEgY29sbGlzaW9uIGFwcHJveGltYXRpb24sIHdlIGNhbiB1c2UgZWl0aGVyIHRoZSB2ZXJ0aWNhbCBvciB0aGUgaG9yaXpvbnRhbCB2ZXJzaW9uIG9mIHRoZSBmZWF0dXJlXG4gICAgICAgIC8vIFdlJ3JlIGNvdW50aW5nIG9uIHRoZSB0d28gdmVyc2lvbnMgaGF2aW5nIHNpbWlsYXIgZGltZW5zaW9uc1xuICAgICAgICBjb25zdCB0ZXh0Um90YXRlID0gbGF5ZXIubGF5b3V0LmdldCgndGV4dC1yb3RhdGUnKS5ldmFsdWF0ZShmZWF0dXJlLCB7fSk7XG4gICAgICAgIHRleHRDb2xsaXNpb25GZWF0dXJlID0gbmV3IENvbGxpc2lvbkZlYXR1cmUoY29sbGlzaW9uQm94QXJyYXksIGxpbmUsIGFuY2hvciwgZmVhdHVyZUluZGV4LCBzb3VyY2VMYXllckluZGV4LCBidWNrZXRJbmRleCwgc2hhcGVkVGV4dE9yaWVudGF0aW9ucy5ob3Jpem9udGFsLCB0ZXh0Qm94U2NhbGUsIHRleHRQYWRkaW5nLCB0ZXh0QWxvbmdMaW5lLCBidWNrZXQub3ZlcnNjYWxpbmcsIHRleHRSb3RhdGUpO1xuICAgICAgICBudW1HbHlwaFZlcnRpY2VzICs9IGFkZFRleHRWZXJ0aWNlcyhidWNrZXQsIGFuY2hvciwgc2hhcGVkVGV4dE9yaWVudGF0aW9ucy5ob3Jpem9udGFsLCBsYXllciwgdGV4dEFsb25nTGluZSwgZmVhdHVyZSwgdGV4dE9mZnNldCwgbGluZUFycmF5LCBzaGFwZWRUZXh0T3JpZW50YXRpb25zLnZlcnRpY2FsID8gV3JpdGluZ01vZGUuaG9yaXpvbnRhbCA6IFdyaXRpbmdNb2RlLmhvcml6b250YWxPbmx5LCBwbGFjZWRUZXh0U3ltYm9sSW5kaWNlcywgZ2x5cGhQb3NpdGlvbk1hcCwgc2l6ZXMpO1xuXG4gICAgICAgIGlmIChzaGFwZWRUZXh0T3JpZW50YXRpb25zLnZlcnRpY2FsKSB7XG4gICAgICAgICAgICBudW1WZXJ0aWNhbEdseXBoVmVydGljZXMgKz0gYWRkVGV4dFZlcnRpY2VzKGJ1Y2tldCwgYW5jaG9yLCBzaGFwZWRUZXh0T3JpZW50YXRpb25zLnZlcnRpY2FsLCBsYXllciwgdGV4dEFsb25nTGluZSwgZmVhdHVyZSwgdGV4dE9mZnNldCwgbGluZUFycmF5LCBXcml0aW5nTW9kZS52ZXJ0aWNhbCwgcGxhY2VkVGV4dFN5bWJvbEluZGljZXMsIGdseXBoUG9zaXRpb25NYXAsIHNpemVzKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IHRleHRCb3hTdGFydEluZGV4ID0gdGV4dENvbGxpc2lvbkZlYXR1cmUgPyB0ZXh0Q29sbGlzaW9uRmVhdHVyZS5ib3hTdGFydEluZGV4IDogYnVja2V0LmNvbGxpc2lvbkJveEFycmF5Lmxlbmd0aDtcbiAgICBjb25zdCB0ZXh0Qm94RW5kSW5kZXggPSB0ZXh0Q29sbGlzaW9uRmVhdHVyZSA/IHRleHRDb2xsaXNpb25GZWF0dXJlLmJveEVuZEluZGV4IDogYnVja2V0LmNvbGxpc2lvbkJveEFycmF5Lmxlbmd0aDtcblxuICAgIGlmIChzaGFwZWRJY29uKSB7XG4gICAgICAgIGNvbnN0IGljb25RdWFkcyA9IGdldEljb25RdWFkcyhhbmNob3IsIHNoYXBlZEljb24sIGxheWVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGljb25BbG9uZ0xpbmUsIHNoYXBlZFRleHRPcmllbnRhdGlvbnMuaG9yaXpvbnRhbCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmZWF0dXJlKTtcbiAgICAgICAgY29uc3QgaWNvblJvdGF0ZSA9IGxheWVyLmxheW91dC5nZXQoJ2ljb24tcm90YXRlJykuZXZhbHVhdGUoZmVhdHVyZSwge30pO1xuICAgICAgICBpY29uQ29sbGlzaW9uRmVhdHVyZSA9IG5ldyBDb2xsaXNpb25GZWF0dXJlKGNvbGxpc2lvbkJveEFycmF5LCBsaW5lLCBhbmNob3IsIGZlYXR1cmVJbmRleCwgc291cmNlTGF5ZXJJbmRleCwgYnVja2V0SW5kZXgsIHNoYXBlZEljb24sIGljb25Cb3hTY2FsZSwgaWNvblBhZGRpbmcsIC8qYWxpZ24gYm94ZXMgdG8gbGluZSovZmFsc2UsIGJ1Y2tldC5vdmVyc2NhbGluZywgaWNvblJvdGF0ZSk7XG5cbiAgICAgICAgbnVtSWNvblZlcnRpY2VzID0gaWNvblF1YWRzLmxlbmd0aCAqIDQ7XG5cbiAgICAgICAgY29uc3Qgc2l6ZURhdGEgPSBidWNrZXQuaWNvblNpemVEYXRhO1xuICAgICAgICBsZXQgaWNvblNpemVEYXRhID0gbnVsbDtcblxuICAgICAgICBpZiAoc2l6ZURhdGEuZnVuY3Rpb25UeXBlID09PSAnc291cmNlJykge1xuICAgICAgICAgICAgaWNvblNpemVEYXRhID0gW1xuICAgICAgICAgICAgICAgIFNJWkVfUEFDS19GQUNUT1IgKiBsYXllci5sYXlvdXQuZ2V0KCdpY29uLXNpemUnKS5ldmFsdWF0ZShmZWF0dXJlLCB7fSlcbiAgICAgICAgICAgIF07XG4gICAgICAgICAgICBpZiAoaWNvblNpemVEYXRhWzBdID4gTUFYX1BBQ0tFRF9TSVpFKSB7XG4gICAgICAgICAgICAgICAgd2Fybk9uY2UoYCR7YnVja2V0LmxheWVySWRzWzBdfTogVmFsdWUgZm9yIFwiaWNvbi1zaXplXCIgaXMgPj0gMjU2LiBSZWR1Y2UgeW91ciBcImljb24tc2l6ZVwiLmApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKHNpemVEYXRhLmZ1bmN0aW9uVHlwZSA9PT0gJ2NvbXBvc2l0ZScpIHtcbiAgICAgICAgICAgIGljb25TaXplRGF0YSA9IFtcbiAgICAgICAgICAgICAgICBTSVpFX1BBQ0tfRkFDVE9SICogc2l6ZXMuY29tcG9zaXRlSWNvblNpemVzWzBdLmV2YWx1YXRlKGZlYXR1cmUsIHt9KSxcbiAgICAgICAgICAgICAgICBTSVpFX1BBQ0tfRkFDVE9SICogc2l6ZXMuY29tcG9zaXRlSWNvblNpemVzWzFdLmV2YWx1YXRlKGZlYXR1cmUsIHt9KVxuICAgICAgICAgICAgXTtcbiAgICAgICAgICAgIGlmIChpY29uU2l6ZURhdGFbMF0gPiBNQVhfUEFDS0VEX1NJWkUgfHwgaWNvblNpemVEYXRhWzFdID4gTUFYX1BBQ0tFRF9TSVpFKSB7XG4gICAgICAgICAgICAgICAgd2Fybk9uY2UoYCR7YnVja2V0LmxheWVySWRzWzBdfTogVmFsdWUgZm9yIFwiaWNvbi1zaXplXCIgaXMgPj0gMjU2LiBSZWR1Y2UgeW91ciBcImljb24tc2l6ZVwiLmApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgYnVja2V0LmFkZFN5bWJvbHMoXG4gICAgICAgICAgICBidWNrZXQuaWNvbixcbiAgICAgICAgICAgIGljb25RdWFkcyxcbiAgICAgICAgICAgIGljb25TaXplRGF0YSxcbiAgICAgICAgICAgIGljb25PZmZzZXQsXG4gICAgICAgICAgICBpY29uQWxvbmdMaW5lLFxuICAgICAgICAgICAgZmVhdHVyZSxcbiAgICAgICAgICAgIGZhbHNlLFxuICAgICAgICAgICAgYW5jaG9yLFxuICAgICAgICAgICAgbGluZUFycmF5LmxpbmVTdGFydEluZGV4LFxuICAgICAgICAgICAgbGluZUFycmF5LmxpbmVMZW5ndGgpO1xuICAgIH1cblxuICAgIGNvbnN0IGljb25Cb3hTdGFydEluZGV4ID0gaWNvbkNvbGxpc2lvbkZlYXR1cmUgPyBpY29uQ29sbGlzaW9uRmVhdHVyZS5ib3hTdGFydEluZGV4IDogYnVja2V0LmNvbGxpc2lvbkJveEFycmF5Lmxlbmd0aDtcbiAgICBjb25zdCBpY29uQm94RW5kSW5kZXggPSBpY29uQ29sbGlzaW9uRmVhdHVyZSA/IGljb25Db2xsaXNpb25GZWF0dXJlLmJveEVuZEluZGV4IDogYnVja2V0LmNvbGxpc2lvbkJveEFycmF5Lmxlbmd0aDtcblxuICAgIGlmIChidWNrZXQuZ2x5cGhPZmZzZXRBcnJheS5sZW5ndGggPj0gU3ltYm9sQnVja2V0Lk1BWF9HTFlQSFMpIHdhcm5PbmNlKFxuICAgICAgICBcIlRvbyBtYW55IGdseXBocyBiZWluZyByZW5kZXJlZCBpbiBhIHRpbGUuIFNlZSBodHRwczovL2dpdGh1Yi5jb20vbWFwYm94L21hcGJveC1nbC1qcy9pc3N1ZXMvMjkwN1wiXG4gICAgKTtcblxuICAgIGJ1Y2tldC5zeW1ib2xJbnN0YW5jZXMuZW1wbGFjZUJhY2soXG4gICAgICAgIGFuY2hvci54LFxuICAgICAgICBhbmNob3IueSxcbiAgICAgICAgcGxhY2VkVGV4dFN5bWJvbEluZGljZXMubGVuZ3RoID4gMCA/IHBsYWNlZFRleHRTeW1ib2xJbmRpY2VzWzBdIDogLTEsXG4gICAgICAgIHBsYWNlZFRleHRTeW1ib2xJbmRpY2VzLmxlbmd0aCA+IDEgPyBwbGFjZWRUZXh0U3ltYm9sSW5kaWNlc1sxXSA6IC0xLFxuICAgICAgICBrZXksXG4gICAgICAgIHRleHRCb3hTdGFydEluZGV4LFxuICAgICAgICB0ZXh0Qm94RW5kSW5kZXgsXG4gICAgICAgIGljb25Cb3hTdGFydEluZGV4LFxuICAgICAgICBpY29uQm94RW5kSW5kZXgsXG4gICAgICAgIGZlYXR1cmVJbmRleCxcbiAgICAgICAgbnVtR2x5cGhWZXJ0aWNlcyxcbiAgICAgICAgbnVtVmVydGljYWxHbHlwaFZlcnRpY2VzLFxuICAgICAgICBudW1JY29uVmVydGljZXMsXG4gICAgICAgIDApO1xufVxuXG5mdW5jdGlvbiBhbmNob3JJc1Rvb0Nsb3NlKGJ1Y2tldDogYW55LCB0ZXh0OiBzdHJpbmcsIHJlcGVhdERpc3RhbmNlOiBudW1iZXIsIGFuY2hvcjogUG9pbnQpIHtcbiAgICBjb25zdCBjb21wYXJlVGV4dCA9IGJ1Y2tldC5jb21wYXJlVGV4dDtcbiAgICBpZiAoISh0ZXh0IGluIGNvbXBhcmVUZXh0KSkge1xuICAgICAgICBjb21wYXJlVGV4dFt0ZXh0XSA9IFtdO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IG90aGVyQW5jaG9ycyA9IGNvbXBhcmVUZXh0W3RleHRdO1xuICAgICAgICBmb3IgKGxldCBrID0gb3RoZXJBbmNob3JzLmxlbmd0aCAtIDE7IGsgPj0gMDsgay0tKSB7XG4gICAgICAgICAgICBpZiAoYW5jaG9yLmRpc3Qob3RoZXJBbmNob3JzW2tdKSA8IHJlcGVhdERpc3RhbmNlKSB7XG4gICAgICAgICAgICAgICAgLy8gSWYgaXQncyB3aXRoaW4gcmVwZWF0RGlzdGFuY2Ugb2Ygb25lIGFuY2hvciwgc3RvcCBsb29raW5nXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgLy8gSWYgYW5jaG9yIGlzIG5vdCB3aXRoaW4gcmVwZWF0RGlzdGFuY2Ugb2YgYW55IG90aGVyIGFuY2hvciwgYWRkIHRvIGFycmF5XG4gICAgY29tcGFyZVRleHRbdGV4dF0ucHVzaChhbmNob3IpO1xuICAgIHJldHVybiBmYWxzZTtcbn1cbiIsIi8vIEBmbG93XG5cbmltcG9ydCB7IEFscGhhSW1hZ2UgfSBmcm9tICcuLi91dGlsL2ltYWdlJztcbmltcG9ydCB7IHJlZ2lzdGVyIH0gZnJvbSAnLi4vdXRpbC93ZWJfd29ya2VyX3RyYW5zZmVyJztcbmltcG9ydCBwb3RwYWNrIGZyb20gJ3BvdHBhY2snO1xuXG5pbXBvcnQgdHlwZSB7R2x5cGhNZXRyaWNzLCBTdHlsZUdseXBofSBmcm9tICcuLi9zdHlsZS9zdHlsZV9nbHlwaCc7XG5cbmNvbnN0IHBhZGRpbmcgPSAxO1xuXG50eXBlIFJlY3QgPSB7XG4gICAgeDogbnVtYmVyLFxuICAgIHk6IG51bWJlcixcbiAgICB3OiBudW1iZXIsXG4gICAgaDogbnVtYmVyXG59O1xuXG5leHBvcnQgdHlwZSBHbHlwaFBvc2l0aW9uID0ge1xuICAgIHJlY3Q6IFJlY3QsXG4gICAgbWV0cmljczogR2x5cGhNZXRyaWNzXG59O1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBHbHlwaEF0bGFzIHtcbiAgICBpbWFnZTogQWxwaGFJbWFnZTtcbiAgICBwb3NpdGlvbnM6IHsgW3N0cmluZ106IHsgW251bWJlcl06IEdseXBoUG9zaXRpb24gfSB9O1xuXG4gICAgY29uc3RydWN0b3Ioc3RhY2tzOiB7IFtzdHJpbmddOiB7IFtudW1iZXJdOiA/U3R5bGVHbHlwaCB9IH0pIHtcbiAgICAgICAgY29uc3QgcG9zaXRpb25zID0ge307XG4gICAgICAgIGNvbnN0IGJpbnMgPSBbXTtcblxuICAgICAgICBmb3IgKGNvbnN0IHN0YWNrIGluIHN0YWNrcykge1xuICAgICAgICAgICAgY29uc3QgZ2x5cGhzID0gc3RhY2tzW3N0YWNrXTtcbiAgICAgICAgICAgIGNvbnN0IHN0YWNrUG9zaXRpb25zID0gcG9zaXRpb25zW3N0YWNrXSA9IHt9O1xuXG4gICAgICAgICAgICBmb3IgKGNvbnN0IGlkIGluIGdseXBocykge1xuICAgICAgICAgICAgICAgIGNvbnN0IHNyYyA9IGdseXBoc1sraWRdO1xuICAgICAgICAgICAgICAgIGlmICghc3JjIHx8IHNyYy5iaXRtYXAud2lkdGggPT09IDAgfHwgc3JjLmJpdG1hcC5oZWlnaHQgPT09IDApIGNvbnRpbnVlO1xuXG4gICAgICAgICAgICAgICAgY29uc3QgYmluID0ge1xuICAgICAgICAgICAgICAgICAgICB4OiAwLFxuICAgICAgICAgICAgICAgICAgICB5OiAwLFxuICAgICAgICAgICAgICAgICAgICB3OiBzcmMuYml0bWFwLndpZHRoICsgMiAqIHBhZGRpbmcsXG4gICAgICAgICAgICAgICAgICAgIGg6IHNyYy5iaXRtYXAuaGVpZ2h0ICsgMiAqIHBhZGRpbmdcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIGJpbnMucHVzaChiaW4pO1xuICAgICAgICAgICAgICAgIHN0YWNrUG9zaXRpb25zW2lkXSA9IHtyZWN0OiBiaW4sIG1ldHJpY3M6IHNyYy5tZXRyaWNzfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHt3LCBofSA9IHBvdHBhY2soYmlucyk7XG4gICAgICAgIGNvbnN0IGltYWdlID0gbmV3IEFscGhhSW1hZ2Uoe3dpZHRoOiB3IHx8IDEsIGhlaWdodDogaCB8fCAxfSk7XG5cbiAgICAgICAgZm9yIChjb25zdCBzdGFjayBpbiBzdGFja3MpIHtcbiAgICAgICAgICAgIGNvbnN0IGdseXBocyA9IHN0YWNrc1tzdGFja107XG5cbiAgICAgICAgICAgIGZvciAoY29uc3QgaWQgaW4gZ2x5cGhzKSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgc3JjID0gZ2x5cGhzWytpZF07XG4gICAgICAgICAgICAgICAgaWYgKCFzcmMgfHwgc3JjLmJpdG1hcC53aWR0aCA9PT0gMCB8fCBzcmMuYml0bWFwLmhlaWdodCA9PT0gMCkgY29udGludWU7XG4gICAgICAgICAgICAgICAgY29uc3QgYmluID0gcG9zaXRpb25zW3N0YWNrXVtpZF0ucmVjdDtcbiAgICAgICAgICAgICAgICBBbHBoYUltYWdlLmNvcHkoc3JjLmJpdG1hcCwgaW1hZ2UsIHt4OiAwLCB5OiAwfSwge3g6IGJpbi54ICsgcGFkZGluZywgeTogYmluLnkgKyBwYWRkaW5nfSwgc3JjLmJpdG1hcCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmltYWdlID0gaW1hZ2U7XG4gICAgICAgIHRoaXMucG9zaXRpb25zID0gcG9zaXRpb25zO1xuICAgIH1cbn1cblxucmVnaXN0ZXIoJ0dseXBoQXRsYXMnLCBHbHlwaEF0bGFzKTtcbiIsIi8vIEBmbG93XG5cbmltcG9ydCBGZWF0dXJlSW5kZXggZnJvbSAnLi4vZGF0YS9mZWF0dXJlX2luZGV4JztcblxuaW1wb3J0IHsgcGVyZm9ybVN5bWJvbExheW91dCB9IGZyb20gJy4uL3N5bWJvbC9zeW1ib2xfbGF5b3V0JztcbmltcG9ydCB7IENvbGxpc2lvbkJveEFycmF5IH0gZnJvbSAnLi4vZGF0YS9hcnJheV90eXBlcyc7XG5pbXBvcnQgRGljdGlvbmFyeUNvZGVyIGZyb20gJy4uL3V0aWwvZGljdGlvbmFyeV9jb2Rlcic7XG5pbXBvcnQgU3ltYm9sQnVja2V0IGZyb20gJy4uL2RhdGEvYnVja2V0L3N5bWJvbF9idWNrZXQnO1xuaW1wb3J0IExpbmVCdWNrZXQgZnJvbSAnLi4vZGF0YS9idWNrZXQvbGluZV9idWNrZXQnO1xuaW1wb3J0IEZpbGxCdWNrZXQgZnJvbSAnLi4vZGF0YS9idWNrZXQvZmlsbF9idWNrZXQnO1xuaW1wb3J0IEZpbGxFeHRydXNpb25CdWNrZXQgZnJvbSAnLi4vZGF0YS9idWNrZXQvZmlsbF9leHRydXNpb25fYnVja2V0JztcbmltcG9ydCB7IHdhcm5PbmNlLCBtYXBPYmplY3QsIHZhbHVlcyB9IGZyb20gJy4uL3V0aWwvdXRpbCc7XG5pbXBvcnQgYXNzZXJ0IGZyb20gJ2Fzc2VydCc7XG5pbXBvcnQgSW1hZ2VBdGxhcyBmcm9tICcuLi9yZW5kZXIvaW1hZ2VfYXRsYXMnO1xuaW1wb3J0IEdseXBoQXRsYXMgZnJvbSAnLi4vcmVuZGVyL2dseXBoX2F0bGFzJztcbmltcG9ydCBFdmFsdWF0aW9uUGFyYW1ldGVycyBmcm9tICcuLi9zdHlsZS9ldmFsdWF0aW9uX3BhcmFtZXRlcnMnO1xuaW1wb3J0IHsgT3ZlcnNjYWxlZFRpbGVJRCB9IGZyb20gJy4vdGlsZV9pZCc7XG5cbmltcG9ydCB0eXBlIHtCdWNrZXR9IGZyb20gJy4uL2RhdGEvYnVja2V0JztcbmltcG9ydCB0eXBlIEFjdG9yIGZyb20gJy4uL3V0aWwvYWN0b3InO1xuaW1wb3J0IHR5cGUgU3R5bGVMYXllciBmcm9tICcuLi9zdHlsZS9zdHlsZV9sYXllcic7XG5pbXBvcnQgdHlwZSBTdHlsZUxheWVySW5kZXggZnJvbSAnLi4vc3R5bGUvc3R5bGVfbGF5ZXJfaW5kZXgnO1xuaW1wb3J0IHR5cGUge1N0eWxlSW1hZ2V9IGZyb20gJy4uL3N0eWxlL3N0eWxlX2ltYWdlJztcbmltcG9ydCB0eXBlIHtTdHlsZUdseXBofSBmcm9tICcuLi9zdHlsZS9zdHlsZV9nbHlwaCc7XG5pbXBvcnQgdHlwZSB7XG4gICAgV29ya2VyVGlsZVBhcmFtZXRlcnMsXG4gICAgV29ya2VyVGlsZUNhbGxiYWNrLFxufSBmcm9tICcuLi9zb3VyY2Uvd29ya2VyX3NvdXJjZSc7XG5cbmNsYXNzIFdvcmtlclRpbGUge1xuICAgIHRpbGVJRDogT3ZlcnNjYWxlZFRpbGVJRDtcbiAgICB1aWQ6IHN0cmluZztcbiAgICB6b29tOiBudW1iZXI7XG4gICAgcGl4ZWxSYXRpbzogbnVtYmVyO1xuICAgIHRpbGVTaXplOiBudW1iZXI7XG4gICAgc291cmNlOiBzdHJpbmc7XG4gICAgb3ZlcnNjYWxpbmc6IG51bWJlcjtcbiAgICBzaG93Q29sbGlzaW9uQm94ZXM6IGJvb2xlYW47XG4gICAgY29sbGVjdFJlc291cmNlVGltaW5nOiBib29sZWFuO1xuXG4gICAgc3RhdHVzOiAncGFyc2luZycgfCAnZG9uZSc7XG4gICAgZGF0YTogVmVjdG9yVGlsZTtcbiAgICBjb2xsaXNpb25Cb3hBcnJheTogQ29sbGlzaW9uQm94QXJyYXk7XG5cbiAgICBhYm9ydDogPygpID0+IHZvaWQ7XG4gICAgcmVsb2FkQ2FsbGJhY2s6IFdvcmtlclRpbGVDYWxsYmFjaztcbiAgICB2ZWN0b3JUaWxlOiBWZWN0b3JUaWxlO1xuXG4gICAgY29uc3RydWN0b3IocGFyYW1zOiBXb3JrZXJUaWxlUGFyYW1ldGVycykge1xuICAgICAgICB0aGlzLnRpbGVJRCA9IG5ldyBPdmVyc2NhbGVkVGlsZUlEKHBhcmFtcy50aWxlSUQub3ZlcnNjYWxlZFosIHBhcmFtcy50aWxlSUQud3JhcCwgcGFyYW1zLnRpbGVJRC5jYW5vbmljYWwueiwgcGFyYW1zLnRpbGVJRC5jYW5vbmljYWwueCwgcGFyYW1zLnRpbGVJRC5jYW5vbmljYWwueSk7XG4gICAgICAgIHRoaXMudWlkID0gcGFyYW1zLnVpZDtcbiAgICAgICAgdGhpcy56b29tID0gcGFyYW1zLnpvb207XG4gICAgICAgIHRoaXMucGl4ZWxSYXRpbyA9IHBhcmFtcy5waXhlbFJhdGlvO1xuICAgICAgICB0aGlzLnRpbGVTaXplID0gcGFyYW1zLnRpbGVTaXplO1xuICAgICAgICB0aGlzLnNvdXJjZSA9IHBhcmFtcy5zb3VyY2U7XG4gICAgICAgIHRoaXMub3ZlcnNjYWxpbmcgPSB0aGlzLnRpbGVJRC5vdmVyc2NhbGVGYWN0b3IoKTtcbiAgICAgICAgdGhpcy5zaG93Q29sbGlzaW9uQm94ZXMgPSBwYXJhbXMuc2hvd0NvbGxpc2lvbkJveGVzO1xuICAgICAgICB0aGlzLmNvbGxlY3RSZXNvdXJjZVRpbWluZyA9ICEhcGFyYW1zLmNvbGxlY3RSZXNvdXJjZVRpbWluZztcbiAgICB9XG5cbiAgICBwYXJzZShkYXRhOiBWZWN0b3JUaWxlLCBsYXllckluZGV4OiBTdHlsZUxheWVySW5kZXgsIGFjdG9yOiBBY3RvciwgY2FsbGJhY2s6IFdvcmtlclRpbGVDYWxsYmFjaykge1xuICAgICAgICB0aGlzLnN0YXR1cyA9ICdwYXJzaW5nJztcbiAgICAgICAgdGhpcy5kYXRhID0gZGF0YTtcblxuICAgICAgICB0aGlzLmNvbGxpc2lvbkJveEFycmF5ID0gbmV3IENvbGxpc2lvbkJveEFycmF5KCk7XG4gICAgICAgIGNvbnN0IHNvdXJjZUxheWVyQ29kZXIgPSBuZXcgRGljdGlvbmFyeUNvZGVyKE9iamVjdC5rZXlzKGRhdGEubGF5ZXJzKS5zb3J0KCkpO1xuXG4gICAgICAgIGNvbnN0IGZlYXR1cmVJbmRleCA9IG5ldyBGZWF0dXJlSW5kZXgodGhpcy50aWxlSUQpO1xuICAgICAgICBmZWF0dXJlSW5kZXguYnVja2V0TGF5ZXJJRHMgPSBbXTtcblxuICAgICAgICBjb25zdCBidWNrZXRzOiB7W3N0cmluZ106IEJ1Y2tldH0gPSB7fTtcblxuICAgICAgICBjb25zdCBvcHRpb25zID0ge1xuICAgICAgICAgICAgZmVhdHVyZUluZGV4OiBmZWF0dXJlSW5kZXgsXG4gICAgICAgICAgICBpY29uRGVwZW5kZW5jaWVzOiB7fSxcbiAgICAgICAgICAgIHBhdHRlcm5EZXBlbmRlbmNpZXM6IHt9LFxuICAgICAgICAgICAgZ2x5cGhEZXBlbmRlbmNpZXM6IHt9XG4gICAgICAgIH07XG5cbiAgICAgICAgY29uc3QgbGF5ZXJGYW1pbGllcyA9IGxheWVySW5kZXguZmFtaWxpZXNCeVNvdXJjZVt0aGlzLnNvdXJjZV07XG4gICAgICAgIGZvciAoY29uc3Qgc291cmNlTGF5ZXJJZCBpbiBsYXllckZhbWlsaWVzKSB7XG4gICAgICAgICAgICBjb25zdCBzb3VyY2VMYXllciA9IGRhdGEubGF5ZXJzW3NvdXJjZUxheWVySWRdO1xuICAgICAgICAgICAgaWYgKCFzb3VyY2VMYXllcikge1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoc291cmNlTGF5ZXIudmVyc2lvbiA9PT0gMSkge1xuICAgICAgICAgICAgICAgIHdhcm5PbmNlKGBWZWN0b3IgdGlsZSBzb3VyY2UgXCIke3RoaXMuc291cmNlfVwiIGxheWVyIFwiJHtzb3VyY2VMYXllcklkfVwiIGAgK1xuICAgICAgICAgICAgICAgICAgICBgZG9lcyBub3QgdXNlIHZlY3RvciB0aWxlIHNwZWMgdjIgYW5kIHRoZXJlZm9yZSBtYXkgaGF2ZSBzb21lIHJlbmRlcmluZyBlcnJvcnMuYCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IHNvdXJjZUxheWVySW5kZXggPSBzb3VyY2VMYXllckNvZGVyLmVuY29kZShzb3VyY2VMYXllcklkKTtcbiAgICAgICAgICAgIGNvbnN0IGZlYXR1cmVzID0gW107XG4gICAgICAgICAgICBmb3IgKGxldCBpbmRleCA9IDA7IGluZGV4IDwgc291cmNlTGF5ZXIubGVuZ3RoOyBpbmRleCsrKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgZmVhdHVyZSA9IHNvdXJjZUxheWVyLmZlYXR1cmUoaW5kZXgpO1xuICAgICAgICAgICAgICAgIGZlYXR1cmVzLnB1c2goeyBmZWF0dXJlLCBpbmRleCwgc291cmNlTGF5ZXJJbmRleCB9KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZm9yIChjb25zdCBmYW1pbHkgb2YgbGF5ZXJGYW1pbGllc1tzb3VyY2VMYXllcklkXSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGxheWVyID0gZmFtaWx5WzBdO1xuXG4gICAgICAgICAgICAgICAgYXNzZXJ0KGxheWVyLnNvdXJjZSA9PT0gdGhpcy5zb3VyY2UpO1xuICAgICAgICAgICAgICAgIGlmIChsYXllci5taW56b29tICYmIHRoaXMuem9vbSA8IE1hdGguZmxvb3IobGF5ZXIubWluem9vbSkpIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgIGlmIChsYXllci5tYXh6b29tICYmIHRoaXMuem9vbSA+PSBsYXllci5tYXh6b29tKSBjb250aW51ZTtcbiAgICAgICAgICAgICAgICBpZiAobGF5ZXIudmlzaWJpbGl0eSA9PT0gJ25vbmUnKSBjb250aW51ZTtcblxuICAgICAgICAgICAgICAgIHJlY2FsY3VsYXRlTGF5ZXJzKGZhbWlseSwgdGhpcy56b29tKTtcblxuICAgICAgICAgICAgICAgIGNvbnN0IGJ1Y2tldCA9IGJ1Y2tldHNbbGF5ZXIuaWRdID0gbGF5ZXIuY3JlYXRlQnVja2V0KHtcbiAgICAgICAgICAgICAgICAgICAgaW5kZXg6IGZlYXR1cmVJbmRleC5idWNrZXRMYXllcklEcy5sZW5ndGgsXG4gICAgICAgICAgICAgICAgICAgIGxheWVyczogZmFtaWx5LFxuICAgICAgICAgICAgICAgICAgICB6b29tOiB0aGlzLnpvb20sXG4gICAgICAgICAgICAgICAgICAgIHBpeGVsUmF0aW86IHRoaXMucGl4ZWxSYXRpbyxcbiAgICAgICAgICAgICAgICAgICAgb3ZlcnNjYWxpbmc6IHRoaXMub3ZlcnNjYWxpbmcsXG4gICAgICAgICAgICAgICAgICAgIGNvbGxpc2lvbkJveEFycmF5OiB0aGlzLmNvbGxpc2lvbkJveEFycmF5LFxuICAgICAgICAgICAgICAgICAgICBzb3VyY2VMYXllckluZGV4OiBzb3VyY2VMYXllckluZGV4LFxuICAgICAgICAgICAgICAgICAgICBzb3VyY2VJRDogdGhpcy5zb3VyY2VcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIGJ1Y2tldC5wb3B1bGF0ZShmZWF0dXJlcywgb3B0aW9ucyk7XG4gICAgICAgICAgICAgICAgZmVhdHVyZUluZGV4LmJ1Y2tldExheWVySURzLnB1c2goZmFtaWx5Lm1hcCgobCkgPT4gbC5pZCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgbGV0IGVycm9yOiA/RXJyb3I7XG4gICAgICAgIGxldCBnbHlwaE1hcDogP3tbc3RyaW5nXToge1tudW1iZXJdOiA/U3R5bGVHbHlwaH19O1xuICAgICAgICBsZXQgaWNvbk1hcDogP3tbc3RyaW5nXTogU3R5bGVJbWFnZX07XG4gICAgICAgIGxldCBwYXR0ZXJuTWFwOiA/e1tzdHJpbmddOiBTdHlsZUltYWdlfTtcblxuICAgICAgICBjb25zdCBzdGFja3MgPSBtYXBPYmplY3Qob3B0aW9ucy5nbHlwaERlcGVuZGVuY2llcywgKGdseXBocykgPT4gT2JqZWN0LmtleXMoZ2x5cGhzKS5tYXAoTnVtYmVyKSk7XG4gICAgICAgIGlmIChPYmplY3Qua2V5cyhzdGFja3MpLmxlbmd0aCkge1xuICAgICAgICAgICAgYWN0b3Iuc2VuZCgnZ2V0R2x5cGhzJywge3VpZDogdGhpcy51aWQsIHN0YWNrc30sIChlcnIsIHJlc3VsdCkgPT4ge1xuICAgICAgICAgICAgICAgIGlmICghZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgZXJyb3IgPSBlcnI7XG4gICAgICAgICAgICAgICAgICAgIGdseXBoTWFwID0gcmVzdWx0O1xuICAgICAgICAgICAgICAgICAgICBtYXliZVByZXBhcmUuY2FsbCh0aGlzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGdseXBoTWFwID0ge307XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBpY29ucyA9IE9iamVjdC5rZXlzKG9wdGlvbnMuaWNvbkRlcGVuZGVuY2llcyk7XG4gICAgICAgIGlmIChpY29ucy5sZW5ndGgpIHtcbiAgICAgICAgICAgIGFjdG9yLnNlbmQoJ2dldEltYWdlcycsIHtpY29uc30sIChlcnIsIHJlc3VsdCkgPT4ge1xuICAgICAgICAgICAgICAgIGlmICghZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgZXJyb3IgPSBlcnI7XG4gICAgICAgICAgICAgICAgICAgIGljb25NYXAgPSByZXN1bHQ7XG4gICAgICAgICAgICAgICAgICAgIG1heWJlUHJlcGFyZS5jYWxsKHRoaXMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWNvbk1hcCA9IHt9O1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgcGF0dGVybnMgPSBPYmplY3Qua2V5cyhvcHRpb25zLnBhdHRlcm5EZXBlbmRlbmNpZXMpO1xuICAgICAgICBpZiAocGF0dGVybnMubGVuZ3RoKSB7XG4gICAgICAgICAgICBhY3Rvci5zZW5kKCdnZXRJbWFnZXMnLCB7aWNvbnM6IHBhdHRlcm5zfSwgKGVyciwgcmVzdWx0KSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKCFlcnJvcikge1xuICAgICAgICAgICAgICAgICAgICBlcnJvciA9IGVycjtcbiAgICAgICAgICAgICAgICAgICAgcGF0dGVybk1hcCA9IHJlc3VsdDtcbiAgICAgICAgICAgICAgICAgICAgbWF5YmVQcmVwYXJlLmNhbGwodGhpcyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBwYXR0ZXJuTWFwID0ge307XG4gICAgICAgIH1cblxuXG4gICAgICAgIG1heWJlUHJlcGFyZS5jYWxsKHRoaXMpO1xuXG4gICAgICAgIGZ1bmN0aW9uIG1heWJlUHJlcGFyZSgpIHtcbiAgICAgICAgICAgIGlmIChlcnJvcikge1xuICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnJvcik7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGdseXBoTWFwICYmIGljb25NYXAgJiYgcGF0dGVybk1hcCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGdseXBoQXRsYXMgPSBuZXcgR2x5cGhBdGxhcyhnbHlwaE1hcCk7XG4gICAgICAgICAgICAgICAgY29uc3QgaW1hZ2VBdGxhcyA9IG5ldyBJbWFnZUF0bGFzKGljb25NYXAsIHBhdHRlcm5NYXApO1xuXG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBrZXkgaW4gYnVja2V0cykge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBidWNrZXQgPSBidWNrZXRzW2tleV07XG4gICAgICAgICAgICAgICAgICAgIGlmIChidWNrZXQgaW5zdGFuY2VvZiBTeW1ib2xCdWNrZXQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlY2FsY3VsYXRlTGF5ZXJzKGJ1Y2tldC5sYXllcnMsIHRoaXMuem9vbSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBwZXJmb3JtU3ltYm9sTGF5b3V0KGJ1Y2tldCwgZ2x5cGhNYXAsIGdseXBoQXRsYXMucG9zaXRpb25zLCBpY29uTWFwLCBpbWFnZUF0bGFzLmljb25Qb3NpdGlvbnMsIHRoaXMuc2hvd0NvbGxpc2lvbkJveGVzKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChidWNrZXQuaGFzUGF0dGVybiAmJlxuICAgICAgICAgICAgICAgICAgICAgICAgKGJ1Y2tldCBpbnN0YW5jZW9mIExpbmVCdWNrZXQgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgICBidWNrZXQgaW5zdGFuY2VvZiBGaWxsQnVja2V0IHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAgYnVja2V0IGluc3RhbmNlb2YgRmlsbEV4dHJ1c2lvbkJ1Y2tldCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlY2FsY3VsYXRlTGF5ZXJzKGJ1Y2tldC5sYXllcnMsIHRoaXMuem9vbSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBidWNrZXQuYWRkRmVhdHVyZXMob3B0aW9ucywgaW1hZ2VBdGxhcy5wYXR0ZXJuUG9zaXRpb25zKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHRoaXMuc3RhdHVzID0gJ2RvbmUnO1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIHtcbiAgICAgICAgICAgICAgICAgICAgYnVja2V0czogdmFsdWVzKGJ1Y2tldHMpLmZpbHRlcihiID0+ICFiLmlzRW1wdHkoKSksXG4gICAgICAgICAgICAgICAgICAgIGZlYXR1cmVJbmRleCxcbiAgICAgICAgICAgICAgICAgICAgY29sbGlzaW9uQm94QXJyYXk6IHRoaXMuY29sbGlzaW9uQm94QXJyYXksXG4gICAgICAgICAgICAgICAgICAgIGdseXBoQXRsYXNJbWFnZTogZ2x5cGhBdGxhcy5pbWFnZSxcbiAgICAgICAgICAgICAgICAgICAgaW1hZ2VBdGxhczogaW1hZ2VBdGxhc1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufVxuXG5mdW5jdGlvbiByZWNhbGN1bGF0ZUxheWVycyhsYXllcnM6ICRSZWFkT25seUFycmF5PFN0eWxlTGF5ZXI+LCB6b29tOiBudW1iZXIpIHtcbiAgICAvLyBMYXllcnMgYXJlIHNoYXJlZCBhbmQgbWF5IGhhdmUgYmVlbiB1c2VkIGJ5IGEgV29ya2VyVGlsZSB3aXRoIGEgZGlmZmVyZW50IHpvb20uXG4gICAgY29uc3QgcGFyYW1ldGVycyA9IG5ldyBFdmFsdWF0aW9uUGFyYW1ldGVycyh6b29tKTtcbiAgICBmb3IgKGNvbnN0IGxheWVyIG9mIGxheWVycykge1xuICAgICAgICBsYXllci5yZWNhbGN1bGF0ZShwYXJhbWV0ZXJzKTtcbiAgICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IFdvcmtlclRpbGU7XG4iLCIvLyBAZmxvd1xuXG5pbXBvcnQgdHlwZSB7UmVxdWVzdFBhcmFtZXRlcnN9IGZyb20gJy4uL3V0aWwvYWpheCc7XG5cbi8vIFdyYXBzIHBlcmZvcm1hbmNlIHRvIGZhY2lsaXRhdGUgdGVzdGluZ1xuLy8gTm90IGluY29ycG9yYXRlZCBpbnRvIGJyb3dzZXIuanMgYmVjYXVzZSB0aGUgbGF0dGVyIGlzIHBvaXNvbm91cyB3aGVuIHVzZWQgb3V0c2lkZSB0aGUgbWFpbiB0aHJlYWRcbmNvbnN0IHBlcmZvcm1hbmNlRXhpc3RzID0gdHlwZW9mIHBlcmZvcm1hbmNlICE9PSAndW5kZWZpbmVkJztcbmNvbnN0IHdyYXBwZXIgPSB7fTtcblxud3JhcHBlci5nZXRFbnRyaWVzQnlOYW1lID0gKHVybDogc3RyaW5nKSA9PiB7XG4gICAgaWYgKHBlcmZvcm1hbmNlRXhpc3RzICYmIHBlcmZvcm1hbmNlICYmIHBlcmZvcm1hbmNlLmdldEVudHJpZXNCeU5hbWUpXG4gICAgICAgIHJldHVybiBwZXJmb3JtYW5jZS5nZXRFbnRyaWVzQnlOYW1lKHVybCk7XG4gICAgZWxzZVxuICAgICAgICByZXR1cm4gZmFsc2U7XG59O1xuXG53cmFwcGVyLm1hcmsgPSAobmFtZTogc3RyaW5nKSA9PiB7XG4gICAgaWYgKHBlcmZvcm1hbmNlRXhpc3RzICYmIHBlcmZvcm1hbmNlICYmIHBlcmZvcm1hbmNlLm1hcmspXG4gICAgICAgIHJldHVybiBwZXJmb3JtYW5jZS5tYXJrKG5hbWUpO1xuICAgIGVsc2VcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xufTtcblxud3JhcHBlci5tZWFzdXJlID0gKG5hbWU6IHN0cmluZywgc3RhcnRNYXJrOiBzdHJpbmcsIGVuZE1hcms6IHN0cmluZykgPT4ge1xuICAgIGlmIChwZXJmb3JtYW5jZUV4aXN0cyAmJiBwZXJmb3JtYW5jZSAmJiBwZXJmb3JtYW5jZS5tZWFzdXJlKVxuICAgICAgICByZXR1cm4gcGVyZm9ybWFuY2UubWVhc3VyZShuYW1lLCBzdGFydE1hcmssIGVuZE1hcmspO1xuICAgIGVsc2VcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xufTtcblxud3JhcHBlci5jbGVhck1hcmtzID0gKG5hbWU6IHN0cmluZykgPT4ge1xuICAgIGlmIChwZXJmb3JtYW5jZUV4aXN0cyAmJiBwZXJmb3JtYW5jZSAmJiBwZXJmb3JtYW5jZS5jbGVhck1hcmtzKVxuICAgICAgICByZXR1cm4gcGVyZm9ybWFuY2UuY2xlYXJNYXJrcyhuYW1lKTtcbiAgICBlbHNlXG4gICAgICAgIHJldHVybiBmYWxzZTtcbn07XG5cbndyYXBwZXIuY2xlYXJNZWFzdXJlcyA9IChuYW1lOiBzdHJpbmcpID0+IHtcbiAgICBpZiAocGVyZm9ybWFuY2VFeGlzdHMgJiYgcGVyZm9ybWFuY2UgJiYgcGVyZm9ybWFuY2UuY2xlYXJNZWFzdXJlcylcbiAgICAgICAgcmV0dXJuIHBlcmZvcm1hbmNlLmNsZWFyTWVhc3VyZXMobmFtZSk7XG4gICAgZWxzZVxuICAgICAgICByZXR1cm4gZmFsc2U7XG59O1xuXG4vKipcbiAqIFNhZmUgd3JhcHBlciBmb3IgdGhlIHBlcmZvcm1hbmNlIHJlc291cmNlIHRpbWluZyBBUEkgaW4gd2ViIHdvcmtlcnMgd2l0aCBncmFjZWZ1bCBkZWdyYWRhdGlvblxuICpcbiAqIEBwYXJhbSB7UmVxdWVzdFBhcmFtZXRlcnN9IHJlcXVlc3RcbiAqIEBwcml2YXRlXG4gKi9cbmNsYXNzIFBlcmZvcm1hbmNlIHtcbiAgICBfbWFya3M6IHtzdGFydDogc3RyaW5nLCBlbmQ6IHN0cmluZywgbWVhc3VyZTogc3RyaW5nfTtcblxuICAgIGNvbnN0cnVjdG9yIChyZXF1ZXN0OiBSZXF1ZXN0UGFyYW1ldGVycykge1xuICAgICAgICB0aGlzLl9tYXJrcyA9IHtcbiAgICAgICAgICAgIHN0YXJ0OiBbcmVxdWVzdC51cmwsICdzdGFydCddLmpvaW4oJyMnKSxcbiAgICAgICAgICAgIGVuZDogW3JlcXVlc3QudXJsLCAnZW5kJ10uam9pbignIycpLFxuICAgICAgICAgICAgbWVhc3VyZTogcmVxdWVzdC51cmwudG9TdHJpbmcoKVxuICAgICAgICB9O1xuXG4gICAgICAgIHdyYXBwZXIubWFyayh0aGlzLl9tYXJrcy5zdGFydCk7XG4gICAgfVxuXG4gICAgZmluaXNoKCkge1xuICAgICAgICB3cmFwcGVyLm1hcmsodGhpcy5fbWFya3MuZW5kKTtcbiAgICAgICAgbGV0IHJlc291cmNlVGltaW5nRGF0YSA9IHdyYXBwZXIuZ2V0RW50cmllc0J5TmFtZSh0aGlzLl9tYXJrcy5tZWFzdXJlKTtcblxuICAgICAgICAvLyBmYWxsYmFjayBpZiB3ZWIgd29ya2VyIGltcGxlbWVudGF0aW9uIG9mIHBlcmYuZ2V0RW50cmllc0J5TmFtZSByZXR1cm5zIGVtcHR5XG4gICAgICAgIGlmIChyZXNvdXJjZVRpbWluZ0RhdGEubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICB3cmFwcGVyLm1lYXN1cmUodGhpcy5fbWFya3MubWVhc3VyZSwgdGhpcy5fbWFya3Muc3RhcnQsIHRoaXMuX21hcmtzLmVuZCk7XG4gICAgICAgICAgICByZXNvdXJjZVRpbWluZ0RhdGEgPSB3cmFwcGVyLmdldEVudHJpZXNCeU5hbWUodGhpcy5fbWFya3MubWVhc3VyZSk7XG5cbiAgICAgICAgICAgIC8vIGNsZWFudXBcbiAgICAgICAgICAgIHdyYXBwZXIuY2xlYXJNYXJrcyh0aGlzLl9tYXJrcy5zdGFydCk7XG4gICAgICAgICAgICB3cmFwcGVyLmNsZWFyTWFya3ModGhpcy5fbWFya3MuZW5kKTtcbiAgICAgICAgICAgIHdyYXBwZXIuY2xlYXJNZWFzdXJlcyh0aGlzLl9tYXJrcy5tZWFzdXJlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiByZXNvdXJjZVRpbWluZ0RhdGE7XG4gICAgfVxufVxuXG53cmFwcGVyLlBlcmZvcm1hbmNlID0gUGVyZm9ybWFuY2U7XG5cbmV4cG9ydCBkZWZhdWx0IHdyYXBwZXI7XG4iLCIvLyBAZmxvd1xuXG5pbXBvcnQge2dldEFycmF5QnVmZmVyfSBmcm9tICcuLi91dGlsL2FqYXgnO1xuXG5pbXBvcnQgdnQgZnJvbSAnQG1hcGJveC92ZWN0b3ItdGlsZSc7XG5pbXBvcnQgUHJvdG9idWYgZnJvbSAncGJmJztcbmltcG9ydCBXb3JrZXJUaWxlIGZyb20gJy4vd29ya2VyX3RpbGUnO1xuaW1wb3J0IHsgZXh0ZW5kIH0gZnJvbSAnLi4vdXRpbC91dGlsJztcbmltcG9ydCBwZXJmb3JtYW5jZSBmcm9tICcuLi91dGlsL3BlcmZvcm1hbmNlJztcblxuaW1wb3J0IHR5cGUge1xuICAgIFdvcmtlclNvdXJjZSxcbiAgICBXb3JrZXJUaWxlUGFyYW1ldGVycyxcbiAgICBXb3JrZXJUaWxlQ2FsbGJhY2ssXG4gICAgVGlsZVBhcmFtZXRlcnNcbn0gZnJvbSAnLi4vc291cmNlL3dvcmtlcl9zb3VyY2UnO1xuXG5pbXBvcnQgdHlwZSB7UGVyZm9ybWFuY2VSZXNvdXJjZVRpbWluZ30gZnJvbSAnLi4vdHlwZXMvcGVyZm9ybWFuY2VfcmVzb3VyY2VfdGltaW5nJztcbmltcG9ydCB0eXBlIEFjdG9yIGZyb20gJy4uL3V0aWwvYWN0b3InO1xuaW1wb3J0IHR5cGUgU3R5bGVMYXllckluZGV4IGZyb20gJy4uL3N0eWxlL3N0eWxlX2xheWVyX2luZGV4JztcbmltcG9ydCB0eXBlIHtDYWxsYmFja30gZnJvbSAnLi4vdHlwZXMvY2FsbGJhY2snO1xuXG5leHBvcnQgdHlwZSBMb2FkVmVjdG9yVGlsZVJlc3VsdCA9IHtcbiAgICB2ZWN0b3JUaWxlOiBWZWN0b3JUaWxlO1xuICAgIHJhd0RhdGE6IEFycmF5QnVmZmVyO1xuICAgIGV4cGlyZXM/OiBhbnk7XG4gICAgY2FjaGVDb250cm9sPzogYW55O1xuICAgIHJlc291cmNlVGltaW5nPzogQXJyYXk8UGVyZm9ybWFuY2VSZXNvdXJjZVRpbWluZz47XG59O1xuXG4vKipcbiAqIEBjYWxsYmFjayBMb2FkVmVjdG9yRGF0YUNhbGxiYWNrXG4gKiBAcGFyYW0gZXJyb3JcbiAqIEBwYXJhbSB2ZWN0b3JUaWxlXG4gKiBAcHJpdmF0ZVxuICovXG5leHBvcnQgdHlwZSBMb2FkVmVjdG9yRGF0YUNhbGxiYWNrID0gQ2FsbGJhY2s8P0xvYWRWZWN0b3JUaWxlUmVzdWx0PjtcblxuZXhwb3J0IHR5cGUgQWJvcnRWZWN0b3JEYXRhID0gKCkgPT4gdm9pZDtcbmV4cG9ydCB0eXBlIExvYWRWZWN0b3JEYXRhID0gKHBhcmFtczogV29ya2VyVGlsZVBhcmFtZXRlcnMsIGNhbGxiYWNrOiBMb2FkVmVjdG9yRGF0YUNhbGxiYWNrKSA9PiA/QWJvcnRWZWN0b3JEYXRhO1xuXG4vKipcbiAqIEBwcml2YXRlXG4gKi9cbmZ1bmN0aW9uIGxvYWRWZWN0b3JUaWxlKHBhcmFtczogV29ya2VyVGlsZVBhcmFtZXRlcnMsIGNhbGxiYWNrOiBMb2FkVmVjdG9yRGF0YUNhbGxiYWNrKSB7XG4gICAgY29uc3QgcmVxdWVzdCA9IGdldEFycmF5QnVmZmVyKHBhcmFtcy5yZXF1ZXN0LCAoZXJyLCByZXNwb25zZSkgPT4ge1xuICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICBjYWxsYmFjayhlcnIpO1xuICAgICAgICB9IGVsc2UgaWYgKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICBjYWxsYmFjayhudWxsLCB7XG4gICAgICAgICAgICAgICAgdmVjdG9yVGlsZTogbmV3IHZ0LlZlY3RvclRpbGUobmV3IFByb3RvYnVmKHJlc3BvbnNlLmRhdGEpKSxcbiAgICAgICAgICAgICAgICByYXdEYXRhOiByZXNwb25zZS5kYXRhLFxuICAgICAgICAgICAgICAgIGNhY2hlQ29udHJvbDogcmVzcG9uc2UuY2FjaGVDb250cm9sLFxuICAgICAgICAgICAgICAgIGV4cGlyZXM6IHJlc3BvbnNlLmV4cGlyZXNcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuICgpID0+IHtcbiAgICAgICAgcmVxdWVzdC5jYW5jZWwoKTtcbiAgICAgICAgY2FsbGJhY2soKTtcbiAgICB9O1xufVxuXG4vKipcbiAqIFRoZSB7QGxpbmsgV29ya2VyU291cmNlfSBpbXBsZW1lbnRhdGlvbiB0aGF0IHN1cHBvcnRzIHtAbGluayBWZWN0b3JUaWxlU291cmNlfS5cbiAqIFRoaXMgY2xhc3MgaXMgZGVzaWduZWQgdG8gYmUgZWFzaWx5IHJldXNlZCB0byBzdXBwb3J0IGN1c3RvbSBzb3VyY2UgdHlwZXNcbiAqIGZvciBkYXRhIGZvcm1hdHMgdGhhdCBjYW4gYmUgcGFyc2VkL2NvbnZlcnRlZCBpbnRvIGFuIGluLW1lbW9yeSBWZWN0b3JUaWxlXG4gKiByZXByZXNlbnRhdGlvbi4gIFRvIGRvIHNvLCBjcmVhdGUgaXQgd2l0aFxuICogYG5ldyBWZWN0b3JUaWxlV29ya2VyU291cmNlKGFjdG9yLCBzdHlsZUxheWVycywgY3VzdG9tTG9hZFZlY3RvckRhdGFGdW5jdGlvbilgLlxuICpcbiAqIEBwcml2YXRlXG4gKi9cbmNsYXNzIFZlY3RvclRpbGVXb3JrZXJTb3VyY2UgaW1wbGVtZW50cyBXb3JrZXJTb3VyY2Uge1xuICAgIGFjdG9yOiBBY3RvcjtcbiAgICBsYXllckluZGV4OiBTdHlsZUxheWVySW5kZXg7XG4gICAgbG9hZFZlY3RvckRhdGE6IExvYWRWZWN0b3JEYXRhO1xuICAgIGxvYWRpbmc6IHsgW3N0cmluZ106IFdvcmtlclRpbGUgfTtcbiAgICBsb2FkZWQ6IHsgW3N0cmluZ106IFdvcmtlclRpbGUgfTtcblxuICAgIC8qKlxuICAgICAqIEBwYXJhbSBbbG9hZFZlY3RvckRhdGFdIE9wdGlvbmFsIG1ldGhvZCBmb3IgY3VzdG9tIGxvYWRpbmcgb2YgYSBWZWN0b3JUaWxlXG4gICAgICogb2JqZWN0IGJhc2VkIG9uIHBhcmFtZXRlcnMgcGFzc2VkIGZyb20gdGhlIG1haW4tdGhyZWFkIFNvdXJjZS4gU2VlXG4gICAgICoge0BsaW5rIFZlY3RvclRpbGVXb3JrZXJTb3VyY2UjbG9hZFRpbGV9LiBUaGUgZGVmYXVsdCBpbXBsZW1lbnRhdGlvbiBzaW1wbHlcbiAgICAgKiBsb2FkcyB0aGUgcGJmIGF0IGBwYXJhbXMudXJsYC5cbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihhY3RvcjogQWN0b3IsIGxheWVySW5kZXg6IFN0eWxlTGF5ZXJJbmRleCwgbG9hZFZlY3RvckRhdGE6ID9Mb2FkVmVjdG9yRGF0YSkge1xuICAgICAgICB0aGlzLmFjdG9yID0gYWN0b3I7XG4gICAgICAgIHRoaXMubGF5ZXJJbmRleCA9IGxheWVySW5kZXg7XG4gICAgICAgIHRoaXMubG9hZFZlY3RvckRhdGEgPSBsb2FkVmVjdG9yRGF0YSB8fCBsb2FkVmVjdG9yVGlsZTtcbiAgICAgICAgdGhpcy5sb2FkaW5nID0ge307XG4gICAgICAgIHRoaXMubG9hZGVkID0ge307XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogSW1wbGVtZW50cyB7QGxpbmsgV29ya2VyU291cmNlI2xvYWRUaWxlfS4gRGVsZWdhdGVzIHRvXG4gICAgICoge0BsaW5rIFZlY3RvclRpbGVXb3JrZXJTb3VyY2UjbG9hZFZlY3RvckRhdGF9ICh3aGljaCBieSBkZWZhdWx0IGV4cGVjdHNcbiAgICAgKiBhIGBwYXJhbXMudXJsYCBwcm9wZXJ0eSkgZm9yIGZldGNoaW5nIGFuZCBwcm9kdWNpbmcgYSBWZWN0b3JUaWxlIG9iamVjdC5cbiAgICAgKi9cbiAgICBsb2FkVGlsZShwYXJhbXM6IFdvcmtlclRpbGVQYXJhbWV0ZXJzLCBjYWxsYmFjazogV29ya2VyVGlsZUNhbGxiYWNrKSB7XG4gICAgICAgIGNvbnN0IHVpZCA9IHBhcmFtcy51aWQ7XG5cbiAgICAgICAgaWYgKCF0aGlzLmxvYWRpbmcpXG4gICAgICAgICAgICB0aGlzLmxvYWRpbmcgPSB7fTtcblxuICAgICAgICBjb25zdCBwZXJmID0gKHBhcmFtcyAmJiBwYXJhbXMucmVxdWVzdCAmJiBwYXJhbXMucmVxdWVzdC5jb2xsZWN0UmVzb3VyY2VUaW1pbmcpID9cbiAgICAgICAgICAgIG5ldyBwZXJmb3JtYW5jZS5QZXJmb3JtYW5jZShwYXJhbXMucmVxdWVzdCkgOiBmYWxzZTtcblxuICAgICAgICBjb25zdCB3b3JrZXJUaWxlID0gdGhpcy5sb2FkaW5nW3VpZF0gPSBuZXcgV29ya2VyVGlsZShwYXJhbXMpO1xuICAgICAgICB3b3JrZXJUaWxlLmFib3J0ID0gdGhpcy5sb2FkVmVjdG9yRGF0YShwYXJhbXMsIChlcnIsIHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBkZWxldGUgdGhpcy5sb2FkaW5nW3VpZF07XG5cbiAgICAgICAgICAgIGlmIChlcnIgfHwgIXJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IHJhd1RpbGVEYXRhID0gcmVzcG9uc2UucmF3RGF0YTtcbiAgICAgICAgICAgIGNvbnN0IGNhY2hlQ29udHJvbCA9IHt9O1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLmV4cGlyZXMpIGNhY2hlQ29udHJvbC5leHBpcmVzID0gcmVzcG9uc2UuZXhwaXJlcztcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5jYWNoZUNvbnRyb2wpIGNhY2hlQ29udHJvbC5jYWNoZUNvbnRyb2wgPSByZXNwb25zZS5jYWNoZUNvbnRyb2w7XG5cbiAgICAgICAgICAgIGNvbnN0IHJlc291cmNlVGltaW5nID0ge307XG4gICAgICAgICAgICBpZiAocGVyZikge1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlc291cmNlVGltaW5nRGF0YSA9IHBlcmYuZmluaXNoKCk7XG4gICAgICAgICAgICAgICAgLy8gaXQncyBuZWNlc3NhcnkgdG8gZXZhbCB0aGUgcmVzdWx0IG9mIGdldEVudHJpZXNCeU5hbWUoKSBoZXJlIHZpYSBwYXJzZS9zdHJpbmdpZnlcbiAgICAgICAgICAgICAgICAvLyBsYXRlIGV2YWx1YXRpb24gaW4gdGhlIG1haW4gdGhyZWFkIGNhdXNlcyBUeXBlRXJyb3I6IGlsbGVnYWwgaW52b2NhdGlvblxuICAgICAgICAgICAgICAgIGlmIChyZXNvdXJjZVRpbWluZ0RhdGEpXG4gICAgICAgICAgICAgICAgICAgIHJlc291cmNlVGltaW5nLnJlc291cmNlVGltaW5nID0gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShyZXNvdXJjZVRpbWluZ0RhdGEpKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgd29ya2VyVGlsZS52ZWN0b3JUaWxlID0gcmVzcG9uc2UudmVjdG9yVGlsZTtcbiAgICAgICAgICAgIHdvcmtlclRpbGUucGFyc2UocmVzcG9uc2UudmVjdG9yVGlsZSwgdGhpcy5sYXllckluZGV4LCB0aGlzLmFjdG9yLCAoZXJyLCByZXN1bHQpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoZXJyIHx8ICFyZXN1bHQpIHJldHVybiBjYWxsYmFjayhlcnIpO1xuXG4gICAgICAgICAgICAgICAgLy8gVHJhbnNmZXJyaW5nIGEgY29weSBvZiByYXdUaWxlRGF0YSBiZWNhdXNlIHRoZSB3b3JrZXIgbmVlZHMgdG8gcmV0YWluIGl0cyBjb3B5LlxuICAgICAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIGV4dGVuZCh7cmF3VGlsZURhdGE6IHJhd1RpbGVEYXRhLnNsaWNlKDApfSwgcmVzdWx0LCBjYWNoZUNvbnRyb2wsIHJlc291cmNlVGltaW5nKSk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgdGhpcy5sb2FkZWQgPSB0aGlzLmxvYWRlZCB8fCB7fTtcbiAgICAgICAgICAgIHRoaXMubG9hZGVkW3VpZF0gPSB3b3JrZXJUaWxlO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBJbXBsZW1lbnRzIHtAbGluayBXb3JrZXJTb3VyY2UjcmVsb2FkVGlsZX0uXG4gICAgICovXG4gICAgcmVsb2FkVGlsZShwYXJhbXM6IFdvcmtlclRpbGVQYXJhbWV0ZXJzLCBjYWxsYmFjazogV29ya2VyVGlsZUNhbGxiYWNrKSB7XG4gICAgICAgIGNvbnN0IGxvYWRlZCA9IHRoaXMubG9hZGVkLFxuICAgICAgICAgICAgdWlkID0gcGFyYW1zLnVpZCxcbiAgICAgICAgICAgIHZ0U291cmNlID0gdGhpcztcbiAgICAgICAgaWYgKGxvYWRlZCAmJiBsb2FkZWRbdWlkXSkge1xuICAgICAgICAgICAgY29uc3Qgd29ya2VyVGlsZSA9IGxvYWRlZFt1aWRdO1xuICAgICAgICAgICAgd29ya2VyVGlsZS5zaG93Q29sbGlzaW9uQm94ZXMgPSBwYXJhbXMuc2hvd0NvbGxpc2lvbkJveGVzO1xuXG4gICAgICAgICAgICBjb25zdCBkb25lID0gKGVyciwgZGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlbG9hZENhbGxiYWNrID0gd29ya2VyVGlsZS5yZWxvYWRDYWxsYmFjaztcbiAgICAgICAgICAgICAgICBpZiAocmVsb2FkQ2FsbGJhY2spIHtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHdvcmtlclRpbGUucmVsb2FkQ2FsbGJhY2s7XG4gICAgICAgICAgICAgICAgICAgIHdvcmtlclRpbGUucGFyc2Uod29ya2VyVGlsZS52ZWN0b3JUaWxlLCB2dFNvdXJjZS5sYXllckluZGV4LCB2dFNvdXJjZS5hY3RvciwgcmVsb2FkQ2FsbGJhY2spO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjYWxsYmFjayhlcnIsIGRhdGEpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgaWYgKHdvcmtlclRpbGUuc3RhdHVzID09PSAncGFyc2luZycpIHtcbiAgICAgICAgICAgICAgICB3b3JrZXJUaWxlLnJlbG9hZENhbGxiYWNrID0gZG9uZTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAod29ya2VyVGlsZS5zdGF0dXMgPT09ICdkb25lJykge1xuICAgICAgICAgICAgICAgIHdvcmtlclRpbGUucGFyc2Uod29ya2VyVGlsZS52ZWN0b3JUaWxlLCB0aGlzLmxheWVySW5kZXgsIHRoaXMuYWN0b3IsIGRvbmUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogSW1wbGVtZW50cyB7QGxpbmsgV29ya2VyU291cmNlI2Fib3J0VGlsZX0uXG4gICAgICpcbiAgICAgKiBAcGFyYW0gcGFyYW1zXG4gICAgICogQHBhcmFtIHBhcmFtcy51aWQgVGhlIFVJRCBmb3IgdGhpcyB0aWxlLlxuICAgICAqL1xuICAgIGFib3J0VGlsZShwYXJhbXM6IFRpbGVQYXJhbWV0ZXJzLCBjYWxsYmFjazogV29ya2VyVGlsZUNhbGxiYWNrKSB7XG4gICAgICAgIGNvbnN0IGxvYWRpbmcgPSB0aGlzLmxvYWRpbmcsXG4gICAgICAgICAgICB1aWQgPSBwYXJhbXMudWlkO1xuICAgICAgICBpZiAobG9hZGluZyAmJiBsb2FkaW5nW3VpZF0gJiYgbG9hZGluZ1t1aWRdLmFib3J0KSB7XG4gICAgICAgICAgICBsb2FkaW5nW3VpZF0uYWJvcnQoKTtcbiAgICAgICAgICAgIGRlbGV0ZSBsb2FkaW5nW3VpZF07XG4gICAgICAgIH1cbiAgICAgICAgY2FsbGJhY2soKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBJbXBsZW1lbnRzIHtAbGluayBXb3JrZXJTb3VyY2UjcmVtb3ZlVGlsZX0uXG4gICAgICpcbiAgICAgKiBAcGFyYW0gcGFyYW1zXG4gICAgICogQHBhcmFtIHBhcmFtcy51aWQgVGhlIFVJRCBmb3IgdGhpcyB0aWxlLlxuICAgICAqL1xuICAgIHJlbW92ZVRpbGUocGFyYW1zOiBUaWxlUGFyYW1ldGVycywgY2FsbGJhY2s6IFdvcmtlclRpbGVDYWxsYmFjaykge1xuICAgICAgICBjb25zdCBsb2FkZWQgPSB0aGlzLmxvYWRlZCxcbiAgICAgICAgICAgIHVpZCA9IHBhcmFtcy51aWQ7XG4gICAgICAgIGlmIChsb2FkZWQgJiYgbG9hZGVkW3VpZF0pIHtcbiAgICAgICAgICAgIGRlbGV0ZSBsb2FkZWRbdWlkXTtcbiAgICAgICAgfVxuICAgICAgICBjYWxsYmFjaygpO1xuICAgIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgVmVjdG9yVGlsZVdvcmtlclNvdXJjZTtcbiIsIi8vIEBmbG93XG5cbmltcG9ydCBERU1EYXRhIGZyb20gJy4uL2RhdGEvZGVtX2RhdGEnO1xuXG5pbXBvcnQgdHlwZSBBY3RvciBmcm9tICcuLi91dGlsL2FjdG9yJztcbmltcG9ydCB0eXBlIHtcbiAgICBXb3JrZXJERU1UaWxlUGFyYW1ldGVycyxcbiAgICBXb3JrZXJERU1UaWxlQ2FsbGJhY2ssXG4gICAgVGlsZVBhcmFtZXRlcnNcbn0gZnJvbSAnLi93b3JrZXJfc291cmNlJztcblxuXG5jbGFzcyBSYXN0ZXJERU1UaWxlV29ya2VyU291cmNlIHtcbiAgICBhY3RvcjogQWN0b3I7XG4gICAgbG9hZGVkOiB7W3N0cmluZ106IERFTURhdGF9O1xuXG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHRoaXMubG9hZGVkID0ge307XG4gICAgfVxuXG4gICAgbG9hZFRpbGUocGFyYW1zOiBXb3JrZXJERU1UaWxlUGFyYW1ldGVycywgY2FsbGJhY2s6IFdvcmtlckRFTVRpbGVDYWxsYmFjaykge1xuICAgICAgICBjb25zdCB7dWlkLCBlbmNvZGluZywgcmF3SW1hZ2VEYXRhfSA9IHBhcmFtcztcbiAgICAgICAgY29uc3QgZGVtID0gbmV3IERFTURhdGEodWlkLCByYXdJbWFnZURhdGEsIGVuY29kaW5nKTtcblxuICAgICAgICB0aGlzLmxvYWRlZCA9IHRoaXMubG9hZGVkIHx8IHt9O1xuICAgICAgICB0aGlzLmxvYWRlZFt1aWRdID0gZGVtO1xuICAgICAgICBjYWxsYmFjayhudWxsLCBkZW0pO1xuICAgIH1cblxuICAgIHJlbW92ZVRpbGUocGFyYW1zOiBUaWxlUGFyYW1ldGVycykge1xuICAgICAgICBjb25zdCBsb2FkZWQgPSB0aGlzLmxvYWRlZCxcbiAgICAgICAgICAgIHVpZCA9IHBhcmFtcy51aWQ7XG4gICAgICAgIGlmIChsb2FkZWQgJiYgbG9hZGVkW3VpZF0pIHtcbiAgICAgICAgICAgIGRlbGV0ZSBsb2FkZWRbdWlkXTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgUmFzdGVyREVNVGlsZVdvcmtlclNvdXJjZTtcbiIsIm1vZHVsZS5leHBvcnRzLlJBRElVUyA9IDYzNzgxMzc7XG5tb2R1bGUuZXhwb3J0cy5GTEFUVEVOSU5HID0gMS8yOTguMjU3MjIzNTYzO1xubW9kdWxlLmV4cG9ydHMuUE9MQVJfUkFESVVTID0gNjM1Njc1Mi4zMTQyO1xuIiwidmFyIHdnczg0ID0gcmVxdWlyZSgnd2dzODQnKTtcblxubW9kdWxlLmV4cG9ydHMuZ2VvbWV0cnkgPSBnZW9tZXRyeTtcbm1vZHVsZS5leHBvcnRzLnJpbmcgPSByaW5nQXJlYTtcblxuZnVuY3Rpb24gZ2VvbWV0cnkoXykge1xuICAgIHZhciBhcmVhID0gMCwgaTtcbiAgICBzd2l0Y2ggKF8udHlwZSkge1xuICAgICAgICBjYXNlICdQb2x5Z29uJzpcbiAgICAgICAgICAgIHJldHVybiBwb2x5Z29uQXJlYShfLmNvb3JkaW5hdGVzKTtcbiAgICAgICAgY2FzZSAnTXVsdGlQb2x5Z29uJzpcbiAgICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCBfLmNvb3JkaW5hdGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgYXJlYSArPSBwb2x5Z29uQXJlYShfLmNvb3JkaW5hdGVzW2ldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBhcmVhO1xuICAgICAgICBjYXNlICdQb2ludCc6XG4gICAgICAgIGNhc2UgJ011bHRpUG9pbnQnOlxuICAgICAgICBjYXNlICdMaW5lU3RyaW5nJzpcbiAgICAgICAgY2FzZSAnTXVsdGlMaW5lU3RyaW5nJzpcbiAgICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICBjYXNlICdHZW9tZXRyeUNvbGxlY3Rpb24nOlxuICAgICAgICAgICAgZm9yIChpID0gMDsgaSA8IF8uZ2VvbWV0cmllcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIGFyZWEgKz0gZ2VvbWV0cnkoXy5nZW9tZXRyaWVzW2ldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBhcmVhO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gcG9seWdvbkFyZWEoY29vcmRzKSB7XG4gICAgdmFyIGFyZWEgPSAwO1xuICAgIGlmIChjb29yZHMgJiYgY29vcmRzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgYXJlYSArPSBNYXRoLmFicyhyaW5nQXJlYShjb29yZHNbMF0pKTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDE7IGkgPCBjb29yZHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGFyZWEgLT0gTWF0aC5hYnMocmluZ0FyZWEoY29vcmRzW2ldKSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGFyZWE7XG59XG5cbi8qKlxuICogQ2FsY3VsYXRlIHRoZSBhcHByb3hpbWF0ZSBhcmVhIG9mIHRoZSBwb2x5Z29uIHdlcmUgaXQgcHJvamVjdGVkIG9udG9cbiAqICAgICB0aGUgZWFydGguICBOb3RlIHRoYXQgdGhpcyBhcmVhIHdpbGwgYmUgcG9zaXRpdmUgaWYgcmluZyBpcyBvcmllbnRlZFxuICogICAgIGNsb2Nrd2lzZSwgb3RoZXJ3aXNlIGl0IHdpbGwgYmUgbmVnYXRpdmUuXG4gKlxuICogUmVmZXJlbmNlOlxuICogUm9iZXJ0LiBHLiBDaGFtYmVybGFpbiBhbmQgV2lsbGlhbSBILiBEdXF1ZXR0ZSwgXCJTb21lIEFsZ29yaXRobXMgZm9yXG4gKiAgICAgUG9seWdvbnMgb24gYSBTcGhlcmVcIiwgSlBMIFB1YmxpY2F0aW9uIDA3LTAzLCBKZXQgUHJvcHVsc2lvblxuICogICAgIExhYm9yYXRvcnksIFBhc2FkZW5hLCBDQSwgSnVuZSAyMDA3IGh0dHA6Ly90cnMtbmV3LmpwbC5uYXNhLmdvdi9kc3BhY2UvaGFuZGxlLzIwMTQvNDA0MDlcbiAqXG4gKiBSZXR1cm5zOlxuICoge2Zsb2F0fSBUaGUgYXBwcm94aW1hdGUgc2lnbmVkIGdlb2Rlc2ljIGFyZWEgb2YgdGhlIHBvbHlnb24gaW4gc3F1YXJlXG4gKiAgICAgbWV0ZXJzLlxuICovXG5cbmZ1bmN0aW9uIHJpbmdBcmVhKGNvb3Jkcykge1xuICAgIHZhciBwMSwgcDIsIHAzLCBsb3dlckluZGV4LCBtaWRkbGVJbmRleCwgdXBwZXJJbmRleCwgaSxcbiAgICBhcmVhID0gMCxcbiAgICBjb29yZHNMZW5ndGggPSBjb29yZHMubGVuZ3RoO1xuXG4gICAgaWYgKGNvb3Jkc0xlbmd0aCA+IDIpIHtcbiAgICAgICAgZm9yIChpID0gMDsgaSA8IGNvb3Jkc0xlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBpZiAoaSA9PT0gY29vcmRzTGVuZ3RoIC0gMikgey8vIGkgPSBOLTJcbiAgICAgICAgICAgICAgICBsb3dlckluZGV4ID0gY29vcmRzTGVuZ3RoIC0gMjtcbiAgICAgICAgICAgICAgICBtaWRkbGVJbmRleCA9IGNvb3Jkc0xlbmd0aCAtMTtcbiAgICAgICAgICAgICAgICB1cHBlckluZGV4ID0gMDtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoaSA9PT0gY29vcmRzTGVuZ3RoIC0gMSkgey8vIGkgPSBOLTFcbiAgICAgICAgICAgICAgICBsb3dlckluZGV4ID0gY29vcmRzTGVuZ3RoIC0gMTtcbiAgICAgICAgICAgICAgICBtaWRkbGVJbmRleCA9IDA7XG4gICAgICAgICAgICAgICAgdXBwZXJJbmRleCA9IDE7XG4gICAgICAgICAgICB9IGVsc2UgeyAvLyBpID0gMCB0byBOLTNcbiAgICAgICAgICAgICAgICBsb3dlckluZGV4ID0gaTtcbiAgICAgICAgICAgICAgICBtaWRkbGVJbmRleCA9IGkrMTtcbiAgICAgICAgICAgICAgICB1cHBlckluZGV4ID0gaSsyO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcDEgPSBjb29yZHNbbG93ZXJJbmRleF07XG4gICAgICAgICAgICBwMiA9IGNvb3Jkc1ttaWRkbGVJbmRleF07XG4gICAgICAgICAgICBwMyA9IGNvb3Jkc1t1cHBlckluZGV4XTtcbiAgICAgICAgICAgIGFyZWEgKz0gKCByYWQocDNbMF0pIC0gcmFkKHAxWzBdKSApICogTWF0aC5zaW4oIHJhZChwMlsxXSkpO1xuICAgICAgICB9XG5cbiAgICAgICAgYXJlYSA9IGFyZWEgKiB3Z3M4NC5SQURJVVMgKiB3Z3M4NC5SQURJVVMgLyAyO1xuICAgIH1cblxuICAgIHJldHVybiBhcmVhO1xufVxuXG5mdW5jdGlvbiByYWQoXykge1xuICAgIHJldHVybiBfICogTWF0aC5QSSAvIDE4MDtcbn0iLCJ2YXIgZ2VvanNvbkFyZWEgPSByZXF1aXJlKCdAbWFwYm94L2dlb2pzb24tYXJlYScpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHJld2luZDtcblxuZnVuY3Rpb24gcmV3aW5kKGdqLCBvdXRlcikge1xuICAgIHN3aXRjaCAoKGdqICYmIGdqLnR5cGUpIHx8IG51bGwpIHtcbiAgICAgICAgY2FzZSAnRmVhdHVyZUNvbGxlY3Rpb24nOlxuICAgICAgICAgICAgZ2ouZmVhdHVyZXMgPSBnai5mZWF0dXJlcy5tYXAoY3VycnlPdXRlcihyZXdpbmQsIG91dGVyKSk7XG4gICAgICAgICAgICByZXR1cm4gZ2o7XG4gICAgICAgIGNhc2UgJ0ZlYXR1cmUnOlxuICAgICAgICAgICAgZ2ouZ2VvbWV0cnkgPSByZXdpbmQoZ2ouZ2VvbWV0cnksIG91dGVyKTtcbiAgICAgICAgICAgIHJldHVybiBnajtcbiAgICAgICAgY2FzZSAnUG9seWdvbic6XG4gICAgICAgIGNhc2UgJ011bHRpUG9seWdvbic6XG4gICAgICAgICAgICByZXR1cm4gY29ycmVjdChnaiwgb3V0ZXIpO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgcmV0dXJuIGdqO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gY3VycnlPdXRlcihhLCBiKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKF8pIHsgcmV0dXJuIGEoXywgYik7IH07XG59XG5cbmZ1bmN0aW9uIGNvcnJlY3QoXywgb3V0ZXIpIHtcbiAgICBpZiAoXy50eXBlID09PSAnUG9seWdvbicpIHtcbiAgICAgICAgXy5jb29yZGluYXRlcyA9IGNvcnJlY3RSaW5ncyhfLmNvb3JkaW5hdGVzLCBvdXRlcik7XG4gICAgfSBlbHNlIGlmIChfLnR5cGUgPT09ICdNdWx0aVBvbHlnb24nKSB7XG4gICAgICAgIF8uY29vcmRpbmF0ZXMgPSBfLmNvb3JkaW5hdGVzLm1hcChjdXJyeU91dGVyKGNvcnJlY3RSaW5ncywgb3V0ZXIpKTtcbiAgICB9XG4gICAgcmV0dXJuIF87XG59XG5cbmZ1bmN0aW9uIGNvcnJlY3RSaW5ncyhfLCBvdXRlcikge1xuICAgIG91dGVyID0gISFvdXRlcjtcbiAgICBfWzBdID0gd2luZChfWzBdLCBvdXRlcik7XG4gICAgZm9yICh2YXIgaSA9IDE7IGkgPCBfLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIF9baV0gPSB3aW5kKF9baV0sICFvdXRlcik7XG4gICAgfVxuICAgIHJldHVybiBfO1xufVxuXG5mdW5jdGlvbiB3aW5kKF8sIGRpcikge1xuICAgIHJldHVybiBjdyhfKSA9PT0gZGlyID8gXyA6IF8ucmV2ZXJzZSgpO1xufVxuXG5mdW5jdGlvbiBjdyhfKSB7XG4gICAgcmV0dXJuIGdlb2pzb25BcmVhLnJpbmcoXykgPj0gMDtcbn1cbiIsIi8vIEBmbG93XG5cbmltcG9ydCBQb2ludCBmcm9tICdAbWFwYm94L3BvaW50LWdlb21ldHJ5JztcblxuaW1wb3J0IG12dCBmcm9tICdAbWFwYm94L3ZlY3Rvci10aWxlJztcbmNvbnN0IHRvR2VvSlNPTiA9IG12dC5WZWN0b3JUaWxlRmVhdHVyZS5wcm90b3R5cGUudG9HZW9KU09OO1xuaW1wb3J0IEVYVEVOVCBmcm9tICcuLi9kYXRhL2V4dGVudCc7XG5cbi8vIFRoZSBmZWF0dXJlIHR5cGUgdXNlZCBieSBnZW9qc29uLXZ0IGFuZCBzdXBlcmNsdXN0ZXIuIFNob3VsZCBiZSBleHRyYWN0ZWQgdG9cbi8vIGdsb2JhbCB0eXBlIGFuZCB1c2VkIGluIG1vZHVsZSBkZWZpbml0aW9ucyBmb3IgdGhvc2UgdHdvIG1vZHVsZXMuXG50eXBlIEZlYXR1cmUgPSB7XG4gICAgdHlwZTogMSxcbiAgICBpZDogbWl4ZWQsXG4gICAgdGFnczoge1tzdHJpbmddOiBzdHJpbmcgfCBudW1iZXIgfCBib29sZWFufSxcbiAgICBnZW9tZXRyeTogQXJyYXk8W251bWJlciwgbnVtYmVyXT4sXG59IHwge1xuICAgIHR5cGU6IDIgfCAzLFxuICAgIGlkOiBtaXhlZCxcbiAgICB0YWdzOiB7W3N0cmluZ106IHN0cmluZyB8IG51bWJlciB8IGJvb2xlYW59LFxuICAgIGdlb21ldHJ5OiBBcnJheTxBcnJheTxbbnVtYmVyLCBudW1iZXJdPj4sXG59XG5cbmNsYXNzIEZlYXR1cmVXcmFwcGVyIGltcGxlbWVudHMgVmVjdG9yVGlsZUZlYXR1cmUge1xuICAgIF9mZWF0dXJlOiBGZWF0dXJlO1xuXG4gICAgZXh0ZW50OiBudW1iZXI7XG4gICAgdHlwZTogMSB8IDIgfCAzO1xuICAgIGlkOiBudW1iZXI7XG4gICAgcHJvcGVydGllczoge1tzdHJpbmddOiBzdHJpbmcgfCBudW1iZXIgfCBib29sZWFufTtcblxuICAgIGNvbnN0cnVjdG9yKGZlYXR1cmU6IEZlYXR1cmUpIHtcbiAgICAgICAgdGhpcy5fZmVhdHVyZSA9IGZlYXR1cmU7XG5cbiAgICAgICAgdGhpcy5leHRlbnQgPSBFWFRFTlQ7XG4gICAgICAgIHRoaXMudHlwZSA9IGZlYXR1cmUudHlwZTtcbiAgICAgICAgdGhpcy5wcm9wZXJ0aWVzID0gZmVhdHVyZS50YWdzO1xuXG4gICAgICAgIC8vIElmIHRoZSBmZWF0dXJlIGhhcyBhIHRvcC1sZXZlbCBgaWRgIHByb3BlcnR5LCBjb3B5IGl0IG92ZXIsIGJ1dCBvbmx5XG4gICAgICAgIC8vIGlmIGl0IGNhbiBiZSBjb2VyY2VkIHRvIGFuIGludGVnZXIsIGJlY2F1c2UgdGhpcyB3cmFwcGVyIGlzIHVzZWQgZm9yXG4gICAgICAgIC8vIHNlcmlhbGl6aW5nIGdlb2pzb24gZmVhdHVyZSBkYXRhIGludG8gdmVjdG9yIHRpbGUgUEJGIGRhdGEsIGFuZCB0aGVcbiAgICAgICAgLy8gdmVjdG9yIHRpbGUgc3BlYyBvbmx5IHN1cHBvcnRzIGludGVnZXIgdmFsdWVzIGZvciBmZWF0dXJlIGlkcyAtLVxuICAgICAgICAvLyBhbGxvd2luZyBub24taW50ZWdlciB2YWx1ZXMgaGVyZSByZXN1bHRzIGluIGEgbm9uLWNvbXBsaWFudCBQQkZcbiAgICAgICAgLy8gdGhhdCBjYXVzZXMgYW4gZXhjZXB0aW9uIHdoZW4gaXQgaXMgcGFyc2VkIHdpdGggdmVjdG9yLXRpbGUtanNcbiAgICAgICAgaWYgKCdpZCcgaW4gZmVhdHVyZSAmJiAhaXNOYU4oZmVhdHVyZS5pZCkpIHtcbiAgICAgICAgICAgIHRoaXMuaWQgPSBwYXJzZUludChmZWF0dXJlLmlkLCAxMCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBsb2FkR2VvbWV0cnkoKSB7XG4gICAgICAgIGlmICh0aGlzLl9mZWF0dXJlLnR5cGUgPT09IDEpIHtcbiAgICAgICAgICAgIGNvbnN0IGdlb21ldHJ5ID0gW107XG4gICAgICAgICAgICBmb3IgKGNvbnN0IHBvaW50IG9mIHRoaXMuX2ZlYXR1cmUuZ2VvbWV0cnkpIHtcbiAgICAgICAgICAgICAgICBnZW9tZXRyeS5wdXNoKFtuZXcgUG9pbnQocG9pbnRbMF0sIHBvaW50WzFdKV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGdlb21ldHJ5O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc3QgZ2VvbWV0cnkgPSBbXTtcbiAgICAgICAgICAgIGZvciAoY29uc3QgcmluZyBvZiB0aGlzLl9mZWF0dXJlLmdlb21ldHJ5KSB7XG4gICAgICAgICAgICAgICAgY29uc3QgbmV3UmluZyA9IFtdO1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgcG9pbnQgb2YgcmluZykge1xuICAgICAgICAgICAgICAgICAgICBuZXdSaW5nLnB1c2gobmV3IFBvaW50KHBvaW50WzBdLCBwb2ludFsxXSkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBnZW9tZXRyeS5wdXNoKG5ld1JpbmcpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGdlb21ldHJ5O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgdG9HZW9KU09OKHg6IG51bWJlciwgeTogbnVtYmVyLCB6OiBudW1iZXIpIHtcbiAgICAgICAgcmV0dXJuIHRvR2VvSlNPTi5jYWxsKHRoaXMsIHgsIHksIHopO1xuICAgIH1cbn1cblxuY2xhc3MgR2VvSlNPTldyYXBwZXIgaW1wbGVtZW50cyBWZWN0b3JUaWxlLCBWZWN0b3JUaWxlTGF5ZXIge1xuICAgIGxheWVyczoge1tzdHJpbmddOiBWZWN0b3JUaWxlTGF5ZXJ9O1xuICAgIG5hbWU6IHN0cmluZztcbiAgICBleHRlbnQ6IG51bWJlcjtcbiAgICBsZW5ndGg6IG51bWJlcjtcbiAgICBfZmVhdHVyZXM6IEFycmF5PEZlYXR1cmU+O1xuXG4gICAgY29uc3RydWN0b3IoZmVhdHVyZXM6IEFycmF5PEZlYXR1cmU+KSB7XG4gICAgICAgIHRoaXMubGF5ZXJzID0geyAnX2dlb2pzb25UaWxlTGF5ZXInOiB0aGlzIH07XG4gICAgICAgIHRoaXMubmFtZSA9ICdfZ2VvanNvblRpbGVMYXllcic7XG4gICAgICAgIHRoaXMuZXh0ZW50ID0gRVhURU5UO1xuICAgICAgICB0aGlzLmxlbmd0aCA9IGZlYXR1cmVzLmxlbmd0aDtcbiAgICAgICAgdGhpcy5fZmVhdHVyZXMgPSBmZWF0dXJlcztcbiAgICB9XG5cbiAgICBmZWF0dXJlKGk6IG51bWJlcik6IFZlY3RvclRpbGVGZWF0dXJlIHtcbiAgICAgICAgcmV0dXJuIG5ldyBGZWF0dXJlV3JhcHBlcih0aGlzLl9mZWF0dXJlc1tpXSk7XG4gICAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBHZW9KU09OV3JhcHBlcjtcbiIsIid1c2Ugc3RyaWN0J1xuXG52YXIgUG9pbnQgPSByZXF1aXJlKCdAbWFwYm94L3BvaW50LWdlb21ldHJ5JylcbnZhciBWZWN0b3JUaWxlRmVhdHVyZSA9IHJlcXVpcmUoJ0BtYXBib3gvdmVjdG9yLXRpbGUnKS5WZWN0b3JUaWxlRmVhdHVyZVxuXG5tb2R1bGUuZXhwb3J0cyA9IEdlb0pTT05XcmFwcGVyXG5cbi8vIGNvbmZvcm0gdG8gdmVjdG9ydGlsZSBhcGlcbmZ1bmN0aW9uIEdlb0pTT05XcmFwcGVyIChmZWF0dXJlcywgb3B0aW9ucykge1xuICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zIHx8IHt9XG4gIHRoaXMuZmVhdHVyZXMgPSBmZWF0dXJlc1xuICB0aGlzLmxlbmd0aCA9IGZlYXR1cmVzLmxlbmd0aFxufVxuXG5HZW9KU09OV3JhcHBlci5wcm90b3R5cGUuZmVhdHVyZSA9IGZ1bmN0aW9uIChpKSB7XG4gIHJldHVybiBuZXcgRmVhdHVyZVdyYXBwZXIodGhpcy5mZWF0dXJlc1tpXSwgdGhpcy5vcHRpb25zLmV4dGVudClcbn1cblxuZnVuY3Rpb24gRmVhdHVyZVdyYXBwZXIgKGZlYXR1cmUsIGV4dGVudCkge1xuICB0aGlzLmlkID0gdHlwZW9mIGZlYXR1cmUuaWQgPT09ICdudW1iZXInID8gZmVhdHVyZS5pZCA6IHVuZGVmaW5lZFxuICB0aGlzLnR5cGUgPSBmZWF0dXJlLnR5cGVcbiAgdGhpcy5yYXdHZW9tZXRyeSA9IGZlYXR1cmUudHlwZSA9PT0gMSA/IFtmZWF0dXJlLmdlb21ldHJ5XSA6IGZlYXR1cmUuZ2VvbWV0cnlcbiAgdGhpcy5wcm9wZXJ0aWVzID0gZmVhdHVyZS50YWdzXG4gIHRoaXMuZXh0ZW50ID0gZXh0ZW50IHx8IDQwOTZcbn1cblxuRmVhdHVyZVdyYXBwZXIucHJvdG90eXBlLmxvYWRHZW9tZXRyeSA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIHJpbmdzID0gdGhpcy5yYXdHZW9tZXRyeVxuICB0aGlzLmdlb21ldHJ5ID0gW11cblxuICBmb3IgKHZhciBpID0gMDsgaSA8IHJpbmdzLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIHJpbmcgPSByaW5nc1tpXVxuICAgIHZhciBuZXdSaW5nID0gW11cbiAgICBmb3IgKHZhciBqID0gMDsgaiA8IHJpbmcubGVuZ3RoOyBqKyspIHtcbiAgICAgIG5ld1JpbmcucHVzaChuZXcgUG9pbnQocmluZ1tqXVswXSwgcmluZ1tqXVsxXSkpXG4gICAgfVxuICAgIHRoaXMuZ2VvbWV0cnkucHVzaChuZXdSaW5nKVxuICB9XG4gIHJldHVybiB0aGlzLmdlb21ldHJ5XG59XG5cbkZlYXR1cmVXcmFwcGVyLnByb3RvdHlwZS5iYm94ID0gZnVuY3Rpb24gKCkge1xuICBpZiAoIXRoaXMuZ2VvbWV0cnkpIHRoaXMubG9hZEdlb21ldHJ5KClcblxuICB2YXIgcmluZ3MgPSB0aGlzLmdlb21ldHJ5XG4gIHZhciB4MSA9IEluZmluaXR5XG4gIHZhciB4MiA9IC1JbmZpbml0eVxuICB2YXIgeTEgPSBJbmZpbml0eVxuICB2YXIgeTIgPSAtSW5maW5pdHlcblxuICBmb3IgKHZhciBpID0gMDsgaSA8IHJpbmdzLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIHJpbmcgPSByaW5nc1tpXVxuXG4gICAgZm9yICh2YXIgaiA9IDA7IGogPCByaW5nLmxlbmd0aDsgaisrKSB7XG4gICAgICB2YXIgY29vcmQgPSByaW5nW2pdXG5cbiAgICAgIHgxID0gTWF0aC5taW4oeDEsIGNvb3JkLngpXG4gICAgICB4MiA9IE1hdGgubWF4KHgyLCBjb29yZC54KVxuICAgICAgeTEgPSBNYXRoLm1pbih5MSwgY29vcmQueSlcbiAgICAgIHkyID0gTWF0aC5tYXgoeTIsIGNvb3JkLnkpXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIFt4MSwgeTEsIHgyLCB5Ml1cbn1cblxuRmVhdHVyZVdyYXBwZXIucHJvdG90eXBlLnRvR2VvSlNPTiA9IFZlY3RvclRpbGVGZWF0dXJlLnByb3RvdHlwZS50b0dlb0pTT05cbiIsInZhciBQYmYgPSByZXF1aXJlKCdwYmYnKVxudmFyIEdlb0pTT05XcmFwcGVyID0gcmVxdWlyZSgnLi9saWIvZ2VvanNvbl93cmFwcGVyJylcblxubW9kdWxlLmV4cG9ydHMgPSBmcm9tVmVjdG9yVGlsZUpzXG5tb2R1bGUuZXhwb3J0cy5mcm9tVmVjdG9yVGlsZUpzID0gZnJvbVZlY3RvclRpbGVKc1xubW9kdWxlLmV4cG9ydHMuZnJvbUdlb2pzb25WdCA9IGZyb21HZW9qc29uVnRcbm1vZHVsZS5leHBvcnRzLkdlb0pTT05XcmFwcGVyID0gR2VvSlNPTldyYXBwZXJcblxuLyoqXG4gKiBTZXJpYWxpemUgYSB2ZWN0b3ItdGlsZS1qcy1jcmVhdGVkIHRpbGUgdG8gcGJmXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHRpbGVcbiAqIEByZXR1cm4ge0J1ZmZlcn0gdW5jb21wcmVzc2VkLCBwYmYtc2VyaWFsaXplZCB0aWxlIGRhdGFcbiAqL1xuZnVuY3Rpb24gZnJvbVZlY3RvclRpbGVKcyAodGlsZSkge1xuICB2YXIgb3V0ID0gbmV3IFBiZigpXG4gIHdyaXRlVGlsZSh0aWxlLCBvdXQpXG4gIHJldHVybiBvdXQuZmluaXNoKClcbn1cblxuLyoqXG4gKiBTZXJpYWxpemVkIGEgZ2VvanNvbi12dC1jcmVhdGVkIHRpbGUgdG8gcGJmLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBsYXllcnMgLSBBbiBvYmplY3QgbWFwcGluZyBsYXllciBuYW1lcyB0byBnZW9qc29uLXZ0LWNyZWF0ZWQgdmVjdG9yIHRpbGUgb2JqZWN0c1xuICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXSAtIEFuIG9iamVjdCBzcGVjaWZ5aW5nIHRoZSB2ZWN0b3ItdGlsZSBzcGVjaWZpY2F0aW9uIHZlcnNpb24gYW5kIGV4dGVudCB0aGF0IHdlcmUgdXNlZCB0byBjcmVhdGUgYGxheWVyc2AuXG4gKiBAcGFyYW0ge051bWJlcn0gW29wdGlvbnMudmVyc2lvbj0xXSAtIFZlcnNpb24gb2YgdmVjdG9yLXRpbGUgc3BlYyB1c2VkXG4gKiBAcGFyYW0ge051bWJlcn0gW29wdGlvbnMuZXh0ZW50PTQwOTZdIC0gRXh0ZW50IG9mIHRoZSB2ZWN0b3IgdGlsZVxuICogQHJldHVybiB7QnVmZmVyfSB1bmNvbXByZXNzZWQsIHBiZi1zZXJpYWxpemVkIHRpbGUgZGF0YVxuICovXG5mdW5jdGlvbiBmcm9tR2VvanNvblZ0IChsYXllcnMsIG9wdGlvbnMpIHtcbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge31cbiAgdmFyIGwgPSB7fVxuICBmb3IgKHZhciBrIGluIGxheWVycykge1xuICAgIGxba10gPSBuZXcgR2VvSlNPTldyYXBwZXIobGF5ZXJzW2tdLmZlYXR1cmVzLCBvcHRpb25zKVxuICAgIGxba10ubmFtZSA9IGtcbiAgICBsW2tdLnZlcnNpb24gPSBvcHRpb25zLnZlcnNpb25cbiAgICBsW2tdLmV4dGVudCA9IG9wdGlvbnMuZXh0ZW50XG4gIH1cbiAgcmV0dXJuIGZyb21WZWN0b3JUaWxlSnMoe2xheWVyczogbH0pXG59XG5cbmZ1bmN0aW9uIHdyaXRlVGlsZSAodGlsZSwgcGJmKSB7XG4gIGZvciAodmFyIGtleSBpbiB0aWxlLmxheWVycykge1xuICAgIHBiZi53cml0ZU1lc3NhZ2UoMywgd3JpdGVMYXllciwgdGlsZS5sYXllcnNba2V5XSlcbiAgfVxufVxuXG5mdW5jdGlvbiB3cml0ZUxheWVyIChsYXllciwgcGJmKSB7XG4gIHBiZi53cml0ZVZhcmludEZpZWxkKDE1LCBsYXllci52ZXJzaW9uIHx8IDEpXG4gIHBiZi53cml0ZVN0cmluZ0ZpZWxkKDEsIGxheWVyLm5hbWUgfHwgJycpXG4gIHBiZi53cml0ZVZhcmludEZpZWxkKDUsIGxheWVyLmV4dGVudCB8fCA0MDk2KVxuXG4gIHZhciBpXG4gIHZhciBjb250ZXh0ID0ge1xuICAgIGtleXM6IFtdLFxuICAgIHZhbHVlczogW10sXG4gICAga2V5Y2FjaGU6IHt9LFxuICAgIHZhbHVlY2FjaGU6IHt9XG4gIH1cblxuICBmb3IgKGkgPSAwOyBpIDwgbGF5ZXIubGVuZ3RoOyBpKyspIHtcbiAgICBjb250ZXh0LmZlYXR1cmUgPSBsYXllci5mZWF0dXJlKGkpXG4gICAgcGJmLndyaXRlTWVzc2FnZSgyLCB3cml0ZUZlYXR1cmUsIGNvbnRleHQpXG4gIH1cblxuICB2YXIga2V5cyA9IGNvbnRleHQua2V5c1xuICBmb3IgKGkgPSAwOyBpIDwga2V5cy5sZW5ndGg7IGkrKykge1xuICAgIHBiZi53cml0ZVN0cmluZ0ZpZWxkKDMsIGtleXNbaV0pXG4gIH1cblxuICB2YXIgdmFsdWVzID0gY29udGV4dC52YWx1ZXNcbiAgZm9yIChpID0gMDsgaSA8IHZhbHVlcy5sZW5ndGg7IGkrKykge1xuICAgIHBiZi53cml0ZU1lc3NhZ2UoNCwgd3JpdGVWYWx1ZSwgdmFsdWVzW2ldKVxuICB9XG59XG5cbmZ1bmN0aW9uIHdyaXRlRmVhdHVyZSAoY29udGV4dCwgcGJmKSB7XG4gIHZhciBmZWF0dXJlID0gY29udGV4dC5mZWF0dXJlXG5cbiAgaWYgKGZlYXR1cmUuaWQgIT09IHVuZGVmaW5lZCkge1xuICAgIHBiZi53cml0ZVZhcmludEZpZWxkKDEsIGZlYXR1cmUuaWQpXG4gIH1cblxuICBwYmYud3JpdGVNZXNzYWdlKDIsIHdyaXRlUHJvcGVydGllcywgY29udGV4dClcbiAgcGJmLndyaXRlVmFyaW50RmllbGQoMywgZmVhdHVyZS50eXBlKVxuICBwYmYud3JpdGVNZXNzYWdlKDQsIHdyaXRlR2VvbWV0cnksIGZlYXR1cmUpXG59XG5cbmZ1bmN0aW9uIHdyaXRlUHJvcGVydGllcyAoY29udGV4dCwgcGJmKSB7XG4gIHZhciBmZWF0dXJlID0gY29udGV4dC5mZWF0dXJlXG4gIHZhciBrZXlzID0gY29udGV4dC5rZXlzXG4gIHZhciB2YWx1ZXMgPSBjb250ZXh0LnZhbHVlc1xuICB2YXIga2V5Y2FjaGUgPSBjb250ZXh0LmtleWNhY2hlXG4gIHZhciB2YWx1ZWNhY2hlID0gY29udGV4dC52YWx1ZWNhY2hlXG5cbiAgZm9yICh2YXIga2V5IGluIGZlYXR1cmUucHJvcGVydGllcykge1xuICAgIHZhciBrZXlJbmRleCA9IGtleWNhY2hlW2tleV1cbiAgICBpZiAodHlwZW9mIGtleUluZGV4ID09PSAndW5kZWZpbmVkJykge1xuICAgICAga2V5cy5wdXNoKGtleSlcbiAgICAgIGtleUluZGV4ID0ga2V5cy5sZW5ndGggLSAxXG4gICAgICBrZXljYWNoZVtrZXldID0ga2V5SW5kZXhcbiAgICB9XG4gICAgcGJmLndyaXRlVmFyaW50KGtleUluZGV4KVxuXG4gICAgdmFyIHZhbHVlID0gZmVhdHVyZS5wcm9wZXJ0aWVzW2tleV1cbiAgICB2YXIgdHlwZSA9IHR5cGVvZiB2YWx1ZVxuICAgIGlmICh0eXBlICE9PSAnc3RyaW5nJyAmJiB0eXBlICE9PSAnYm9vbGVhbicgJiYgdHlwZSAhPT0gJ251bWJlcicpIHtcbiAgICAgIHZhbHVlID0gSlNPTi5zdHJpbmdpZnkodmFsdWUpXG4gICAgfVxuICAgIHZhciB2YWx1ZUtleSA9IHR5cGUgKyAnOicgKyB2YWx1ZVxuICAgIHZhciB2YWx1ZUluZGV4ID0gdmFsdWVjYWNoZVt2YWx1ZUtleV1cbiAgICBpZiAodHlwZW9mIHZhbHVlSW5kZXggPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICB2YWx1ZXMucHVzaCh2YWx1ZSlcbiAgICAgIHZhbHVlSW5kZXggPSB2YWx1ZXMubGVuZ3RoIC0gMVxuICAgICAgdmFsdWVjYWNoZVt2YWx1ZUtleV0gPSB2YWx1ZUluZGV4XG4gICAgfVxuICAgIHBiZi53cml0ZVZhcmludCh2YWx1ZUluZGV4KVxuICB9XG59XG5cbmZ1bmN0aW9uIGNvbW1hbmQgKGNtZCwgbGVuZ3RoKSB7XG4gIHJldHVybiAobGVuZ3RoIDw8IDMpICsgKGNtZCAmIDB4Nylcbn1cblxuZnVuY3Rpb24gemlnemFnIChudW0pIHtcbiAgcmV0dXJuIChudW0gPDwgMSkgXiAobnVtID4+IDMxKVxufVxuXG5mdW5jdGlvbiB3cml0ZUdlb21ldHJ5IChmZWF0dXJlLCBwYmYpIHtcbiAgdmFyIGdlb21ldHJ5ID0gZmVhdHVyZS5sb2FkR2VvbWV0cnkoKVxuICB2YXIgdHlwZSA9IGZlYXR1cmUudHlwZVxuICB2YXIgeCA9IDBcbiAgdmFyIHkgPSAwXG4gIHZhciByaW5ncyA9IGdlb21ldHJ5Lmxlbmd0aFxuICBmb3IgKHZhciByID0gMDsgciA8IHJpbmdzOyByKyspIHtcbiAgICB2YXIgcmluZyA9IGdlb21ldHJ5W3JdXG4gICAgdmFyIGNvdW50ID0gMVxuICAgIGlmICh0eXBlID09PSAxKSB7XG4gICAgICBjb3VudCA9IHJpbmcubGVuZ3RoXG4gICAgfVxuICAgIHBiZi53cml0ZVZhcmludChjb21tYW5kKDEsIGNvdW50KSkgLy8gbW92ZXRvXG4gICAgLy8gZG8gbm90IHdyaXRlIHBvbHlnb24gY2xvc2luZyBwYXRoIGFzIGxpbmV0b1xuICAgIHZhciBsaW5lQ291bnQgPSB0eXBlID09PSAzID8gcmluZy5sZW5ndGggLSAxIDogcmluZy5sZW5ndGhcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxpbmVDb3VudDsgaSsrKSB7XG4gICAgICBpZiAoaSA9PT0gMSAmJiB0eXBlICE9PSAxKSB7XG4gICAgICAgIHBiZi53cml0ZVZhcmludChjb21tYW5kKDIsIGxpbmVDb3VudCAtIDEpKSAvLyBsaW5ldG9cbiAgICAgIH1cbiAgICAgIHZhciBkeCA9IHJpbmdbaV0ueCAtIHhcbiAgICAgIHZhciBkeSA9IHJpbmdbaV0ueSAtIHlcbiAgICAgIHBiZi53cml0ZVZhcmludCh6aWd6YWcoZHgpKVxuICAgICAgcGJmLndyaXRlVmFyaW50KHppZ3phZyhkeSkpXG4gICAgICB4ICs9IGR4XG4gICAgICB5ICs9IGR5XG4gICAgfVxuICAgIGlmICh0eXBlID09PSAzKSB7XG4gICAgICBwYmYud3JpdGVWYXJpbnQoY29tbWFuZCg3LCAwKSkgLy8gY2xvc2VwYXRoXG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIHdyaXRlVmFsdWUgKHZhbHVlLCBwYmYpIHtcbiAgdmFyIHR5cGUgPSB0eXBlb2YgdmFsdWVcbiAgaWYgKHR5cGUgPT09ICdzdHJpbmcnKSB7XG4gICAgcGJmLndyaXRlU3RyaW5nRmllbGQoMSwgdmFsdWUpXG4gIH0gZWxzZSBpZiAodHlwZSA9PT0gJ2Jvb2xlYW4nKSB7XG4gICAgcGJmLndyaXRlQm9vbGVhbkZpZWxkKDcsIHZhbHVlKVxuICB9IGVsc2UgaWYgKHR5cGUgPT09ICdudW1iZXInKSB7XG4gICAgaWYgKHZhbHVlICUgMSAhPT0gMCkge1xuICAgICAgcGJmLndyaXRlRG91YmxlRmllbGQoMywgdmFsdWUpXG4gICAgfSBlbHNlIGlmICh2YWx1ZSA8IDApIHtcbiAgICAgIHBiZi53cml0ZVNWYXJpbnRGaWVsZCg2LCB2YWx1ZSlcbiAgICB9IGVsc2Uge1xuICAgICAgcGJmLndyaXRlVmFyaW50RmllbGQoNSwgdmFsdWUpXG4gICAgfVxuICB9XG59XG4iLCJcbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIHNvcnRLRChpZHMsIGNvb3Jkcywgbm9kZVNpemUsIGxlZnQsIHJpZ2h0LCBkZXB0aCkge1xuICAgIGlmIChyaWdodCAtIGxlZnQgPD0gbm9kZVNpemUpIHJldHVybjtcblxuICAgIHZhciBtID0gTWF0aC5mbG9vcigobGVmdCArIHJpZ2h0KSAvIDIpO1xuXG4gICAgc2VsZWN0KGlkcywgY29vcmRzLCBtLCBsZWZ0LCByaWdodCwgZGVwdGggJSAyKTtcblxuICAgIHNvcnRLRChpZHMsIGNvb3Jkcywgbm9kZVNpemUsIGxlZnQsIG0gLSAxLCBkZXB0aCArIDEpO1xuICAgIHNvcnRLRChpZHMsIGNvb3Jkcywgbm9kZVNpemUsIG0gKyAxLCByaWdodCwgZGVwdGggKyAxKTtcbn1cblxuZnVuY3Rpb24gc2VsZWN0KGlkcywgY29vcmRzLCBrLCBsZWZ0LCByaWdodCwgaW5jKSB7XG5cbiAgICB3aGlsZSAocmlnaHQgPiBsZWZ0KSB7XG4gICAgICAgIGlmIChyaWdodCAtIGxlZnQgPiA2MDApIHtcbiAgICAgICAgICAgIHZhciBuID0gcmlnaHQgLSBsZWZ0ICsgMTtcbiAgICAgICAgICAgIHZhciBtID0gayAtIGxlZnQgKyAxO1xuICAgICAgICAgICAgdmFyIHogPSBNYXRoLmxvZyhuKTtcbiAgICAgICAgICAgIHZhciBzID0gMC41ICogTWF0aC5leHAoMiAqIHogLyAzKTtcbiAgICAgICAgICAgIHZhciBzZCA9IDAuNSAqIE1hdGguc3FydCh6ICogcyAqIChuIC0gcykgLyBuKSAqIChtIC0gbiAvIDIgPCAwID8gLTEgOiAxKTtcbiAgICAgICAgICAgIHZhciBuZXdMZWZ0ID0gTWF0aC5tYXgobGVmdCwgTWF0aC5mbG9vcihrIC0gbSAqIHMgLyBuICsgc2QpKTtcbiAgICAgICAgICAgIHZhciBuZXdSaWdodCA9IE1hdGgubWluKHJpZ2h0LCBNYXRoLmZsb29yKGsgKyAobiAtIG0pICogcyAvIG4gKyBzZCkpO1xuICAgICAgICAgICAgc2VsZWN0KGlkcywgY29vcmRzLCBrLCBuZXdMZWZ0LCBuZXdSaWdodCwgaW5jKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciB0ID0gY29vcmRzWzIgKiBrICsgaW5jXTtcbiAgICAgICAgdmFyIGkgPSBsZWZ0O1xuICAgICAgICB2YXIgaiA9IHJpZ2h0O1xuXG4gICAgICAgIHN3YXBJdGVtKGlkcywgY29vcmRzLCBsZWZ0LCBrKTtcbiAgICAgICAgaWYgKGNvb3Jkc1syICogcmlnaHQgKyBpbmNdID4gdCkgc3dhcEl0ZW0oaWRzLCBjb29yZHMsIGxlZnQsIHJpZ2h0KTtcblxuICAgICAgICB3aGlsZSAoaSA8IGopIHtcbiAgICAgICAgICAgIHN3YXBJdGVtKGlkcywgY29vcmRzLCBpLCBqKTtcbiAgICAgICAgICAgIGkrKztcbiAgICAgICAgICAgIGotLTtcbiAgICAgICAgICAgIHdoaWxlIChjb29yZHNbMiAqIGkgKyBpbmNdIDwgdCkgaSsrO1xuICAgICAgICAgICAgd2hpbGUgKGNvb3Jkc1syICogaiArIGluY10gPiB0KSBqLS07XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY29vcmRzWzIgKiBsZWZ0ICsgaW5jXSA9PT0gdCkgc3dhcEl0ZW0oaWRzLCBjb29yZHMsIGxlZnQsIGopO1xuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGorKztcbiAgICAgICAgICAgIHN3YXBJdGVtKGlkcywgY29vcmRzLCBqLCByaWdodCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoaiA8PSBrKSBsZWZ0ID0gaiArIDE7XG4gICAgICAgIGlmIChrIDw9IGopIHJpZ2h0ID0gaiAtIDE7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBzd2FwSXRlbShpZHMsIGNvb3JkcywgaSwgaikge1xuICAgIHN3YXAoaWRzLCBpLCBqKTtcbiAgICBzd2FwKGNvb3JkcywgMiAqIGksIDIgKiBqKTtcbiAgICBzd2FwKGNvb3JkcywgMiAqIGkgKyAxLCAyICogaiArIDEpO1xufVxuXG5mdW5jdGlvbiBzd2FwKGFyciwgaSwgaikge1xuICAgIHZhciB0bXAgPSBhcnJbaV07XG4gICAgYXJyW2ldID0gYXJyW2pdO1xuICAgIGFycltqXSA9IHRtcDtcbn1cbiIsIlxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gcmFuZ2UoaWRzLCBjb29yZHMsIG1pblgsIG1pblksIG1heFgsIG1heFksIG5vZGVTaXplKSB7XG4gICAgdmFyIHN0YWNrID0gWzAsIGlkcy5sZW5ndGggLSAxLCAwXTtcbiAgICB2YXIgcmVzdWx0ID0gW107XG4gICAgdmFyIHgsIHk7XG5cbiAgICB3aGlsZSAoc3RhY2subGVuZ3RoKSB7XG4gICAgICAgIHZhciBheGlzID0gc3RhY2sucG9wKCk7XG4gICAgICAgIHZhciByaWdodCA9IHN0YWNrLnBvcCgpO1xuICAgICAgICB2YXIgbGVmdCA9IHN0YWNrLnBvcCgpO1xuXG4gICAgICAgIGlmIChyaWdodCAtIGxlZnQgPD0gbm9kZVNpemUpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSBsZWZ0OyBpIDw9IHJpZ2h0OyBpKyspIHtcbiAgICAgICAgICAgICAgICB4ID0gY29vcmRzWzIgKiBpXTtcbiAgICAgICAgICAgICAgICB5ID0gY29vcmRzWzIgKiBpICsgMV07XG4gICAgICAgICAgICAgICAgaWYgKHggPj0gbWluWCAmJiB4IDw9IG1heFggJiYgeSA+PSBtaW5ZICYmIHkgPD0gbWF4WSkgcmVzdWx0LnB1c2goaWRzW2ldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIG0gPSBNYXRoLmZsb29yKChsZWZ0ICsgcmlnaHQpIC8gMik7XG5cbiAgICAgICAgeCA9IGNvb3Jkc1syICogbV07XG4gICAgICAgIHkgPSBjb29yZHNbMiAqIG0gKyAxXTtcblxuICAgICAgICBpZiAoeCA+PSBtaW5YICYmIHggPD0gbWF4WCAmJiB5ID49IG1pblkgJiYgeSA8PSBtYXhZKSByZXN1bHQucHVzaChpZHNbbV0pO1xuXG4gICAgICAgIHZhciBuZXh0QXhpcyA9IChheGlzICsgMSkgJSAyO1xuXG4gICAgICAgIGlmIChheGlzID09PSAwID8gbWluWCA8PSB4IDogbWluWSA8PSB5KSB7XG4gICAgICAgICAgICBzdGFjay5wdXNoKGxlZnQpO1xuICAgICAgICAgICAgc3RhY2sucHVzaChtIC0gMSk7XG4gICAgICAgICAgICBzdGFjay5wdXNoKG5leHRBeGlzKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoYXhpcyA9PT0gMCA/IG1heFggPj0geCA6IG1heFkgPj0geSkge1xuICAgICAgICAgICAgc3RhY2sucHVzaChtICsgMSk7XG4gICAgICAgICAgICBzdGFjay5wdXNoKHJpZ2h0KTtcbiAgICAgICAgICAgIHN0YWNrLnB1c2gobmV4dEF4aXMpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlc3VsdDtcbn1cbiIsIlxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gd2l0aGluKGlkcywgY29vcmRzLCBxeCwgcXksIHIsIG5vZGVTaXplKSB7XG4gICAgdmFyIHN0YWNrID0gWzAsIGlkcy5sZW5ndGggLSAxLCAwXTtcbiAgICB2YXIgcmVzdWx0ID0gW107XG4gICAgdmFyIHIyID0gciAqIHI7XG5cbiAgICB3aGlsZSAoc3RhY2subGVuZ3RoKSB7XG4gICAgICAgIHZhciBheGlzID0gc3RhY2sucG9wKCk7XG4gICAgICAgIHZhciByaWdodCA9IHN0YWNrLnBvcCgpO1xuICAgICAgICB2YXIgbGVmdCA9IHN0YWNrLnBvcCgpO1xuXG4gICAgICAgIGlmIChyaWdodCAtIGxlZnQgPD0gbm9kZVNpemUpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSBsZWZ0OyBpIDw9IHJpZ2h0OyBpKyspIHtcbiAgICAgICAgICAgICAgICBpZiAoc3FEaXN0KGNvb3Jkc1syICogaV0sIGNvb3Jkc1syICogaSArIDFdLCBxeCwgcXkpIDw9IHIyKSByZXN1bHQucHVzaChpZHNbaV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgbSA9IE1hdGguZmxvb3IoKGxlZnQgKyByaWdodCkgLyAyKTtcblxuICAgICAgICB2YXIgeCA9IGNvb3Jkc1syICogbV07XG4gICAgICAgIHZhciB5ID0gY29vcmRzWzIgKiBtICsgMV07XG5cbiAgICAgICAgaWYgKHNxRGlzdCh4LCB5LCBxeCwgcXkpIDw9IHIyKSByZXN1bHQucHVzaChpZHNbbV0pO1xuXG4gICAgICAgIHZhciBuZXh0QXhpcyA9IChheGlzICsgMSkgJSAyO1xuXG4gICAgICAgIGlmIChheGlzID09PSAwID8gcXggLSByIDw9IHggOiBxeSAtIHIgPD0geSkge1xuICAgICAgICAgICAgc3RhY2sucHVzaChsZWZ0KTtcbiAgICAgICAgICAgIHN0YWNrLnB1c2gobSAtIDEpO1xuICAgICAgICAgICAgc3RhY2sucHVzaChuZXh0QXhpcyk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGF4aXMgPT09IDAgPyBxeCArIHIgPj0geCA6IHF5ICsgciA+PSB5KSB7XG4gICAgICAgICAgICBzdGFjay5wdXNoKG0gKyAxKTtcbiAgICAgICAgICAgIHN0YWNrLnB1c2gocmlnaHQpO1xuICAgICAgICAgICAgc3RhY2sucHVzaChuZXh0QXhpcyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gcmVzdWx0O1xufVxuXG5mdW5jdGlvbiBzcURpc3QoYXgsIGF5LCBieCwgYnkpIHtcbiAgICB2YXIgZHggPSBheCAtIGJ4O1xuICAgIHZhciBkeSA9IGF5IC0gYnk7XG4gICAgcmV0dXJuIGR4ICogZHggKyBkeSAqIGR5O1xufVxuIiwiXG5pbXBvcnQgc29ydCBmcm9tICcuL3NvcnQnO1xuaW1wb3J0IHJhbmdlIGZyb20gJy4vcmFuZ2UnO1xuaW1wb3J0IHdpdGhpbiBmcm9tICcuL3dpdGhpbic7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGtkYnVzaChwb2ludHMsIGdldFgsIGdldFksIG5vZGVTaXplLCBBcnJheVR5cGUpIHtcbiAgICByZXR1cm4gbmV3IEtEQnVzaChwb2ludHMsIGdldFgsIGdldFksIG5vZGVTaXplLCBBcnJheVR5cGUpO1xufVxuXG5mdW5jdGlvbiBLREJ1c2gocG9pbnRzLCBnZXRYLCBnZXRZLCBub2RlU2l6ZSwgQXJyYXlUeXBlKSB7XG4gICAgZ2V0WCA9IGdldFggfHwgZGVmYXVsdEdldFg7XG4gICAgZ2V0WSA9IGdldFkgfHwgZGVmYXVsdEdldFk7XG4gICAgQXJyYXlUeXBlID0gQXJyYXlUeXBlIHx8IEFycmF5O1xuXG4gICAgdGhpcy5ub2RlU2l6ZSA9IG5vZGVTaXplIHx8IDY0O1xuICAgIHRoaXMucG9pbnRzID0gcG9pbnRzO1xuXG4gICAgdGhpcy5pZHMgPSBuZXcgQXJyYXlUeXBlKHBvaW50cy5sZW5ndGgpO1xuICAgIHRoaXMuY29vcmRzID0gbmV3IEFycmF5VHlwZShwb2ludHMubGVuZ3RoICogMik7XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHBvaW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICB0aGlzLmlkc1tpXSA9IGk7XG4gICAgICAgIHRoaXMuY29vcmRzWzIgKiBpXSA9IGdldFgocG9pbnRzW2ldKTtcbiAgICAgICAgdGhpcy5jb29yZHNbMiAqIGkgKyAxXSA9IGdldFkocG9pbnRzW2ldKTtcbiAgICB9XG5cbiAgICBzb3J0KHRoaXMuaWRzLCB0aGlzLmNvb3JkcywgdGhpcy5ub2RlU2l6ZSwgMCwgdGhpcy5pZHMubGVuZ3RoIC0gMSwgMCk7XG59XG5cbktEQnVzaC5wcm90b3R5cGUgPSB7XG4gICAgcmFuZ2U6IGZ1bmN0aW9uIChtaW5YLCBtaW5ZLCBtYXhYLCBtYXhZKSB7XG4gICAgICAgIHJldHVybiByYW5nZSh0aGlzLmlkcywgdGhpcy5jb29yZHMsIG1pblgsIG1pblksIG1heFgsIG1heFksIHRoaXMubm9kZVNpemUpO1xuICAgIH0sXG5cbiAgICB3aXRoaW46IGZ1bmN0aW9uICh4LCB5LCByKSB7XG4gICAgICAgIHJldHVybiB3aXRoaW4odGhpcy5pZHMsIHRoaXMuY29vcmRzLCB4LCB5LCByLCB0aGlzLm5vZGVTaXplKTtcbiAgICB9XG59O1xuXG5mdW5jdGlvbiBkZWZhdWx0R2V0WChwKSB7IHJldHVybiBwWzBdOyB9XG5mdW5jdGlvbiBkZWZhdWx0R2V0WShwKSB7IHJldHVybiBwWzFdOyB9XG4iLCJcbmltcG9ydCBrZGJ1c2ggZnJvbSAna2RidXNoJztcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gc3VwZXJjbHVzdGVyKG9wdGlvbnMpIHtcbiAgICByZXR1cm4gbmV3IFN1cGVyQ2x1c3RlcihvcHRpb25zKTtcbn1cblxuZnVuY3Rpb24gU3VwZXJDbHVzdGVyKG9wdGlvbnMpIHtcbiAgICB0aGlzLm9wdGlvbnMgPSBleHRlbmQoT2JqZWN0LmNyZWF0ZSh0aGlzLm9wdGlvbnMpLCBvcHRpb25zKTtcbiAgICB0aGlzLnRyZWVzID0gbmV3IEFycmF5KHRoaXMub3B0aW9ucy5tYXhab29tICsgMSk7XG59XG5cblN1cGVyQ2x1c3Rlci5wcm90b3R5cGUgPSB7XG4gICAgb3B0aW9uczoge1xuICAgICAgICBtaW5ab29tOiAwLCAgIC8vIG1pbiB6b29tIHRvIGdlbmVyYXRlIGNsdXN0ZXJzIG9uXG4gICAgICAgIG1heFpvb206IDE2LCAgLy8gbWF4IHpvb20gbGV2ZWwgdG8gY2x1c3RlciB0aGUgcG9pbnRzIG9uXG4gICAgICAgIHJhZGl1czogNDAsICAgLy8gY2x1c3RlciByYWRpdXMgaW4gcGl4ZWxzXG4gICAgICAgIGV4dGVudDogNTEyLCAgLy8gdGlsZSBleHRlbnQgKHJhZGl1cyBpcyBjYWxjdWxhdGVkIHJlbGF0aXZlIHRvIGl0KVxuICAgICAgICBub2RlU2l6ZTogNjQsIC8vIHNpemUgb2YgdGhlIEtELXRyZWUgbGVhZiBub2RlLCBhZmZlY3RzIHBlcmZvcm1hbmNlXG4gICAgICAgIGxvZzogZmFsc2UsICAgLy8gd2hldGhlciB0byBsb2cgdGltaW5nIGluZm9cblxuICAgICAgICAvLyBhIHJlZHVjZSBmdW5jdGlvbiBmb3IgY2FsY3VsYXRpbmcgY3VzdG9tIGNsdXN0ZXIgcHJvcGVydGllc1xuICAgICAgICByZWR1Y2U6IG51bGwsIC8vIGZ1bmN0aW9uIChhY2N1bXVsYXRlZCwgcHJvcHMpIHsgYWNjdW11bGF0ZWQuc3VtICs9IHByb3BzLnN1bTsgfVxuXG4gICAgICAgIC8vIGluaXRpYWwgcHJvcGVydGllcyBvZiBhIGNsdXN0ZXIgKGJlZm9yZSBydW5uaW5nIHRoZSByZWR1Y2VyKVxuICAgICAgICBpbml0aWFsOiBmdW5jdGlvbiAoKSB7IHJldHVybiB7fTsgfSwgLy8gZnVuY3Rpb24gKCkgeyByZXR1cm4ge3N1bTogMH07IH0sXG5cbiAgICAgICAgLy8gcHJvcGVydGllcyB0byB1c2UgZm9yIGluZGl2aWR1YWwgcG9pbnRzIHdoZW4gcnVubmluZyB0aGUgcmVkdWNlclxuICAgICAgICBtYXA6IGZ1bmN0aW9uIChwcm9wcykgeyByZXR1cm4gcHJvcHM7IH0gLy8gZnVuY3Rpb24gKHByb3BzKSB7IHJldHVybiB7c3VtOiBwcm9wcy5teV92YWx1ZX07IH0sXG4gICAgfSxcblxuICAgIGxvYWQ6IGZ1bmN0aW9uIChwb2ludHMpIHtcbiAgICAgICAgdmFyIGxvZyA9IHRoaXMub3B0aW9ucy5sb2c7XG5cbiAgICAgICAgaWYgKGxvZykgY29uc29sZS50aW1lKCd0b3RhbCB0aW1lJyk7XG5cbiAgICAgICAgdmFyIHRpbWVySWQgPSAncHJlcGFyZSAnICsgcG9pbnRzLmxlbmd0aCArICcgcG9pbnRzJztcbiAgICAgICAgaWYgKGxvZykgY29uc29sZS50aW1lKHRpbWVySWQpO1xuXG4gICAgICAgIHRoaXMucG9pbnRzID0gcG9pbnRzO1xuXG4gICAgICAgIC8vIGdlbmVyYXRlIGEgY2x1c3RlciBvYmplY3QgZm9yIGVhY2ggcG9pbnQgYW5kIGluZGV4IGlucHV0IHBvaW50cyBpbnRvIGEgS0QtdHJlZVxuICAgICAgICB2YXIgY2x1c3RlcnMgPSBbXTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwb2ludHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGlmICghcG9pbnRzW2ldLmdlb21ldHJ5KSB7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjbHVzdGVycy5wdXNoKGNyZWF0ZVBvaW50Q2x1c3Rlcihwb2ludHNbaV0sIGkpKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnRyZWVzW3RoaXMub3B0aW9ucy5tYXhab29tICsgMV0gPSBrZGJ1c2goY2x1c3RlcnMsIGdldFgsIGdldFksIHRoaXMub3B0aW9ucy5ub2RlU2l6ZSwgRmxvYXQzMkFycmF5KTtcblxuICAgICAgICBpZiAobG9nKSBjb25zb2xlLnRpbWVFbmQodGltZXJJZCk7XG5cbiAgICAgICAgLy8gY2x1c3RlciBwb2ludHMgb24gbWF4IHpvb20sIHRoZW4gY2x1c3RlciB0aGUgcmVzdWx0cyBvbiBwcmV2aW91cyB6b29tLCBldGMuO1xuICAgICAgICAvLyByZXN1bHRzIGluIGEgY2x1c3RlciBoaWVyYXJjaHkgYWNyb3NzIHpvb20gbGV2ZWxzXG4gICAgICAgIGZvciAodmFyIHogPSB0aGlzLm9wdGlvbnMubWF4Wm9vbTsgeiA+PSB0aGlzLm9wdGlvbnMubWluWm9vbTsgei0tKSB7XG4gICAgICAgICAgICB2YXIgbm93ID0gK0RhdGUubm93KCk7XG5cbiAgICAgICAgICAgIC8vIGNyZWF0ZSBhIG5ldyBzZXQgb2YgY2x1c3RlcnMgZm9yIHRoZSB6b29tIGFuZCBpbmRleCB0aGVtIHdpdGggYSBLRC10cmVlXG4gICAgICAgICAgICBjbHVzdGVycyA9IHRoaXMuX2NsdXN0ZXIoY2x1c3RlcnMsIHopO1xuICAgICAgICAgICAgdGhpcy50cmVlc1t6XSA9IGtkYnVzaChjbHVzdGVycywgZ2V0WCwgZ2V0WSwgdGhpcy5vcHRpb25zLm5vZGVTaXplLCBGbG9hdDMyQXJyYXkpO1xuXG4gICAgICAgICAgICBpZiAobG9nKSBjb25zb2xlLmxvZygneiVkOiAlZCBjbHVzdGVycyBpbiAlZG1zJywgeiwgY2x1c3RlcnMubGVuZ3RoLCArRGF0ZS5ub3coKSAtIG5vdyk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobG9nKSBjb25zb2xlLnRpbWVFbmQoJ3RvdGFsIHRpbWUnKTtcblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuXG4gICAgZ2V0Q2x1c3RlcnM6IGZ1bmN0aW9uIChiYm94LCB6b29tKSB7XG4gICAgICAgIHZhciBtaW5MbmcgPSAoKGJib3hbMF0gKyAxODApICUgMzYwICsgMzYwKSAlIDM2MCAtIDE4MDtcbiAgICAgICAgdmFyIG1pbkxhdCA9IE1hdGgubWF4KC05MCwgTWF0aC5taW4oOTAsIGJib3hbMV0pKTtcbiAgICAgICAgdmFyIG1heExuZyA9IGJib3hbMl0gPT09IDE4MCA/IDE4MCA6ICgoYmJveFsyXSArIDE4MCkgJSAzNjAgKyAzNjApICUgMzYwIC0gMTgwO1xuICAgICAgICB2YXIgbWF4TGF0ID0gTWF0aC5tYXgoLTkwLCBNYXRoLm1pbig5MCwgYmJveFszXSkpO1xuXG4gICAgICAgIGlmIChiYm94WzJdIC0gYmJveFswXSA+PSAzNjApIHtcbiAgICAgICAgICAgIG1pbkxuZyA9IC0xODA7XG4gICAgICAgICAgICBtYXhMbmcgPSAxODA7XG4gICAgICAgIH0gZWxzZSBpZiAobWluTG5nID4gbWF4TG5nKSB7XG4gICAgICAgICAgICB2YXIgZWFzdGVybkhlbSA9IHRoaXMuZ2V0Q2x1c3RlcnMoW21pbkxuZywgbWluTGF0LCAxODAsIG1heExhdF0sIHpvb20pO1xuICAgICAgICAgICAgdmFyIHdlc3Rlcm5IZW0gPSB0aGlzLmdldENsdXN0ZXJzKFstMTgwLCBtaW5MYXQsIG1heExuZywgbWF4TGF0XSwgem9vbSk7XG4gICAgICAgICAgICByZXR1cm4gZWFzdGVybkhlbS5jb25jYXQod2VzdGVybkhlbSk7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgdHJlZSA9IHRoaXMudHJlZXNbdGhpcy5fbGltaXRab29tKHpvb20pXTtcbiAgICAgICAgdmFyIGlkcyA9IHRyZWUucmFuZ2UobG5nWChtaW5MbmcpLCBsYXRZKG1heExhdCksIGxuZ1gobWF4TG5nKSwgbGF0WShtaW5MYXQpKTtcbiAgICAgICAgdmFyIGNsdXN0ZXJzID0gW107XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgaWRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgYyA9IHRyZWUucG9pbnRzW2lkc1tpXV07XG4gICAgICAgICAgICBjbHVzdGVycy5wdXNoKGMubnVtUG9pbnRzID8gZ2V0Q2x1c3RlckpTT04oYykgOiB0aGlzLnBvaW50c1tjLmluZGV4XSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGNsdXN0ZXJzO1xuICAgIH0sXG5cbiAgICBnZXRDaGlsZHJlbjogZnVuY3Rpb24gKGNsdXN0ZXJJZCkge1xuICAgICAgICB2YXIgb3JpZ2luSWQgPSBjbHVzdGVySWQgPj4gNTtcbiAgICAgICAgdmFyIG9yaWdpblpvb20gPSBjbHVzdGVySWQgJSAzMjtcbiAgICAgICAgdmFyIGVycm9yTXNnID0gJ05vIGNsdXN0ZXIgd2l0aCB0aGUgc3BlY2lmaWVkIGlkLic7XG5cbiAgICAgICAgdmFyIGluZGV4ID0gdGhpcy50cmVlc1tvcmlnaW5ab29tXTtcbiAgICAgICAgaWYgKCFpbmRleCkgdGhyb3cgbmV3IEVycm9yKGVycm9yTXNnKTtcblxuICAgICAgICB2YXIgb3JpZ2luID0gaW5kZXgucG9pbnRzW29yaWdpbklkXTtcbiAgICAgICAgaWYgKCFvcmlnaW4pIHRocm93IG5ldyBFcnJvcihlcnJvck1zZyk7XG5cbiAgICAgICAgdmFyIHIgPSB0aGlzLm9wdGlvbnMucmFkaXVzIC8gKHRoaXMub3B0aW9ucy5leHRlbnQgKiBNYXRoLnBvdygyLCBvcmlnaW5ab29tIC0gMSkpO1xuICAgICAgICB2YXIgaWRzID0gaW5kZXgud2l0aGluKG9yaWdpbi54LCBvcmlnaW4ueSwgcik7XG4gICAgICAgIHZhciBjaGlsZHJlbiA9IFtdO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGlkcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIGMgPSBpbmRleC5wb2ludHNbaWRzW2ldXTtcbiAgICAgICAgICAgIGlmIChjLnBhcmVudElkID09PSBjbHVzdGVySWQpIHtcbiAgICAgICAgICAgICAgICBjaGlsZHJlbi5wdXNoKGMubnVtUG9pbnRzID8gZ2V0Q2x1c3RlckpTT04oYykgOiB0aGlzLnBvaW50c1tjLmluZGV4XSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY2hpbGRyZW4ubGVuZ3RoID09PSAwKSB0aHJvdyBuZXcgRXJyb3IoZXJyb3JNc2cpO1xuXG4gICAgICAgIHJldHVybiBjaGlsZHJlbjtcbiAgICB9LFxuXG4gICAgZ2V0TGVhdmVzOiBmdW5jdGlvbiAoY2x1c3RlcklkLCBsaW1pdCwgb2Zmc2V0KSB7XG4gICAgICAgIGxpbWl0ID0gbGltaXQgfHwgMTA7XG4gICAgICAgIG9mZnNldCA9IG9mZnNldCB8fCAwO1xuXG4gICAgICAgIHZhciBsZWF2ZXMgPSBbXTtcbiAgICAgICAgdGhpcy5fYXBwZW5kTGVhdmVzKGxlYXZlcywgY2x1c3RlcklkLCBsaW1pdCwgb2Zmc2V0LCAwKTtcblxuICAgICAgICByZXR1cm4gbGVhdmVzO1xuICAgIH0sXG5cbiAgICBnZXRUaWxlOiBmdW5jdGlvbiAoeiwgeCwgeSkge1xuICAgICAgICB2YXIgdHJlZSA9IHRoaXMudHJlZXNbdGhpcy5fbGltaXRab29tKHopXTtcbiAgICAgICAgdmFyIHoyID0gTWF0aC5wb3coMiwgeik7XG4gICAgICAgIHZhciBleHRlbnQgPSB0aGlzLm9wdGlvbnMuZXh0ZW50O1xuICAgICAgICB2YXIgciA9IHRoaXMub3B0aW9ucy5yYWRpdXM7XG4gICAgICAgIHZhciBwID0gciAvIGV4dGVudDtcbiAgICAgICAgdmFyIHRvcCA9ICh5IC0gcCkgLyB6MjtcbiAgICAgICAgdmFyIGJvdHRvbSA9ICh5ICsgMSArIHApIC8gejI7XG5cbiAgICAgICAgdmFyIHRpbGUgPSB7XG4gICAgICAgICAgICBmZWF0dXJlczogW11cbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLl9hZGRUaWxlRmVhdHVyZXMoXG4gICAgICAgICAgICB0cmVlLnJhbmdlKCh4IC0gcCkgLyB6MiwgdG9wLCAoeCArIDEgKyBwKSAvIHoyLCBib3R0b20pLFxuICAgICAgICAgICAgdHJlZS5wb2ludHMsIHgsIHksIHoyLCB0aWxlKTtcblxuICAgICAgICBpZiAoeCA9PT0gMCkge1xuICAgICAgICAgICAgdGhpcy5fYWRkVGlsZUZlYXR1cmVzKFxuICAgICAgICAgICAgICAgIHRyZWUucmFuZ2UoMSAtIHAgLyB6MiwgdG9wLCAxLCBib3R0b20pLFxuICAgICAgICAgICAgICAgIHRyZWUucG9pbnRzLCB6MiwgeSwgejIsIHRpbGUpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh4ID09PSB6MiAtIDEpIHtcbiAgICAgICAgICAgIHRoaXMuX2FkZFRpbGVGZWF0dXJlcyhcbiAgICAgICAgICAgICAgICB0cmVlLnJhbmdlKDAsIHRvcCwgcCAvIHoyLCBib3R0b20pLFxuICAgICAgICAgICAgICAgIHRyZWUucG9pbnRzLCAtMSwgeSwgejIsIHRpbGUpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRpbGUuZmVhdHVyZXMubGVuZ3RoID8gdGlsZSA6IG51bGw7XG4gICAgfSxcblxuICAgIGdldENsdXN0ZXJFeHBhbnNpb25ab29tOiBmdW5jdGlvbiAoY2x1c3RlcklkKSB7XG4gICAgICAgIHZhciBjbHVzdGVyWm9vbSA9IChjbHVzdGVySWQgJSAzMikgLSAxO1xuICAgICAgICB3aGlsZSAoY2x1c3Rlclpvb20gPCB0aGlzLm9wdGlvbnMubWF4Wm9vbSkge1xuICAgICAgICAgICAgdmFyIGNoaWxkcmVuID0gdGhpcy5nZXRDaGlsZHJlbihjbHVzdGVySWQpO1xuICAgICAgICAgICAgY2x1c3Rlclpvb20rKztcbiAgICAgICAgICAgIGlmIChjaGlsZHJlbi5sZW5ndGggIT09IDEpIGJyZWFrO1xuICAgICAgICAgICAgY2x1c3RlcklkID0gY2hpbGRyZW5bMF0ucHJvcGVydGllcy5jbHVzdGVyX2lkO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBjbHVzdGVyWm9vbTtcbiAgICB9LFxuXG4gICAgX2FwcGVuZExlYXZlczogZnVuY3Rpb24gKHJlc3VsdCwgY2x1c3RlcklkLCBsaW1pdCwgb2Zmc2V0LCBza2lwcGVkKSB7XG4gICAgICAgIHZhciBjaGlsZHJlbiA9IHRoaXMuZ2V0Q2hpbGRyZW4oY2x1c3RlcklkKTtcblxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNoaWxkcmVuLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgcHJvcHMgPSBjaGlsZHJlbltpXS5wcm9wZXJ0aWVzO1xuXG4gICAgICAgICAgICBpZiAocHJvcHMgJiYgcHJvcHMuY2x1c3Rlcikge1xuICAgICAgICAgICAgICAgIGlmIChza2lwcGVkICsgcHJvcHMucG9pbnRfY291bnQgPD0gb2Zmc2V0KSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIHNraXAgdGhlIHdob2xlIGNsdXN0ZXJcbiAgICAgICAgICAgICAgICAgICAgc2tpcHBlZCArPSBwcm9wcy5wb2ludF9jb3VudDtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBlbnRlciB0aGUgY2x1c3RlclxuICAgICAgICAgICAgICAgICAgICBza2lwcGVkID0gdGhpcy5fYXBwZW5kTGVhdmVzKHJlc3VsdCwgcHJvcHMuY2x1c3Rlcl9pZCwgbGltaXQsIG9mZnNldCwgc2tpcHBlZCk7XG4gICAgICAgICAgICAgICAgICAgIC8vIGV4aXQgdGhlIGNsdXN0ZXJcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHNraXBwZWQgPCBvZmZzZXQpIHtcbiAgICAgICAgICAgICAgICAvLyBza2lwIGEgc2luZ2xlIHBvaW50XG4gICAgICAgICAgICAgICAgc2tpcHBlZCsrO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBhZGQgYSBzaW5nbGUgcG9pbnRcbiAgICAgICAgICAgICAgICByZXN1bHQucHVzaChjaGlsZHJlbltpXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAocmVzdWx0Lmxlbmd0aCA9PT0gbGltaXQpIGJyZWFrO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHNraXBwZWQ7XG4gICAgfSxcblxuICAgIF9hZGRUaWxlRmVhdHVyZXM6IGZ1bmN0aW9uIChpZHMsIHBvaW50cywgeCwgeSwgejIsIHRpbGUpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBpZHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBjID0gcG9pbnRzW2lkc1tpXV07XG4gICAgICAgICAgICB2YXIgZiA9IHtcbiAgICAgICAgICAgICAgICB0eXBlOiAxLFxuICAgICAgICAgICAgICAgIGdlb21ldHJ5OiBbW1xuICAgICAgICAgICAgICAgICAgICBNYXRoLnJvdW5kKHRoaXMub3B0aW9ucy5leHRlbnQgKiAoYy54ICogejIgLSB4KSksXG4gICAgICAgICAgICAgICAgICAgIE1hdGgucm91bmQodGhpcy5vcHRpb25zLmV4dGVudCAqIChjLnkgKiB6MiAtIHkpKVxuICAgICAgICAgICAgICAgIF1dLFxuICAgICAgICAgICAgICAgIHRhZ3M6IGMubnVtUG9pbnRzID8gZ2V0Q2x1c3RlclByb3BlcnRpZXMoYykgOiB0aGlzLnBvaW50c1tjLmluZGV4XS5wcm9wZXJ0aWVzXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgdmFyIGlkID0gYy5udW1Qb2ludHMgPyBjLmlkIDogdGhpcy5wb2ludHNbYy5pbmRleF0uaWQ7XG4gICAgICAgICAgICBpZiAoaWQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIGYuaWQgPSBpZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRpbGUuZmVhdHVyZXMucHVzaChmKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBfbGltaXRab29tOiBmdW5jdGlvbiAoeikge1xuICAgICAgICByZXR1cm4gTWF0aC5tYXgodGhpcy5vcHRpb25zLm1pblpvb20sIE1hdGgubWluKHosIHRoaXMub3B0aW9ucy5tYXhab29tICsgMSkpO1xuICAgIH0sXG5cbiAgICBfY2x1c3RlcjogZnVuY3Rpb24gKHBvaW50cywgem9vbSkge1xuICAgICAgICB2YXIgY2x1c3RlcnMgPSBbXTtcbiAgICAgICAgdmFyIHIgPSB0aGlzLm9wdGlvbnMucmFkaXVzIC8gKHRoaXMub3B0aW9ucy5leHRlbnQgKiBNYXRoLnBvdygyLCB6b29tKSk7XG5cbiAgICAgICAgLy8gbG9vcCB0aHJvdWdoIGVhY2ggcG9pbnRcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwb2ludHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBwID0gcG9pbnRzW2ldO1xuICAgICAgICAgICAgLy8gaWYgd2UndmUgYWxyZWFkeSB2aXNpdGVkIHRoZSBwb2ludCBhdCB0aGlzIHpvb20gbGV2ZWwsIHNraXAgaXRcbiAgICAgICAgICAgIGlmIChwLnpvb20gPD0gem9vbSkgY29udGludWU7XG4gICAgICAgICAgICBwLnpvb20gPSB6b29tO1xuXG4gICAgICAgICAgICAvLyBmaW5kIGFsbCBuZWFyYnkgcG9pbnRzXG4gICAgICAgICAgICB2YXIgdHJlZSA9IHRoaXMudHJlZXNbem9vbSArIDFdO1xuICAgICAgICAgICAgdmFyIG5laWdoYm9ySWRzID0gdHJlZS53aXRoaW4ocC54LCBwLnksIHIpO1xuXG4gICAgICAgICAgICB2YXIgbnVtUG9pbnRzID0gcC5udW1Qb2ludHMgfHwgMTtcbiAgICAgICAgICAgIHZhciB3eCA9IHAueCAqIG51bVBvaW50cztcbiAgICAgICAgICAgIHZhciB3eSA9IHAueSAqIG51bVBvaW50cztcblxuICAgICAgICAgICAgdmFyIGNsdXN0ZXJQcm9wZXJ0aWVzID0gbnVsbDtcblxuICAgICAgICAgICAgaWYgKHRoaXMub3B0aW9ucy5yZWR1Y2UpIHtcbiAgICAgICAgICAgICAgICBjbHVzdGVyUHJvcGVydGllcyA9IHRoaXMub3B0aW9ucy5pbml0aWFsKCk7XG4gICAgICAgICAgICAgICAgdGhpcy5fYWNjdW11bGF0ZShjbHVzdGVyUHJvcGVydGllcywgcCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIGVuY29kZSBib3RoIHpvb20gYW5kIHBvaW50IGluZGV4IG9uIHdoaWNoIHRoZSBjbHVzdGVyIG9yaWdpbmF0ZWRcbiAgICAgICAgICAgIHZhciBpZCA9IChpIDw8IDUpICsgKHpvb20gKyAxKTtcblxuICAgICAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBuZWlnaGJvcklkcy5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgICAgIHZhciBiID0gdHJlZS5wb2ludHNbbmVpZ2hib3JJZHNbal1dO1xuICAgICAgICAgICAgICAgIC8vIGZpbHRlciBvdXQgbmVpZ2hib3JzIHRoYXQgYXJlIGFscmVhZHkgcHJvY2Vzc2VkXG4gICAgICAgICAgICAgICAgaWYgKGIuem9vbSA8PSB6b29tKSBjb250aW51ZTtcbiAgICAgICAgICAgICAgICBiLnpvb20gPSB6b29tOyAvLyBzYXZlIHRoZSB6b29tIChzbyBpdCBkb2Vzbid0IGdldCBwcm9jZXNzZWQgdHdpY2UpXG5cbiAgICAgICAgICAgICAgICB2YXIgbnVtUG9pbnRzMiA9IGIubnVtUG9pbnRzIHx8IDE7XG4gICAgICAgICAgICAgICAgd3ggKz0gYi54ICogbnVtUG9pbnRzMjsgLy8gYWNjdW11bGF0ZSBjb29yZGluYXRlcyBmb3IgY2FsY3VsYXRpbmcgd2VpZ2h0ZWQgY2VudGVyXG4gICAgICAgICAgICAgICAgd3kgKz0gYi55ICogbnVtUG9pbnRzMjtcblxuICAgICAgICAgICAgICAgIG51bVBvaW50cyArPSBudW1Qb2ludHMyO1xuICAgICAgICAgICAgICAgIGIucGFyZW50SWQgPSBpZDtcblxuICAgICAgICAgICAgICAgIGlmICh0aGlzLm9wdGlvbnMucmVkdWNlKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2FjY3VtdWxhdGUoY2x1c3RlclByb3BlcnRpZXMsIGIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKG51bVBvaW50cyA9PT0gMSkge1xuICAgICAgICAgICAgICAgIGNsdXN0ZXJzLnB1c2gocCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHAucGFyZW50SWQgPSBpZDtcbiAgICAgICAgICAgICAgICBjbHVzdGVycy5wdXNoKGNyZWF0ZUNsdXN0ZXIod3ggLyBudW1Qb2ludHMsIHd5IC8gbnVtUG9pbnRzLCBpZCwgbnVtUG9pbnRzLCBjbHVzdGVyUHJvcGVydGllcykpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGNsdXN0ZXJzO1xuICAgIH0sXG5cbiAgICBfYWNjdW11bGF0ZTogZnVuY3Rpb24gKGNsdXN0ZXJQcm9wZXJ0aWVzLCBwb2ludCkge1xuICAgICAgICB2YXIgcHJvcGVydGllcyA9IHBvaW50Lm51bVBvaW50cyA/XG4gICAgICAgICAgICBwb2ludC5wcm9wZXJ0aWVzIDpcbiAgICAgICAgICAgIHRoaXMub3B0aW9ucy5tYXAodGhpcy5wb2ludHNbcG9pbnQuaW5kZXhdLnByb3BlcnRpZXMpO1xuXG4gICAgICAgIHRoaXMub3B0aW9ucy5yZWR1Y2UoY2x1c3RlclByb3BlcnRpZXMsIHByb3BlcnRpZXMpO1xuICAgIH1cbn07XG5cbmZ1bmN0aW9uIGNyZWF0ZUNsdXN0ZXIoeCwgeSwgaWQsIG51bVBvaW50cywgcHJvcGVydGllcykge1xuICAgIHJldHVybiB7XG4gICAgICAgIHg6IHgsIC8vIHdlaWdodGVkIGNsdXN0ZXIgY2VudGVyXG4gICAgICAgIHk6IHksXG4gICAgICAgIHpvb206IEluZmluaXR5LCAvLyB0aGUgbGFzdCB6b29tIHRoZSBjbHVzdGVyIHdhcyBwcm9jZXNzZWQgYXRcbiAgICAgICAgaWQ6IGlkLCAvLyBlbmNvZGVzIGluZGV4IG9mIHRoZSBmaXJzdCBjaGlsZCBvZiB0aGUgY2x1c3RlciBhbmQgaXRzIHpvb20gbGV2ZWxcbiAgICAgICAgcGFyZW50SWQ6IC0xLCAvLyBwYXJlbnQgY2x1c3RlciBpZFxuICAgICAgICBudW1Qb2ludHM6IG51bVBvaW50cyxcbiAgICAgICAgcHJvcGVydGllczogcHJvcGVydGllc1xuICAgIH07XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZVBvaW50Q2x1c3RlcihwLCBpZCkge1xuICAgIHZhciBjb29yZHMgPSBwLmdlb21ldHJ5LmNvb3JkaW5hdGVzO1xuICAgIHJldHVybiB7XG4gICAgICAgIHg6IGxuZ1goY29vcmRzWzBdKSwgLy8gcHJvamVjdGVkIHBvaW50IGNvb3JkaW5hdGVzXG4gICAgICAgIHk6IGxhdFkoY29vcmRzWzFdKSxcbiAgICAgICAgem9vbTogSW5maW5pdHksIC8vIHRoZSBsYXN0IHpvb20gdGhlIHBvaW50IHdhcyBwcm9jZXNzZWQgYXRcbiAgICAgICAgaW5kZXg6IGlkLCAvLyBpbmRleCBvZiB0aGUgc291cmNlIGZlYXR1cmUgaW4gdGhlIG9yaWdpbmFsIGlucHV0IGFycmF5LFxuICAgICAgICBwYXJlbnRJZDogLTEgLy8gcGFyZW50IGNsdXN0ZXIgaWRcbiAgICB9O1xufVxuXG5mdW5jdGlvbiBnZXRDbHVzdGVySlNPTihjbHVzdGVyKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgdHlwZTogJ0ZlYXR1cmUnLFxuICAgICAgICBpZDogY2x1c3Rlci5pZCxcbiAgICAgICAgcHJvcGVydGllczogZ2V0Q2x1c3RlclByb3BlcnRpZXMoY2x1c3RlciksXG4gICAgICAgIGdlb21ldHJ5OiB7XG4gICAgICAgICAgICB0eXBlOiAnUG9pbnQnLFxuICAgICAgICAgICAgY29vcmRpbmF0ZXM6IFt4TG5nKGNsdXN0ZXIueCksIHlMYXQoY2x1c3Rlci55KV1cbiAgICAgICAgfVxuICAgIH07XG59XG5cbmZ1bmN0aW9uIGdldENsdXN0ZXJQcm9wZXJ0aWVzKGNsdXN0ZXIpIHtcbiAgICB2YXIgY291bnQgPSBjbHVzdGVyLm51bVBvaW50cztcbiAgICB2YXIgYWJicmV2ID1cbiAgICAgICAgY291bnQgPj0gMTAwMDAgPyBNYXRoLnJvdW5kKGNvdW50IC8gMTAwMCkgKyAnaycgOlxuICAgICAgICBjb3VudCA+PSAxMDAwID8gKE1hdGgucm91bmQoY291bnQgLyAxMDApIC8gMTApICsgJ2snIDogY291bnQ7XG4gICAgcmV0dXJuIGV4dGVuZChleHRlbmQoe30sIGNsdXN0ZXIucHJvcGVydGllcyksIHtcbiAgICAgICAgY2x1c3RlcjogdHJ1ZSxcbiAgICAgICAgY2x1c3Rlcl9pZDogY2x1c3Rlci5pZCxcbiAgICAgICAgcG9pbnRfY291bnQ6IGNvdW50LFxuICAgICAgICBwb2ludF9jb3VudF9hYmJyZXZpYXRlZDogYWJicmV2XG4gICAgfSk7XG59XG5cbi8vIGxvbmdpdHVkZS9sYXRpdHVkZSB0byBzcGhlcmljYWwgbWVyY2F0b3IgaW4gWzAuLjFdIHJhbmdlXG5mdW5jdGlvbiBsbmdYKGxuZykge1xuICAgIHJldHVybiBsbmcgLyAzNjAgKyAwLjU7XG59XG5mdW5jdGlvbiBsYXRZKGxhdCkge1xuICAgIHZhciBzaW4gPSBNYXRoLnNpbihsYXQgKiBNYXRoLlBJIC8gMTgwKSxcbiAgICAgICAgeSA9ICgwLjUgLSAwLjI1ICogTWF0aC5sb2coKDEgKyBzaW4pIC8gKDEgLSBzaW4pKSAvIE1hdGguUEkpO1xuICAgIHJldHVybiB5IDwgMCA/IDAgOiB5ID4gMSA/IDEgOiB5O1xufVxuXG4vLyBzcGhlcmljYWwgbWVyY2F0b3IgdG8gbG9uZ2l0dWRlL2xhdGl0dWRlXG5mdW5jdGlvbiB4TG5nKHgpIHtcbiAgICByZXR1cm4gKHggLSAwLjUpICogMzYwO1xufVxuZnVuY3Rpb24geUxhdCh5KSB7XG4gICAgdmFyIHkyID0gKDE4MCAtIHkgKiAzNjApICogTWF0aC5QSSAvIDE4MDtcbiAgICByZXR1cm4gMzYwICogTWF0aC5hdGFuKE1hdGguZXhwKHkyKSkgLyBNYXRoLlBJIC0gOTA7XG59XG5cbmZ1bmN0aW9uIGV4dGVuZChkZXN0LCBzcmMpIHtcbiAgICBmb3IgKHZhciBpZCBpbiBzcmMpIGRlc3RbaWRdID0gc3JjW2lkXTtcbiAgICByZXR1cm4gZGVzdDtcbn1cblxuZnVuY3Rpb24gZ2V0WChwKSB7XG4gICAgcmV0dXJuIHAueDtcbn1cbmZ1bmN0aW9uIGdldFkocCkge1xuICAgIHJldHVybiBwLnk7XG59XG4iLCJcbi8vIGNhbGN1bGF0ZSBzaW1wbGlmaWNhdGlvbiBkYXRhIHVzaW5nIG9wdGltaXplZCBEb3VnbGFzLVBldWNrZXIgYWxnb3JpdGhtXG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIHNpbXBsaWZ5KGNvb3JkcywgZmlyc3QsIGxhc3QsIHNxVG9sZXJhbmNlKSB7XG4gICAgdmFyIG1heFNxRGlzdCA9IHNxVG9sZXJhbmNlO1xuICAgIHZhciBtaWQgPSAobGFzdCAtIGZpcnN0KSA+PiAxO1xuICAgIHZhciBtaW5Qb3NUb01pZCA9IGxhc3QgLSBmaXJzdDtcbiAgICB2YXIgaW5kZXg7XG5cbiAgICB2YXIgYXggPSBjb29yZHNbZmlyc3RdO1xuICAgIHZhciBheSA9IGNvb3Jkc1tmaXJzdCArIDFdO1xuICAgIHZhciBieCA9IGNvb3Jkc1tsYXN0XTtcbiAgICB2YXIgYnkgPSBjb29yZHNbbGFzdCArIDFdO1xuXG4gICAgZm9yICh2YXIgaSA9IGZpcnN0ICsgMzsgaSA8IGxhc3Q7IGkgKz0gMykge1xuICAgICAgICB2YXIgZCA9IGdldFNxU2VnRGlzdChjb29yZHNbaV0sIGNvb3Jkc1tpICsgMV0sIGF4LCBheSwgYngsIGJ5KTtcblxuICAgICAgICBpZiAoZCA+IG1heFNxRGlzdCkge1xuICAgICAgICAgICAgaW5kZXggPSBpO1xuICAgICAgICAgICAgbWF4U3FEaXN0ID0gZDtcblxuICAgICAgICB9IGVsc2UgaWYgKGQgPT09IG1heFNxRGlzdCkge1xuICAgICAgICAgICAgLy8gYSB3b3JrYXJvdW5kIHRvIGVuc3VyZSB3ZSBjaG9vc2UgYSBwaXZvdCBjbG9zZSB0byB0aGUgbWlkZGxlIG9mIHRoZSBsaXN0LFxuICAgICAgICAgICAgLy8gcmVkdWNpbmcgcmVjdXJzaW9uIGRlcHRoLCBmb3IgY2VydGFpbiBkZWdlbmVyYXRlIGlucHV0c1xuICAgICAgICAgICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL21hcGJveC9nZW9qc29uLXZ0L2lzc3Vlcy8xMDRcbiAgICAgICAgICAgIHZhciBwb3NUb01pZCA9IE1hdGguYWJzKGkgLSBtaWQpO1xuICAgICAgICAgICAgaWYgKHBvc1RvTWlkIDwgbWluUG9zVG9NaWQpIHtcbiAgICAgICAgICAgICAgICBpbmRleCA9IGk7XG4gICAgICAgICAgICAgICAgbWluUG9zVG9NaWQgPSBwb3NUb01pZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGlmIChtYXhTcURpc3QgPiBzcVRvbGVyYW5jZSkge1xuICAgICAgICBpZiAoaW5kZXggLSBmaXJzdCA+IDMpIHNpbXBsaWZ5KGNvb3JkcywgZmlyc3QsIGluZGV4LCBzcVRvbGVyYW5jZSk7XG4gICAgICAgIGNvb3Jkc1tpbmRleCArIDJdID0gbWF4U3FEaXN0O1xuICAgICAgICBpZiAobGFzdCAtIGluZGV4ID4gMykgc2ltcGxpZnkoY29vcmRzLCBpbmRleCwgbGFzdCwgc3FUb2xlcmFuY2UpO1xuICAgIH1cbn1cblxuLy8gc3F1YXJlIGRpc3RhbmNlIGZyb20gYSBwb2ludCB0byBhIHNlZ21lbnRcbmZ1bmN0aW9uIGdldFNxU2VnRGlzdChweCwgcHksIHgsIHksIGJ4LCBieSkge1xuXG4gICAgdmFyIGR4ID0gYnggLSB4O1xuICAgIHZhciBkeSA9IGJ5IC0geTtcblxuICAgIGlmIChkeCAhPT0gMCB8fCBkeSAhPT0gMCkge1xuXG4gICAgICAgIHZhciB0ID0gKChweCAtIHgpICogZHggKyAocHkgLSB5KSAqIGR5KSAvIChkeCAqIGR4ICsgZHkgKiBkeSk7XG5cbiAgICAgICAgaWYgKHQgPiAxKSB7XG4gICAgICAgICAgICB4ID0gYng7XG4gICAgICAgICAgICB5ID0gYnk7XG5cbiAgICAgICAgfSBlbHNlIGlmICh0ID4gMCkge1xuICAgICAgICAgICAgeCArPSBkeCAqIHQ7XG4gICAgICAgICAgICB5ICs9IGR5ICogdDtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGR4ID0gcHggLSB4O1xuICAgIGR5ID0gcHkgLSB5O1xuXG4gICAgcmV0dXJuIGR4ICogZHggKyBkeSAqIGR5O1xufVxuIiwiXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBjcmVhdGVGZWF0dXJlKGlkLCB0eXBlLCBnZW9tLCB0YWdzKSB7XG4gICAgdmFyIGZlYXR1cmUgPSB7XG4gICAgICAgIGlkOiB0eXBlb2YgaWQgPT09ICd1bmRlZmluZWQnID8gbnVsbCA6IGlkLFxuICAgICAgICB0eXBlOiB0eXBlLFxuICAgICAgICBnZW9tZXRyeTogZ2VvbSxcbiAgICAgICAgdGFnczogdGFncyxcbiAgICAgICAgbWluWDogSW5maW5pdHksXG4gICAgICAgIG1pblk6IEluZmluaXR5LFxuICAgICAgICBtYXhYOiAtSW5maW5pdHksXG4gICAgICAgIG1heFk6IC1JbmZpbml0eVxuICAgIH07XG4gICAgY2FsY0JCb3goZmVhdHVyZSk7XG4gICAgcmV0dXJuIGZlYXR1cmU7XG59XG5cbmZ1bmN0aW9uIGNhbGNCQm94KGZlYXR1cmUpIHtcbiAgICB2YXIgZ2VvbSA9IGZlYXR1cmUuZ2VvbWV0cnk7XG4gICAgdmFyIHR5cGUgPSBmZWF0dXJlLnR5cGU7XG5cbiAgICBpZiAodHlwZSA9PT0gJ1BvaW50JyB8fCB0eXBlID09PSAnTXVsdGlQb2ludCcgfHwgdHlwZSA9PT0gJ0xpbmVTdHJpbmcnKSB7XG4gICAgICAgIGNhbGNMaW5lQkJveChmZWF0dXJlLCBnZW9tKTtcblxuICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gJ1BvbHlnb24nIHx8IHR5cGUgPT09ICdNdWx0aUxpbmVTdHJpbmcnKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZ2VvbS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgY2FsY0xpbmVCQm94KGZlYXR1cmUsIGdlb21baV0pO1xuICAgICAgICB9XG5cbiAgICB9IGVsc2UgaWYgKHR5cGUgPT09ICdNdWx0aVBvbHlnb24nKSB7XG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBnZW9tLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBqID0gMDsgaiA8IGdlb21baV0ubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgICAgICBjYWxjTGluZUJCb3goZmVhdHVyZSwgZ2VvbVtpXVtqXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59XG5cbmZ1bmN0aW9uIGNhbGNMaW5lQkJveChmZWF0dXJlLCBnZW9tKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBnZW9tLmxlbmd0aDsgaSArPSAzKSB7XG4gICAgICAgIGZlYXR1cmUubWluWCA9IE1hdGgubWluKGZlYXR1cmUubWluWCwgZ2VvbVtpXSk7XG4gICAgICAgIGZlYXR1cmUubWluWSA9IE1hdGgubWluKGZlYXR1cmUubWluWSwgZ2VvbVtpICsgMV0pO1xuICAgICAgICBmZWF0dXJlLm1heFggPSBNYXRoLm1heChmZWF0dXJlLm1heFgsIGdlb21baV0pO1xuICAgICAgICBmZWF0dXJlLm1heFkgPSBNYXRoLm1heChmZWF0dXJlLm1heFksIGdlb21baSArIDFdKTtcbiAgICB9XG59XG4iLCJcbmltcG9ydCBzaW1wbGlmeSBmcm9tICcuL3NpbXBsaWZ5JztcbmltcG9ydCBjcmVhdGVGZWF0dXJlIGZyb20gJy4vZmVhdHVyZSc7XG5cbi8vIGNvbnZlcnRzIEdlb0pTT04gZmVhdHVyZSBpbnRvIGFuIGludGVybWVkaWF0ZSBwcm9qZWN0ZWQgSlNPTiB2ZWN0b3IgZm9ybWF0IHdpdGggc2ltcGxpZmljYXRpb24gZGF0YVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBjb252ZXJ0KGRhdGEsIG9wdGlvbnMpIHtcbiAgICB2YXIgZmVhdHVyZXMgPSBbXTtcbiAgICBpZiAoZGF0YS50eXBlID09PSAnRmVhdHVyZUNvbGxlY3Rpb24nKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZGF0YS5mZWF0dXJlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgY29udmVydEZlYXR1cmUoZmVhdHVyZXMsIGRhdGEuZmVhdHVyZXNbaV0sIG9wdGlvbnMsIGkpO1xuICAgICAgICB9XG5cbiAgICB9IGVsc2UgaWYgKGRhdGEudHlwZSA9PT0gJ0ZlYXR1cmUnKSB7XG4gICAgICAgIGNvbnZlcnRGZWF0dXJlKGZlYXR1cmVzLCBkYXRhLCBvcHRpb25zKTtcblxuICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIHNpbmdsZSBnZW9tZXRyeSBvciBhIGdlb21ldHJ5IGNvbGxlY3Rpb25cbiAgICAgICAgY29udmVydEZlYXR1cmUoZmVhdHVyZXMsIHtnZW9tZXRyeTogZGF0YX0sIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIHJldHVybiBmZWF0dXJlcztcbn1cblxuZnVuY3Rpb24gY29udmVydEZlYXR1cmUoZmVhdHVyZXMsIGdlb2pzb24sIG9wdGlvbnMsIGluZGV4KSB7XG4gICAgaWYgKCFnZW9qc29uLmdlb21ldHJ5KSByZXR1cm47XG5cbiAgICB2YXIgY29vcmRzID0gZ2VvanNvbi5nZW9tZXRyeS5jb29yZGluYXRlcztcbiAgICB2YXIgdHlwZSA9IGdlb2pzb24uZ2VvbWV0cnkudHlwZTtcbiAgICB2YXIgdG9sZXJhbmNlID0gTWF0aC5wb3cob3B0aW9ucy50b2xlcmFuY2UgLyAoKDEgPDwgb3B0aW9ucy5tYXhab29tKSAqIG9wdGlvbnMuZXh0ZW50KSwgMik7XG4gICAgdmFyIGdlb21ldHJ5ID0gW107XG4gICAgdmFyIGlkID0gZ2VvanNvbi5pZDtcbiAgICBpZiAob3B0aW9ucy5wcm9tb3RlSWQpIHtcbiAgICAgICAgaWQgPSBnZW9qc29uLnByb3BlcnRpZXNbb3B0aW9ucy5wcm9tb3RlSWRdO1xuICAgIH0gZWxzZSBpZiAob3B0aW9ucy5nZW5lcmF0ZUlkKSB7XG4gICAgICAgIGlkID0gaW5kZXggfHwgMDtcbiAgICB9XG4gICAgaWYgKHR5cGUgPT09ICdQb2ludCcpIHtcbiAgICAgICAgY29udmVydFBvaW50KGNvb3JkcywgZ2VvbWV0cnkpO1xuXG4gICAgfSBlbHNlIGlmICh0eXBlID09PSAnTXVsdGlQb2ludCcpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjb29yZHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGNvbnZlcnRQb2ludChjb29yZHNbaV0sIGdlb21ldHJ5KTtcbiAgICAgICAgfVxuXG4gICAgfSBlbHNlIGlmICh0eXBlID09PSAnTGluZVN0cmluZycpIHtcbiAgICAgICAgY29udmVydExpbmUoY29vcmRzLCBnZW9tZXRyeSwgdG9sZXJhbmNlLCBmYWxzZSk7XG5cbiAgICB9IGVsc2UgaWYgKHR5cGUgPT09ICdNdWx0aUxpbmVTdHJpbmcnKSB7XG4gICAgICAgIGlmIChvcHRpb25zLmxpbmVNZXRyaWNzKSB7XG4gICAgICAgICAgICAvLyBleHBsb2RlIGludG8gbGluZXN0cmluZ3MgdG8gYmUgYWJsZSB0byB0cmFjayBtZXRyaWNzXG4gICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwgY29vcmRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgZ2VvbWV0cnkgPSBbXTtcbiAgICAgICAgICAgICAgICBjb252ZXJ0TGluZShjb29yZHNbaV0sIGdlb21ldHJ5LCB0b2xlcmFuY2UsIGZhbHNlKTtcbiAgICAgICAgICAgICAgICBmZWF0dXJlcy5wdXNoKGNyZWF0ZUZlYXR1cmUoaWQsICdMaW5lU3RyaW5nJywgZ2VvbWV0cnksIGdlb2pzb24ucHJvcGVydGllcykpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29udmVydExpbmVzKGNvb3JkcywgZ2VvbWV0cnksIHRvbGVyYW5jZSwgZmFsc2UpO1xuICAgICAgICB9XG5cbiAgICB9IGVsc2UgaWYgKHR5cGUgPT09ICdQb2x5Z29uJykge1xuICAgICAgICBjb252ZXJ0TGluZXMoY29vcmRzLCBnZW9tZXRyeSwgdG9sZXJhbmNlLCB0cnVlKTtcblxuICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gJ011bHRpUG9seWdvbicpIHtcbiAgICAgICAgZm9yIChpID0gMDsgaSA8IGNvb3Jkcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIHBvbHlnb24gPSBbXTtcbiAgICAgICAgICAgIGNvbnZlcnRMaW5lcyhjb29yZHNbaV0sIHBvbHlnb24sIHRvbGVyYW5jZSwgdHJ1ZSk7XG4gICAgICAgICAgICBnZW9tZXRyeS5wdXNoKHBvbHlnb24pO1xuICAgICAgICB9XG4gICAgfSBlbHNlIGlmICh0eXBlID09PSAnR2VvbWV0cnlDb2xsZWN0aW9uJykge1xuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgZ2VvanNvbi5nZW9tZXRyeS5nZW9tZXRyaWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBjb252ZXJ0RmVhdHVyZShmZWF0dXJlcywge1xuICAgICAgICAgICAgICAgIGlkOiBpZCxcbiAgICAgICAgICAgICAgICBnZW9tZXRyeTogZ2VvanNvbi5nZW9tZXRyeS5nZW9tZXRyaWVzW2ldLFxuICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IGdlb2pzb24ucHJvcGVydGllc1xuICAgICAgICAgICAgfSwgb3B0aW9ucywgaW5kZXgpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybjtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0lucHV0IGRhdGEgaXMgbm90IGEgdmFsaWQgR2VvSlNPTiBvYmplY3QuJyk7XG4gICAgfVxuXG4gICAgZmVhdHVyZXMucHVzaChjcmVhdGVGZWF0dXJlKGlkLCB0eXBlLCBnZW9tZXRyeSwgZ2VvanNvbi5wcm9wZXJ0aWVzKSk7XG59XG5cbmZ1bmN0aW9uIGNvbnZlcnRQb2ludChjb29yZHMsIG91dCkge1xuICAgIG91dC5wdXNoKHByb2plY3RYKGNvb3Jkc1swXSkpO1xuICAgIG91dC5wdXNoKHByb2plY3RZKGNvb3Jkc1sxXSkpO1xuICAgIG91dC5wdXNoKDApO1xufVxuXG5mdW5jdGlvbiBjb252ZXJ0TGluZShyaW5nLCBvdXQsIHRvbGVyYW5jZSwgaXNQb2x5Z29uKSB7XG4gICAgdmFyIHgwLCB5MDtcbiAgICB2YXIgc2l6ZSA9IDA7XG5cbiAgICBmb3IgKHZhciBqID0gMDsgaiA8IHJpbmcubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgdmFyIHggPSBwcm9qZWN0WChyaW5nW2pdWzBdKTtcbiAgICAgICAgdmFyIHkgPSBwcm9qZWN0WShyaW5nW2pdWzFdKTtcblxuICAgICAgICBvdXQucHVzaCh4KTtcbiAgICAgICAgb3V0LnB1c2goeSk7XG4gICAgICAgIG91dC5wdXNoKDApO1xuXG4gICAgICAgIGlmIChqID4gMCkge1xuICAgICAgICAgICAgaWYgKGlzUG9seWdvbikge1xuICAgICAgICAgICAgICAgIHNpemUgKz0gKHgwICogeSAtIHggKiB5MCkgLyAyOyAvLyBhcmVhXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHNpemUgKz0gTWF0aC5zcXJ0KE1hdGgucG93KHggLSB4MCwgMikgKyBNYXRoLnBvdyh5IC0geTAsIDIpKTsgLy8gbGVuZ3RoXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgeDAgPSB4O1xuICAgICAgICB5MCA9IHk7XG4gICAgfVxuXG4gICAgdmFyIGxhc3QgPSBvdXQubGVuZ3RoIC0gMztcbiAgICBvdXRbMl0gPSAxO1xuICAgIHNpbXBsaWZ5KG91dCwgMCwgbGFzdCwgdG9sZXJhbmNlKTtcbiAgICBvdXRbbGFzdCArIDJdID0gMTtcblxuICAgIG91dC5zaXplID0gTWF0aC5hYnMoc2l6ZSk7XG4gICAgb3V0LnN0YXJ0ID0gMDtcbiAgICBvdXQuZW5kID0gb3V0LnNpemU7XG59XG5cbmZ1bmN0aW9uIGNvbnZlcnRMaW5lcyhyaW5ncywgb3V0LCB0b2xlcmFuY2UsIGlzUG9seWdvbikge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcmluZ3MubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIGdlb20gPSBbXTtcbiAgICAgICAgY29udmVydExpbmUocmluZ3NbaV0sIGdlb20sIHRvbGVyYW5jZSwgaXNQb2x5Z29uKTtcbiAgICAgICAgb3V0LnB1c2goZ2VvbSk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBwcm9qZWN0WCh4KSB7XG4gICAgcmV0dXJuIHggLyAzNjAgKyAwLjU7XG59XG5cbmZ1bmN0aW9uIHByb2plY3RZKHkpIHtcbiAgICB2YXIgc2luID0gTWF0aC5zaW4oeSAqIE1hdGguUEkgLyAxODApO1xuICAgIHZhciB5MiA9IDAuNSAtIDAuMjUgKiBNYXRoLmxvZygoMSArIHNpbikgLyAoMSAtIHNpbikpIC8gTWF0aC5QSTtcbiAgICByZXR1cm4geTIgPCAwID8gMCA6IHkyID4gMSA/IDEgOiB5Mjtcbn1cbiIsIlxuaW1wb3J0IGNyZWF0ZUZlYXR1cmUgZnJvbSAnLi9mZWF0dXJlJztcblxuLyogY2xpcCBmZWF0dXJlcyBiZXR3ZWVuIHR3byBheGlzLXBhcmFsbGVsIGxpbmVzOlxuICogICAgIHwgICAgICAgIHxcbiAqICBfX198X19fICAgICB8ICAgICAvXG4gKiAvICAgfCAgIFxcX19fX3xfX19fL1xuICogICAgIHwgICAgICAgIHxcbiAqL1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBjbGlwKGZlYXR1cmVzLCBzY2FsZSwgazEsIGsyLCBheGlzLCBtaW5BbGwsIG1heEFsbCwgb3B0aW9ucykge1xuXG4gICAgazEgLz0gc2NhbGU7XG4gICAgazIgLz0gc2NhbGU7XG5cbiAgICBpZiAobWluQWxsID49IGsxICYmIG1heEFsbCA8IGsyKSByZXR1cm4gZmVhdHVyZXM7IC8vIHRyaXZpYWwgYWNjZXB0XG4gICAgZWxzZSBpZiAobWF4QWxsIDwgazEgfHwgbWluQWxsID49IGsyKSByZXR1cm4gbnVsbDsgLy8gdHJpdmlhbCByZWplY3RcblxuICAgIHZhciBjbGlwcGVkID0gW107XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGZlYXR1cmVzLmxlbmd0aDsgaSsrKSB7XG5cbiAgICAgICAgdmFyIGZlYXR1cmUgPSBmZWF0dXJlc1tpXTtcbiAgICAgICAgdmFyIGdlb21ldHJ5ID0gZmVhdHVyZS5nZW9tZXRyeTtcbiAgICAgICAgdmFyIHR5cGUgPSBmZWF0dXJlLnR5cGU7XG5cbiAgICAgICAgdmFyIG1pbiA9IGF4aXMgPT09IDAgPyBmZWF0dXJlLm1pblggOiBmZWF0dXJlLm1pblk7XG4gICAgICAgIHZhciBtYXggPSBheGlzID09PSAwID8gZmVhdHVyZS5tYXhYIDogZmVhdHVyZS5tYXhZO1xuXG4gICAgICAgIGlmIChtaW4gPj0gazEgJiYgbWF4IDwgazIpIHsgLy8gdHJpdmlhbCBhY2NlcHRcbiAgICAgICAgICAgIGNsaXBwZWQucHVzaChmZWF0dXJlKTtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9IGVsc2UgaWYgKG1heCA8IGsxIHx8IG1pbiA+PSBrMikgeyAvLyB0cml2aWFsIHJlamVjdFxuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgbmV3R2VvbWV0cnkgPSBbXTtcblxuICAgICAgICBpZiAodHlwZSA9PT0gJ1BvaW50JyB8fCB0eXBlID09PSAnTXVsdGlQb2ludCcpIHtcbiAgICAgICAgICAgIGNsaXBQb2ludHMoZ2VvbWV0cnksIG5ld0dlb21ldHJ5LCBrMSwgazIsIGF4aXMpO1xuXG4gICAgICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gJ0xpbmVTdHJpbmcnKSB7XG4gICAgICAgICAgICBjbGlwTGluZShnZW9tZXRyeSwgbmV3R2VvbWV0cnksIGsxLCBrMiwgYXhpcywgZmFsc2UsIG9wdGlvbnMubGluZU1ldHJpY3MpO1xuXG4gICAgICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gJ011bHRpTGluZVN0cmluZycpIHtcbiAgICAgICAgICAgIGNsaXBMaW5lcyhnZW9tZXRyeSwgbmV3R2VvbWV0cnksIGsxLCBrMiwgYXhpcywgZmFsc2UpO1xuXG4gICAgICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gJ1BvbHlnb24nKSB7XG4gICAgICAgICAgICBjbGlwTGluZXMoZ2VvbWV0cnksIG5ld0dlb21ldHJ5LCBrMSwgazIsIGF4aXMsIHRydWUpO1xuXG4gICAgICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gJ011bHRpUG9seWdvbicpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgZ2VvbWV0cnkubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgcG9seWdvbiA9IFtdO1xuICAgICAgICAgICAgICAgIGNsaXBMaW5lcyhnZW9tZXRyeVtqXSwgcG9seWdvbiwgazEsIGsyLCBheGlzLCB0cnVlKTtcbiAgICAgICAgICAgICAgICBpZiAocG9seWdvbi5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgbmV3R2VvbWV0cnkucHVzaChwb2x5Z29uKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobmV3R2VvbWV0cnkubGVuZ3RoKSB7XG4gICAgICAgICAgICBpZiAob3B0aW9ucy5saW5lTWV0cmljcyAmJiB0eXBlID09PSAnTGluZVN0cmluZycpIHtcbiAgICAgICAgICAgICAgICBmb3IgKGogPSAwOyBqIDwgbmV3R2VvbWV0cnkubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgICAgICAgICAgY2xpcHBlZC5wdXNoKGNyZWF0ZUZlYXR1cmUoZmVhdHVyZS5pZCwgdHlwZSwgbmV3R2VvbWV0cnlbal0sIGZlYXR1cmUudGFncykpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKHR5cGUgPT09ICdMaW5lU3RyaW5nJyB8fCB0eXBlID09PSAnTXVsdGlMaW5lU3RyaW5nJykge1xuICAgICAgICAgICAgICAgIGlmIChuZXdHZW9tZXRyeS5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZSA9ICdMaW5lU3RyaW5nJztcbiAgICAgICAgICAgICAgICAgICAgbmV3R2VvbWV0cnkgPSBuZXdHZW9tZXRyeVswXTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0eXBlID0gJ011bHRpTGluZVN0cmluZyc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHR5cGUgPT09ICdQb2ludCcgfHwgdHlwZSA9PT0gJ011bHRpUG9pbnQnKSB7XG4gICAgICAgICAgICAgICAgdHlwZSA9IG5ld0dlb21ldHJ5Lmxlbmd0aCA9PT0gMyA/ICdQb2ludCcgOiAnTXVsdGlQb2ludCc7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNsaXBwZWQucHVzaChjcmVhdGVGZWF0dXJlKGZlYXR1cmUuaWQsIHR5cGUsIG5ld0dlb21ldHJ5LCBmZWF0dXJlLnRhZ3MpKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBjbGlwcGVkLmxlbmd0aCA/IGNsaXBwZWQgOiBudWxsO1xufVxuXG5mdW5jdGlvbiBjbGlwUG9pbnRzKGdlb20sIG5ld0dlb20sIGsxLCBrMiwgYXhpcykge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZ2VvbS5sZW5ndGg7IGkgKz0gMykge1xuICAgICAgICB2YXIgYSA9IGdlb21baSArIGF4aXNdO1xuXG4gICAgICAgIGlmIChhID49IGsxICYmIGEgPD0gazIpIHtcbiAgICAgICAgICAgIG5ld0dlb20ucHVzaChnZW9tW2ldKTtcbiAgICAgICAgICAgIG5ld0dlb20ucHVzaChnZW9tW2kgKyAxXSk7XG4gICAgICAgICAgICBuZXdHZW9tLnB1c2goZ2VvbVtpICsgMl0pO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5mdW5jdGlvbiBjbGlwTGluZShnZW9tLCBuZXdHZW9tLCBrMSwgazIsIGF4aXMsIGlzUG9seWdvbiwgdHJhY2tNZXRyaWNzKSB7XG5cbiAgICB2YXIgc2xpY2UgPSBuZXdTbGljZShnZW9tKTtcbiAgICB2YXIgaW50ZXJzZWN0ID0gYXhpcyA9PT0gMCA/IGludGVyc2VjdFggOiBpbnRlcnNlY3RZO1xuICAgIHZhciBsZW4gPSBnZW9tLnN0YXJ0O1xuICAgIHZhciBzZWdMZW4sIHQ7XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGdlb20ubGVuZ3RoIC0gMzsgaSArPSAzKSB7XG4gICAgICAgIHZhciBheCA9IGdlb21baV07XG4gICAgICAgIHZhciBheSA9IGdlb21baSArIDFdO1xuICAgICAgICB2YXIgYXogPSBnZW9tW2kgKyAyXTtcbiAgICAgICAgdmFyIGJ4ID0gZ2VvbVtpICsgM107XG4gICAgICAgIHZhciBieSA9IGdlb21baSArIDRdO1xuICAgICAgICB2YXIgYSA9IGF4aXMgPT09IDAgPyBheCA6IGF5O1xuICAgICAgICB2YXIgYiA9IGF4aXMgPT09IDAgPyBieCA6IGJ5O1xuICAgICAgICB2YXIgZXhpdGVkID0gZmFsc2U7XG5cbiAgICAgICAgaWYgKHRyYWNrTWV0cmljcykgc2VnTGVuID0gTWF0aC5zcXJ0KE1hdGgucG93KGF4IC0gYngsIDIpICsgTWF0aC5wb3coYXkgLSBieSwgMikpO1xuXG4gICAgICAgIGlmIChhIDwgazEpIHtcbiAgICAgICAgICAgIC8vIC0tLXwtLT4gIHwgKGxpbmUgZW50ZXJzIHRoZSBjbGlwIHJlZ2lvbiBmcm9tIHRoZSBsZWZ0KVxuICAgICAgICAgICAgaWYgKGIgPj0gazEpIHtcbiAgICAgICAgICAgICAgICB0ID0gaW50ZXJzZWN0KHNsaWNlLCBheCwgYXksIGJ4LCBieSwgazEpO1xuICAgICAgICAgICAgICAgIGlmICh0cmFja01ldHJpY3MpIHNsaWNlLnN0YXJ0ID0gbGVuICsgc2VnTGVuICogdDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChhID49IGsyKSB7XG4gICAgICAgICAgICAvLyB8ICA8LS18LS0tIChsaW5lIGVudGVycyB0aGUgY2xpcCByZWdpb24gZnJvbSB0aGUgcmlnaHQpXG4gICAgICAgICAgICBpZiAoYiA8IGsyKSB7XG4gICAgICAgICAgICAgICAgdCA9IGludGVyc2VjdChzbGljZSwgYXgsIGF5LCBieCwgYnksIGsyKTtcbiAgICAgICAgICAgICAgICBpZiAodHJhY2tNZXRyaWNzKSBzbGljZS5zdGFydCA9IGxlbiArIHNlZ0xlbiAqIHQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBhZGRQb2ludChzbGljZSwgYXgsIGF5LCBheik7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGIgPCBrMSAmJiBhID49IGsxKSB7XG4gICAgICAgICAgICAvLyA8LS18LS0tICB8IG9yIDwtLXwtLS0tLXwtLS0gKGxpbmUgZXhpdHMgdGhlIGNsaXAgcmVnaW9uIG9uIHRoZSBsZWZ0KVxuICAgICAgICAgICAgdCA9IGludGVyc2VjdChzbGljZSwgYXgsIGF5LCBieCwgYnksIGsxKTtcbiAgICAgICAgICAgIGV4aXRlZCA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGIgPiBrMiAmJiBhIDw9IGsyKSB7XG4gICAgICAgICAgICAvLyB8ICAtLS18LS0+IG9yIC0tLXwtLS0tLXwtLT4gKGxpbmUgZXhpdHMgdGhlIGNsaXAgcmVnaW9uIG9uIHRoZSByaWdodClcbiAgICAgICAgICAgIHQgPSBpbnRlcnNlY3Qoc2xpY2UsIGF4LCBheSwgYngsIGJ5LCBrMik7XG4gICAgICAgICAgICBleGl0ZWQgPSB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFpc1BvbHlnb24gJiYgZXhpdGVkKSB7XG4gICAgICAgICAgICBpZiAodHJhY2tNZXRyaWNzKSBzbGljZS5lbmQgPSBsZW4gKyBzZWdMZW4gKiB0O1xuICAgICAgICAgICAgbmV3R2VvbS5wdXNoKHNsaWNlKTtcbiAgICAgICAgICAgIHNsaWNlID0gbmV3U2xpY2UoZ2VvbSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodHJhY2tNZXRyaWNzKSBsZW4gKz0gc2VnTGVuO1xuICAgIH1cblxuICAgIC8vIGFkZCB0aGUgbGFzdCBwb2ludFxuICAgIHZhciBsYXN0ID0gZ2VvbS5sZW5ndGggLSAzO1xuICAgIGF4ID0gZ2VvbVtsYXN0XTtcbiAgICBheSA9IGdlb21bbGFzdCArIDFdO1xuICAgIGF6ID0gZ2VvbVtsYXN0ICsgMl07XG4gICAgYSA9IGF4aXMgPT09IDAgPyBheCA6IGF5O1xuICAgIGlmIChhID49IGsxICYmIGEgPD0gazIpIGFkZFBvaW50KHNsaWNlLCBheCwgYXksIGF6KTtcblxuICAgIC8vIGNsb3NlIHRoZSBwb2x5Z29uIGlmIGl0cyBlbmRwb2ludHMgYXJlIG5vdCB0aGUgc2FtZSBhZnRlciBjbGlwcGluZ1xuICAgIGxhc3QgPSBzbGljZS5sZW5ndGggLSAzO1xuICAgIGlmIChpc1BvbHlnb24gJiYgbGFzdCA+PSAzICYmIChzbGljZVtsYXN0XSAhPT0gc2xpY2VbMF0gfHwgc2xpY2VbbGFzdCArIDFdICE9PSBzbGljZVsxXSkpIHtcbiAgICAgICAgYWRkUG9pbnQoc2xpY2UsIHNsaWNlWzBdLCBzbGljZVsxXSwgc2xpY2VbMl0pO1xuICAgIH1cblxuICAgIC8vIGFkZCB0aGUgZmluYWwgc2xpY2VcbiAgICBpZiAoc2xpY2UubGVuZ3RoKSB7XG4gICAgICAgIG5ld0dlb20ucHVzaChzbGljZSk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBuZXdTbGljZShsaW5lKSB7XG4gICAgdmFyIHNsaWNlID0gW107XG4gICAgc2xpY2Uuc2l6ZSA9IGxpbmUuc2l6ZTtcbiAgICBzbGljZS5zdGFydCA9IGxpbmUuc3RhcnQ7XG4gICAgc2xpY2UuZW5kID0gbGluZS5lbmQ7XG4gICAgcmV0dXJuIHNsaWNlO1xufVxuXG5mdW5jdGlvbiBjbGlwTGluZXMoZ2VvbSwgbmV3R2VvbSwgazEsIGsyLCBheGlzLCBpc1BvbHlnb24pIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGdlb20ubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgY2xpcExpbmUoZ2VvbVtpXSwgbmV3R2VvbSwgazEsIGsyLCBheGlzLCBpc1BvbHlnb24sIGZhbHNlKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGFkZFBvaW50KG91dCwgeCwgeSwgeikge1xuICAgIG91dC5wdXNoKHgpO1xuICAgIG91dC5wdXNoKHkpO1xuICAgIG91dC5wdXNoKHopO1xufVxuXG5mdW5jdGlvbiBpbnRlcnNlY3RYKG91dCwgYXgsIGF5LCBieCwgYnksIHgpIHtcbiAgICB2YXIgdCA9ICh4IC0gYXgpIC8gKGJ4IC0gYXgpO1xuICAgIG91dC5wdXNoKHgpO1xuICAgIG91dC5wdXNoKGF5ICsgKGJ5IC0gYXkpICogdCk7XG4gICAgb3V0LnB1c2goMSk7XG4gICAgcmV0dXJuIHQ7XG59XG5cbmZ1bmN0aW9uIGludGVyc2VjdFkob3V0LCBheCwgYXksIGJ4LCBieSwgeSkge1xuICAgIHZhciB0ID0gKHkgLSBheSkgLyAoYnkgLSBheSk7XG4gICAgb3V0LnB1c2goYXggKyAoYnggLSBheCkgKiB0KTtcbiAgICBvdXQucHVzaCh5KTtcbiAgICBvdXQucHVzaCgxKTtcbiAgICByZXR1cm4gdDtcbn1cbiIsIlxuaW1wb3J0IGNsaXAgZnJvbSAnLi9jbGlwJztcbmltcG9ydCBjcmVhdGVGZWF0dXJlIGZyb20gJy4vZmVhdHVyZSc7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIHdyYXAoZmVhdHVyZXMsIG9wdGlvbnMpIHtcbiAgICB2YXIgYnVmZmVyID0gb3B0aW9ucy5idWZmZXIgLyBvcHRpb25zLmV4dGVudDtcbiAgICB2YXIgbWVyZ2VkID0gZmVhdHVyZXM7XG4gICAgdmFyIGxlZnQgID0gY2xpcChmZWF0dXJlcywgMSwgLTEgLSBidWZmZXIsIGJ1ZmZlciwgICAgIDAsIC0xLCAyLCBvcHRpb25zKTsgLy8gbGVmdCB3b3JsZCBjb3B5XG4gICAgdmFyIHJpZ2h0ID0gY2xpcChmZWF0dXJlcywgMSwgIDEgLSBidWZmZXIsIDIgKyBidWZmZXIsIDAsIC0xLCAyLCBvcHRpb25zKTsgLy8gcmlnaHQgd29ybGQgY29weVxuXG4gICAgaWYgKGxlZnQgfHwgcmlnaHQpIHtcbiAgICAgICAgbWVyZ2VkID0gY2xpcChmZWF0dXJlcywgMSwgLWJ1ZmZlciwgMSArIGJ1ZmZlciwgMCwgLTEsIDIsIG9wdGlvbnMpIHx8IFtdOyAvLyBjZW50ZXIgd29ybGQgY29weVxuXG4gICAgICAgIGlmIChsZWZ0KSBtZXJnZWQgPSBzaGlmdEZlYXR1cmVDb29yZHMobGVmdCwgMSkuY29uY2F0KG1lcmdlZCk7IC8vIG1lcmdlIGxlZnQgaW50byBjZW50ZXJcbiAgICAgICAgaWYgKHJpZ2h0KSBtZXJnZWQgPSBtZXJnZWQuY29uY2F0KHNoaWZ0RmVhdHVyZUNvb3JkcyhyaWdodCwgLTEpKTsgLy8gbWVyZ2UgcmlnaHQgaW50byBjZW50ZXJcbiAgICB9XG5cbiAgICByZXR1cm4gbWVyZ2VkO1xufVxuXG5mdW5jdGlvbiBzaGlmdEZlYXR1cmVDb29yZHMoZmVhdHVyZXMsIG9mZnNldCkge1xuICAgIHZhciBuZXdGZWF0dXJlcyA9IFtdO1xuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBmZWF0dXJlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgZmVhdHVyZSA9IGZlYXR1cmVzW2ldLFxuICAgICAgICAgICAgdHlwZSA9IGZlYXR1cmUudHlwZTtcblxuICAgICAgICB2YXIgbmV3R2VvbWV0cnk7XG5cbiAgICAgICAgaWYgKHR5cGUgPT09ICdQb2ludCcgfHwgdHlwZSA9PT0gJ011bHRpUG9pbnQnIHx8IHR5cGUgPT09ICdMaW5lU3RyaW5nJykge1xuICAgICAgICAgICAgbmV3R2VvbWV0cnkgPSBzaGlmdENvb3JkcyhmZWF0dXJlLmdlb21ldHJ5LCBvZmZzZXQpO1xuXG4gICAgICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gJ011bHRpTGluZVN0cmluZycgfHwgdHlwZSA9PT0gJ1BvbHlnb24nKSB7XG4gICAgICAgICAgICBuZXdHZW9tZXRyeSA9IFtdO1xuICAgICAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBmZWF0dXJlLmdlb21ldHJ5Lmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICAgICAgbmV3R2VvbWV0cnkucHVzaChzaGlmdENvb3JkcyhmZWF0dXJlLmdlb21ldHJ5W2pdLCBvZmZzZXQpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmICh0eXBlID09PSAnTXVsdGlQb2x5Z29uJykge1xuICAgICAgICAgICAgbmV3R2VvbWV0cnkgPSBbXTtcbiAgICAgICAgICAgIGZvciAoaiA9IDA7IGogPCBmZWF0dXJlLmdlb21ldHJ5Lmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICAgICAgdmFyIG5ld1BvbHlnb24gPSBbXTtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBrID0gMDsgayA8IGZlYXR1cmUuZ2VvbWV0cnlbal0ubGVuZ3RoOyBrKyspIHtcbiAgICAgICAgICAgICAgICAgICAgbmV3UG9seWdvbi5wdXNoKHNoaWZ0Q29vcmRzKGZlYXR1cmUuZ2VvbWV0cnlbal1ba10sIG9mZnNldCkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBuZXdHZW9tZXRyeS5wdXNoKG5ld1BvbHlnb24pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgbmV3RmVhdHVyZXMucHVzaChjcmVhdGVGZWF0dXJlKGZlYXR1cmUuaWQsIHR5cGUsIG5ld0dlb21ldHJ5LCBmZWF0dXJlLnRhZ3MpKTtcbiAgICB9XG5cbiAgICByZXR1cm4gbmV3RmVhdHVyZXM7XG59XG5cbmZ1bmN0aW9uIHNoaWZ0Q29vcmRzKHBvaW50cywgb2Zmc2V0KSB7XG4gICAgdmFyIG5ld1BvaW50cyA9IFtdO1xuICAgIG5ld1BvaW50cy5zaXplID0gcG9pbnRzLnNpemU7XG5cbiAgICBpZiAocG9pbnRzLnN0YXJ0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgbmV3UG9pbnRzLnN0YXJ0ID0gcG9pbnRzLnN0YXJ0O1xuICAgICAgICBuZXdQb2ludHMuZW5kID0gcG9pbnRzLmVuZDtcbiAgICB9XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHBvaW50cy5sZW5ndGg7IGkgKz0gMykge1xuICAgICAgICBuZXdQb2ludHMucHVzaChwb2ludHNbaV0gKyBvZmZzZXQsIHBvaW50c1tpICsgMV0sIHBvaW50c1tpICsgMl0pO1xuICAgIH1cbiAgICByZXR1cm4gbmV3UG9pbnRzO1xufVxuIiwiXG4vLyBUcmFuc2Zvcm1zIHRoZSBjb29yZGluYXRlcyBvZiBlYWNoIGZlYXR1cmUgaW4gdGhlIGdpdmVuIHRpbGUgZnJvbVxuLy8gbWVyY2F0b3ItcHJvamVjdGVkIHNwYWNlIGludG8gKGV4dGVudCB4IGV4dGVudCkgdGlsZSBzcGFjZS5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIHRyYW5zZm9ybVRpbGUodGlsZSwgZXh0ZW50KSB7XG4gICAgaWYgKHRpbGUudHJhbnNmb3JtZWQpIHJldHVybiB0aWxlO1xuXG4gICAgdmFyIHoyID0gMSA8PCB0aWxlLnosXG4gICAgICAgIHR4ID0gdGlsZS54LFxuICAgICAgICB0eSA9IHRpbGUueSxcbiAgICAgICAgaSwgaiwgaztcblxuICAgIGZvciAoaSA9IDA7IGkgPCB0aWxlLmZlYXR1cmVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBmZWF0dXJlID0gdGlsZS5mZWF0dXJlc1tpXSxcbiAgICAgICAgICAgIGdlb20gPSBmZWF0dXJlLmdlb21ldHJ5LFxuICAgICAgICAgICAgdHlwZSA9IGZlYXR1cmUudHlwZTtcblxuICAgICAgICBmZWF0dXJlLmdlb21ldHJ5ID0gW107XG5cbiAgICAgICAgaWYgKHR5cGUgPT09IDEpIHtcbiAgICAgICAgICAgIGZvciAoaiA9IDA7IGogPCBnZW9tLmxlbmd0aDsgaiArPSAyKSB7XG4gICAgICAgICAgICAgICAgZmVhdHVyZS5nZW9tZXRyeS5wdXNoKHRyYW5zZm9ybVBvaW50KGdlb21bal0sIGdlb21baiArIDFdLCBleHRlbnQsIHoyLCB0eCwgdHkpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGZvciAoaiA9IDA7IGogPCBnZW9tLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICAgICAgdmFyIHJpbmcgPSBbXTtcbiAgICAgICAgICAgICAgICBmb3IgKGsgPSAwOyBrIDwgZ2VvbVtqXS5sZW5ndGg7IGsgKz0gMikge1xuICAgICAgICAgICAgICAgICAgICByaW5nLnB1c2godHJhbnNmb3JtUG9pbnQoZ2VvbVtqXVtrXSwgZ2VvbVtqXVtrICsgMV0sIGV4dGVudCwgejIsIHR4LCB0eSkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBmZWF0dXJlLmdlb21ldHJ5LnB1c2gocmluZyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB0aWxlLnRyYW5zZm9ybWVkID0gdHJ1ZTtcblxuICAgIHJldHVybiB0aWxlO1xufVxuXG5mdW5jdGlvbiB0cmFuc2Zvcm1Qb2ludCh4LCB5LCBleHRlbnQsIHoyLCB0eCwgdHkpIHtcbiAgICByZXR1cm4gW1xuICAgICAgICBNYXRoLnJvdW5kKGV4dGVudCAqICh4ICogejIgLSB0eCkpLFxuICAgICAgICBNYXRoLnJvdW5kKGV4dGVudCAqICh5ICogejIgLSB0eSkpXTtcbn1cbiIsIlxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gY3JlYXRlVGlsZShmZWF0dXJlcywgeiwgdHgsIHR5LCBvcHRpb25zKSB7XG4gICAgdmFyIHRvbGVyYW5jZSA9IHogPT09IG9wdGlvbnMubWF4Wm9vbSA/IDAgOiBvcHRpb25zLnRvbGVyYW5jZSAvICgoMSA8PCB6KSAqIG9wdGlvbnMuZXh0ZW50KTtcbiAgICB2YXIgdGlsZSA9IHtcbiAgICAgICAgZmVhdHVyZXM6IFtdLFxuICAgICAgICBudW1Qb2ludHM6IDAsXG4gICAgICAgIG51bVNpbXBsaWZpZWQ6IDAsXG4gICAgICAgIG51bUZlYXR1cmVzOiAwLFxuICAgICAgICBzb3VyY2U6IG51bGwsXG4gICAgICAgIHg6IHR4LFxuICAgICAgICB5OiB0eSxcbiAgICAgICAgejogeixcbiAgICAgICAgdHJhbnNmb3JtZWQ6IGZhbHNlLFxuICAgICAgICBtaW5YOiAyLFxuICAgICAgICBtaW5ZOiAxLFxuICAgICAgICBtYXhYOiAtMSxcbiAgICAgICAgbWF4WTogMFxuICAgIH07XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBmZWF0dXJlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICB0aWxlLm51bUZlYXR1cmVzKys7XG4gICAgICAgIGFkZEZlYXR1cmUodGlsZSwgZmVhdHVyZXNbaV0sIHRvbGVyYW5jZSwgb3B0aW9ucyk7XG5cbiAgICAgICAgdmFyIG1pblggPSBmZWF0dXJlc1tpXS5taW5YO1xuICAgICAgICB2YXIgbWluWSA9IGZlYXR1cmVzW2ldLm1pblk7XG4gICAgICAgIHZhciBtYXhYID0gZmVhdHVyZXNbaV0ubWF4WDtcbiAgICAgICAgdmFyIG1heFkgPSBmZWF0dXJlc1tpXS5tYXhZO1xuXG4gICAgICAgIGlmIChtaW5YIDwgdGlsZS5taW5YKSB0aWxlLm1pblggPSBtaW5YO1xuICAgICAgICBpZiAobWluWSA8IHRpbGUubWluWSkgdGlsZS5taW5ZID0gbWluWTtcbiAgICAgICAgaWYgKG1heFggPiB0aWxlLm1heFgpIHRpbGUubWF4WCA9IG1heFg7XG4gICAgICAgIGlmIChtYXhZID4gdGlsZS5tYXhZKSB0aWxlLm1heFkgPSBtYXhZO1xuICAgIH1cbiAgICByZXR1cm4gdGlsZTtcbn1cblxuZnVuY3Rpb24gYWRkRmVhdHVyZSh0aWxlLCBmZWF0dXJlLCB0b2xlcmFuY2UsIG9wdGlvbnMpIHtcblxuICAgIHZhciBnZW9tID0gZmVhdHVyZS5nZW9tZXRyeSxcbiAgICAgICAgdHlwZSA9IGZlYXR1cmUudHlwZSxcbiAgICAgICAgc2ltcGxpZmllZCA9IFtdO1xuXG4gICAgaWYgKHR5cGUgPT09ICdQb2ludCcgfHwgdHlwZSA9PT0gJ011bHRpUG9pbnQnKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZ2VvbS5sZW5ndGg7IGkgKz0gMykge1xuICAgICAgICAgICAgc2ltcGxpZmllZC5wdXNoKGdlb21baV0pO1xuICAgICAgICAgICAgc2ltcGxpZmllZC5wdXNoKGdlb21baSArIDFdKTtcbiAgICAgICAgICAgIHRpbGUubnVtUG9pbnRzKys7XG4gICAgICAgICAgICB0aWxlLm51bVNpbXBsaWZpZWQrKztcbiAgICAgICAgfVxuXG4gICAgfSBlbHNlIGlmICh0eXBlID09PSAnTGluZVN0cmluZycpIHtcbiAgICAgICAgYWRkTGluZShzaW1wbGlmaWVkLCBnZW9tLCB0aWxlLCB0b2xlcmFuY2UsIGZhbHNlLCBmYWxzZSk7XG5cbiAgICB9IGVsc2UgaWYgKHR5cGUgPT09ICdNdWx0aUxpbmVTdHJpbmcnIHx8IHR5cGUgPT09ICdQb2x5Z29uJykge1xuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgZ2VvbS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgYWRkTGluZShzaW1wbGlmaWVkLCBnZW9tW2ldLCB0aWxlLCB0b2xlcmFuY2UsIHR5cGUgPT09ICdQb2x5Z29uJywgaSA9PT0gMCk7XG4gICAgICAgIH1cblxuICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gJ011bHRpUG9seWdvbicpIHtcblxuICAgICAgICBmb3IgKHZhciBrID0gMDsgayA8IGdlb20ubGVuZ3RoOyBrKyspIHtcbiAgICAgICAgICAgIHZhciBwb2x5Z29uID0gZ2VvbVtrXTtcbiAgICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCBwb2x5Z29uLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgYWRkTGluZShzaW1wbGlmaWVkLCBwb2x5Z29uW2ldLCB0aWxlLCB0b2xlcmFuY2UsIHRydWUsIGkgPT09IDApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHNpbXBsaWZpZWQubGVuZ3RoKSB7XG4gICAgICAgIHZhciB0YWdzID0gZmVhdHVyZS50YWdzIHx8IG51bGw7XG4gICAgICAgIGlmICh0eXBlID09PSAnTGluZVN0cmluZycgJiYgb3B0aW9ucy5saW5lTWV0cmljcykge1xuICAgICAgICAgICAgdGFncyA9IHt9O1xuICAgICAgICAgICAgZm9yICh2YXIga2V5IGluIGZlYXR1cmUudGFncykgdGFnc1trZXldID0gZmVhdHVyZS50YWdzW2tleV07XG4gICAgICAgICAgICB0YWdzWydtYXBib3hfY2xpcF9zdGFydCddID0gZ2VvbS5zdGFydCAvIGdlb20uc2l6ZTtcbiAgICAgICAgICAgIHRhZ3NbJ21hcGJveF9jbGlwX2VuZCddID0gZ2VvbS5lbmQgLyBnZW9tLnNpemU7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHRpbGVGZWF0dXJlID0ge1xuICAgICAgICAgICAgZ2VvbWV0cnk6IHNpbXBsaWZpZWQsXG4gICAgICAgICAgICB0eXBlOiB0eXBlID09PSAnUG9seWdvbicgfHwgdHlwZSA9PT0gJ011bHRpUG9seWdvbicgPyAzIDpcbiAgICAgICAgICAgICAgICB0eXBlID09PSAnTGluZVN0cmluZycgfHwgdHlwZSA9PT0gJ011bHRpTGluZVN0cmluZycgPyAyIDogMSxcbiAgICAgICAgICAgIHRhZ3M6IHRhZ3NcbiAgICAgICAgfTtcbiAgICAgICAgaWYgKGZlYXR1cmUuaWQgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHRpbGVGZWF0dXJlLmlkID0gZmVhdHVyZS5pZDtcbiAgICAgICAgfVxuICAgICAgICB0aWxlLmZlYXR1cmVzLnB1c2godGlsZUZlYXR1cmUpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gYWRkTGluZShyZXN1bHQsIGdlb20sIHRpbGUsIHRvbGVyYW5jZSwgaXNQb2x5Z29uLCBpc091dGVyKSB7XG4gICAgdmFyIHNxVG9sZXJhbmNlID0gdG9sZXJhbmNlICogdG9sZXJhbmNlO1xuXG4gICAgaWYgKHRvbGVyYW5jZSA+IDAgJiYgKGdlb20uc2l6ZSA8IChpc1BvbHlnb24gPyBzcVRvbGVyYW5jZSA6IHRvbGVyYW5jZSkpKSB7XG4gICAgICAgIHRpbGUubnVtUG9pbnRzICs9IGdlb20ubGVuZ3RoIC8gMztcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHZhciByaW5nID0gW107XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGdlb20ubGVuZ3RoOyBpICs9IDMpIHtcbiAgICAgICAgaWYgKHRvbGVyYW5jZSA9PT0gMCB8fCBnZW9tW2kgKyAyXSA+IHNxVG9sZXJhbmNlKSB7XG4gICAgICAgICAgICB0aWxlLm51bVNpbXBsaWZpZWQrKztcbiAgICAgICAgICAgIHJpbmcucHVzaChnZW9tW2ldKTtcbiAgICAgICAgICAgIHJpbmcucHVzaChnZW9tW2kgKyAxXSk7XG4gICAgICAgIH1cbiAgICAgICAgdGlsZS5udW1Qb2ludHMrKztcbiAgICB9XG5cbiAgICBpZiAoaXNQb2x5Z29uKSByZXdpbmQocmluZywgaXNPdXRlcik7XG5cbiAgICByZXN1bHQucHVzaChyaW5nKTtcbn1cblxuZnVuY3Rpb24gcmV3aW5kKHJpbmcsIGNsb2Nrd2lzZSkge1xuICAgIHZhciBhcmVhID0gMDtcbiAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gcmluZy5sZW5ndGgsIGogPSBsZW4gLSAyOyBpIDwgbGVuOyBqID0gaSwgaSArPSAyKSB7XG4gICAgICAgIGFyZWEgKz0gKHJpbmdbaV0gLSByaW5nW2pdKSAqIChyaW5nW2kgKyAxXSArIHJpbmdbaiArIDFdKTtcbiAgICB9XG4gICAgaWYgKGFyZWEgPiAwID09PSBjbG9ja3dpc2UpIHtcbiAgICAgICAgZm9yIChpID0gMCwgbGVuID0gcmluZy5sZW5ndGg7IGkgPCBsZW4gLyAyOyBpICs9IDIpIHtcbiAgICAgICAgICAgIHZhciB4ID0gcmluZ1tpXTtcbiAgICAgICAgICAgIHZhciB5ID0gcmluZ1tpICsgMV07XG4gICAgICAgICAgICByaW5nW2ldID0gcmluZ1tsZW4gLSAyIC0gaV07XG4gICAgICAgICAgICByaW5nW2kgKyAxXSA9IHJpbmdbbGVuIC0gMSAtIGldO1xuICAgICAgICAgICAgcmluZ1tsZW4gLSAyIC0gaV0gPSB4O1xuICAgICAgICAgICAgcmluZ1tsZW4gLSAxIC0gaV0gPSB5O1xuICAgICAgICB9XG4gICAgfVxufVxuIiwiXG5pbXBvcnQgY29udmVydCBmcm9tICcuL2NvbnZlcnQnOyAgICAgLy8gR2VvSlNPTiBjb252ZXJzaW9uIGFuZCBwcmVwcm9jZXNzaW5nXG5pbXBvcnQgY2xpcCBmcm9tICcuL2NsaXAnOyAgICAgICAgICAgLy8gc3RyaXBlIGNsaXBwaW5nIGFsZ29yaXRobVxuaW1wb3J0IHdyYXAgZnJvbSAnLi93cmFwJzsgICAgICAgICAgIC8vIGRhdGUgbGluZSBwcm9jZXNzaW5nXG5pbXBvcnQgdHJhbnNmb3JtIGZyb20gJy4vdHJhbnNmb3JtJzsgLy8gY29vcmRpbmF0ZSB0cmFuc2Zvcm1hdGlvblxuaW1wb3J0IGNyZWF0ZVRpbGUgZnJvbSAnLi90aWxlJzsgICAgIC8vIGZpbmFsIHNpbXBsaWZpZWQgdGlsZSBnZW5lcmF0aW9uXG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGdlb2pzb252dChkYXRhLCBvcHRpb25zKSB7XG4gICAgcmV0dXJuIG5ldyBHZW9KU09OVlQoZGF0YSwgb3B0aW9ucyk7XG59XG5cbmZ1bmN0aW9uIEdlb0pTT05WVChkYXRhLCBvcHRpb25zKSB7XG4gICAgb3B0aW9ucyA9IHRoaXMub3B0aW9ucyA9IGV4dGVuZChPYmplY3QuY3JlYXRlKHRoaXMub3B0aW9ucyksIG9wdGlvbnMpO1xuXG4gICAgdmFyIGRlYnVnID0gb3B0aW9ucy5kZWJ1ZztcblxuICAgIGlmIChkZWJ1ZykgY29uc29sZS50aW1lKCdwcmVwcm9jZXNzIGRhdGEnKTtcblxuICAgIGlmIChvcHRpb25zLm1heFpvb20gPCAwIHx8IG9wdGlvbnMubWF4Wm9vbSA+IDI0KSB0aHJvdyBuZXcgRXJyb3IoJ21heFpvb20gc2hvdWxkIGJlIGluIHRoZSAwLTI0IHJhbmdlJyk7XG4gICAgaWYgKG9wdGlvbnMucHJvbW90ZUlkICYmIG9wdGlvbnMuZ2VuZXJhdGVJZCkgdGhyb3cgbmV3IEVycm9yKCdwcm9tb3RlSWQgYW5kIGdlbmVyYXRlSWQgY2Fubm90IGJlIHVzZWQgdG9nZXRoZXIuJyk7XG5cbiAgICB2YXIgZmVhdHVyZXMgPSBjb252ZXJ0KGRhdGEsIG9wdGlvbnMpO1xuXG4gICAgdGhpcy50aWxlcyA9IHt9O1xuICAgIHRoaXMudGlsZUNvb3JkcyA9IFtdO1xuXG4gICAgaWYgKGRlYnVnKSB7XG4gICAgICAgIGNvbnNvbGUudGltZUVuZCgncHJlcHJvY2VzcyBkYXRhJyk7XG4gICAgICAgIGNvbnNvbGUubG9nKCdpbmRleDogbWF4Wm9vbTogJWQsIG1heFBvaW50czogJWQnLCBvcHRpb25zLmluZGV4TWF4Wm9vbSwgb3B0aW9ucy5pbmRleE1heFBvaW50cyk7XG4gICAgICAgIGNvbnNvbGUudGltZSgnZ2VuZXJhdGUgdGlsZXMnKTtcbiAgICAgICAgdGhpcy5zdGF0cyA9IHt9O1xuICAgICAgICB0aGlzLnRvdGFsID0gMDtcbiAgICB9XG5cbiAgICBmZWF0dXJlcyA9IHdyYXAoZmVhdHVyZXMsIG9wdGlvbnMpO1xuXG4gICAgLy8gc3RhcnQgc2xpY2luZyBmcm9tIHRoZSB0b3AgdGlsZSBkb3duXG4gICAgaWYgKGZlYXR1cmVzLmxlbmd0aCkgdGhpcy5zcGxpdFRpbGUoZmVhdHVyZXMsIDAsIDAsIDApO1xuXG4gICAgaWYgKGRlYnVnKSB7XG4gICAgICAgIGlmIChmZWF0dXJlcy5sZW5ndGgpIGNvbnNvbGUubG9nKCdmZWF0dXJlczogJWQsIHBvaW50czogJWQnLCB0aGlzLnRpbGVzWzBdLm51bUZlYXR1cmVzLCB0aGlzLnRpbGVzWzBdLm51bVBvaW50cyk7XG4gICAgICAgIGNvbnNvbGUudGltZUVuZCgnZ2VuZXJhdGUgdGlsZXMnKTtcbiAgICAgICAgY29uc29sZS5sb2coJ3RpbGVzIGdlbmVyYXRlZDonLCB0aGlzLnRvdGFsLCBKU09OLnN0cmluZ2lmeSh0aGlzLnN0YXRzKSk7XG4gICAgfVxufVxuXG5HZW9KU09OVlQucHJvdG90eXBlLm9wdGlvbnMgPSB7XG4gICAgbWF4Wm9vbTogMTQsICAgICAgICAgICAgLy8gbWF4IHpvb20gdG8gcHJlc2VydmUgZGV0YWlsIG9uXG4gICAgaW5kZXhNYXhab29tOiA1LCAgICAgICAgLy8gbWF4IHpvb20gaW4gdGhlIHRpbGUgaW5kZXhcbiAgICBpbmRleE1heFBvaW50czogMTAwMDAwLCAvLyBtYXggbnVtYmVyIG9mIHBvaW50cyBwZXIgdGlsZSBpbiB0aGUgdGlsZSBpbmRleFxuICAgIHRvbGVyYW5jZTogMywgICAgICAgICAgIC8vIHNpbXBsaWZpY2F0aW9uIHRvbGVyYW5jZSAoaGlnaGVyIG1lYW5zIHNpbXBsZXIpXG4gICAgZXh0ZW50OiA0MDk2LCAgICAgICAgICAgLy8gdGlsZSBleHRlbnRcbiAgICBidWZmZXI6IDY0LCAgICAgICAgICAgICAvLyB0aWxlIGJ1ZmZlciBvbiBlYWNoIHNpZGVcbiAgICBsaW5lTWV0cmljczogZmFsc2UsICAgICAvLyB3aGV0aGVyIHRvIGNhbGN1bGF0ZSBsaW5lIG1ldHJpY3NcbiAgICBwcm9tb3RlSWQ6IG51bGwsICAgICAgICAvLyBuYW1lIG9mIGEgZmVhdHVyZSBwcm9wZXJ0eSB0byBiZSBwcm9tb3RlZCB0byBmZWF0dXJlLmlkXG4gICAgZ2VuZXJhdGVJZDogZmFsc2UsICAgICAgLy8gd2hldGhlciB0byBnZW5lcmF0ZSBmZWF0dXJlIGlkcy4gQ2Fubm90IGJlIHVzZWQgd2l0aCBwcm9tb3RlSWRcbiAgICBkZWJ1ZzogMCAgICAgICAgICAgICAgICAvLyBsb2dnaW5nIGxldmVsICgwLCAxIG9yIDIpXG59O1xuXG5HZW9KU09OVlQucHJvdG90eXBlLnNwbGl0VGlsZSA9IGZ1bmN0aW9uIChmZWF0dXJlcywgeiwgeCwgeSwgY3osIGN4LCBjeSkge1xuXG4gICAgdmFyIHN0YWNrID0gW2ZlYXR1cmVzLCB6LCB4LCB5XSxcbiAgICAgICAgb3B0aW9ucyA9IHRoaXMub3B0aW9ucyxcbiAgICAgICAgZGVidWcgPSBvcHRpb25zLmRlYnVnO1xuXG4gICAgLy8gYXZvaWQgcmVjdXJzaW9uIGJ5IHVzaW5nIGEgcHJvY2Vzc2luZyBxdWV1ZVxuICAgIHdoaWxlIChzdGFjay5sZW5ndGgpIHtcbiAgICAgICAgeSA9IHN0YWNrLnBvcCgpO1xuICAgICAgICB4ID0gc3RhY2sucG9wKCk7XG4gICAgICAgIHogPSBzdGFjay5wb3AoKTtcbiAgICAgICAgZmVhdHVyZXMgPSBzdGFjay5wb3AoKTtcblxuICAgICAgICB2YXIgejIgPSAxIDw8IHosXG4gICAgICAgICAgICBpZCA9IHRvSUQoeiwgeCwgeSksXG4gICAgICAgICAgICB0aWxlID0gdGhpcy50aWxlc1tpZF07XG5cbiAgICAgICAgaWYgKCF0aWxlKSB7XG4gICAgICAgICAgICBpZiAoZGVidWcgPiAxKSBjb25zb2xlLnRpbWUoJ2NyZWF0aW9uJyk7XG5cbiAgICAgICAgICAgIHRpbGUgPSB0aGlzLnRpbGVzW2lkXSA9IGNyZWF0ZVRpbGUoZmVhdHVyZXMsIHosIHgsIHksIG9wdGlvbnMpO1xuICAgICAgICAgICAgdGhpcy50aWxlQ29vcmRzLnB1c2goe3o6IHosIHg6IHgsIHk6IHl9KTtcblxuICAgICAgICAgICAgaWYgKGRlYnVnKSB7XG4gICAgICAgICAgICAgICAgaWYgKGRlYnVnID4gMSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygndGlsZSB6JWQtJWQtJWQgKGZlYXR1cmVzOiAlZCwgcG9pbnRzOiAlZCwgc2ltcGxpZmllZDogJWQpJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHosIHgsIHksIHRpbGUubnVtRmVhdHVyZXMsIHRpbGUubnVtUG9pbnRzLCB0aWxlLm51bVNpbXBsaWZpZWQpO1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLnRpbWVFbmQoJ2NyZWF0aW9uJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZhciBrZXkgPSAneicgKyB6O1xuICAgICAgICAgICAgICAgIHRoaXMuc3RhdHNba2V5XSA9ICh0aGlzLnN0YXRzW2tleV0gfHwgMCkgKyAxO1xuICAgICAgICAgICAgICAgIHRoaXMudG90YWwrKztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIHNhdmUgcmVmZXJlbmNlIHRvIG9yaWdpbmFsIGdlb21ldHJ5IGluIHRpbGUgc28gdGhhdCB3ZSBjYW4gZHJpbGwgZG93biBsYXRlciBpZiB3ZSBzdG9wIG5vd1xuICAgICAgICB0aWxlLnNvdXJjZSA9IGZlYXR1cmVzO1xuXG4gICAgICAgIC8vIGlmIGl0J3MgdGhlIGZpcnN0LXBhc3MgdGlsaW5nXG4gICAgICAgIGlmICghY3opIHtcbiAgICAgICAgICAgIC8vIHN0b3AgdGlsaW5nIGlmIHdlIHJlYWNoZWQgbWF4IHpvb20sIG9yIGlmIHRoZSB0aWxlIGlzIHRvbyBzaW1wbGVcbiAgICAgICAgICAgIGlmICh6ID09PSBvcHRpb25zLmluZGV4TWF4Wm9vbSB8fCB0aWxlLm51bVBvaW50cyA8PSBvcHRpb25zLmluZGV4TWF4UG9pbnRzKSBjb250aW51ZTtcblxuICAgICAgICAvLyBpZiBhIGRyaWxsZG93biB0byBhIHNwZWNpZmljIHRpbGVcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIHN0b3AgdGlsaW5nIGlmIHdlIHJlYWNoZWQgYmFzZSB6b29tIG9yIG91ciB0YXJnZXQgdGlsZSB6b29tXG4gICAgICAgICAgICBpZiAoeiA9PT0gb3B0aW9ucy5tYXhab29tIHx8IHogPT09IGN6KSBjb250aW51ZTtcblxuICAgICAgICAgICAgLy8gc3RvcCB0aWxpbmcgaWYgaXQncyBub3QgYW4gYW5jZXN0b3Igb2YgdGhlIHRhcmdldCB0aWxlXG4gICAgICAgICAgICB2YXIgbSA9IDEgPDwgKGN6IC0geik7XG4gICAgICAgICAgICBpZiAoeCAhPT0gTWF0aC5mbG9vcihjeCAvIG0pIHx8IHkgIT09IE1hdGguZmxvb3IoY3kgLyBtKSkgY29udGludWU7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBpZiB3ZSBzbGljZSBmdXJ0aGVyIGRvd24sIG5vIG5lZWQgdG8ga2VlcCBzb3VyY2UgZ2VvbWV0cnlcbiAgICAgICAgdGlsZS5zb3VyY2UgPSBudWxsO1xuXG4gICAgICAgIGlmIChmZWF0dXJlcy5sZW5ndGggPT09IDApIGNvbnRpbnVlO1xuXG4gICAgICAgIGlmIChkZWJ1ZyA+IDEpIGNvbnNvbGUudGltZSgnY2xpcHBpbmcnKTtcblxuICAgICAgICAvLyB2YWx1ZXMgd2UnbGwgdXNlIGZvciBjbGlwcGluZ1xuICAgICAgICB2YXIgazEgPSAwLjUgKiBvcHRpb25zLmJ1ZmZlciAvIG9wdGlvbnMuZXh0ZW50LFxuICAgICAgICAgICAgazIgPSAwLjUgLSBrMSxcbiAgICAgICAgICAgIGszID0gMC41ICsgazEsXG4gICAgICAgICAgICBrNCA9IDEgKyBrMSxcbiAgICAgICAgICAgIHRsLCBibCwgdHIsIGJyLCBsZWZ0LCByaWdodDtcblxuICAgICAgICB0bCA9IGJsID0gdHIgPSBiciA9IG51bGw7XG5cbiAgICAgICAgbGVmdCAgPSBjbGlwKGZlYXR1cmVzLCB6MiwgeCAtIGsxLCB4ICsgazMsIDAsIHRpbGUubWluWCwgdGlsZS5tYXhYLCBvcHRpb25zKTtcbiAgICAgICAgcmlnaHQgPSBjbGlwKGZlYXR1cmVzLCB6MiwgeCArIGsyLCB4ICsgazQsIDAsIHRpbGUubWluWCwgdGlsZS5tYXhYLCBvcHRpb25zKTtcbiAgICAgICAgZmVhdHVyZXMgPSBudWxsO1xuXG4gICAgICAgIGlmIChsZWZ0KSB7XG4gICAgICAgICAgICB0bCA9IGNsaXAobGVmdCwgejIsIHkgLSBrMSwgeSArIGszLCAxLCB0aWxlLm1pblksIHRpbGUubWF4WSwgb3B0aW9ucyk7XG4gICAgICAgICAgICBibCA9IGNsaXAobGVmdCwgejIsIHkgKyBrMiwgeSArIGs0LCAxLCB0aWxlLm1pblksIHRpbGUubWF4WSwgb3B0aW9ucyk7XG4gICAgICAgICAgICBsZWZ0ID0gbnVsbDtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChyaWdodCkge1xuICAgICAgICAgICAgdHIgPSBjbGlwKHJpZ2h0LCB6MiwgeSAtIGsxLCB5ICsgazMsIDEsIHRpbGUubWluWSwgdGlsZS5tYXhZLCBvcHRpb25zKTtcbiAgICAgICAgICAgIGJyID0gY2xpcChyaWdodCwgejIsIHkgKyBrMiwgeSArIGs0LCAxLCB0aWxlLm1pblksIHRpbGUubWF4WSwgb3B0aW9ucyk7XG4gICAgICAgICAgICByaWdodCA9IG51bGw7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoZGVidWcgPiAxKSBjb25zb2xlLnRpbWVFbmQoJ2NsaXBwaW5nJyk7XG5cbiAgICAgICAgc3RhY2sucHVzaCh0bCB8fCBbXSwgeiArIDEsIHggKiAyLCAgICAgeSAqIDIpO1xuICAgICAgICBzdGFjay5wdXNoKGJsIHx8IFtdLCB6ICsgMSwgeCAqIDIsICAgICB5ICogMiArIDEpO1xuICAgICAgICBzdGFjay5wdXNoKHRyIHx8IFtdLCB6ICsgMSwgeCAqIDIgKyAxLCB5ICogMik7XG4gICAgICAgIHN0YWNrLnB1c2goYnIgfHwgW10sIHogKyAxLCB4ICogMiArIDEsIHkgKiAyICsgMSk7XG4gICAgfVxufTtcblxuR2VvSlNPTlZULnByb3RvdHlwZS5nZXRUaWxlID0gZnVuY3Rpb24gKHosIHgsIHkpIHtcbiAgICB2YXIgb3B0aW9ucyA9IHRoaXMub3B0aW9ucyxcbiAgICAgICAgZXh0ZW50ID0gb3B0aW9ucy5leHRlbnQsXG4gICAgICAgIGRlYnVnID0gb3B0aW9ucy5kZWJ1ZztcblxuICAgIGlmICh6IDwgMCB8fCB6ID4gMjQpIHJldHVybiBudWxsO1xuXG4gICAgdmFyIHoyID0gMSA8PCB6O1xuICAgIHggPSAoKHggJSB6MikgKyB6MikgJSB6MjsgLy8gd3JhcCB0aWxlIHggY29vcmRpbmF0ZVxuXG4gICAgdmFyIGlkID0gdG9JRCh6LCB4LCB5KTtcbiAgICBpZiAodGhpcy50aWxlc1tpZF0pIHJldHVybiB0cmFuc2Zvcm0odGhpcy50aWxlc1tpZF0sIGV4dGVudCk7XG5cbiAgICBpZiAoZGVidWcgPiAxKSBjb25zb2xlLmxvZygnZHJpbGxpbmcgZG93biB0byB6JWQtJWQtJWQnLCB6LCB4LCB5KTtcblxuICAgIHZhciB6MCA9IHosXG4gICAgICAgIHgwID0geCxcbiAgICAgICAgeTAgPSB5LFxuICAgICAgICBwYXJlbnQ7XG5cbiAgICB3aGlsZSAoIXBhcmVudCAmJiB6MCA+IDApIHtcbiAgICAgICAgejAtLTtcbiAgICAgICAgeDAgPSBNYXRoLmZsb29yKHgwIC8gMik7XG4gICAgICAgIHkwID0gTWF0aC5mbG9vcih5MCAvIDIpO1xuICAgICAgICBwYXJlbnQgPSB0aGlzLnRpbGVzW3RvSUQoejAsIHgwLCB5MCldO1xuICAgIH1cblxuICAgIGlmICghcGFyZW50IHx8ICFwYXJlbnQuc291cmNlKSByZXR1cm4gbnVsbDtcblxuICAgIC8vIGlmIHdlIGZvdW5kIGEgcGFyZW50IHRpbGUgY29udGFpbmluZyB0aGUgb3JpZ2luYWwgZ2VvbWV0cnksIHdlIGNhbiBkcmlsbCBkb3duIGZyb20gaXRcbiAgICBpZiAoZGVidWcgPiAxKSBjb25zb2xlLmxvZygnZm91bmQgcGFyZW50IHRpbGUgeiVkLSVkLSVkJywgejAsIHgwLCB5MCk7XG5cbiAgICBpZiAoZGVidWcgPiAxKSBjb25zb2xlLnRpbWUoJ2RyaWxsaW5nIGRvd24nKTtcbiAgICB0aGlzLnNwbGl0VGlsZShwYXJlbnQuc291cmNlLCB6MCwgeDAsIHkwLCB6LCB4LCB5KTtcbiAgICBpZiAoZGVidWcgPiAxKSBjb25zb2xlLnRpbWVFbmQoJ2RyaWxsaW5nIGRvd24nKTtcblxuICAgIHJldHVybiB0aGlzLnRpbGVzW2lkXSA/IHRyYW5zZm9ybSh0aGlzLnRpbGVzW2lkXSwgZXh0ZW50KSA6IG51bGw7XG59O1xuXG5mdW5jdGlvbiB0b0lEKHosIHgsIHkpIHtcbiAgICByZXR1cm4gKCgoMSA8PCB6KSAqIHkgKyB4KSAqIDMyKSArIHo7XG59XG5cbmZ1bmN0aW9uIGV4dGVuZChkZXN0LCBzcmMpIHtcbiAgICBmb3IgKHZhciBpIGluIHNyYykgZGVzdFtpXSA9IHNyY1tpXTtcbiAgICByZXR1cm4gZGVzdDtcbn1cbiIsIi8vIEBmbG93XG5cbmltcG9ydCB7IGdldEpTT04gfSBmcm9tICcuLi91dGlsL2FqYXgnO1xuXG5pbXBvcnQgcGVyZm9ybWFuY2UgZnJvbSAnLi4vdXRpbC9wZXJmb3JtYW5jZSc7XG5pbXBvcnQgcmV3aW5kIGZyb20gJ2dlb2pzb24tcmV3aW5kJztcbmltcG9ydCBHZW9KU09OV3JhcHBlciBmcm9tICcuL2dlb2pzb25fd3JhcHBlcic7XG5pbXBvcnQgdnRwYmYgZnJvbSAndnQtcGJmJztcbmltcG9ydCBzdXBlcmNsdXN0ZXIgZnJvbSAnc3VwZXJjbHVzdGVyJztcbmltcG9ydCBnZW9qc29udnQgZnJvbSAnZ2VvanNvbi12dCc7XG5pbXBvcnQgYXNzZXJ0IGZyb20gJ2Fzc2VydCc7XG5pbXBvcnQgVmVjdG9yVGlsZVdvcmtlclNvdXJjZSBmcm9tICcuL3ZlY3Rvcl90aWxlX3dvcmtlcl9zb3VyY2UnO1xuXG5pbXBvcnQgdHlwZSB7XG4gICAgV29ya2VyVGlsZVBhcmFtZXRlcnMsXG4gICAgV29ya2VyVGlsZUNhbGxiYWNrLFxufSBmcm9tICcuLi9zb3VyY2Uvd29ya2VyX3NvdXJjZSc7XG5cbmltcG9ydCB0eXBlIEFjdG9yIGZyb20gJy4uL3V0aWwvYWN0b3InO1xuaW1wb3J0IHR5cGUgU3R5bGVMYXllckluZGV4IGZyb20gJy4uL3N0eWxlL3N0eWxlX2xheWVyX2luZGV4JztcblxuaW1wb3J0IHR5cGUge0xvYWRWZWN0b3JEYXRhQ2FsbGJhY2t9IGZyb20gJy4vdmVjdG9yX3RpbGVfd29ya2VyX3NvdXJjZSc7XG5pbXBvcnQgdHlwZSB7UmVxdWVzdFBhcmFtZXRlcnN9IGZyb20gJy4uL3V0aWwvYWpheCc7XG5pbXBvcnQgdHlwZSB7IENhbGxiYWNrIH0gZnJvbSAnLi4vdHlwZXMvY2FsbGJhY2snO1xuaW1wb3J0IHR5cGUge0dlb0pTT05GZWF0dXJlfSBmcm9tICdAbWFwYm94L2dlb2pzb24tdHlwZXMnO1xuXG5leHBvcnQgdHlwZSBMb2FkR2VvSlNPTlBhcmFtZXRlcnMgPSB7XG4gICAgcmVxdWVzdD86IFJlcXVlc3RQYXJhbWV0ZXJzLFxuICAgIGRhdGE/OiBzdHJpbmcsXG4gICAgc291cmNlOiBzdHJpbmcsXG4gICAgY2x1c3RlcjogYm9vbGVhbixcbiAgICBzdXBlcmNsdXN0ZXJPcHRpb25zPzogT2JqZWN0LFxuICAgIGdlb2pzb25WdE9wdGlvbnM/OiBPYmplY3Rcbn07XG5cbmV4cG9ydCB0eXBlIExvYWRHZW9KU09OID0gKHBhcmFtczogTG9hZEdlb0pTT05QYXJhbWV0ZXJzLCBjYWxsYmFjazogQ2FsbGJhY2s8bWl4ZWQ+KSA9PiB2b2lkO1xuXG5leHBvcnQgaW50ZXJmYWNlIEdlb0pTT05JbmRleCB7XG4gICAgZ2V0VGlsZSh6OiBudW1iZXIsIHg6IG51bWJlciwgeTogbnVtYmVyKTogT2JqZWN0O1xuXG4gICAgLy8gc3VwZXJjbHVzdGVyIG1ldGhvZHNcbiAgICBnZXRDbHVzdGVyRXhwYW5zaW9uWm9vbShjbHVzdGVySWQ6IG51bWJlcik6IG51bWJlcjtcbiAgICBnZXRDaGlsZHJlbihjbHVzdGVySWQ6IG51bWJlcik6IEFycmF5PEdlb0pTT05GZWF0dXJlPjtcbiAgICBnZXRMZWF2ZXMoY2x1c3RlcklkOiBudW1iZXIsIGxpbWl0OiBudW1iZXIsIG9mZnNldDogbnVtYmVyKTogQXJyYXk8R2VvSlNPTkZlYXR1cmU+O1xufVxuXG5mdW5jdGlvbiBsb2FkR2VvSlNPTlRpbGUocGFyYW1zOiBXb3JrZXJUaWxlUGFyYW1ldGVycywgY2FsbGJhY2s6IExvYWRWZWN0b3JEYXRhQ2FsbGJhY2spIHtcbiAgICBjb25zdCBjYW5vbmljYWwgPSBwYXJhbXMudGlsZUlELmNhbm9uaWNhbDtcblxuICAgIGlmICghdGhpcy5fZ2VvSlNPTkluZGV4KSB7XG4gICAgICAgIHJldHVybiBjYWxsYmFjayhudWxsLCBudWxsKTsgIC8vIHdlIGNvdWxkbid0IGxvYWQgdGhlIGZpbGVcbiAgICB9XG5cbiAgICBjb25zdCBnZW9KU09OVGlsZSA9IHRoaXMuX2dlb0pTT05JbmRleC5nZXRUaWxlKGNhbm9uaWNhbC56LCBjYW5vbmljYWwueCwgY2Fub25pY2FsLnkpO1xuICAgIGlmICghZ2VvSlNPTlRpbGUpIHtcbiAgICAgICAgcmV0dXJuIGNhbGxiYWNrKG51bGwsIG51bGwpOyAvLyBub3RoaW5nIGluIHRoZSBnaXZlbiB0aWxlXG4gICAgfVxuXG4gICAgY29uc3QgZ2VvanNvbldyYXBwZXIgPSBuZXcgR2VvSlNPTldyYXBwZXIoZ2VvSlNPTlRpbGUuZmVhdHVyZXMpO1xuXG4gICAgLy8gRW5jb2RlIHRoZSBnZW9qc29uLXZ0IHRpbGUgaW50byBiaW5hcnkgdmVjdG9yIHRpbGUgZm9ybS4gIFRoaXNcbiAgICAvLyBpcyBhIGNvbnZlbmllbmNlIHRoYXQgYWxsb3dzIGBGZWF0dXJlSW5kZXhgIHRvIG9wZXJhdGUgdGhlIHNhbWUgd2F5XG4gICAgLy8gYWNyb3NzIGBWZWN0b3JUaWxlU291cmNlYCBhbmQgYEdlb0pTT05Tb3VyY2VgIGRhdGEuXG4gICAgbGV0IHBiZiA9IHZ0cGJmKGdlb2pzb25XcmFwcGVyKTtcbiAgICBpZiAocGJmLmJ5dGVPZmZzZXQgIT09IDAgfHwgcGJmLmJ5dGVMZW5ndGggIT09IHBiZi5idWZmZXIuYnl0ZUxlbmd0aCkge1xuICAgICAgICAvLyBDb21wYXRpYmlsaXR5IHdpdGggbm9kZSBCdWZmZXIgKGh0dHBzOi8vZ2l0aHViLmNvbS9tYXBib3gvcGJmL2lzc3Vlcy8zNSlcbiAgICAgICAgcGJmID0gbmV3IFVpbnQ4QXJyYXkocGJmKTtcbiAgICB9XG5cbiAgICBjYWxsYmFjayhudWxsLCB7XG4gICAgICAgIHZlY3RvclRpbGU6IGdlb2pzb25XcmFwcGVyLFxuICAgICAgICByYXdEYXRhOiBwYmYuYnVmZmVyXG4gICAgfSk7XG59XG5cbmV4cG9ydCB0eXBlIFNvdXJjZVN0YXRlID1cbiAgICB8ICdJZGxlJyAgICAgICAgICAgIC8vIFNvdXJjZSBlbXB0eSBvciBkYXRhIGxvYWRlZFxuICAgIHwgJ0NvYWxlc2NpbmcnICAgICAgLy8gRGF0YSBmaW5pc2hlZCBsb2FkaW5nLCBidXQgZGlzY2FyZCAnbG9hZERhdGEnIG1lc3NhZ2VzIHVudGlsIHJlY2VpdmluZyAnY29hbGVzY2VkJ1xuICAgIHwgJ05lZWRzTG9hZERhdGEnOyAgLy8gJ2xvYWREYXRhJyByZWNlaXZlZCB3aGlsZSBjb2FsZXNjaW5nLCB0cmlnZ2VyIG9uZSBtb3JlICdsb2FkRGF0YScgb24gcmVjZWl2aW5nICdjb2FsZXNjZWQnXG5cbi8qKlxuICogVGhlIHtAbGluayBXb3JrZXJTb3VyY2V9IGltcGxlbWVudGF0aW9uIHRoYXQgc3VwcG9ydHMge0BsaW5rIEdlb0pTT05Tb3VyY2V9LlxuICogVGhpcyBjbGFzcyBpcyBkZXNpZ25lZCB0byBiZSBlYXNpbHkgcmV1c2VkIHRvIHN1cHBvcnQgY3VzdG9tIHNvdXJjZSB0eXBlc1xuICogZm9yIGRhdGEgZm9ybWF0cyB0aGF0IGNhbiBiZSBwYXJzZWQvY29udmVydGVkIGludG8gYW4gaW4tbWVtb3J5IEdlb0pTT05cbiAqIHJlcHJlc2VudGF0aW9uLiAgVG8gZG8gc28sIGNyZWF0ZSBpdCB3aXRoXG4gKiBgbmV3IEdlb0pTT05Xb3JrZXJTb3VyY2UoYWN0b3IsIGxheWVySW5kZXgsIGN1c3RvbUxvYWRHZW9KU09ORnVuY3Rpb24pYC5cbiAqIEZvciBhIGZ1bGwgZXhhbXBsZSwgc2VlIFttYXBib3gtZ2wtdG9wb2pzb25dKGh0dHBzOi8vZ2l0aHViLmNvbS9kZXZlbG9wbWVudHNlZWQvbWFwYm94LWdsLXRvcG9qc29uKS5cbiAqXG4gKiBAcHJpdmF0ZVxuICovXG5jbGFzcyBHZW9KU09OV29ya2VyU291cmNlIGV4dGVuZHMgVmVjdG9yVGlsZVdvcmtlclNvdXJjZSB7XG4gICAgbG9hZEdlb0pTT046IExvYWRHZW9KU09OO1xuICAgIF9zdGF0ZTogU291cmNlU3RhdGU7XG4gICAgX3BlbmRpbmdDYWxsYmFjazogQ2FsbGJhY2s8e1xuICAgICAgICByZXNvdXJjZVRpbWluZz86IHtbc3RyaW5nXTogQXJyYXk8UGVyZm9ybWFuY2VSZXNvdXJjZVRpbWluZz59LFxuICAgICAgICBhYmFuZG9uZWQ/OiBib29sZWFuIH0+O1xuICAgIF9wZW5kaW5nTG9hZERhdGFQYXJhbXM6IExvYWRHZW9KU09OUGFyYW1ldGVycztcbiAgICBfZ2VvSlNPTkluZGV4OiBHZW9KU09OSW5kZXhcblxuICAgIC8qKlxuICAgICAqIEBwYXJhbSBbbG9hZEdlb0pTT05dIE9wdGlvbmFsIG1ldGhvZCBmb3IgY3VzdG9tIGxvYWRpbmcvcGFyc2luZyBvZlxuICAgICAqIEdlb0pTT04gYmFzZWQgb24gcGFyYW1ldGVycyBwYXNzZWQgZnJvbSB0aGUgbWFpbi10aHJlYWQgU291cmNlLlxuICAgICAqIFNlZSB7QGxpbmsgR2VvSlNPTldvcmtlclNvdXJjZSNsb2FkR2VvSlNPTn0uXG4gICAgICovXG4gICAgY29uc3RydWN0b3IoYWN0b3I6IEFjdG9yLCBsYXllckluZGV4OiBTdHlsZUxheWVySW5kZXgsIGxvYWRHZW9KU09OOiA/TG9hZEdlb0pTT04pIHtcbiAgICAgICAgc3VwZXIoYWN0b3IsIGxheWVySW5kZXgsIGxvYWRHZW9KU09OVGlsZSk7XG4gICAgICAgIGlmIChsb2FkR2VvSlNPTikge1xuICAgICAgICAgICAgdGhpcy5sb2FkR2VvSlNPTiA9IGxvYWRHZW9KU09OO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRmV0Y2hlcyAoaWYgYXBwcm9wcmlhdGUpLCBwYXJzZXMsIGFuZCBpbmRleCBnZW9qc29uIGRhdGEgaW50byB0aWxlcy4gVGhpc1xuICAgICAqIHByZXBhcmF0b3J5IG1ldGhvZCBtdXN0IGJlIGNhbGxlZCBiZWZvcmUge0BsaW5rIEdlb0pTT05Xb3JrZXJTb3VyY2UjbG9hZFRpbGV9XG4gICAgICogY2FuIGNvcnJlY3RseSBzZXJ2ZSB1cCB0aWxlcy5cbiAgICAgKlxuICAgICAqIERlZmVycyB0byB7QGxpbmsgR2VvSlNPTldvcmtlclNvdXJjZSNsb2FkR2VvSlNPTn0gZm9yIHRoZSBmZXRjaGluZy9wYXJzaW5nLFxuICAgICAqIGV4cGVjdGluZyBgY2FsbGJhY2soZXJyb3IsIGRhdGEpYCB0byBiZSBjYWxsZWQgd2l0aCBlaXRoZXIgYW4gZXJyb3Igb3IgYVxuICAgICAqIHBhcnNlZCBHZW9KU09OIG9iamVjdC5cbiAgICAgKlxuICAgICAqIFdoZW4gYGxvYWREYXRhYCByZXF1ZXN0cyBjb21lIGluIGZhc3RlciB0aGFuIHRoZXkgY2FuIGJlIHByb2Nlc3NlZCxcbiAgICAgKiB0aGV5IGFyZSBjb2FsZXNjZWQgaW50byBhIHNpbmdsZSByZXF1ZXN0IHVzaW5nIHRoZSBsYXRlc3QgZGF0YS5cbiAgICAgKiBTZWUge0BsaW5rIEdlb0pTT05Xb3JrZXJTb3VyY2UjY29hbGVzY2V9XG4gICAgICpcbiAgICAgKiBAcGFyYW0gcGFyYW1zXG4gICAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAgICovXG4gICAgbG9hZERhdGEocGFyYW1zOiBMb2FkR2VvSlNPTlBhcmFtZXRlcnMsIGNhbGxiYWNrOiBDYWxsYmFjazx7XG4gICAgICAgIHJlc291cmNlVGltaW5nPzoge1tzdHJpbmddOiBBcnJheTxQZXJmb3JtYW5jZVJlc291cmNlVGltaW5nPn0sXG4gICAgICAgIGFiYW5kb25lZD86IGJvb2xlYW4gfT4pIHtcbiAgICAgICAgaWYgKHRoaXMuX3BlbmRpbmdDYWxsYmFjaykge1xuICAgICAgICAgICAgLy8gVGVsbCB0aGUgZm9yZWdyb3VuZCB0aGUgcHJldmlvdXMgY2FsbCBoYXMgYmVlbiBhYmFuZG9uZWRcbiAgICAgICAgICAgIHRoaXMuX3BlbmRpbmdDYWxsYmFjayhudWxsLCB7IGFiYW5kb25lZDogdHJ1ZSB9KTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9wZW5kaW5nQ2FsbGJhY2sgPSBjYWxsYmFjaztcbiAgICAgICAgdGhpcy5fcGVuZGluZ0xvYWREYXRhUGFyYW1zID0gcGFyYW1zO1xuXG4gICAgICAgIGlmICh0aGlzLl9zdGF0ZSAmJlxuICAgICAgICAgICAgdGhpcy5fc3RhdGUgIT09ICdJZGxlJykge1xuICAgICAgICAgICAgdGhpcy5fc3RhdGUgPSAnTmVlZHNMb2FkRGF0YSc7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9zdGF0ZSA9ICdDb2FsZXNjaW5nJztcbiAgICAgICAgICAgIHRoaXMuX2xvYWREYXRhKCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBJbnRlcm5hbCBpbXBsZW1lbnRhdGlvbjogY2FsbGVkIGRpcmVjdGx5IGJ5IGBsb2FkRGF0YWBcbiAgICAgKiBvciBieSBgY29hbGVzY2VgIHVzaW5nIHN0b3JlZCBwYXJhbWV0ZXJzLlxuICAgICAqL1xuICAgIF9sb2FkRGF0YSgpIHtcbiAgICAgICAgaWYgKCF0aGlzLl9wZW5kaW5nQ2FsbGJhY2sgfHwgIXRoaXMuX3BlbmRpbmdMb2FkRGF0YVBhcmFtcykge1xuICAgICAgICAgICAgYXNzZXJ0KGZhbHNlKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBjYWxsYmFjayA9IHRoaXMuX3BlbmRpbmdDYWxsYmFjaztcbiAgICAgICAgY29uc3QgcGFyYW1zID0gdGhpcy5fcGVuZGluZ0xvYWREYXRhUGFyYW1zO1xuICAgICAgICBkZWxldGUgdGhpcy5fcGVuZGluZ0NhbGxiYWNrO1xuICAgICAgICBkZWxldGUgdGhpcy5fcGVuZGluZ0xvYWREYXRhUGFyYW1zO1xuXG4gICAgICAgIGNvbnN0IHBlcmYgPSAocGFyYW1zICYmIHBhcmFtcy5yZXF1ZXN0ICYmIHBhcmFtcy5yZXF1ZXN0LmNvbGxlY3RSZXNvdXJjZVRpbWluZykgP1xuICAgICAgICAgICAgbmV3IHBlcmZvcm1hbmNlLlBlcmZvcm1hbmNlKHBhcmFtcy5yZXF1ZXN0KSA6IGZhbHNlO1xuXG4gICAgICAgIHRoaXMubG9hZEdlb0pTT04ocGFyYW1zLCAoZXJyLCBkYXRhKSA9PiB7XG4gICAgICAgICAgICBpZiAoZXJyIHx8ICFkYXRhKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBkYXRhICE9PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhuZXcgRXJyb3IoXCJJbnB1dCBkYXRhIGlzIG5vdCBhIHZhbGlkIEdlb0pTT04gb2JqZWN0LlwiKSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJld2luZChkYXRhLCB0cnVlKTtcblxuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2dlb0pTT05JbmRleCA9IHBhcmFtcy5jbHVzdGVyID9cbiAgICAgICAgICAgICAgICAgICAgICAgIHN1cGVyY2x1c3RlcihwYXJhbXMuc3VwZXJjbHVzdGVyT3B0aW9ucykubG9hZChkYXRhLmZlYXR1cmVzKSA6XG4gICAgICAgICAgICAgICAgICAgICAgICBnZW9qc29udnQoZGF0YSwgcGFyYW1zLmdlb2pzb25WdE9wdGlvbnMpO1xuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB0aGlzLmxvYWRlZCA9IHt9O1xuXG4gICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0ge307XG4gICAgICAgICAgICAgICAgaWYgKHBlcmYpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVzb3VyY2VUaW1pbmdEYXRhID0gcGVyZi5maW5pc2goKTtcbiAgICAgICAgICAgICAgICAgICAgLy8gaXQncyBuZWNlc3NhcnkgdG8gZXZhbCB0aGUgcmVzdWx0IG9mIGdldEVudHJpZXNCeU5hbWUoKSBoZXJlIHZpYSBwYXJzZS9zdHJpbmdpZnlcbiAgICAgICAgICAgICAgICAgICAgLy8gbGF0ZSBldmFsdWF0aW9uIGluIHRoZSBtYWluIHRocmVhZCBjYXVzZXMgVHlwZUVycm9yOiBpbGxlZ2FsIGludm9jYXRpb25cbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlc291cmNlVGltaW5nRGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0LnJlc291cmNlVGltaW5nID0ge307XG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQucmVzb3VyY2VUaW1pbmdbcGFyYW1zLnNvdXJjZV0gPSBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KHJlc291cmNlVGltaW5nRGF0YSkpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIHJlc3VsdCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFdoaWxlIHByb2Nlc3NpbmcgYGxvYWREYXRhYCwgd2UgY29hbGVzY2UgYWxsIGZ1cnRoZXJcbiAgICAgKiBgbG9hZERhdGFgIG1lc3NhZ2VzIGludG8gYSBzaW5nbGUgY2FsbCB0byBfbG9hZERhdGFcbiAgICAgKiB0aGF0IHdpbGwgaGFwcGVuIG9uY2Ugd2UndmUgZmluaXNoZWQgcHJvY2Vzc2luZyB0aGVcbiAgICAgKiBmaXJzdCBtZXNzYWdlLiB7QGxpbmsgR2VvSlNPTlNvdXJjZSNfdXBkYXRlV29ya2VyRGF0YX1cbiAgICAgKiBpcyByZXNwb25zaWJsZSBmb3Igc2VuZGluZyB1cyB0aGUgYGNvYWxlc2NlYCBtZXNzYWdlXG4gICAgICogYXQgdGhlIHRpbWUgaXQgcmVjZWl2ZXMgYSByZXNwb25zZSBmcm9tIGBsb2FkRGF0YWBcbiAgICAgKlxuICAgICAqICAgICAgICAgIFN0YXRlOiBJZGxlXG4gICAgICogICAgICAgICAg4oaRICAgICAgICAgIHxcbiAgICAgKiAgICAgJ2NvYWxlc2NlJyAgICdsb2FkRGF0YSdcbiAgICAgKiAgICAgICAgICB8ICAgICAodHJpZ2dlcnMgbG9hZClcbiAgICAgKiAgICAgICAgICB8ICAgICAgICAgIOKGk1xuICAgICAqICAgICAgICBTdGF0ZTogQ29hbGVzY2luZ1xuICAgICAqICAgICAgICAgIOKGkSAgICAgICAgICB8XG4gICAgICogICAodHJpZ2dlcnMgbG9hZCkgICB8XG4gICAgICogICAgICdjb2FsZXNjZScgICAnbG9hZERhdGEnXG4gICAgICogICAgICAgICAgfCAgICAgICAgICDihpNcbiAgICAgKiAgICAgICAgU3RhdGU6IE5lZWRzTG9hZERhdGFcbiAgICAgKi9cbiAgICBjb2FsZXNjZSgpIHtcbiAgICAgICAgaWYgKHRoaXMuX3N0YXRlID09PSAnQ29hbGVzY2luZycpIHtcbiAgICAgICAgICAgIHRoaXMuX3N0YXRlID0gJ0lkbGUnO1xuICAgICAgICB9IGVsc2UgaWYgKHRoaXMuX3N0YXRlID09PSAnTmVlZHNMb2FkRGF0YScpIHtcbiAgICAgICAgICAgIHRoaXMuX3N0YXRlID0gJ0NvYWxlc2NpbmcnO1xuICAgICAgICAgICAgdGhpcy5fbG9hZERhdGEoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICogSW1wbGVtZW50cyB7QGxpbmsgV29ya2VyU291cmNlI3JlbG9hZFRpbGV9LlxuICAgICpcbiAgICAqIElmIHRoZSB0aWxlIGlzIGxvYWRlZCwgdXNlcyB0aGUgaW1wbGVtZW50YXRpb24gaW4gVmVjdG9yVGlsZVdvcmtlclNvdXJjZS5cbiAgICAqIE90aGVyd2lzZSwgc3VjaCBhcyBhZnRlciBhIHNldERhdGEoKSBjYWxsLCB3ZSBsb2FkIHRoZSB0aWxlIGZyZXNoLlxuICAgICpcbiAgICAqIEBwYXJhbSBwYXJhbXNcbiAgICAqIEBwYXJhbSBwYXJhbXMudWlkIFRoZSBVSUQgZm9yIHRoaXMgdGlsZS5cbiAgICAqL1xuICAgIHJlbG9hZFRpbGUocGFyYW1zOiBXb3JrZXJUaWxlUGFyYW1ldGVycywgY2FsbGJhY2s6IFdvcmtlclRpbGVDYWxsYmFjaykge1xuICAgICAgICBjb25zdCBsb2FkZWQgPSB0aGlzLmxvYWRlZCxcbiAgICAgICAgICAgIHVpZCA9IHBhcmFtcy51aWQ7XG5cbiAgICAgICAgaWYgKGxvYWRlZCAmJiBsb2FkZWRbdWlkXSkge1xuICAgICAgICAgICAgcmV0dXJuIHN1cGVyLnJlbG9hZFRpbGUocGFyYW1zLCBjYWxsYmFjayk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5sb2FkVGlsZShwYXJhbXMsIGNhbGxiYWNrKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEZldGNoIGFuZCBwYXJzZSBHZW9KU09OIGFjY29yZGluZyB0byB0aGUgZ2l2ZW4gcGFyYW1zLiAgQ2FsbHMgYGNhbGxiYWNrYFxuICAgICAqIHdpdGggYChlcnIsIGRhdGEpYCwgd2hlcmUgYGRhdGFgIGlzIGEgcGFyc2VkIEdlb0pTT04gb2JqZWN0LlxuICAgICAqXG4gICAgICogR2VvSlNPTiBpcyBsb2FkZWQgYW5kIHBhcnNlZCBmcm9tIGBwYXJhbXMudXJsYCBpZiBpdCBleGlzdHMsIG9yIGVsc2VcbiAgICAgKiBleHBlY3RlZCBhcyBhIGxpdGVyYWwgKHN0cmluZyBvciBvYmplY3QpIGBwYXJhbXMuZGF0YWAuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gcGFyYW1zXG4gICAgICogQHBhcmFtIFtwYXJhbXMudXJsXSBBIFVSTCB0byB0aGUgcmVtb3RlIEdlb0pTT04gZGF0YS5cbiAgICAgKiBAcGFyYW0gW3BhcmFtcy5kYXRhXSBMaXRlcmFsIEdlb0pTT04gZGF0YS4gTXVzdCBiZSBwcm92aWRlZCBpZiBgcGFyYW1zLnVybGAgaXMgbm90LlxuICAgICAqL1xuICAgIGxvYWRHZW9KU09OKHBhcmFtczogTG9hZEdlb0pTT05QYXJhbWV0ZXJzLCBjYWxsYmFjazogQ2FsbGJhY2s8bWl4ZWQ+KSB7XG4gICAgICAgIC8vIEJlY2F1c2Ugb2Ygc2FtZSBvcmlnaW4gaXNzdWVzLCB1cmxzIG11c3QgZWl0aGVyIGluY2x1ZGUgYW4gZXhwbGljaXRcbiAgICAgICAgLy8gb3JpZ2luIG9yIGFic29sdXRlIHBhdGguXG4gICAgICAgIC8vIGllOiAvZm9vL2Jhci5qc29uIG9yIGh0dHA6Ly9leGFtcGxlLmNvbS9iYXIuanNvblxuICAgICAgICAvLyBidXQgbm90IC4uL2Zvby9iYXIuanNvblxuICAgICAgICBpZiAocGFyYW1zLnJlcXVlc3QpIHtcbiAgICAgICAgICAgIGdldEpTT04ocGFyYW1zLnJlcXVlc3QsIGNhbGxiYWNrKTtcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgcGFyYW1zLmRhdGEgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhudWxsLCBKU09OLnBhcnNlKHBhcmFtcy5kYXRhKSk7XG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKG5ldyBFcnJvcihcIklucHV0IGRhdGEgaXMgbm90IGEgdmFsaWQgR2VvSlNPTiBvYmplY3QuXCIpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhuZXcgRXJyb3IoXCJJbnB1dCBkYXRhIGlzIG5vdCBhIHZhbGlkIEdlb0pTT04gb2JqZWN0LlwiKSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZW1vdmVTb3VyY2UocGFyYW1zOiB7c291cmNlOiBzdHJpbmd9LCBjYWxsYmFjazogQ2FsbGJhY2s8bWl4ZWQ+KSB7XG4gICAgICAgIGlmICh0aGlzLl9wZW5kaW5nQ2FsbGJhY2spIHtcbiAgICAgICAgICAgIC8vIERvbid0IGxlYWsgY2FsbGJhY2tzXG4gICAgICAgICAgICB0aGlzLl9wZW5kaW5nQ2FsbGJhY2sobnVsbCwgeyBhYmFuZG9uZWQ6IHRydWUgfSk7XG4gICAgICAgIH1cbiAgICAgICAgY2FsbGJhY2soKTtcbiAgICB9XG5cbiAgICBnZXRDbHVzdGVyRXhwYW5zaW9uWm9vbShwYXJhbXM6IHtjbHVzdGVySWQ6IG51bWJlcn0sIGNhbGxiYWNrOiBDYWxsYmFjazxudW1iZXI+KSB7XG4gICAgICAgIGNhbGxiYWNrKG51bGwsIHRoaXMuX2dlb0pTT05JbmRleC5nZXRDbHVzdGVyRXhwYW5zaW9uWm9vbShwYXJhbXMuY2x1c3RlcklkKSk7XG4gICAgfVxuXG4gICAgZ2V0Q2x1c3RlckNoaWxkcmVuKHBhcmFtczoge2NsdXN0ZXJJZDogbnVtYmVyfSwgY2FsbGJhY2s6IENhbGxiYWNrPEFycmF5PEdlb0pTT05GZWF0dXJlPj4pIHtcbiAgICAgICAgY2FsbGJhY2sobnVsbCwgdGhpcy5fZ2VvSlNPTkluZGV4LmdldENoaWxkcmVuKHBhcmFtcy5jbHVzdGVySWQpKTtcbiAgICB9XG5cbiAgICBnZXRDbHVzdGVyTGVhdmVzKHBhcmFtczoge2NsdXN0ZXJJZDogbnVtYmVyLCBsaW1pdDogbnVtYmVyLCBvZmZzZXQ6IG51bWJlcn0sIGNhbGxiYWNrOiBDYWxsYmFjazxBcnJheTxHZW9KU09ORmVhdHVyZT4+KSB7XG4gICAgICAgIGNhbGxiYWNrKG51bGwsIHRoaXMuX2dlb0pTT05JbmRleC5nZXRMZWF2ZXMocGFyYW1zLmNsdXN0ZXJJZCwgcGFyYW1zLmxpbWl0LCBwYXJhbXMub2Zmc2V0KSk7XG4gICAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBHZW9KU09OV29ya2VyU291cmNlO1xuIiwiLy8gQGZsb3dcblxuaW1wb3J0IEFjdG9yIGZyb20gJy4uL3V0aWwvYWN0b3InO1xuXG5pbXBvcnQgU3R5bGVMYXllckluZGV4IGZyb20gJy4uL3N0eWxlL3N0eWxlX2xheWVyX2luZGV4JztcbmltcG9ydCBWZWN0b3JUaWxlV29ya2VyU291cmNlIGZyb20gJy4vdmVjdG9yX3RpbGVfd29ya2VyX3NvdXJjZSc7XG5pbXBvcnQgUmFzdGVyREVNVGlsZVdvcmtlclNvdXJjZSBmcm9tICcuL3Jhc3Rlcl9kZW1fdGlsZV93b3JrZXJfc291cmNlJztcbmltcG9ydCBHZW9KU09OV29ya2VyU291cmNlIGZyb20gJy4vZ2VvanNvbl93b3JrZXJfc291cmNlJztcbmltcG9ydCBhc3NlcnQgZnJvbSAnYXNzZXJ0JztcbmltcG9ydCB7IHBsdWdpbiBhcyBnbG9iYWxSVExUZXh0UGx1Z2luIH0gZnJvbSAnLi9ydGxfdGV4dF9wbHVnaW4nO1xuXG5pbXBvcnQgdHlwZSB7XG4gICAgV29ya2VyU291cmNlLFxuICAgIFdvcmtlclRpbGVQYXJhbWV0ZXJzLFxuICAgIFdvcmtlckRFTVRpbGVQYXJhbWV0ZXJzLFxuICAgIFdvcmtlclRpbGVDYWxsYmFjayxcbiAgICBXb3JrZXJERU1UaWxlQ2FsbGJhY2ssXG4gICAgVGlsZVBhcmFtZXRlcnNcbn0gZnJvbSAnLi4vc291cmNlL3dvcmtlcl9zb3VyY2UnO1xuXG5pbXBvcnQgdHlwZSB7V29ya2VyR2xvYmFsU2NvcGVJbnRlcmZhY2V9IGZyb20gJy4uL3V0aWwvd2ViX3dvcmtlcic7XG5pbXBvcnQgdHlwZSB7Q2FsbGJhY2t9IGZyb20gJy4uL3R5cGVzL2NhbGxiYWNrJztcbmltcG9ydCB0eXBlIHtMYXllclNwZWNpZmljYXRpb259IGZyb20gJy4uL3N0eWxlLXNwZWMvdHlwZXMnO1xuXG4vKipcbiAqIEBwcml2YXRlXG4gKi9cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFdvcmtlciB7XG4gICAgc2VsZjogV29ya2VyR2xvYmFsU2NvcGVJbnRlcmZhY2U7XG4gICAgYWN0b3I6IEFjdG9yO1xuICAgIGxheWVySW5kZXhlczogeyBbc3RyaW5nXTogU3R5bGVMYXllckluZGV4IH07XG4gICAgd29ya2VyU291cmNlVHlwZXM6IHsgW3N0cmluZ106IENsYXNzPFdvcmtlclNvdXJjZT4gfTtcbiAgICB3b3JrZXJTb3VyY2VzOiB7IFtzdHJpbmddOiB7IFtzdHJpbmddOiB7IFtzdHJpbmddOiBXb3JrZXJTb3VyY2UgfSB9IH07XG4gICAgZGVtV29ya2VyU291cmNlczogeyBbc3RyaW5nXTogeyBbc3RyaW5nXTogUmFzdGVyREVNVGlsZVdvcmtlclNvdXJjZSB9IH07XG5cbiAgICBjb25zdHJ1Y3RvcihzZWxmOiBXb3JrZXJHbG9iYWxTY29wZUludGVyZmFjZSkge1xuICAgICAgICB0aGlzLnNlbGYgPSBzZWxmO1xuICAgICAgICB0aGlzLmFjdG9yID0gbmV3IEFjdG9yKHNlbGYsIHRoaXMpO1xuXG4gICAgICAgIHRoaXMubGF5ZXJJbmRleGVzID0ge307XG5cbiAgICAgICAgdGhpcy53b3JrZXJTb3VyY2VUeXBlcyA9IHtcbiAgICAgICAgICAgIHZlY3RvcjogVmVjdG9yVGlsZVdvcmtlclNvdXJjZSxcbiAgICAgICAgICAgIGdlb2pzb246IEdlb0pTT05Xb3JrZXJTb3VyY2VcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBbbWFwSWRdW3NvdXJjZVR5cGVdW3NvdXJjZU5hbWVdID0+IHdvcmtlciBzb3VyY2UgaW5zdGFuY2VcbiAgICAgICAgdGhpcy53b3JrZXJTb3VyY2VzID0ge307XG4gICAgICAgIHRoaXMuZGVtV29ya2VyU291cmNlcyA9IHt9O1xuXG4gICAgICAgIHRoaXMuc2VsZi5yZWdpc3RlcldvcmtlclNvdXJjZSA9IChuYW1lOiBzdHJpbmcsIFdvcmtlclNvdXJjZTogQ2xhc3M8V29ya2VyU291cmNlPikgPT4ge1xuICAgICAgICAgICAgaWYgKHRoaXMud29ya2VyU291cmNlVHlwZXNbbmFtZV0pIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFdvcmtlciBzb3VyY2Ugd2l0aCBuYW1lIFwiJHtuYW1lfVwiIGFscmVhZHkgcmVnaXN0ZXJlZC5gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMud29ya2VyU291cmNlVHlwZXNbbmFtZV0gPSBXb3JrZXJTb3VyY2U7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5zZWxmLnJlZ2lzdGVyUlRMVGV4dFBsdWdpbiA9IChydGxUZXh0UGx1Z2luOiB7YXBwbHlBcmFiaWNTaGFwaW5nOiBGdW5jdGlvbiwgcHJvY2Vzc0JpZGlyZWN0aW9uYWxUZXh0OiBGdW5jdGlvbiwgcHJvY2Vzc1N0eWxlZEJpZGlyZWN0aW9uYWxUZXh0PzogRnVuY3Rpb259KSA9PiB7XG4gICAgICAgICAgICBpZiAoZ2xvYmFsUlRMVGV4dFBsdWdpbi5pc0xvYWRlZCgpKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdSVEwgdGV4dCBwbHVnaW4gYWxyZWFkeSByZWdpc3RlcmVkLicpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZ2xvYmFsUlRMVGV4dFBsdWdpblsnYXBwbHlBcmFiaWNTaGFwaW5nJ10gPSBydGxUZXh0UGx1Z2luLmFwcGx5QXJhYmljU2hhcGluZztcbiAgICAgICAgICAgIGdsb2JhbFJUTFRleHRQbHVnaW5bJ3Byb2Nlc3NCaWRpcmVjdGlvbmFsVGV4dCddID0gcnRsVGV4dFBsdWdpbi5wcm9jZXNzQmlkaXJlY3Rpb25hbFRleHQ7XG4gICAgICAgICAgICBnbG9iYWxSVExUZXh0UGx1Z2luWydwcm9jZXNzU3R5bGVkQmlkaXJlY3Rpb25hbFRleHQnXSA9IHJ0bFRleHRQbHVnaW4ucHJvY2Vzc1N0eWxlZEJpZGlyZWN0aW9uYWxUZXh0O1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIHNldExheWVycyhtYXBJZDogc3RyaW5nLCBsYXllcnM6IEFycmF5PExheWVyU3BlY2lmaWNhdGlvbj4sIGNhbGxiYWNrOiBXb3JrZXJUaWxlQ2FsbGJhY2spIHtcbiAgICAgICAgdGhpcy5nZXRMYXllckluZGV4KG1hcElkKS5yZXBsYWNlKGxheWVycyk7XG4gICAgICAgIGNhbGxiYWNrKCk7XG4gICAgfVxuXG4gICAgdXBkYXRlTGF5ZXJzKG1hcElkOiBzdHJpbmcsIHBhcmFtczoge2xheWVyczogQXJyYXk8TGF5ZXJTcGVjaWZpY2F0aW9uPiwgcmVtb3ZlZElkczogQXJyYXk8c3RyaW5nPn0sIGNhbGxiYWNrOiBXb3JrZXJUaWxlQ2FsbGJhY2spIHtcbiAgICAgICAgdGhpcy5nZXRMYXllckluZGV4KG1hcElkKS51cGRhdGUocGFyYW1zLmxheWVycywgcGFyYW1zLnJlbW92ZWRJZHMpO1xuICAgICAgICBjYWxsYmFjaygpO1xuICAgIH1cblxuICAgIGxvYWRUaWxlKG1hcElkOiBzdHJpbmcsIHBhcmFtczogV29ya2VyVGlsZVBhcmFtZXRlcnMgJiB7dHlwZTogc3RyaW5nfSwgY2FsbGJhY2s6IFdvcmtlclRpbGVDYWxsYmFjaykge1xuICAgICAgICBhc3NlcnQocGFyYW1zLnR5cGUpO1xuICAgICAgICB0aGlzLmdldFdvcmtlclNvdXJjZShtYXBJZCwgcGFyYW1zLnR5cGUsIHBhcmFtcy5zb3VyY2UpLmxvYWRUaWxlKHBhcmFtcywgY2FsbGJhY2spO1xuICAgIH1cblxuICAgIGxvYWRERU1UaWxlKG1hcElkOiBzdHJpbmcsIHBhcmFtczogV29ya2VyREVNVGlsZVBhcmFtZXRlcnMsIGNhbGxiYWNrOiBXb3JrZXJERU1UaWxlQ2FsbGJhY2spIHtcbiAgICAgICAgdGhpcy5nZXRERU1Xb3JrZXJTb3VyY2UobWFwSWQsIHBhcmFtcy5zb3VyY2UpLmxvYWRUaWxlKHBhcmFtcywgY2FsbGJhY2spO1xuICAgIH1cblxuICAgIHJlbG9hZFRpbGUobWFwSWQ6IHN0cmluZywgcGFyYW1zOiBXb3JrZXJUaWxlUGFyYW1ldGVycyAmIHt0eXBlOiBzdHJpbmd9LCBjYWxsYmFjazogV29ya2VyVGlsZUNhbGxiYWNrKSB7XG4gICAgICAgIGFzc2VydChwYXJhbXMudHlwZSk7XG4gICAgICAgIHRoaXMuZ2V0V29ya2VyU291cmNlKG1hcElkLCBwYXJhbXMudHlwZSwgcGFyYW1zLnNvdXJjZSkucmVsb2FkVGlsZShwYXJhbXMsIGNhbGxiYWNrKTtcbiAgICB9XG5cbiAgICBhYm9ydFRpbGUobWFwSWQ6IHN0cmluZywgcGFyYW1zOiBUaWxlUGFyYW1ldGVycyAmIHt0eXBlOiBzdHJpbmd9LCBjYWxsYmFjazogV29ya2VyVGlsZUNhbGxiYWNrKSB7XG4gICAgICAgIGFzc2VydChwYXJhbXMudHlwZSk7XG4gICAgICAgIHRoaXMuZ2V0V29ya2VyU291cmNlKG1hcElkLCBwYXJhbXMudHlwZSwgcGFyYW1zLnNvdXJjZSkuYWJvcnRUaWxlKHBhcmFtcywgY2FsbGJhY2spO1xuICAgIH1cblxuICAgIHJlbW92ZVRpbGUobWFwSWQ6IHN0cmluZywgcGFyYW1zOiBUaWxlUGFyYW1ldGVycyAmIHt0eXBlOiBzdHJpbmd9LCBjYWxsYmFjazogV29ya2VyVGlsZUNhbGxiYWNrKSB7XG4gICAgICAgIGFzc2VydChwYXJhbXMudHlwZSk7XG4gICAgICAgIHRoaXMuZ2V0V29ya2VyU291cmNlKG1hcElkLCBwYXJhbXMudHlwZSwgcGFyYW1zLnNvdXJjZSkucmVtb3ZlVGlsZShwYXJhbXMsIGNhbGxiYWNrKTtcbiAgICB9XG5cbiAgICByZW1vdmVERU1UaWxlKG1hcElkOiBzdHJpbmcsIHBhcmFtczogVGlsZVBhcmFtZXRlcnMpIHtcbiAgICAgICAgdGhpcy5nZXRERU1Xb3JrZXJTb3VyY2UobWFwSWQsIHBhcmFtcy5zb3VyY2UpLnJlbW92ZVRpbGUocGFyYW1zKTtcbiAgICB9XG5cbiAgICByZW1vdmVTb3VyY2UobWFwSWQ6IHN0cmluZywgcGFyYW1zOiB7c291cmNlOiBzdHJpbmd9ICYge3R5cGU6IHN0cmluZ30sIGNhbGxiYWNrOiBXb3JrZXJUaWxlQ2FsbGJhY2spIHtcbiAgICAgICAgYXNzZXJ0KHBhcmFtcy50eXBlKTtcbiAgICAgICAgYXNzZXJ0KHBhcmFtcy5zb3VyY2UpO1xuXG4gICAgICAgIGlmICghdGhpcy53b3JrZXJTb3VyY2VzW21hcElkXSB8fFxuICAgICAgICAgICAgIXRoaXMud29ya2VyU291cmNlc1ttYXBJZF1bcGFyYW1zLnR5cGVdIHx8XG4gICAgICAgICAgICAhdGhpcy53b3JrZXJTb3VyY2VzW21hcElkXVtwYXJhbXMudHlwZV1bcGFyYW1zLnNvdXJjZV0pIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHdvcmtlciA9IHRoaXMud29ya2VyU291cmNlc1ttYXBJZF1bcGFyYW1zLnR5cGVdW3BhcmFtcy5zb3VyY2VdO1xuICAgICAgICBkZWxldGUgdGhpcy53b3JrZXJTb3VyY2VzW21hcElkXVtwYXJhbXMudHlwZV1bcGFyYW1zLnNvdXJjZV07XG5cbiAgICAgICAgaWYgKHdvcmtlci5yZW1vdmVTb3VyY2UgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgd29ya2VyLnJlbW92ZVNvdXJjZShwYXJhbXMsIGNhbGxiYWNrKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBMb2FkIGEge0BsaW5rIFdvcmtlclNvdXJjZX0gc2NyaXB0IGF0IHBhcmFtcy51cmwuICBUaGUgc2NyaXB0IGlzIHJ1blxuICAgICAqICh1c2luZyBpbXBvcnRTY3JpcHRzKSB3aXRoIGByZWdpc3RlcldvcmtlclNvdXJjZWAgaW4gc2NvcGUsIHdoaWNoIGlzIGFcbiAgICAgKiBmdW5jdGlvbiB0YWtpbmcgYChuYW1lLCB3b3JrZXJTb3VyY2VPYmplY3QpYC5cbiAgICAgKiAgQHByaXZhdGVcbiAgICAgKi9cbiAgICBsb2FkV29ya2VyU291cmNlKG1hcDogc3RyaW5nLCBwYXJhbXM6IHsgdXJsOiBzdHJpbmcgfSwgY2FsbGJhY2s6IENhbGxiYWNrPHZvaWQ+KSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICB0aGlzLnNlbGYuaW1wb3J0U2NyaXB0cyhwYXJhbXMudXJsKTtcbiAgICAgICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKGUudG9TdHJpbmcoKSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBsb2FkUlRMVGV4dFBsdWdpbihtYXA6IHN0cmluZywgcGx1Z2luVVJMOiBzdHJpbmcsIGNhbGxiYWNrOiBDYWxsYmFjazx2b2lkPikge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgaWYgKCFnbG9iYWxSVExUZXh0UGx1Z2luLmlzTG9hZGVkKCkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNlbGYuaW1wb3J0U2NyaXB0cyhwbHVnaW5VUkwpO1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGdsb2JhbFJUTFRleHRQbHVnaW4uaXNMb2FkZWQoKSA/XG4gICAgICAgICAgICAgICAgICAgIG51bGwgOlxuICAgICAgICAgICAgICAgICAgICBuZXcgRXJyb3IoYFJUTCBUZXh0IFBsdWdpbiBmYWlsZWQgdG8gaW1wb3J0IHNjcmlwdHMgZnJvbSAke3BsdWdpblVSTH1gKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKGUudG9TdHJpbmcoKSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBnZXRMYXllckluZGV4KG1hcElkOiBzdHJpbmcpIHtcbiAgICAgICAgbGV0IGxheWVySW5kZXhlcyA9IHRoaXMubGF5ZXJJbmRleGVzW21hcElkXTtcbiAgICAgICAgaWYgKCFsYXllckluZGV4ZXMpIHtcbiAgICAgICAgICAgIGxheWVySW5kZXhlcyA9IHRoaXMubGF5ZXJJbmRleGVzW21hcElkXSA9IG5ldyBTdHlsZUxheWVySW5kZXgoKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbGF5ZXJJbmRleGVzO1xuICAgIH1cblxuICAgIGdldFdvcmtlclNvdXJjZShtYXBJZDogc3RyaW5nLCB0eXBlOiBzdHJpbmcsIHNvdXJjZTogc3RyaW5nKSB7XG4gICAgICAgIGlmICghdGhpcy53b3JrZXJTb3VyY2VzW21hcElkXSlcbiAgICAgICAgICAgIHRoaXMud29ya2VyU291cmNlc1ttYXBJZF0gPSB7fTtcbiAgICAgICAgaWYgKCF0aGlzLndvcmtlclNvdXJjZXNbbWFwSWRdW3R5cGVdKVxuICAgICAgICAgICAgdGhpcy53b3JrZXJTb3VyY2VzW21hcElkXVt0eXBlXSA9IHt9O1xuXG4gICAgICAgIGlmICghdGhpcy53b3JrZXJTb3VyY2VzW21hcElkXVt0eXBlXVtzb3VyY2VdKSB7XG4gICAgICAgICAgICAvLyB1c2UgYSB3cmFwcGVkIGFjdG9yIHNvIHRoYXQgd2UgY2FuIGF0dGFjaCBhIHRhcmdldCBtYXBJZCBwYXJhbVxuICAgICAgICAgICAgLy8gdG8gYW55IG1lc3NhZ2VzIGludm9rZWQgYnkgdGhlIFdvcmtlclNvdXJjZVxuICAgICAgICAgICAgY29uc3QgYWN0b3IgPSB7XG4gICAgICAgICAgICAgICAgc2VuZDogKHR5cGUsIGRhdGEsIGNhbGxiYWNrKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYWN0b3Iuc2VuZCh0eXBlLCBkYXRhLCBjYWxsYmFjaywgbWFwSWQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHRoaXMud29ya2VyU291cmNlc1ttYXBJZF1bdHlwZV1bc291cmNlXSA9IG5ldyAodGhpcy53b3JrZXJTb3VyY2VUeXBlc1t0eXBlXTogYW55KSgoYWN0b3I6IGFueSksIHRoaXMuZ2V0TGF5ZXJJbmRleChtYXBJZCkpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXMud29ya2VyU291cmNlc1ttYXBJZF1bdHlwZV1bc291cmNlXTtcbiAgICB9XG5cbiAgICBnZXRERU1Xb3JrZXJTb3VyY2UobWFwSWQ6IHN0cmluZywgc291cmNlOiBzdHJpbmcpIHtcbiAgICAgICAgaWYgKCF0aGlzLmRlbVdvcmtlclNvdXJjZXNbbWFwSWRdKVxuICAgICAgICAgICAgdGhpcy5kZW1Xb3JrZXJTb3VyY2VzW21hcElkXSA9IHt9O1xuXG4gICAgICAgIGlmICghdGhpcy5kZW1Xb3JrZXJTb3VyY2VzW21hcElkXVtzb3VyY2VdKSB7XG4gICAgICAgICAgICB0aGlzLmRlbVdvcmtlclNvdXJjZXNbbWFwSWRdW3NvdXJjZV0gPSBuZXcgUmFzdGVyREVNVGlsZVdvcmtlclNvdXJjZSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXMuZGVtV29ya2VyU291cmNlc1ttYXBJZF1bc291cmNlXTtcbiAgICB9XG59XG5cbi8qIGdsb2JhbCBzZWxmLCBXb3JrZXJHbG9iYWxTY29wZSAqL1xuaWYgKHR5cGVvZiBXb3JrZXJHbG9iYWxTY29wZSAhPT0gJ3VuZGVmaW5lZCcgJiZcbiAgICB0eXBlb2Ygc2VsZiAhPT0gJ3VuZGVmaW5lZCcgJiZcbiAgICBzZWxmIGluc3RhbmNlb2YgV29ya2VyR2xvYmFsU2NvcGUpIHtcbiAgICBuZXcgV29ya2VyKHNlbGYpO1xufVxuIl0sIm5hbWVzIjpbImNvbnN0IiwibGV0Iiwic3RyIiwicmVmUHJvcGVydGllcyIsImsiLCJ0aGlzIiwiY3JlYXRlU3R5bGVMYXllciIsImZlYXR1cmVGaWx0ZXIiLCJ2YWx1ZXMiLCJsYXllckNvbmZpZ3MiLCJsYXllciIsImludGVycG9sYXRlIiwiQW5jaG9yIiwiUG9pbnQiLCJHTFlQSF9QQkZfQk9SREVSIiwiUXVldWUiLCJkaXN0VG9TZWdtZW50U3F1YXJlZCIsIm11cm11cjMiLCJtdXJtdXIyIiwiRVhURU5UIiwiRXZhbHVhdGlvblBhcmFtZXRlcnMiLCJtaW4iLCJtYXgiLCJhbGxvd3NMZXR0ZXJTcGFjaW5nIiwic2hhcGVUZXh0IiwiV3JpdGluZ01vZGUiLCJhbGxvd3NWZXJ0aWNhbFdyaXRpbmdNb2RlIiwic2hhcGVJY29uIiwid2Fybk9uY2UiLCJsaW5lIiwiYW5jaG9yIiwiY2xhc3NpZnlSaW5ncyIsIlNJWkVfUEFDS19GQUNUT1IiLCJTeW1ib2xCdWNrZXQiLCJwb3RwYWNrIiwiQWxwaGFJbWFnZSIsInN0YWNrIiwiZ2x5cGhzIiwiaWQiLCJzcmMiLCJiaW4iLCJyZWdpc3RlciIsIk92ZXJzY2FsZWRUaWxlSUQiLCJDb2xsaXNpb25Cb3hBcnJheSIsIkRpY3Rpb25hcnlDb2RlciIsIkZlYXR1cmVJbmRleCIsImFzc2VydCIsIm1hcE9iamVjdCIsIkltYWdlQXRsYXMiLCJMaW5lQnVja2V0IiwiRmlsbEJ1Y2tldCIsIkZpbGxFeHRydXNpb25CdWNrZXQiLCJnZXRBcnJheUJ1ZmZlciIsInZ0IiwiUHJvdG9idWYiLCJwZXJmb3JtYW5jZSIsImV4dGVuZCIsIkRFTURhdGEiLCJtdnQiLCJnZW9tZXRyeSIsInBvaW50IiwicmVxdWlyZSQkMCIsIkdlb0pTT05XcmFwcGVyIiwiRmVhdHVyZVdyYXBwZXIiLCJQYmYiLCJzb3J0IiwiY2xpcExpbmUiLCJhZGRGZWF0dXJlIiwicmV3aW5kIiwidHJhbnNmb3JtIiwidnRwYmYiLCJzdXBlciIsImdldEpTT04iLCJXb3JrZXIiLCJBY3RvciIsImdsb2JhbFJUTFRleHRQbHVnaW4iXSwibWFwcGluZ3MiOiI7O0FBR0EsU0FBUyxTQUFTLENBQUMsR0FBRyxFQUFFO0lBQ3BCQSxJQUFNLElBQUksR0FBRyxPQUFPLEdBQUcsQ0FBQztJQUN4QixJQUFJLElBQUksS0FBSyxRQUFRLElBQUksSUFBSSxLQUFLLFNBQVMsSUFBSSxJQUFJLEtBQUssUUFBUSxJQUFJLEdBQUcsS0FBSyxTQUFTLElBQUksR0FBRyxLQUFLLElBQUk7VUFD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S0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3RCQyxJQUFJLHNCQUFXLENBQUM7O1FBRWhCLEtBQUtBLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDdENBLElBQUksRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNqQkEsSUFBSSxFQUFFLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQzs7O1lBR3JCLElBQUksRUFBRSxDQUFDLENBQUMsR0FBRyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUU7Z0JBQ3hCLFNBQVM7YUFDWixNQUFNLElBQUksRUFBRSxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUU7Z0JBQ2xCLEVBQUUsR0FBRyxJQUFJWSxlQUFLLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUM7YUFDckYsTUFBTSxJQUFJLEVBQUUsQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFO2dCQUNsQixFQUFFLEdBQUcsSUFBSUEsZUFBSyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDO2FBQ3JGOztZQUVELElBQUksRUFBRSxDQUFDLENBQUMsR0FBRyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUU7Z0JBQ3hCLFNBQVM7YUFDWixNQUFNLElBQUksRUFBRSxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUU7Z0JBQ2xCLEVBQUUsR0FBRyxJQUFJQSxlQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUM7YUFDckYsTUFBTSxJQUFJLEVBQUUsQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFO2dCQUNsQixFQUFFLEdBQUcsSUFBSUEsZUFBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDO2FBQ3JGOztZQUVELElBQUksRUFBRSxDQUFDLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUU7Z0JBQzFCLFNBQVM7YUFDWixNQUFNLElBQUksRUFBRSxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUU7Z0JBQ25CLEVBQUUsR0FBRyxJQUFJQSxlQUFLLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUM7YUFDckYsTUFBTSxJQUFJLEVBQUUsQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFO2dCQUNuQixFQUFFLEdBQUcsSUFBSUEsZUFBSyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDO2FBQ3JGOztZQUVELElBQUksRUFBRSxDQUFDLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUU7Z0JBQzFCLFNBQVM7YUFDWixNQUFNLElBQUksRUFBRSxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUU7Z0JBQ25CLEVBQUUsR0FBRyxJQUFJQSxlQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUM7YUFDckYsTUFBTSxJQUFJLEVBQUUsQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFO2dCQUNuQixFQUFFLEdBQUcsSUFBSUEsZUFBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDO2FBQ3JGOztZQUVELElBQUksQ0FBQyxXQUFXLElBQUksQ0FB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QUMsVUFBVSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxJQUFJLEtBQUssRUFBRSxDQUFDO0VBQ25ELEtBQUssQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLElBQUksS0FBSyxDQUFDLENBQUM7RUFDbEQsS0FBSyxDQUFDLEVBQUUsRUFBRSxLQUFLLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUM7O0VBRXpDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsTUFBTSxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsSUFBSSxNQUFNLEtBQUssRUFBRSxDQUFDLElBQUksVUFBVSxDQUFDO0VBQ2pGLEVBQUUsR0FBRyxDQUFDLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO0VBQzlCLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsTUFBTSxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsSUFBSSxNQUFNLEtBQUssRUFBRSxDQUFDLElBQUksVUFBVSxDQUFDO0VBQ2pGLEVBQUUsSUFBSSxFQUFFLENBQUM7RUFDVDs7Q0FFRCxFQUFFLElBQUksR0FBRyxDQUFDLE1BQU0sQ0FBQzs7Q0FFakIsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLENBQUM7Q0FDaEIsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxNQUFNLElBQUksVUFBVSxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLElBQUksVUFBVSxJQUFJLE1BQU0sS0FBSyxFQUFFLENBQUMsSUFBSSxVQUFVLENBQUM7Q0FDakcsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLENBQUM7Q0FDaEIsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQUUsR0FBRyxNQUFNLElBQUksVUFBVSxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLElBQUksVUFBVSxJQUFJLE1BQU0sS0FBSyxFQUFFLENBQUMsS0FBSyxVQUFVLENBQUM7Q0FDbkcsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLENBQUM7O0NBRWhCLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQztDQUNoQjs7QUFFRCxHQUFHLFFBQWEsS0FBSyxXQUFXLEVBQUU7RUFDaEMsY0FBYyxHQUFHLGtCQUFpQjs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FDckRwQyxTQUFTLGlCQUFpQixDQUFDLEdBQUcsRUFBRSxJQUFJLEVBQUU7RUFDcEM7SUFDRSxDQUFDLEdBQUcsR0FBRyxDQUFDLE1BQU07SUFDZCxDQUFDLEdBQUcsSUFBSSxHQUFHLENBQUM7SUFDWixDQUFDLEdBQUcsQ0FBQztJQUNMLENBQUMsQ0FBQzs7RUFFSixPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUU7R0FDZCxDQUFDO0tBQ0MsRUFBRSxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUk7TUFDekIsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsSUFBSSxLQUFLLENBQUMsQ0FBQztNQUNsQyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxJQUFJLEtBQUssRUFBRSxDQUFDO01BQ25DLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLElBQUksS0FBSyxFQUFFLENBQUMsQ0FBQzs7SUFFdEMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsTUFBTSxJQUFJLFVBQVUsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxJQUFJLFVBQVUsSUFBSSxNQUFNLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQztJQUNqRixDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUNkLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLE1BQU0sSUFBSSxVQUFVLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsSUFBSSxVQUFVLElBQUksTUFBTSxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUM7O0NBRXBGLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsTUFBTSxJQUFJLFVBQVUsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxJQUFJLFVBQVUsSUFBSSxNQUFNLEtBQUssRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDOztJQUVsRixDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ1AsRUFBRSxDQUFDLENBQUM7R0FDTDs7RUFFRCxRQUFRLENBQUM7RUFDVCxLQUFLLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxJQUFJLEtBQUssRUFBRSxDQUFDO0VBQ2xELEtBQUssQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLElBQUksS0FBSyxDQUFDLENBQUM7RUFDakQsS0FBSyxDQUFDLEVBQUUsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUM7VUFDaEMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsTUFBTSxJQUFJLFVBQVUsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxJQUFJLFVBQVUsSUFBSSxNQUFNLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQztHQUN4Rjs7RUFFRCxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztFQUNkLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLE1BQU0sSUFBSSxVQUFVLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsSUFBSSxVQUFVLElBQUksTUFBTSxLQUFLLEVBQUUsQ0FBQyxDQUFDLENB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LEdBQUcsS0FBSyxHQUFHLElBQUksR0FBRyxDQUFDLENBQUM7WUFDekIsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksR0FBRyxDQUFDLENBQUM7WUFDckIsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNwQixJQUFJLENBQUMsR0FBRyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQ2xDLElBQUksRUFBRSxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUN6RSxJQUFJLE9BQU8sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQzdELElBQUksUUFBUSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDckUsTUFBTSxDQUFDLEdBQUcsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsR0FBRyxDQUFDLENBQUM7U0FDbEQ7O1FBRUQsSUFBSSxDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUM7UUFDNUIsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDO1FBQ2IsSUFBSSxDQUFDLEdBQUcsS0FBSyxDQUFD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QU8sQ0FBQyxHQUFHLENBQUMsMEJBQTBCLEVBQUUsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsR0FBRyxDQUFDLEdBQUM7U0FDM0Y7O1FBRUQsSUFBSSxHQUFHLElBQUUsT0FBTyxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsR0FBQzs7UUFFdkMsT0FBTyxJQUFJLENBQUM7S0FDZjs7SUFFRCxXQUFXLEVBQUUsVUFBVSxJQUFJLEVBQUUsSUFBSSxFQUFFOzs7UUFDL0IsSUFBSSxNQUFNLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksR0FBRyxHQUFHLEdBQUcsSUFBSSxHQUFHLEdBQUcsR0FBRyxDQUFDO1FBQ3ZELElBQUksTUFBTSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNsRCxJQUFJLE1BQU0sR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxHQUFHLEdBQUcsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxHQUFHLEdBQUcsR0FBRyxJQUFJLEdBQUcsR0FBRyxHQUFHLENBQUM7UUFDL0UsSUFBSSxNQUFNLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDOztRQUVsRCxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksR0FBRyxFQUFFO1lBQzFCLE1BQU0sR0FBRyxDQUFDLEdBQUcsQ0FBQztZQUNkLE1BQU0sR0FBRyxHQUFHLENBQUM7U0FDaEIsTUFBTSxJQUFJLE1BQU0sR0FBRyxNQUFNLEVBQUU7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SSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO2FBQ2hFO1NBQ0o7UUFDRCxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ1AsRUFBRSxHQUFHLENBQUMsQ0FBQztLQUNWOztJQUVELElBQUksSUFBSSxHQUFHLEdBQUcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO0lBQzFCLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDWCxRQUFRLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsU0FBUyxDQUFDLENBQUM7SUFDbEMsR0FBRyxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7O0lBRWxCLEdBQUcsQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUMxQixHQUFHLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQztJQUNkLEdBQUcsQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQztDQUN0Qjs7QUFFRCxTQUFTLFlBQVksQ0FBQyxLQUFLLEVBQUUsR0FBRyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUU7SUFDcEQsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7UUFDbkMsSUFBSSxJQUFJLEdBQUcsRUFBRSxDQUFDO1FBQ2QsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQ2xELEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7S0FDbEI7Q0FDSjs7QUFFRCxTQUFTLFFBQVEsQ0FBQyxDQUFDLEVBQUU7SUFDakIsT0FBTyxDQUFDLEdBQUcsR0FBRyxHQUFHLEdBQUcsQ0FB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QUFJLENBQUMsRUFBRTtRQUNyQyxJQUFJLFNBQVMsS0FBSyxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxXQUFXLEVBQUU7WUFDOUMsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO1lBQ3JCLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDbkIsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDMUI7UUFDRCxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7S0FDcEI7O0lBRUQsSUFBSSxTQUFTLElBQUVDLFFBQU0sQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLEdBQUM7O0lBRXJDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7Q0FDckI7O0FBRUQsU0FBU0EsUUFBTSxDQUFDLElBQUksRUFBRSxTQUFTLEVBQUU7SUFDN0IsSUFBSSxJQUFJLEdBQUcsQ0FBQyxDQUFDO0lBQ2IsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsR0FBRyxHQUFHLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUU7UUFDcEUsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUM3RDtJQUNELElBQUksSUFBSSxHQUFHLENBQUMsS0FBSyxTQUFTLEVBQUU7UUFDeEIsS0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUFFLEdBQUcsR0FBRyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQyxFQUFF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
