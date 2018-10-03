define(['./chunk1.js'], function (__chunk_1) { 'use strict';

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

          var workerTile = this.loading[uid] = new __chunk_1.WorkerTile(params);
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
                clipLine(geometry, newGeometry, k1, k2, axis, false, options.lineMetrics);

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

    function clipLine(geom, newGeom, k1, k2, axis, isPolygon, trackMetrics) {

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
            clipLine(geom[i], newGeom, k1, k2, axis, isPolygon, false);
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
            addFeature(tile, features[i], tolerance, options);

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

    function addFeature(tile, feature, tolerance, options) {

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
            layerIndexes = this.layerIndexes[mapId] = new __chunk_1.StyleLayerIndex();
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2VyLmpzIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zcmMvdXRpbC9wZXJmb3JtYW5jZS5qcyIsIi4uLy4uLy4uLy4uL3NyYy9zb3VyY2UvdmVjdG9yX3RpbGVfd29ya2VyX3NvdXJjZS5qcyIsIi4uLy4uLy4uLy4uL3NyYy9zb3VyY2UvcmFzdGVyX2RlbV90aWxlX3dvcmtlcl9zb3VyY2UuanMiLCIuLi8uLi8uLi8uLi9ub2RlX21vZHVsZXMvd2dzODQvaW5kZXguanMiLCIuLi8uLi8uLi8uLi9ub2RlX21vZHVsZXMvQG1hcGJveC9nZW9qc29uLWFyZWEvaW5kZXguanMiLCIuLi8uLi8uLi8uLi9ub2RlX21vZHVsZXMvZ2VvanNvbi1yZXdpbmQvaW5kZXguanMiLCIuLi8uLi8uLi8uLi9zcmMvc291cmNlL2dlb2pzb25fd3JhcHBlci5qcyIsIi4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy92dC1wYmYvbGliL2dlb2pzb25fd3JhcHBlci5qcyIsIi4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy92dC1wYmYvaW5kZXguanMiLCIuLi8uLi8uLi8uLi9ub2RlX21vZHVsZXMva2RidXNoL3NyYy9zb3J0LmpzIiwiLi4vLi4vLi4vLi4vbm9kZV9tb2R1bGVzL2tkYnVzaC9zcmMvcmFuZ2UuanMiLCIuLi8uLi8uLi8uLi9ub2RlX21vZHVsZXMva2RidXNoL3NyYy93aXRoaW4uanMiLCIuLi8uLi8uLi8uLi9ub2RlX21vZHVsZXMva2RidXNoL3NyYy9pbmRleC5qcyIsIi4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy9zdXBlcmNsdXN0ZXIvaW5kZXguanMiLCIuLi8uLi8uLi8uLi9ub2RlX21vZHVsZXMvZ2VvanNvbi12dC9zcmMvc2ltcGxpZnkuanMiLCIuLi8uLi8uLi8uLi9ub2RlX21vZHVsZXMvZ2VvanNvbi12dC9zcmMvZmVhdHVyZS5qcyIsIi4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy9nZW9qc29uLXZ0L3NyYy9jb252ZXJ0LmpzIiwiLi4vLi4vLi4vLi4vbm9kZV9tb2R1bGVzL2dlb2pzb24tdnQvc3JjL2NsaXAuanMiLCIuLi8uLi8uLi8uLi9ub2RlX21vZHVsZXMvZ2VvanNvbi12dC9zcmMvd3JhcC5qcyIsIi4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy9nZW9qc29uLXZ0L3NyYy90cmFuc2Zvcm0uanMiLCIuLi8uLi8uLi8uLi9ub2RlX21vZHVsZXMvZ2VvanNvbi12dC9zcmMvdGlsZS5qcyIsIi4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy9nZW9qc29uLXZ0L3NyYy9pbmRleC5qcyIsIi4uLy4uLy4uLy4uL3NyYy9zb3VyY2UvZ2VvanNvbl93b3JrZXJfc291cmNlLmpzIiwiLi4vLi4vLi4vLi4vc3JjL3NvdXJjZS93b3JrZXIuanMiXSwic291cmNlc0NvbnRlbnQiOlsiLy8gQGZsb3dcblxuaW1wb3J0IHR5cGUge1JlcXVlc3RQYXJhbWV0ZXJzfSBmcm9tICcuLi91dGlsL2FqYXgnO1xuXG4vLyBXcmFwcyBwZXJmb3JtYW5jZSB0byBmYWNpbGl0YXRlIHRlc3Rpbmdcbi8vIE5vdCBpbmNvcnBvcmF0ZWQgaW50byBicm93c2VyLmpzIGJlY2F1c2UgdGhlIGxhdHRlciBpcyBwb2lzb25vdXMgd2hlbiB1c2VkIG91dHNpZGUgdGhlIG1haW4gdGhyZWFkXG5jb25zdCBwZXJmb3JtYW5jZUV4aXN0cyA9IHR5cGVvZiBwZXJmb3JtYW5jZSAhPT0gJ3VuZGVmaW5lZCc7XG5jb25zdCB3cmFwcGVyID0ge307XG5cbndyYXBwZXIuZ2V0RW50cmllc0J5TmFtZSA9ICh1cmw6IHN0cmluZykgPT4ge1xuICAgIGlmIChwZXJmb3JtYW5jZUV4aXN0cyAmJiBwZXJmb3JtYW5jZSAmJiBwZXJmb3JtYW5jZS5nZXRFbnRyaWVzQnlOYW1lKVxuICAgICAgICByZXR1cm4gcGVyZm9ybWFuY2UuZ2V0RW50cmllc0J5TmFtZSh1cmwpO1xuICAgIGVsc2VcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xufTtcblxud3JhcHBlci5tYXJrID0gKG5hbWU6IHN0cmluZykgPT4ge1xuICAgIGlmIChwZXJmb3JtYW5jZUV4aXN0cyAmJiBwZXJmb3JtYW5jZSAmJiBwZXJmb3JtYW5jZS5tYXJrKVxuICAgICAgICByZXR1cm4gcGVyZm9ybWFuY2UubWFyayhuYW1lKTtcbiAgICBlbHNlXG4gICAgICAgIHJldHVybiBmYWxzZTtcbn07XG5cbndyYXBwZXIubWVhc3VyZSA9IChuYW1lOiBzdHJpbmcsIHN0YXJ0TWFyazogc3RyaW5nLCBlbmRNYXJrOiBzdHJpbmcpID0+IHtcbiAgICBpZiAocGVyZm9ybWFuY2VFeGlzdHMgJiYgcGVyZm9ybWFuY2UgJiYgcGVyZm9ybWFuY2UubWVhc3VyZSlcbiAgICAgICAgcmV0dXJuIHBlcmZvcm1hbmNlLm1lYXN1cmUobmFtZSwgc3RhcnRNYXJrLCBlbmRNYXJrKTtcbiAgICBlbHNlXG4gICAgICAgIHJldHVybiBmYWxzZTtcbn07XG5cbndyYXBwZXIuY2xlYXJNYXJrcyA9IChuYW1lOiBzdHJpbmcpID0+IHtcbiAgICBpZiAocGVyZm9ybWFuY2VFeGlzdHMgJiYgcGVyZm9ybWFuY2UgJiYgcGVyZm9ybWFuY2UuY2xlYXJNYXJrcylcbiAgICAgICAgcmV0dXJuIHBlcmZvcm1hbmNlLmNsZWFyTWFya3MobmFtZSk7XG4gICAgZWxzZVxuICAgICAgICByZXR1cm4gZmFsc2U7XG59O1xuXG53cmFwcGVyLmNsZWFyTWVhc3VyZXMgPSAobmFtZTogc3RyaW5nKSA9PiB7XG4gICAgaWYgKHBlcmZvcm1hbmNlRXhpc3RzICYmIHBlcmZvcm1hbmNlICYmIHBlcmZvcm1hbmNlLmNsZWFyTWVhc3VyZXMpXG4gICAgICAgIHJldHVybiBwZXJmb3JtYW5jZS5jbGVhck1lYXN1cmVzKG5hbWUpO1xuICAgIGVsc2VcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xufTtcblxuLyoqXG4gKiBTYWZlIHdyYXBwZXIgZm9yIHRoZSBwZXJmb3JtYW5jZSByZXNvdXJjZSB0aW1pbmcgQVBJIGluIHdlYiB3b3JrZXJzIHdpdGggZ3JhY2VmdWwgZGVncmFkYXRpb25cbiAqXG4gKiBAcGFyYW0ge1JlcXVlc3RQYXJhbWV0ZXJzfSByZXF1ZXN0XG4gKiBAcHJpdmF0ZVxuICovXG5jbGFzcyBQZXJmb3JtYW5jZSB7XG4gICAgX21hcmtzOiB7c3RhcnQ6IHN0cmluZywgZW5kOiBzdHJpbmcsIG1lYXN1cmU6IHN0cmluZ307XG5cbiAgICBjb25zdHJ1Y3RvciAocmVxdWVzdDogUmVxdWVzdFBhcmFtZXRlcnMpIHtcbiAgICAgICAgdGhpcy5fbWFya3MgPSB7XG4gICAgICAgICAgICBzdGFydDogW3JlcXVlc3QudXJsLCAnc3RhcnQnXS5qb2luKCcjJyksXG4gICAgICAgICAgICBlbmQ6IFtyZXF1ZXN0LnVybCwgJ2VuZCddLmpvaW4oJyMnKSxcbiAgICAgICAgICAgIG1lYXN1cmU6IHJlcXVlc3QudXJsLnRvU3RyaW5nKClcbiAgICAgICAgfTtcblxuICAgICAgICB3cmFwcGVyLm1hcmsodGhpcy5fbWFya3Muc3RhcnQpO1xuICAgIH1cblxuICAgIGZpbmlzaCgpIHtcbiAgICAgICAgd3JhcHBlci5tYXJrKHRoaXMuX21hcmtzLmVuZCk7XG4gICAgICAgIGxldCByZXNvdXJjZVRpbWluZ0RhdGEgPSB3cmFwcGVyLmdldEVudHJpZXNCeU5hbWUodGhpcy5fbWFya3MubWVhc3VyZSk7XG5cbiAgICAgICAgLy8gZmFsbGJhY2sgaWYgd2ViIHdvcmtlciBpbXBsZW1lbnRhdGlvbiBvZiBwZXJmLmdldEVudHJpZXNCeU5hbWUgcmV0dXJucyBlbXB0eVxuICAgICAgICBpZiAocmVzb3VyY2VUaW1pbmdEYXRhLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgd3JhcHBlci5tZWFzdXJlKHRoaXMuX21hcmtzLm1lYXN1cmUsIHRoaXMuX21hcmtzLnN0YXJ0LCB0aGlzLl9tYXJrcy5lbmQpO1xuICAgICAgICAgICAgcmVzb3VyY2VUaW1pbmdEYXRhID0gd3JhcHBlci5nZXRFbnRyaWVzQnlOYW1lKHRoaXMuX21hcmtzLm1lYXN1cmUpO1xuXG4gICAgICAgICAgICAvLyBjbGVhbnVwXG4gICAgICAgICAgICB3cmFwcGVyLmNsZWFyTWFya3ModGhpcy5fbWFya3Muc3RhcnQpO1xuICAgICAgICAgICAgd3JhcHBlci5jbGVhck1hcmtzKHRoaXMuX21hcmtzLmVuZCk7XG4gICAgICAgICAgICB3cmFwcGVyLmNsZWFyTWVhc3VyZXModGhpcy5fbWFya3MubWVhc3VyZSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcmVzb3VyY2VUaW1pbmdEYXRhO1xuICAgIH1cbn1cblxud3JhcHBlci5QZXJmb3JtYW5jZSA9IFBlcmZvcm1hbmNlO1xuXG5leHBvcnQgZGVmYXVsdCB3cmFwcGVyO1xuIiwiLy8gQGZsb3dcblxuaW1wb3J0IHtnZXRBcnJheUJ1ZmZlcn0gZnJvbSAnLi4vdXRpbC9hamF4JztcblxuaW1wb3J0IHZ0IGZyb20gJ0BtYXBib3gvdmVjdG9yLXRpbGUnO1xuaW1wb3J0IFByb3RvYnVmIGZyb20gJ3BiZic7XG5pbXBvcnQgV29ya2VyVGlsZSBmcm9tICcuL3dvcmtlcl90aWxlJztcbmltcG9ydCB7IGV4dGVuZCB9IGZyb20gJy4uL3V0aWwvdXRpbCc7XG5pbXBvcnQgcGVyZm9ybWFuY2UgZnJvbSAnLi4vdXRpbC9wZXJmb3JtYW5jZSc7XG5cbmltcG9ydCB0eXBlIHtcbiAgICBXb3JrZXJTb3VyY2UsXG4gICAgV29ya2VyVGlsZVBhcmFtZXRlcnMsXG4gICAgV29ya2VyVGlsZUNhbGxiYWNrLFxuICAgIFRpbGVQYXJhbWV0ZXJzXG59IGZyb20gJy4uL3NvdXJjZS93b3JrZXJfc291cmNlJztcblxuaW1wb3J0IHR5cGUge1BlcmZvcm1hbmNlUmVzb3VyY2VUaW1pbmd9IGZyb20gJy4uL3R5cGVzL3BlcmZvcm1hbmNlX3Jlc291cmNlX3RpbWluZyc7XG5pbXBvcnQgdHlwZSBBY3RvciBmcm9tICcuLi91dGlsL2FjdG9yJztcbmltcG9ydCB0eXBlIFN0eWxlTGF5ZXJJbmRleCBmcm9tICcuLi9zdHlsZS9zdHlsZV9sYXllcl9pbmRleCc7XG5pbXBvcnQgdHlwZSB7Q2FsbGJhY2t9IGZyb20gJy4uL3R5cGVzL2NhbGxiYWNrJztcblxuZXhwb3J0IHR5cGUgTG9hZFZlY3RvclRpbGVSZXN1bHQgPSB7XG4gICAgdmVjdG9yVGlsZTogVmVjdG9yVGlsZTtcbiAgICByYXdEYXRhOiBBcnJheUJ1ZmZlcjtcbiAgICBleHBpcmVzPzogYW55O1xuICAgIGNhY2hlQ29udHJvbD86IGFueTtcbiAgICByZXNvdXJjZVRpbWluZz86IEFycmF5PFBlcmZvcm1hbmNlUmVzb3VyY2VUaW1pbmc+O1xufTtcblxuLyoqXG4gKiBAY2FsbGJhY2sgTG9hZFZlY3RvckRhdGFDYWxsYmFja1xuICogQHBhcmFtIGVycm9yXG4gKiBAcGFyYW0gdmVjdG9yVGlsZVxuICogQHByaXZhdGVcbiAqL1xuZXhwb3J0IHR5cGUgTG9hZFZlY3RvckRhdGFDYWxsYmFjayA9IENhbGxiYWNrPD9Mb2FkVmVjdG9yVGlsZVJlc3VsdD47XG5cbmV4cG9ydCB0eXBlIEFib3J0VmVjdG9yRGF0YSA9ICgpID0+IHZvaWQ7XG5leHBvcnQgdHlwZSBMb2FkVmVjdG9yRGF0YSA9IChwYXJhbXM6IFdvcmtlclRpbGVQYXJhbWV0ZXJzLCBjYWxsYmFjazogTG9hZFZlY3RvckRhdGFDYWxsYmFjaykgPT4gP0Fib3J0VmVjdG9yRGF0YTtcblxuLyoqXG4gKiBAcHJpdmF0ZVxuICovXG5mdW5jdGlvbiBsb2FkVmVjdG9yVGlsZShwYXJhbXM6IFdvcmtlclRpbGVQYXJhbWV0ZXJzLCBjYWxsYmFjazogTG9hZFZlY3RvckRhdGFDYWxsYmFjaykge1xuICAgIGNvbnN0IHJlcXVlc3QgPSBnZXRBcnJheUJ1ZmZlcihwYXJhbXMucmVxdWVzdCwgKGVyciwgcmVzcG9uc2UpID0+IHtcbiAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgY2FsbGJhY2soZXJyKTtcbiAgICAgICAgfSBlbHNlIGlmIChyZXNwb25zZSkge1xuICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwge1xuICAgICAgICAgICAgICAgIHZlY3RvclRpbGU6IG5ldyB2dC5WZWN0b3JUaWxlKG5ldyBQcm90b2J1ZihyZXNwb25zZS5kYXRhKSksXG4gICAgICAgICAgICAgICAgcmF3RGF0YTogcmVzcG9uc2UuZGF0YSxcbiAgICAgICAgICAgICAgICBjYWNoZUNvbnRyb2w6IHJlc3BvbnNlLmNhY2hlQ29udHJvbCxcbiAgICAgICAgICAgICAgICBleHBpcmVzOiByZXNwb25zZS5leHBpcmVzXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiAoKSA9PiB7XG4gICAgICAgIHJlcXVlc3QuY2FuY2VsKCk7XG4gICAgICAgIGNhbGxiYWNrKCk7XG4gICAgfTtcbn1cblxuLyoqXG4gKiBUaGUge0BsaW5rIFdvcmtlclNvdXJjZX0gaW1wbGVtZW50YXRpb24gdGhhdCBzdXBwb3J0cyB7QGxpbmsgVmVjdG9yVGlsZVNvdXJjZX0uXG4gKiBUaGlzIGNsYXNzIGlzIGRlc2lnbmVkIHRvIGJlIGVhc2lseSByZXVzZWQgdG8gc3VwcG9ydCBjdXN0b20gc291cmNlIHR5cGVzXG4gKiBmb3IgZGF0YSBmb3JtYXRzIHRoYXQgY2FuIGJlIHBhcnNlZC9jb252ZXJ0ZWQgaW50byBhbiBpbi1tZW1vcnkgVmVjdG9yVGlsZVxuICogcmVwcmVzZW50YXRpb24uICBUbyBkbyBzbywgY3JlYXRlIGl0IHdpdGhcbiAqIGBuZXcgVmVjdG9yVGlsZVdvcmtlclNvdXJjZShhY3Rvciwgc3R5bGVMYXllcnMsIGN1c3RvbUxvYWRWZWN0b3JEYXRhRnVuY3Rpb24pYC5cbiAqXG4gKiBAcHJpdmF0ZVxuICovXG5jbGFzcyBWZWN0b3JUaWxlV29ya2VyU291cmNlIGltcGxlbWVudHMgV29ya2VyU291cmNlIHtcbiAgICBhY3RvcjogQWN0b3I7XG4gICAgbGF5ZXJJbmRleDogU3R5bGVMYXllckluZGV4O1xuICAgIGxvYWRWZWN0b3JEYXRhOiBMb2FkVmVjdG9yRGF0YTtcbiAgICBsb2FkaW5nOiB7IFtzdHJpbmddOiBXb3JrZXJUaWxlIH07XG4gICAgbG9hZGVkOiB7IFtzdHJpbmddOiBXb3JrZXJUaWxlIH07XG5cbiAgICAvKipcbiAgICAgKiBAcGFyYW0gW2xvYWRWZWN0b3JEYXRhXSBPcHRpb25hbCBtZXRob2QgZm9yIGN1c3RvbSBsb2FkaW5nIG9mIGEgVmVjdG9yVGlsZVxuICAgICAqIG9iamVjdCBiYXNlZCBvbiBwYXJhbWV0ZXJzIHBhc3NlZCBmcm9tIHRoZSBtYWluLXRocmVhZCBTb3VyY2UuIFNlZVxuICAgICAqIHtAbGluayBWZWN0b3JUaWxlV29ya2VyU291cmNlI2xvYWRUaWxlfS4gVGhlIGRlZmF1bHQgaW1wbGVtZW50YXRpb24gc2ltcGx5XG4gICAgICogbG9hZHMgdGhlIHBiZiBhdCBgcGFyYW1zLnVybGAuXG4gICAgICovXG4gICAgY29uc3RydWN0b3IoYWN0b3I6IEFjdG9yLCBsYXllckluZGV4OiBTdHlsZUxheWVySW5kZXgsIGxvYWRWZWN0b3JEYXRhOiA/TG9hZFZlY3RvckRhdGEpIHtcbiAgICAgICAgdGhpcy5hY3RvciA9IGFjdG9yO1xuICAgICAgICB0aGlzLmxheWVySW5kZXggPSBsYXllckluZGV4O1xuICAgICAgICB0aGlzLmxvYWRWZWN0b3JEYXRhID0gbG9hZFZlY3RvckRhdGEgfHwgbG9hZFZlY3RvclRpbGU7XG4gICAgICAgIHRoaXMubG9hZGluZyA9IHt9O1xuICAgICAgICB0aGlzLmxvYWRlZCA9IHt9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEltcGxlbWVudHMge0BsaW5rIFdvcmtlclNvdXJjZSNsb2FkVGlsZX0uIERlbGVnYXRlcyB0b1xuICAgICAqIHtAbGluayBWZWN0b3JUaWxlV29ya2VyU291cmNlI2xvYWRWZWN0b3JEYXRhfSAod2hpY2ggYnkgZGVmYXVsdCBleHBlY3RzXG4gICAgICogYSBgcGFyYW1zLnVybGAgcHJvcGVydHkpIGZvciBmZXRjaGluZyBhbmQgcHJvZHVjaW5nIGEgVmVjdG9yVGlsZSBvYmplY3QuXG4gICAgICovXG4gICAgbG9hZFRpbGUocGFyYW1zOiBXb3JrZXJUaWxlUGFyYW1ldGVycywgY2FsbGJhY2s6IFdvcmtlclRpbGVDYWxsYmFjaykge1xuICAgICAgICBjb25zdCB1aWQgPSBwYXJhbXMudWlkO1xuXG4gICAgICAgIGlmICghdGhpcy5sb2FkaW5nKVxuICAgICAgICAgICAgdGhpcy5sb2FkaW5nID0ge307XG5cbiAgICAgICAgY29uc3QgcGVyZiA9IChwYXJhbXMgJiYgcGFyYW1zLnJlcXVlc3QgJiYgcGFyYW1zLnJlcXVlc3QuY29sbGVjdFJlc291cmNlVGltaW5nKSA/XG4gICAgICAgICAgICBuZXcgcGVyZm9ybWFuY2UuUGVyZm9ybWFuY2UocGFyYW1zLnJlcXVlc3QpIDogZmFsc2U7XG5cbiAgICAgICAgY29uc3Qgd29ya2VyVGlsZSA9IHRoaXMubG9hZGluZ1t1aWRdID0gbmV3IFdvcmtlclRpbGUocGFyYW1zKTtcbiAgICAgICAgd29ya2VyVGlsZS5hYm9ydCA9IHRoaXMubG9hZFZlY3RvckRhdGEocGFyYW1zLCAoZXJyLCByZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgZGVsZXRlIHRoaXMubG9hZGluZ1t1aWRdO1xuXG4gICAgICAgICAgICBpZiAoZXJyIHx8ICFyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCByYXdUaWxlRGF0YSA9IHJlc3BvbnNlLnJhd0RhdGE7XG4gICAgICAgICAgICBjb25zdCBjYWNoZUNvbnRyb2wgPSB7fTtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5leHBpcmVzKSBjYWNoZUNvbnRyb2wuZXhwaXJlcyA9IHJlc3BvbnNlLmV4cGlyZXM7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UuY2FjaGVDb250cm9sKSBjYWNoZUNvbnRyb2wuY2FjaGVDb250cm9sID0gcmVzcG9uc2UuY2FjaGVDb250cm9sO1xuXG4gICAgICAgICAgICBjb25zdCByZXNvdXJjZVRpbWluZyA9IHt9O1xuICAgICAgICAgICAgaWYgKHBlcmYpIHtcbiAgICAgICAgICAgICAgICBjb25zdCByZXNvdXJjZVRpbWluZ0RhdGEgPSBwZXJmLmZpbmlzaCgpO1xuICAgICAgICAgICAgICAgIC8vIGl0J3MgbmVjZXNzYXJ5IHRvIGV2YWwgdGhlIHJlc3VsdCBvZiBnZXRFbnRyaWVzQnlOYW1lKCkgaGVyZSB2aWEgcGFyc2Uvc3RyaW5naWZ5XG4gICAgICAgICAgICAgICAgLy8gbGF0ZSBldmFsdWF0aW9uIGluIHRoZSBtYWluIHRocmVhZCBjYXVzZXMgVHlwZUVycm9yOiBpbGxlZ2FsIGludm9jYXRpb25cbiAgICAgICAgICAgICAgICBpZiAocmVzb3VyY2VUaW1pbmdEYXRhKVxuICAgICAgICAgICAgICAgICAgICByZXNvdXJjZVRpbWluZy5yZXNvdXJjZVRpbWluZyA9IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkocmVzb3VyY2VUaW1pbmdEYXRhKSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHdvcmtlclRpbGUudmVjdG9yVGlsZSA9IHJlc3BvbnNlLnZlY3RvclRpbGU7XG4gICAgICAgICAgICB3b3JrZXJUaWxlLnBhcnNlKHJlc3BvbnNlLnZlY3RvclRpbGUsIHRoaXMubGF5ZXJJbmRleCwgdGhpcy5hY3RvciwgKGVyciwgcmVzdWx0KSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGVyciB8fCAhcmVzdWx0KSByZXR1cm4gY2FsbGJhY2soZXJyKTtcblxuICAgICAgICAgICAgICAgIC8vIFRyYW5zZmVycmluZyBhIGNvcHkgb2YgcmF3VGlsZURhdGEgYmVjYXVzZSB0aGUgd29ya2VyIG5lZWRzIHRvIHJldGFpbiBpdHMgY29weS5cbiAgICAgICAgICAgICAgICBjYWxsYmFjayhudWxsLCBleHRlbmQoe3Jhd1RpbGVEYXRhOiByYXdUaWxlRGF0YS5zbGljZSgwKX0sIHJlc3VsdCwgY2FjaGVDb250cm9sLCByZXNvdXJjZVRpbWluZykpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHRoaXMubG9hZGVkID0gdGhpcy5sb2FkZWQgfHwge307XG4gICAgICAgICAgICB0aGlzLmxvYWRlZFt1aWRdID0gd29ya2VyVGlsZTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogSW1wbGVtZW50cyB7QGxpbmsgV29ya2VyU291cmNlI3JlbG9hZFRpbGV9LlxuICAgICAqL1xuICAgIHJlbG9hZFRpbGUocGFyYW1zOiBXb3JrZXJUaWxlUGFyYW1ldGVycywgY2FsbGJhY2s6IFdvcmtlclRpbGVDYWxsYmFjaykge1xuICAgICAgICBjb25zdCBsb2FkZWQgPSB0aGlzLmxvYWRlZCxcbiAgICAgICAgICAgIHVpZCA9IHBhcmFtcy51aWQsXG4gICAgICAgICAgICB2dFNvdXJjZSA9IHRoaXM7XG4gICAgICAgIGlmIChsb2FkZWQgJiYgbG9hZGVkW3VpZF0pIHtcbiAgICAgICAgICAgIGNvbnN0IHdvcmtlclRpbGUgPSBsb2FkZWRbdWlkXTtcbiAgICAgICAgICAgIHdvcmtlclRpbGUuc2hvd0NvbGxpc2lvbkJveGVzID0gcGFyYW1zLnNob3dDb2xsaXNpb25Cb3hlcztcblxuICAgICAgICAgICAgY29uc3QgZG9uZSA9IChlcnIsIGRhdGEpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCByZWxvYWRDYWxsYmFjayA9IHdvcmtlclRpbGUucmVsb2FkQ2FsbGJhY2s7XG4gICAgICAgICAgICAgICAgaWYgKHJlbG9hZENhbGxiYWNrKSB7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSB3b3JrZXJUaWxlLnJlbG9hZENhbGxiYWNrO1xuICAgICAgICAgICAgICAgICAgICB3b3JrZXJUaWxlLnBhcnNlKHdvcmtlclRpbGUudmVjdG9yVGlsZSwgdnRTb3VyY2UubGF5ZXJJbmRleCwgdnRTb3VyY2UuYWN0b3IsIHJlbG9hZENhbGxiYWNrKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZXJyLCBkYXRhKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIGlmICh3b3JrZXJUaWxlLnN0YXR1cyA9PT0gJ3BhcnNpbmcnKSB7XG4gICAgICAgICAgICAgICAgd29ya2VyVGlsZS5yZWxvYWRDYWxsYmFjayA9IGRvbmU7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHdvcmtlclRpbGUuc3RhdHVzID09PSAnZG9uZScpIHtcbiAgICAgICAgICAgICAgICB3b3JrZXJUaWxlLnBhcnNlKHdvcmtlclRpbGUudmVjdG9yVGlsZSwgdGhpcy5sYXllckluZGV4LCB0aGlzLmFjdG9yLCBkb25lKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEltcGxlbWVudHMge0BsaW5rIFdvcmtlclNvdXJjZSNhYm9ydFRpbGV9LlxuICAgICAqXG4gICAgICogQHBhcmFtIHBhcmFtc1xuICAgICAqIEBwYXJhbSBwYXJhbXMudWlkIFRoZSBVSUQgZm9yIHRoaXMgdGlsZS5cbiAgICAgKi9cbiAgICBhYm9ydFRpbGUocGFyYW1zOiBUaWxlUGFyYW1ldGVycywgY2FsbGJhY2s6IFdvcmtlclRpbGVDYWxsYmFjaykge1xuICAgICAgICBjb25zdCBsb2FkaW5nID0gdGhpcy5sb2FkaW5nLFxuICAgICAgICAgICAgdWlkID0gcGFyYW1zLnVpZDtcbiAgICAgICAgaWYgKGxvYWRpbmcgJiYgbG9hZGluZ1t1aWRdICYmIGxvYWRpbmdbdWlkXS5hYm9ydCkge1xuICAgICAgICAgICAgbG9hZGluZ1t1aWRdLmFib3J0KCk7XG4gICAgICAgICAgICBkZWxldGUgbG9hZGluZ1t1aWRdO1xuICAgICAgICB9XG4gICAgICAgIGNhbGxiYWNrKCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogSW1wbGVtZW50cyB7QGxpbmsgV29ya2VyU291cmNlI3JlbW92ZVRpbGV9LlxuICAgICAqXG4gICAgICogQHBhcmFtIHBhcmFtc1xuICAgICAqIEBwYXJhbSBwYXJhbXMudWlkIFRoZSBVSUQgZm9yIHRoaXMgdGlsZS5cbiAgICAgKi9cbiAgICByZW1vdmVUaWxlKHBhcmFtczogVGlsZVBhcmFtZXRlcnMsIGNhbGxiYWNrOiBXb3JrZXJUaWxlQ2FsbGJhY2spIHtcbiAgICAgICAgY29uc3QgbG9hZGVkID0gdGhpcy5sb2FkZWQsXG4gICAgICAgICAgICB1aWQgPSBwYXJhbXMudWlkO1xuICAgICAgICBpZiAobG9hZGVkICYmIGxvYWRlZFt1aWRdKSB7XG4gICAgICAgICAgICBkZWxldGUgbG9hZGVkW3VpZF07XG4gICAgICAgIH1cbiAgICAgICAgY2FsbGJhY2soKTtcbiAgICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IFZlY3RvclRpbGVXb3JrZXJTb3VyY2U7XG4iLCIvLyBAZmxvd1xuXG5pbXBvcnQgREVNRGF0YSBmcm9tICcuLi9kYXRhL2RlbV9kYXRhJztcblxuaW1wb3J0IHR5cGUgQWN0b3IgZnJvbSAnLi4vdXRpbC9hY3Rvcic7XG5pbXBvcnQgdHlwZSB7XG4gICAgV29ya2VyREVNVGlsZVBhcmFtZXRlcnMsXG4gICAgV29ya2VyREVNVGlsZUNhbGxiYWNrLFxuICAgIFRpbGVQYXJhbWV0ZXJzXG59IGZyb20gJy4vd29ya2VyX3NvdXJjZSc7XG5cblxuY2xhc3MgUmFzdGVyREVNVGlsZVdvcmtlclNvdXJjZSB7XG4gICAgYWN0b3I6IEFjdG9yO1xuICAgIGxvYWRlZDoge1tzdHJpbmddOiBERU1EYXRhfTtcblxuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICB0aGlzLmxvYWRlZCA9IHt9O1xuICAgIH1cblxuICAgIGxvYWRUaWxlKHBhcmFtczogV29ya2VyREVNVGlsZVBhcmFtZXRlcnMsIGNhbGxiYWNrOiBXb3JrZXJERU1UaWxlQ2FsbGJhY2spIHtcbiAgICAgICAgY29uc3Qge3VpZCwgZW5jb2RpbmcsIHJhd0ltYWdlRGF0YX0gPSBwYXJhbXM7XG4gICAgICAgIGNvbnN0IGRlbSA9IG5ldyBERU1EYXRhKHVpZCwgcmF3SW1hZ2VEYXRhLCBlbmNvZGluZyk7XG5cbiAgICAgICAgdGhpcy5sb2FkZWQgPSB0aGlzLmxvYWRlZCB8fCB7fTtcbiAgICAgICAgdGhpcy5sb2FkZWRbdWlkXSA9IGRlbTtcbiAgICAgICAgY2FsbGJhY2sobnVsbCwgZGVtKTtcbiAgICB9XG5cbiAgICByZW1vdmVUaWxlKHBhcmFtczogVGlsZVBhcmFtZXRlcnMpIHtcbiAgICAgICAgY29uc3QgbG9hZGVkID0gdGhpcy5sb2FkZWQsXG4gICAgICAgICAgICB1aWQgPSBwYXJhbXMudWlkO1xuICAgICAgICBpZiAobG9hZGVkICYmIGxvYWRlZFt1aWRdKSB7XG4gICAgICAgICAgICBkZWxldGUgbG9hZGVkW3VpZF07XG4gICAgICAgIH1cbiAgICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IFJhc3RlckRFTVRpbGVXb3JrZXJTb3VyY2U7XG4iLCJtb2R1bGUuZXhwb3J0cy5SQURJVVMgPSA2Mzc4MTM3O1xubW9kdWxlLmV4cG9ydHMuRkxBVFRFTklORyA9IDEvMjk4LjI1NzIyMzU2Mztcbm1vZHVsZS5leHBvcnRzLlBPTEFSX1JBRElVUyA9IDYzNTY3NTIuMzE0MjtcbiIsInZhciB3Z3M4NCA9IHJlcXVpcmUoJ3dnczg0Jyk7XG5cbm1vZHVsZS5leHBvcnRzLmdlb21ldHJ5ID0gZ2VvbWV0cnk7XG5tb2R1bGUuZXhwb3J0cy5yaW5nID0gcmluZ0FyZWE7XG5cbmZ1bmN0aW9uIGdlb21ldHJ5KF8pIHtcbiAgICB2YXIgYXJlYSA9IDAsIGk7XG4gICAgc3dpdGNoIChfLnR5cGUpIHtcbiAgICAgICAgY2FzZSAnUG9seWdvbic6XG4gICAgICAgICAgICByZXR1cm4gcG9seWdvbkFyZWEoXy5jb29yZGluYXRlcyk7XG4gICAgICAgIGNhc2UgJ011bHRpUG9seWdvbic6XG4gICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwgXy5jb29yZGluYXRlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIGFyZWEgKz0gcG9seWdvbkFyZWEoXy5jb29yZGluYXRlc1tpXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gYXJlYTtcbiAgICAgICAgY2FzZSAnUG9pbnQnOlxuICAgICAgICBjYXNlICdNdWx0aVBvaW50JzpcbiAgICAgICAgY2FzZSAnTGluZVN0cmluZyc6XG4gICAgICAgIGNhc2UgJ011bHRpTGluZVN0cmluZyc6XG4gICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgY2FzZSAnR2VvbWV0cnlDb2xsZWN0aW9uJzpcbiAgICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCBfLmdlb21ldHJpZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICBhcmVhICs9IGdlb21ldHJ5KF8uZ2VvbWV0cmllc1tpXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gYXJlYTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIHBvbHlnb25BcmVhKGNvb3Jkcykge1xuICAgIHZhciBhcmVhID0gMDtcbiAgICBpZiAoY29vcmRzICYmIGNvb3Jkcy5sZW5ndGggPiAwKSB7XG4gICAgICAgIGFyZWEgKz0gTWF0aC5hYnMocmluZ0FyZWEoY29vcmRzWzBdKSk7XG4gICAgICAgIGZvciAodmFyIGkgPSAxOyBpIDwgY29vcmRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBhcmVhIC09IE1hdGguYWJzKHJpbmdBcmVhKGNvb3Jkc1tpXSkpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBhcmVhO1xufVxuXG4vKipcbiAqIENhbGN1bGF0ZSB0aGUgYXBwcm94aW1hdGUgYXJlYSBvZiB0aGUgcG9seWdvbiB3ZXJlIGl0IHByb2plY3RlZCBvbnRvXG4gKiAgICAgdGhlIGVhcnRoLiAgTm90ZSB0aGF0IHRoaXMgYXJlYSB3aWxsIGJlIHBvc2l0aXZlIGlmIHJpbmcgaXMgb3JpZW50ZWRcbiAqICAgICBjbG9ja3dpc2UsIG90aGVyd2lzZSBpdCB3aWxsIGJlIG5lZ2F0aXZlLlxuICpcbiAqIFJlZmVyZW5jZTpcbiAqIFJvYmVydC4gRy4gQ2hhbWJlcmxhaW4gYW5kIFdpbGxpYW0gSC4gRHVxdWV0dGUsIFwiU29tZSBBbGdvcml0aG1zIGZvclxuICogICAgIFBvbHlnb25zIG9uIGEgU3BoZXJlXCIsIEpQTCBQdWJsaWNhdGlvbiAwNy0wMywgSmV0IFByb3B1bHNpb25cbiAqICAgICBMYWJvcmF0b3J5LCBQYXNhZGVuYSwgQ0EsIEp1bmUgMjAwNyBodHRwOi8vdHJzLW5ldy5qcGwubmFzYS5nb3YvZHNwYWNlL2hhbmRsZS8yMDE0LzQwNDA5XG4gKlxuICogUmV0dXJuczpcbiAqIHtmbG9hdH0gVGhlIGFwcHJveGltYXRlIHNpZ25lZCBnZW9kZXNpYyBhcmVhIG9mIHRoZSBwb2x5Z29uIGluIHNxdWFyZVxuICogICAgIG1ldGVycy5cbiAqL1xuXG5mdW5jdGlvbiByaW5nQXJlYShjb29yZHMpIHtcbiAgICB2YXIgcDEsIHAyLCBwMywgbG93ZXJJbmRleCwgbWlkZGxlSW5kZXgsIHVwcGVySW5kZXgsIGksXG4gICAgYXJlYSA9IDAsXG4gICAgY29vcmRzTGVuZ3RoID0gY29vcmRzLmxlbmd0aDtcblxuICAgIGlmIChjb29yZHNMZW5ndGggPiAyKSB7XG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBjb29yZHNMZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgaWYgKGkgPT09IGNvb3Jkc0xlbmd0aCAtIDIpIHsvLyBpID0gTi0yXG4gICAgICAgICAgICAgICAgbG93ZXJJbmRleCA9IGNvb3Jkc0xlbmd0aCAtIDI7XG4gICAgICAgICAgICAgICAgbWlkZGxlSW5kZXggPSBjb29yZHNMZW5ndGggLTE7XG4gICAgICAgICAgICAgICAgdXBwZXJJbmRleCA9IDA7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGkgPT09IGNvb3Jkc0xlbmd0aCAtIDEpIHsvLyBpID0gTi0xXG4gICAgICAgICAgICAgICAgbG93ZXJJbmRleCA9IGNvb3Jkc0xlbmd0aCAtIDE7XG4gICAgICAgICAgICAgICAgbWlkZGxlSW5kZXggPSAwO1xuICAgICAgICAgICAgICAgIHVwcGVySW5kZXggPSAxO1xuICAgICAgICAgICAgfSBlbHNlIHsgLy8gaSA9IDAgdG8gTi0zXG4gICAgICAgICAgICAgICAgbG93ZXJJbmRleCA9IGk7XG4gICAgICAgICAgICAgICAgbWlkZGxlSW5kZXggPSBpKzE7XG4gICAgICAgICAgICAgICAgdXBwZXJJbmRleCA9IGkrMjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHAxID0gY29vcmRzW2xvd2VySW5kZXhdO1xuICAgICAgICAgICAgcDIgPSBjb29yZHNbbWlkZGxlSW5kZXhdO1xuICAgICAgICAgICAgcDMgPSBjb29yZHNbdXBwZXJJbmRleF07XG4gICAgICAgICAgICBhcmVhICs9ICggcmFkKHAzWzBdKSAtIHJhZChwMVswXSkgKSAqIE1hdGguc2luKCByYWQocDJbMV0pKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGFyZWEgPSBhcmVhICogd2dzODQuUkFESVVTICogd2dzODQuUkFESVVTIC8gMjtcbiAgICB9XG5cbiAgICByZXR1cm4gYXJlYTtcbn1cblxuZnVuY3Rpb24gcmFkKF8pIHtcbiAgICByZXR1cm4gXyAqIE1hdGguUEkgLyAxODA7XG59IiwidmFyIGdlb2pzb25BcmVhID0gcmVxdWlyZSgnQG1hcGJveC9nZW9qc29uLWFyZWEnKTtcblxubW9kdWxlLmV4cG9ydHMgPSByZXdpbmQ7XG5cbmZ1bmN0aW9uIHJld2luZChnaiwgb3V0ZXIpIHtcbiAgICBzd2l0Y2ggKChnaiAmJiBnai50eXBlKSB8fCBudWxsKSB7XG4gICAgICAgIGNhc2UgJ0ZlYXR1cmVDb2xsZWN0aW9uJzpcbiAgICAgICAgICAgIGdqLmZlYXR1cmVzID0gZ2ouZmVhdHVyZXMubWFwKGN1cnJ5T3V0ZXIocmV3aW5kLCBvdXRlcikpO1xuICAgICAgICAgICAgcmV0dXJuIGdqO1xuICAgICAgICBjYXNlICdGZWF0dXJlJzpcbiAgICAgICAgICAgIGdqLmdlb21ldHJ5ID0gcmV3aW5kKGdqLmdlb21ldHJ5LCBvdXRlcik7XG4gICAgICAgICAgICByZXR1cm4gZ2o7XG4gICAgICAgIGNhc2UgJ1BvbHlnb24nOlxuICAgICAgICBjYXNlICdNdWx0aVBvbHlnb24nOlxuICAgICAgICAgICAgcmV0dXJuIGNvcnJlY3QoZ2osIG91dGVyKTtcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIHJldHVybiBnajtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGN1cnJ5T3V0ZXIoYSwgYikge1xuICAgIHJldHVybiBmdW5jdGlvbihfKSB7IHJldHVybiBhKF8sIGIpOyB9O1xufVxuXG5mdW5jdGlvbiBjb3JyZWN0KF8sIG91dGVyKSB7XG4gICAgaWYgKF8udHlwZSA9PT0gJ1BvbHlnb24nKSB7XG4gICAgICAgIF8uY29vcmRpbmF0ZXMgPSBjb3JyZWN0UmluZ3MoXy5jb29yZGluYXRlcywgb3V0ZXIpO1xuICAgIH0gZWxzZSBpZiAoXy50eXBlID09PSAnTXVsdGlQb2x5Z29uJykge1xuICAgICAgICBfLmNvb3JkaW5hdGVzID0gXy5jb29yZGluYXRlcy5tYXAoY3VycnlPdXRlcihjb3JyZWN0UmluZ3MsIG91dGVyKSk7XG4gICAgfVxuICAgIHJldHVybiBfO1xufVxuXG5mdW5jdGlvbiBjb3JyZWN0UmluZ3MoXywgb3V0ZXIpIHtcbiAgICBvdXRlciA9ICEhb3V0ZXI7XG4gICAgX1swXSA9IHdpbmQoX1swXSwgb3V0ZXIpO1xuICAgIGZvciAodmFyIGkgPSAxOyBpIDwgXy5sZW5ndGg7IGkrKykge1xuICAgICAgICBfW2ldID0gd2luZChfW2ldLCAhb3V0ZXIpO1xuICAgIH1cbiAgICByZXR1cm4gXztcbn1cblxuZnVuY3Rpb24gd2luZChfLCBkaXIpIHtcbiAgICByZXR1cm4gY3coXykgPT09IGRpciA/IF8gOiBfLnJldmVyc2UoKTtcbn1cblxuZnVuY3Rpb24gY3coXykge1xuICAgIHJldHVybiBnZW9qc29uQXJlYS5yaW5nKF8pID49IDA7XG59XG4iLCIvLyBAZmxvd1xuXG5pbXBvcnQgUG9pbnQgZnJvbSAnQG1hcGJveC9wb2ludC1nZW9tZXRyeSc7XG5cbmltcG9ydCBtdnQgZnJvbSAnQG1hcGJveC92ZWN0b3ItdGlsZSc7XG5jb25zdCB0b0dlb0pTT04gPSBtdnQuVmVjdG9yVGlsZUZlYXR1cmUucHJvdG90eXBlLnRvR2VvSlNPTjtcbmltcG9ydCBFWFRFTlQgZnJvbSAnLi4vZGF0YS9leHRlbnQnO1xuXG4vLyBUaGUgZmVhdHVyZSB0eXBlIHVzZWQgYnkgZ2VvanNvbi12dCBhbmQgc3VwZXJjbHVzdGVyLiBTaG91bGQgYmUgZXh0cmFjdGVkIHRvXG4vLyBnbG9iYWwgdHlwZSBhbmQgdXNlZCBpbiBtb2R1bGUgZGVmaW5pdGlvbnMgZm9yIHRob3NlIHR3byBtb2R1bGVzLlxudHlwZSBGZWF0dXJlID0ge1xuICAgIHR5cGU6IDEsXG4gICAgaWQ6IG1peGVkLFxuICAgIHRhZ3M6IHtbc3RyaW5nXTogc3RyaW5nIHwgbnVtYmVyIHwgYm9vbGVhbn0sXG4gICAgZ2VvbWV0cnk6IEFycmF5PFtudW1iZXIsIG51bWJlcl0+LFxufSB8IHtcbiAgICB0eXBlOiAyIHwgMyxcbiAgICBpZDogbWl4ZWQsXG4gICAgdGFnczoge1tzdHJpbmddOiBzdHJpbmcgfCBudW1iZXIgfCBib29sZWFufSxcbiAgICBnZW9tZXRyeTogQXJyYXk8QXJyYXk8W251bWJlciwgbnVtYmVyXT4+LFxufVxuXG5jbGFzcyBGZWF0dXJlV3JhcHBlciBpbXBsZW1lbnRzIFZlY3RvclRpbGVGZWF0dXJlIHtcbiAgICBfZmVhdHVyZTogRmVhdHVyZTtcblxuICAgIGV4dGVudDogbnVtYmVyO1xuICAgIHR5cGU6IDEgfCAyIHwgMztcbiAgICBpZDogbnVtYmVyO1xuICAgIHByb3BlcnRpZXM6IHtbc3RyaW5nXTogc3RyaW5nIHwgbnVtYmVyIHwgYm9vbGVhbn07XG5cbiAgICBjb25zdHJ1Y3RvcihmZWF0dXJlOiBGZWF0dXJlKSB7XG4gICAgICAgIHRoaXMuX2ZlYXR1cmUgPSBmZWF0dXJlO1xuXG4gICAgICAgIHRoaXMuZXh0ZW50ID0gRVhURU5UO1xuICAgICAgICB0aGlzLnR5cGUgPSBmZWF0dXJlLnR5cGU7XG4gICAgICAgIHRoaXMucHJvcGVydGllcyA9IGZlYXR1cmUudGFncztcblxuICAgICAgICAvLyBJZiB0aGUgZmVhdHVyZSBoYXMgYSB0b3AtbGV2ZWwgYGlkYCBwcm9wZXJ0eSwgY29weSBpdCBvdmVyLCBidXQgb25seVxuICAgICAgICAvLyBpZiBpdCBjYW4gYmUgY29lcmNlZCB0byBhbiBpbnRlZ2VyLCBiZWNhdXNlIHRoaXMgd3JhcHBlciBpcyB1c2VkIGZvclxuICAgICAgICAvLyBzZXJpYWxpemluZyBnZW9qc29uIGZlYXR1cmUgZGF0YSBpbnRvIHZlY3RvciB0aWxlIFBCRiBkYXRhLCBhbmQgdGhlXG4gICAgICAgIC8vIHZlY3RvciB0aWxlIHNwZWMgb25seSBzdXBwb3J0cyBpbnRlZ2VyIHZhbHVlcyBmb3IgZmVhdHVyZSBpZHMgLS1cbiAgICAgICAgLy8gYWxsb3dpbmcgbm9uLWludGVnZXIgdmFsdWVzIGhlcmUgcmVzdWx0cyBpbiBhIG5vbi1jb21wbGlhbnQgUEJGXG4gICAgICAgIC8vIHRoYXQgY2F1c2VzIGFuIGV4Y2VwdGlvbiB3aGVuIGl0IGlzIHBhcnNlZCB3aXRoIHZlY3Rvci10aWxlLWpzXG4gICAgICAgIGlmICgnaWQnIGluIGZlYXR1cmUgJiYgIWlzTmFOKGZlYXR1cmUuaWQpKSB7XG4gICAgICAgICAgICB0aGlzLmlkID0gcGFyc2VJbnQoZmVhdHVyZS5pZCwgMTApO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgbG9hZEdlb21ldHJ5KCkge1xuICAgICAgICBpZiAodGhpcy5fZmVhdHVyZS50eXBlID09PSAxKSB7XG4gICAgICAgICAgICBjb25zdCBnZW9tZXRyeSA9IFtdO1xuICAgICAgICAgICAgZm9yIChjb25zdCBwb2ludCBvZiB0aGlzLl9mZWF0dXJlLmdlb21ldHJ5KSB7XG4gICAgICAgICAgICAgICAgZ2VvbWV0cnkucHVzaChbbmV3IFBvaW50KHBvaW50WzBdLCBwb2ludFsxXSldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBnZW9tZXRyeTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IGdlb21ldHJ5ID0gW107XG4gICAgICAgICAgICBmb3IgKGNvbnN0IHJpbmcgb2YgdGhpcy5fZmVhdHVyZS5nZW9tZXRyeSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IG5ld1JpbmcgPSBbXTtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IHBvaW50IG9mIHJpbmcpIHtcbiAgICAgICAgICAgICAgICAgICAgbmV3UmluZy5wdXNoKG5ldyBQb2ludChwb2ludFswXSwgcG9pbnRbMV0pKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZ2VvbWV0cnkucHVzaChuZXdSaW5nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBnZW9tZXRyeTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHRvR2VvSlNPTih4OiBudW1iZXIsIHk6IG51bWJlciwgejogbnVtYmVyKSB7XG4gICAgICAgIHJldHVybiB0b0dlb0pTT04uY2FsbCh0aGlzLCB4LCB5LCB6KTtcbiAgICB9XG59XG5cbmNsYXNzIEdlb0pTT05XcmFwcGVyIGltcGxlbWVudHMgVmVjdG9yVGlsZSwgVmVjdG9yVGlsZUxheWVyIHtcbiAgICBsYXllcnM6IHtbc3RyaW5nXTogVmVjdG9yVGlsZUxheWVyfTtcbiAgICBuYW1lOiBzdHJpbmc7XG4gICAgZXh0ZW50OiBudW1iZXI7XG4gICAgbGVuZ3RoOiBudW1iZXI7XG4gICAgX2ZlYXR1cmVzOiBBcnJheTxGZWF0dXJlPjtcblxuICAgIGNvbnN0cnVjdG9yKGZlYXR1cmVzOiBBcnJheTxGZWF0dXJlPikge1xuICAgICAgICB0aGlzLmxheWVycyA9IHsgJ19nZW9qc29uVGlsZUxheWVyJzogdGhpcyB9O1xuICAgICAgICB0aGlzLm5hbWUgPSAnX2dlb2pzb25UaWxlTGF5ZXInO1xuICAgICAgICB0aGlzLmV4dGVudCA9IEVYVEVOVDtcbiAgICAgICAgdGhpcy5sZW5ndGggPSBmZWF0dXJlcy5sZW5ndGg7XG4gICAgICAgIHRoaXMuX2ZlYXR1cmVzID0gZmVhdHVyZXM7XG4gICAgfVxuXG4gICAgZmVhdHVyZShpOiBudW1iZXIpOiBWZWN0b3JUaWxlRmVhdHVyZSB7XG4gICAgICAgIHJldHVybiBuZXcgRmVhdHVyZVdyYXBwZXIodGhpcy5fZmVhdHVyZXNbaV0pO1xuICAgIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgR2VvSlNPTldyYXBwZXI7XG4iLCIndXNlIHN0cmljdCdcblxudmFyIFBvaW50ID0gcmVxdWlyZSgnQG1hcGJveC9wb2ludC1nZW9tZXRyeScpXG52YXIgVmVjdG9yVGlsZUZlYXR1cmUgPSByZXF1aXJlKCdAbWFwYm94L3ZlY3Rvci10aWxlJykuVmVjdG9yVGlsZUZlYXR1cmVcblxubW9kdWxlLmV4cG9ydHMgPSBHZW9KU09OV3JhcHBlclxuXG4vLyBjb25mb3JtIHRvIHZlY3RvcnRpbGUgYXBpXG5mdW5jdGlvbiBHZW9KU09OV3JhcHBlciAoZmVhdHVyZXMsIG9wdGlvbnMpIHtcbiAgdGhpcy5vcHRpb25zID0gb3B0aW9ucyB8fCB7fVxuICB0aGlzLmZlYXR1cmVzID0gZmVhdHVyZXNcbiAgdGhpcy5sZW5ndGggPSBmZWF0dXJlcy5sZW5ndGhcbn1cblxuR2VvSlNPTldyYXBwZXIucHJvdG90eXBlLmZlYXR1cmUgPSBmdW5jdGlvbiAoaSkge1xuICByZXR1cm4gbmV3IEZlYXR1cmVXcmFwcGVyKHRoaXMuZmVhdHVyZXNbaV0sIHRoaXMub3B0aW9ucy5leHRlbnQpXG59XG5cbmZ1bmN0aW9uIEZlYXR1cmVXcmFwcGVyIChmZWF0dXJlLCBleHRlbnQpIHtcbiAgdGhpcy5pZCA9IHR5cGVvZiBmZWF0dXJlLmlkID09PSAnbnVtYmVyJyA/IGZlYXR1cmUuaWQgOiB1bmRlZmluZWRcbiAgdGhpcy50eXBlID0gZmVhdHVyZS50eXBlXG4gIHRoaXMucmF3R2VvbWV0cnkgPSBmZWF0dXJlLnR5cGUgPT09IDEgPyBbZmVhdHVyZS5nZW9tZXRyeV0gOiBmZWF0dXJlLmdlb21ldHJ5XG4gIHRoaXMucHJvcGVydGllcyA9IGZlYXR1cmUudGFnc1xuICB0aGlzLmV4dGVudCA9IGV4dGVudCB8fCA0MDk2XG59XG5cbkZlYXR1cmVXcmFwcGVyLnByb3RvdHlwZS5sb2FkR2VvbWV0cnkgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciByaW5ncyA9IHRoaXMucmF3R2VvbWV0cnlcbiAgdGhpcy5nZW9tZXRyeSA9IFtdXG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCByaW5ncy5sZW5ndGg7IGkrKykge1xuICAgIHZhciByaW5nID0gcmluZ3NbaV1cbiAgICB2YXIgbmV3UmluZyA9IFtdXG4gICAgZm9yICh2YXIgaiA9IDA7IGogPCByaW5nLmxlbmd0aDsgaisrKSB7XG4gICAgICBuZXdSaW5nLnB1c2gobmV3IFBvaW50KHJpbmdbal1bMF0sIHJpbmdbal1bMV0pKVxuICAgIH1cbiAgICB0aGlzLmdlb21ldHJ5LnB1c2gobmV3UmluZylcbiAgfVxuICByZXR1cm4gdGhpcy5nZW9tZXRyeVxufVxuXG5GZWF0dXJlV3JhcHBlci5wcm90b3R5cGUuYmJveCA9IGZ1bmN0aW9uICgpIHtcbiAgaWYgKCF0aGlzLmdlb21ldHJ5KSB0aGlzLmxvYWRHZW9tZXRyeSgpXG5cbiAgdmFyIHJpbmdzID0gdGhpcy5nZW9tZXRyeVxuICB2YXIgeDEgPSBJbmZpbml0eVxuICB2YXIgeDIgPSAtSW5maW5pdHlcbiAgdmFyIHkxID0gSW5maW5pdHlcbiAgdmFyIHkyID0gLUluZmluaXR5XG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCByaW5ncy5sZW5ndGg7IGkrKykge1xuICAgIHZhciByaW5nID0gcmluZ3NbaV1cblxuICAgIGZvciAodmFyIGogPSAwOyBqIDwgcmluZy5sZW5ndGg7IGorKykge1xuICAgICAgdmFyIGNvb3JkID0gcmluZ1tqXVxuXG4gICAgICB4MSA9IE1hdGgubWluKHgxLCBjb29yZC54KVxuICAgICAgeDIgPSBNYXRoLm1heCh4MiwgY29vcmQueClcbiAgICAgIHkxID0gTWF0aC5taW4oeTEsIGNvb3JkLnkpXG4gICAgICB5MiA9IE1hdGgubWF4KHkyLCBjb29yZC55KVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBbeDEsIHkxLCB4MiwgeTJdXG59XG5cbkZlYXR1cmVXcmFwcGVyLnByb3RvdHlwZS50b0dlb0pTT04gPSBWZWN0b3JUaWxlRmVhdHVyZS5wcm90b3R5cGUudG9HZW9KU09OXG4iLCJ2YXIgUGJmID0gcmVxdWlyZSgncGJmJylcbnZhciBHZW9KU09OV3JhcHBlciA9IHJlcXVpcmUoJy4vbGliL2dlb2pzb25fd3JhcHBlcicpXG5cbm1vZHVsZS5leHBvcnRzID0gZnJvbVZlY3RvclRpbGVKc1xubW9kdWxlLmV4cG9ydHMuZnJvbVZlY3RvclRpbGVKcyA9IGZyb21WZWN0b3JUaWxlSnNcbm1vZHVsZS5leHBvcnRzLmZyb21HZW9qc29uVnQgPSBmcm9tR2VvanNvblZ0XG5tb2R1bGUuZXhwb3J0cy5HZW9KU09OV3JhcHBlciA9IEdlb0pTT05XcmFwcGVyXG5cbi8qKlxuICogU2VyaWFsaXplIGEgdmVjdG9yLXRpbGUtanMtY3JlYXRlZCB0aWxlIHRvIHBiZlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSB0aWxlXG4gKiBAcmV0dXJuIHtCdWZmZXJ9IHVuY29tcHJlc3NlZCwgcGJmLXNlcmlhbGl6ZWQgdGlsZSBkYXRhXG4gKi9cbmZ1bmN0aW9uIGZyb21WZWN0b3JUaWxlSnMgKHRpbGUpIHtcbiAgdmFyIG91dCA9IG5ldyBQYmYoKVxuICB3cml0ZVRpbGUodGlsZSwgb3V0KVxuICByZXR1cm4gb3V0LmZpbmlzaCgpXG59XG5cbi8qKlxuICogU2VyaWFsaXplZCBhIGdlb2pzb24tdnQtY3JlYXRlZCB0aWxlIHRvIHBiZi5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gbGF5ZXJzIC0gQW4gb2JqZWN0IG1hcHBpbmcgbGF5ZXIgbmFtZXMgdG8gZ2VvanNvbi12dC1jcmVhdGVkIHZlY3RvciB0aWxlIG9iamVjdHNcbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gLSBBbiBvYmplY3Qgc3BlY2lmeWluZyB0aGUgdmVjdG9yLXRpbGUgc3BlY2lmaWNhdGlvbiB2ZXJzaW9uIGFuZCBleHRlbnQgdGhhdCB3ZXJlIHVzZWQgdG8gY3JlYXRlIGBsYXllcnNgLlxuICogQHBhcmFtIHtOdW1iZXJ9IFtvcHRpb25zLnZlcnNpb249MV0gLSBWZXJzaW9uIG9mIHZlY3Rvci10aWxlIHNwZWMgdXNlZFxuICogQHBhcmFtIHtOdW1iZXJ9IFtvcHRpb25zLmV4dGVudD00MDk2XSAtIEV4dGVudCBvZiB0aGUgdmVjdG9yIHRpbGVcbiAqIEByZXR1cm4ge0J1ZmZlcn0gdW5jb21wcmVzc2VkLCBwYmYtc2VyaWFsaXplZCB0aWxlIGRhdGFcbiAqL1xuZnVuY3Rpb24gZnJvbUdlb2pzb25WdCAobGF5ZXJzLCBvcHRpb25zKSB7XG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9XG4gIHZhciBsID0ge31cbiAgZm9yICh2YXIgayBpbiBsYXllcnMpIHtcbiAgICBsW2tdID0gbmV3IEdlb0pTT05XcmFwcGVyKGxheWVyc1trXS5mZWF0dXJlcywgb3B0aW9ucylcbiAgICBsW2tdLm5hbWUgPSBrXG4gICAgbFtrXS52ZXJzaW9uID0gb3B0aW9ucy52ZXJzaW9uXG4gICAgbFtrXS5leHRlbnQgPSBvcHRpb25zLmV4dGVudFxuICB9XG4gIHJldHVybiBmcm9tVmVjdG9yVGlsZUpzKHtsYXllcnM6IGx9KVxufVxuXG5mdW5jdGlvbiB3cml0ZVRpbGUgKHRpbGUsIHBiZikge1xuICBmb3IgKHZhciBrZXkgaW4gdGlsZS5sYXllcnMpIHtcbiAgICBwYmYud3JpdGVNZXNzYWdlKDMsIHdyaXRlTGF5ZXIsIHRpbGUubGF5ZXJzW2tleV0pXG4gIH1cbn1cblxuZnVuY3Rpb24gd3JpdGVMYXllciAobGF5ZXIsIHBiZikge1xuICBwYmYud3JpdGVWYXJpbnRGaWVsZCgxNSwgbGF5ZXIudmVyc2lvbiB8fCAxKVxuICBwYmYud3JpdGVTdHJpbmdGaWVsZCgxLCBsYXllci5uYW1lIHx8ICcnKVxuICBwYmYud3JpdGVWYXJpbnRGaWVsZCg1LCBsYXllci5leHRlbnQgfHwgNDA5NilcblxuICB2YXIgaVxuICB2YXIgY29udGV4dCA9IHtcbiAgICBrZXlzOiBbXSxcbiAgICB2YWx1ZXM6IFtdLFxuICAgIGtleWNhY2hlOiB7fSxcbiAgICB2YWx1ZWNhY2hlOiB7fVxuICB9XG5cbiAgZm9yIChpID0gMDsgaSA8IGxheWVyLmxlbmd0aDsgaSsrKSB7XG4gICAgY29udGV4dC5mZWF0dXJlID0gbGF5ZXIuZmVhdHVyZShpKVxuICAgIHBiZi53cml0ZU1lc3NhZ2UoMiwgd3JpdGVGZWF0dXJlLCBjb250ZXh0KVxuICB9XG5cbiAgdmFyIGtleXMgPSBjb250ZXh0LmtleXNcbiAgZm9yIChpID0gMDsgaSA8IGtleXMubGVuZ3RoOyBpKyspIHtcbiAgICBwYmYud3JpdGVTdHJpbmdGaWVsZCgzLCBrZXlzW2ldKVxuICB9XG5cbiAgdmFyIHZhbHVlcyA9IGNvbnRleHQudmFsdWVzXG4gIGZvciAoaSA9IDA7IGkgPCB2YWx1ZXMubGVuZ3RoOyBpKyspIHtcbiAgICBwYmYud3JpdGVNZXNzYWdlKDQsIHdyaXRlVmFsdWUsIHZhbHVlc1tpXSlcbiAgfVxufVxuXG5mdW5jdGlvbiB3cml0ZUZlYXR1cmUgKGNvbnRleHQsIHBiZikge1xuICB2YXIgZmVhdHVyZSA9IGNvbnRleHQuZmVhdHVyZVxuXG4gIGlmIChmZWF0dXJlLmlkICE9PSB1bmRlZmluZWQpIHtcbiAgICBwYmYud3JpdGVWYXJpbnRGaWVsZCgxLCBmZWF0dXJlLmlkKVxuICB9XG5cbiAgcGJmLndyaXRlTWVzc2FnZSgyLCB3cml0ZVByb3BlcnRpZXMsIGNvbnRleHQpXG4gIHBiZi53cml0ZVZhcmludEZpZWxkKDMsIGZlYXR1cmUudHlwZSlcbiAgcGJmLndyaXRlTWVzc2FnZSg0LCB3cml0ZUdlb21ldHJ5LCBmZWF0dXJlKVxufVxuXG5mdW5jdGlvbiB3cml0ZVByb3BlcnRpZXMgKGNvbnRleHQsIHBiZikge1xuICB2YXIgZmVhdHVyZSA9IGNvbnRleHQuZmVhdHVyZVxuICB2YXIga2V5cyA9IGNvbnRleHQua2V5c1xuICB2YXIgdmFsdWVzID0gY29udGV4dC52YWx1ZXNcbiAgdmFyIGtleWNhY2hlID0gY29udGV4dC5rZXljYWNoZVxuICB2YXIgdmFsdWVjYWNoZSA9IGNvbnRleHQudmFsdWVjYWNoZVxuXG4gIGZvciAodmFyIGtleSBpbiBmZWF0dXJlLnByb3BlcnRpZXMpIHtcbiAgICB2YXIga2V5SW5kZXggPSBrZXljYWNoZVtrZXldXG4gICAgaWYgKHR5cGVvZiBrZXlJbmRleCA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIGtleXMucHVzaChrZXkpXG4gICAgICBrZXlJbmRleCA9IGtleXMubGVuZ3RoIC0gMVxuICAgICAga2V5Y2FjaGVba2V5XSA9IGtleUluZGV4XG4gICAgfVxuICAgIHBiZi53cml0ZVZhcmludChrZXlJbmRleClcblxuICAgIHZhciB2YWx1ZSA9IGZlYXR1cmUucHJvcGVydGllc1trZXldXG4gICAgdmFyIHR5cGUgPSB0eXBlb2YgdmFsdWVcbiAgICBpZiAodHlwZSAhPT0gJ3N0cmluZycgJiYgdHlwZSAhPT0gJ2Jvb2xlYW4nICYmIHR5cGUgIT09ICdudW1iZXInKSB7XG4gICAgICB2YWx1ZSA9IEpTT04uc3RyaW5naWZ5KHZhbHVlKVxuICAgIH1cbiAgICB2YXIgdmFsdWVLZXkgPSB0eXBlICsgJzonICsgdmFsdWVcbiAgICB2YXIgdmFsdWVJbmRleCA9IHZhbHVlY2FjaGVbdmFsdWVLZXldXG4gICAgaWYgKHR5cGVvZiB2YWx1ZUluZGV4ID09PSAndW5kZWZpbmVkJykge1xuICAgICAgdmFsdWVzLnB1c2godmFsdWUpXG4gICAgICB2YWx1ZUluZGV4ID0gdmFsdWVzLmxlbmd0aCAtIDFcbiAgICAgIHZhbHVlY2FjaGVbdmFsdWVLZXldID0gdmFsdWVJbmRleFxuICAgIH1cbiAgICBwYmYud3JpdGVWYXJpbnQodmFsdWVJbmRleClcbiAgfVxufVxuXG5mdW5jdGlvbiBjb21tYW5kIChjbWQsIGxlbmd0aCkge1xuICByZXR1cm4gKGxlbmd0aCA8PCAzKSArIChjbWQgJiAweDcpXG59XG5cbmZ1bmN0aW9uIHppZ3phZyAobnVtKSB7XG4gIHJldHVybiAobnVtIDw8IDEpIF4gKG51bSA+PiAzMSlcbn1cblxuZnVuY3Rpb24gd3JpdGVHZW9tZXRyeSAoZmVhdHVyZSwgcGJmKSB7XG4gIHZhciBnZW9tZXRyeSA9IGZlYXR1cmUubG9hZEdlb21ldHJ5KClcbiAgdmFyIHR5cGUgPSBmZWF0dXJlLnR5cGVcbiAgdmFyIHggPSAwXG4gIHZhciB5ID0gMFxuICB2YXIgcmluZ3MgPSBnZW9tZXRyeS5sZW5ndGhcbiAgZm9yICh2YXIgciA9IDA7IHIgPCByaW5nczsgcisrKSB7XG4gICAgdmFyIHJpbmcgPSBnZW9tZXRyeVtyXVxuICAgIHZhciBjb3VudCA9IDFcbiAgICBpZiAodHlwZSA9PT0gMSkge1xuICAgICAgY291bnQgPSByaW5nLmxlbmd0aFxuICAgIH1cbiAgICBwYmYud3JpdGVWYXJpbnQoY29tbWFuZCgxLCBjb3VudCkpIC8vIG1vdmV0b1xuICAgIC8vIGRvIG5vdCB3cml0ZSBwb2x5Z29uIGNsb3NpbmcgcGF0aCBhcyBsaW5ldG9cbiAgICB2YXIgbGluZUNvdW50ID0gdHlwZSA9PT0gMyA/IHJpbmcubGVuZ3RoIC0gMSA6IHJpbmcubGVuZ3RoXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsaW5lQ291bnQ7IGkrKykge1xuICAgICAgaWYgKGkgPT09IDEgJiYgdHlwZSAhPT0gMSkge1xuICAgICAgICBwYmYud3JpdGVWYXJpbnQoY29tbWFuZCgyLCBsaW5lQ291bnQgLSAxKSkgLy8gbGluZXRvXG4gICAgICB9XG4gICAgICB2YXIgZHggPSByaW5nW2ldLnggLSB4XG4gICAgICB2YXIgZHkgPSByaW5nW2ldLnkgLSB5XG4gICAgICBwYmYud3JpdGVWYXJpbnQoemlnemFnKGR4KSlcbiAgICAgIHBiZi53cml0ZVZhcmludCh6aWd6YWcoZHkpKVxuICAgICAgeCArPSBkeFxuICAgICAgeSArPSBkeVxuICAgIH1cbiAgICBpZiAodHlwZSA9PT0gMykge1xuICAgICAgcGJmLndyaXRlVmFyaW50KGNvbW1hbmQoNywgMCkpIC8vIGNsb3NlcGF0aFxuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiB3cml0ZVZhbHVlICh2YWx1ZSwgcGJmKSB7XG4gIHZhciB0eXBlID0gdHlwZW9mIHZhbHVlXG4gIGlmICh0eXBlID09PSAnc3RyaW5nJykge1xuICAgIHBiZi53cml0ZVN0cmluZ0ZpZWxkKDEsIHZhbHVlKVxuICB9IGVsc2UgaWYgKHR5cGUgPT09ICdib29sZWFuJykge1xuICAgIHBiZi53cml0ZUJvb2xlYW5GaWVsZCg3LCB2YWx1ZSlcbiAgfSBlbHNlIGlmICh0eXBlID09PSAnbnVtYmVyJykge1xuICAgIGlmICh2YWx1ZSAlIDEgIT09IDApIHtcbiAgICAgIHBiZi53cml0ZURvdWJsZUZpZWxkKDMsIHZhbHVlKVxuICAgIH0gZWxzZSBpZiAodmFsdWUgPCAwKSB7XG4gICAgICBwYmYud3JpdGVTVmFyaW50RmllbGQoNiwgdmFsdWUpXG4gICAgfSBlbHNlIHtcbiAgICAgIHBiZi53cml0ZVZhcmludEZpZWxkKDUsIHZhbHVlKVxuICAgIH1cbiAgfVxufVxuIiwiXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBzb3J0S0QoaWRzLCBjb29yZHMsIG5vZGVTaXplLCBsZWZ0LCByaWdodCwgZGVwdGgpIHtcbiAgICBpZiAocmlnaHQgLSBsZWZ0IDw9IG5vZGVTaXplKSByZXR1cm47XG5cbiAgICB2YXIgbSA9IE1hdGguZmxvb3IoKGxlZnQgKyByaWdodCkgLyAyKTtcblxuICAgIHNlbGVjdChpZHMsIGNvb3JkcywgbSwgbGVmdCwgcmlnaHQsIGRlcHRoICUgMik7XG5cbiAgICBzb3J0S0QoaWRzLCBjb29yZHMsIG5vZGVTaXplLCBsZWZ0LCBtIC0gMSwgZGVwdGggKyAxKTtcbiAgICBzb3J0S0QoaWRzLCBjb29yZHMsIG5vZGVTaXplLCBtICsgMSwgcmlnaHQsIGRlcHRoICsgMSk7XG59XG5cbmZ1bmN0aW9uIHNlbGVjdChpZHMsIGNvb3JkcywgaywgbGVmdCwgcmlnaHQsIGluYykge1xuXG4gICAgd2hpbGUgKHJpZ2h0ID4gbGVmdCkge1xuICAgICAgICBpZiAocmlnaHQgLSBsZWZ0ID4gNjAwKSB7XG4gICAgICAgICAgICB2YXIgbiA9IHJpZ2h0IC0gbGVmdCArIDE7XG4gICAgICAgICAgICB2YXIgbSA9IGsgLSBsZWZ0ICsgMTtcbiAgICAgICAgICAgIHZhciB6ID0gTWF0aC5sb2cobik7XG4gICAgICAgICAgICB2YXIgcyA9IDAuNSAqIE1hdGguZXhwKDIgKiB6IC8gMyk7XG4gICAgICAgICAgICB2YXIgc2QgPSAwLjUgKiBNYXRoLnNxcnQoeiAqIHMgKiAobiAtIHMpIC8gbikgKiAobSAtIG4gLyAyIDwgMCA/IC0xIDogMSk7XG4gICAgICAgICAgICB2YXIgbmV3TGVmdCA9IE1hdGgubWF4KGxlZnQsIE1hdGguZmxvb3IoayAtIG0gKiBzIC8gbiArIHNkKSk7XG4gICAgICAgICAgICB2YXIgbmV3UmlnaHQgPSBNYXRoLm1pbihyaWdodCwgTWF0aC5mbG9vcihrICsgKG4gLSBtKSAqIHMgLyBuICsgc2QpKTtcbiAgICAgICAgICAgIHNlbGVjdChpZHMsIGNvb3JkcywgaywgbmV3TGVmdCwgbmV3UmlnaHQsIGluYyk7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgdCA9IGNvb3Jkc1syICogayArIGluY107XG4gICAgICAgIHZhciBpID0gbGVmdDtcbiAgICAgICAgdmFyIGogPSByaWdodDtcblxuICAgICAgICBzd2FwSXRlbShpZHMsIGNvb3JkcywgbGVmdCwgayk7XG4gICAgICAgIGlmIChjb29yZHNbMiAqIHJpZ2h0ICsgaW5jXSA+IHQpIHN3YXBJdGVtKGlkcywgY29vcmRzLCBsZWZ0LCByaWdodCk7XG5cbiAgICAgICAgd2hpbGUgKGkgPCBqKSB7XG4gICAgICAgICAgICBzd2FwSXRlbShpZHMsIGNvb3JkcywgaSwgaik7XG4gICAgICAgICAgICBpKys7XG4gICAgICAgICAgICBqLS07XG4gICAgICAgICAgICB3aGlsZSAoY29vcmRzWzIgKiBpICsgaW5jXSA8IHQpIGkrKztcbiAgICAgICAgICAgIHdoaWxlIChjb29yZHNbMiAqIGogKyBpbmNdID4gdCkgai0tO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNvb3Jkc1syICogbGVmdCArIGluY10gPT09IHQpIHN3YXBJdGVtKGlkcywgY29vcmRzLCBsZWZ0LCBqKTtcbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBqKys7XG4gICAgICAgICAgICBzd2FwSXRlbShpZHMsIGNvb3JkcywgaiwgcmlnaHQpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGogPD0gaykgbGVmdCA9IGogKyAxO1xuICAgICAgICBpZiAoayA8PSBqKSByaWdodCA9IGogLSAxO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gc3dhcEl0ZW0oaWRzLCBjb29yZHMsIGksIGopIHtcbiAgICBzd2FwKGlkcywgaSwgaik7XG4gICAgc3dhcChjb29yZHMsIDIgKiBpLCAyICogaik7XG4gICAgc3dhcChjb29yZHMsIDIgKiBpICsgMSwgMiAqIGogKyAxKTtcbn1cblxuZnVuY3Rpb24gc3dhcChhcnIsIGksIGopIHtcbiAgICB2YXIgdG1wID0gYXJyW2ldO1xuICAgIGFycltpXSA9IGFycltqXTtcbiAgICBhcnJbal0gPSB0bXA7XG59XG4iLCJcbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIHJhbmdlKGlkcywgY29vcmRzLCBtaW5YLCBtaW5ZLCBtYXhYLCBtYXhZLCBub2RlU2l6ZSkge1xuICAgIHZhciBzdGFjayA9IFswLCBpZHMubGVuZ3RoIC0gMSwgMF07XG4gICAgdmFyIHJlc3VsdCA9IFtdO1xuICAgIHZhciB4LCB5O1xuXG4gICAgd2hpbGUgKHN0YWNrLmxlbmd0aCkge1xuICAgICAgICB2YXIgYXhpcyA9IHN0YWNrLnBvcCgpO1xuICAgICAgICB2YXIgcmlnaHQgPSBzdGFjay5wb3AoKTtcbiAgICAgICAgdmFyIGxlZnQgPSBzdGFjay5wb3AoKTtcblxuICAgICAgICBpZiAocmlnaHQgLSBsZWZ0IDw9IG5vZGVTaXplKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gbGVmdDsgaSA8PSByaWdodDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgeCA9IGNvb3Jkc1syICogaV07XG4gICAgICAgICAgICAgICAgeSA9IGNvb3Jkc1syICogaSArIDFdO1xuICAgICAgICAgICAgICAgIGlmICh4ID49IG1pblggJiYgeCA8PSBtYXhYICYmIHkgPj0gbWluWSAmJiB5IDw9IG1heFkpIHJlc3VsdC5wdXNoKGlkc1tpXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBtID0gTWF0aC5mbG9vcigobGVmdCArIHJpZ2h0KSAvIDIpO1xuXG4gICAgICAgIHggPSBjb29yZHNbMiAqIG1dO1xuICAgICAgICB5ID0gY29vcmRzWzIgKiBtICsgMV07XG5cbiAgICAgICAgaWYgKHggPj0gbWluWCAmJiB4IDw9IG1heFggJiYgeSA+PSBtaW5ZICYmIHkgPD0gbWF4WSkgcmVzdWx0LnB1c2goaWRzW21dKTtcblxuICAgICAgICB2YXIgbmV4dEF4aXMgPSAoYXhpcyArIDEpICUgMjtcblxuICAgICAgICBpZiAoYXhpcyA9PT0gMCA/IG1pblggPD0geCA6IG1pblkgPD0geSkge1xuICAgICAgICAgICAgc3RhY2sucHVzaChsZWZ0KTtcbiAgICAgICAgICAgIHN0YWNrLnB1c2gobSAtIDEpO1xuICAgICAgICAgICAgc3RhY2sucHVzaChuZXh0QXhpcyk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGF4aXMgPT09IDAgPyBtYXhYID49IHggOiBtYXhZID49IHkpIHtcbiAgICAgICAgICAgIHN0YWNrLnB1c2gobSArIDEpO1xuICAgICAgICAgICAgc3RhY2sucHVzaChyaWdodCk7XG4gICAgICAgICAgICBzdGFjay5wdXNoKG5leHRBeGlzKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiByZXN1bHQ7XG59XG4iLCJcbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIHdpdGhpbihpZHMsIGNvb3JkcywgcXgsIHF5LCByLCBub2RlU2l6ZSkge1xuICAgIHZhciBzdGFjayA9IFswLCBpZHMubGVuZ3RoIC0gMSwgMF07XG4gICAgdmFyIHJlc3VsdCA9IFtdO1xuICAgIHZhciByMiA9IHIgKiByO1xuXG4gICAgd2hpbGUgKHN0YWNrLmxlbmd0aCkge1xuICAgICAgICB2YXIgYXhpcyA9IHN0YWNrLnBvcCgpO1xuICAgICAgICB2YXIgcmlnaHQgPSBzdGFjay5wb3AoKTtcbiAgICAgICAgdmFyIGxlZnQgPSBzdGFjay5wb3AoKTtcblxuICAgICAgICBpZiAocmlnaHQgLSBsZWZ0IDw9IG5vZGVTaXplKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gbGVmdDsgaSA8PSByaWdodDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgaWYgKHNxRGlzdChjb29yZHNbMiAqIGldLCBjb29yZHNbMiAqIGkgKyAxXSwgcXgsIHF5KSA8PSByMikgcmVzdWx0LnB1c2goaWRzW2ldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIG0gPSBNYXRoLmZsb29yKChsZWZ0ICsgcmlnaHQpIC8gMik7XG5cbiAgICAgICAgdmFyIHggPSBjb29yZHNbMiAqIG1dO1xuICAgICAgICB2YXIgeSA9IGNvb3Jkc1syICogbSArIDFdO1xuXG4gICAgICAgIGlmIChzcURpc3QoeCwgeSwgcXgsIHF5KSA8PSByMikgcmVzdWx0LnB1c2goaWRzW21dKTtcblxuICAgICAgICB2YXIgbmV4dEF4aXMgPSAoYXhpcyArIDEpICUgMjtcblxuICAgICAgICBpZiAoYXhpcyA9PT0gMCA/IHF4IC0gciA8PSB4IDogcXkgLSByIDw9IHkpIHtcbiAgICAgICAgICAgIHN0YWNrLnB1c2gobGVmdCk7XG4gICAgICAgICAgICBzdGFjay5wdXNoKG0gLSAxKTtcbiAgICAgICAgICAgIHN0YWNrLnB1c2gobmV4dEF4aXMpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChheGlzID09PSAwID8gcXggKyByID49IHggOiBxeSArIHIgPj0geSkge1xuICAgICAgICAgICAgc3RhY2sucHVzaChtICsgMSk7XG4gICAgICAgICAgICBzdGFjay5wdXNoKHJpZ2h0KTtcbiAgICAgICAgICAgIHN0YWNrLnB1c2gobmV4dEF4aXMpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlc3VsdDtcbn1cblxuZnVuY3Rpb24gc3FEaXN0KGF4LCBheSwgYngsIGJ5KSB7XG4gICAgdmFyIGR4ID0gYXggLSBieDtcbiAgICB2YXIgZHkgPSBheSAtIGJ5O1xuICAgIHJldHVybiBkeCAqIGR4ICsgZHkgKiBkeTtcbn1cbiIsIlxuaW1wb3J0IHNvcnQgZnJvbSAnLi9zb3J0JztcbmltcG9ydCByYW5nZSBmcm9tICcuL3JhbmdlJztcbmltcG9ydCB3aXRoaW4gZnJvbSAnLi93aXRoaW4nO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBrZGJ1c2gocG9pbnRzLCBnZXRYLCBnZXRZLCBub2RlU2l6ZSwgQXJyYXlUeXBlKSB7XG4gICAgcmV0dXJuIG5ldyBLREJ1c2gocG9pbnRzLCBnZXRYLCBnZXRZLCBub2RlU2l6ZSwgQXJyYXlUeXBlKTtcbn1cblxuZnVuY3Rpb24gS0RCdXNoKHBvaW50cywgZ2V0WCwgZ2V0WSwgbm9kZVNpemUsIEFycmF5VHlwZSkge1xuICAgIGdldFggPSBnZXRYIHx8IGRlZmF1bHRHZXRYO1xuICAgIGdldFkgPSBnZXRZIHx8IGRlZmF1bHRHZXRZO1xuICAgIEFycmF5VHlwZSA9IEFycmF5VHlwZSB8fCBBcnJheTtcblxuICAgIHRoaXMubm9kZVNpemUgPSBub2RlU2l6ZSB8fCA2NDtcbiAgICB0aGlzLnBvaW50cyA9IHBvaW50cztcblxuICAgIHRoaXMuaWRzID0gbmV3IEFycmF5VHlwZShwb2ludHMubGVuZ3RoKTtcbiAgICB0aGlzLmNvb3JkcyA9IG5ldyBBcnJheVR5cGUocG9pbnRzLmxlbmd0aCAqIDIpO1xuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwb2ludHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdGhpcy5pZHNbaV0gPSBpO1xuICAgICAgICB0aGlzLmNvb3Jkc1syICogaV0gPSBnZXRYKHBvaW50c1tpXSk7XG4gICAgICAgIHRoaXMuY29vcmRzWzIgKiBpICsgMV0gPSBnZXRZKHBvaW50c1tpXSk7XG4gICAgfVxuXG4gICAgc29ydCh0aGlzLmlkcywgdGhpcy5jb29yZHMsIHRoaXMubm9kZVNpemUsIDAsIHRoaXMuaWRzLmxlbmd0aCAtIDEsIDApO1xufVxuXG5LREJ1c2gucHJvdG90eXBlID0ge1xuICAgIHJhbmdlOiBmdW5jdGlvbiAobWluWCwgbWluWSwgbWF4WCwgbWF4WSkge1xuICAgICAgICByZXR1cm4gcmFuZ2UodGhpcy5pZHMsIHRoaXMuY29vcmRzLCBtaW5YLCBtaW5ZLCBtYXhYLCBtYXhZLCB0aGlzLm5vZGVTaXplKTtcbiAgICB9LFxuXG4gICAgd2l0aGluOiBmdW5jdGlvbiAoeCwgeSwgcikge1xuICAgICAgICByZXR1cm4gd2l0aGluKHRoaXMuaWRzLCB0aGlzLmNvb3JkcywgeCwgeSwgciwgdGhpcy5ub2RlU2l6ZSk7XG4gICAgfVxufTtcblxuZnVuY3Rpb24gZGVmYXVsdEdldFgocCkgeyByZXR1cm4gcFswXTsgfVxuZnVuY3Rpb24gZGVmYXVsdEdldFkocCkgeyByZXR1cm4gcFsxXTsgfVxuIiwiXG5pbXBvcnQga2RidXNoIGZyb20gJ2tkYnVzaCc7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIHN1cGVyY2x1c3RlcihvcHRpb25zKSB7XG4gICAgcmV0dXJuIG5ldyBTdXBlckNsdXN0ZXIob3B0aW9ucyk7XG59XG5cbmZ1bmN0aW9uIFN1cGVyQ2x1c3RlcihvcHRpb25zKSB7XG4gICAgdGhpcy5vcHRpb25zID0gZXh0ZW5kKE9iamVjdC5jcmVhdGUodGhpcy5vcHRpb25zKSwgb3B0aW9ucyk7XG4gICAgdGhpcy50cmVlcyA9IG5ldyBBcnJheSh0aGlzLm9wdGlvbnMubWF4Wm9vbSArIDEpO1xufVxuXG5TdXBlckNsdXN0ZXIucHJvdG90eXBlID0ge1xuICAgIG9wdGlvbnM6IHtcbiAgICAgICAgbWluWm9vbTogMCwgICAvLyBtaW4gem9vbSB0byBnZW5lcmF0ZSBjbHVzdGVycyBvblxuICAgICAgICBtYXhab29tOiAxNiwgIC8vIG1heCB6b29tIGxldmVsIHRvIGNsdXN0ZXIgdGhlIHBvaW50cyBvblxuICAgICAgICByYWRpdXM6IDQwLCAgIC8vIGNsdXN0ZXIgcmFkaXVzIGluIHBpeGVsc1xuICAgICAgICBleHRlbnQ6IDUxMiwgIC8vIHRpbGUgZXh0ZW50IChyYWRpdXMgaXMgY2FsY3VsYXRlZCByZWxhdGl2ZSB0byBpdClcbiAgICAgICAgbm9kZVNpemU6IDY0LCAvLyBzaXplIG9mIHRoZSBLRC10cmVlIGxlYWYgbm9kZSwgYWZmZWN0cyBwZXJmb3JtYW5jZVxuICAgICAgICBsb2c6IGZhbHNlLCAgIC8vIHdoZXRoZXIgdG8gbG9nIHRpbWluZyBpbmZvXG5cbiAgICAgICAgLy8gYSByZWR1Y2UgZnVuY3Rpb24gZm9yIGNhbGN1bGF0aW5nIGN1c3RvbSBjbHVzdGVyIHByb3BlcnRpZXNcbiAgICAgICAgcmVkdWNlOiBudWxsLCAvLyBmdW5jdGlvbiAoYWNjdW11bGF0ZWQsIHByb3BzKSB7IGFjY3VtdWxhdGVkLnN1bSArPSBwcm9wcy5zdW07IH1cblxuICAgICAgICAvLyBpbml0aWFsIHByb3BlcnRpZXMgb2YgYSBjbHVzdGVyIChiZWZvcmUgcnVubmluZyB0aGUgcmVkdWNlcilcbiAgICAgICAgaW5pdGlhbDogZnVuY3Rpb24gKCkgeyByZXR1cm4ge307IH0sIC8vIGZ1bmN0aW9uICgpIHsgcmV0dXJuIHtzdW06IDB9OyB9LFxuXG4gICAgICAgIC8vIHByb3BlcnRpZXMgdG8gdXNlIGZvciBpbmRpdmlkdWFsIHBvaW50cyB3aGVuIHJ1bm5pbmcgdGhlIHJlZHVjZXJcbiAgICAgICAgbWFwOiBmdW5jdGlvbiAocHJvcHMpIHsgcmV0dXJuIHByb3BzOyB9IC8vIGZ1bmN0aW9uIChwcm9wcykgeyByZXR1cm4ge3N1bTogcHJvcHMubXlfdmFsdWV9OyB9LFxuICAgIH0sXG5cbiAgICBsb2FkOiBmdW5jdGlvbiAocG9pbnRzKSB7XG4gICAgICAgIHZhciBsb2cgPSB0aGlzLm9wdGlvbnMubG9nO1xuXG4gICAgICAgIGlmIChsb2cpIGNvbnNvbGUudGltZSgndG90YWwgdGltZScpO1xuXG4gICAgICAgIHZhciB0aW1lcklkID0gJ3ByZXBhcmUgJyArIHBvaW50cy5sZW5ndGggKyAnIHBvaW50cyc7XG4gICAgICAgIGlmIChsb2cpIGNvbnNvbGUudGltZSh0aW1lcklkKTtcblxuICAgICAgICB0aGlzLnBvaW50cyA9IHBvaW50cztcblxuICAgICAgICAvLyBnZW5lcmF0ZSBhIGNsdXN0ZXIgb2JqZWN0IGZvciBlYWNoIHBvaW50IGFuZCBpbmRleCBpbnB1dCBwb2ludHMgaW50byBhIEtELXRyZWVcbiAgICAgICAgdmFyIGNsdXN0ZXJzID0gW107XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcG9pbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBpZiAoIXBvaW50c1tpXS5nZW9tZXRyeSkge1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2x1c3RlcnMucHVzaChjcmVhdGVQb2ludENsdXN0ZXIocG9pbnRzW2ldLCBpKSk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy50cmVlc1t0aGlzLm9wdGlvbnMubWF4Wm9vbSArIDFdID0ga2RidXNoKGNsdXN0ZXJzLCBnZXRYLCBnZXRZLCB0aGlzLm9wdGlvbnMubm9kZVNpemUsIEZsb2F0MzJBcnJheSk7XG5cbiAgICAgICAgaWYgKGxvZykgY29uc29sZS50aW1lRW5kKHRpbWVySWQpO1xuXG4gICAgICAgIC8vIGNsdXN0ZXIgcG9pbnRzIG9uIG1heCB6b29tLCB0aGVuIGNsdXN0ZXIgdGhlIHJlc3VsdHMgb24gcHJldmlvdXMgem9vbSwgZXRjLjtcbiAgICAgICAgLy8gcmVzdWx0cyBpbiBhIGNsdXN0ZXIgaGllcmFyY2h5IGFjcm9zcyB6b29tIGxldmVsc1xuICAgICAgICBmb3IgKHZhciB6ID0gdGhpcy5vcHRpb25zLm1heFpvb207IHogPj0gdGhpcy5vcHRpb25zLm1pblpvb207IHotLSkge1xuICAgICAgICAgICAgdmFyIG5vdyA9ICtEYXRlLm5vdygpO1xuXG4gICAgICAgICAgICAvLyBjcmVhdGUgYSBuZXcgc2V0IG9mIGNsdXN0ZXJzIGZvciB0aGUgem9vbSBhbmQgaW5kZXggdGhlbSB3aXRoIGEgS0QtdHJlZVxuICAgICAgICAgICAgY2x1c3RlcnMgPSB0aGlzLl9jbHVzdGVyKGNsdXN0ZXJzLCB6KTtcbiAgICAgICAgICAgIHRoaXMudHJlZXNbel0gPSBrZGJ1c2goY2x1c3RlcnMsIGdldFgsIGdldFksIHRoaXMub3B0aW9ucy5ub2RlU2l6ZSwgRmxvYXQzMkFycmF5KTtcblxuICAgICAgICAgICAgaWYgKGxvZykgY29uc29sZS5sb2coJ3olZDogJWQgY2x1c3RlcnMgaW4gJWRtcycsIHosIGNsdXN0ZXJzLmxlbmd0aCwgK0RhdGUubm93KCkgLSBub3cpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGxvZykgY29uc29sZS50aW1lRW5kKCd0b3RhbCB0aW1lJyk7XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuICAgIGdldENsdXN0ZXJzOiBmdW5jdGlvbiAoYmJveCwgem9vbSkge1xuICAgICAgICB2YXIgbWluTG5nID0gKChiYm94WzBdICsgMTgwKSAlIDM2MCArIDM2MCkgJSAzNjAgLSAxODA7XG4gICAgICAgIHZhciBtaW5MYXQgPSBNYXRoLm1heCgtOTAsIE1hdGgubWluKDkwLCBiYm94WzFdKSk7XG4gICAgICAgIHZhciBtYXhMbmcgPSBiYm94WzJdID09PSAxODAgPyAxODAgOiAoKGJib3hbMl0gKyAxODApICUgMzYwICsgMzYwKSAlIDM2MCAtIDE4MDtcbiAgICAgICAgdmFyIG1heExhdCA9IE1hdGgubWF4KC05MCwgTWF0aC5taW4oOTAsIGJib3hbM10pKTtcblxuICAgICAgICBpZiAoYmJveFsyXSAtIGJib3hbMF0gPj0gMzYwKSB7XG4gICAgICAgICAgICBtaW5MbmcgPSAtMTgwO1xuICAgICAgICAgICAgbWF4TG5nID0gMTgwO1xuICAgICAgICB9IGVsc2UgaWYgKG1pbkxuZyA+IG1heExuZykge1xuICAgICAgICAgICAgdmFyIGVhc3Rlcm5IZW0gPSB0aGlzLmdldENsdXN0ZXJzKFttaW5MbmcsIG1pbkxhdCwgMTgwLCBtYXhMYXRdLCB6b29tKTtcbiAgICAgICAgICAgIHZhciB3ZXN0ZXJuSGVtID0gdGhpcy5nZXRDbHVzdGVycyhbLTE4MCwgbWluTGF0LCBtYXhMbmcsIG1heExhdF0sIHpvb20pO1xuICAgICAgICAgICAgcmV0dXJuIGVhc3Rlcm5IZW0uY29uY2F0KHdlc3Rlcm5IZW0pO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHRyZWUgPSB0aGlzLnRyZWVzW3RoaXMuX2xpbWl0Wm9vbSh6b29tKV07XG4gICAgICAgIHZhciBpZHMgPSB0cmVlLnJhbmdlKGxuZ1gobWluTG5nKSwgbGF0WShtYXhMYXQpLCBsbmdYKG1heExuZyksIGxhdFkobWluTGF0KSk7XG4gICAgICAgIHZhciBjbHVzdGVycyA9IFtdO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGlkcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIGMgPSB0cmVlLnBvaW50c1tpZHNbaV1dO1xuICAgICAgICAgICAgY2x1c3RlcnMucHVzaChjLm51bVBvaW50cyA/IGdldENsdXN0ZXJKU09OKGMpIDogdGhpcy5wb2ludHNbYy5pbmRleF0pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBjbHVzdGVycztcbiAgICB9LFxuXG4gICAgZ2V0Q2hpbGRyZW46IGZ1bmN0aW9uIChjbHVzdGVySWQpIHtcbiAgICAgICAgdmFyIG9yaWdpbklkID0gY2x1c3RlcklkID4+IDU7XG4gICAgICAgIHZhciBvcmlnaW5ab29tID0gY2x1c3RlcklkICUgMzI7XG4gICAgICAgIHZhciBlcnJvck1zZyA9ICdObyBjbHVzdGVyIHdpdGggdGhlIHNwZWNpZmllZCBpZC4nO1xuXG4gICAgICAgIHZhciBpbmRleCA9IHRoaXMudHJlZXNbb3JpZ2luWm9vbV07XG4gICAgICAgIGlmICghaW5kZXgpIHRocm93IG5ldyBFcnJvcihlcnJvck1zZyk7XG5cbiAgICAgICAgdmFyIG9yaWdpbiA9IGluZGV4LnBvaW50c1tvcmlnaW5JZF07XG4gICAgICAgIGlmICghb3JpZ2luKSB0aHJvdyBuZXcgRXJyb3IoZXJyb3JNc2cpO1xuXG4gICAgICAgIHZhciByID0gdGhpcy5vcHRpb25zLnJhZGl1cyAvICh0aGlzLm9wdGlvbnMuZXh0ZW50ICogTWF0aC5wb3coMiwgb3JpZ2luWm9vbSAtIDEpKTtcbiAgICAgICAgdmFyIGlkcyA9IGluZGV4LndpdGhpbihvcmlnaW4ueCwgb3JpZ2luLnksIHIpO1xuICAgICAgICB2YXIgY2hpbGRyZW4gPSBbXTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBpZHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBjID0gaW5kZXgucG9pbnRzW2lkc1tpXV07XG4gICAgICAgICAgICBpZiAoYy5wYXJlbnRJZCA9PT0gY2x1c3RlcklkKSB7XG4gICAgICAgICAgICAgICAgY2hpbGRyZW4ucHVzaChjLm51bVBvaW50cyA/IGdldENsdXN0ZXJKU09OKGMpIDogdGhpcy5wb2ludHNbYy5pbmRleF0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNoaWxkcmVuLmxlbmd0aCA9PT0gMCkgdGhyb3cgbmV3IEVycm9yKGVycm9yTXNnKTtcblxuICAgICAgICByZXR1cm4gY2hpbGRyZW47XG4gICAgfSxcblxuICAgIGdldExlYXZlczogZnVuY3Rpb24gKGNsdXN0ZXJJZCwgbGltaXQsIG9mZnNldCkge1xuICAgICAgICBsaW1pdCA9IGxpbWl0IHx8IDEwO1xuICAgICAgICBvZmZzZXQgPSBvZmZzZXQgfHwgMDtcblxuICAgICAgICB2YXIgbGVhdmVzID0gW107XG4gICAgICAgIHRoaXMuX2FwcGVuZExlYXZlcyhsZWF2ZXMsIGNsdXN0ZXJJZCwgbGltaXQsIG9mZnNldCwgMCk7XG5cbiAgICAgICAgcmV0dXJuIGxlYXZlcztcbiAgICB9LFxuXG4gICAgZ2V0VGlsZTogZnVuY3Rpb24gKHosIHgsIHkpIHtcbiAgICAgICAgdmFyIHRyZWUgPSB0aGlzLnRyZWVzW3RoaXMuX2xpbWl0Wm9vbSh6KV07XG4gICAgICAgIHZhciB6MiA9IE1hdGgucG93KDIsIHopO1xuICAgICAgICB2YXIgZXh0ZW50ID0gdGhpcy5vcHRpb25zLmV4dGVudDtcbiAgICAgICAgdmFyIHIgPSB0aGlzLm9wdGlvbnMucmFkaXVzO1xuICAgICAgICB2YXIgcCA9IHIgLyBleHRlbnQ7XG4gICAgICAgIHZhciB0b3AgPSAoeSAtIHApIC8gejI7XG4gICAgICAgIHZhciBib3R0b20gPSAoeSArIDEgKyBwKSAvIHoyO1xuXG4gICAgICAgIHZhciB0aWxlID0ge1xuICAgICAgICAgICAgZmVhdHVyZXM6IFtdXG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5fYWRkVGlsZUZlYXR1cmVzKFxuICAgICAgICAgICAgdHJlZS5yYW5nZSgoeCAtIHApIC8gejIsIHRvcCwgKHggKyAxICsgcCkgLyB6MiwgYm90dG9tKSxcbiAgICAgICAgICAgIHRyZWUucG9pbnRzLCB4LCB5LCB6MiwgdGlsZSk7XG5cbiAgICAgICAgaWYgKHggPT09IDApIHtcbiAgICAgICAgICAgIHRoaXMuX2FkZFRpbGVGZWF0dXJlcyhcbiAgICAgICAgICAgICAgICB0cmVlLnJhbmdlKDEgLSBwIC8gejIsIHRvcCwgMSwgYm90dG9tKSxcbiAgICAgICAgICAgICAgICB0cmVlLnBvaW50cywgejIsIHksIHoyLCB0aWxlKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoeCA9PT0gejIgLSAxKSB7XG4gICAgICAgICAgICB0aGlzLl9hZGRUaWxlRmVhdHVyZXMoXG4gICAgICAgICAgICAgICAgdHJlZS5yYW5nZSgwLCB0b3AsIHAgLyB6MiwgYm90dG9tKSxcbiAgICAgICAgICAgICAgICB0cmVlLnBvaW50cywgLTEsIHksIHoyLCB0aWxlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aWxlLmZlYXR1cmVzLmxlbmd0aCA/IHRpbGUgOiBudWxsO1xuICAgIH0sXG5cbiAgICBnZXRDbHVzdGVyRXhwYW5zaW9uWm9vbTogZnVuY3Rpb24gKGNsdXN0ZXJJZCkge1xuICAgICAgICB2YXIgY2x1c3Rlclpvb20gPSAoY2x1c3RlcklkICUgMzIpIC0gMTtcbiAgICAgICAgd2hpbGUgKGNsdXN0ZXJab29tIDwgdGhpcy5vcHRpb25zLm1heFpvb20pIHtcbiAgICAgICAgICAgIHZhciBjaGlsZHJlbiA9IHRoaXMuZ2V0Q2hpbGRyZW4oY2x1c3RlcklkKTtcbiAgICAgICAgICAgIGNsdXN0ZXJab29tKys7XG4gICAgICAgICAgICBpZiAoY2hpbGRyZW4ubGVuZ3RoICE9PSAxKSBicmVhaztcbiAgICAgICAgICAgIGNsdXN0ZXJJZCA9IGNoaWxkcmVuWzBdLnByb3BlcnRpZXMuY2x1c3Rlcl9pZDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gY2x1c3Rlclpvb207XG4gICAgfSxcblxuICAgIF9hcHBlbmRMZWF2ZXM6IGZ1bmN0aW9uIChyZXN1bHQsIGNsdXN0ZXJJZCwgbGltaXQsIG9mZnNldCwgc2tpcHBlZCkge1xuICAgICAgICB2YXIgY2hpbGRyZW4gPSB0aGlzLmdldENoaWxkcmVuKGNsdXN0ZXJJZCk7XG5cbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjaGlsZHJlbi5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIHByb3BzID0gY2hpbGRyZW5baV0ucHJvcGVydGllcztcblxuICAgICAgICAgICAgaWYgKHByb3BzICYmIHByb3BzLmNsdXN0ZXIpIHtcbiAgICAgICAgICAgICAgICBpZiAoc2tpcHBlZCArIHByb3BzLnBvaW50X2NvdW50IDw9IG9mZnNldCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBza2lwIHRoZSB3aG9sZSBjbHVzdGVyXG4gICAgICAgICAgICAgICAgICAgIHNraXBwZWQgKz0gcHJvcHMucG9pbnRfY291bnQ7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gZW50ZXIgdGhlIGNsdXN0ZXJcbiAgICAgICAgICAgICAgICAgICAgc2tpcHBlZCA9IHRoaXMuX2FwcGVuZExlYXZlcyhyZXN1bHQsIHByb3BzLmNsdXN0ZXJfaWQsIGxpbWl0LCBvZmZzZXQsIHNraXBwZWQpO1xuICAgICAgICAgICAgICAgICAgICAvLyBleGl0IHRoZSBjbHVzdGVyXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChza2lwcGVkIDwgb2Zmc2V0KSB7XG4gICAgICAgICAgICAgICAgLy8gc2tpcCBhIHNpbmdsZSBwb2ludFxuICAgICAgICAgICAgICAgIHNraXBwZWQrKztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gYWRkIGEgc2luZ2xlIHBvaW50XG4gICAgICAgICAgICAgICAgcmVzdWx0LnB1c2goY2hpbGRyZW5baV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHJlc3VsdC5sZW5ndGggPT09IGxpbWl0KSBicmVhaztcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBza2lwcGVkO1xuICAgIH0sXG5cbiAgICBfYWRkVGlsZUZlYXR1cmVzOiBmdW5jdGlvbiAoaWRzLCBwb2ludHMsIHgsIHksIHoyLCB0aWxlKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgaWRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgYyA9IHBvaW50c1tpZHNbaV1dO1xuICAgICAgICAgICAgdmFyIGYgPSB7XG4gICAgICAgICAgICAgICAgdHlwZTogMSxcbiAgICAgICAgICAgICAgICBnZW9tZXRyeTogW1tcbiAgICAgICAgICAgICAgICAgICAgTWF0aC5yb3VuZCh0aGlzLm9wdGlvbnMuZXh0ZW50ICogKGMueCAqIHoyIC0geCkpLFxuICAgICAgICAgICAgICAgICAgICBNYXRoLnJvdW5kKHRoaXMub3B0aW9ucy5leHRlbnQgKiAoYy55ICogejIgLSB5KSlcbiAgICAgICAgICAgICAgICBdXSxcbiAgICAgICAgICAgICAgICB0YWdzOiBjLm51bVBvaW50cyA/IGdldENsdXN0ZXJQcm9wZXJ0aWVzKGMpIDogdGhpcy5wb2ludHNbYy5pbmRleF0ucHJvcGVydGllc1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHZhciBpZCA9IGMubnVtUG9pbnRzID8gYy5pZCA6IHRoaXMucG9pbnRzW2MuaW5kZXhdLmlkO1xuICAgICAgICAgICAgaWYgKGlkICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBmLmlkID0gaWQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aWxlLmZlYXR1cmVzLnB1c2goZik7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgX2xpbWl0Wm9vbTogZnVuY3Rpb24gKHopIHtcbiAgICAgICAgcmV0dXJuIE1hdGgubWF4KHRoaXMub3B0aW9ucy5taW5ab29tLCBNYXRoLm1pbih6LCB0aGlzLm9wdGlvbnMubWF4Wm9vbSArIDEpKTtcbiAgICB9LFxuXG4gICAgX2NsdXN0ZXI6IGZ1bmN0aW9uIChwb2ludHMsIHpvb20pIHtcbiAgICAgICAgdmFyIGNsdXN0ZXJzID0gW107XG4gICAgICAgIHZhciByID0gdGhpcy5vcHRpb25zLnJhZGl1cyAvICh0aGlzLm9wdGlvbnMuZXh0ZW50ICogTWF0aC5wb3coMiwgem9vbSkpO1xuXG4gICAgICAgIC8vIGxvb3AgdGhyb3VnaCBlYWNoIHBvaW50XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcG9pbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgcCA9IHBvaW50c1tpXTtcbiAgICAgICAgICAgIC8vIGlmIHdlJ3ZlIGFscmVhZHkgdmlzaXRlZCB0aGUgcG9pbnQgYXQgdGhpcyB6b29tIGxldmVsLCBza2lwIGl0XG4gICAgICAgICAgICBpZiAocC56b29tIDw9IHpvb20pIGNvbnRpbnVlO1xuICAgICAgICAgICAgcC56b29tID0gem9vbTtcblxuICAgICAgICAgICAgLy8gZmluZCBhbGwgbmVhcmJ5IHBvaW50c1xuICAgICAgICAgICAgdmFyIHRyZWUgPSB0aGlzLnRyZWVzW3pvb20gKyAxXTtcbiAgICAgICAgICAgIHZhciBuZWlnaGJvcklkcyA9IHRyZWUud2l0aGluKHAueCwgcC55LCByKTtcblxuICAgICAgICAgICAgdmFyIG51bVBvaW50cyA9IHAubnVtUG9pbnRzIHx8IDE7XG4gICAgICAgICAgICB2YXIgd3ggPSBwLnggKiBudW1Qb2ludHM7XG4gICAgICAgICAgICB2YXIgd3kgPSBwLnkgKiBudW1Qb2ludHM7XG5cbiAgICAgICAgICAgIHZhciBjbHVzdGVyUHJvcGVydGllcyA9IG51bGw7XG5cbiAgICAgICAgICAgIGlmICh0aGlzLm9wdGlvbnMucmVkdWNlKSB7XG4gICAgICAgICAgICAgICAgY2x1c3RlclByb3BlcnRpZXMgPSB0aGlzLm9wdGlvbnMuaW5pdGlhbCgpO1xuICAgICAgICAgICAgICAgIHRoaXMuX2FjY3VtdWxhdGUoY2x1c3RlclByb3BlcnRpZXMsIHApO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBlbmNvZGUgYm90aCB6b29tIGFuZCBwb2ludCBpbmRleCBvbiB3aGljaCB0aGUgY2x1c3RlciBvcmlnaW5hdGVkXG4gICAgICAgICAgICB2YXIgaWQgPSAoaSA8PCA1KSArICh6b29tICsgMSk7XG5cbiAgICAgICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgbmVpZ2hib3JJZHMubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgYiA9IHRyZWUucG9pbnRzW25laWdoYm9ySWRzW2pdXTtcbiAgICAgICAgICAgICAgICAvLyBmaWx0ZXIgb3V0IG5laWdoYm9ycyB0aGF0IGFyZSBhbHJlYWR5IHByb2Nlc3NlZFxuICAgICAgICAgICAgICAgIGlmIChiLnpvb20gPD0gem9vbSkgY29udGludWU7XG4gICAgICAgICAgICAgICAgYi56b29tID0gem9vbTsgLy8gc2F2ZSB0aGUgem9vbSAoc28gaXQgZG9lc24ndCBnZXQgcHJvY2Vzc2VkIHR3aWNlKVxuXG4gICAgICAgICAgICAgICAgdmFyIG51bVBvaW50czIgPSBiLm51bVBvaW50cyB8fCAxO1xuICAgICAgICAgICAgICAgIHd4ICs9IGIueCAqIG51bVBvaW50czI7IC8vIGFjY3VtdWxhdGUgY29vcmRpbmF0ZXMgZm9yIGNhbGN1bGF0aW5nIHdlaWdodGVkIGNlbnRlclxuICAgICAgICAgICAgICAgIHd5ICs9IGIueSAqIG51bVBvaW50czI7XG5cbiAgICAgICAgICAgICAgICBudW1Qb2ludHMgKz0gbnVtUG9pbnRzMjtcbiAgICAgICAgICAgICAgICBiLnBhcmVudElkID0gaWQ7XG5cbiAgICAgICAgICAgICAgICBpZiAodGhpcy5vcHRpb25zLnJlZHVjZSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9hY2N1bXVsYXRlKGNsdXN0ZXJQcm9wZXJ0aWVzLCBiKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChudW1Qb2ludHMgPT09IDEpIHtcbiAgICAgICAgICAgICAgICBjbHVzdGVycy5wdXNoKHApO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBwLnBhcmVudElkID0gaWQ7XG4gICAgICAgICAgICAgICAgY2x1c3RlcnMucHVzaChjcmVhdGVDbHVzdGVyKHd4IC8gbnVtUG9pbnRzLCB3eSAvIG51bVBvaW50cywgaWQsIG51bVBvaW50cywgY2x1c3RlclByb3BlcnRpZXMpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBjbHVzdGVycztcbiAgICB9LFxuXG4gICAgX2FjY3VtdWxhdGU6IGZ1bmN0aW9uIChjbHVzdGVyUHJvcGVydGllcywgcG9pbnQpIHtcbiAgICAgICAgdmFyIHByb3BlcnRpZXMgPSBwb2ludC5udW1Qb2ludHMgP1xuICAgICAgICAgICAgcG9pbnQucHJvcGVydGllcyA6XG4gICAgICAgICAgICB0aGlzLm9wdGlvbnMubWFwKHRoaXMucG9pbnRzW3BvaW50LmluZGV4XS5wcm9wZXJ0aWVzKTtcblxuICAgICAgICB0aGlzLm9wdGlvbnMucmVkdWNlKGNsdXN0ZXJQcm9wZXJ0aWVzLCBwcm9wZXJ0aWVzKTtcbiAgICB9XG59O1xuXG5mdW5jdGlvbiBjcmVhdGVDbHVzdGVyKHgsIHksIGlkLCBudW1Qb2ludHMsIHByb3BlcnRpZXMpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICB4OiB4LCAvLyB3ZWlnaHRlZCBjbHVzdGVyIGNlbnRlclxuICAgICAgICB5OiB5LFxuICAgICAgICB6b29tOiBJbmZpbml0eSwgLy8gdGhlIGxhc3Qgem9vbSB0aGUgY2x1c3RlciB3YXMgcHJvY2Vzc2VkIGF0XG4gICAgICAgIGlkOiBpZCwgLy8gZW5jb2RlcyBpbmRleCBvZiB0aGUgZmlyc3QgY2hpbGQgb2YgdGhlIGNsdXN0ZXIgYW5kIGl0cyB6b29tIGxldmVsXG4gICAgICAgIHBhcmVudElkOiAtMSwgLy8gcGFyZW50IGNsdXN0ZXIgaWRcbiAgICAgICAgbnVtUG9pbnRzOiBudW1Qb2ludHMsXG4gICAgICAgIHByb3BlcnRpZXM6IHByb3BlcnRpZXNcbiAgICB9O1xufVxuXG5mdW5jdGlvbiBjcmVhdGVQb2ludENsdXN0ZXIocCwgaWQpIHtcbiAgICB2YXIgY29vcmRzID0gcC5nZW9tZXRyeS5jb29yZGluYXRlcztcbiAgICByZXR1cm4ge1xuICAgICAgICB4OiBsbmdYKGNvb3Jkc1swXSksIC8vIHByb2plY3RlZCBwb2ludCBjb29yZGluYXRlc1xuICAgICAgICB5OiBsYXRZKGNvb3Jkc1sxXSksXG4gICAgICAgIHpvb206IEluZmluaXR5LCAvLyB0aGUgbGFzdCB6b29tIHRoZSBwb2ludCB3YXMgcHJvY2Vzc2VkIGF0XG4gICAgICAgIGluZGV4OiBpZCwgLy8gaW5kZXggb2YgdGhlIHNvdXJjZSBmZWF0dXJlIGluIHRoZSBvcmlnaW5hbCBpbnB1dCBhcnJheSxcbiAgICAgICAgcGFyZW50SWQ6IC0xIC8vIHBhcmVudCBjbHVzdGVyIGlkXG4gICAgfTtcbn1cblxuZnVuY3Rpb24gZ2V0Q2x1c3RlckpTT04oY2x1c3Rlcikge1xuICAgIHJldHVybiB7XG4gICAgICAgIHR5cGU6ICdGZWF0dXJlJyxcbiAgICAgICAgaWQ6IGNsdXN0ZXIuaWQsXG4gICAgICAgIHByb3BlcnRpZXM6IGdldENsdXN0ZXJQcm9wZXJ0aWVzKGNsdXN0ZXIpLFxuICAgICAgICBnZW9tZXRyeToge1xuICAgICAgICAgICAgdHlwZTogJ1BvaW50JyxcbiAgICAgICAgICAgIGNvb3JkaW5hdGVzOiBbeExuZyhjbHVzdGVyLngpLCB5TGF0KGNsdXN0ZXIueSldXG4gICAgICAgIH1cbiAgICB9O1xufVxuXG5mdW5jdGlvbiBnZXRDbHVzdGVyUHJvcGVydGllcyhjbHVzdGVyKSB7XG4gICAgdmFyIGNvdW50ID0gY2x1c3Rlci5udW1Qb2ludHM7XG4gICAgdmFyIGFiYnJldiA9XG4gICAgICAgIGNvdW50ID49IDEwMDAwID8gTWF0aC5yb3VuZChjb3VudCAvIDEwMDApICsgJ2snIDpcbiAgICAgICAgY291bnQgPj0gMTAwMCA/IChNYXRoLnJvdW5kKGNvdW50IC8gMTAwKSAvIDEwKSArICdrJyA6IGNvdW50O1xuICAgIHJldHVybiBleHRlbmQoZXh0ZW5kKHt9LCBjbHVzdGVyLnByb3BlcnRpZXMpLCB7XG4gICAgICAgIGNsdXN0ZXI6IHRydWUsXG4gICAgICAgIGNsdXN0ZXJfaWQ6IGNsdXN0ZXIuaWQsXG4gICAgICAgIHBvaW50X2NvdW50OiBjb3VudCxcbiAgICAgICAgcG9pbnRfY291bnRfYWJicmV2aWF0ZWQ6IGFiYnJldlxuICAgIH0pO1xufVxuXG4vLyBsb25naXR1ZGUvbGF0aXR1ZGUgdG8gc3BoZXJpY2FsIG1lcmNhdG9yIGluIFswLi4xXSByYW5nZVxuZnVuY3Rpb24gbG5nWChsbmcpIHtcbiAgICByZXR1cm4gbG5nIC8gMzYwICsgMC41O1xufVxuZnVuY3Rpb24gbGF0WShsYXQpIHtcbiAgICB2YXIgc2luID0gTWF0aC5zaW4obGF0ICogTWF0aC5QSSAvIDE4MCksXG4gICAgICAgIHkgPSAoMC41IC0gMC4yNSAqIE1hdGgubG9nKCgxICsgc2luKSAvICgxIC0gc2luKSkgLyBNYXRoLlBJKTtcbiAgICByZXR1cm4geSA8IDAgPyAwIDogeSA+IDEgPyAxIDogeTtcbn1cblxuLy8gc3BoZXJpY2FsIG1lcmNhdG9yIHRvIGxvbmdpdHVkZS9sYXRpdHVkZVxuZnVuY3Rpb24geExuZyh4KSB7XG4gICAgcmV0dXJuICh4IC0gMC41KSAqIDM2MDtcbn1cbmZ1bmN0aW9uIHlMYXQoeSkge1xuICAgIHZhciB5MiA9ICgxODAgLSB5ICogMzYwKSAqIE1hdGguUEkgLyAxODA7XG4gICAgcmV0dXJuIDM2MCAqIE1hdGguYXRhbihNYXRoLmV4cCh5MikpIC8gTWF0aC5QSSAtIDkwO1xufVxuXG5mdW5jdGlvbiBleHRlbmQoZGVzdCwgc3JjKSB7XG4gICAgZm9yICh2YXIgaWQgaW4gc3JjKSBkZXN0W2lkXSA9IHNyY1tpZF07XG4gICAgcmV0dXJuIGRlc3Q7XG59XG5cbmZ1bmN0aW9uIGdldFgocCkge1xuICAgIHJldHVybiBwLng7XG59XG5mdW5jdGlvbiBnZXRZKHApIHtcbiAgICByZXR1cm4gcC55O1xufVxuIiwiXG4vLyBjYWxjdWxhdGUgc2ltcGxpZmljYXRpb24gZGF0YSB1c2luZyBvcHRpbWl6ZWQgRG91Z2xhcy1QZXVja2VyIGFsZ29yaXRobVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBzaW1wbGlmeShjb29yZHMsIGZpcnN0LCBsYXN0LCBzcVRvbGVyYW5jZSkge1xuICAgIHZhciBtYXhTcURpc3QgPSBzcVRvbGVyYW5jZTtcbiAgICB2YXIgbWlkID0gKGxhc3QgLSBmaXJzdCkgPj4gMTtcbiAgICB2YXIgbWluUG9zVG9NaWQgPSBsYXN0IC0gZmlyc3Q7XG4gICAgdmFyIGluZGV4O1xuXG4gICAgdmFyIGF4ID0gY29vcmRzW2ZpcnN0XTtcbiAgICB2YXIgYXkgPSBjb29yZHNbZmlyc3QgKyAxXTtcbiAgICB2YXIgYnggPSBjb29yZHNbbGFzdF07XG4gICAgdmFyIGJ5ID0gY29vcmRzW2xhc3QgKyAxXTtcblxuICAgIGZvciAodmFyIGkgPSBmaXJzdCArIDM7IGkgPCBsYXN0OyBpICs9IDMpIHtcbiAgICAgICAgdmFyIGQgPSBnZXRTcVNlZ0Rpc3QoY29vcmRzW2ldLCBjb29yZHNbaSArIDFdLCBheCwgYXksIGJ4LCBieSk7XG5cbiAgICAgICAgaWYgKGQgPiBtYXhTcURpc3QpIHtcbiAgICAgICAgICAgIGluZGV4ID0gaTtcbiAgICAgICAgICAgIG1heFNxRGlzdCA9IGQ7XG5cbiAgICAgICAgfSBlbHNlIGlmIChkID09PSBtYXhTcURpc3QpIHtcbiAgICAgICAgICAgIC8vIGEgd29ya2Fyb3VuZCB0byBlbnN1cmUgd2UgY2hvb3NlIGEgcGl2b3QgY2xvc2UgdG8gdGhlIG1pZGRsZSBvZiB0aGUgbGlzdCxcbiAgICAgICAgICAgIC8vIHJlZHVjaW5nIHJlY3Vyc2lvbiBkZXB0aCwgZm9yIGNlcnRhaW4gZGVnZW5lcmF0ZSBpbnB1dHNcbiAgICAgICAgICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9tYXBib3gvZ2VvanNvbi12dC9pc3N1ZXMvMTA0XG4gICAgICAgICAgICB2YXIgcG9zVG9NaWQgPSBNYXRoLmFicyhpIC0gbWlkKTtcbiAgICAgICAgICAgIGlmIChwb3NUb01pZCA8IG1pblBvc1RvTWlkKSB7XG4gICAgICAgICAgICAgICAgaW5kZXggPSBpO1xuICAgICAgICAgICAgICAgIG1pblBvc1RvTWlkID0gcG9zVG9NaWQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAobWF4U3FEaXN0ID4gc3FUb2xlcmFuY2UpIHtcbiAgICAgICAgaWYgKGluZGV4IC0gZmlyc3QgPiAzKSBzaW1wbGlmeShjb29yZHMsIGZpcnN0LCBpbmRleCwgc3FUb2xlcmFuY2UpO1xuICAgICAgICBjb29yZHNbaW5kZXggKyAyXSA9IG1heFNxRGlzdDtcbiAgICAgICAgaWYgKGxhc3QgLSBpbmRleCA+IDMpIHNpbXBsaWZ5KGNvb3JkcywgaW5kZXgsIGxhc3QsIHNxVG9sZXJhbmNlKTtcbiAgICB9XG59XG5cbi8vIHNxdWFyZSBkaXN0YW5jZSBmcm9tIGEgcG9pbnQgdG8gYSBzZWdtZW50XG5mdW5jdGlvbiBnZXRTcVNlZ0Rpc3QocHgsIHB5LCB4LCB5LCBieCwgYnkpIHtcblxuICAgIHZhciBkeCA9IGJ4IC0geDtcbiAgICB2YXIgZHkgPSBieSAtIHk7XG5cbiAgICBpZiAoZHggIT09IDAgfHwgZHkgIT09IDApIHtcblxuICAgICAgICB2YXIgdCA9ICgocHggLSB4KSAqIGR4ICsgKHB5IC0geSkgKiBkeSkgLyAoZHggKiBkeCArIGR5ICogZHkpO1xuXG4gICAgICAgIGlmICh0ID4gMSkge1xuICAgICAgICAgICAgeCA9IGJ4O1xuICAgICAgICAgICAgeSA9IGJ5O1xuXG4gICAgICAgIH0gZWxzZSBpZiAodCA+IDApIHtcbiAgICAgICAgICAgIHggKz0gZHggKiB0O1xuICAgICAgICAgICAgeSArPSBkeSAqIHQ7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBkeCA9IHB4IC0geDtcbiAgICBkeSA9IHB5IC0geTtcblxuICAgIHJldHVybiBkeCAqIGR4ICsgZHkgKiBkeTtcbn1cbiIsIlxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gY3JlYXRlRmVhdHVyZShpZCwgdHlwZSwgZ2VvbSwgdGFncykge1xuICAgIHZhciBmZWF0dXJlID0ge1xuICAgICAgICBpZDogdHlwZW9mIGlkID09PSAndW5kZWZpbmVkJyA/IG51bGwgOiBpZCxcbiAgICAgICAgdHlwZTogdHlwZSxcbiAgICAgICAgZ2VvbWV0cnk6IGdlb20sXG4gICAgICAgIHRhZ3M6IHRhZ3MsXG4gICAgICAgIG1pblg6IEluZmluaXR5LFxuICAgICAgICBtaW5ZOiBJbmZpbml0eSxcbiAgICAgICAgbWF4WDogLUluZmluaXR5LFxuICAgICAgICBtYXhZOiAtSW5maW5pdHlcbiAgICB9O1xuICAgIGNhbGNCQm94KGZlYXR1cmUpO1xuICAgIHJldHVybiBmZWF0dXJlO1xufVxuXG5mdW5jdGlvbiBjYWxjQkJveChmZWF0dXJlKSB7XG4gICAgdmFyIGdlb20gPSBmZWF0dXJlLmdlb21ldHJ5O1xuICAgIHZhciB0eXBlID0gZmVhdHVyZS50eXBlO1xuXG4gICAgaWYgKHR5cGUgPT09ICdQb2ludCcgfHwgdHlwZSA9PT0gJ011bHRpUG9pbnQnIHx8IHR5cGUgPT09ICdMaW5lU3RyaW5nJykge1xuICAgICAgICBjYWxjTGluZUJCb3goZmVhdHVyZSwgZ2VvbSk7XG5cbiAgICB9IGVsc2UgaWYgKHR5cGUgPT09ICdQb2x5Z29uJyB8fCB0eXBlID09PSAnTXVsdGlMaW5lU3RyaW5nJykge1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGdlb20ubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGNhbGNMaW5lQkJveChmZWF0dXJlLCBnZW9tW2ldKTtcbiAgICAgICAgfVxuXG4gICAgfSBlbHNlIGlmICh0eXBlID09PSAnTXVsdGlQb2x5Z29uJykge1xuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgZ2VvbS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBnZW9tW2ldLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICAgICAgY2FsY0xpbmVCQm94KGZlYXR1cmUsIGdlb21baV1bal0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufVxuXG5mdW5jdGlvbiBjYWxjTGluZUJCb3goZmVhdHVyZSwgZ2VvbSkge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZ2VvbS5sZW5ndGg7IGkgKz0gMykge1xuICAgICAgICBmZWF0dXJlLm1pblggPSBNYXRoLm1pbihmZWF0dXJlLm1pblgsIGdlb21baV0pO1xuICAgICAgICBmZWF0dXJlLm1pblkgPSBNYXRoLm1pbihmZWF0dXJlLm1pblksIGdlb21baSArIDFdKTtcbiAgICAgICAgZmVhdHVyZS5tYXhYID0gTWF0aC5tYXgoZmVhdHVyZS5tYXhYLCBnZW9tW2ldKTtcbiAgICAgICAgZmVhdHVyZS5tYXhZID0gTWF0aC5tYXgoZmVhdHVyZS5tYXhZLCBnZW9tW2kgKyAxXSk7XG4gICAgfVxufVxuIiwiXG5pbXBvcnQgc2ltcGxpZnkgZnJvbSAnLi9zaW1wbGlmeSc7XG5pbXBvcnQgY3JlYXRlRmVhdHVyZSBmcm9tICcuL2ZlYXR1cmUnO1xuXG4vLyBjb252ZXJ0cyBHZW9KU09OIGZlYXR1cmUgaW50byBhbiBpbnRlcm1lZGlhdGUgcHJvamVjdGVkIEpTT04gdmVjdG9yIGZvcm1hdCB3aXRoIHNpbXBsaWZpY2F0aW9uIGRhdGFcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gY29udmVydChkYXRhLCBvcHRpb25zKSB7XG4gICAgdmFyIGZlYXR1cmVzID0gW107XG4gICAgaWYgKGRhdGEudHlwZSA9PT0gJ0ZlYXR1cmVDb2xsZWN0aW9uJykge1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGRhdGEuZmVhdHVyZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGNvbnZlcnRGZWF0dXJlKGZlYXR1cmVzLCBkYXRhLmZlYXR1cmVzW2ldLCBvcHRpb25zLCBpKTtcbiAgICAgICAgfVxuXG4gICAgfSBlbHNlIGlmIChkYXRhLnR5cGUgPT09ICdGZWF0dXJlJykge1xuICAgICAgICBjb252ZXJ0RmVhdHVyZShmZWF0dXJlcywgZGF0YSwgb3B0aW9ucyk7XG5cbiAgICB9IGVsc2Uge1xuICAgICAgICAvLyBzaW5nbGUgZ2VvbWV0cnkgb3IgYSBnZW9tZXRyeSBjb2xsZWN0aW9uXG4gICAgICAgIGNvbnZlcnRGZWF0dXJlKGZlYXR1cmVzLCB7Z2VvbWV0cnk6IGRhdGF9LCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICByZXR1cm4gZmVhdHVyZXM7XG59XG5cbmZ1bmN0aW9uIGNvbnZlcnRGZWF0dXJlKGZlYXR1cmVzLCBnZW9qc29uLCBvcHRpb25zLCBpbmRleCkge1xuICAgIGlmICghZ2VvanNvbi5nZW9tZXRyeSkgcmV0dXJuO1xuXG4gICAgdmFyIGNvb3JkcyA9IGdlb2pzb24uZ2VvbWV0cnkuY29vcmRpbmF0ZXM7XG4gICAgdmFyIHR5cGUgPSBnZW9qc29uLmdlb21ldHJ5LnR5cGU7XG4gICAgdmFyIHRvbGVyYW5jZSA9IE1hdGgucG93KG9wdGlvbnMudG9sZXJhbmNlIC8gKCgxIDw8IG9wdGlvbnMubWF4Wm9vbSkgKiBvcHRpb25zLmV4dGVudCksIDIpO1xuICAgIHZhciBnZW9tZXRyeSA9IFtdO1xuICAgIHZhciBpZCA9IGdlb2pzb24uaWQ7XG4gICAgaWYgKG9wdGlvbnMucHJvbW90ZUlkKSB7XG4gICAgICAgIGlkID0gZ2VvanNvbi5wcm9wZXJ0aWVzW29wdGlvbnMucHJvbW90ZUlkXTtcbiAgICB9IGVsc2UgaWYgKG9wdGlvbnMuZ2VuZXJhdGVJZCkge1xuICAgICAgICBpZCA9IGluZGV4IHx8IDA7XG4gICAgfVxuICAgIGlmICh0eXBlID09PSAnUG9pbnQnKSB7XG4gICAgICAgIGNvbnZlcnRQb2ludChjb29yZHMsIGdlb21ldHJ5KTtcblxuICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gJ011bHRpUG9pbnQnKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY29vcmRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBjb252ZXJ0UG9pbnQoY29vcmRzW2ldLCBnZW9tZXRyeSk7XG4gICAgICAgIH1cblxuICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gJ0xpbmVTdHJpbmcnKSB7XG4gICAgICAgIGNvbnZlcnRMaW5lKGNvb3JkcywgZ2VvbWV0cnksIHRvbGVyYW5jZSwgZmFsc2UpO1xuXG4gICAgfSBlbHNlIGlmICh0eXBlID09PSAnTXVsdGlMaW5lU3RyaW5nJykge1xuICAgICAgICBpZiAob3B0aW9ucy5saW5lTWV0cmljcykge1xuICAgICAgICAgICAgLy8gZXhwbG9kZSBpbnRvIGxpbmVzdHJpbmdzIHRvIGJlIGFibGUgdG8gdHJhY2sgbWV0cmljc1xuICAgICAgICAgICAgZm9yIChpID0gMDsgaSA8IGNvb3Jkcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIGdlb21ldHJ5ID0gW107XG4gICAgICAgICAgICAgICAgY29udmVydExpbmUoY29vcmRzW2ldLCBnZW9tZXRyeSwgdG9sZXJhbmNlLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgZmVhdHVyZXMucHVzaChjcmVhdGVGZWF0dXJlKGlkLCAnTGluZVN0cmluZycsIGdlb21ldHJ5LCBnZW9qc29uLnByb3BlcnRpZXMpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnZlcnRMaW5lcyhjb29yZHMsIGdlb21ldHJ5LCB0b2xlcmFuY2UsIGZhbHNlKTtcbiAgICAgICAgfVxuXG4gICAgfSBlbHNlIGlmICh0eXBlID09PSAnUG9seWdvbicpIHtcbiAgICAgICAgY29udmVydExpbmVzKGNvb3JkcywgZ2VvbWV0cnksIHRvbGVyYW5jZSwgdHJ1ZSk7XG5cbiAgICB9IGVsc2UgaWYgKHR5cGUgPT09ICdNdWx0aVBvbHlnb24nKSB7XG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBjb29yZHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBwb2x5Z29uID0gW107XG4gICAgICAgICAgICBjb252ZXJ0TGluZXMoY29vcmRzW2ldLCBwb2x5Z29uLCB0b2xlcmFuY2UsIHRydWUpO1xuICAgICAgICAgICAgZ2VvbWV0cnkucHVzaChwb2x5Z29uKTtcbiAgICAgICAgfVxuICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gJ0dlb21ldHJ5Q29sbGVjdGlvbicpIHtcbiAgICAgICAgZm9yIChpID0gMDsgaSA8IGdlb2pzb24uZ2VvbWV0cnkuZ2VvbWV0cmllcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgY29udmVydEZlYXR1cmUoZmVhdHVyZXMsIHtcbiAgICAgICAgICAgICAgICBpZDogaWQsXG4gICAgICAgICAgICAgICAgZ2VvbWV0cnk6IGdlb2pzb24uZ2VvbWV0cnkuZ2VvbWV0cmllc1tpXSxcbiAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiBnZW9qc29uLnByb3BlcnRpZXNcbiAgICAgICAgICAgIH0sIG9wdGlvbnMsIGluZGV4KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm47XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnB1dCBkYXRhIGlzIG5vdCBhIHZhbGlkIEdlb0pTT04gb2JqZWN0LicpO1xuICAgIH1cblxuICAgIGZlYXR1cmVzLnB1c2goY3JlYXRlRmVhdHVyZShpZCwgdHlwZSwgZ2VvbWV0cnksIGdlb2pzb24ucHJvcGVydGllcykpO1xufVxuXG5mdW5jdGlvbiBjb252ZXJ0UG9pbnQoY29vcmRzLCBvdXQpIHtcbiAgICBvdXQucHVzaChwcm9qZWN0WChjb29yZHNbMF0pKTtcbiAgICBvdXQucHVzaChwcm9qZWN0WShjb29yZHNbMV0pKTtcbiAgICBvdXQucHVzaCgwKTtcbn1cblxuZnVuY3Rpb24gY29udmVydExpbmUocmluZywgb3V0LCB0b2xlcmFuY2UsIGlzUG9seWdvbikge1xuICAgIHZhciB4MCwgeTA7XG4gICAgdmFyIHNpemUgPSAwO1xuXG4gICAgZm9yICh2YXIgaiA9IDA7IGogPCByaW5nLmxlbmd0aDsgaisrKSB7XG4gICAgICAgIHZhciB4ID0gcHJvamVjdFgocmluZ1tqXVswXSk7XG4gICAgICAgIHZhciB5ID0gcHJvamVjdFkocmluZ1tqXVsxXSk7XG5cbiAgICAgICAgb3V0LnB1c2goeCk7XG4gICAgICAgIG91dC5wdXNoKHkpO1xuICAgICAgICBvdXQucHVzaCgwKTtcblxuICAgICAgICBpZiAoaiA+IDApIHtcbiAgICAgICAgICAgIGlmIChpc1BvbHlnb24pIHtcbiAgICAgICAgICAgICAgICBzaXplICs9ICh4MCAqIHkgLSB4ICogeTApIC8gMjsgLy8gYXJlYVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBzaXplICs9IE1hdGguc3FydChNYXRoLnBvdyh4IC0geDAsIDIpICsgTWF0aC5wb3coeSAtIHkwLCAyKSk7IC8vIGxlbmd0aFxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHgwID0geDtcbiAgICAgICAgeTAgPSB5O1xuICAgIH1cblxuICAgIHZhciBsYXN0ID0gb3V0Lmxlbmd0aCAtIDM7XG4gICAgb3V0WzJdID0gMTtcbiAgICBzaW1wbGlmeShvdXQsIDAsIGxhc3QsIHRvbGVyYW5jZSk7XG4gICAgb3V0W2xhc3QgKyAyXSA9IDE7XG5cbiAgICBvdXQuc2l6ZSA9IE1hdGguYWJzKHNpemUpO1xuICAgIG91dC5zdGFydCA9IDA7XG4gICAgb3V0LmVuZCA9IG91dC5zaXplO1xufVxuXG5mdW5jdGlvbiBjb252ZXJ0TGluZXMocmluZ3MsIG91dCwgdG9sZXJhbmNlLCBpc1BvbHlnb24pIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHJpbmdzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBnZW9tID0gW107XG4gICAgICAgIGNvbnZlcnRMaW5lKHJpbmdzW2ldLCBnZW9tLCB0b2xlcmFuY2UsIGlzUG9seWdvbik7XG4gICAgICAgIG91dC5wdXNoKGdlb20pO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gcHJvamVjdFgoeCkge1xuICAgIHJldHVybiB4IC8gMzYwICsgMC41O1xufVxuXG5mdW5jdGlvbiBwcm9qZWN0WSh5KSB7XG4gICAgdmFyIHNpbiA9IE1hdGguc2luKHkgKiBNYXRoLlBJIC8gMTgwKTtcbiAgICB2YXIgeTIgPSAwLjUgLSAwLjI1ICogTWF0aC5sb2coKDEgKyBzaW4pIC8gKDEgLSBzaW4pKSAvIE1hdGguUEk7XG4gICAgcmV0dXJuIHkyIDwgMCA/IDAgOiB5MiA+IDEgPyAxIDogeTI7XG59XG4iLCJcbmltcG9ydCBjcmVhdGVGZWF0dXJlIGZyb20gJy4vZmVhdHVyZSc7XG5cbi8qIGNsaXAgZmVhdHVyZXMgYmV0d2VlbiB0d28gYXhpcy1wYXJhbGxlbCBsaW5lczpcbiAqICAgICB8ICAgICAgICB8XG4gKiAgX19ffF9fXyAgICAgfCAgICAgL1xuICogLyAgIHwgICBcXF9fX198X19fXy9cbiAqICAgICB8ICAgICAgICB8XG4gKi9cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gY2xpcChmZWF0dXJlcywgc2NhbGUsIGsxLCBrMiwgYXhpcywgbWluQWxsLCBtYXhBbGwsIG9wdGlvbnMpIHtcblxuICAgIGsxIC89IHNjYWxlO1xuICAgIGsyIC89IHNjYWxlO1xuXG4gICAgaWYgKG1pbkFsbCA+PSBrMSAmJiBtYXhBbGwgPCBrMikgcmV0dXJuIGZlYXR1cmVzOyAvLyB0cml2aWFsIGFjY2VwdFxuICAgIGVsc2UgaWYgKG1heEFsbCA8IGsxIHx8IG1pbkFsbCA+PSBrMikgcmV0dXJuIG51bGw7IC8vIHRyaXZpYWwgcmVqZWN0XG5cbiAgICB2YXIgY2xpcHBlZCA9IFtdO1xuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBmZWF0dXJlcy5sZW5ndGg7IGkrKykge1xuXG4gICAgICAgIHZhciBmZWF0dXJlID0gZmVhdHVyZXNbaV07XG4gICAgICAgIHZhciBnZW9tZXRyeSA9IGZlYXR1cmUuZ2VvbWV0cnk7XG4gICAgICAgIHZhciB0eXBlID0gZmVhdHVyZS50eXBlO1xuXG4gICAgICAgIHZhciBtaW4gPSBheGlzID09PSAwID8gZmVhdHVyZS5taW5YIDogZmVhdHVyZS5taW5ZO1xuICAgICAgICB2YXIgbWF4ID0gYXhpcyA9PT0gMCA/IGZlYXR1cmUubWF4WCA6IGZlYXR1cmUubWF4WTtcblxuICAgICAgICBpZiAobWluID49IGsxICYmIG1heCA8IGsyKSB7IC8vIHRyaXZpYWwgYWNjZXB0XG4gICAgICAgICAgICBjbGlwcGVkLnB1c2goZmVhdHVyZSk7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfSBlbHNlIGlmIChtYXggPCBrMSB8fCBtaW4gPj0gazIpIHsgLy8gdHJpdmlhbCByZWplY3RcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIG5ld0dlb21ldHJ5ID0gW107XG5cbiAgICAgICAgaWYgKHR5cGUgPT09ICdQb2ludCcgfHwgdHlwZSA9PT0gJ011bHRpUG9pbnQnKSB7XG4gICAgICAgICAgICBjbGlwUG9pbnRzKGdlb21ldHJ5LCBuZXdHZW9tZXRyeSwgazEsIGsyLCBheGlzKTtcblxuICAgICAgICB9IGVsc2UgaWYgKHR5cGUgPT09ICdMaW5lU3RyaW5nJykge1xuICAgICAgICAgICAgY2xpcExpbmUoZ2VvbWV0cnksIG5ld0dlb21ldHJ5LCBrMSwgazIsIGF4aXMsIGZhbHNlLCBvcHRpb25zLmxpbmVNZXRyaWNzKTtcblxuICAgICAgICB9IGVsc2UgaWYgKHR5cGUgPT09ICdNdWx0aUxpbmVTdHJpbmcnKSB7XG4gICAgICAgICAgICBjbGlwTGluZXMoZ2VvbWV0cnksIG5ld0dlb21ldHJ5LCBrMSwgazIsIGF4aXMsIGZhbHNlKTtcblxuICAgICAgICB9IGVsc2UgaWYgKHR5cGUgPT09ICdQb2x5Z29uJykge1xuICAgICAgICAgICAgY2xpcExpbmVzKGdlb21ldHJ5LCBuZXdHZW9tZXRyeSwgazEsIGsyLCBheGlzLCB0cnVlKTtcblxuICAgICAgICB9IGVsc2UgaWYgKHR5cGUgPT09ICdNdWx0aVBvbHlnb24nKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBqID0gMDsgaiA8IGdlb21ldHJ5Lmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICAgICAgdmFyIHBvbHlnb24gPSBbXTtcbiAgICAgICAgICAgICAgICBjbGlwTGluZXMoZ2VvbWV0cnlbal0sIHBvbHlnb24sIGsxLCBrMiwgYXhpcywgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgaWYgKHBvbHlnb24ubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIG5ld0dlb21ldHJ5LnB1c2gocG9seWdvbik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG5ld0dlb21ldHJ5Lmxlbmd0aCkge1xuICAgICAgICAgICAgaWYgKG9wdGlvbnMubGluZU1ldHJpY3MgJiYgdHlwZSA9PT0gJ0xpbmVTdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgZm9yIChqID0gMDsgaiA8IG5ld0dlb21ldHJ5Lmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICAgICAgICAgIGNsaXBwZWQucHVzaChjcmVhdGVGZWF0dXJlKGZlYXR1cmUuaWQsIHR5cGUsIG5ld0dlb21ldHJ5W2pdLCBmZWF0dXJlLnRhZ3MpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICh0eXBlID09PSAnTGluZVN0cmluZycgfHwgdHlwZSA9PT0gJ011bHRpTGluZVN0cmluZycpIHtcbiAgICAgICAgICAgICAgICBpZiAobmV3R2VvbWV0cnkubGVuZ3RoID09PSAxKSB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGUgPSAnTGluZVN0cmluZyc7XG4gICAgICAgICAgICAgICAgICAgIG5ld0dlb21ldHJ5ID0gbmV3R2VvbWV0cnlbMF07XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZSA9ICdNdWx0aUxpbmVTdHJpbmcnO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0eXBlID09PSAnUG9pbnQnIHx8IHR5cGUgPT09ICdNdWx0aVBvaW50Jykge1xuICAgICAgICAgICAgICAgIHR5cGUgPSBuZXdHZW9tZXRyeS5sZW5ndGggPT09IDMgPyAnUG9pbnQnIDogJ011bHRpUG9pbnQnO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjbGlwcGVkLnB1c2goY3JlYXRlRmVhdHVyZShmZWF0dXJlLmlkLCB0eXBlLCBuZXdHZW9tZXRyeSwgZmVhdHVyZS50YWdzKSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gY2xpcHBlZC5sZW5ndGggPyBjbGlwcGVkIDogbnVsbDtcbn1cblxuZnVuY3Rpb24gY2xpcFBvaW50cyhnZW9tLCBuZXdHZW9tLCBrMSwgazIsIGF4aXMpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGdlb20ubGVuZ3RoOyBpICs9IDMpIHtcbiAgICAgICAgdmFyIGEgPSBnZW9tW2kgKyBheGlzXTtcblxuICAgICAgICBpZiAoYSA+PSBrMSAmJiBhIDw9IGsyKSB7XG4gICAgICAgICAgICBuZXdHZW9tLnB1c2goZ2VvbVtpXSk7XG4gICAgICAgICAgICBuZXdHZW9tLnB1c2goZ2VvbVtpICsgMV0pO1xuICAgICAgICAgICAgbmV3R2VvbS5wdXNoKGdlb21baSArIDJdKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuZnVuY3Rpb24gY2xpcExpbmUoZ2VvbSwgbmV3R2VvbSwgazEsIGsyLCBheGlzLCBpc1BvbHlnb24sIHRyYWNrTWV0cmljcykge1xuXG4gICAgdmFyIHNsaWNlID0gbmV3U2xpY2UoZ2VvbSk7XG4gICAgdmFyIGludGVyc2VjdCA9IGF4aXMgPT09IDAgPyBpbnRlcnNlY3RYIDogaW50ZXJzZWN0WTtcbiAgICB2YXIgbGVuID0gZ2VvbS5zdGFydDtcbiAgICB2YXIgc2VnTGVuLCB0O1xuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBnZW9tLmxlbmd0aCAtIDM7IGkgKz0gMykge1xuICAgICAgICB2YXIgYXggPSBnZW9tW2ldO1xuICAgICAgICB2YXIgYXkgPSBnZW9tW2kgKyAxXTtcbiAgICAgICAgdmFyIGF6ID0gZ2VvbVtpICsgMl07XG4gICAgICAgIHZhciBieCA9IGdlb21baSArIDNdO1xuICAgICAgICB2YXIgYnkgPSBnZW9tW2kgKyA0XTtcbiAgICAgICAgdmFyIGEgPSBheGlzID09PSAwID8gYXggOiBheTtcbiAgICAgICAgdmFyIGIgPSBheGlzID09PSAwID8gYnggOiBieTtcbiAgICAgICAgdmFyIGV4aXRlZCA9IGZhbHNlO1xuXG4gICAgICAgIGlmICh0cmFja01ldHJpY3MpIHNlZ0xlbiA9IE1hdGguc3FydChNYXRoLnBvdyhheCAtIGJ4LCAyKSArIE1hdGgucG93KGF5IC0gYnksIDIpKTtcblxuICAgICAgICBpZiAoYSA8IGsxKSB7XG4gICAgICAgICAgICAvLyAtLS18LS0+ICB8IChsaW5lIGVudGVycyB0aGUgY2xpcCByZWdpb24gZnJvbSB0aGUgbGVmdClcbiAgICAgICAgICAgIGlmIChiID49IGsxKSB7XG4gICAgICAgICAgICAgICAgdCA9IGludGVyc2VjdChzbGljZSwgYXgsIGF5LCBieCwgYnksIGsxKTtcbiAgICAgICAgICAgICAgICBpZiAodHJhY2tNZXRyaWNzKSBzbGljZS5zdGFydCA9IGxlbiArIHNlZ0xlbiAqIHQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoYSA+PSBrMikge1xuICAgICAgICAgICAgLy8gfCAgPC0tfC0tLSAobGluZSBlbnRlcnMgdGhlIGNsaXAgcmVnaW9uIGZyb20gdGhlIHJpZ2h0KVxuICAgICAgICAgICAgaWYgKGIgPCBrMikge1xuICAgICAgICAgICAgICAgIHQgPSBpbnRlcnNlY3Qoc2xpY2UsIGF4LCBheSwgYngsIGJ5LCBrMik7XG4gICAgICAgICAgICAgICAgaWYgKHRyYWNrTWV0cmljcykgc2xpY2Uuc3RhcnQgPSBsZW4gKyBzZWdMZW4gKiB0O1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYWRkUG9pbnQoc2xpY2UsIGF4LCBheSwgYXopO1xuICAgICAgICB9XG4gICAgICAgIGlmIChiIDwgazEgJiYgYSA+PSBrMSkge1xuICAgICAgICAgICAgLy8gPC0tfC0tLSAgfCBvciA8LS18LS0tLS18LS0tIChsaW5lIGV4aXRzIHRoZSBjbGlwIHJlZ2lvbiBvbiB0aGUgbGVmdClcbiAgICAgICAgICAgIHQgPSBpbnRlcnNlY3Qoc2xpY2UsIGF4LCBheSwgYngsIGJ5LCBrMSk7XG4gICAgICAgICAgICBleGl0ZWQgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIGlmIChiID4gazIgJiYgYSA8PSBrMikge1xuICAgICAgICAgICAgLy8gfCAgLS0tfC0tPiBvciAtLS18LS0tLS18LS0+IChsaW5lIGV4aXRzIHRoZSBjbGlwIHJlZ2lvbiBvbiB0aGUgcmlnaHQpXG4gICAgICAgICAgICB0ID0gaW50ZXJzZWN0KHNsaWNlLCBheCwgYXksIGJ4LCBieSwgazIpO1xuICAgICAgICAgICAgZXhpdGVkID0gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghaXNQb2x5Z29uICYmIGV4aXRlZCkge1xuICAgICAgICAgICAgaWYgKHRyYWNrTWV0cmljcykgc2xpY2UuZW5kID0gbGVuICsgc2VnTGVuICogdDtcbiAgICAgICAgICAgIG5ld0dlb20ucHVzaChzbGljZSk7XG4gICAgICAgICAgICBzbGljZSA9IG5ld1NsaWNlKGdlb20pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRyYWNrTWV0cmljcykgbGVuICs9IHNlZ0xlbjtcbiAgICB9XG5cbiAgICAvLyBhZGQgdGhlIGxhc3QgcG9pbnRcbiAgICB2YXIgbGFzdCA9IGdlb20ubGVuZ3RoIC0gMztcbiAgICBheCA9IGdlb21bbGFzdF07XG4gICAgYXkgPSBnZW9tW2xhc3QgKyAxXTtcbiAgICBheiA9IGdlb21bbGFzdCArIDJdO1xuICAgIGEgPSBheGlzID09PSAwID8gYXggOiBheTtcbiAgICBpZiAoYSA+PSBrMSAmJiBhIDw9IGsyKSBhZGRQb2ludChzbGljZSwgYXgsIGF5LCBheik7XG5cbiAgICAvLyBjbG9zZSB0aGUgcG9seWdvbiBpZiBpdHMgZW5kcG9pbnRzIGFyZSBub3QgdGhlIHNhbWUgYWZ0ZXIgY2xpcHBpbmdcbiAgICBsYXN0ID0gc2xpY2UubGVuZ3RoIC0gMztcbiAgICBpZiAoaXNQb2x5Z29uICYmIGxhc3QgPj0gMyAmJiAoc2xpY2VbbGFzdF0gIT09IHNsaWNlWzBdIHx8IHNsaWNlW2xhc3QgKyAxXSAhPT0gc2xpY2VbMV0pKSB7XG4gICAgICAgIGFkZFBvaW50KHNsaWNlLCBzbGljZVswXSwgc2xpY2VbMV0sIHNsaWNlWzJdKTtcbiAgICB9XG5cbiAgICAvLyBhZGQgdGhlIGZpbmFsIHNsaWNlXG4gICAgaWYgKHNsaWNlLmxlbmd0aCkge1xuICAgICAgICBuZXdHZW9tLnB1c2goc2xpY2UpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gbmV3U2xpY2UobGluZSkge1xuICAgIHZhciBzbGljZSA9IFtdO1xuICAgIHNsaWNlLnNpemUgPSBsaW5lLnNpemU7XG4gICAgc2xpY2Uuc3RhcnQgPSBsaW5lLnN0YXJ0O1xuICAgIHNsaWNlLmVuZCA9IGxpbmUuZW5kO1xuICAgIHJldHVybiBzbGljZTtcbn1cblxuZnVuY3Rpb24gY2xpcExpbmVzKGdlb20sIG5ld0dlb20sIGsxLCBrMiwgYXhpcywgaXNQb2x5Z29uKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBnZW9tLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGNsaXBMaW5lKGdlb21baV0sIG5ld0dlb20sIGsxLCBrMiwgYXhpcywgaXNQb2x5Z29uLCBmYWxzZSk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBhZGRQb2ludChvdXQsIHgsIHksIHopIHtcbiAgICBvdXQucHVzaCh4KTtcbiAgICBvdXQucHVzaCh5KTtcbiAgICBvdXQucHVzaCh6KTtcbn1cblxuZnVuY3Rpb24gaW50ZXJzZWN0WChvdXQsIGF4LCBheSwgYngsIGJ5LCB4KSB7XG4gICAgdmFyIHQgPSAoeCAtIGF4KSAvIChieCAtIGF4KTtcbiAgICBvdXQucHVzaCh4KTtcbiAgICBvdXQucHVzaChheSArIChieSAtIGF5KSAqIHQpO1xuICAgIG91dC5wdXNoKDEpO1xuICAgIHJldHVybiB0O1xufVxuXG5mdW5jdGlvbiBpbnRlcnNlY3RZKG91dCwgYXgsIGF5LCBieCwgYnksIHkpIHtcbiAgICB2YXIgdCA9ICh5IC0gYXkpIC8gKGJ5IC0gYXkpO1xuICAgIG91dC5wdXNoKGF4ICsgKGJ4IC0gYXgpICogdCk7XG4gICAgb3V0LnB1c2goeSk7XG4gICAgb3V0LnB1c2goMSk7XG4gICAgcmV0dXJuIHQ7XG59XG4iLCJcbmltcG9ydCBjbGlwIGZyb20gJy4vY2xpcCc7XG5pbXBvcnQgY3JlYXRlRmVhdHVyZSBmcm9tICcuL2ZlYXR1cmUnO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiB3cmFwKGZlYXR1cmVzLCBvcHRpb25zKSB7XG4gICAgdmFyIGJ1ZmZlciA9IG9wdGlvbnMuYnVmZmVyIC8gb3B0aW9ucy5leHRlbnQ7XG4gICAgdmFyIG1lcmdlZCA9IGZlYXR1cmVzO1xuICAgIHZhciBsZWZ0ICA9IGNsaXAoZmVhdHVyZXMsIDEsIC0xIC0gYnVmZmVyLCBidWZmZXIsICAgICAwLCAtMSwgMiwgb3B0aW9ucyk7IC8vIGxlZnQgd29ybGQgY29weVxuICAgIHZhciByaWdodCA9IGNsaXAoZmVhdHVyZXMsIDEsICAxIC0gYnVmZmVyLCAyICsgYnVmZmVyLCAwLCAtMSwgMiwgb3B0aW9ucyk7IC8vIHJpZ2h0IHdvcmxkIGNvcHlcblxuICAgIGlmIChsZWZ0IHx8IHJpZ2h0KSB7XG4gICAgICAgIG1lcmdlZCA9IGNsaXAoZmVhdHVyZXMsIDEsIC1idWZmZXIsIDEgKyBidWZmZXIsIDAsIC0xLCAyLCBvcHRpb25zKSB8fCBbXTsgLy8gY2VudGVyIHdvcmxkIGNvcHlcblxuICAgICAgICBpZiAobGVmdCkgbWVyZ2VkID0gc2hpZnRGZWF0dXJlQ29vcmRzKGxlZnQsIDEpLmNvbmNhdChtZXJnZWQpOyAvLyBtZXJnZSBsZWZ0IGludG8gY2VudGVyXG4gICAgICAgIGlmIChyaWdodCkgbWVyZ2VkID0gbWVyZ2VkLmNvbmNhdChzaGlmdEZlYXR1cmVDb29yZHMocmlnaHQsIC0xKSk7IC8vIG1lcmdlIHJpZ2h0IGludG8gY2VudGVyXG4gICAgfVxuXG4gICAgcmV0dXJuIG1lcmdlZDtcbn1cblxuZnVuY3Rpb24gc2hpZnRGZWF0dXJlQ29vcmRzKGZlYXR1cmVzLCBvZmZzZXQpIHtcbiAgICB2YXIgbmV3RmVhdHVyZXMgPSBbXTtcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZmVhdHVyZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIGZlYXR1cmUgPSBmZWF0dXJlc1tpXSxcbiAgICAgICAgICAgIHR5cGUgPSBmZWF0dXJlLnR5cGU7XG5cbiAgICAgICAgdmFyIG5ld0dlb21ldHJ5O1xuXG4gICAgICAgIGlmICh0eXBlID09PSAnUG9pbnQnIHx8IHR5cGUgPT09ICdNdWx0aVBvaW50JyB8fCB0eXBlID09PSAnTGluZVN0cmluZycpIHtcbiAgICAgICAgICAgIG5ld0dlb21ldHJ5ID0gc2hpZnRDb29yZHMoZmVhdHVyZS5nZW9tZXRyeSwgb2Zmc2V0KTtcblxuICAgICAgICB9IGVsc2UgaWYgKHR5cGUgPT09ICdNdWx0aUxpbmVTdHJpbmcnIHx8IHR5cGUgPT09ICdQb2x5Z29uJykge1xuICAgICAgICAgICAgbmV3R2VvbWV0cnkgPSBbXTtcbiAgICAgICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgZmVhdHVyZS5nZW9tZXRyeS5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgICAgIG5ld0dlb21ldHJ5LnB1c2goc2hpZnRDb29yZHMoZmVhdHVyZS5nZW9tZXRyeVtqXSwgb2Zmc2V0KSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gJ011bHRpUG9seWdvbicpIHtcbiAgICAgICAgICAgIG5ld0dlb21ldHJ5ID0gW107XG4gICAgICAgICAgICBmb3IgKGogPSAwOyBqIDwgZmVhdHVyZS5nZW9tZXRyeS5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgICAgIHZhciBuZXdQb2x5Z29uID0gW107XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgayA9IDA7IGsgPCBmZWF0dXJlLmdlb21ldHJ5W2pdLmxlbmd0aDsgaysrKSB7XG4gICAgICAgICAgICAgICAgICAgIG5ld1BvbHlnb24ucHVzaChzaGlmdENvb3JkcyhmZWF0dXJlLmdlb21ldHJ5W2pdW2tdLCBvZmZzZXQpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgbmV3R2VvbWV0cnkucHVzaChuZXdQb2x5Z29uKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIG5ld0ZlYXR1cmVzLnB1c2goY3JlYXRlRmVhdHVyZShmZWF0dXJlLmlkLCB0eXBlLCBuZXdHZW9tZXRyeSwgZmVhdHVyZS50YWdzKSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIG5ld0ZlYXR1cmVzO1xufVxuXG5mdW5jdGlvbiBzaGlmdENvb3Jkcyhwb2ludHMsIG9mZnNldCkge1xuICAgIHZhciBuZXdQb2ludHMgPSBbXTtcbiAgICBuZXdQb2ludHMuc2l6ZSA9IHBvaW50cy5zaXplO1xuXG4gICAgaWYgKHBvaW50cy5zdGFydCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIG5ld1BvaW50cy5zdGFydCA9IHBvaW50cy5zdGFydDtcbiAgICAgICAgbmV3UG9pbnRzLmVuZCA9IHBvaW50cy5lbmQ7XG4gICAgfVxuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwb2ludHMubGVuZ3RoOyBpICs9IDMpIHtcbiAgICAgICAgbmV3UG9pbnRzLnB1c2gocG9pbnRzW2ldICsgb2Zmc2V0LCBwb2ludHNbaSArIDFdLCBwb2ludHNbaSArIDJdKTtcbiAgICB9XG4gICAgcmV0dXJuIG5ld1BvaW50cztcbn1cbiIsIlxuLy8gVHJhbnNmb3JtcyB0aGUgY29vcmRpbmF0ZXMgb2YgZWFjaCBmZWF0dXJlIGluIHRoZSBnaXZlbiB0aWxlIGZyb21cbi8vIG1lcmNhdG9yLXByb2plY3RlZCBzcGFjZSBpbnRvIChleHRlbnQgeCBleHRlbnQpIHRpbGUgc3BhY2UuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiB0cmFuc2Zvcm1UaWxlKHRpbGUsIGV4dGVudCkge1xuICAgIGlmICh0aWxlLnRyYW5zZm9ybWVkKSByZXR1cm4gdGlsZTtcblxuICAgIHZhciB6MiA9IDEgPDwgdGlsZS56LFxuICAgICAgICB0eCA9IHRpbGUueCxcbiAgICAgICAgdHkgPSB0aWxlLnksXG4gICAgICAgIGksIGosIGs7XG5cbiAgICBmb3IgKGkgPSAwOyBpIDwgdGlsZS5mZWF0dXJlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgZmVhdHVyZSA9IHRpbGUuZmVhdHVyZXNbaV0sXG4gICAgICAgICAgICBnZW9tID0gZmVhdHVyZS5nZW9tZXRyeSxcbiAgICAgICAgICAgIHR5cGUgPSBmZWF0dXJlLnR5cGU7XG5cbiAgICAgICAgZmVhdHVyZS5nZW9tZXRyeSA9IFtdO1xuXG4gICAgICAgIGlmICh0eXBlID09PSAxKSB7XG4gICAgICAgICAgICBmb3IgKGogPSAwOyBqIDwgZ2VvbS5sZW5ndGg7IGogKz0gMikge1xuICAgICAgICAgICAgICAgIGZlYXR1cmUuZ2VvbWV0cnkucHVzaCh0cmFuc2Zvcm1Qb2ludChnZW9tW2pdLCBnZW9tW2ogKyAxXSwgZXh0ZW50LCB6MiwgdHgsIHR5KSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBmb3IgKGogPSAwOyBqIDwgZ2VvbS5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgICAgIHZhciByaW5nID0gW107XG4gICAgICAgICAgICAgICAgZm9yIChrID0gMDsgayA8IGdlb21bal0ubGVuZ3RoOyBrICs9IDIpIHtcbiAgICAgICAgICAgICAgICAgICAgcmluZy5wdXNoKHRyYW5zZm9ybVBvaW50KGdlb21bal1ba10sIGdlb21bal1bayArIDFdLCBleHRlbnQsIHoyLCB0eCwgdHkpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZmVhdHVyZS5nZW9tZXRyeS5wdXNoKHJpbmcpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgdGlsZS50cmFuc2Zvcm1lZCA9IHRydWU7XG5cbiAgICByZXR1cm4gdGlsZTtcbn1cblxuZnVuY3Rpb24gdHJhbnNmb3JtUG9pbnQoeCwgeSwgZXh0ZW50LCB6MiwgdHgsIHR5KSB7XG4gICAgcmV0dXJuIFtcbiAgICAgICAgTWF0aC5yb3VuZChleHRlbnQgKiAoeCAqIHoyIC0gdHgpKSxcbiAgICAgICAgTWF0aC5yb3VuZChleHRlbnQgKiAoeSAqIHoyIC0gdHkpKV07XG59XG4iLCJcbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGNyZWF0ZVRpbGUoZmVhdHVyZXMsIHosIHR4LCB0eSwgb3B0aW9ucykge1xuICAgIHZhciB0b2xlcmFuY2UgPSB6ID09PSBvcHRpb25zLm1heFpvb20gPyAwIDogb3B0aW9ucy50b2xlcmFuY2UgLyAoKDEgPDwgeikgKiBvcHRpb25zLmV4dGVudCk7XG4gICAgdmFyIHRpbGUgPSB7XG4gICAgICAgIGZlYXR1cmVzOiBbXSxcbiAgICAgICAgbnVtUG9pbnRzOiAwLFxuICAgICAgICBudW1TaW1wbGlmaWVkOiAwLFxuICAgICAgICBudW1GZWF0dXJlczogMCxcbiAgICAgICAgc291cmNlOiBudWxsLFxuICAgICAgICB4OiB0eCxcbiAgICAgICAgeTogdHksXG4gICAgICAgIHo6IHosXG4gICAgICAgIHRyYW5zZm9ybWVkOiBmYWxzZSxcbiAgICAgICAgbWluWDogMixcbiAgICAgICAgbWluWTogMSxcbiAgICAgICAgbWF4WDogLTEsXG4gICAgICAgIG1heFk6IDBcbiAgICB9O1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZmVhdHVyZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdGlsZS5udW1GZWF0dXJlcysrO1xuICAgICAgICBhZGRGZWF0dXJlKHRpbGUsIGZlYXR1cmVzW2ldLCB0b2xlcmFuY2UsIG9wdGlvbnMpO1xuXG4gICAgICAgIHZhciBtaW5YID0gZmVhdHVyZXNbaV0ubWluWDtcbiAgICAgICAgdmFyIG1pblkgPSBmZWF0dXJlc1tpXS5taW5ZO1xuICAgICAgICB2YXIgbWF4WCA9IGZlYXR1cmVzW2ldLm1heFg7XG4gICAgICAgIHZhciBtYXhZID0gZmVhdHVyZXNbaV0ubWF4WTtcblxuICAgICAgICBpZiAobWluWCA8IHRpbGUubWluWCkgdGlsZS5taW5YID0gbWluWDtcbiAgICAgICAgaWYgKG1pblkgPCB0aWxlLm1pblkpIHRpbGUubWluWSA9IG1pblk7XG4gICAgICAgIGlmIChtYXhYID4gdGlsZS5tYXhYKSB0aWxlLm1heFggPSBtYXhYO1xuICAgICAgICBpZiAobWF4WSA+IHRpbGUubWF4WSkgdGlsZS5tYXhZID0gbWF4WTtcbiAgICB9XG4gICAgcmV0dXJuIHRpbGU7XG59XG5cbmZ1bmN0aW9uIGFkZEZlYXR1cmUodGlsZSwgZmVhdHVyZSwgdG9sZXJhbmNlLCBvcHRpb25zKSB7XG5cbiAgICB2YXIgZ2VvbSA9IGZlYXR1cmUuZ2VvbWV0cnksXG4gICAgICAgIHR5cGUgPSBmZWF0dXJlLnR5cGUsXG4gICAgICAgIHNpbXBsaWZpZWQgPSBbXTtcblxuICAgIGlmICh0eXBlID09PSAnUG9pbnQnIHx8IHR5cGUgPT09ICdNdWx0aVBvaW50Jykge1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGdlb20ubGVuZ3RoOyBpICs9IDMpIHtcbiAgICAgICAgICAgIHNpbXBsaWZpZWQucHVzaChnZW9tW2ldKTtcbiAgICAgICAgICAgIHNpbXBsaWZpZWQucHVzaChnZW9tW2kgKyAxXSk7XG4gICAgICAgICAgICB0aWxlLm51bVBvaW50cysrO1xuICAgICAgICAgICAgdGlsZS5udW1TaW1wbGlmaWVkKys7XG4gICAgICAgIH1cblxuICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gJ0xpbmVTdHJpbmcnKSB7XG4gICAgICAgIGFkZExpbmUoc2ltcGxpZmllZCwgZ2VvbSwgdGlsZSwgdG9sZXJhbmNlLCBmYWxzZSwgZmFsc2UpO1xuXG4gICAgfSBlbHNlIGlmICh0eXBlID09PSAnTXVsdGlMaW5lU3RyaW5nJyB8fCB0eXBlID09PSAnUG9seWdvbicpIHtcbiAgICAgICAgZm9yIChpID0gMDsgaSA8IGdlb20ubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGFkZExpbmUoc2ltcGxpZmllZCwgZ2VvbVtpXSwgdGlsZSwgdG9sZXJhbmNlLCB0eXBlID09PSAnUG9seWdvbicsIGkgPT09IDApO1xuICAgICAgICB9XG5cbiAgICB9IGVsc2UgaWYgKHR5cGUgPT09ICdNdWx0aVBvbHlnb24nKSB7XG5cbiAgICAgICAgZm9yICh2YXIgayA9IDA7IGsgPCBnZW9tLmxlbmd0aDsgaysrKSB7XG4gICAgICAgICAgICB2YXIgcG9seWdvbiA9IGdlb21ba107XG4gICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwgcG9seWdvbi5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIGFkZExpbmUoc2ltcGxpZmllZCwgcG9seWdvbltpXSwgdGlsZSwgdG9sZXJhbmNlLCB0cnVlLCBpID09PSAwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGlmIChzaW1wbGlmaWVkLmxlbmd0aCkge1xuICAgICAgICB2YXIgdGFncyA9IGZlYXR1cmUudGFncyB8fCBudWxsO1xuICAgICAgICBpZiAodHlwZSA9PT0gJ0xpbmVTdHJpbmcnICYmIG9wdGlvbnMubGluZU1ldHJpY3MpIHtcbiAgICAgICAgICAgIHRhZ3MgPSB7fTtcbiAgICAgICAgICAgIGZvciAodmFyIGtleSBpbiBmZWF0dXJlLnRhZ3MpIHRhZ3Nba2V5XSA9IGZlYXR1cmUudGFnc1trZXldO1xuICAgICAgICAgICAgdGFnc1snbWFwYm94X2NsaXBfc3RhcnQnXSA9IGdlb20uc3RhcnQgLyBnZW9tLnNpemU7XG4gICAgICAgICAgICB0YWdzWydtYXBib3hfY2xpcF9lbmQnXSA9IGdlb20uZW5kIC8gZ2VvbS5zaXplO1xuICAgICAgICB9XG4gICAgICAgIHZhciB0aWxlRmVhdHVyZSA9IHtcbiAgICAgICAgICAgIGdlb21ldHJ5OiBzaW1wbGlmaWVkLFxuICAgICAgICAgICAgdHlwZTogdHlwZSA9PT0gJ1BvbHlnb24nIHx8IHR5cGUgPT09ICdNdWx0aVBvbHlnb24nID8gMyA6XG4gICAgICAgICAgICAgICAgdHlwZSA9PT0gJ0xpbmVTdHJpbmcnIHx8IHR5cGUgPT09ICdNdWx0aUxpbmVTdHJpbmcnID8gMiA6IDEsXG4gICAgICAgICAgICB0YWdzOiB0YWdzXG4gICAgICAgIH07XG4gICAgICAgIGlmIChmZWF0dXJlLmlkICE9PSBudWxsKSB7XG4gICAgICAgICAgICB0aWxlRmVhdHVyZS5pZCA9IGZlYXR1cmUuaWQ7XG4gICAgICAgIH1cbiAgICAgICAgdGlsZS5mZWF0dXJlcy5wdXNoKHRpbGVGZWF0dXJlKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGFkZExpbmUocmVzdWx0LCBnZW9tLCB0aWxlLCB0b2xlcmFuY2UsIGlzUG9seWdvbiwgaXNPdXRlcikge1xuICAgIHZhciBzcVRvbGVyYW5jZSA9IHRvbGVyYW5jZSAqIHRvbGVyYW5jZTtcblxuICAgIGlmICh0b2xlcmFuY2UgPiAwICYmIChnZW9tLnNpemUgPCAoaXNQb2x5Z29uID8gc3FUb2xlcmFuY2UgOiB0b2xlcmFuY2UpKSkge1xuICAgICAgICB0aWxlLm51bVBvaW50cyArPSBnZW9tLmxlbmd0aCAvIDM7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgcmluZyA9IFtdO1xuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBnZW9tLmxlbmd0aDsgaSArPSAzKSB7XG4gICAgICAgIGlmICh0b2xlcmFuY2UgPT09IDAgfHwgZ2VvbVtpICsgMl0gPiBzcVRvbGVyYW5jZSkge1xuICAgICAgICAgICAgdGlsZS5udW1TaW1wbGlmaWVkKys7XG4gICAgICAgICAgICByaW5nLnB1c2goZ2VvbVtpXSk7XG4gICAgICAgICAgICByaW5nLnB1c2goZ2VvbVtpICsgMV0pO1xuICAgICAgICB9XG4gICAgICAgIHRpbGUubnVtUG9pbnRzKys7XG4gICAgfVxuXG4gICAgaWYgKGlzUG9seWdvbikgcmV3aW5kKHJpbmcsIGlzT3V0ZXIpO1xuXG4gICAgcmVzdWx0LnB1c2gocmluZyk7XG59XG5cbmZ1bmN0aW9uIHJld2luZChyaW5nLCBjbG9ja3dpc2UpIHtcbiAgICB2YXIgYXJlYSA9IDA7XG4gICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IHJpbmcubGVuZ3RoLCBqID0gbGVuIC0gMjsgaSA8IGxlbjsgaiA9IGksIGkgKz0gMikge1xuICAgICAgICBhcmVhICs9IChyaW5nW2ldIC0gcmluZ1tqXSkgKiAocmluZ1tpICsgMV0gKyByaW5nW2ogKyAxXSk7XG4gICAgfVxuICAgIGlmIChhcmVhID4gMCA9PT0gY2xvY2t3aXNlKSB7XG4gICAgICAgIGZvciAoaSA9IDAsIGxlbiA9IHJpbmcubGVuZ3RoOyBpIDwgbGVuIC8gMjsgaSArPSAyKSB7XG4gICAgICAgICAgICB2YXIgeCA9IHJpbmdbaV07XG4gICAgICAgICAgICB2YXIgeSA9IHJpbmdbaSArIDFdO1xuICAgICAgICAgICAgcmluZ1tpXSA9IHJpbmdbbGVuIC0gMiAtIGldO1xuICAgICAgICAgICAgcmluZ1tpICsgMV0gPSByaW5nW2xlbiAtIDEgLSBpXTtcbiAgICAgICAgICAgIHJpbmdbbGVuIC0gMiAtIGldID0geDtcbiAgICAgICAgICAgIHJpbmdbbGVuIC0gMSAtIGldID0geTtcbiAgICAgICAgfVxuICAgIH1cbn1cbiIsIlxuaW1wb3J0IGNvbnZlcnQgZnJvbSAnLi9jb252ZXJ0JzsgICAgIC8vIEdlb0pTT04gY29udmVyc2lvbiBhbmQgcHJlcHJvY2Vzc2luZ1xuaW1wb3J0IGNsaXAgZnJvbSAnLi9jbGlwJzsgICAgICAgICAgIC8vIHN0cmlwZSBjbGlwcGluZyBhbGdvcml0aG1cbmltcG9ydCB3cmFwIGZyb20gJy4vd3JhcCc7ICAgICAgICAgICAvLyBkYXRlIGxpbmUgcHJvY2Vzc2luZ1xuaW1wb3J0IHRyYW5zZm9ybSBmcm9tICcuL3RyYW5zZm9ybSc7IC8vIGNvb3JkaW5hdGUgdHJhbnNmb3JtYXRpb25cbmltcG9ydCBjcmVhdGVUaWxlIGZyb20gJy4vdGlsZSc7ICAgICAvLyBmaW5hbCBzaW1wbGlmaWVkIHRpbGUgZ2VuZXJhdGlvblxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBnZW9qc29udnQoZGF0YSwgb3B0aW9ucykge1xuICAgIHJldHVybiBuZXcgR2VvSlNPTlZUKGRhdGEsIG9wdGlvbnMpO1xufVxuXG5mdW5jdGlvbiBHZW9KU09OVlQoZGF0YSwgb3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSB0aGlzLm9wdGlvbnMgPSBleHRlbmQoT2JqZWN0LmNyZWF0ZSh0aGlzLm9wdGlvbnMpLCBvcHRpb25zKTtcblxuICAgIHZhciBkZWJ1ZyA9IG9wdGlvbnMuZGVidWc7XG5cbiAgICBpZiAoZGVidWcpIGNvbnNvbGUudGltZSgncHJlcHJvY2VzcyBkYXRhJyk7XG5cbiAgICBpZiAob3B0aW9ucy5tYXhab29tIDwgMCB8fCBvcHRpb25zLm1heFpvb20gPiAyNCkgdGhyb3cgbmV3IEVycm9yKCdtYXhab29tIHNob3VsZCBiZSBpbiB0aGUgMC0yNCByYW5nZScpO1xuICAgIGlmIChvcHRpb25zLnByb21vdGVJZCAmJiBvcHRpb25zLmdlbmVyYXRlSWQpIHRocm93IG5ldyBFcnJvcigncHJvbW90ZUlkIGFuZCBnZW5lcmF0ZUlkIGNhbm5vdCBiZSB1c2VkIHRvZ2V0aGVyLicpO1xuXG4gICAgdmFyIGZlYXR1cmVzID0gY29udmVydChkYXRhLCBvcHRpb25zKTtcblxuICAgIHRoaXMudGlsZXMgPSB7fTtcbiAgICB0aGlzLnRpbGVDb29yZHMgPSBbXTtcblxuICAgIGlmIChkZWJ1Zykge1xuICAgICAgICBjb25zb2xlLnRpbWVFbmQoJ3ByZXByb2Nlc3MgZGF0YScpO1xuICAgICAgICBjb25zb2xlLmxvZygnaW5kZXg6IG1heFpvb206ICVkLCBtYXhQb2ludHM6ICVkJywgb3B0aW9ucy5pbmRleE1heFpvb20sIG9wdGlvbnMuaW5kZXhNYXhQb2ludHMpO1xuICAgICAgICBjb25zb2xlLnRpbWUoJ2dlbmVyYXRlIHRpbGVzJyk7XG4gICAgICAgIHRoaXMuc3RhdHMgPSB7fTtcbiAgICAgICAgdGhpcy50b3RhbCA9IDA7XG4gICAgfVxuXG4gICAgZmVhdHVyZXMgPSB3cmFwKGZlYXR1cmVzLCBvcHRpb25zKTtcblxuICAgIC8vIHN0YXJ0IHNsaWNpbmcgZnJvbSB0aGUgdG9wIHRpbGUgZG93blxuICAgIGlmIChmZWF0dXJlcy5sZW5ndGgpIHRoaXMuc3BsaXRUaWxlKGZlYXR1cmVzLCAwLCAwLCAwKTtcblxuICAgIGlmIChkZWJ1Zykge1xuICAgICAgICBpZiAoZmVhdHVyZXMubGVuZ3RoKSBjb25zb2xlLmxvZygnZmVhdHVyZXM6ICVkLCBwb2ludHM6ICVkJywgdGhpcy50aWxlc1swXS5udW1GZWF0dXJlcywgdGhpcy50aWxlc1swXS5udW1Qb2ludHMpO1xuICAgICAgICBjb25zb2xlLnRpbWVFbmQoJ2dlbmVyYXRlIHRpbGVzJyk7XG4gICAgICAgIGNvbnNvbGUubG9nKCd0aWxlcyBnZW5lcmF0ZWQ6JywgdGhpcy50b3RhbCwgSlNPTi5zdHJpbmdpZnkodGhpcy5zdGF0cykpO1xuICAgIH1cbn1cblxuR2VvSlNPTlZULnByb3RvdHlwZS5vcHRpb25zID0ge1xuICAgIG1heFpvb206IDE0LCAgICAgICAgICAgIC8vIG1heCB6b29tIHRvIHByZXNlcnZlIGRldGFpbCBvblxuICAgIGluZGV4TWF4Wm9vbTogNSwgICAgICAgIC8vIG1heCB6b29tIGluIHRoZSB0aWxlIGluZGV4XG4gICAgaW5kZXhNYXhQb2ludHM6IDEwMDAwMCwgLy8gbWF4IG51bWJlciBvZiBwb2ludHMgcGVyIHRpbGUgaW4gdGhlIHRpbGUgaW5kZXhcbiAgICB0b2xlcmFuY2U6IDMsICAgICAgICAgICAvLyBzaW1wbGlmaWNhdGlvbiB0b2xlcmFuY2UgKGhpZ2hlciBtZWFucyBzaW1wbGVyKVxuICAgIGV4dGVudDogNDA5NiwgICAgICAgICAgIC8vIHRpbGUgZXh0ZW50XG4gICAgYnVmZmVyOiA2NCwgICAgICAgICAgICAgLy8gdGlsZSBidWZmZXIgb24gZWFjaCBzaWRlXG4gICAgbGluZU1ldHJpY3M6IGZhbHNlLCAgICAgLy8gd2hldGhlciB0byBjYWxjdWxhdGUgbGluZSBtZXRyaWNzXG4gICAgcHJvbW90ZUlkOiBudWxsLCAgICAgICAgLy8gbmFtZSBvZiBhIGZlYXR1cmUgcHJvcGVydHkgdG8gYmUgcHJvbW90ZWQgdG8gZmVhdHVyZS5pZFxuICAgIGdlbmVyYXRlSWQ6IGZhbHNlLCAgICAgIC8vIHdoZXRoZXIgdG8gZ2VuZXJhdGUgZmVhdHVyZSBpZHMuIENhbm5vdCBiZSB1c2VkIHdpdGggcHJvbW90ZUlkXG4gICAgZGVidWc6IDAgICAgICAgICAgICAgICAgLy8gbG9nZ2luZyBsZXZlbCAoMCwgMSBvciAyKVxufTtcblxuR2VvSlNPTlZULnByb3RvdHlwZS5zcGxpdFRpbGUgPSBmdW5jdGlvbiAoZmVhdHVyZXMsIHosIHgsIHksIGN6LCBjeCwgY3kpIHtcblxuICAgIHZhciBzdGFjayA9IFtmZWF0dXJlcywgeiwgeCwgeV0sXG4gICAgICAgIG9wdGlvbnMgPSB0aGlzLm9wdGlvbnMsXG4gICAgICAgIGRlYnVnID0gb3B0aW9ucy5kZWJ1ZztcblxuICAgIC8vIGF2b2lkIHJlY3Vyc2lvbiBieSB1c2luZyBhIHByb2Nlc3NpbmcgcXVldWVcbiAgICB3aGlsZSAoc3RhY2subGVuZ3RoKSB7XG4gICAgICAgIHkgPSBzdGFjay5wb3AoKTtcbiAgICAgICAgeCA9IHN0YWNrLnBvcCgpO1xuICAgICAgICB6ID0gc3RhY2sucG9wKCk7XG4gICAgICAgIGZlYXR1cmVzID0gc3RhY2sucG9wKCk7XG5cbiAgICAgICAgdmFyIHoyID0gMSA8PCB6LFxuICAgICAgICAgICAgaWQgPSB0b0lEKHosIHgsIHkpLFxuICAgICAgICAgICAgdGlsZSA9IHRoaXMudGlsZXNbaWRdO1xuXG4gICAgICAgIGlmICghdGlsZSkge1xuICAgICAgICAgICAgaWYgKGRlYnVnID4gMSkgY29uc29sZS50aW1lKCdjcmVhdGlvbicpO1xuXG4gICAgICAgICAgICB0aWxlID0gdGhpcy50aWxlc1tpZF0gPSBjcmVhdGVUaWxlKGZlYXR1cmVzLCB6LCB4LCB5LCBvcHRpb25zKTtcbiAgICAgICAgICAgIHRoaXMudGlsZUNvb3Jkcy5wdXNoKHt6OiB6LCB4OiB4LCB5OiB5fSk7XG5cbiAgICAgICAgICAgIGlmIChkZWJ1Zykge1xuICAgICAgICAgICAgICAgIGlmIChkZWJ1ZyA+IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3RpbGUgeiVkLSVkLSVkIChmZWF0dXJlczogJWQsIHBvaW50czogJWQsIHNpbXBsaWZpZWQ6ICVkKScsXG4gICAgICAgICAgICAgICAgICAgICAgICB6LCB4LCB5LCB0aWxlLm51bUZlYXR1cmVzLCB0aWxlLm51bVBvaW50cywgdGlsZS5udW1TaW1wbGlmaWVkKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS50aW1lRW5kKCdjcmVhdGlvbicpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2YXIga2V5ID0gJ3onICsgejtcbiAgICAgICAgICAgICAgICB0aGlzLnN0YXRzW2tleV0gPSAodGhpcy5zdGF0c1trZXldIHx8IDApICsgMTtcbiAgICAgICAgICAgICAgICB0aGlzLnRvdGFsKys7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBzYXZlIHJlZmVyZW5jZSB0byBvcmlnaW5hbCBnZW9tZXRyeSBpbiB0aWxlIHNvIHRoYXQgd2UgY2FuIGRyaWxsIGRvd24gbGF0ZXIgaWYgd2Ugc3RvcCBub3dcbiAgICAgICAgdGlsZS5zb3VyY2UgPSBmZWF0dXJlcztcblxuICAgICAgICAvLyBpZiBpdCdzIHRoZSBmaXJzdC1wYXNzIHRpbGluZ1xuICAgICAgICBpZiAoIWN6KSB7XG4gICAgICAgICAgICAvLyBzdG9wIHRpbGluZyBpZiB3ZSByZWFjaGVkIG1heCB6b29tLCBvciBpZiB0aGUgdGlsZSBpcyB0b28gc2ltcGxlXG4gICAgICAgICAgICBpZiAoeiA9PT0gb3B0aW9ucy5pbmRleE1heFpvb20gfHwgdGlsZS5udW1Qb2ludHMgPD0gb3B0aW9ucy5pbmRleE1heFBvaW50cykgY29udGludWU7XG5cbiAgICAgICAgLy8gaWYgYSBkcmlsbGRvd24gdG8gYSBzcGVjaWZpYyB0aWxlXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBzdG9wIHRpbGluZyBpZiB3ZSByZWFjaGVkIGJhc2Ugem9vbSBvciBvdXIgdGFyZ2V0IHRpbGUgem9vbVxuICAgICAgICAgICAgaWYgKHogPT09IG9wdGlvbnMubWF4Wm9vbSB8fCB6ID09PSBjeikgY29udGludWU7XG5cbiAgICAgICAgICAgIC8vIHN0b3AgdGlsaW5nIGlmIGl0J3Mgbm90IGFuIGFuY2VzdG9yIG9mIHRoZSB0YXJnZXQgdGlsZVxuICAgICAgICAgICAgdmFyIG0gPSAxIDw8IChjeiAtIHopO1xuICAgICAgICAgICAgaWYgKHggIT09IE1hdGguZmxvb3IoY3ggLyBtKSB8fCB5ICE9PSBNYXRoLmZsb29yKGN5IC8gbSkpIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gaWYgd2Ugc2xpY2UgZnVydGhlciBkb3duLCBubyBuZWVkIHRvIGtlZXAgc291cmNlIGdlb21ldHJ5XG4gICAgICAgIHRpbGUuc291cmNlID0gbnVsbDtcblxuICAgICAgICBpZiAoZmVhdHVyZXMubGVuZ3RoID09PSAwKSBjb250aW51ZTtcblxuICAgICAgICBpZiAoZGVidWcgPiAxKSBjb25zb2xlLnRpbWUoJ2NsaXBwaW5nJyk7XG5cbiAgICAgICAgLy8gdmFsdWVzIHdlJ2xsIHVzZSBmb3IgY2xpcHBpbmdcbiAgICAgICAgdmFyIGsxID0gMC41ICogb3B0aW9ucy5idWZmZXIgLyBvcHRpb25zLmV4dGVudCxcbiAgICAgICAgICAgIGsyID0gMC41IC0gazEsXG4gICAgICAgICAgICBrMyA9IDAuNSArIGsxLFxuICAgICAgICAgICAgazQgPSAxICsgazEsXG4gICAgICAgICAgICB0bCwgYmwsIHRyLCBiciwgbGVmdCwgcmlnaHQ7XG5cbiAgICAgICAgdGwgPSBibCA9IHRyID0gYnIgPSBudWxsO1xuXG4gICAgICAgIGxlZnQgID0gY2xpcChmZWF0dXJlcywgejIsIHggLSBrMSwgeCArIGszLCAwLCB0aWxlLm1pblgsIHRpbGUubWF4WCwgb3B0aW9ucyk7XG4gICAgICAgIHJpZ2h0ID0gY2xpcChmZWF0dXJlcywgejIsIHggKyBrMiwgeCArIGs0LCAwLCB0aWxlLm1pblgsIHRpbGUubWF4WCwgb3B0aW9ucyk7XG4gICAgICAgIGZlYXR1cmVzID0gbnVsbDtcblxuICAgICAgICBpZiAobGVmdCkge1xuICAgICAgICAgICAgdGwgPSBjbGlwKGxlZnQsIHoyLCB5IC0gazEsIHkgKyBrMywgMSwgdGlsZS5taW5ZLCB0aWxlLm1heFksIG9wdGlvbnMpO1xuICAgICAgICAgICAgYmwgPSBjbGlwKGxlZnQsIHoyLCB5ICsgazIsIHkgKyBrNCwgMSwgdGlsZS5taW5ZLCB0aWxlLm1heFksIG9wdGlvbnMpO1xuICAgICAgICAgICAgbGVmdCA9IG51bGw7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAocmlnaHQpIHtcbiAgICAgICAgICAgIHRyID0gY2xpcChyaWdodCwgejIsIHkgLSBrMSwgeSArIGszLCAxLCB0aWxlLm1pblksIHRpbGUubWF4WSwgb3B0aW9ucyk7XG4gICAgICAgICAgICBiciA9IGNsaXAocmlnaHQsIHoyLCB5ICsgazIsIHkgKyBrNCwgMSwgdGlsZS5taW5ZLCB0aWxlLm1heFksIG9wdGlvbnMpO1xuICAgICAgICAgICAgcmlnaHQgPSBudWxsO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGRlYnVnID4gMSkgY29uc29sZS50aW1lRW5kKCdjbGlwcGluZycpO1xuXG4gICAgICAgIHN0YWNrLnB1c2godGwgfHwgW10sIHogKyAxLCB4ICogMiwgICAgIHkgKiAyKTtcbiAgICAgICAgc3RhY2sucHVzaChibCB8fCBbXSwgeiArIDEsIHggKiAyLCAgICAgeSAqIDIgKyAxKTtcbiAgICAgICAgc3RhY2sucHVzaCh0ciB8fCBbXSwgeiArIDEsIHggKiAyICsgMSwgeSAqIDIpO1xuICAgICAgICBzdGFjay5wdXNoKGJyIHx8IFtdLCB6ICsgMSwgeCAqIDIgKyAxLCB5ICogMiArIDEpO1xuICAgIH1cbn07XG5cbkdlb0pTT05WVC5wcm90b3R5cGUuZ2V0VGlsZSA9IGZ1bmN0aW9uICh6LCB4LCB5KSB7XG4gICAgdmFyIG9wdGlvbnMgPSB0aGlzLm9wdGlvbnMsXG4gICAgICAgIGV4dGVudCA9IG9wdGlvbnMuZXh0ZW50LFxuICAgICAgICBkZWJ1ZyA9IG9wdGlvbnMuZGVidWc7XG5cbiAgICBpZiAoeiA8IDAgfHwgeiA+IDI0KSByZXR1cm4gbnVsbDtcblxuICAgIHZhciB6MiA9IDEgPDwgejtcbiAgICB4ID0gKCh4ICUgejIpICsgejIpICUgejI7IC8vIHdyYXAgdGlsZSB4IGNvb3JkaW5hdGVcblxuICAgIHZhciBpZCA9IHRvSUQoeiwgeCwgeSk7XG4gICAgaWYgKHRoaXMudGlsZXNbaWRdKSByZXR1cm4gdHJhbnNmb3JtKHRoaXMudGlsZXNbaWRdLCBleHRlbnQpO1xuXG4gICAgaWYgKGRlYnVnID4gMSkgY29uc29sZS5sb2coJ2RyaWxsaW5nIGRvd24gdG8geiVkLSVkLSVkJywgeiwgeCwgeSk7XG5cbiAgICB2YXIgejAgPSB6LFxuICAgICAgICB4MCA9IHgsXG4gICAgICAgIHkwID0geSxcbiAgICAgICAgcGFyZW50O1xuXG4gICAgd2hpbGUgKCFwYXJlbnQgJiYgejAgPiAwKSB7XG4gICAgICAgIHowLS07XG4gICAgICAgIHgwID0gTWF0aC5mbG9vcih4MCAvIDIpO1xuICAgICAgICB5MCA9IE1hdGguZmxvb3IoeTAgLyAyKTtcbiAgICAgICAgcGFyZW50ID0gdGhpcy50aWxlc1t0b0lEKHowLCB4MCwgeTApXTtcbiAgICB9XG5cbiAgICBpZiAoIXBhcmVudCB8fCAhcGFyZW50LnNvdXJjZSkgcmV0dXJuIG51bGw7XG5cbiAgICAvLyBpZiB3ZSBmb3VuZCBhIHBhcmVudCB0aWxlIGNvbnRhaW5pbmcgdGhlIG9yaWdpbmFsIGdlb21ldHJ5LCB3ZSBjYW4gZHJpbGwgZG93biBmcm9tIGl0XG4gICAgaWYgKGRlYnVnID4gMSkgY29uc29sZS5sb2coJ2ZvdW5kIHBhcmVudCB0aWxlIHolZC0lZC0lZCcsIHowLCB4MCwgeTApO1xuXG4gICAgaWYgKGRlYnVnID4gMSkgY29uc29sZS50aW1lKCdkcmlsbGluZyBkb3duJyk7XG4gICAgdGhpcy5zcGxpdFRpbGUocGFyZW50LnNvdXJjZSwgejAsIHgwLCB5MCwgeiwgeCwgeSk7XG4gICAgaWYgKGRlYnVnID4gMSkgY29uc29sZS50aW1lRW5kKCdkcmlsbGluZyBkb3duJyk7XG5cbiAgICByZXR1cm4gdGhpcy50aWxlc1tpZF0gPyB0cmFuc2Zvcm0odGhpcy50aWxlc1tpZF0sIGV4dGVudCkgOiBudWxsO1xufTtcblxuZnVuY3Rpb24gdG9JRCh6LCB4LCB5KSB7XG4gICAgcmV0dXJuICgoKDEgPDwgeikgKiB5ICsgeCkgKiAzMikgKyB6O1xufVxuXG5mdW5jdGlvbiBleHRlbmQoZGVzdCwgc3JjKSB7XG4gICAgZm9yICh2YXIgaSBpbiBzcmMpIGRlc3RbaV0gPSBzcmNbaV07XG4gICAgcmV0dXJuIGRlc3Q7XG59XG4iLCIvLyBAZmxvd1xuXG5pbXBvcnQgeyBnZXRKU09OIH0gZnJvbSAnLi4vdXRpbC9hamF4JztcblxuaW1wb3J0IHBlcmZvcm1hbmNlIGZyb20gJy4uL3V0aWwvcGVyZm9ybWFuY2UnO1xuaW1wb3J0IHJld2luZCBmcm9tICdnZW9qc29uLXJld2luZCc7XG5pbXBvcnQgR2VvSlNPTldyYXBwZXIgZnJvbSAnLi9nZW9qc29uX3dyYXBwZXInO1xuaW1wb3J0IHZ0cGJmIGZyb20gJ3Z0LXBiZic7XG5pbXBvcnQgc3VwZXJjbHVzdGVyIGZyb20gJ3N1cGVyY2x1c3Rlcic7XG5pbXBvcnQgZ2VvanNvbnZ0IGZyb20gJ2dlb2pzb24tdnQnO1xuaW1wb3J0IGFzc2VydCBmcm9tICdhc3NlcnQnO1xuaW1wb3J0IFZlY3RvclRpbGVXb3JrZXJTb3VyY2UgZnJvbSAnLi92ZWN0b3JfdGlsZV93b3JrZXJfc291cmNlJztcblxuaW1wb3J0IHR5cGUge1xuICAgIFdvcmtlclRpbGVQYXJhbWV0ZXJzLFxuICAgIFdvcmtlclRpbGVDYWxsYmFjayxcbn0gZnJvbSAnLi4vc291cmNlL3dvcmtlcl9zb3VyY2UnO1xuXG5pbXBvcnQgdHlwZSBBY3RvciBmcm9tICcuLi91dGlsL2FjdG9yJztcbmltcG9ydCB0eXBlIFN0eWxlTGF5ZXJJbmRleCBmcm9tICcuLi9zdHlsZS9zdHlsZV9sYXllcl9pbmRleCc7XG5cbmltcG9ydCB0eXBlIHtMb2FkVmVjdG9yRGF0YUNhbGxiYWNrfSBmcm9tICcuL3ZlY3Rvcl90aWxlX3dvcmtlcl9zb3VyY2UnO1xuaW1wb3J0IHR5cGUge1JlcXVlc3RQYXJhbWV0ZXJzfSBmcm9tICcuLi91dGlsL2FqYXgnO1xuaW1wb3J0IHR5cGUgeyBDYWxsYmFjayB9IGZyb20gJy4uL3R5cGVzL2NhbGxiYWNrJztcbmltcG9ydCB0eXBlIHtHZW9KU09ORmVhdHVyZX0gZnJvbSAnQG1hcGJveC9nZW9qc29uLXR5cGVzJztcblxuZXhwb3J0IHR5cGUgTG9hZEdlb0pTT05QYXJhbWV0ZXJzID0ge1xuICAgIHJlcXVlc3Q/OiBSZXF1ZXN0UGFyYW1ldGVycyxcbiAgICBkYXRhPzogc3RyaW5nLFxuICAgIHNvdXJjZTogc3RyaW5nLFxuICAgIGNsdXN0ZXI6IGJvb2xlYW4sXG4gICAgc3VwZXJjbHVzdGVyT3B0aW9ucz86IE9iamVjdCxcbiAgICBnZW9qc29uVnRPcHRpb25zPzogT2JqZWN0XG59O1xuXG5leHBvcnQgdHlwZSBMb2FkR2VvSlNPTiA9IChwYXJhbXM6IExvYWRHZW9KU09OUGFyYW1ldGVycywgY2FsbGJhY2s6IENhbGxiYWNrPG1peGVkPikgPT4gdm9pZDtcblxuZXhwb3J0IGludGVyZmFjZSBHZW9KU09OSW5kZXgge1xuICAgIGdldFRpbGUoejogbnVtYmVyLCB4OiBudW1iZXIsIHk6IG51bWJlcik6IE9iamVjdDtcblxuICAgIC8vIHN1cGVyY2x1c3RlciBtZXRob2RzXG4gICAgZ2V0Q2x1c3RlckV4cGFuc2lvblpvb20oY2x1c3RlcklkOiBudW1iZXIpOiBudW1iZXI7XG4gICAgZ2V0Q2hpbGRyZW4oY2x1c3RlcklkOiBudW1iZXIpOiBBcnJheTxHZW9KU09ORmVhdHVyZT47XG4gICAgZ2V0TGVhdmVzKGNsdXN0ZXJJZDogbnVtYmVyLCBsaW1pdDogbnVtYmVyLCBvZmZzZXQ6IG51bWJlcik6IEFycmF5PEdlb0pTT05GZWF0dXJlPjtcbn1cblxuZnVuY3Rpb24gbG9hZEdlb0pTT05UaWxlKHBhcmFtczogV29ya2VyVGlsZVBhcmFtZXRlcnMsIGNhbGxiYWNrOiBMb2FkVmVjdG9yRGF0YUNhbGxiYWNrKSB7XG4gICAgY29uc3QgY2Fub25pY2FsID0gcGFyYW1zLnRpbGVJRC5jYW5vbmljYWw7XG5cbiAgICBpZiAoIXRoaXMuX2dlb0pTT05JbmRleCkge1xuICAgICAgICByZXR1cm4gY2FsbGJhY2sobnVsbCwgbnVsbCk7ICAvLyB3ZSBjb3VsZG4ndCBsb2FkIHRoZSBmaWxlXG4gICAgfVxuXG4gICAgY29uc3QgZ2VvSlNPTlRpbGUgPSB0aGlzLl9nZW9KU09OSW5kZXguZ2V0VGlsZShjYW5vbmljYWwueiwgY2Fub25pY2FsLngsIGNhbm9uaWNhbC55KTtcbiAgICBpZiAoIWdlb0pTT05UaWxlKSB7XG4gICAgICAgIHJldHVybiBjYWxsYmFjayhudWxsLCBudWxsKTsgLy8gbm90aGluZyBpbiB0aGUgZ2l2ZW4gdGlsZVxuICAgIH1cblxuICAgIGNvbnN0IGdlb2pzb25XcmFwcGVyID0gbmV3IEdlb0pTT05XcmFwcGVyKGdlb0pTT05UaWxlLmZlYXR1cmVzKTtcblxuICAgIC8vIEVuY29kZSB0aGUgZ2VvanNvbi12dCB0aWxlIGludG8gYmluYXJ5IHZlY3RvciB0aWxlIGZvcm0uICBUaGlzXG4gICAgLy8gaXMgYSBjb252ZW5pZW5jZSB0aGF0IGFsbG93cyBgRmVhdHVyZUluZGV4YCB0byBvcGVyYXRlIHRoZSBzYW1lIHdheVxuICAgIC8vIGFjcm9zcyBgVmVjdG9yVGlsZVNvdXJjZWAgYW5kIGBHZW9KU09OU291cmNlYCBkYXRhLlxuICAgIGxldCBwYmYgPSB2dHBiZihnZW9qc29uV3JhcHBlcik7XG4gICAgaWYgKHBiZi5ieXRlT2Zmc2V0ICE9PSAwIHx8IHBiZi5ieXRlTGVuZ3RoICE9PSBwYmYuYnVmZmVyLmJ5dGVMZW5ndGgpIHtcbiAgICAgICAgLy8gQ29tcGF0aWJpbGl0eSB3aXRoIG5vZGUgQnVmZmVyIChodHRwczovL2dpdGh1Yi5jb20vbWFwYm94L3BiZi9pc3N1ZXMvMzUpXG4gICAgICAgIHBiZiA9IG5ldyBVaW50OEFycmF5KHBiZik7XG4gICAgfVxuXG4gICAgY2FsbGJhY2sobnVsbCwge1xuICAgICAgICB2ZWN0b3JUaWxlOiBnZW9qc29uV3JhcHBlcixcbiAgICAgICAgcmF3RGF0YTogcGJmLmJ1ZmZlclxuICAgIH0pO1xufVxuXG5leHBvcnQgdHlwZSBTb3VyY2VTdGF0ZSA9XG4gICAgfCAnSWRsZScgICAgICAgICAgICAvLyBTb3VyY2UgZW1wdHkgb3IgZGF0YSBsb2FkZWRcbiAgICB8ICdDb2FsZXNjaW5nJyAgICAgIC8vIERhdGEgZmluaXNoZWQgbG9hZGluZywgYnV0IGRpc2NhcmQgJ2xvYWREYXRhJyBtZXNzYWdlcyB1bnRpbCByZWNlaXZpbmcgJ2NvYWxlc2NlZCdcbiAgICB8ICdOZWVkc0xvYWREYXRhJzsgIC8vICdsb2FkRGF0YScgcmVjZWl2ZWQgd2hpbGUgY29hbGVzY2luZywgdHJpZ2dlciBvbmUgbW9yZSAnbG9hZERhdGEnIG9uIHJlY2VpdmluZyAnY29hbGVzY2VkJ1xuXG4vKipcbiAqIFRoZSB7QGxpbmsgV29ya2VyU291cmNlfSBpbXBsZW1lbnRhdGlvbiB0aGF0IHN1cHBvcnRzIHtAbGluayBHZW9KU09OU291cmNlfS5cbiAqIFRoaXMgY2xhc3MgaXMgZGVzaWduZWQgdG8gYmUgZWFzaWx5IHJldXNlZCB0byBzdXBwb3J0IGN1c3RvbSBzb3VyY2UgdHlwZXNcbiAqIGZvciBkYXRhIGZvcm1hdHMgdGhhdCBjYW4gYmUgcGFyc2VkL2NvbnZlcnRlZCBpbnRvIGFuIGluLW1lbW9yeSBHZW9KU09OXG4gKiByZXByZXNlbnRhdGlvbi4gIFRvIGRvIHNvLCBjcmVhdGUgaXQgd2l0aFxuICogYG5ldyBHZW9KU09OV29ya2VyU291cmNlKGFjdG9yLCBsYXllckluZGV4LCBjdXN0b21Mb2FkR2VvSlNPTkZ1bmN0aW9uKWAuXG4gKiBGb3IgYSBmdWxsIGV4YW1wbGUsIHNlZSBbbWFwYm94LWdsLXRvcG9qc29uXShodHRwczovL2dpdGh1Yi5jb20vZGV2ZWxvcG1lbnRzZWVkL21hcGJveC1nbC10b3BvanNvbikuXG4gKlxuICogQHByaXZhdGVcbiAqL1xuY2xhc3MgR2VvSlNPTldvcmtlclNvdXJjZSBleHRlbmRzIFZlY3RvclRpbGVXb3JrZXJTb3VyY2Uge1xuICAgIGxvYWRHZW9KU09OOiBMb2FkR2VvSlNPTjtcbiAgICBfc3RhdGU6IFNvdXJjZVN0YXRlO1xuICAgIF9wZW5kaW5nQ2FsbGJhY2s6IENhbGxiYWNrPHtcbiAgICAgICAgcmVzb3VyY2VUaW1pbmc/OiB7W3N0cmluZ106IEFycmF5PFBlcmZvcm1hbmNlUmVzb3VyY2VUaW1pbmc+fSxcbiAgICAgICAgYWJhbmRvbmVkPzogYm9vbGVhbiB9PjtcbiAgICBfcGVuZGluZ0xvYWREYXRhUGFyYW1zOiBMb2FkR2VvSlNPTlBhcmFtZXRlcnM7XG4gICAgX2dlb0pTT05JbmRleDogR2VvSlNPTkluZGV4XG5cbiAgICAvKipcbiAgICAgKiBAcGFyYW0gW2xvYWRHZW9KU09OXSBPcHRpb25hbCBtZXRob2QgZm9yIGN1c3RvbSBsb2FkaW5nL3BhcnNpbmcgb2ZcbiAgICAgKiBHZW9KU09OIGJhc2VkIG9uIHBhcmFtZXRlcnMgcGFzc2VkIGZyb20gdGhlIG1haW4tdGhyZWFkIFNvdXJjZS5cbiAgICAgKiBTZWUge0BsaW5rIEdlb0pTT05Xb3JrZXJTb3VyY2UjbG9hZEdlb0pTT059LlxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKGFjdG9yOiBBY3RvciwgbGF5ZXJJbmRleDogU3R5bGVMYXllckluZGV4LCBsb2FkR2VvSlNPTjogP0xvYWRHZW9KU09OKSB7XG4gICAgICAgIHN1cGVyKGFjdG9yLCBsYXllckluZGV4LCBsb2FkR2VvSlNPTlRpbGUpO1xuICAgICAgICBpZiAobG9hZEdlb0pTT04pIHtcbiAgICAgICAgICAgIHRoaXMubG9hZEdlb0pTT04gPSBsb2FkR2VvSlNPTjtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEZldGNoZXMgKGlmIGFwcHJvcHJpYXRlKSwgcGFyc2VzLCBhbmQgaW5kZXggZ2VvanNvbiBkYXRhIGludG8gdGlsZXMuIFRoaXNcbiAgICAgKiBwcmVwYXJhdG9yeSBtZXRob2QgbXVzdCBiZSBjYWxsZWQgYmVmb3JlIHtAbGluayBHZW9KU09OV29ya2VyU291cmNlI2xvYWRUaWxlfVxuICAgICAqIGNhbiBjb3JyZWN0bHkgc2VydmUgdXAgdGlsZXMuXG4gICAgICpcbiAgICAgKiBEZWZlcnMgdG8ge0BsaW5rIEdlb0pTT05Xb3JrZXJTb3VyY2UjbG9hZEdlb0pTT059IGZvciB0aGUgZmV0Y2hpbmcvcGFyc2luZyxcbiAgICAgKiBleHBlY3RpbmcgYGNhbGxiYWNrKGVycm9yLCBkYXRhKWAgdG8gYmUgY2FsbGVkIHdpdGggZWl0aGVyIGFuIGVycm9yIG9yIGFcbiAgICAgKiBwYXJzZWQgR2VvSlNPTiBvYmplY3QuXG4gICAgICpcbiAgICAgKiBXaGVuIGBsb2FkRGF0YWAgcmVxdWVzdHMgY29tZSBpbiBmYXN0ZXIgdGhhbiB0aGV5IGNhbiBiZSBwcm9jZXNzZWQsXG4gICAgICogdGhleSBhcmUgY29hbGVzY2VkIGludG8gYSBzaW5nbGUgcmVxdWVzdCB1c2luZyB0aGUgbGF0ZXN0IGRhdGEuXG4gICAgICogU2VlIHtAbGluayBHZW9KU09OV29ya2VyU291cmNlI2NvYWxlc2NlfVxuICAgICAqXG4gICAgICogQHBhcmFtIHBhcmFtc1xuICAgICAqIEBwYXJhbSBjYWxsYmFja1xuICAgICAqL1xuICAgIGxvYWREYXRhKHBhcmFtczogTG9hZEdlb0pTT05QYXJhbWV0ZXJzLCBjYWxsYmFjazogQ2FsbGJhY2s8e1xuICAgICAgICByZXNvdXJjZVRpbWluZz86IHtbc3RyaW5nXTogQXJyYXk8UGVyZm9ybWFuY2VSZXNvdXJjZVRpbWluZz59LFxuICAgICAgICBhYmFuZG9uZWQ/OiBib29sZWFuIH0+KSB7XG4gICAgICAgIGlmICh0aGlzLl9wZW5kaW5nQ2FsbGJhY2spIHtcbiAgICAgICAgICAgIC8vIFRlbGwgdGhlIGZvcmVncm91bmQgdGhlIHByZXZpb3VzIGNhbGwgaGFzIGJlZW4gYWJhbmRvbmVkXG4gICAgICAgICAgICB0aGlzLl9wZW5kaW5nQ2FsbGJhY2sobnVsbCwgeyBhYmFuZG9uZWQ6IHRydWUgfSk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fcGVuZGluZ0NhbGxiYWNrID0gY2FsbGJhY2s7XG4gICAgICAgIHRoaXMuX3BlbmRpbmdMb2FkRGF0YVBhcmFtcyA9IHBhcmFtcztcblxuICAgICAgICBpZiAodGhpcy5fc3RhdGUgJiZcbiAgICAgICAgICAgIHRoaXMuX3N0YXRlICE9PSAnSWRsZScpIHtcbiAgICAgICAgICAgIHRoaXMuX3N0YXRlID0gJ05lZWRzTG9hZERhdGEnO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5fc3RhdGUgPSAnQ29hbGVzY2luZyc7XG4gICAgICAgICAgICB0aGlzLl9sb2FkRGF0YSgpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogSW50ZXJuYWwgaW1wbGVtZW50YXRpb246IGNhbGxlZCBkaXJlY3RseSBieSBgbG9hZERhdGFgXG4gICAgICogb3IgYnkgYGNvYWxlc2NlYCB1c2luZyBzdG9yZWQgcGFyYW1ldGVycy5cbiAgICAgKi9cbiAgICBfbG9hZERhdGEoKSB7XG4gICAgICAgIGlmICghdGhpcy5fcGVuZGluZ0NhbGxiYWNrIHx8ICF0aGlzLl9wZW5kaW5nTG9hZERhdGFQYXJhbXMpIHtcbiAgICAgICAgICAgIGFzc2VydChmYWxzZSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgY2FsbGJhY2sgPSB0aGlzLl9wZW5kaW5nQ2FsbGJhY2s7XG4gICAgICAgIGNvbnN0IHBhcmFtcyA9IHRoaXMuX3BlbmRpbmdMb2FkRGF0YVBhcmFtcztcbiAgICAgICAgZGVsZXRlIHRoaXMuX3BlbmRpbmdDYWxsYmFjaztcbiAgICAgICAgZGVsZXRlIHRoaXMuX3BlbmRpbmdMb2FkRGF0YVBhcmFtcztcblxuICAgICAgICBjb25zdCBwZXJmID0gKHBhcmFtcyAmJiBwYXJhbXMucmVxdWVzdCAmJiBwYXJhbXMucmVxdWVzdC5jb2xsZWN0UmVzb3VyY2VUaW1pbmcpID9cbiAgICAgICAgICAgIG5ldyBwZXJmb3JtYW5jZS5QZXJmb3JtYW5jZShwYXJhbXMucmVxdWVzdCkgOiBmYWxzZTtcblxuICAgICAgICB0aGlzLmxvYWRHZW9KU09OKHBhcmFtcywgKGVyciwgZGF0YSkgPT4ge1xuICAgICAgICAgICAgaWYgKGVyciB8fCAhZGF0YSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgZGF0YSAhPT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2sobmV3IEVycm9yKFwiSW5wdXQgZGF0YSBpcyBub3QgYSB2YWxpZCBHZW9KU09OIG9iamVjdC5cIikpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXdpbmQoZGF0YSwgdHJ1ZSk7XG5cbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9nZW9KU09OSW5kZXggPSBwYXJhbXMuY2x1c3RlciA/XG4gICAgICAgICAgICAgICAgICAgICAgICBzdXBlcmNsdXN0ZXIocGFyYW1zLnN1cGVyY2x1c3Rlck9wdGlvbnMpLmxvYWQoZGF0YS5mZWF0dXJlcykgOlxuICAgICAgICAgICAgICAgICAgICAgICAgZ2VvanNvbnZ0KGRhdGEsIHBhcmFtcy5nZW9qc29uVnRPcHRpb25zKTtcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgdGhpcy5sb2FkZWQgPSB7fTtcblxuICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IHt9O1xuICAgICAgICAgICAgICAgIGlmIChwZXJmKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlc291cmNlVGltaW5nRGF0YSA9IHBlcmYuZmluaXNoKCk7XG4gICAgICAgICAgICAgICAgICAgIC8vIGl0J3MgbmVjZXNzYXJ5IHRvIGV2YWwgdGhlIHJlc3VsdCBvZiBnZXRFbnRyaWVzQnlOYW1lKCkgaGVyZSB2aWEgcGFyc2Uvc3RyaW5naWZ5XG4gICAgICAgICAgICAgICAgICAgIC8vIGxhdGUgZXZhbHVhdGlvbiBpbiB0aGUgbWFpbiB0aHJlYWQgY2F1c2VzIFR5cGVFcnJvcjogaWxsZWdhbCBpbnZvY2F0aW9uXG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXNvdXJjZVRpbWluZ0RhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdC5yZXNvdXJjZVRpbWluZyA9IHt9O1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0LnJlc291cmNlVGltaW5nW3BhcmFtcy5zb3VyY2VdID0gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShyZXNvdXJjZVRpbWluZ0RhdGEpKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjYWxsYmFjayhudWxsLCByZXN1bHQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBXaGlsZSBwcm9jZXNzaW5nIGBsb2FkRGF0YWAsIHdlIGNvYWxlc2NlIGFsbCBmdXJ0aGVyXG4gICAgICogYGxvYWREYXRhYCBtZXNzYWdlcyBpbnRvIGEgc2luZ2xlIGNhbGwgdG8gX2xvYWREYXRhXG4gICAgICogdGhhdCB3aWxsIGhhcHBlbiBvbmNlIHdlJ3ZlIGZpbmlzaGVkIHByb2Nlc3NpbmcgdGhlXG4gICAgICogZmlyc3QgbWVzc2FnZS4ge0BsaW5rIEdlb0pTT05Tb3VyY2UjX3VwZGF0ZVdvcmtlckRhdGF9XG4gICAgICogaXMgcmVzcG9uc2libGUgZm9yIHNlbmRpbmcgdXMgdGhlIGBjb2FsZXNjZWAgbWVzc2FnZVxuICAgICAqIGF0IHRoZSB0aW1lIGl0IHJlY2VpdmVzIGEgcmVzcG9uc2UgZnJvbSBgbG9hZERhdGFgXG4gICAgICpcbiAgICAgKiAgICAgICAgICBTdGF0ZTogSWRsZVxuICAgICAqICAgICAgICAgIOKGkSAgICAgICAgICB8XG4gICAgICogICAgICdjb2FsZXNjZScgICAnbG9hZERhdGEnXG4gICAgICogICAgICAgICAgfCAgICAgKHRyaWdnZXJzIGxvYWQpXG4gICAgICogICAgICAgICAgfCAgICAgICAgICDihpNcbiAgICAgKiAgICAgICAgU3RhdGU6IENvYWxlc2NpbmdcbiAgICAgKiAgICAgICAgICDihpEgICAgICAgICAgfFxuICAgICAqICAgKHRyaWdnZXJzIGxvYWQpICAgfFxuICAgICAqICAgICAnY29hbGVzY2UnICAgJ2xvYWREYXRhJ1xuICAgICAqICAgICAgICAgIHwgICAgICAgICAg4oaTXG4gICAgICogICAgICAgIFN0YXRlOiBOZWVkc0xvYWREYXRhXG4gICAgICovXG4gICAgY29hbGVzY2UoKSB7XG4gICAgICAgIGlmICh0aGlzLl9zdGF0ZSA9PT0gJ0NvYWxlc2NpbmcnKSB7XG4gICAgICAgICAgICB0aGlzLl9zdGF0ZSA9ICdJZGxlJztcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLl9zdGF0ZSA9PT0gJ05lZWRzTG9hZERhdGEnKSB7XG4gICAgICAgICAgICB0aGlzLl9zdGF0ZSA9ICdDb2FsZXNjaW5nJztcbiAgICAgICAgICAgIHRoaXMuX2xvYWREYXRhKCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAqIEltcGxlbWVudHMge0BsaW5rIFdvcmtlclNvdXJjZSNyZWxvYWRUaWxlfS5cbiAgICAqXG4gICAgKiBJZiB0aGUgdGlsZSBpcyBsb2FkZWQsIHVzZXMgdGhlIGltcGxlbWVudGF0aW9uIGluIFZlY3RvclRpbGVXb3JrZXJTb3VyY2UuXG4gICAgKiBPdGhlcndpc2UsIHN1Y2ggYXMgYWZ0ZXIgYSBzZXREYXRhKCkgY2FsbCwgd2UgbG9hZCB0aGUgdGlsZSBmcmVzaC5cbiAgICAqXG4gICAgKiBAcGFyYW0gcGFyYW1zXG4gICAgKiBAcGFyYW0gcGFyYW1zLnVpZCBUaGUgVUlEIGZvciB0aGlzIHRpbGUuXG4gICAgKi9cbiAgICByZWxvYWRUaWxlKHBhcmFtczogV29ya2VyVGlsZVBhcmFtZXRlcnMsIGNhbGxiYWNrOiBXb3JrZXJUaWxlQ2FsbGJhY2spIHtcbiAgICAgICAgY29uc3QgbG9hZGVkID0gdGhpcy5sb2FkZWQsXG4gICAgICAgICAgICB1aWQgPSBwYXJhbXMudWlkO1xuXG4gICAgICAgIGlmIChsb2FkZWQgJiYgbG9hZGVkW3VpZF0pIHtcbiAgICAgICAgICAgIHJldHVybiBzdXBlci5yZWxvYWRUaWxlKHBhcmFtcywgY2FsbGJhY2spO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMubG9hZFRpbGUocGFyYW1zLCBjYWxsYmFjayk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBGZXRjaCBhbmQgcGFyc2UgR2VvSlNPTiBhY2NvcmRpbmcgdG8gdGhlIGdpdmVuIHBhcmFtcy4gIENhbGxzIGBjYWxsYmFja2BcbiAgICAgKiB3aXRoIGAoZXJyLCBkYXRhKWAsIHdoZXJlIGBkYXRhYCBpcyBhIHBhcnNlZCBHZW9KU09OIG9iamVjdC5cbiAgICAgKlxuICAgICAqIEdlb0pTT04gaXMgbG9hZGVkIGFuZCBwYXJzZWQgZnJvbSBgcGFyYW1zLnVybGAgaWYgaXQgZXhpc3RzLCBvciBlbHNlXG4gICAgICogZXhwZWN0ZWQgYXMgYSBsaXRlcmFsIChzdHJpbmcgb3Igb2JqZWN0KSBgcGFyYW1zLmRhdGFgLlxuICAgICAqXG4gICAgICogQHBhcmFtIHBhcmFtc1xuICAgICAqIEBwYXJhbSBbcGFyYW1zLnVybF0gQSBVUkwgdG8gdGhlIHJlbW90ZSBHZW9KU09OIGRhdGEuXG4gICAgICogQHBhcmFtIFtwYXJhbXMuZGF0YV0gTGl0ZXJhbCBHZW9KU09OIGRhdGEuIE11c3QgYmUgcHJvdmlkZWQgaWYgYHBhcmFtcy51cmxgIGlzIG5vdC5cbiAgICAgKi9cbiAgICBsb2FkR2VvSlNPTihwYXJhbXM6IExvYWRHZW9KU09OUGFyYW1ldGVycywgY2FsbGJhY2s6IENhbGxiYWNrPG1peGVkPikge1xuICAgICAgICAvLyBCZWNhdXNlIG9mIHNhbWUgb3JpZ2luIGlzc3VlcywgdXJscyBtdXN0IGVpdGhlciBpbmNsdWRlIGFuIGV4cGxpY2l0XG4gICAgICAgIC8vIG9yaWdpbiBvciBhYnNvbHV0ZSBwYXRoLlxuICAgICAgICAvLyBpZTogL2Zvby9iYXIuanNvbiBvciBodHRwOi8vZXhhbXBsZS5jb20vYmFyLmpzb25cbiAgICAgICAgLy8gYnV0IG5vdCAuLi9mb28vYmFyLmpzb25cbiAgICAgICAgaWYgKHBhcmFtcy5yZXF1ZXN0KSB7XG4gICAgICAgICAgICBnZXRKU09OKHBhcmFtcy5yZXF1ZXN0LCBjYWxsYmFjayk7XG4gICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIHBhcmFtcy5kYXRhID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2sobnVsbCwgSlNPTi5wYXJzZShwYXJhbXMuZGF0YSkpO1xuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhuZXcgRXJyb3IoXCJJbnB1dCBkYXRhIGlzIG5vdCBhIHZhbGlkIEdlb0pTT04gb2JqZWN0LlwiKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gY2FsbGJhY2sobmV3IEVycm9yKFwiSW5wdXQgZGF0YSBpcyBub3QgYSB2YWxpZCBHZW9KU09OIG9iamVjdC5cIikpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmVtb3ZlU291cmNlKHBhcmFtczoge3NvdXJjZTogc3RyaW5nfSwgY2FsbGJhY2s6IENhbGxiYWNrPG1peGVkPikge1xuICAgICAgICBpZiAodGhpcy5fcGVuZGluZ0NhbGxiYWNrKSB7XG4gICAgICAgICAgICAvLyBEb24ndCBsZWFrIGNhbGxiYWNrc1xuICAgICAgICAgICAgdGhpcy5fcGVuZGluZ0NhbGxiYWNrKG51bGwsIHsgYWJhbmRvbmVkOiB0cnVlIH0pO1xuICAgICAgICB9XG4gICAgICAgIGNhbGxiYWNrKCk7XG4gICAgfVxuXG4gICAgZ2V0Q2x1c3RlckV4cGFuc2lvblpvb20ocGFyYW1zOiB7Y2x1c3RlcklkOiBudW1iZXJ9LCBjYWxsYmFjazogQ2FsbGJhY2s8bnVtYmVyPikge1xuICAgICAgICBjYWxsYmFjayhudWxsLCB0aGlzLl9nZW9KU09OSW5kZXguZ2V0Q2x1c3RlckV4cGFuc2lvblpvb20ocGFyYW1zLmNsdXN0ZXJJZCkpO1xuICAgIH1cblxuICAgIGdldENsdXN0ZXJDaGlsZHJlbihwYXJhbXM6IHtjbHVzdGVySWQ6IG51bWJlcn0sIGNhbGxiYWNrOiBDYWxsYmFjazxBcnJheTxHZW9KU09ORmVhdHVyZT4+KSB7XG4gICAgICAgIGNhbGxiYWNrKG51bGwsIHRoaXMuX2dlb0pTT05JbmRleC5nZXRDaGlsZHJlbihwYXJhbXMuY2x1c3RlcklkKSk7XG4gICAgfVxuXG4gICAgZ2V0Q2x1c3RlckxlYXZlcyhwYXJhbXM6IHtjbHVzdGVySWQ6IG51bWJlciwgbGltaXQ6IG51bWJlciwgb2Zmc2V0OiBudW1iZXJ9LCBjYWxsYmFjazogQ2FsbGJhY2s8QXJyYXk8R2VvSlNPTkZlYXR1cmU+Pikge1xuICAgICAgICBjYWxsYmFjayhudWxsLCB0aGlzLl9nZW9KU09OSW5kZXguZ2V0TGVhdmVzKHBhcmFtcy5jbHVzdGVySWQsIHBhcmFtcy5saW1pdCwgcGFyYW1zLm9mZnNldCkpO1xuICAgIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgR2VvSlNPTldvcmtlclNvdXJjZTtcbiIsIi8vIEBmbG93XG5cbmltcG9ydCBBY3RvciBmcm9tICcuLi91dGlsL2FjdG9yJztcblxuaW1wb3J0IFN0eWxlTGF5ZXJJbmRleCBmcm9tICcuLi9zdHlsZS9zdHlsZV9sYXllcl9pbmRleCc7XG5pbXBvcnQgVmVjdG9yVGlsZVdvcmtlclNvdXJjZSBmcm9tICcuL3ZlY3Rvcl90aWxlX3dvcmtlcl9zb3VyY2UnO1xuaW1wb3J0IFJhc3RlckRFTVRpbGVXb3JrZXJTb3VyY2UgZnJvbSAnLi9yYXN0ZXJfZGVtX3RpbGVfd29ya2VyX3NvdXJjZSc7XG5pbXBvcnQgR2VvSlNPTldvcmtlclNvdXJjZSBmcm9tICcuL2dlb2pzb25fd29ya2VyX3NvdXJjZSc7XG5pbXBvcnQgYXNzZXJ0IGZyb20gJ2Fzc2VydCc7XG5pbXBvcnQgeyBwbHVnaW4gYXMgZ2xvYmFsUlRMVGV4dFBsdWdpbiB9IGZyb20gJy4vcnRsX3RleHRfcGx1Z2luJztcblxuaW1wb3J0IHR5cGUge1xuICAgIFdvcmtlclNvdXJjZSxcbiAgICBXb3JrZXJUaWxlUGFyYW1ldGVycyxcbiAgICBXb3JrZXJERU1UaWxlUGFyYW1ldGVycyxcbiAgICBXb3JrZXJUaWxlQ2FsbGJhY2ssXG4gICAgV29ya2VyREVNVGlsZUNhbGxiYWNrLFxuICAgIFRpbGVQYXJhbWV0ZXJzXG59IGZyb20gJy4uL3NvdXJjZS93b3JrZXJfc291cmNlJztcblxuaW1wb3J0IHR5cGUge1dvcmtlckdsb2JhbFNjb3BlSW50ZXJmYWNlfSBmcm9tICcuLi91dGlsL3dlYl93b3JrZXInO1xuaW1wb3J0IHR5cGUge0NhbGxiYWNrfSBmcm9tICcuLi90eXBlcy9jYWxsYmFjayc7XG5pbXBvcnQgdHlwZSB7TGF5ZXJTcGVjaWZpY2F0aW9ufSBmcm9tICcuLi9zdHlsZS1zcGVjL3R5cGVzJztcblxuLyoqXG4gKiBAcHJpdmF0ZVxuICovXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBXb3JrZXIge1xuICAgIHNlbGY6IFdvcmtlckdsb2JhbFNjb3BlSW50ZXJmYWNlO1xuICAgIGFjdG9yOiBBY3RvcjtcbiAgICBsYXllckluZGV4ZXM6IHsgW3N0cmluZ106IFN0eWxlTGF5ZXJJbmRleCB9O1xuICAgIHdvcmtlclNvdXJjZVR5cGVzOiB7IFtzdHJpbmddOiBDbGFzczxXb3JrZXJTb3VyY2U+IH07XG4gICAgd29ya2VyU291cmNlczogeyBbc3RyaW5nXTogeyBbc3RyaW5nXTogeyBbc3RyaW5nXTogV29ya2VyU291cmNlIH0gfSB9O1xuICAgIGRlbVdvcmtlclNvdXJjZXM6IHsgW3N0cmluZ106IHsgW3N0cmluZ106IFJhc3RlckRFTVRpbGVXb3JrZXJTb3VyY2UgfSB9O1xuXG4gICAgY29uc3RydWN0b3Ioc2VsZjogV29ya2VyR2xvYmFsU2NvcGVJbnRlcmZhY2UpIHtcbiAgICAgICAgdGhpcy5zZWxmID0gc2VsZjtcbiAgICAgICAgdGhpcy5hY3RvciA9IG5ldyBBY3RvcihzZWxmLCB0aGlzKTtcblxuICAgICAgICB0aGlzLmxheWVySW5kZXhlcyA9IHt9O1xuXG4gICAgICAgIHRoaXMud29ya2VyU291cmNlVHlwZXMgPSB7XG4gICAgICAgICAgICB2ZWN0b3I6IFZlY3RvclRpbGVXb3JrZXJTb3VyY2UsXG4gICAgICAgICAgICBnZW9qc29uOiBHZW9KU09OV29ya2VyU291cmNlXG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gW21hcElkXVtzb3VyY2VUeXBlXVtzb3VyY2VOYW1lXSA9PiB3b3JrZXIgc291cmNlIGluc3RhbmNlXG4gICAgICAgIHRoaXMud29ya2VyU291cmNlcyA9IHt9O1xuICAgICAgICB0aGlzLmRlbVdvcmtlclNvdXJjZXMgPSB7fTtcblxuICAgICAgICB0aGlzLnNlbGYucmVnaXN0ZXJXb3JrZXJTb3VyY2UgPSAobmFtZTogc3RyaW5nLCBXb3JrZXJTb3VyY2U6IENsYXNzPFdvcmtlclNvdXJjZT4pID0+IHtcbiAgICAgICAgICAgIGlmICh0aGlzLndvcmtlclNvdXJjZVR5cGVzW25hbWVdKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBXb3JrZXIgc291cmNlIHdpdGggbmFtZSBcIiR7bmFtZX1cIiBhbHJlYWR5IHJlZ2lzdGVyZWQuYCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLndvcmtlclNvdXJjZVR5cGVzW25hbWVdID0gV29ya2VyU291cmNlO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMuc2VsZi5yZWdpc3RlclJUTFRleHRQbHVnaW4gPSAocnRsVGV4dFBsdWdpbjoge2FwcGx5QXJhYmljU2hhcGluZzogRnVuY3Rpb24sIHByb2Nlc3NCaWRpcmVjdGlvbmFsVGV4dDogRnVuY3Rpb24sIHByb2Nlc3NTdHlsZWRCaWRpcmVjdGlvbmFsVGV4dD86IEZ1bmN0aW9ufSkgPT4ge1xuICAgICAgICAgICAgaWYgKGdsb2JhbFJUTFRleHRQbHVnaW4uaXNMb2FkZWQoKSkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignUlRMIHRleHQgcGx1Z2luIGFscmVhZHkgcmVnaXN0ZXJlZC4nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGdsb2JhbFJUTFRleHRQbHVnaW5bJ2FwcGx5QXJhYmljU2hhcGluZyddID0gcnRsVGV4dFBsdWdpbi5hcHBseUFyYWJpY1NoYXBpbmc7XG4gICAgICAgICAgICBnbG9iYWxSVExUZXh0UGx1Z2luWydwcm9jZXNzQmlkaXJlY3Rpb25hbFRleHQnXSA9IHJ0bFRleHRQbHVnaW4ucHJvY2Vzc0JpZGlyZWN0aW9uYWxUZXh0O1xuICAgICAgICAgICAgZ2xvYmFsUlRMVGV4dFBsdWdpblsncHJvY2Vzc1N0eWxlZEJpZGlyZWN0aW9uYWxUZXh0J10gPSBydGxUZXh0UGx1Z2luLnByb2Nlc3NTdHlsZWRCaWRpcmVjdGlvbmFsVGV4dDtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBzZXRMYXllcnMobWFwSWQ6IHN0cmluZywgbGF5ZXJzOiBBcnJheTxMYXllclNwZWNpZmljYXRpb24+LCBjYWxsYmFjazogV29ya2VyVGlsZUNhbGxiYWNrKSB7XG4gICAgICAgIHRoaXMuZ2V0TGF5ZXJJbmRleChtYXBJZCkucmVwbGFjZShsYXllcnMpO1xuICAgICAgICBjYWxsYmFjaygpO1xuICAgIH1cblxuICAgIHVwZGF0ZUxheWVycyhtYXBJZDogc3RyaW5nLCBwYXJhbXM6IHtsYXllcnM6IEFycmF5PExheWVyU3BlY2lmaWNhdGlvbj4sIHJlbW92ZWRJZHM6IEFycmF5PHN0cmluZz59LCBjYWxsYmFjazogV29ya2VyVGlsZUNhbGxiYWNrKSB7XG4gICAgICAgIHRoaXMuZ2V0TGF5ZXJJbmRleChtYXBJZCkudXBkYXRlKHBhcmFtcy5sYXllcnMsIHBhcmFtcy5yZW1vdmVkSWRzKTtcbiAgICAgICAgY2FsbGJhY2soKTtcbiAgICB9XG5cbiAgICBsb2FkVGlsZShtYXBJZDogc3RyaW5nLCBwYXJhbXM6IFdvcmtlclRpbGVQYXJhbWV0ZXJzICYge3R5cGU6IHN0cmluZ30sIGNhbGxiYWNrOiBXb3JrZXJUaWxlQ2FsbGJhY2spIHtcbiAgICAgICAgYXNzZXJ0KHBhcmFtcy50eXBlKTtcbiAgICAgICAgdGhpcy5nZXRXb3JrZXJTb3VyY2UobWFwSWQsIHBhcmFtcy50eXBlLCBwYXJhbXMuc291cmNlKS5sb2FkVGlsZShwYXJhbXMsIGNhbGxiYWNrKTtcbiAgICB9XG5cbiAgICBsb2FkREVNVGlsZShtYXBJZDogc3RyaW5nLCBwYXJhbXM6IFdvcmtlckRFTVRpbGVQYXJhbWV0ZXJzLCBjYWxsYmFjazogV29ya2VyREVNVGlsZUNhbGxiYWNrKSB7XG4gICAgICAgIHRoaXMuZ2V0REVNV29ya2VyU291cmNlKG1hcElkLCBwYXJhbXMuc291cmNlKS5sb2FkVGlsZShwYXJhbXMsIGNhbGxiYWNrKTtcbiAgICB9XG5cbiAgICByZWxvYWRUaWxlKG1hcElkOiBzdHJpbmcsIHBhcmFtczogV29ya2VyVGlsZVBhcmFtZXRlcnMgJiB7dHlwZTogc3RyaW5nfSwgY2FsbGJhY2s6IFdvcmtlclRpbGVDYWxsYmFjaykge1xuICAgICAgICBhc3NlcnQocGFyYW1zLnR5cGUpO1xuICAgICAgICB0aGlzLmdldFdvcmtlclNvdXJjZShtYXBJZCwgcGFyYW1zLnR5cGUsIHBhcmFtcy5zb3VyY2UpLnJlbG9hZFRpbGUocGFyYW1zLCBjYWxsYmFjayk7XG4gICAgfVxuXG4gICAgYWJvcnRUaWxlKG1hcElkOiBzdHJpbmcsIHBhcmFtczogVGlsZVBhcmFtZXRlcnMgJiB7dHlwZTogc3RyaW5nfSwgY2FsbGJhY2s6IFdvcmtlclRpbGVDYWxsYmFjaykge1xuICAgICAgICBhc3NlcnQocGFyYW1zLnR5cGUpO1xuICAgICAgICB0aGlzLmdldFdvcmtlclNvdXJjZShtYXBJZCwgcGFyYW1zLnR5cGUsIHBhcmFtcy5zb3VyY2UpLmFib3J0VGlsZShwYXJhbXMsIGNhbGxiYWNrKTtcbiAgICB9XG5cbiAgICByZW1vdmVUaWxlKG1hcElkOiBzdHJpbmcsIHBhcmFtczogVGlsZVBhcmFtZXRlcnMgJiB7dHlwZTogc3RyaW5nfSwgY2FsbGJhY2s6IFdvcmtlclRpbGVDYWxsYmFjaykge1xuICAgICAgICBhc3NlcnQocGFyYW1zLnR5cGUpO1xuICAgICAgICB0aGlzLmdldFdvcmtlclNvdXJjZShtYXBJZCwgcGFyYW1zLnR5cGUsIHBhcmFtcy5zb3VyY2UpLnJlbW92ZVRpbGUocGFyYW1zLCBjYWxsYmFjayk7XG4gICAgfVxuXG4gICAgcmVtb3ZlREVNVGlsZShtYXBJZDogc3RyaW5nLCBwYXJhbXM6IFRpbGVQYXJhbWV0ZXJzKSB7XG4gICAgICAgIHRoaXMuZ2V0REVNV29ya2VyU291cmNlKG1hcElkLCBwYXJhbXMuc291cmNlKS5yZW1vdmVUaWxlKHBhcmFtcyk7XG4gICAgfVxuXG4gICAgcmVtb3ZlU291cmNlKG1hcElkOiBzdHJpbmcsIHBhcmFtczoge3NvdXJjZTogc3RyaW5nfSAmIHt0eXBlOiBzdHJpbmd9LCBjYWxsYmFjazogV29ya2VyVGlsZUNhbGxiYWNrKSB7XG4gICAgICAgIGFzc2VydChwYXJhbXMudHlwZSk7XG4gICAgICAgIGFzc2VydChwYXJhbXMuc291cmNlKTtcblxuICAgICAgICBpZiAoIXRoaXMud29ya2VyU291cmNlc1ttYXBJZF0gfHxcbiAgICAgICAgICAgICF0aGlzLndvcmtlclNvdXJjZXNbbWFwSWRdW3BhcmFtcy50eXBlXSB8fFxuICAgICAgICAgICAgIXRoaXMud29ya2VyU291cmNlc1ttYXBJZF1bcGFyYW1zLnR5cGVdW3BhcmFtcy5zb3VyY2VdKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCB3b3JrZXIgPSB0aGlzLndvcmtlclNvdXJjZXNbbWFwSWRdW3BhcmFtcy50eXBlXVtwYXJhbXMuc291cmNlXTtcbiAgICAgICAgZGVsZXRlIHRoaXMud29ya2VyU291cmNlc1ttYXBJZF1bcGFyYW1zLnR5cGVdW3BhcmFtcy5zb3VyY2VdO1xuXG4gICAgICAgIGlmICh3b3JrZXIucmVtb3ZlU291cmNlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHdvcmtlci5yZW1vdmVTb3VyY2UocGFyYW1zLCBjYWxsYmFjayk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogTG9hZCBhIHtAbGluayBXb3JrZXJTb3VyY2V9IHNjcmlwdCBhdCBwYXJhbXMudXJsLiAgVGhlIHNjcmlwdCBpcyBydW5cbiAgICAgKiAodXNpbmcgaW1wb3J0U2NyaXB0cykgd2l0aCBgcmVnaXN0ZXJXb3JrZXJTb3VyY2VgIGluIHNjb3BlLCB3aGljaCBpcyBhXG4gICAgICogZnVuY3Rpb24gdGFraW5nIGAobmFtZSwgd29ya2VyU291cmNlT2JqZWN0KWAuXG4gICAgICogIEBwcml2YXRlXG4gICAgICovXG4gICAgbG9hZFdvcmtlclNvdXJjZShtYXA6IHN0cmluZywgcGFyYW1zOiB7IHVybDogc3RyaW5nIH0sIGNhbGxiYWNrOiBDYWxsYmFjazx2b2lkPikge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgdGhpcy5zZWxmLmltcG9ydFNjcmlwdHMocGFyYW1zLnVybCk7XG4gICAgICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICBjYWxsYmFjayhlLnRvU3RyaW5nKCkpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgbG9hZFJUTFRleHRQbHVnaW4obWFwOiBzdHJpbmcsIHBsdWdpblVSTDogc3RyaW5nLCBjYWxsYmFjazogQ2FsbGJhY2s8dm9pZD4pIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGlmICghZ2xvYmFsUlRMVGV4dFBsdWdpbi5pc0xvYWRlZCgpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zZWxmLmltcG9ydFNjcmlwdHMocGx1Z2luVVJMKTtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhnbG9iYWxSVExUZXh0UGx1Z2luLmlzTG9hZGVkKCkgP1xuICAgICAgICAgICAgICAgICAgICBudWxsIDpcbiAgICAgICAgICAgICAgICAgICAgbmV3IEVycm9yKGBSVEwgVGV4dCBQbHVnaW4gZmFpbGVkIHRvIGltcG9ydCBzY3JpcHRzIGZyb20gJHtwbHVnaW5VUkx9YCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICBjYWxsYmFjayhlLnRvU3RyaW5nKCkpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZ2V0TGF5ZXJJbmRleChtYXBJZDogc3RyaW5nKSB7XG4gICAgICAgIGxldCBsYXllckluZGV4ZXMgPSB0aGlzLmxheWVySW5kZXhlc1ttYXBJZF07XG4gICAgICAgIGlmICghbGF5ZXJJbmRleGVzKSB7XG4gICAgICAgICAgICBsYXllckluZGV4ZXMgPSB0aGlzLmxheWVySW5kZXhlc1ttYXBJZF0gPSBuZXcgU3R5bGVMYXllckluZGV4KCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGxheWVySW5kZXhlcztcbiAgICB9XG5cbiAgICBnZXRXb3JrZXJTb3VyY2UobWFwSWQ6IHN0cmluZywgdHlwZTogc3RyaW5nLCBzb3VyY2U6IHN0cmluZykge1xuICAgICAgICBpZiAoIXRoaXMud29ya2VyU291cmNlc1ttYXBJZF0pXG4gICAgICAgICAgICB0aGlzLndvcmtlclNvdXJjZXNbbWFwSWRdID0ge307XG4gICAgICAgIGlmICghdGhpcy53b3JrZXJTb3VyY2VzW21hcElkXVt0eXBlXSlcbiAgICAgICAgICAgIHRoaXMud29ya2VyU291cmNlc1ttYXBJZF1bdHlwZV0gPSB7fTtcblxuICAgICAgICBpZiAoIXRoaXMud29ya2VyU291cmNlc1ttYXBJZF1bdHlwZV1bc291cmNlXSkge1xuICAgICAgICAgICAgLy8gdXNlIGEgd3JhcHBlZCBhY3RvciBzbyB0aGF0IHdlIGNhbiBhdHRhY2ggYSB0YXJnZXQgbWFwSWQgcGFyYW1cbiAgICAgICAgICAgIC8vIHRvIGFueSBtZXNzYWdlcyBpbnZva2VkIGJ5IHRoZSBXb3JrZXJTb3VyY2VcbiAgICAgICAgICAgIGNvbnN0IGFjdG9yID0ge1xuICAgICAgICAgICAgICAgIHNlbmQ6ICh0eXBlLCBkYXRhLCBjYWxsYmFjaykgPT4ge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmFjdG9yLnNlbmQodHlwZSwgZGF0YSwgY2FsbGJhY2ssIG1hcElkKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB0aGlzLndvcmtlclNvdXJjZXNbbWFwSWRdW3R5cGVdW3NvdXJjZV0gPSBuZXcgKHRoaXMud29ya2VyU291cmNlVHlwZXNbdHlwZV06IGFueSkoKGFjdG9yOiBhbnkpLCB0aGlzLmdldExheWVySW5kZXgobWFwSWQpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzLndvcmtlclNvdXJjZXNbbWFwSWRdW3R5cGVdW3NvdXJjZV07XG4gICAgfVxuXG4gICAgZ2V0REVNV29ya2VyU291cmNlKG1hcElkOiBzdHJpbmcsIHNvdXJjZTogc3RyaW5nKSB7XG4gICAgICAgIGlmICghdGhpcy5kZW1Xb3JrZXJTb3VyY2VzW21hcElkXSlcbiAgICAgICAgICAgIHRoaXMuZGVtV29ya2VyU291cmNlc1ttYXBJZF0gPSB7fTtcblxuICAgICAgICBpZiAoIXRoaXMuZGVtV29ya2VyU291cmNlc1ttYXBJZF1bc291cmNlXSkge1xuICAgICAgICAgICAgdGhpcy5kZW1Xb3JrZXJTb3VyY2VzW21hcElkXVtzb3VyY2VdID0gbmV3IFJhc3RlckRFTVRpbGVXb3JrZXJTb3VyY2UoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzLmRlbVdvcmtlclNvdXJjZXNbbWFwSWRdW3NvdXJjZV07XG4gICAgfVxufVxuXG4vKiBnbG9iYWwgc2VsZiwgV29ya2VyR2xvYmFsU2NvcGUgKi9cbmlmICh0eXBlb2YgV29ya2VyR2xvYmFsU2NvcGUgIT09ICd1bmRlZmluZWQnICYmXG4gICAgdHlwZW9mIHNlbGYgIT09ICd1bmRlZmluZWQnICYmXG4gICAgc2VsZiBpbnN0YW5jZW9mIFdvcmtlckdsb2JhbFNjb3BlKSB7XG4gICAgbmV3IFdvcmtlcihzZWxmKTtcbn1cbiJdLCJuYW1lcyI6WyJjb25zdCIsImxldCIsImdldEFycmF5QnVmZmVyIiwidnQiLCJQcm90b2J1ZiIsInBlcmZvcm1hbmNlIiwiV29ya2VyVGlsZSIsInRoaXMiLCJleHRlbmQiLCJERU1EYXRhIiwibXZ0IiwiRVhURU5UIiwiUG9pbnQiLCJnZW9tZXRyeSIsInBvaW50IiwicmVxdWlyZSQkMCIsIkdlb0pTT05XcmFwcGVyIiwiRmVhdHVyZVdyYXBwZXIiLCJQYmYiLCJzb3J0IiwicmV3aW5kIiwidHJhbnNmb3JtIiwidnRwYmYiLCJzdXBlciIsImFzc2VydCIsImdldEpTT04iLCJXb3JrZXIiLCJBY3RvciIsImdsb2JhbFJUTFRleHRQbHVnaW4iLCJTdHlsZUxheWVySW5kZXgiXSwibWFwcGluZ3MiOiI7O0lBQUE7Ozs7OztJQU1BQSxJQUFNLGlCQUFpQixHQUFHLE9BQU8sV0FBVyxLQUFLLFdBQVcsQ0FBQztJQUM3REEsSUFBTSxPQUFPLEdBQUcsRUFBRSxDQUFDOztJQUVuQixPQUFPLENBQUMsZ0JBQWdCLGFBQUksR0FBRyxVQUFVO1FBQ3JDLElBQUksaUJBQWlCLElBQUksV0FBVyxJQUFJLFdBQVcsQ0FBQyxnQkFBZ0I7Y0FDaEUsT0FBTyxXQUFXLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLEdBQUM7O2NBRXpDLE9BQU8sS0FBSyxHQUFDO0tBQ3BCLENBQUM7O0lBRUYsT0FBTyxDQUFDLElBQUksYUFBSSxJQUFJLFVBQVU7UUFDMUIsSUFBSSxpQkFBaUIsSUFBSSxXQUFX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QU0sRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUU7UUFDcEUsT0FBTyxJQUFJLE1BQU0sQ0FBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsU0FBUyxDQUFDLENBQUM7S0FDOUQ7O0lBRUQsU0FBUyxNQUFNLENBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRTs7O1FBQ3JELElBQUksR0FBRyxJQUFJLElBQUksV0FBVyxDQUFDO1FBQzNCLElBQUksR0FBRyxJQUFJLElBQUksV0FBVyxDQUFDO1FBQzNCLFNBQVMsR0FBRyxTQUFTLElBQUksS0FBSyxDQUFDOztRQUUvQixJQUFJLENBQUMsUUFBUSxHQUFHLFFBQVEsSUFBSSxFQUFFLENBQUM7UUFDL0IsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7O1FBRXJCLElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxTQUFTLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3hDLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxTQUFTLENBQUMsTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQzs7UUFFL0MsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDcENULE1BQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ2hCQSxNQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDckNBLE1BQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDNUM7O1FBRURZLE1BQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0tBQ3pFOztJQUVELE1BQU0sQ0FBQyxTQUFTLEdBQUc7UUFDZixLQUFLLEVBQUUsVUFBVSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUU7WUFDckMsT0FBTyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7U0FDOUU7O1FBRUQsTUFBTSxFQUFFLFVBQVUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUU7WUFDdkIsT0FBTyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztTQUNoRTtLQUNKLENBQUM7O0lBRUYsU0FBUyxXQUFXLENBQUMsQ0FBQyxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRTtJQUN4QyxTQUFTLFdBQVcsQ0FBQyxDQUFDLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFOztJQ3JDekIsU0FBUyxZQUFZLENBQUMsT0FBTyxFQUFFO1FBQzFDLE9BQU8sSUFBSSxZQUFZLENBQUMsT0FBTyxDQUFDLENBQUM7S0FDcEM7O0lBRUQsU0FBUyxZQUFZLENBQUMsT0FBTyxFQUFFO1FBQzNCLElBQUksQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQzVELElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEdBQUcsQ0FBQyxDQUFDLENBQUM7S0FDcEQ7O0lBRUQsWUFBWSxDQUFDLFNBQVMsR0FBRztRQUNyQixPQUFPLEVBQUU7WUFDTCxPQUFPLEVBQUUsQ0FBQztZQUNWLE9BQU8sRUFBRSxFQUFFO1lBQ1gsTUFBTSxFQUFFLEVBQUU7WUFDVixNQUFNLEVBQUUsR0FBRztZQUNYLFFBQVEsRUFBRSxFQUFFO1lBQ1osR0FBRyxFQUFFLEtBQUs7OztZQUdWLE1BQU0sRUFBRSxJQUFJOzs7WUFHWixPQUFPLEVBQUUsWUFBWSxFQUFFLE9BQU8sRUFBRSxDQUFDLEVBQUU7OztZQUduQyxHQUFHLEVBQUUsVUFBVSxLQUFLLEVBQUUsRUFBRSxPQUFPLEtBQUssQ0FBQyxFQUFFO1NBQzFDOztRQUVELElBQUksRUFBRSxVQUFVLE1BQU0sRUFBRTs7O1lBQ3BCLElBQUksR0FBRyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDOztZQUUzQixJQUFJLEdBQUcsSUFBRSxPQUFPLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFDOztZQUVwQyxJQUFJLE9BQU8sR0FBRyxVQUFVLEdBQUcsTUFBTSxDQUFDLE1BQU0sR0FBRyxTQUFTLENBQUM7WUFDckQsSUFBSSxHQUFHLElBQUUsT0FBTyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBQzs7WUFFL0IsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7OztZQUdyQixJQUFJLFFBQVEsR0FBRyxFQUFFLENBQUM7WUFDbEIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7Z0JBQ3BDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFO29CQUNyQixTQUFTO2lCQUNaO2dCQUNELFFBQVEsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7YUFDbkQ7WUFDRCxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxHQUFHLENBQUMsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxRQUFRLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxZQUFZLENBQUMsQ0FBQzs7WUFFekcsSUFBSSxHQUFHLElBQUUsT0FBTyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsR0FBQzs7OztZQUlsQyxLQUFLLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUMsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDLEVBQUUsRUFBRTtnQkFDL0QsSUFBSSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7OztnQkFHdEIsUUFBUSxHQUFHWixNQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDdENBLE1BQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsTUFBTSxDQUFDLFFBQVEsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFQSxNQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxZQUFZLENBQUMsQ0FBQzs7Z0JBRWxGLElBQUksR0FBRyxJQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsMEJBQTBCLEVBQUUsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsR0FBRyxDQUFDLEdBQUM7YUFDM0Y7O1lBRUQsSUFBSSxHQUFHLElBQUUsT0FBTyxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsR0FBQzs7WUFFdkMsT0FBTyxJQUFJLENBQUM7U0FDZjs7UUFFRCxXQUFXLEVBQUUsVUFBVSxJQUFJLEVBQUUsSUFBSSxFQUFFOzs7WUFDL0IsSUFBSSxNQUFNLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksR0FBRyxHQUFHLEdBQUcsSUFBSSxHQUFHLEdBQUcsR0FBRyxDQUFDO1lBQ3ZELElBQUksTUFBTSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNsRCxJQUFJLE1BQU0sR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxHQUFHLEdBQUcsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxHQUFHLEdBQUcsR0FBRyxJQUFJLEdBQUcsR0FBRyxHQUFHLENBQUM7WUFDL0UsSUFBSSxNQUFNLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDOztZQUVsRCxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksR0FBRyxFQUFFO2dCQUMxQixNQUFNLEdBQUcsQ0FBQyxHQUFHLENBQUM7Z0JBQ2QsTUFBTSxHQUFHLEdBQUcsQ0FBQzthQUNoQixNQUFNLElBQUksTUFBTSxHQUFHLE1BQU0sRUFBRTtnQkFDeEIsSUFBSSxVQUFVLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsR0FBRyxFQUFFLE1BQU0sQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO2dCQUN2RSxJQUFJLFVBQVUsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxNQUFNLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztnQkFDeEUsT0FBTyxVQUFVLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDO2FBQ3hD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
