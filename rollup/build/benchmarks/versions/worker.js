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
        var request = __chunk_1.getArrayBuffer(params.request, function (err        , data              , cacheControl         , expires         ) {
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
                  workerTile.status = 'done';
                  this$1.loaded[uid] = workerTile;
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
                  // if there was no vector tile data on the initial load, don't try and re-parse tile
                  if (workerTile.vectorTile) {
                      workerTile.parse(workerTile.vectorTile, this.layerIndex, this.actor, done);
                  } else {
                      done();
                  }
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

            this.loadGeoJSON(params, function (err        , data         ) {
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
        GeoJSONWorkerSource.prototype.loadGeoJSON = function loadGeoJSON (params                       , callback                          ) {
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

    Worker$1.prototype.setReferrer = function setReferrer (mapID    , referrer    ) {
        this.referrer = referrer;
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
        self.worker = new Worker$1(self);
    }

    return Worker$1;

});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2VyLmpzIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zcmMvdXRpbC9wZXJmb3JtYW5jZS5qcyIsIi4uLy4uLy4uLy4uL3NyYy9zb3VyY2UvdmVjdG9yX3RpbGVfd29ya2VyX3NvdXJjZS5qcyIsIi4uLy4uLy4uLy4uL3NyYy9zb3VyY2UvcmFzdGVyX2RlbV90aWxlX3dvcmtlcl9zb3VyY2UuanMiLCIuLi8uLi8uLi8uLi9ub2RlX21vZHVsZXMvd2dzODQvaW5kZXguanMiLCIuLi8uLi8uLi8uLi9ub2RlX21vZHVsZXMvQG1hcGJveC9nZW9qc29uLWFyZWEvaW5kZXguanMiLCIuLi8uLi8uLi8uLi9ub2RlX21vZHVsZXMvZ2VvanNvbi1yZXdpbmQvaW5kZXguanMiLCIuLi8uLi8uLi8uLi9zcmMvc291cmNlL2dlb2pzb25fd3JhcHBlci5qcyIsIi4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy92dC1wYmYvbGliL2dlb2pzb25fd3JhcHBlci5qcyIsIi4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy92dC1wYmYvaW5kZXguanMiLCIuLi8uLi8uLi8uLi9ub2RlX21vZHVsZXMva2RidXNoL3NyYy9zb3J0LmpzIiwiLi4vLi4vLi4vLi4vbm9kZV9tb2R1bGVzL2tkYnVzaC9zcmMvcmFuZ2UuanMiLCIuLi8uLi8uLi8uLi9ub2RlX21vZHVsZXMva2RidXNoL3NyYy93aXRoaW4uanMiLCIuLi8uLi8uLi8uLi9ub2RlX21vZHVsZXMva2RidXNoL3NyYy9pbmRleC5qcyIsIi4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy9zdXBlcmNsdXN0ZXIvaW5kZXguanMiLCIuLi8uLi8uLi8uLi9ub2RlX21vZHVsZXMvZ2VvanNvbi12dC9zcmMvc2ltcGxpZnkuanMiLCIuLi8uLi8uLi8uLi9ub2RlX21vZHVsZXMvZ2VvanNvbi12dC9zcmMvZmVhdHVyZS5qcyIsIi4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy9nZW9qc29uLXZ0L3NyYy9jb252ZXJ0LmpzIiwiLi4vLi4vLi4vLi4vbm9kZV9tb2R1bGVzL2dlb2pzb24tdnQvc3JjL2NsaXAuanMiLCIuLi8uLi8uLi8uLi9ub2RlX21vZHVsZXMvZ2VvanNvbi12dC9zcmMvd3JhcC5qcyIsIi4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy9nZW9qc29uLXZ0L3NyYy90cmFuc2Zvcm0uanMiLCIuLi8uLi8uLi8uLi9ub2RlX21vZHVsZXMvZ2VvanNvbi12dC9zcmMvdGlsZS5qcyIsIi4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy9nZW9qc29uLXZ0L3NyYy9pbmRleC5qcyIsIi4uLy4uLy4uLy4uL3NyYy9zb3VyY2UvZ2VvanNvbl93b3JrZXJfc291cmNlLmpzIiwiLi4vLi4vLi4vLi4vc3JjL3NvdXJjZS93b3JrZXIuanMiXSwic291cmNlc0NvbnRlbnQiOlsiLy8gQGZsb3dcblxuaW1wb3J0IHR5cGUge1JlcXVlc3RQYXJhbWV0ZXJzfSBmcm9tICcuLi91dGlsL2FqYXgnO1xuXG4vLyBXcmFwcyBwZXJmb3JtYW5jZSB0byBmYWNpbGl0YXRlIHRlc3Rpbmdcbi8vIE5vdCBpbmNvcnBvcmF0ZWQgaW50byBicm93c2VyLmpzIGJlY2F1c2UgdGhlIGxhdHRlciBpcyBwb2lzb25vdXMgd2hlbiB1c2VkIG91dHNpZGUgdGhlIG1haW4gdGhyZWFkXG5jb25zdCBwZXJmb3JtYW5jZUV4aXN0cyA9IHR5cGVvZiBwZXJmb3JtYW5jZSAhPT0gJ3VuZGVmaW5lZCc7XG5jb25zdCB3cmFwcGVyID0ge307XG5cbndyYXBwZXIuZ2V0RW50cmllc0J5TmFtZSA9ICh1cmw6IHN0cmluZykgPT4ge1xuICAgIGlmIChwZXJmb3JtYW5jZUV4aXN0cyAmJiBwZXJmb3JtYW5jZSAmJiBwZXJmb3JtYW5jZS5nZXRFbnRyaWVzQnlOYW1lKVxuICAgICAgICByZXR1cm4gcGVyZm9ybWFuY2UuZ2V0RW50cmllc0J5TmFtZSh1cmwpO1xuICAgIGVsc2VcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xufTtcblxud3JhcHBlci5tYXJrID0gKG5hbWU6IHN0cmluZykgPT4ge1xuICAgIGlmIChwZXJmb3JtYW5jZUV4aXN0cyAmJiBwZXJmb3JtYW5jZSAmJiBwZXJmb3JtYW5jZS5tYXJrKVxuICAgICAgICByZXR1cm4gcGVyZm9ybWFuY2UubWFyayhuYW1lKTtcbiAgICBlbHNlXG4gICAgICAgIHJldHVybiBmYWxzZTtcbn07XG5cbndyYXBwZXIubWVhc3VyZSA9IChuYW1lOiBzdHJpbmcsIHN0YXJ0TWFyazogc3RyaW5nLCBlbmRNYXJrOiBzdHJpbmcpID0+IHtcbiAgICBpZiAocGVyZm9ybWFuY2VFeGlzdHMgJiYgcGVyZm9ybWFuY2UgJiYgcGVyZm9ybWFuY2UubWVhc3VyZSlcbiAgICAgICAgcmV0dXJuIHBlcmZvcm1hbmNlLm1lYXN1cmUobmFtZSwgc3RhcnRNYXJrLCBlbmRNYXJrKTtcbiAgICBlbHNlXG4gICAgICAgIHJldHVybiBmYWxzZTtcbn07XG5cbndyYXBwZXIuY2xlYXJNYXJrcyA9IChuYW1lOiBzdHJpbmcpID0+IHtcbiAgICBpZiAocGVyZm9ybWFuY2VFeGlzdHMgJiYgcGVyZm9ybWFuY2UgJiYgcGVyZm9ybWFuY2UuY2xlYXJNYXJrcylcbiAgICAgICAgcmV0dXJuIHBlcmZvcm1hbmNlLmNsZWFyTWFya3MobmFtZSk7XG4gICAgZWxzZVxuICAgICAgICByZXR1cm4gZmFsc2U7XG59O1xuXG53cmFwcGVyLmNsZWFyTWVhc3VyZXMgPSAobmFtZTogc3RyaW5nKSA9PiB7XG4gICAgaWYgKHBlcmZvcm1hbmNlRXhpc3RzICYmIHBlcmZvcm1hbmNlICYmIHBlcmZvcm1hbmNlLmNsZWFyTWVhc3VyZXMpXG4gICAgICAgIHJldHVybiBwZXJmb3JtYW5jZS5jbGVhck1lYXN1cmVzKG5hbWUpO1xuICAgIGVsc2VcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xufTtcblxuLyoqXG4gKiBTYWZlIHdyYXBwZXIgZm9yIHRoZSBwZXJmb3JtYW5jZSByZXNvdXJjZSB0aW1pbmcgQVBJIGluIHdlYiB3b3JrZXJzIHdpdGggZ3JhY2VmdWwgZGVncmFkYXRpb25cbiAqXG4gKiBAcGFyYW0ge1JlcXVlc3RQYXJhbWV0ZXJzfSByZXF1ZXN0XG4gKiBAcHJpdmF0ZVxuICovXG5jbGFzcyBQZXJmb3JtYW5jZSB7XG4gICAgX21hcmtzOiB7c3RhcnQ6IHN0cmluZywgZW5kOiBzdHJpbmcsIG1lYXN1cmU6IHN0cmluZ307XG5cbiAgICBjb25zdHJ1Y3RvciAocmVxdWVzdDogUmVxdWVzdFBhcmFtZXRlcnMpIHtcbiAgICAgICAgdGhpcy5fbWFya3MgPSB7XG4gICAgICAgICAgICBzdGFydDogW3JlcXVlc3QudXJsLCAnc3RhcnQnXS5qb2luKCcjJyksXG4gICAgICAgICAgICBlbmQ6IFtyZXF1ZXN0LnVybCwgJ2VuZCddLmpvaW4oJyMnKSxcbiAgICAgICAgICAgIG1lYXN1cmU6IHJlcXVlc3QudXJsLnRvU3RyaW5nKClcbiAgICAgICAgfTtcblxuICAgICAgICB3cmFwcGVyLm1hcmsodGhpcy5fbWFya3Muc3RhcnQpO1xuICAgIH1cblxuICAgIGZpbmlzaCgpIHtcbiAgICAgICAgd3JhcHBlci5tYXJrKHRoaXMuX21hcmtzLmVuZCk7XG4gICAgICAgIGxldCByZXNvdXJjZVRpbWluZ0RhdGEgPSB3cmFwcGVyLmdldEVudHJpZXNCeU5hbWUodGhpcy5fbWFya3MubWVhc3VyZSk7XG5cbiAgICAgICAgLy8gZmFsbGJhY2sgaWYgd2ViIHdvcmtlciBpbXBsZW1lbnRhdGlvbiBvZiBwZXJmLmdldEVudHJpZXNCeU5hbWUgcmV0dXJucyBlbXB0eVxuICAgICAgICBpZiAocmVzb3VyY2VUaW1pbmdEYXRhLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgd3JhcHBlci5tZWFzdXJlKHRoaXMuX21hcmtzLm1lYXN1cmUsIHRoaXMuX21hcmtzLnN0YXJ0LCB0aGlzLl9tYXJrcy5lbmQpO1xuICAgICAgICAgICAgcmVzb3VyY2VUaW1pbmdEYXRhID0gd3JhcHBlci5nZXRFbnRyaWVzQnlOYW1lKHRoaXMuX21hcmtzLm1lYXN1cmUpO1xuXG4gICAgICAgICAgICAvLyBjbGVhbnVwXG4gICAgICAgICAgICB3cmFwcGVyLmNsZWFyTWFya3ModGhpcy5fbWFya3Muc3RhcnQpO1xuICAgICAgICAgICAgd3JhcHBlci5jbGVhck1hcmtzKHRoaXMuX21hcmtzLmVuZCk7XG4gICAgICAgICAgICB3cmFwcGVyLmNsZWFyTWVhc3VyZXModGhpcy5fbWFya3MubWVhc3VyZSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcmVzb3VyY2VUaW1pbmdEYXRhO1xuICAgIH1cbn1cblxud3JhcHBlci5QZXJmb3JtYW5jZSA9IFBlcmZvcm1hbmNlO1xuXG5leHBvcnQgZGVmYXVsdCB3cmFwcGVyO1xuIiwiLy8gQGZsb3dcblxuaW1wb3J0IHsgZ2V0QXJyYXlCdWZmZXIgfSBmcm9tICcuLi91dGlsL2FqYXgnO1xuXG5pbXBvcnQgdnQgZnJvbSAnQG1hcGJveC92ZWN0b3ItdGlsZSc7XG5pbXBvcnQgUHJvdG9idWYgZnJvbSAncGJmJztcbmltcG9ydCBXb3JrZXJUaWxlIGZyb20gJy4vd29ya2VyX3RpbGUnO1xuaW1wb3J0IHsgZXh0ZW5kIH0gZnJvbSAnLi4vdXRpbC91dGlsJztcbmltcG9ydCBwZXJmb3JtYW5jZSBmcm9tICcuLi91dGlsL3BlcmZvcm1hbmNlJztcblxuaW1wb3J0IHR5cGUge1xuICAgIFdvcmtlclNvdXJjZSxcbiAgICBXb3JrZXJUaWxlUGFyYW1ldGVycyxcbiAgICBXb3JrZXJUaWxlQ2FsbGJhY2ssXG4gICAgVGlsZVBhcmFtZXRlcnNcbn0gZnJvbSAnLi4vc291cmNlL3dvcmtlcl9zb3VyY2UnO1xuXG5pbXBvcnQgdHlwZSB7UGVyZm9ybWFuY2VSZXNvdXJjZVRpbWluZ30gZnJvbSAnLi4vdHlwZXMvcGVyZm9ybWFuY2VfcmVzb3VyY2VfdGltaW5nJztcbmltcG9ydCB0eXBlIEFjdG9yIGZyb20gJy4uL3V0aWwvYWN0b3InO1xuaW1wb3J0IHR5cGUgU3R5bGVMYXllckluZGV4IGZyb20gJy4uL3N0eWxlL3N0eWxlX2xheWVyX2luZGV4JztcbmltcG9ydCB0eXBlIHtDYWxsYmFja30gZnJvbSAnLi4vdHlwZXMvY2FsbGJhY2snO1xuXG5leHBvcnQgdHlwZSBMb2FkVmVjdG9yVGlsZVJlc3VsdCA9IHtcbiAgICB2ZWN0b3JUaWxlOiBWZWN0b3JUaWxlO1xuICAgIHJhd0RhdGE6IEFycmF5QnVmZmVyO1xuICAgIGV4cGlyZXM/OiBhbnk7XG4gICAgY2FjaGVDb250cm9sPzogYW55O1xuICAgIHJlc291cmNlVGltaW5nPzogQXJyYXk8UGVyZm9ybWFuY2VSZXNvdXJjZVRpbWluZz47XG59O1xuXG4vKipcbiAqIEBjYWxsYmFjayBMb2FkVmVjdG9yRGF0YUNhbGxiYWNrXG4gKiBAcGFyYW0gZXJyb3JcbiAqIEBwYXJhbSB2ZWN0b3JUaWxlXG4gKiBAcHJpdmF0ZVxuICovXG5leHBvcnQgdHlwZSBMb2FkVmVjdG9yRGF0YUNhbGxiYWNrID0gQ2FsbGJhY2s8P0xvYWRWZWN0b3JUaWxlUmVzdWx0PjtcblxuZXhwb3J0IHR5cGUgQWJvcnRWZWN0b3JEYXRhID0gKCkgPT4gdm9pZDtcbmV4cG9ydCB0eXBlIExvYWRWZWN0b3JEYXRhID0gKHBhcmFtczogV29ya2VyVGlsZVBhcmFtZXRlcnMsIGNhbGxiYWNrOiBMb2FkVmVjdG9yRGF0YUNhbGxiYWNrKSA9PiA/QWJvcnRWZWN0b3JEYXRhO1xuXG4vKipcbiAqIEBwcml2YXRlXG4gKi9cbmZ1bmN0aW9uIGxvYWRWZWN0b3JUaWxlKHBhcmFtczogV29ya2VyVGlsZVBhcmFtZXRlcnMsIGNhbGxiYWNrOiBMb2FkVmVjdG9yRGF0YUNhbGxiYWNrKSB7XG4gICAgY29uc3QgcmVxdWVzdCA9IGdldEFycmF5QnVmZmVyKHBhcmFtcy5yZXF1ZXN0LCAoZXJyOiA/RXJyb3IsIGRhdGE6ID9BcnJheUJ1ZmZlciwgY2FjaGVDb250cm9sOiA/c3RyaW5nLCBleHBpcmVzOiA/c3RyaW5nKSA9PiB7XG4gICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKGVycik7XG4gICAgICAgIH0gZWxzZSBpZiAoZGF0YSkge1xuICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwge1xuICAgICAgICAgICAgICAgIHZlY3RvclRpbGU6IG5ldyB2dC5WZWN0b3JUaWxlKG5ldyBQcm90b2J1ZihkYXRhKSksXG4gICAgICAgICAgICAgICAgcmF3RGF0YTogZGF0YSxcbiAgICAgICAgICAgICAgICBjYWNoZUNvbnRyb2w6IGNhY2hlQ29udHJvbCxcbiAgICAgICAgICAgICAgICBleHBpcmVzOiBleHBpcmVzXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiAoKSA9PiB7XG4gICAgICAgIHJlcXVlc3QuY2FuY2VsKCk7XG4gICAgICAgIGNhbGxiYWNrKCk7XG4gICAgfTtcbn1cblxuLyoqXG4gKiBUaGUge0BsaW5rIFdvcmtlclNvdXJjZX0gaW1wbGVtZW50YXRpb24gdGhhdCBzdXBwb3J0cyB7QGxpbmsgVmVjdG9yVGlsZVNvdXJjZX0uXG4gKiBUaGlzIGNsYXNzIGlzIGRlc2lnbmVkIHRvIGJlIGVhc2lseSByZXVzZWQgdG8gc3VwcG9ydCBjdXN0b20gc291cmNlIHR5cGVzXG4gKiBmb3IgZGF0YSBmb3JtYXRzIHRoYXQgY2FuIGJlIHBhcnNlZC9jb252ZXJ0ZWQgaW50byBhbiBpbi1tZW1vcnkgVmVjdG9yVGlsZVxuICogcmVwcmVzZW50YXRpb24uICBUbyBkbyBzbywgY3JlYXRlIGl0IHdpdGhcbiAqIGBuZXcgVmVjdG9yVGlsZVdvcmtlclNvdXJjZShhY3Rvciwgc3R5bGVMYXllcnMsIGN1c3RvbUxvYWRWZWN0b3JEYXRhRnVuY3Rpb24pYC5cbiAqXG4gKiBAcHJpdmF0ZVxuICovXG5jbGFzcyBWZWN0b3JUaWxlV29ya2VyU291cmNlIGltcGxlbWVudHMgV29ya2VyU291cmNlIHtcbiAgICBhY3RvcjogQWN0b3I7XG4gICAgbGF5ZXJJbmRleDogU3R5bGVMYXllckluZGV4O1xuICAgIGxvYWRWZWN0b3JEYXRhOiBMb2FkVmVjdG9yRGF0YTtcbiAgICBsb2FkaW5nOiB7IFtzdHJpbmddOiBXb3JrZXJUaWxlIH07XG4gICAgbG9hZGVkOiB7IFtzdHJpbmddOiBXb3JrZXJUaWxlIH07XG5cbiAgICAvKipcbiAgICAgKiBAcGFyYW0gW2xvYWRWZWN0b3JEYXRhXSBPcHRpb25hbCBtZXRob2QgZm9yIGN1c3RvbSBsb2FkaW5nIG9mIGEgVmVjdG9yVGlsZVxuICAgICAqIG9iamVjdCBiYXNlZCBvbiBwYXJhbWV0ZXJzIHBhc3NlZCBmcm9tIHRoZSBtYWluLXRocmVhZCBTb3VyY2UuIFNlZVxuICAgICAqIHtAbGluayBWZWN0b3JUaWxlV29ya2VyU291cmNlI2xvYWRUaWxlfS4gVGhlIGRlZmF1bHQgaW1wbGVtZW50YXRpb24gc2ltcGx5XG4gICAgICogbG9hZHMgdGhlIHBiZiBhdCBgcGFyYW1zLnVybGAuXG4gICAgICovXG4gICAgY29uc3RydWN0b3IoYWN0b3I6IEFjdG9yLCBsYXllckluZGV4OiBTdHlsZUxheWVySW5kZXgsIGxvYWRWZWN0b3JEYXRhOiA/TG9hZFZlY3RvckRhdGEpIHtcbiAgICAgICAgdGhpcy5hY3RvciA9IGFjdG9yO1xuICAgICAgICB0aGlzLmxheWVySW5kZXggPSBsYXllckluZGV4O1xuICAgICAgICB0aGlzLmxvYWRWZWN0b3JEYXRhID0gbG9hZFZlY3RvckRhdGEgfHwgbG9hZFZlY3RvclRpbGU7XG4gICAgICAgIHRoaXMubG9hZGluZyA9IHt9O1xuICAgICAgICB0aGlzLmxvYWRlZCA9IHt9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEltcGxlbWVudHMge0BsaW5rIFdvcmtlclNvdXJjZSNsb2FkVGlsZX0uIERlbGVnYXRlcyB0b1xuICAgICAqIHtAbGluayBWZWN0b3JUaWxlV29ya2VyU291cmNlI2xvYWRWZWN0b3JEYXRhfSAod2hpY2ggYnkgZGVmYXVsdCBleHBlY3RzXG4gICAgICogYSBgcGFyYW1zLnVybGAgcHJvcGVydHkpIGZvciBmZXRjaGluZyBhbmQgcHJvZHVjaW5nIGEgVmVjdG9yVGlsZSBvYmplY3QuXG4gICAgICovXG4gICAgbG9hZFRpbGUocGFyYW1zOiBXb3JrZXJUaWxlUGFyYW1ldGVycywgY2FsbGJhY2s6IFdvcmtlclRpbGVDYWxsYmFjaykge1xuICAgICAgICBjb25zdCB1aWQgPSBwYXJhbXMudWlkO1xuXG4gICAgICAgIGlmICghdGhpcy5sb2FkaW5nKVxuICAgICAgICAgICAgdGhpcy5sb2FkaW5nID0ge307XG5cbiAgICAgICAgY29uc3QgcGVyZiA9IChwYXJhbXMgJiYgcGFyYW1zLnJlcXVlc3QgJiYgcGFyYW1zLnJlcXVlc3QuY29sbGVjdFJlc291cmNlVGltaW5nKSA/XG4gICAgICAgICAgICBuZXcgcGVyZm9ybWFuY2UuUGVyZm9ybWFuY2UocGFyYW1zLnJlcXVlc3QpIDogZmFsc2U7XG5cbiAgICAgICAgY29uc3Qgd29ya2VyVGlsZSA9IHRoaXMubG9hZGluZ1t1aWRdID0gbmV3IFdvcmtlclRpbGUocGFyYW1zKTtcbiAgICAgICAgd29ya2VyVGlsZS5hYm9ydCA9IHRoaXMubG9hZFZlY3RvckRhdGEocGFyYW1zLCAoZXJyLCByZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgZGVsZXRlIHRoaXMubG9hZGluZ1t1aWRdO1xuXG4gICAgICAgICAgICBpZiAoZXJyIHx8ICFyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIHdvcmtlclRpbGUuc3RhdHVzID0gJ2RvbmUnO1xuICAgICAgICAgICAgICAgIHRoaXMubG9hZGVkW3VpZF0gPSB3b3JrZXJUaWxlO1xuICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCByYXdUaWxlRGF0YSA9IHJlc3BvbnNlLnJhd0RhdGE7XG4gICAgICAgICAgICBjb25zdCBjYWNoZUNvbnRyb2wgPSB7fTtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5leHBpcmVzKSBjYWNoZUNvbnRyb2wuZXhwaXJlcyA9IHJlc3BvbnNlLmV4cGlyZXM7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UuY2FjaGVDb250cm9sKSBjYWNoZUNvbnRyb2wuY2FjaGVDb250cm9sID0gcmVzcG9uc2UuY2FjaGVDb250cm9sO1xuXG4gICAgICAgICAgICBjb25zdCByZXNvdXJjZVRpbWluZyA9IHt9O1xuICAgICAgICAgICAgaWYgKHBlcmYpIHtcbiAgICAgICAgICAgICAgICBjb25zdCByZXNvdXJjZVRpbWluZ0RhdGEgPSBwZXJmLmZpbmlzaCgpO1xuICAgICAgICAgICAgICAgIC8vIGl0J3MgbmVjZXNzYXJ5IHRvIGV2YWwgdGhlIHJlc3VsdCBvZiBnZXRFbnRyaWVzQnlOYW1lKCkgaGVyZSB2aWEgcGFyc2Uvc3RyaW5naWZ5XG4gICAgICAgICAgICAgICAgLy8gbGF0ZSBldmFsdWF0aW9uIGluIHRoZSBtYWluIHRocmVhZCBjYXVzZXMgVHlwZUVycm9yOiBpbGxlZ2FsIGludm9jYXRpb25cbiAgICAgICAgICAgICAgICBpZiAocmVzb3VyY2VUaW1pbmdEYXRhKVxuICAgICAgICAgICAgICAgICAgICByZXNvdXJjZVRpbWluZy5yZXNvdXJjZVRpbWluZyA9IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkocmVzb3VyY2VUaW1pbmdEYXRhKSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHdvcmtlclRpbGUudmVjdG9yVGlsZSA9IHJlc3BvbnNlLnZlY3RvclRpbGU7XG4gICAgICAgICAgICB3b3JrZXJUaWxlLnBhcnNlKHJlc3BvbnNlLnZlY3RvclRpbGUsIHRoaXMubGF5ZXJJbmRleCwgdGhpcy5hY3RvciwgKGVyciwgcmVzdWx0KSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGVyciB8fCAhcmVzdWx0KSByZXR1cm4gY2FsbGJhY2soZXJyKTtcblxuICAgICAgICAgICAgICAgIC8vIFRyYW5zZmVycmluZyBhIGNvcHkgb2YgcmF3VGlsZURhdGEgYmVjYXVzZSB0aGUgd29ya2VyIG5lZWRzIHRvIHJldGFpbiBpdHMgY29weS5cbiAgICAgICAgICAgICAgICBjYWxsYmFjayhudWxsLCBleHRlbmQoe3Jhd1RpbGVEYXRhOiByYXdUaWxlRGF0YS5zbGljZSgwKX0sIHJlc3VsdCwgY2FjaGVDb250cm9sLCByZXNvdXJjZVRpbWluZykpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHRoaXMubG9hZGVkID0gdGhpcy5sb2FkZWQgfHwge307XG4gICAgICAgICAgICB0aGlzLmxvYWRlZFt1aWRdID0gd29ya2VyVGlsZTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogSW1wbGVtZW50cyB7QGxpbmsgV29ya2VyU291cmNlI3JlbG9hZFRpbGV9LlxuICAgICAqL1xuICAgIHJlbG9hZFRpbGUocGFyYW1zOiBXb3JrZXJUaWxlUGFyYW1ldGVycywgY2FsbGJhY2s6IFdvcmtlclRpbGVDYWxsYmFjaykge1xuICAgICAgICBjb25zdCBsb2FkZWQgPSB0aGlzLmxvYWRlZCxcbiAgICAgICAgICAgIHVpZCA9IHBhcmFtcy51aWQsXG4gICAgICAgICAgICB2dFNvdXJjZSA9IHRoaXM7XG4gICAgICAgIGlmIChsb2FkZWQgJiYgbG9hZGVkW3VpZF0pIHtcbiAgICAgICAgICAgIGNvbnN0IHdvcmtlclRpbGUgPSBsb2FkZWRbdWlkXTtcbiAgICAgICAgICAgIHdvcmtlclRpbGUuc2hvd0NvbGxpc2lvbkJveGVzID0gcGFyYW1zLnNob3dDb2xsaXNpb25Cb3hlcztcblxuICAgICAgICAgICAgY29uc3QgZG9uZSA9IChlcnIsIGRhdGEpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCByZWxvYWRDYWxsYmFjayA9IHdvcmtlclRpbGUucmVsb2FkQ2FsbGJhY2s7XG4gICAgICAgICAgICAgICAgaWYgKHJlbG9hZENhbGxiYWNrKSB7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSB3b3JrZXJUaWxlLnJlbG9hZENhbGxiYWNrO1xuICAgICAgICAgICAgICAgICAgICB3b3JrZXJUaWxlLnBhcnNlKHdvcmtlclRpbGUudmVjdG9yVGlsZSwgdnRTb3VyY2UubGF5ZXJJbmRleCwgdnRTb3VyY2UuYWN0b3IsIHJlbG9hZENhbGxiYWNrKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZXJyLCBkYXRhKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIGlmICh3b3JrZXJUaWxlLnN0YXR1cyA9PT0gJ3BhcnNpbmcnKSB7XG4gICAgICAgICAgICAgICAgd29ya2VyVGlsZS5yZWxvYWRDYWxsYmFjayA9IGRvbmU7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHdvcmtlclRpbGUuc3RhdHVzID09PSAnZG9uZScpIHtcbiAgICAgICAgICAgICAgICAvLyBpZiB0aGVyZSB3YXMgbm8gdmVjdG9yIHRpbGUgZGF0YSBvbiB0aGUgaW5pdGlhbCBsb2FkLCBkb24ndCB0cnkgYW5kIHJlLXBhcnNlIHRpbGVcbiAgICAgICAgICAgICAgICBpZiAod29ya2VyVGlsZS52ZWN0b3JUaWxlKSB7XG4gICAgICAgICAgICAgICAgICAgIHdvcmtlclRpbGUucGFyc2Uod29ya2VyVGlsZS52ZWN0b3JUaWxlLCB0aGlzLmxheWVySW5kZXgsIHRoaXMuYWN0b3IsIGRvbmUpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGRvbmUoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBJbXBsZW1lbnRzIHtAbGluayBXb3JrZXJTb3VyY2UjYWJvcnRUaWxlfS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSBwYXJhbXNcbiAgICAgKiBAcGFyYW0gcGFyYW1zLnVpZCBUaGUgVUlEIGZvciB0aGlzIHRpbGUuXG4gICAgICovXG4gICAgYWJvcnRUaWxlKHBhcmFtczogVGlsZVBhcmFtZXRlcnMsIGNhbGxiYWNrOiBXb3JrZXJUaWxlQ2FsbGJhY2spIHtcbiAgICAgICAgY29uc3QgbG9hZGluZyA9IHRoaXMubG9hZGluZyxcbiAgICAgICAgICAgIHVpZCA9IHBhcmFtcy51aWQ7XG4gICAgICAgIGlmIChsb2FkaW5nICYmIGxvYWRpbmdbdWlkXSAmJiBsb2FkaW5nW3VpZF0uYWJvcnQpIHtcbiAgICAgICAgICAgIGxvYWRpbmdbdWlkXS5hYm9ydCgpO1xuICAgICAgICAgICAgZGVsZXRlIGxvYWRpbmdbdWlkXTtcbiAgICAgICAgfVxuICAgICAgICBjYWxsYmFjaygpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEltcGxlbWVudHMge0BsaW5rIFdvcmtlclNvdXJjZSNyZW1vdmVUaWxlfS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSBwYXJhbXNcbiAgICAgKiBAcGFyYW0gcGFyYW1zLnVpZCBUaGUgVUlEIGZvciB0aGlzIHRpbGUuXG4gICAgICovXG4gICAgcmVtb3ZlVGlsZShwYXJhbXM6IFRpbGVQYXJhbWV0ZXJzLCBjYWxsYmFjazogV29ya2VyVGlsZUNhbGxiYWNrKSB7XG4gICAgICAgIGNvbnN0IGxvYWRlZCA9IHRoaXMubG9hZGVkLFxuICAgICAgICAgICAgdWlkID0gcGFyYW1zLnVpZDtcbiAgICAgICAgaWYgKGxvYWRlZCAmJiBsb2FkZWRbdWlkXSkge1xuICAgICAgICAgICAgZGVsZXRlIGxvYWRlZFt1aWRdO1xuICAgICAgICB9XG4gICAgICAgIGNhbGxiYWNrKCk7XG4gICAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBWZWN0b3JUaWxlV29ya2VyU291cmNlO1xuIiwiLy8gQGZsb3dcblxuaW1wb3J0IERFTURhdGEgZnJvbSAnLi4vZGF0YS9kZW1fZGF0YSc7XG5cbmltcG9ydCB0eXBlIEFjdG9yIGZyb20gJy4uL3V0aWwvYWN0b3InO1xuaW1wb3J0IHR5cGUge1xuICAgIFdvcmtlckRFTVRpbGVQYXJhbWV0ZXJzLFxuICAgIFdvcmtlckRFTVRpbGVDYWxsYmFjayxcbiAgICBUaWxlUGFyYW1ldGVyc1xufSBmcm9tICcuL3dvcmtlcl9zb3VyY2UnO1xuXG5cbmNsYXNzIFJhc3RlckRFTVRpbGVXb3JrZXJTb3VyY2Uge1xuICAgIGFjdG9yOiBBY3RvcjtcbiAgICBsb2FkZWQ6IHtbc3RyaW5nXTogREVNRGF0YX07XG5cbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgdGhpcy5sb2FkZWQgPSB7fTtcbiAgICB9XG5cbiAgICBsb2FkVGlsZShwYXJhbXM6IFdvcmtlckRFTVRpbGVQYXJhbWV0ZXJzLCBjYWxsYmFjazogV29ya2VyREVNVGlsZUNhbGxiYWNrKSB7XG4gICAgICAgIGNvbnN0IHt1aWQsIGVuY29kaW5nLCByYXdJbWFnZURhdGF9ID0gcGFyYW1zO1xuICAgICAgICBjb25zdCBkZW0gPSBuZXcgREVNRGF0YSh1aWQsIHJhd0ltYWdlRGF0YSwgZW5jb2RpbmcpO1xuXG4gICAgICAgIHRoaXMubG9hZGVkID0gdGhpcy5sb2FkZWQgfHwge307XG4gICAgICAgIHRoaXMubG9hZGVkW3VpZF0gPSBkZW07XG4gICAgICAgIGNhbGxiYWNrKG51bGwsIGRlbSk7XG4gICAgfVxuXG4gICAgcmVtb3ZlVGlsZShwYXJhbXM6IFRpbGVQYXJhbWV0ZXJzKSB7XG4gICAgICAgIGNvbnN0IGxvYWRlZCA9IHRoaXMubG9hZGVkLFxuICAgICAgICAgICAgdWlkID0gcGFyYW1zLnVpZDtcbiAgICAgICAgaWYgKGxvYWRlZCAmJiBsb2FkZWRbdWlkXSkge1xuICAgICAgICAgICAgZGVsZXRlIGxvYWRlZFt1aWRdO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBSYXN0ZXJERU1UaWxlV29ya2VyU291cmNlO1xuIiwibW9kdWxlLmV4cG9ydHMuUkFESVVTID0gNjM3ODEzNztcbm1vZHVsZS5leHBvcnRzLkZMQVRURU5JTkcgPSAxLzI5OC4yNTcyMjM1NjM7XG5tb2R1bGUuZXhwb3J0cy5QT0xBUl9SQURJVVMgPSA2MzU2NzUyLjMxNDI7XG4iLCJ2YXIgd2dzODQgPSByZXF1aXJlKCd3Z3M4NCcpO1xuXG5tb2R1bGUuZXhwb3J0cy5nZW9tZXRyeSA9IGdlb21ldHJ5O1xubW9kdWxlLmV4cG9ydHMucmluZyA9IHJpbmdBcmVhO1xuXG5mdW5jdGlvbiBnZW9tZXRyeShfKSB7XG4gICAgdmFyIGFyZWEgPSAwLCBpO1xuICAgIHN3aXRjaCAoXy50eXBlKSB7XG4gICAgICAgIGNhc2UgJ1BvbHlnb24nOlxuICAgICAgICAgICAgcmV0dXJuIHBvbHlnb25BcmVhKF8uY29vcmRpbmF0ZXMpO1xuICAgICAgICBjYXNlICdNdWx0aVBvbHlnb24nOlxuICAgICAgICAgICAgZm9yIChpID0gMDsgaSA8IF8uY29vcmRpbmF0ZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICBhcmVhICs9IHBvbHlnb25BcmVhKF8uY29vcmRpbmF0ZXNbaV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGFyZWE7XG4gICAgICAgIGNhc2UgJ1BvaW50JzpcbiAgICAgICAgY2FzZSAnTXVsdGlQb2ludCc6XG4gICAgICAgIGNhc2UgJ0xpbmVTdHJpbmcnOlxuICAgICAgICBjYXNlICdNdWx0aUxpbmVTdHJpbmcnOlxuICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgIGNhc2UgJ0dlb21ldHJ5Q29sbGVjdGlvbic6XG4gICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwgXy5nZW9tZXRyaWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgYXJlYSArPSBnZW9tZXRyeShfLmdlb21ldHJpZXNbaV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGFyZWE7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBwb2x5Z29uQXJlYShjb29yZHMpIHtcbiAgICB2YXIgYXJlYSA9IDA7XG4gICAgaWYgKGNvb3JkcyAmJiBjb29yZHMubGVuZ3RoID4gMCkge1xuICAgICAgICBhcmVhICs9IE1hdGguYWJzKHJpbmdBcmVhKGNvb3Jkc1swXSkpO1xuICAgICAgICBmb3IgKHZhciBpID0gMTsgaSA8IGNvb3Jkcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgYXJlYSAtPSBNYXRoLmFicyhyaW5nQXJlYShjb29yZHNbaV0pKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gYXJlYTtcbn1cblxuLyoqXG4gKiBDYWxjdWxhdGUgdGhlIGFwcHJveGltYXRlIGFyZWEgb2YgdGhlIHBvbHlnb24gd2VyZSBpdCBwcm9qZWN0ZWQgb250b1xuICogICAgIHRoZSBlYXJ0aC4gIE5vdGUgdGhhdCB0aGlzIGFyZWEgd2lsbCBiZSBwb3NpdGl2ZSBpZiByaW5nIGlzIG9yaWVudGVkXG4gKiAgICAgY2xvY2t3aXNlLCBvdGhlcndpc2UgaXQgd2lsbCBiZSBuZWdhdGl2ZS5cbiAqXG4gKiBSZWZlcmVuY2U6XG4gKiBSb2JlcnQuIEcuIENoYW1iZXJsYWluIGFuZCBXaWxsaWFtIEguIER1cXVldHRlLCBcIlNvbWUgQWxnb3JpdGhtcyBmb3JcbiAqICAgICBQb2x5Z29ucyBvbiBhIFNwaGVyZVwiLCBKUEwgUHVibGljYXRpb24gMDctMDMsIEpldCBQcm9wdWxzaW9uXG4gKiAgICAgTGFib3JhdG9yeSwgUGFzYWRlbmEsIENBLCBKdW5lIDIwMDcgaHR0cDovL3Rycy1uZXcuanBsLm5hc2EuZ292L2RzcGFjZS9oYW5kbGUvMjAxNC80MDQwOVxuICpcbiAqIFJldHVybnM6XG4gKiB7ZmxvYXR9IFRoZSBhcHByb3hpbWF0ZSBzaWduZWQgZ2VvZGVzaWMgYXJlYSBvZiB0aGUgcG9seWdvbiBpbiBzcXVhcmVcbiAqICAgICBtZXRlcnMuXG4gKi9cblxuZnVuY3Rpb24gcmluZ0FyZWEoY29vcmRzKSB7XG4gICAgdmFyIHAxLCBwMiwgcDMsIGxvd2VySW5kZXgsIG1pZGRsZUluZGV4LCB1cHBlckluZGV4LCBpLFxuICAgIGFyZWEgPSAwLFxuICAgIGNvb3Jkc0xlbmd0aCA9IGNvb3Jkcy5sZW5ndGg7XG5cbiAgICBpZiAoY29vcmRzTGVuZ3RoID4gMikge1xuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgY29vcmRzTGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGlmIChpID09PSBjb29yZHNMZW5ndGggLSAyKSB7Ly8gaSA9IE4tMlxuICAgICAgICAgICAgICAgIGxvd2VySW5kZXggPSBjb29yZHNMZW5ndGggLSAyO1xuICAgICAgICAgICAgICAgIG1pZGRsZUluZGV4ID0gY29vcmRzTGVuZ3RoIC0xO1xuICAgICAgICAgICAgICAgIHVwcGVySW5kZXggPSAwO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChpID09PSBjb29yZHNMZW5ndGggLSAxKSB7Ly8gaSA9IE4tMVxuICAgICAgICAgICAgICAgIGxvd2VySW5kZXggPSBjb29yZHNMZW5ndGggLSAxO1xuICAgICAgICAgICAgICAgIG1pZGRsZUluZGV4ID0gMDtcbiAgICAgICAgICAgICAgICB1cHBlckluZGV4ID0gMTtcbiAgICAgICAgICAgIH0gZWxzZSB7IC8vIGkgPSAwIHRvIE4tM1xuICAgICAgICAgICAgICAgIGxvd2VySW5kZXggPSBpO1xuICAgICAgICAgICAgICAgIG1pZGRsZUluZGV4ID0gaSsxO1xuICAgICAgICAgICAgICAgIHVwcGVySW5kZXggPSBpKzI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBwMSA9IGNvb3Jkc1tsb3dlckluZGV4XTtcbiAgICAgICAgICAgIHAyID0gY29vcmRzW21pZGRsZUluZGV4XTtcbiAgICAgICAgICAgIHAzID0gY29vcmRzW3VwcGVySW5kZXhdO1xuICAgICAgICAgICAgYXJlYSArPSAoIHJhZChwM1swXSkgLSByYWQocDFbMF0pICkgKiBNYXRoLnNpbiggcmFkKHAyWzFdKSk7XG4gICAgICAgIH1cblxuICAgICAgICBhcmVhID0gYXJlYSAqIHdnczg0LlJBRElVUyAqIHdnczg0LlJBRElVUyAvIDI7XG4gICAgfVxuXG4gICAgcmV0dXJuIGFyZWE7XG59XG5cbmZ1bmN0aW9uIHJhZChfKSB7XG4gICAgcmV0dXJuIF8gKiBNYXRoLlBJIC8gMTgwO1xufSIsInZhciBnZW9qc29uQXJlYSA9IHJlcXVpcmUoJ0BtYXBib3gvZ2VvanNvbi1hcmVhJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gcmV3aW5kO1xuXG5mdW5jdGlvbiByZXdpbmQoZ2osIG91dGVyKSB7XG4gICAgc3dpdGNoICgoZ2ogJiYgZ2oudHlwZSkgfHwgbnVsbCkge1xuICAgICAgICBjYXNlICdGZWF0dXJlQ29sbGVjdGlvbic6XG4gICAgICAgICAgICBnai5mZWF0dXJlcyA9IGdqLmZlYXR1cmVzLm1hcChjdXJyeU91dGVyKHJld2luZCwgb3V0ZXIpKTtcbiAgICAgICAgICAgIHJldHVybiBnajtcbiAgICAgICAgY2FzZSAnRmVhdHVyZSc6XG4gICAgICAgICAgICBnai5nZW9tZXRyeSA9IHJld2luZChnai5nZW9tZXRyeSwgb3V0ZXIpO1xuICAgICAgICAgICAgcmV0dXJuIGdqO1xuICAgICAgICBjYXNlICdQb2x5Z29uJzpcbiAgICAgICAgY2FzZSAnTXVsdGlQb2x5Z29uJzpcbiAgICAgICAgICAgIHJldHVybiBjb3JyZWN0KGdqLCBvdXRlcik7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICByZXR1cm4gZ2o7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBjdXJyeU91dGVyKGEsIGIpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oXykgeyByZXR1cm4gYShfLCBiKTsgfTtcbn1cblxuZnVuY3Rpb24gY29ycmVjdChfLCBvdXRlcikge1xuICAgIGlmIChfLnR5cGUgPT09ICdQb2x5Z29uJykge1xuICAgICAgICBfLmNvb3JkaW5hdGVzID0gY29ycmVjdFJpbmdzKF8uY29vcmRpbmF0ZXMsIG91dGVyKTtcbiAgICB9IGVsc2UgaWYgKF8udHlwZSA9PT0gJ011bHRpUG9seWdvbicpIHtcbiAgICAgICAgXy5jb29yZGluYXRlcyA9IF8uY29vcmRpbmF0ZXMubWFwKGN1cnJ5T3V0ZXIoY29ycmVjdFJpbmdzLCBvdXRlcikpO1xuICAgIH1cbiAgICByZXR1cm4gXztcbn1cblxuZnVuY3Rpb24gY29ycmVjdFJpbmdzKF8sIG91dGVyKSB7XG4gICAgb3V0ZXIgPSAhIW91dGVyO1xuICAgIF9bMF0gPSB3aW5kKF9bMF0sIG91dGVyKTtcbiAgICBmb3IgKHZhciBpID0gMTsgaSA8IF8ubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgX1tpXSA9IHdpbmQoX1tpXSwgIW91dGVyKTtcbiAgICB9XG4gICAgcmV0dXJuIF87XG59XG5cbmZ1bmN0aW9uIHdpbmQoXywgZGlyKSB7XG4gICAgcmV0dXJuIGN3KF8pID09PSBkaXIgPyBfIDogXy5yZXZlcnNlKCk7XG59XG5cbmZ1bmN0aW9uIGN3KF8pIHtcbiAgICByZXR1cm4gZ2VvanNvbkFyZWEucmluZyhfKSA+PSAwO1xufVxuIiwiLy8gQGZsb3dcblxuaW1wb3J0IFBvaW50IGZyb20gJ0BtYXBib3gvcG9pbnQtZ2VvbWV0cnknO1xuXG5pbXBvcnQgbXZ0IGZyb20gJ0BtYXBib3gvdmVjdG9yLXRpbGUnO1xuY29uc3QgdG9HZW9KU09OID0gbXZ0LlZlY3RvclRpbGVGZWF0dXJlLnByb3RvdHlwZS50b0dlb0pTT047XG5pbXBvcnQgRVhURU5UIGZyb20gJy4uL2RhdGEvZXh0ZW50JztcblxuLy8gVGhlIGZlYXR1cmUgdHlwZSB1c2VkIGJ5IGdlb2pzb24tdnQgYW5kIHN1cGVyY2x1c3Rlci4gU2hvdWxkIGJlIGV4dHJhY3RlZCB0b1xuLy8gZ2xvYmFsIHR5cGUgYW5kIHVzZWQgaW4gbW9kdWxlIGRlZmluaXRpb25zIGZvciB0aG9zZSB0d28gbW9kdWxlcy5cbnR5cGUgRmVhdHVyZSA9IHtcbiAgICB0eXBlOiAxLFxuICAgIGlkOiBtaXhlZCxcbiAgICB0YWdzOiB7W3N0cmluZ106IHN0cmluZyB8IG51bWJlciB8IGJvb2xlYW59LFxuICAgIGdlb21ldHJ5OiBBcnJheTxbbnVtYmVyLCBudW1iZXJdPixcbn0gfCB7XG4gICAgdHlwZTogMiB8IDMsXG4gICAgaWQ6IG1peGVkLFxuICAgIHRhZ3M6IHtbc3RyaW5nXTogc3RyaW5nIHwgbnVtYmVyIHwgYm9vbGVhbn0sXG4gICAgZ2VvbWV0cnk6IEFycmF5PEFycmF5PFtudW1iZXIsIG51bWJlcl0+Pixcbn1cblxuY2xhc3MgRmVhdHVyZVdyYXBwZXIgaW1wbGVtZW50cyBWZWN0b3JUaWxlRmVhdHVyZSB7XG4gICAgX2ZlYXR1cmU6IEZlYXR1cmU7XG5cbiAgICBleHRlbnQ6IG51bWJlcjtcbiAgICB0eXBlOiAxIHwgMiB8IDM7XG4gICAgaWQ6IG51bWJlcjtcbiAgICBwcm9wZXJ0aWVzOiB7W3N0cmluZ106IHN0cmluZyB8IG51bWJlciB8IGJvb2xlYW59O1xuXG4gICAgY29uc3RydWN0b3IoZmVhdHVyZTogRmVhdHVyZSkge1xuICAgICAgICB0aGlzLl9mZWF0dXJlID0gZmVhdHVyZTtcblxuICAgICAgICB0aGlzLmV4dGVudCA9IEVYVEVOVDtcbiAgICAgICAgdGhpcy50eXBlID0gZmVhdHVyZS50eXBlO1xuICAgICAgICB0aGlzLnByb3BlcnRpZXMgPSBmZWF0dXJlLnRhZ3M7XG5cbiAgICAgICAgLy8gSWYgdGhlIGZlYXR1cmUgaGFzIGEgdG9wLWxldmVsIGBpZGAgcHJvcGVydHksIGNvcHkgaXQgb3ZlciwgYnV0IG9ubHlcbiAgICAgICAgLy8gaWYgaXQgY2FuIGJlIGNvZXJjZWQgdG8gYW4gaW50ZWdlciwgYmVjYXVzZSB0aGlzIHdyYXBwZXIgaXMgdXNlZCBmb3JcbiAgICAgICAgLy8gc2VyaWFsaXppbmcgZ2VvanNvbiBmZWF0dXJlIGRhdGEgaW50byB2ZWN0b3IgdGlsZSBQQkYgZGF0YSwgYW5kIHRoZVxuICAgICAgICAvLyB2ZWN0b3IgdGlsZSBzcGVjIG9ubHkgc3VwcG9ydHMgaW50ZWdlciB2YWx1ZXMgZm9yIGZlYXR1cmUgaWRzIC0tXG4gICAgICAgIC8vIGFsbG93aW5nIG5vbi1pbnRlZ2VyIHZhbHVlcyBoZXJlIHJlc3VsdHMgaW4gYSBub24tY29tcGxpYW50IFBCRlxuICAgICAgICAvLyB0aGF0IGNhdXNlcyBhbiBleGNlcHRpb24gd2hlbiBpdCBpcyBwYXJzZWQgd2l0aCB2ZWN0b3ItdGlsZS1qc1xuICAgICAgICBpZiAoJ2lkJyBpbiBmZWF0dXJlICYmICFpc05hTihmZWF0dXJlLmlkKSkge1xuICAgICAgICAgICAgdGhpcy5pZCA9IHBhcnNlSW50KGZlYXR1cmUuaWQsIDEwKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGxvYWRHZW9tZXRyeSgpIHtcbiAgICAgICAgaWYgKHRoaXMuX2ZlYXR1cmUudHlwZSA9PT0gMSkge1xuICAgICAgICAgICAgY29uc3QgZ2VvbWV0cnkgPSBbXTtcbiAgICAgICAgICAgIGZvciAoY29uc3QgcG9pbnQgb2YgdGhpcy5fZmVhdHVyZS5nZW9tZXRyeSkge1xuICAgICAgICAgICAgICAgIGdlb21ldHJ5LnB1c2goW25ldyBQb2ludChwb2ludFswXSwgcG9pbnRbMV0pXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gZ2VvbWV0cnk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zdCBnZW9tZXRyeSA9IFtdO1xuICAgICAgICAgICAgZm9yIChjb25zdCByaW5nIG9mIHRoaXMuX2ZlYXR1cmUuZ2VvbWV0cnkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBuZXdSaW5nID0gW107XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBwb2ludCBvZiByaW5nKSB7XG4gICAgICAgICAgICAgICAgICAgIG5ld1JpbmcucHVzaChuZXcgUG9pbnQocG9pbnRbMF0sIHBvaW50WzFdKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGdlb21ldHJ5LnB1c2gobmV3UmluZyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gZ2VvbWV0cnk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB0b0dlb0pTT04oeDogbnVtYmVyLCB5OiBudW1iZXIsIHo6IG51bWJlcikge1xuICAgICAgICByZXR1cm4gdG9HZW9KU09OLmNhbGwodGhpcywgeCwgeSwgeik7XG4gICAgfVxufVxuXG5jbGFzcyBHZW9KU09OV3JhcHBlciBpbXBsZW1lbnRzIFZlY3RvclRpbGUsIFZlY3RvclRpbGVMYXllciB7XG4gICAgbGF5ZXJzOiB7W3N0cmluZ106IFZlY3RvclRpbGVMYXllcn07XG4gICAgbmFtZTogc3RyaW5nO1xuICAgIGV4dGVudDogbnVtYmVyO1xuICAgIGxlbmd0aDogbnVtYmVyO1xuICAgIF9mZWF0dXJlczogQXJyYXk8RmVhdHVyZT47XG5cbiAgICBjb25zdHJ1Y3RvcihmZWF0dXJlczogQXJyYXk8RmVhdHVyZT4pIHtcbiAgICAgICAgdGhpcy5sYXllcnMgPSB7ICdfZ2VvanNvblRpbGVMYXllcic6IHRoaXMgfTtcbiAgICAgICAgdGhpcy5uYW1lID0gJ19nZW9qc29uVGlsZUxheWVyJztcbiAgICAgICAgdGhpcy5leHRlbnQgPSBFWFRFTlQ7XG4gICAgICAgIHRoaXMubGVuZ3RoID0gZmVhdHVyZXMubGVuZ3RoO1xuICAgICAgICB0aGlzLl9mZWF0dXJlcyA9IGZlYXR1cmVzO1xuICAgIH1cblxuICAgIGZlYXR1cmUoaTogbnVtYmVyKTogVmVjdG9yVGlsZUZlYXR1cmUge1xuICAgICAgICByZXR1cm4gbmV3IEZlYXR1cmVXcmFwcGVyKHRoaXMuX2ZlYXR1cmVzW2ldKTtcbiAgICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IEdlb0pTT05XcmFwcGVyO1xuIiwiJ3VzZSBzdHJpY3QnXG5cbnZhciBQb2ludCA9IHJlcXVpcmUoJ0BtYXBib3gvcG9pbnQtZ2VvbWV0cnknKVxudmFyIFZlY3RvclRpbGVGZWF0dXJlID0gcmVxdWlyZSgnQG1hcGJveC92ZWN0b3ItdGlsZScpLlZlY3RvclRpbGVGZWF0dXJlXG5cbm1vZHVsZS5leHBvcnRzID0gR2VvSlNPTldyYXBwZXJcblxuLy8gY29uZm9ybSB0byB2ZWN0b3J0aWxlIGFwaVxuZnVuY3Rpb24gR2VvSlNPTldyYXBwZXIgKGZlYXR1cmVzLCBvcHRpb25zKSB7XG4gIHRoaXMub3B0aW9ucyA9IG9wdGlvbnMgfHwge31cbiAgdGhpcy5mZWF0dXJlcyA9IGZlYXR1cmVzXG4gIHRoaXMubGVuZ3RoID0gZmVhdHVyZXMubGVuZ3RoXG59XG5cbkdlb0pTT05XcmFwcGVyLnByb3RvdHlwZS5mZWF0dXJlID0gZnVuY3Rpb24gKGkpIHtcbiAgcmV0dXJuIG5ldyBGZWF0dXJlV3JhcHBlcih0aGlzLmZlYXR1cmVzW2ldLCB0aGlzLm9wdGlvbnMuZXh0ZW50KVxufVxuXG5mdW5jdGlvbiBGZWF0dXJlV3JhcHBlciAoZmVhdHVyZSwgZXh0ZW50KSB7XG4gIHRoaXMuaWQgPSB0eXBlb2YgZmVhdHVyZS5pZCA9PT0gJ251bWJlcicgPyBmZWF0dXJlLmlkIDogdW5kZWZpbmVkXG4gIHRoaXMudHlwZSA9IGZlYXR1cmUudHlwZVxuICB0aGlzLnJhd0dlb21ldHJ5ID0gZmVhdHVyZS50eXBlID09PSAxID8gW2ZlYXR1cmUuZ2VvbWV0cnldIDogZmVhdHVyZS5nZW9tZXRyeVxuICB0aGlzLnByb3BlcnRpZXMgPSBmZWF0dXJlLnRhZ3NcbiAgdGhpcy5leHRlbnQgPSBleHRlbnQgfHwgNDA5NlxufVxuXG5GZWF0dXJlV3JhcHBlci5wcm90b3R5cGUubG9hZEdlb21ldHJ5ID0gZnVuY3Rpb24gKCkge1xuICB2YXIgcmluZ3MgPSB0aGlzLnJhd0dlb21ldHJ5XG4gIHRoaXMuZ2VvbWV0cnkgPSBbXVxuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgcmluZ3MubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgcmluZyA9IHJpbmdzW2ldXG4gICAgdmFyIG5ld1JpbmcgPSBbXVxuICAgIGZvciAodmFyIGogPSAwOyBqIDwgcmluZy5sZW5ndGg7IGorKykge1xuICAgICAgbmV3UmluZy5wdXNoKG5ldyBQb2ludChyaW5nW2pdWzBdLCByaW5nW2pdWzFdKSlcbiAgICB9XG4gICAgdGhpcy5nZW9tZXRyeS5wdXNoKG5ld1JpbmcpXG4gIH1cbiAgcmV0dXJuIHRoaXMuZ2VvbWV0cnlcbn1cblxuRmVhdHVyZVdyYXBwZXIucHJvdG90eXBlLmJib3ggPSBmdW5jdGlvbiAoKSB7XG4gIGlmICghdGhpcy5nZW9tZXRyeSkgdGhpcy5sb2FkR2VvbWV0cnkoKVxuXG4gIHZhciByaW5ncyA9IHRoaXMuZ2VvbWV0cnlcbiAgdmFyIHgxID0gSW5maW5pdHlcbiAgdmFyIHgyID0gLUluZmluaXR5XG4gIHZhciB5MSA9IEluZmluaXR5XG4gIHZhciB5MiA9IC1JbmZpbml0eVxuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgcmluZ3MubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgcmluZyA9IHJpbmdzW2ldXG5cbiAgICBmb3IgKHZhciBqID0gMDsgaiA8IHJpbmcubGVuZ3RoOyBqKyspIHtcbiAgICAgIHZhciBjb29yZCA9IHJpbmdbal1cblxuICAgICAgeDEgPSBNYXRoLm1pbih4MSwgY29vcmQueClcbiAgICAgIHgyID0gTWF0aC5tYXgoeDIsIGNvb3JkLngpXG4gICAgICB5MSA9IE1hdGgubWluKHkxLCBjb29yZC55KVxuICAgICAgeTIgPSBNYXRoLm1heCh5MiwgY29vcmQueSlcbiAgICB9XG4gIH1cblxuICByZXR1cm4gW3gxLCB5MSwgeDIsIHkyXVxufVxuXG5GZWF0dXJlV3JhcHBlci5wcm90b3R5cGUudG9HZW9KU09OID0gVmVjdG9yVGlsZUZlYXR1cmUucHJvdG90eXBlLnRvR2VvSlNPTlxuIiwidmFyIFBiZiA9IHJlcXVpcmUoJ3BiZicpXG52YXIgR2VvSlNPTldyYXBwZXIgPSByZXF1aXJlKCcuL2xpYi9nZW9qc29uX3dyYXBwZXInKVxuXG5tb2R1bGUuZXhwb3J0cyA9IGZyb21WZWN0b3JUaWxlSnNcbm1vZHVsZS5leHBvcnRzLmZyb21WZWN0b3JUaWxlSnMgPSBmcm9tVmVjdG9yVGlsZUpzXG5tb2R1bGUuZXhwb3J0cy5mcm9tR2VvanNvblZ0ID0gZnJvbUdlb2pzb25WdFxubW9kdWxlLmV4cG9ydHMuR2VvSlNPTldyYXBwZXIgPSBHZW9KU09OV3JhcHBlclxuXG4vKipcbiAqIFNlcmlhbGl6ZSBhIHZlY3Rvci10aWxlLWpzLWNyZWF0ZWQgdGlsZSB0byBwYmZcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gdGlsZVxuICogQHJldHVybiB7QnVmZmVyfSB1bmNvbXByZXNzZWQsIHBiZi1zZXJpYWxpemVkIHRpbGUgZGF0YVxuICovXG5mdW5jdGlvbiBmcm9tVmVjdG9yVGlsZUpzICh0aWxlKSB7XG4gIHZhciBvdXQgPSBuZXcgUGJmKClcbiAgd3JpdGVUaWxlKHRpbGUsIG91dClcbiAgcmV0dXJuIG91dC5maW5pc2goKVxufVxuXG4vKipcbiAqIFNlcmlhbGl6ZWQgYSBnZW9qc29uLXZ0LWNyZWF0ZWQgdGlsZSB0byBwYmYuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IGxheWVycyAtIEFuIG9iamVjdCBtYXBwaW5nIGxheWVyIG5hbWVzIHRvIGdlb2pzb24tdnQtY3JlYXRlZCB2ZWN0b3IgdGlsZSBvYmplY3RzXG4gKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdIC0gQW4gb2JqZWN0IHNwZWNpZnlpbmcgdGhlIHZlY3Rvci10aWxlIHNwZWNpZmljYXRpb24gdmVyc2lvbiBhbmQgZXh0ZW50IHRoYXQgd2VyZSB1c2VkIHRvIGNyZWF0ZSBgbGF5ZXJzYC5cbiAqIEBwYXJhbSB7TnVtYmVyfSBbb3B0aW9ucy52ZXJzaW9uPTFdIC0gVmVyc2lvbiBvZiB2ZWN0b3ItdGlsZSBzcGVjIHVzZWRcbiAqIEBwYXJhbSB7TnVtYmVyfSBbb3B0aW9ucy5leHRlbnQ9NDA5Nl0gLSBFeHRlbnQgb2YgdGhlIHZlY3RvciB0aWxlXG4gKiBAcmV0dXJuIHtCdWZmZXJ9IHVuY29tcHJlc3NlZCwgcGJmLXNlcmlhbGl6ZWQgdGlsZSBkYXRhXG4gKi9cbmZ1bmN0aW9uIGZyb21HZW9qc29uVnQgKGxheWVycywgb3B0aW9ucykge1xuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fVxuICB2YXIgbCA9IHt9XG4gIGZvciAodmFyIGsgaW4gbGF5ZXJzKSB7XG4gICAgbFtrXSA9IG5ldyBHZW9KU09OV3JhcHBlcihsYXllcnNba10uZmVhdHVyZXMsIG9wdGlvbnMpXG4gICAgbFtrXS5uYW1lID0ga1xuICAgIGxba10udmVyc2lvbiA9IG9wdGlvbnMudmVyc2lvblxuICAgIGxba10uZXh0ZW50ID0gb3B0aW9ucy5leHRlbnRcbiAgfVxuICByZXR1cm4gZnJvbVZlY3RvclRpbGVKcyh7bGF5ZXJzOiBsfSlcbn1cblxuZnVuY3Rpb24gd3JpdGVUaWxlICh0aWxlLCBwYmYpIHtcbiAgZm9yICh2YXIga2V5IGluIHRpbGUubGF5ZXJzKSB7XG4gICAgcGJmLndyaXRlTWVzc2FnZSgzLCB3cml0ZUxheWVyLCB0aWxlLmxheWVyc1trZXldKVxuICB9XG59XG5cbmZ1bmN0aW9uIHdyaXRlTGF5ZXIgKGxheWVyLCBwYmYpIHtcbiAgcGJmLndyaXRlVmFyaW50RmllbGQoMTUsIGxheWVyLnZlcnNpb24gfHwgMSlcbiAgcGJmLndyaXRlU3RyaW5nRmllbGQoMSwgbGF5ZXIubmFtZSB8fCAnJylcbiAgcGJmLndyaXRlVmFyaW50RmllbGQoNSwgbGF5ZXIuZXh0ZW50IHx8IDQwOTYpXG5cbiAgdmFyIGlcbiAgdmFyIGNvbnRleHQgPSB7XG4gICAga2V5czogW10sXG4gICAgdmFsdWVzOiBbXSxcbiAgICBrZXljYWNoZToge30sXG4gICAgdmFsdWVjYWNoZToge31cbiAgfVxuXG4gIGZvciAoaSA9IDA7IGkgPCBsYXllci5sZW5ndGg7IGkrKykge1xuICAgIGNvbnRleHQuZmVhdHVyZSA9IGxheWVyLmZlYXR1cmUoaSlcbiAgICBwYmYud3JpdGVNZXNzYWdlKDIsIHdyaXRlRmVhdHVyZSwgY29udGV4dClcbiAgfVxuXG4gIHZhciBrZXlzID0gY29udGV4dC5rZXlzXG4gIGZvciAoaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgaSsrKSB7XG4gICAgcGJmLndyaXRlU3RyaW5nRmllbGQoMywga2V5c1tpXSlcbiAgfVxuXG4gIHZhciB2YWx1ZXMgPSBjb250ZXh0LnZhbHVlc1xuICBmb3IgKGkgPSAwOyBpIDwgdmFsdWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgcGJmLndyaXRlTWVzc2FnZSg0LCB3cml0ZVZhbHVlLCB2YWx1ZXNbaV0pXG4gIH1cbn1cblxuZnVuY3Rpb24gd3JpdGVGZWF0dXJlIChjb250ZXh0LCBwYmYpIHtcbiAgdmFyIGZlYXR1cmUgPSBjb250ZXh0LmZlYXR1cmVcblxuICBpZiAoZmVhdHVyZS5pZCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgcGJmLndyaXRlVmFyaW50RmllbGQoMSwgZmVhdHVyZS5pZClcbiAgfVxuXG4gIHBiZi53cml0ZU1lc3NhZ2UoMiwgd3JpdGVQcm9wZXJ0aWVzLCBjb250ZXh0KVxuICBwYmYud3JpdGVWYXJpbnRGaWVsZCgzLCBmZWF0dXJlLnR5cGUpXG4gIHBiZi53cml0ZU1lc3NhZ2UoNCwgd3JpdGVHZW9tZXRyeSwgZmVhdHVyZSlcbn1cblxuZnVuY3Rpb24gd3JpdGVQcm9wZXJ0aWVzIChjb250ZXh0LCBwYmYpIHtcbiAgdmFyIGZlYXR1cmUgPSBjb250ZXh0LmZlYXR1cmVcbiAgdmFyIGtleXMgPSBjb250ZXh0LmtleXNcbiAgdmFyIHZhbHVlcyA9IGNvbnRleHQudmFsdWVzXG4gIHZhciBrZXljYWNoZSA9IGNvbnRleHQua2V5Y2FjaGVcbiAgdmFyIHZhbHVlY2FjaGUgPSBjb250ZXh0LnZhbHVlY2FjaGVcblxuICBmb3IgKHZhciBrZXkgaW4gZmVhdHVyZS5wcm9wZXJ0aWVzKSB7XG4gICAgdmFyIGtleUluZGV4ID0ga2V5Y2FjaGVba2V5XVxuICAgIGlmICh0eXBlb2Yga2V5SW5kZXggPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICBrZXlzLnB1c2goa2V5KVxuICAgICAga2V5SW5kZXggPSBrZXlzLmxlbmd0aCAtIDFcbiAgICAgIGtleWNhY2hlW2tleV0gPSBrZXlJbmRleFxuICAgIH1cbiAgICBwYmYud3JpdGVWYXJpbnQoa2V5SW5kZXgpXG5cbiAgICB2YXIgdmFsdWUgPSBmZWF0dXJlLnByb3BlcnRpZXNba2V5XVxuICAgIHZhciB0eXBlID0gdHlwZW9mIHZhbHVlXG4gICAgaWYgKHR5cGUgIT09ICdzdHJpbmcnICYmIHR5cGUgIT09ICdib29sZWFuJyAmJiB0eXBlICE9PSAnbnVtYmVyJykge1xuICAgICAgdmFsdWUgPSBKU09OLnN0cmluZ2lmeSh2YWx1ZSlcbiAgICB9XG4gICAgdmFyIHZhbHVlS2V5ID0gdHlwZSArICc6JyArIHZhbHVlXG4gICAgdmFyIHZhbHVlSW5kZXggPSB2YWx1ZWNhY2hlW3ZhbHVlS2V5XVxuICAgIGlmICh0eXBlb2YgdmFsdWVJbmRleCA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIHZhbHVlcy5wdXNoKHZhbHVlKVxuICAgICAgdmFsdWVJbmRleCA9IHZhbHVlcy5sZW5ndGggLSAxXG4gICAgICB2YWx1ZWNhY2hlW3ZhbHVlS2V5XSA9IHZhbHVlSW5kZXhcbiAgICB9XG4gICAgcGJmLndyaXRlVmFyaW50KHZhbHVlSW5kZXgpXG4gIH1cbn1cblxuZnVuY3Rpb24gY29tbWFuZCAoY21kLCBsZW5ndGgpIHtcbiAgcmV0dXJuIChsZW5ndGggPDwgMykgKyAoY21kICYgMHg3KVxufVxuXG5mdW5jdGlvbiB6aWd6YWcgKG51bSkge1xuICByZXR1cm4gKG51bSA8PCAxKSBeIChudW0gPj4gMzEpXG59XG5cbmZ1bmN0aW9uIHdyaXRlR2VvbWV0cnkgKGZlYXR1cmUsIHBiZikge1xuICB2YXIgZ2VvbWV0cnkgPSBmZWF0dXJlLmxvYWRHZW9tZXRyeSgpXG4gIHZhciB0eXBlID0gZmVhdHVyZS50eXBlXG4gIHZhciB4ID0gMFxuICB2YXIgeSA9IDBcbiAgdmFyIHJpbmdzID0gZ2VvbWV0cnkubGVuZ3RoXG4gIGZvciAodmFyIHIgPSAwOyByIDwgcmluZ3M7IHIrKykge1xuICAgIHZhciByaW5nID0gZ2VvbWV0cnlbcl1cbiAgICB2YXIgY291bnQgPSAxXG4gICAgaWYgKHR5cGUgPT09IDEpIHtcbiAgICAgIGNvdW50ID0gcmluZy5sZW5ndGhcbiAgICB9XG4gICAgcGJmLndyaXRlVmFyaW50KGNvbW1hbmQoMSwgY291bnQpKSAvLyBtb3ZldG9cbiAgICAvLyBkbyBub3Qgd3JpdGUgcG9seWdvbiBjbG9zaW5nIHBhdGggYXMgbGluZXRvXG4gICAgdmFyIGxpbmVDb3VudCA9IHR5cGUgPT09IDMgPyByaW5nLmxlbmd0aCAtIDEgOiByaW5nLmxlbmd0aFxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGluZUNvdW50OyBpKyspIHtcbiAgICAgIGlmIChpID09PSAxICYmIHR5cGUgIT09IDEpIHtcbiAgICAgICAgcGJmLndyaXRlVmFyaW50KGNvbW1hbmQoMiwgbGluZUNvdW50IC0gMSkpIC8vIGxpbmV0b1xuICAgICAgfVxuICAgICAgdmFyIGR4ID0gcmluZ1tpXS54IC0geFxuICAgICAgdmFyIGR5ID0gcmluZ1tpXS55IC0geVxuICAgICAgcGJmLndyaXRlVmFyaW50KHppZ3phZyhkeCkpXG4gICAgICBwYmYud3JpdGVWYXJpbnQoemlnemFnKGR5KSlcbiAgICAgIHggKz0gZHhcbiAgICAgIHkgKz0gZHlcbiAgICB9XG4gICAgaWYgKHR5cGUgPT09IDMpIHtcbiAgICAgIHBiZi53cml0ZVZhcmludChjb21tYW5kKDcsIDApKSAvLyBjbG9zZXBhdGhcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gd3JpdGVWYWx1ZSAodmFsdWUsIHBiZikge1xuICB2YXIgdHlwZSA9IHR5cGVvZiB2YWx1ZVxuICBpZiAodHlwZSA9PT0gJ3N0cmluZycpIHtcbiAgICBwYmYud3JpdGVTdHJpbmdGaWVsZCgxLCB2YWx1ZSlcbiAgfSBlbHNlIGlmICh0eXBlID09PSAnYm9vbGVhbicpIHtcbiAgICBwYmYud3JpdGVCb29sZWFuRmllbGQoNywgdmFsdWUpXG4gIH0gZWxzZSBpZiAodHlwZSA9PT0gJ251bWJlcicpIHtcbiAgICBpZiAodmFsdWUgJSAxICE9PSAwKSB7XG4gICAgICBwYmYud3JpdGVEb3VibGVGaWVsZCgzLCB2YWx1ZSlcbiAgICB9IGVsc2UgaWYgKHZhbHVlIDwgMCkge1xuICAgICAgcGJmLndyaXRlU1ZhcmludEZpZWxkKDYsIHZhbHVlKVxuICAgIH0gZWxzZSB7XG4gICAgICBwYmYud3JpdGVWYXJpbnRGaWVsZCg1LCB2YWx1ZSlcbiAgICB9XG4gIH1cbn1cbiIsIlxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gc29ydEtEKGlkcywgY29vcmRzLCBub2RlU2l6ZSwgbGVmdCwgcmlnaHQsIGRlcHRoKSB7XG4gICAgaWYgKHJpZ2h0IC0gbGVmdCA8PSBub2RlU2l6ZSkgcmV0dXJuO1xuXG4gICAgdmFyIG0gPSBNYXRoLmZsb29yKChsZWZ0ICsgcmlnaHQpIC8gMik7XG5cbiAgICBzZWxlY3QoaWRzLCBjb29yZHMsIG0sIGxlZnQsIHJpZ2h0LCBkZXB0aCAlIDIpO1xuXG4gICAgc29ydEtEKGlkcywgY29vcmRzLCBub2RlU2l6ZSwgbGVmdCwgbSAtIDEsIGRlcHRoICsgMSk7XG4gICAgc29ydEtEKGlkcywgY29vcmRzLCBub2RlU2l6ZSwgbSArIDEsIHJpZ2h0LCBkZXB0aCArIDEpO1xufVxuXG5mdW5jdGlvbiBzZWxlY3QoaWRzLCBjb29yZHMsIGssIGxlZnQsIHJpZ2h0LCBpbmMpIHtcblxuICAgIHdoaWxlIChyaWdodCA+IGxlZnQpIHtcbiAgICAgICAgaWYgKHJpZ2h0IC0gbGVmdCA+IDYwMCkge1xuICAgICAgICAgICAgdmFyIG4gPSByaWdodCAtIGxlZnQgKyAxO1xuICAgICAgICAgICAgdmFyIG0gPSBrIC0gbGVmdCArIDE7XG4gICAgICAgICAgICB2YXIgeiA9IE1hdGgubG9nKG4pO1xuICAgICAgICAgICAgdmFyIHMgPSAwLjUgKiBNYXRoLmV4cCgyICogeiAvIDMpO1xuICAgICAgICAgICAgdmFyIHNkID0gMC41ICogTWF0aC5zcXJ0KHogKiBzICogKG4gLSBzKSAvIG4pICogKG0gLSBuIC8gMiA8IDAgPyAtMSA6IDEpO1xuICAgICAgICAgICAgdmFyIG5ld0xlZnQgPSBNYXRoLm1heChsZWZ0LCBNYXRoLmZsb29yKGsgLSBtICogcyAvIG4gKyBzZCkpO1xuICAgICAgICAgICAgdmFyIG5ld1JpZ2h0ID0gTWF0aC5taW4ocmlnaHQsIE1hdGguZmxvb3IoayArIChuIC0gbSkgKiBzIC8gbiArIHNkKSk7XG4gICAgICAgICAgICBzZWxlY3QoaWRzLCBjb29yZHMsIGssIG5ld0xlZnQsIG5ld1JpZ2h0LCBpbmMpO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHQgPSBjb29yZHNbMiAqIGsgKyBpbmNdO1xuICAgICAgICB2YXIgaSA9IGxlZnQ7XG4gICAgICAgIHZhciBqID0gcmlnaHQ7XG5cbiAgICAgICAgc3dhcEl0ZW0oaWRzLCBjb29yZHMsIGxlZnQsIGspO1xuICAgICAgICBpZiAoY29vcmRzWzIgKiByaWdodCArIGluY10gPiB0KSBzd2FwSXRlbShpZHMsIGNvb3JkcywgbGVmdCwgcmlnaHQpO1xuXG4gICAgICAgIHdoaWxlIChpIDwgaikge1xuICAgICAgICAgICAgc3dhcEl0ZW0oaWRzLCBjb29yZHMsIGksIGopO1xuICAgICAgICAgICAgaSsrO1xuICAgICAgICAgICAgai0tO1xuICAgICAgICAgICAgd2hpbGUgKGNvb3Jkc1syICogaSArIGluY10gPCB0KSBpKys7XG4gICAgICAgICAgICB3aGlsZSAoY29vcmRzWzIgKiBqICsgaW5jXSA+IHQpIGotLTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjb29yZHNbMiAqIGxlZnQgKyBpbmNdID09PSB0KSBzd2FwSXRlbShpZHMsIGNvb3JkcywgbGVmdCwgaik7XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgaisrO1xuICAgICAgICAgICAgc3dhcEl0ZW0oaWRzLCBjb29yZHMsIGosIHJpZ2h0KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChqIDw9IGspIGxlZnQgPSBqICsgMTtcbiAgICAgICAgaWYgKGsgPD0gaikgcmlnaHQgPSBqIC0gMTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIHN3YXBJdGVtKGlkcywgY29vcmRzLCBpLCBqKSB7XG4gICAgc3dhcChpZHMsIGksIGopO1xuICAgIHN3YXAoY29vcmRzLCAyICogaSwgMiAqIGopO1xuICAgIHN3YXAoY29vcmRzLCAyICogaSArIDEsIDIgKiBqICsgMSk7XG59XG5cbmZ1bmN0aW9uIHN3YXAoYXJyLCBpLCBqKSB7XG4gICAgdmFyIHRtcCA9IGFycltpXTtcbiAgICBhcnJbaV0gPSBhcnJbal07XG4gICAgYXJyW2pdID0gdG1wO1xufVxuIiwiXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiByYW5nZShpZHMsIGNvb3JkcywgbWluWCwgbWluWSwgbWF4WCwgbWF4WSwgbm9kZVNpemUpIHtcbiAgICB2YXIgc3RhY2sgPSBbMCwgaWRzLmxlbmd0aCAtIDEsIDBdO1xuICAgIHZhciByZXN1bHQgPSBbXTtcbiAgICB2YXIgeCwgeTtcblxuICAgIHdoaWxlIChzdGFjay5sZW5ndGgpIHtcbiAgICAgICAgdmFyIGF4aXMgPSBzdGFjay5wb3AoKTtcbiAgICAgICAgdmFyIHJpZ2h0ID0gc3RhY2sucG9wKCk7XG4gICAgICAgIHZhciBsZWZ0ID0gc3RhY2sucG9wKCk7XG5cbiAgICAgICAgaWYgKHJpZ2h0IC0gbGVmdCA8PSBub2RlU2l6ZSkge1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IGxlZnQ7IGkgPD0gcmlnaHQ7IGkrKykge1xuICAgICAgICAgICAgICAgIHggPSBjb29yZHNbMiAqIGldO1xuICAgICAgICAgICAgICAgIHkgPSBjb29yZHNbMiAqIGkgKyAxXTtcbiAgICAgICAgICAgICAgICBpZiAoeCA+PSBtaW5YICYmIHggPD0gbWF4WCAmJiB5ID49IG1pblkgJiYgeSA8PSBtYXhZKSByZXN1bHQucHVzaChpZHNbaV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgbSA9IE1hdGguZmxvb3IoKGxlZnQgKyByaWdodCkgLyAyKTtcblxuICAgICAgICB4ID0gY29vcmRzWzIgKiBtXTtcbiAgICAgICAgeSA9IGNvb3Jkc1syICogbSArIDFdO1xuXG4gICAgICAgIGlmICh4ID49IG1pblggJiYgeCA8PSBtYXhYICYmIHkgPj0gbWluWSAmJiB5IDw9IG1heFkpIHJlc3VsdC5wdXNoKGlkc1ttXSk7XG5cbiAgICAgICAgdmFyIG5leHRBeGlzID0gKGF4aXMgKyAxKSAlIDI7XG5cbiAgICAgICAgaWYgKGF4aXMgPT09IDAgPyBtaW5YIDw9IHggOiBtaW5ZIDw9IHkpIHtcbiAgICAgICAgICAgIHN0YWNrLnB1c2gobGVmdCk7XG4gICAgICAgICAgICBzdGFjay5wdXNoKG0gLSAxKTtcbiAgICAgICAgICAgIHN0YWNrLnB1c2gobmV4dEF4aXMpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChheGlzID09PSAwID8gbWF4WCA+PSB4IDogbWF4WSA+PSB5KSB7XG4gICAgICAgICAgICBzdGFjay5wdXNoKG0gKyAxKTtcbiAgICAgICAgICAgIHN0YWNrLnB1c2gocmlnaHQpO1xuICAgICAgICAgICAgc3RhY2sucHVzaChuZXh0QXhpcyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gcmVzdWx0O1xufVxuIiwiXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiB3aXRoaW4oaWRzLCBjb29yZHMsIHF4LCBxeSwgciwgbm9kZVNpemUpIHtcbiAgICB2YXIgc3RhY2sgPSBbMCwgaWRzLmxlbmd0aCAtIDEsIDBdO1xuICAgIHZhciByZXN1bHQgPSBbXTtcbiAgICB2YXIgcjIgPSByICogcjtcblxuICAgIHdoaWxlIChzdGFjay5sZW5ndGgpIHtcbiAgICAgICAgdmFyIGF4aXMgPSBzdGFjay5wb3AoKTtcbiAgICAgICAgdmFyIHJpZ2h0ID0gc3RhY2sucG9wKCk7XG4gICAgICAgIHZhciBsZWZ0ID0gc3RhY2sucG9wKCk7XG5cbiAgICAgICAgaWYgKHJpZ2h0IC0gbGVmdCA8PSBub2RlU2l6ZSkge1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IGxlZnQ7IGkgPD0gcmlnaHQ7IGkrKykge1xuICAgICAgICAgICAgICAgIGlmIChzcURpc3QoY29vcmRzWzIgKiBpXSwgY29vcmRzWzIgKiBpICsgMV0sIHF4LCBxeSkgPD0gcjIpIHJlc3VsdC5wdXNoKGlkc1tpXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBtID0gTWF0aC5mbG9vcigobGVmdCArIHJpZ2h0KSAvIDIpO1xuXG4gICAgICAgIHZhciB4ID0gY29vcmRzWzIgKiBtXTtcbiAgICAgICAgdmFyIHkgPSBjb29yZHNbMiAqIG0gKyAxXTtcblxuICAgICAgICBpZiAoc3FEaXN0KHgsIHksIHF4LCBxeSkgPD0gcjIpIHJlc3VsdC5wdXNoKGlkc1ttXSk7XG5cbiAgICAgICAgdmFyIG5leHRBeGlzID0gKGF4aXMgKyAxKSAlIDI7XG5cbiAgICAgICAgaWYgKGF4aXMgPT09IDAgPyBxeCAtIHIgPD0geCA6IHF5IC0gciA8PSB5KSB7XG4gICAgICAgICAgICBzdGFjay5wdXNoKGxlZnQpO1xuICAgICAgICAgICAgc3RhY2sucHVzaChtIC0gMSk7XG4gICAgICAgICAgICBzdGFjay5wdXNoKG5leHRBeGlzKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoYXhpcyA9PT0gMCA/IHF4ICsgciA+PSB4IDogcXkgKyByID49IHkpIHtcbiAgICAgICAgICAgIHN0YWNrLnB1c2gobSArIDEpO1xuICAgICAgICAgICAgc3RhY2sucHVzaChyaWdodCk7XG4gICAgICAgICAgICBzdGFjay5wdXNoKG5leHRBeGlzKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiByZXN1bHQ7XG59XG5cbmZ1bmN0aW9uIHNxRGlzdChheCwgYXksIGJ4LCBieSkge1xuICAgIHZhciBkeCA9IGF4IC0gYng7XG4gICAgdmFyIGR5ID0gYXkgLSBieTtcbiAgICByZXR1cm4gZHggKiBkeCArIGR5ICogZHk7XG59XG4iLCJcbmltcG9ydCBzb3J0IGZyb20gJy4vc29ydCc7XG5pbXBvcnQgcmFuZ2UgZnJvbSAnLi9yYW5nZSc7XG5pbXBvcnQgd2l0aGluIGZyb20gJy4vd2l0aGluJztcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24ga2RidXNoKHBvaW50cywgZ2V0WCwgZ2V0WSwgbm9kZVNpemUsIEFycmF5VHlwZSkge1xuICAgIHJldHVybiBuZXcgS0RCdXNoKHBvaW50cywgZ2V0WCwgZ2V0WSwgbm9kZVNpemUsIEFycmF5VHlwZSk7XG59XG5cbmZ1bmN0aW9uIEtEQnVzaChwb2ludHMsIGdldFgsIGdldFksIG5vZGVTaXplLCBBcnJheVR5cGUpIHtcbiAgICBnZXRYID0gZ2V0WCB8fCBkZWZhdWx0R2V0WDtcbiAgICBnZXRZID0gZ2V0WSB8fCBkZWZhdWx0R2V0WTtcbiAgICBBcnJheVR5cGUgPSBBcnJheVR5cGUgfHwgQXJyYXk7XG5cbiAgICB0aGlzLm5vZGVTaXplID0gbm9kZVNpemUgfHwgNjQ7XG4gICAgdGhpcy5wb2ludHMgPSBwb2ludHM7XG5cbiAgICB0aGlzLmlkcyA9IG5ldyBBcnJheVR5cGUocG9pbnRzLmxlbmd0aCk7XG4gICAgdGhpcy5jb29yZHMgPSBuZXcgQXJyYXlUeXBlKHBvaW50cy5sZW5ndGggKiAyKTtcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcG9pbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHRoaXMuaWRzW2ldID0gaTtcbiAgICAgICAgdGhpcy5jb29yZHNbMiAqIGldID0gZ2V0WChwb2ludHNbaV0pO1xuICAgICAgICB0aGlzLmNvb3Jkc1syICogaSArIDFdID0gZ2V0WShwb2ludHNbaV0pO1xuICAgIH1cblxuICAgIHNvcnQodGhpcy5pZHMsIHRoaXMuY29vcmRzLCB0aGlzLm5vZGVTaXplLCAwLCB0aGlzLmlkcy5sZW5ndGggLSAxLCAwKTtcbn1cblxuS0RCdXNoLnByb3RvdHlwZSA9IHtcbiAgICByYW5nZTogZnVuY3Rpb24gKG1pblgsIG1pblksIG1heFgsIG1heFkpIHtcbiAgICAgICAgcmV0dXJuIHJhbmdlKHRoaXMuaWRzLCB0aGlzLmNvb3JkcywgbWluWCwgbWluWSwgbWF4WCwgbWF4WSwgdGhpcy5ub2RlU2l6ZSk7XG4gICAgfSxcblxuICAgIHdpdGhpbjogZnVuY3Rpb24gKHgsIHksIHIpIHtcbiAgICAgICAgcmV0dXJuIHdpdGhpbih0aGlzLmlkcywgdGhpcy5jb29yZHMsIHgsIHksIHIsIHRoaXMubm9kZVNpemUpO1xuICAgIH1cbn07XG5cbmZ1bmN0aW9uIGRlZmF1bHRHZXRYKHApIHsgcmV0dXJuIHBbMF07IH1cbmZ1bmN0aW9uIGRlZmF1bHRHZXRZKHApIHsgcmV0dXJuIHBbMV07IH1cbiIsIlxuaW1wb3J0IGtkYnVzaCBmcm9tICdrZGJ1c2gnO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBzdXBlcmNsdXN0ZXIob3B0aW9ucykge1xuICAgIHJldHVybiBuZXcgU3VwZXJDbHVzdGVyKG9wdGlvbnMpO1xufVxuXG5mdW5jdGlvbiBTdXBlckNsdXN0ZXIob3B0aW9ucykge1xuICAgIHRoaXMub3B0aW9ucyA9IGV4dGVuZChPYmplY3QuY3JlYXRlKHRoaXMub3B0aW9ucyksIG9wdGlvbnMpO1xuICAgIHRoaXMudHJlZXMgPSBuZXcgQXJyYXkodGhpcy5vcHRpb25zLm1heFpvb20gKyAxKTtcbn1cblxuU3VwZXJDbHVzdGVyLnByb3RvdHlwZSA9IHtcbiAgICBvcHRpb25zOiB7XG4gICAgICAgIG1pblpvb206IDAsICAgLy8gbWluIHpvb20gdG8gZ2VuZXJhdGUgY2x1c3RlcnMgb25cbiAgICAgICAgbWF4Wm9vbTogMTYsICAvLyBtYXggem9vbSBsZXZlbCB0byBjbHVzdGVyIHRoZSBwb2ludHMgb25cbiAgICAgICAgcmFkaXVzOiA0MCwgICAvLyBjbHVzdGVyIHJhZGl1cyBpbiBwaXhlbHNcbiAgICAgICAgZXh0ZW50OiA1MTIsICAvLyB0aWxlIGV4dGVudCAocmFkaXVzIGlzIGNhbGN1bGF0ZWQgcmVsYXRpdmUgdG8gaXQpXG4gICAgICAgIG5vZGVTaXplOiA2NCwgLy8gc2l6ZSBvZiB0aGUgS0QtdHJlZSBsZWFmIG5vZGUsIGFmZmVjdHMgcGVyZm9ybWFuY2VcbiAgICAgICAgbG9nOiBmYWxzZSwgICAvLyB3aGV0aGVyIHRvIGxvZyB0aW1pbmcgaW5mb1xuXG4gICAgICAgIC8vIGEgcmVkdWNlIGZ1bmN0aW9uIGZvciBjYWxjdWxhdGluZyBjdXN0b20gY2x1c3RlciBwcm9wZXJ0aWVzXG4gICAgICAgIHJlZHVjZTogbnVsbCwgLy8gZnVuY3Rpb24gKGFjY3VtdWxhdGVkLCBwcm9wcykgeyBhY2N1bXVsYXRlZC5zdW0gKz0gcHJvcHMuc3VtOyB9XG5cbiAgICAgICAgLy8gaW5pdGlhbCBwcm9wZXJ0aWVzIG9mIGEgY2x1c3RlciAoYmVmb3JlIHJ1bm5pbmcgdGhlIHJlZHVjZXIpXG4gICAgICAgIGluaXRpYWw6IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHt9OyB9LCAvLyBmdW5jdGlvbiAoKSB7IHJldHVybiB7c3VtOiAwfTsgfSxcblxuICAgICAgICAvLyBwcm9wZXJ0aWVzIHRvIHVzZSBmb3IgaW5kaXZpZHVhbCBwb2ludHMgd2hlbiBydW5uaW5nIHRoZSByZWR1Y2VyXG4gICAgICAgIG1hcDogZnVuY3Rpb24gKHByb3BzKSB7IHJldHVybiBwcm9wczsgfSAvLyBmdW5jdGlvbiAocHJvcHMpIHsgcmV0dXJuIHtzdW06IHByb3BzLm15X3ZhbHVlfTsgfSxcbiAgICB9LFxuXG4gICAgbG9hZDogZnVuY3Rpb24gKHBvaW50cykge1xuICAgICAgICB2YXIgbG9nID0gdGhpcy5vcHRpb25zLmxvZztcblxuICAgICAgICBpZiAobG9nKSBjb25zb2xlLnRpbWUoJ3RvdGFsIHRpbWUnKTtcblxuICAgICAgICB2YXIgdGltZXJJZCA9ICdwcmVwYXJlICcgKyBwb2ludHMubGVuZ3RoICsgJyBwb2ludHMnO1xuICAgICAgICBpZiAobG9nKSBjb25zb2xlLnRpbWUodGltZXJJZCk7XG5cbiAgICAgICAgdGhpcy5wb2ludHMgPSBwb2ludHM7XG5cbiAgICAgICAgLy8gZ2VuZXJhdGUgYSBjbHVzdGVyIG9iamVjdCBmb3IgZWFjaCBwb2ludCBhbmQgaW5kZXggaW5wdXQgcG9pbnRzIGludG8gYSBLRC10cmVlXG4gICAgICAgIHZhciBjbHVzdGVycyA9IFtdO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHBvaW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgaWYgKCFwb2ludHNbaV0uZ2VvbWV0cnkpIHtcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNsdXN0ZXJzLnB1c2goY3JlYXRlUG9pbnRDbHVzdGVyKHBvaW50c1tpXSwgaSkpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMudHJlZXNbdGhpcy5vcHRpb25zLm1heFpvb20gKyAxXSA9IGtkYnVzaChjbHVzdGVycywgZ2V0WCwgZ2V0WSwgdGhpcy5vcHRpb25zLm5vZGVTaXplLCBGbG9hdDMyQXJyYXkpO1xuXG4gICAgICAgIGlmIChsb2cpIGNvbnNvbGUudGltZUVuZCh0aW1lcklkKTtcblxuICAgICAgICAvLyBjbHVzdGVyIHBvaW50cyBvbiBtYXggem9vbSwgdGhlbiBjbHVzdGVyIHRoZSByZXN1bHRzIG9uIHByZXZpb3VzIHpvb20sIGV0Yy47XG4gICAgICAgIC8vIHJlc3VsdHMgaW4gYSBjbHVzdGVyIGhpZXJhcmNoeSBhY3Jvc3Mgem9vbSBsZXZlbHNcbiAgICAgICAgZm9yICh2YXIgeiA9IHRoaXMub3B0aW9ucy5tYXhab29tOyB6ID49IHRoaXMub3B0aW9ucy5taW5ab29tOyB6LS0pIHtcbiAgICAgICAgICAgIHZhciBub3cgPSArRGF0ZS5ub3coKTtcblxuICAgICAgICAgICAgLy8gY3JlYXRlIGEgbmV3IHNldCBvZiBjbHVzdGVycyBmb3IgdGhlIHpvb20gYW5kIGluZGV4IHRoZW0gd2l0aCBhIEtELXRyZWVcbiAgICAgICAgICAgIGNsdXN0ZXJzID0gdGhpcy5fY2x1c3RlcihjbHVzdGVycywgeik7XG4gICAgICAgICAgICB0aGlzLnRyZWVzW3pdID0ga2RidXNoKGNsdXN0ZXJzLCBnZXRYLCBnZXRZLCB0aGlzLm9wdGlvbnMubm9kZVNpemUsIEZsb2F0MzJBcnJheSk7XG5cbiAgICAgICAgICAgIGlmIChsb2cpIGNvbnNvbGUubG9nKCd6JWQ6ICVkIGNsdXN0ZXJzIGluICVkbXMnLCB6LCBjbHVzdGVycy5sZW5ndGgsICtEYXRlLm5vdygpIC0gbm93KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChsb2cpIGNvbnNvbGUudGltZUVuZCgndG90YWwgdGltZScpO1xuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG5cbiAgICBnZXRDbHVzdGVyczogZnVuY3Rpb24gKGJib3gsIHpvb20pIHtcbiAgICAgICAgdmFyIG1pbkxuZyA9ICgoYmJveFswXSArIDE4MCkgJSAzNjAgKyAzNjApICUgMzYwIC0gMTgwO1xuICAgICAgICB2YXIgbWluTGF0ID0gTWF0aC5tYXgoLTkwLCBNYXRoLm1pbig5MCwgYmJveFsxXSkpO1xuICAgICAgICB2YXIgbWF4TG5nID0gYmJveFsyXSA9PT0gMTgwID8gMTgwIDogKChiYm94WzJdICsgMTgwKSAlIDM2MCArIDM2MCkgJSAzNjAgLSAxODA7XG4gICAgICAgIHZhciBtYXhMYXQgPSBNYXRoLm1heCgtOTAsIE1hdGgubWluKDkwLCBiYm94WzNdKSk7XG5cbiAgICAgICAgaWYgKGJib3hbMl0gLSBiYm94WzBdID49IDM2MCkge1xuICAgICAgICAgICAgbWluTG5nID0gLTE4MDtcbiAgICAgICAgICAgIG1heExuZyA9IDE4MDtcbiAgICAgICAgfSBlbHNlIGlmIChtaW5MbmcgPiBtYXhMbmcpIHtcbiAgICAgICAgICAgIHZhciBlYXN0ZXJuSGVtID0gdGhpcy5nZXRDbHVzdGVycyhbbWluTG5nLCBtaW5MYXQsIDE4MCwgbWF4TGF0XSwgem9vbSk7XG4gICAgICAgICAgICB2YXIgd2VzdGVybkhlbSA9IHRoaXMuZ2V0Q2x1c3RlcnMoWy0xODAsIG1pbkxhdCwgbWF4TG5nLCBtYXhMYXRdLCB6b29tKTtcbiAgICAgICAgICAgIHJldHVybiBlYXN0ZXJuSGVtLmNvbmNhdCh3ZXN0ZXJuSGVtKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciB0cmVlID0gdGhpcy50cmVlc1t0aGlzLl9saW1pdFpvb20oem9vbSldO1xuICAgICAgICB2YXIgaWRzID0gdHJlZS5yYW5nZShsbmdYKG1pbkxuZyksIGxhdFkobWF4TGF0KSwgbG5nWChtYXhMbmcpLCBsYXRZKG1pbkxhdCkpO1xuICAgICAgICB2YXIgY2x1c3RlcnMgPSBbXTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBpZHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBjID0gdHJlZS5wb2ludHNbaWRzW2ldXTtcbiAgICAgICAgICAgIGNsdXN0ZXJzLnB1c2goYy5udW1Qb2ludHMgPyBnZXRDbHVzdGVySlNPTihjKSA6IHRoaXMucG9pbnRzW2MuaW5kZXhdKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gY2x1c3RlcnM7XG4gICAgfSxcblxuICAgIGdldENoaWxkcmVuOiBmdW5jdGlvbiAoY2x1c3RlcklkKSB7XG4gICAgICAgIHZhciBvcmlnaW5JZCA9IGNsdXN0ZXJJZCA+PiA1O1xuICAgICAgICB2YXIgb3JpZ2luWm9vbSA9IGNsdXN0ZXJJZCAlIDMyO1xuICAgICAgICB2YXIgZXJyb3JNc2cgPSAnTm8gY2x1c3RlciB3aXRoIHRoZSBzcGVjaWZpZWQgaWQuJztcblxuICAgICAgICB2YXIgaW5kZXggPSB0aGlzLnRyZWVzW29yaWdpblpvb21dO1xuICAgICAgICBpZiAoIWluZGV4KSB0aHJvdyBuZXcgRXJyb3IoZXJyb3JNc2cpO1xuXG4gICAgICAgIHZhciBvcmlnaW4gPSBpbmRleC5wb2ludHNbb3JpZ2luSWRdO1xuICAgICAgICBpZiAoIW9yaWdpbikgdGhyb3cgbmV3IEVycm9yKGVycm9yTXNnKTtcblxuICAgICAgICB2YXIgciA9IHRoaXMub3B0aW9ucy5yYWRpdXMgLyAodGhpcy5vcHRpb25zLmV4dGVudCAqIE1hdGgucG93KDIsIG9yaWdpblpvb20gLSAxKSk7XG4gICAgICAgIHZhciBpZHMgPSBpbmRleC53aXRoaW4ob3JpZ2luLngsIG9yaWdpbi55LCByKTtcbiAgICAgICAgdmFyIGNoaWxkcmVuID0gW107XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgaWRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgYyA9IGluZGV4LnBvaW50c1tpZHNbaV1dO1xuICAgICAgICAgICAgaWYgKGMucGFyZW50SWQgPT09IGNsdXN0ZXJJZCkge1xuICAgICAgICAgICAgICAgIGNoaWxkcmVuLnB1c2goYy5udW1Qb2ludHMgPyBnZXRDbHVzdGVySlNPTihjKSA6IHRoaXMucG9pbnRzW2MuaW5kZXhdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjaGlsZHJlbi5sZW5ndGggPT09IDApIHRocm93IG5ldyBFcnJvcihlcnJvck1zZyk7XG5cbiAgICAgICAgcmV0dXJuIGNoaWxkcmVuO1xuICAgIH0sXG5cbiAgICBnZXRMZWF2ZXM6IGZ1bmN0aW9uIChjbHVzdGVySWQsIGxpbWl0LCBvZmZzZXQpIHtcbiAgICAgICAgbGltaXQgPSBsaW1pdCB8fCAxMDtcbiAgICAgICAgb2Zmc2V0ID0gb2Zmc2V0IHx8IDA7XG5cbiAgICAgICAgdmFyIGxlYXZlcyA9IFtdO1xuICAgICAgICB0aGlzLl9hcHBlbmRMZWF2ZXMobGVhdmVzLCBjbHVzdGVySWQsIGxpbWl0LCBvZmZzZXQsIDApO1xuXG4gICAgICAgIHJldHVybiBsZWF2ZXM7XG4gICAgfSxcblxuICAgIGdldFRpbGU6IGZ1bmN0aW9uICh6LCB4LCB5KSB7XG4gICAgICAgIHZhciB0cmVlID0gdGhpcy50cmVlc1t0aGlzLl9saW1pdFpvb20oeildO1xuICAgICAgICB2YXIgejIgPSBNYXRoLnBvdygyLCB6KTtcbiAgICAgICAgdmFyIGV4dGVudCA9IHRoaXMub3B0aW9ucy5leHRlbnQ7XG4gICAgICAgIHZhciByID0gdGhpcy5vcHRpb25zLnJhZGl1cztcbiAgICAgICAgdmFyIHAgPSByIC8gZXh0ZW50O1xuICAgICAgICB2YXIgdG9wID0gKHkgLSBwKSAvIHoyO1xuICAgICAgICB2YXIgYm90dG9tID0gKHkgKyAxICsgcCkgLyB6MjtcblxuICAgICAgICB2YXIgdGlsZSA9IHtcbiAgICAgICAgICAgIGZlYXR1cmVzOiBbXVxuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMuX2FkZFRpbGVGZWF0dXJlcyhcbiAgICAgICAgICAgIHRyZWUucmFuZ2UoKHggLSBwKSAvIHoyLCB0b3AsICh4ICsgMSArIHApIC8gejIsIGJvdHRvbSksXG4gICAgICAgICAgICB0cmVlLnBvaW50cywgeCwgeSwgejIsIHRpbGUpO1xuXG4gICAgICAgIGlmICh4ID09PSAwKSB7XG4gICAgICAgICAgICB0aGlzLl9hZGRUaWxlRmVhdHVyZXMoXG4gICAgICAgICAgICAgICAgdHJlZS5yYW5nZSgxIC0gcCAvIHoyLCB0b3AsIDEsIGJvdHRvbSksXG4gICAgICAgICAgICAgICAgdHJlZS5wb2ludHMsIHoyLCB5LCB6MiwgdGlsZSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHggPT09IHoyIC0gMSkge1xuICAgICAgICAgICAgdGhpcy5fYWRkVGlsZUZlYXR1cmVzKFxuICAgICAgICAgICAgICAgIHRyZWUucmFuZ2UoMCwgdG9wLCBwIC8gejIsIGJvdHRvbSksXG4gICAgICAgICAgICAgICAgdHJlZS5wb2ludHMsIC0xLCB5LCB6MiwgdGlsZSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGlsZS5mZWF0dXJlcy5sZW5ndGggPyB0aWxlIDogbnVsbDtcbiAgICB9LFxuXG4gICAgZ2V0Q2x1c3RlckV4cGFuc2lvblpvb206IGZ1bmN0aW9uIChjbHVzdGVySWQpIHtcbiAgICAgICAgdmFyIGNsdXN0ZXJab29tID0gKGNsdXN0ZXJJZCAlIDMyKSAtIDE7XG4gICAgICAgIHdoaWxlIChjbHVzdGVyWm9vbSA8IHRoaXMub3B0aW9ucy5tYXhab29tKSB7XG4gICAgICAgICAgICB2YXIgY2hpbGRyZW4gPSB0aGlzLmdldENoaWxkcmVuKGNsdXN0ZXJJZCk7XG4gICAgICAgICAgICBjbHVzdGVyWm9vbSsrO1xuICAgICAgICAgICAgaWYgKGNoaWxkcmVuLmxlbmd0aCAhPT0gMSkgYnJlYWs7XG4gICAgICAgICAgICBjbHVzdGVySWQgPSBjaGlsZHJlblswXS5wcm9wZXJ0aWVzLmNsdXN0ZXJfaWQ7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGNsdXN0ZXJab29tO1xuICAgIH0sXG5cbiAgICBfYXBwZW5kTGVhdmVzOiBmdW5jdGlvbiAocmVzdWx0LCBjbHVzdGVySWQsIGxpbWl0LCBvZmZzZXQsIHNraXBwZWQpIHtcbiAgICAgICAgdmFyIGNoaWxkcmVuID0gdGhpcy5nZXRDaGlsZHJlbihjbHVzdGVySWQpO1xuXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY2hpbGRyZW4ubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBwcm9wcyA9IGNoaWxkcmVuW2ldLnByb3BlcnRpZXM7XG5cbiAgICAgICAgICAgIGlmIChwcm9wcyAmJiBwcm9wcy5jbHVzdGVyKSB7XG4gICAgICAgICAgICAgICAgaWYgKHNraXBwZWQgKyBwcm9wcy5wb2ludF9jb3VudCA8PSBvZmZzZXQpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gc2tpcCB0aGUgd2hvbGUgY2x1c3RlclxuICAgICAgICAgICAgICAgICAgICBza2lwcGVkICs9IHByb3BzLnBvaW50X2NvdW50O1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGVudGVyIHRoZSBjbHVzdGVyXG4gICAgICAgICAgICAgICAgICAgIHNraXBwZWQgPSB0aGlzLl9hcHBlbmRMZWF2ZXMocmVzdWx0LCBwcm9wcy5jbHVzdGVyX2lkLCBsaW1pdCwgb2Zmc2V0LCBza2lwcGVkKTtcbiAgICAgICAgICAgICAgICAgICAgLy8gZXhpdCB0aGUgY2x1c3RlclxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoc2tpcHBlZCA8IG9mZnNldCkge1xuICAgICAgICAgICAgICAgIC8vIHNraXAgYSBzaW5nbGUgcG9pbnRcbiAgICAgICAgICAgICAgICBza2lwcGVkKys7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIGFkZCBhIHNpbmdsZSBwb2ludFxuICAgICAgICAgICAgICAgIHJlc3VsdC5wdXNoKGNoaWxkcmVuW2ldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChyZXN1bHQubGVuZ3RoID09PSBsaW1pdCkgYnJlYWs7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gc2tpcHBlZDtcbiAgICB9LFxuXG4gICAgX2FkZFRpbGVGZWF0dXJlczogZnVuY3Rpb24gKGlkcywgcG9pbnRzLCB4LCB5LCB6MiwgdGlsZSkge1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGlkcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIGMgPSBwb2ludHNbaWRzW2ldXTtcbiAgICAgICAgICAgIHZhciBmID0ge1xuICAgICAgICAgICAgICAgIHR5cGU6IDEsXG4gICAgICAgICAgICAgICAgZ2VvbWV0cnk6IFtbXG4gICAgICAgICAgICAgICAgICAgIE1hdGgucm91bmQodGhpcy5vcHRpb25zLmV4dGVudCAqIChjLnggKiB6MiAtIHgpKSxcbiAgICAgICAgICAgICAgICAgICAgTWF0aC5yb3VuZCh0aGlzLm9wdGlvbnMuZXh0ZW50ICogKGMueSAqIHoyIC0geSkpXG4gICAgICAgICAgICAgICAgXV0sXG4gICAgICAgICAgICAgICAgdGFnczogYy5udW1Qb2ludHMgPyBnZXRDbHVzdGVyUHJvcGVydGllcyhjKSA6IHRoaXMucG9pbnRzW2MuaW5kZXhdLnByb3BlcnRpZXNcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICB2YXIgaWQgPSBjLm51bVBvaW50cyA/IGMuaWQgOiB0aGlzLnBvaW50c1tjLmluZGV4XS5pZDtcbiAgICAgICAgICAgIGlmIChpZCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgZi5pZCA9IGlkO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGlsZS5mZWF0dXJlcy5wdXNoKGYpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIF9saW1pdFpvb206IGZ1bmN0aW9uICh6KSB7XG4gICAgICAgIHJldHVybiBNYXRoLm1heCh0aGlzLm9wdGlvbnMubWluWm9vbSwgTWF0aC5taW4oeiwgdGhpcy5vcHRpb25zLm1heFpvb20gKyAxKSk7XG4gICAgfSxcblxuICAgIF9jbHVzdGVyOiBmdW5jdGlvbiAocG9pbnRzLCB6b29tKSB7XG4gICAgICAgIHZhciBjbHVzdGVycyA9IFtdO1xuICAgICAgICB2YXIgciA9IHRoaXMub3B0aW9ucy5yYWRpdXMgLyAodGhpcy5vcHRpb25zLmV4dGVudCAqIE1hdGgucG93KDIsIHpvb20pKTtcblxuICAgICAgICAvLyBsb29wIHRocm91Z2ggZWFjaCBwb2ludFxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHBvaW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIHAgPSBwb2ludHNbaV07XG4gICAgICAgICAgICAvLyBpZiB3ZSd2ZSBhbHJlYWR5IHZpc2l0ZWQgdGhlIHBvaW50IGF0IHRoaXMgem9vbSBsZXZlbCwgc2tpcCBpdFxuICAgICAgICAgICAgaWYgKHAuem9vbSA8PSB6b29tKSBjb250aW51ZTtcbiAgICAgICAgICAgIHAuem9vbSA9IHpvb207XG5cbiAgICAgICAgICAgIC8vIGZpbmQgYWxsIG5lYXJieSBwb2ludHNcbiAgICAgICAgICAgIHZhciB0cmVlID0gdGhpcy50cmVlc1t6b29tICsgMV07XG4gICAgICAgICAgICB2YXIgbmVpZ2hib3JJZHMgPSB0cmVlLndpdGhpbihwLngsIHAueSwgcik7XG5cbiAgICAgICAgICAgIHZhciBudW1Qb2ludHMgPSBwLm51bVBvaW50cyB8fCAxO1xuICAgICAgICAgICAgdmFyIHd4ID0gcC54ICogbnVtUG9pbnRzO1xuICAgICAgICAgICAgdmFyIHd5ID0gcC55ICogbnVtUG9pbnRzO1xuXG4gICAgICAgICAgICB2YXIgY2x1c3RlclByb3BlcnRpZXMgPSBudWxsO1xuXG4gICAgICAgICAgICBpZiAodGhpcy5vcHRpb25zLnJlZHVjZSkge1xuICAgICAgICAgICAgICAgIGNsdXN0ZXJQcm9wZXJ0aWVzID0gdGhpcy5vcHRpb25zLmluaXRpYWwoKTtcbiAgICAgICAgICAgICAgICB0aGlzLl9hY2N1bXVsYXRlKGNsdXN0ZXJQcm9wZXJ0aWVzLCBwKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gZW5jb2RlIGJvdGggem9vbSBhbmQgcG9pbnQgaW5kZXggb24gd2hpY2ggdGhlIGNsdXN0ZXIgb3JpZ2luYXRlZFxuICAgICAgICAgICAgdmFyIGlkID0gKGkgPDwgNSkgKyAoem9vbSArIDEpO1xuXG4gICAgICAgICAgICBmb3IgKHZhciBqID0gMDsgaiA8IG5laWdoYm9ySWRzLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICAgICAgdmFyIGIgPSB0cmVlLnBvaW50c1tuZWlnaGJvcklkc1tqXV07XG4gICAgICAgICAgICAgICAgLy8gZmlsdGVyIG91dCBuZWlnaGJvcnMgdGhhdCBhcmUgYWxyZWFkeSBwcm9jZXNzZWRcbiAgICAgICAgICAgICAgICBpZiAoYi56b29tIDw9IHpvb20pIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgIGIuem9vbSA9IHpvb207IC8vIHNhdmUgdGhlIHpvb20gKHNvIGl0IGRvZXNuJ3QgZ2V0IHByb2Nlc3NlZCB0d2ljZSlcblxuICAgICAgICAgICAgICAgIHZhciBudW1Qb2ludHMyID0gYi5udW1Qb2ludHMgfHwgMTtcbiAgICAgICAgICAgICAgICB3eCArPSBiLnggKiBudW1Qb2ludHMyOyAvLyBhY2N1bXVsYXRlIGNvb3JkaW5hdGVzIGZvciBjYWxjdWxhdGluZyB3ZWlnaHRlZCBjZW50ZXJcbiAgICAgICAgICAgICAgICB3eSArPSBiLnkgKiBudW1Qb2ludHMyO1xuXG4gICAgICAgICAgICAgICAgbnVtUG9pbnRzICs9IG51bVBvaW50czI7XG4gICAgICAgICAgICAgICAgYi5wYXJlbnRJZCA9IGlkO1xuXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMub3B0aW9ucy5yZWR1Y2UpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fYWNjdW11bGF0ZShjbHVzdGVyUHJvcGVydGllcywgYik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAobnVtUG9pbnRzID09PSAxKSB7XG4gICAgICAgICAgICAgICAgY2x1c3RlcnMucHVzaChwKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcC5wYXJlbnRJZCA9IGlkO1xuICAgICAgICAgICAgICAgIGNsdXN0ZXJzLnB1c2goY3JlYXRlQ2x1c3Rlcih3eCAvIG51bVBvaW50cywgd3kgLyBudW1Qb2ludHMsIGlkLCBudW1Qb2ludHMsIGNsdXN0ZXJQcm9wZXJ0aWVzKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gY2x1c3RlcnM7XG4gICAgfSxcblxuICAgIF9hY2N1bXVsYXRlOiBmdW5jdGlvbiAoY2x1c3RlclByb3BlcnRpZXMsIHBvaW50KSB7XG4gICAgICAgIHZhciBwcm9wZXJ0aWVzID0gcG9pbnQubnVtUG9pbnRzID9cbiAgICAgICAgICAgIHBvaW50LnByb3BlcnRpZXMgOlxuICAgICAgICAgICAgdGhpcy5vcHRpb25zLm1hcCh0aGlzLnBvaW50c1twb2ludC5pbmRleF0ucHJvcGVydGllcyk7XG5cbiAgICAgICAgdGhpcy5vcHRpb25zLnJlZHVjZShjbHVzdGVyUHJvcGVydGllcywgcHJvcGVydGllcyk7XG4gICAgfVxufTtcblxuZnVuY3Rpb24gY3JlYXRlQ2x1c3Rlcih4LCB5LCBpZCwgbnVtUG9pbnRzLCBwcm9wZXJ0aWVzKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgeDogeCwgLy8gd2VpZ2h0ZWQgY2x1c3RlciBjZW50ZXJcbiAgICAgICAgeTogeSxcbiAgICAgICAgem9vbTogSW5maW5pdHksIC8vIHRoZSBsYXN0IHpvb20gdGhlIGNsdXN0ZXIgd2FzIHByb2Nlc3NlZCBhdFxuICAgICAgICBpZDogaWQsIC8vIGVuY29kZXMgaW5kZXggb2YgdGhlIGZpcnN0IGNoaWxkIG9mIHRoZSBjbHVzdGVyIGFuZCBpdHMgem9vbSBsZXZlbFxuICAgICAgICBwYXJlbnRJZDogLTEsIC8vIHBhcmVudCBjbHVzdGVyIGlkXG4gICAgICAgIG51bVBvaW50czogbnVtUG9pbnRzLFxuICAgICAgICBwcm9wZXJ0aWVzOiBwcm9wZXJ0aWVzXG4gICAgfTtcbn1cblxuZnVuY3Rpb24gY3JlYXRlUG9pbnRDbHVzdGVyKHAsIGlkKSB7XG4gICAgdmFyIGNvb3JkcyA9IHAuZ2VvbWV0cnkuY29vcmRpbmF0ZXM7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgeDogbG5nWChjb29yZHNbMF0pLCAvLyBwcm9qZWN0ZWQgcG9pbnQgY29vcmRpbmF0ZXNcbiAgICAgICAgeTogbGF0WShjb29yZHNbMV0pLFxuICAgICAgICB6b29tOiBJbmZpbml0eSwgLy8gdGhlIGxhc3Qgem9vbSB0aGUgcG9pbnQgd2FzIHByb2Nlc3NlZCBhdFxuICAgICAgICBpbmRleDogaWQsIC8vIGluZGV4IG9mIHRoZSBzb3VyY2UgZmVhdHVyZSBpbiB0aGUgb3JpZ2luYWwgaW5wdXQgYXJyYXksXG4gICAgICAgIHBhcmVudElkOiAtMSAvLyBwYXJlbnQgY2x1c3RlciBpZFxuICAgIH07XG59XG5cbmZ1bmN0aW9uIGdldENsdXN0ZXJKU09OKGNsdXN0ZXIpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICB0eXBlOiAnRmVhdHVyZScsXG4gICAgICAgIGlkOiBjbHVzdGVyLmlkLFxuICAgICAgICBwcm9wZXJ0aWVzOiBnZXRDbHVzdGVyUHJvcGVydGllcyhjbHVzdGVyKSxcbiAgICAgICAgZ2VvbWV0cnk6IHtcbiAgICAgICAgICAgIHR5cGU6ICdQb2ludCcsXG4gICAgICAgICAgICBjb29yZGluYXRlczogW3hMbmcoY2x1c3Rlci54KSwgeUxhdChjbHVzdGVyLnkpXVxuICAgICAgICB9XG4gICAgfTtcbn1cblxuZnVuY3Rpb24gZ2V0Q2x1c3RlclByb3BlcnRpZXMoY2x1c3Rlcikge1xuICAgIHZhciBjb3VudCA9IGNsdXN0ZXIubnVtUG9pbnRzO1xuICAgIHZhciBhYmJyZXYgPVxuICAgICAgICBjb3VudCA+PSAxMDAwMCA/IE1hdGgucm91bmQoY291bnQgLyAxMDAwKSArICdrJyA6XG4gICAgICAgIGNvdW50ID49IDEwMDAgPyAoTWF0aC5yb3VuZChjb3VudCAvIDEwMCkgLyAxMCkgKyAnaycgOiBjb3VudDtcbiAgICByZXR1cm4gZXh0ZW5kKGV4dGVuZCh7fSwgY2x1c3Rlci5wcm9wZXJ0aWVzKSwge1xuICAgICAgICBjbHVzdGVyOiB0cnVlLFxuICAgICAgICBjbHVzdGVyX2lkOiBjbHVzdGVyLmlkLFxuICAgICAgICBwb2ludF9jb3VudDogY291bnQsXG4gICAgICAgIHBvaW50X2NvdW50X2FiYnJldmlhdGVkOiBhYmJyZXZcbiAgICB9KTtcbn1cblxuLy8gbG9uZ2l0dWRlL2xhdGl0dWRlIHRvIHNwaGVyaWNhbCBtZXJjYXRvciBpbiBbMC4uMV0gcmFuZ2VcbmZ1bmN0aW9uIGxuZ1gobG5nKSB7XG4gICAgcmV0dXJuIGxuZyAvIDM2MCArIDAuNTtcbn1cbmZ1bmN0aW9uIGxhdFkobGF0KSB7XG4gICAgdmFyIHNpbiA9IE1hdGguc2luKGxhdCAqIE1hdGguUEkgLyAxODApLFxuICAgICAgICB5ID0gKDAuNSAtIDAuMjUgKiBNYXRoLmxvZygoMSArIHNpbikgLyAoMSAtIHNpbikpIC8gTWF0aC5QSSk7XG4gICAgcmV0dXJuIHkgPCAwID8gMCA6IHkgPiAxID8gMSA6IHk7XG59XG5cbi8vIHNwaGVyaWNhbCBtZXJjYXRvciB0byBsb25naXR1ZGUvbGF0aXR1ZGVcbmZ1bmN0aW9uIHhMbmcoeCkge1xuICAgIHJldHVybiAoeCAtIDAuNSkgKiAzNjA7XG59XG5mdW5jdGlvbiB5TGF0KHkpIHtcbiAgICB2YXIgeTIgPSAoMTgwIC0geSAqIDM2MCkgKiBNYXRoLlBJIC8gMTgwO1xuICAgIHJldHVybiAzNjAgKiBNYXRoLmF0YW4oTWF0aC5leHAoeTIpKSAvIE1hdGguUEkgLSA5MDtcbn1cblxuZnVuY3Rpb24gZXh0ZW5kKGRlc3QsIHNyYykge1xuICAgIGZvciAodmFyIGlkIGluIHNyYykgZGVzdFtpZF0gPSBzcmNbaWRdO1xuICAgIHJldHVybiBkZXN0O1xufVxuXG5mdW5jdGlvbiBnZXRYKHApIHtcbiAgICByZXR1cm4gcC54O1xufVxuZnVuY3Rpb24gZ2V0WShwKSB7XG4gICAgcmV0dXJuIHAueTtcbn1cbiIsIlxuLy8gY2FsY3VsYXRlIHNpbXBsaWZpY2F0aW9uIGRhdGEgdXNpbmcgb3B0aW1pemVkIERvdWdsYXMtUGV1Y2tlciBhbGdvcml0aG1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gc2ltcGxpZnkoY29vcmRzLCBmaXJzdCwgbGFzdCwgc3FUb2xlcmFuY2UpIHtcbiAgICB2YXIgbWF4U3FEaXN0ID0gc3FUb2xlcmFuY2U7XG4gICAgdmFyIG1pZCA9IChsYXN0IC0gZmlyc3QpID4+IDE7XG4gICAgdmFyIG1pblBvc1RvTWlkID0gbGFzdCAtIGZpcnN0O1xuICAgIHZhciBpbmRleDtcblxuICAgIHZhciBheCA9IGNvb3Jkc1tmaXJzdF07XG4gICAgdmFyIGF5ID0gY29vcmRzW2ZpcnN0ICsgMV07XG4gICAgdmFyIGJ4ID0gY29vcmRzW2xhc3RdO1xuICAgIHZhciBieSA9IGNvb3Jkc1tsYXN0ICsgMV07XG5cbiAgICBmb3IgKHZhciBpID0gZmlyc3QgKyAzOyBpIDwgbGFzdDsgaSArPSAzKSB7XG4gICAgICAgIHZhciBkID0gZ2V0U3FTZWdEaXN0KGNvb3Jkc1tpXSwgY29vcmRzW2kgKyAxXSwgYXgsIGF5LCBieCwgYnkpO1xuXG4gICAgICAgIGlmIChkID4gbWF4U3FEaXN0KSB7XG4gICAgICAgICAgICBpbmRleCA9IGk7XG4gICAgICAgICAgICBtYXhTcURpc3QgPSBkO1xuXG4gICAgICAgIH0gZWxzZSBpZiAoZCA9PT0gbWF4U3FEaXN0KSB7XG4gICAgICAgICAgICAvLyBhIHdvcmthcm91bmQgdG8gZW5zdXJlIHdlIGNob29zZSBhIHBpdm90IGNsb3NlIHRvIHRoZSBtaWRkbGUgb2YgdGhlIGxpc3QsXG4gICAgICAgICAgICAvLyByZWR1Y2luZyByZWN1cnNpb24gZGVwdGgsIGZvciBjZXJ0YWluIGRlZ2VuZXJhdGUgaW5wdXRzXG4gICAgICAgICAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vbWFwYm94L2dlb2pzb24tdnQvaXNzdWVzLzEwNFxuICAgICAgICAgICAgdmFyIHBvc1RvTWlkID0gTWF0aC5hYnMoaSAtIG1pZCk7XG4gICAgICAgICAgICBpZiAocG9zVG9NaWQgPCBtaW5Qb3NUb01pZCkge1xuICAgICAgICAgICAgICAgIGluZGV4ID0gaTtcbiAgICAgICAgICAgICAgICBtaW5Qb3NUb01pZCA9IHBvc1RvTWlkO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgaWYgKG1heFNxRGlzdCA+IHNxVG9sZXJhbmNlKSB7XG4gICAgICAgIGlmIChpbmRleCAtIGZpcnN0ID4gMykgc2ltcGxpZnkoY29vcmRzLCBmaXJzdCwgaW5kZXgsIHNxVG9sZXJhbmNlKTtcbiAgICAgICAgY29vcmRzW2luZGV4ICsgMl0gPSBtYXhTcURpc3Q7XG4gICAgICAgIGlmIChsYXN0IC0gaW5kZXggPiAzKSBzaW1wbGlmeShjb29yZHMsIGluZGV4LCBsYXN0LCBzcVRvbGVyYW5jZSk7XG4gICAgfVxufVxuXG4vLyBzcXVhcmUgZGlzdGFuY2UgZnJvbSBhIHBvaW50IHRvIGEgc2VnbWVudFxuZnVuY3Rpb24gZ2V0U3FTZWdEaXN0KHB4LCBweSwgeCwgeSwgYngsIGJ5KSB7XG5cbiAgICB2YXIgZHggPSBieCAtIHg7XG4gICAgdmFyIGR5ID0gYnkgLSB5O1xuXG4gICAgaWYgKGR4ICE9PSAwIHx8IGR5ICE9PSAwKSB7XG5cbiAgICAgICAgdmFyIHQgPSAoKHB4IC0geCkgKiBkeCArIChweSAtIHkpICogZHkpIC8gKGR4ICogZHggKyBkeSAqIGR5KTtcblxuICAgICAgICBpZiAodCA+IDEpIHtcbiAgICAgICAgICAgIHggPSBieDtcbiAgICAgICAgICAgIHkgPSBieTtcblxuICAgICAgICB9IGVsc2UgaWYgKHQgPiAwKSB7XG4gICAgICAgICAgICB4ICs9IGR4ICogdDtcbiAgICAgICAgICAgIHkgKz0gZHkgKiB0O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZHggPSBweCAtIHg7XG4gICAgZHkgPSBweSAtIHk7XG5cbiAgICByZXR1cm4gZHggKiBkeCArIGR5ICogZHk7XG59XG4iLCJcbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGNyZWF0ZUZlYXR1cmUoaWQsIHR5cGUsIGdlb20sIHRhZ3MpIHtcbiAgICB2YXIgZmVhdHVyZSA9IHtcbiAgICAgICAgaWQ6IHR5cGVvZiBpZCA9PT0gJ3VuZGVmaW5lZCcgPyBudWxsIDogaWQsXG4gICAgICAgIHR5cGU6IHR5cGUsXG4gICAgICAgIGdlb21ldHJ5OiBnZW9tLFxuICAgICAgICB0YWdzOiB0YWdzLFxuICAgICAgICBtaW5YOiBJbmZpbml0eSxcbiAgICAgICAgbWluWTogSW5maW5pdHksXG4gICAgICAgIG1heFg6IC1JbmZpbml0eSxcbiAgICAgICAgbWF4WTogLUluZmluaXR5XG4gICAgfTtcbiAgICBjYWxjQkJveChmZWF0dXJlKTtcbiAgICByZXR1cm4gZmVhdHVyZTtcbn1cblxuZnVuY3Rpb24gY2FsY0JCb3goZmVhdHVyZSkge1xuICAgIHZhciBnZW9tID0gZmVhdHVyZS5nZW9tZXRyeTtcbiAgICB2YXIgdHlwZSA9IGZlYXR1cmUudHlwZTtcblxuICAgIGlmICh0eXBlID09PSAnUG9pbnQnIHx8IHR5cGUgPT09ICdNdWx0aVBvaW50JyB8fCB0eXBlID09PSAnTGluZVN0cmluZycpIHtcbiAgICAgICAgY2FsY0xpbmVCQm94KGZlYXR1cmUsIGdlb20pO1xuXG4gICAgfSBlbHNlIGlmICh0eXBlID09PSAnUG9seWdvbicgfHwgdHlwZSA9PT0gJ011bHRpTGluZVN0cmluZycpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBnZW9tLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBjYWxjTGluZUJCb3goZmVhdHVyZSwgZ2VvbVtpXSk7XG4gICAgICAgIH1cblxuICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gJ011bHRpUG9seWdvbicpIHtcbiAgICAgICAgZm9yIChpID0gMDsgaSA8IGdlb20ubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgZ2VvbVtpXS5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgICAgIGNhbGNMaW5lQkJveChmZWF0dXJlLCBnZW9tW2ldW2pdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn1cblxuZnVuY3Rpb24gY2FsY0xpbmVCQm94KGZlYXR1cmUsIGdlb20pIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGdlb20ubGVuZ3RoOyBpICs9IDMpIHtcbiAgICAgICAgZmVhdHVyZS5taW5YID0gTWF0aC5taW4oZmVhdHVyZS5taW5YLCBnZW9tW2ldKTtcbiAgICAgICAgZmVhdHVyZS5taW5ZID0gTWF0aC5taW4oZmVhdHVyZS5taW5ZLCBnZW9tW2kgKyAxXSk7XG4gICAgICAgIGZlYXR1cmUubWF4WCA9IE1hdGgubWF4KGZlYXR1cmUubWF4WCwgZ2VvbVtpXSk7XG4gICAgICAgIGZlYXR1cmUubWF4WSA9IE1hdGgubWF4KGZlYXR1cmUubWF4WSwgZ2VvbVtpICsgMV0pO1xuICAgIH1cbn1cbiIsIlxuaW1wb3J0IHNpbXBsaWZ5IGZyb20gJy4vc2ltcGxpZnknO1xuaW1wb3J0IGNyZWF0ZUZlYXR1cmUgZnJvbSAnLi9mZWF0dXJlJztcblxuLy8gY29udmVydHMgR2VvSlNPTiBmZWF0dXJlIGludG8gYW4gaW50ZXJtZWRpYXRlIHByb2plY3RlZCBKU09OIHZlY3RvciBmb3JtYXQgd2l0aCBzaW1wbGlmaWNhdGlvbiBkYXRhXG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGNvbnZlcnQoZGF0YSwgb3B0aW9ucykge1xuICAgIHZhciBmZWF0dXJlcyA9IFtdO1xuICAgIGlmIChkYXRhLnR5cGUgPT09ICdGZWF0dXJlQ29sbGVjdGlvbicpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBkYXRhLmZlYXR1cmVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBjb252ZXJ0RmVhdHVyZShmZWF0dXJlcywgZGF0YS5mZWF0dXJlc1tpXSwgb3B0aW9ucywgaSk7XG4gICAgICAgIH1cblxuICAgIH0gZWxzZSBpZiAoZGF0YS50eXBlID09PSAnRmVhdHVyZScpIHtcbiAgICAgICAgY29udmVydEZlYXR1cmUoZmVhdHVyZXMsIGRhdGEsIG9wdGlvbnMpO1xuXG4gICAgfSBlbHNlIHtcbiAgICAgICAgLy8gc2luZ2xlIGdlb21ldHJ5IG9yIGEgZ2VvbWV0cnkgY29sbGVjdGlvblxuICAgICAgICBjb252ZXJ0RmVhdHVyZShmZWF0dXJlcywge2dlb21ldHJ5OiBkYXRhfSwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGZlYXR1cmVzO1xufVxuXG5mdW5jdGlvbiBjb252ZXJ0RmVhdHVyZShmZWF0dXJlcywgZ2VvanNvbiwgb3B0aW9ucywgaW5kZXgpIHtcbiAgICBpZiAoIWdlb2pzb24uZ2VvbWV0cnkpIHJldHVybjtcblxuICAgIHZhciBjb29yZHMgPSBnZW9qc29uLmdlb21ldHJ5LmNvb3JkaW5hdGVzO1xuICAgIHZhciB0eXBlID0gZ2VvanNvbi5nZW9tZXRyeS50eXBlO1xuICAgIHZhciB0b2xlcmFuY2UgPSBNYXRoLnBvdyhvcHRpb25zLnRvbGVyYW5jZSAvICgoMSA8PCBvcHRpb25zLm1heFpvb20pICogb3B0aW9ucy5leHRlbnQpLCAyKTtcbiAgICB2YXIgZ2VvbWV0cnkgPSBbXTtcbiAgICB2YXIgaWQgPSBnZW9qc29uLmlkO1xuICAgIGlmIChvcHRpb25zLnByb21vdGVJZCkge1xuICAgICAgICBpZCA9IGdlb2pzb24ucHJvcGVydGllc1tvcHRpb25zLnByb21vdGVJZF07XG4gICAgfSBlbHNlIGlmIChvcHRpb25zLmdlbmVyYXRlSWQpIHtcbiAgICAgICAgaWQgPSBpbmRleCB8fCAwO1xuICAgIH1cbiAgICBpZiAodHlwZSA9PT0gJ1BvaW50Jykge1xuICAgICAgICBjb252ZXJ0UG9pbnQoY29vcmRzLCBnZW9tZXRyeSk7XG5cbiAgICB9IGVsc2UgaWYgKHR5cGUgPT09ICdNdWx0aVBvaW50Jykge1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNvb3Jkcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgY29udmVydFBvaW50KGNvb3Jkc1tpXSwgZ2VvbWV0cnkpO1xuICAgICAgICB9XG5cbiAgICB9IGVsc2UgaWYgKHR5cGUgPT09ICdMaW5lU3RyaW5nJykge1xuICAgICAgICBjb252ZXJ0TGluZShjb29yZHMsIGdlb21ldHJ5LCB0b2xlcmFuY2UsIGZhbHNlKTtcblxuICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gJ011bHRpTGluZVN0cmluZycpIHtcbiAgICAgICAgaWYgKG9wdGlvbnMubGluZU1ldHJpY3MpIHtcbiAgICAgICAgICAgIC8vIGV4cGxvZGUgaW50byBsaW5lc3RyaW5ncyB0byBiZSBhYmxlIHRvIHRyYWNrIG1ldHJpY3NcbiAgICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCBjb29yZHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICBnZW9tZXRyeSA9IFtdO1xuICAgICAgICAgICAgICAgIGNvbnZlcnRMaW5lKGNvb3Jkc1tpXSwgZ2VvbWV0cnksIHRvbGVyYW5jZSwgZmFsc2UpO1xuICAgICAgICAgICAgICAgIGZlYXR1cmVzLnB1c2goY3JlYXRlRmVhdHVyZShpZCwgJ0xpbmVTdHJpbmcnLCBnZW9tZXRyeSwgZ2VvanNvbi5wcm9wZXJ0aWVzKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb252ZXJ0TGluZXMoY29vcmRzLCBnZW9tZXRyeSwgdG9sZXJhbmNlLCBmYWxzZSk7XG4gICAgICAgIH1cblxuICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gJ1BvbHlnb24nKSB7XG4gICAgICAgIGNvbnZlcnRMaW5lcyhjb29yZHMsIGdlb21ldHJ5LCB0b2xlcmFuY2UsIHRydWUpO1xuXG4gICAgfSBlbHNlIGlmICh0eXBlID09PSAnTXVsdGlQb2x5Z29uJykge1xuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgY29vcmRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgcG9seWdvbiA9IFtdO1xuICAgICAgICAgICAgY29udmVydExpbmVzKGNvb3Jkc1tpXSwgcG9seWdvbiwgdG9sZXJhbmNlLCB0cnVlKTtcbiAgICAgICAgICAgIGdlb21ldHJ5LnB1c2gocG9seWdvbik7XG4gICAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHR5cGUgPT09ICdHZW9tZXRyeUNvbGxlY3Rpb24nKSB7XG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBnZW9qc29uLmdlb21ldHJ5Lmdlb21ldHJpZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGNvbnZlcnRGZWF0dXJlKGZlYXR1cmVzLCB7XG4gICAgICAgICAgICAgICAgaWQ6IGlkLFxuICAgICAgICAgICAgICAgIGdlb21ldHJ5OiBnZW9qc29uLmdlb21ldHJ5Lmdlb21ldHJpZXNbaV0sXG4gICAgICAgICAgICAgICAgcHJvcGVydGllczogZ2VvanNvbi5wcm9wZXJ0aWVzXG4gICAgICAgICAgICB9LCBvcHRpb25zLCBpbmRleCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignSW5wdXQgZGF0YSBpcyBub3QgYSB2YWxpZCBHZW9KU09OIG9iamVjdC4nKTtcbiAgICB9XG5cbiAgICBmZWF0dXJlcy5wdXNoKGNyZWF0ZUZlYXR1cmUoaWQsIHR5cGUsIGdlb21ldHJ5LCBnZW9qc29uLnByb3BlcnRpZXMpKTtcbn1cblxuZnVuY3Rpb24gY29udmVydFBvaW50KGNvb3Jkcywgb3V0KSB7XG4gICAgb3V0LnB1c2gocHJvamVjdFgoY29vcmRzWzBdKSk7XG4gICAgb3V0LnB1c2gocHJvamVjdFkoY29vcmRzWzFdKSk7XG4gICAgb3V0LnB1c2goMCk7XG59XG5cbmZ1bmN0aW9uIGNvbnZlcnRMaW5lKHJpbmcsIG91dCwgdG9sZXJhbmNlLCBpc1BvbHlnb24pIHtcbiAgICB2YXIgeDAsIHkwO1xuICAgIHZhciBzaXplID0gMDtcblxuICAgIGZvciAodmFyIGogPSAwOyBqIDwgcmluZy5sZW5ndGg7IGorKykge1xuICAgICAgICB2YXIgeCA9IHByb2plY3RYKHJpbmdbal1bMF0pO1xuICAgICAgICB2YXIgeSA9IHByb2plY3RZKHJpbmdbal1bMV0pO1xuXG4gICAgICAgIG91dC5wdXNoKHgpO1xuICAgICAgICBvdXQucHVzaCh5KTtcbiAgICAgICAgb3V0LnB1c2goMCk7XG5cbiAgICAgICAgaWYgKGogPiAwKSB7XG4gICAgICAgICAgICBpZiAoaXNQb2x5Z29uKSB7XG4gICAgICAgICAgICAgICAgc2l6ZSArPSAoeDAgKiB5IC0geCAqIHkwKSAvIDI7IC8vIGFyZWFcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgc2l6ZSArPSBNYXRoLnNxcnQoTWF0aC5wb3coeCAtIHgwLCAyKSArIE1hdGgucG93KHkgLSB5MCwgMikpOyAvLyBsZW5ndGhcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB4MCA9IHg7XG4gICAgICAgIHkwID0geTtcbiAgICB9XG5cbiAgICB2YXIgbGFzdCA9IG91dC5sZW5ndGggLSAzO1xuICAgIG91dFsyXSA9IDE7XG4gICAgc2ltcGxpZnkob3V0LCAwLCBsYXN0LCB0b2xlcmFuY2UpO1xuICAgIG91dFtsYXN0ICsgMl0gPSAxO1xuXG4gICAgb3V0LnNpemUgPSBNYXRoLmFicyhzaXplKTtcbiAgICBvdXQuc3RhcnQgPSAwO1xuICAgIG91dC5lbmQgPSBvdXQuc2l6ZTtcbn1cblxuZnVuY3Rpb24gY29udmVydExpbmVzKHJpbmdzLCBvdXQsIHRvbGVyYW5jZSwgaXNQb2x5Z29uKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCByaW5ncy5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgZ2VvbSA9IFtdO1xuICAgICAgICBjb252ZXJ0TGluZShyaW5nc1tpXSwgZ2VvbSwgdG9sZXJhbmNlLCBpc1BvbHlnb24pO1xuICAgICAgICBvdXQucHVzaChnZW9tKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIHByb2plY3RYKHgpIHtcbiAgICByZXR1cm4geCAvIDM2MCArIDAuNTtcbn1cblxuZnVuY3Rpb24gcHJvamVjdFkoeSkge1xuICAgIHZhciBzaW4gPSBNYXRoLnNpbih5ICogTWF0aC5QSSAvIDE4MCk7XG4gICAgdmFyIHkyID0gMC41IC0gMC4yNSAqIE1hdGgubG9nKCgxICsgc2luKSAvICgxIC0gc2luKSkgLyBNYXRoLlBJO1xuICAgIHJldHVybiB5MiA8IDAgPyAwIDogeTIgPiAxID8gMSA6IHkyO1xufVxuIiwiXG5pbXBvcnQgY3JlYXRlRmVhdHVyZSBmcm9tICcuL2ZlYXR1cmUnO1xuXG4vKiBjbGlwIGZlYXR1cmVzIGJldHdlZW4gdHdvIGF4aXMtcGFyYWxsZWwgbGluZXM6XG4gKiAgICAgfCAgICAgICAgfFxuICogIF9fX3xfX18gICAgIHwgICAgIC9cbiAqIC8gICB8ICAgXFxfX19ffF9fX18vXG4gKiAgICAgfCAgICAgICAgfFxuICovXG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGNsaXAoZmVhdHVyZXMsIHNjYWxlLCBrMSwgazIsIGF4aXMsIG1pbkFsbCwgbWF4QWxsLCBvcHRpb25zKSB7XG5cbiAgICBrMSAvPSBzY2FsZTtcbiAgICBrMiAvPSBzY2FsZTtcblxuICAgIGlmIChtaW5BbGwgPj0gazEgJiYgbWF4QWxsIDwgazIpIHJldHVybiBmZWF0dXJlczsgLy8gdHJpdmlhbCBhY2NlcHRcbiAgICBlbHNlIGlmIChtYXhBbGwgPCBrMSB8fCBtaW5BbGwgPj0gazIpIHJldHVybiBudWxsOyAvLyB0cml2aWFsIHJlamVjdFxuXG4gICAgdmFyIGNsaXBwZWQgPSBbXTtcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZmVhdHVyZXMubGVuZ3RoOyBpKyspIHtcblxuICAgICAgICB2YXIgZmVhdHVyZSA9IGZlYXR1cmVzW2ldO1xuICAgICAgICB2YXIgZ2VvbWV0cnkgPSBmZWF0dXJlLmdlb21ldHJ5O1xuICAgICAgICB2YXIgdHlwZSA9IGZlYXR1cmUudHlwZTtcblxuICAgICAgICB2YXIgbWluID0gYXhpcyA9PT0gMCA/IGZlYXR1cmUubWluWCA6IGZlYXR1cmUubWluWTtcbiAgICAgICAgdmFyIG1heCA9IGF4aXMgPT09IDAgPyBmZWF0dXJlLm1heFggOiBmZWF0dXJlLm1heFk7XG5cbiAgICAgICAgaWYgKG1pbiA+PSBrMSAmJiBtYXggPCBrMikgeyAvLyB0cml2aWFsIGFjY2VwdFxuICAgICAgICAgICAgY2xpcHBlZC5wdXNoKGZlYXR1cmUpO1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgIH0gZWxzZSBpZiAobWF4IDwgazEgfHwgbWluID49IGsyKSB7IC8vIHRyaXZpYWwgcmVqZWN0XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBuZXdHZW9tZXRyeSA9IFtdO1xuXG4gICAgICAgIGlmICh0eXBlID09PSAnUG9pbnQnIHx8IHR5cGUgPT09ICdNdWx0aVBvaW50Jykge1xuICAgICAgICAgICAgY2xpcFBvaW50cyhnZW9tZXRyeSwgbmV3R2VvbWV0cnksIGsxLCBrMiwgYXhpcyk7XG5cbiAgICAgICAgfSBlbHNlIGlmICh0eXBlID09PSAnTGluZVN0cmluZycpIHtcbiAgICAgICAgICAgIGNsaXBMaW5lKGdlb21ldHJ5LCBuZXdHZW9tZXRyeSwgazEsIGsyLCBheGlzLCBmYWxzZSwgb3B0aW9ucy5saW5lTWV0cmljcyk7XG5cbiAgICAgICAgfSBlbHNlIGlmICh0eXBlID09PSAnTXVsdGlMaW5lU3RyaW5nJykge1xuICAgICAgICAgICAgY2xpcExpbmVzKGdlb21ldHJ5LCBuZXdHZW9tZXRyeSwgazEsIGsyLCBheGlzLCBmYWxzZSk7XG5cbiAgICAgICAgfSBlbHNlIGlmICh0eXBlID09PSAnUG9seWdvbicpIHtcbiAgICAgICAgICAgIGNsaXBMaW5lcyhnZW9tZXRyeSwgbmV3R2VvbWV0cnksIGsxLCBrMiwgYXhpcywgdHJ1ZSk7XG5cbiAgICAgICAgfSBlbHNlIGlmICh0eXBlID09PSAnTXVsdGlQb2x5Z29uJykge1xuICAgICAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBnZW9tZXRyeS5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgICAgIHZhciBwb2x5Z29uID0gW107XG4gICAgICAgICAgICAgICAgY2xpcExpbmVzKGdlb21ldHJ5W2pdLCBwb2x5Z29uLCBrMSwgazIsIGF4aXMsIHRydWUpO1xuICAgICAgICAgICAgICAgIGlmIChwb2x5Z29uLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICBuZXdHZW9tZXRyeS5wdXNoKHBvbHlnb24pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChuZXdHZW9tZXRyeS5sZW5ndGgpIHtcbiAgICAgICAgICAgIGlmIChvcHRpb25zLmxpbmVNZXRyaWNzICYmIHR5cGUgPT09ICdMaW5lU3RyaW5nJykge1xuICAgICAgICAgICAgICAgIGZvciAoaiA9IDA7IGogPCBuZXdHZW9tZXRyeS5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgICAgICAgICBjbGlwcGVkLnB1c2goY3JlYXRlRmVhdHVyZShmZWF0dXJlLmlkLCB0eXBlLCBuZXdHZW9tZXRyeVtqXSwgZmVhdHVyZS50YWdzKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAodHlwZSA9PT0gJ0xpbmVTdHJpbmcnIHx8IHR5cGUgPT09ICdNdWx0aUxpbmVTdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgaWYgKG5ld0dlb21ldHJ5Lmxlbmd0aCA9PT0gMSkge1xuICAgICAgICAgICAgICAgICAgICB0eXBlID0gJ0xpbmVTdHJpbmcnO1xuICAgICAgICAgICAgICAgICAgICBuZXdHZW9tZXRyeSA9IG5ld0dlb21ldHJ5WzBdO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGUgPSAnTXVsdGlMaW5lU3RyaW5nJztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodHlwZSA9PT0gJ1BvaW50JyB8fCB0eXBlID09PSAnTXVsdGlQb2ludCcpIHtcbiAgICAgICAgICAgICAgICB0eXBlID0gbmV3R2VvbWV0cnkubGVuZ3RoID09PSAzID8gJ1BvaW50JyA6ICdNdWx0aVBvaW50JztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY2xpcHBlZC5wdXNoKGNyZWF0ZUZlYXR1cmUoZmVhdHVyZS5pZCwgdHlwZSwgbmV3R2VvbWV0cnksIGZlYXR1cmUudGFncykpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGNsaXBwZWQubGVuZ3RoID8gY2xpcHBlZCA6IG51bGw7XG59XG5cbmZ1bmN0aW9uIGNsaXBQb2ludHMoZ2VvbSwgbmV3R2VvbSwgazEsIGsyLCBheGlzKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBnZW9tLmxlbmd0aDsgaSArPSAzKSB7XG4gICAgICAgIHZhciBhID0gZ2VvbVtpICsgYXhpc107XG5cbiAgICAgICAgaWYgKGEgPj0gazEgJiYgYSA8PSBrMikge1xuICAgICAgICAgICAgbmV3R2VvbS5wdXNoKGdlb21baV0pO1xuICAgICAgICAgICAgbmV3R2VvbS5wdXNoKGdlb21baSArIDFdKTtcbiAgICAgICAgICAgIG5ld0dlb20ucHVzaChnZW9tW2kgKyAyXSk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbmZ1bmN0aW9uIGNsaXBMaW5lKGdlb20sIG5ld0dlb20sIGsxLCBrMiwgYXhpcywgaXNQb2x5Z29uLCB0cmFja01ldHJpY3MpIHtcblxuICAgIHZhciBzbGljZSA9IG5ld1NsaWNlKGdlb20pO1xuICAgIHZhciBpbnRlcnNlY3QgPSBheGlzID09PSAwID8gaW50ZXJzZWN0WCA6IGludGVyc2VjdFk7XG4gICAgdmFyIGxlbiA9IGdlb20uc3RhcnQ7XG4gICAgdmFyIHNlZ0xlbiwgdDtcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZ2VvbS5sZW5ndGggLSAzOyBpICs9IDMpIHtcbiAgICAgICAgdmFyIGF4ID0gZ2VvbVtpXTtcbiAgICAgICAgdmFyIGF5ID0gZ2VvbVtpICsgMV07XG4gICAgICAgIHZhciBheiA9IGdlb21baSArIDJdO1xuICAgICAgICB2YXIgYnggPSBnZW9tW2kgKyAzXTtcbiAgICAgICAgdmFyIGJ5ID0gZ2VvbVtpICsgNF07XG4gICAgICAgIHZhciBhID0gYXhpcyA9PT0gMCA/IGF4IDogYXk7XG4gICAgICAgIHZhciBiID0gYXhpcyA9PT0gMCA/IGJ4IDogYnk7XG4gICAgICAgIHZhciBleGl0ZWQgPSBmYWxzZTtcblxuICAgICAgICBpZiAodHJhY2tNZXRyaWNzKSBzZWdMZW4gPSBNYXRoLnNxcnQoTWF0aC5wb3coYXggLSBieCwgMikgKyBNYXRoLnBvdyhheSAtIGJ5LCAyKSk7XG5cbiAgICAgICAgaWYgKGEgPCBrMSkge1xuICAgICAgICAgICAgLy8gLS0tfC0tPiAgfCAobGluZSBlbnRlcnMgdGhlIGNsaXAgcmVnaW9uIGZyb20gdGhlIGxlZnQpXG4gICAgICAgICAgICBpZiAoYiA+PSBrMSkge1xuICAgICAgICAgICAgICAgIHQgPSBpbnRlcnNlY3Qoc2xpY2UsIGF4LCBheSwgYngsIGJ5LCBrMSk7XG4gICAgICAgICAgICAgICAgaWYgKHRyYWNrTWV0cmljcykgc2xpY2Uuc3RhcnQgPSBsZW4gKyBzZWdMZW4gKiB0O1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKGEgPj0gazIpIHtcbiAgICAgICAgICAgIC8vIHwgIDwtLXwtLS0gKGxpbmUgZW50ZXJzIHRoZSBjbGlwIHJlZ2lvbiBmcm9tIHRoZSByaWdodClcbiAgICAgICAgICAgIGlmIChiIDwgazIpIHtcbiAgICAgICAgICAgICAgICB0ID0gaW50ZXJzZWN0KHNsaWNlLCBheCwgYXksIGJ4LCBieSwgazIpO1xuICAgICAgICAgICAgICAgIGlmICh0cmFja01ldHJpY3MpIHNsaWNlLnN0YXJ0ID0gbGVuICsgc2VnTGVuICogdDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGFkZFBvaW50KHNsaWNlLCBheCwgYXksIGF6KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoYiA8IGsxICYmIGEgPj0gazEpIHtcbiAgICAgICAgICAgIC8vIDwtLXwtLS0gIHwgb3IgPC0tfC0tLS0tfC0tLSAobGluZSBleGl0cyB0aGUgY2xpcCByZWdpb24gb24gdGhlIGxlZnQpXG4gICAgICAgICAgICB0ID0gaW50ZXJzZWN0KHNsaWNlLCBheCwgYXksIGJ4LCBieSwgazEpO1xuICAgICAgICAgICAgZXhpdGVkID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoYiA+IGsyICYmIGEgPD0gazIpIHtcbiAgICAgICAgICAgIC8vIHwgIC0tLXwtLT4gb3IgLS0tfC0tLS0tfC0tPiAobGluZSBleGl0cyB0aGUgY2xpcCByZWdpb24gb24gdGhlIHJpZ2h0KVxuICAgICAgICAgICAgdCA9IGludGVyc2VjdChzbGljZSwgYXgsIGF5LCBieCwgYnksIGsyKTtcbiAgICAgICAgICAgIGV4aXRlZCA9IHRydWU7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIWlzUG9seWdvbiAmJiBleGl0ZWQpIHtcbiAgICAgICAgICAgIGlmICh0cmFja01ldHJpY3MpIHNsaWNlLmVuZCA9IGxlbiArIHNlZ0xlbiAqIHQ7XG4gICAgICAgICAgICBuZXdHZW9tLnB1c2goc2xpY2UpO1xuICAgICAgICAgICAgc2xpY2UgPSBuZXdTbGljZShnZW9tKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0cmFja01ldHJpY3MpIGxlbiArPSBzZWdMZW47XG4gICAgfVxuXG4gICAgLy8gYWRkIHRoZSBsYXN0IHBvaW50XG4gICAgdmFyIGxhc3QgPSBnZW9tLmxlbmd0aCAtIDM7XG4gICAgYXggPSBnZW9tW2xhc3RdO1xuICAgIGF5ID0gZ2VvbVtsYXN0ICsgMV07XG4gICAgYXogPSBnZW9tW2xhc3QgKyAyXTtcbiAgICBhID0gYXhpcyA9PT0gMCA/IGF4IDogYXk7XG4gICAgaWYgKGEgPj0gazEgJiYgYSA8PSBrMikgYWRkUG9pbnQoc2xpY2UsIGF4LCBheSwgYXopO1xuXG4gICAgLy8gY2xvc2UgdGhlIHBvbHlnb24gaWYgaXRzIGVuZHBvaW50cyBhcmUgbm90IHRoZSBzYW1lIGFmdGVyIGNsaXBwaW5nXG4gICAgbGFzdCA9IHNsaWNlLmxlbmd0aCAtIDM7XG4gICAgaWYgKGlzUG9seWdvbiAmJiBsYXN0ID49IDMgJiYgKHNsaWNlW2xhc3RdICE9PSBzbGljZVswXSB8fCBzbGljZVtsYXN0ICsgMV0gIT09IHNsaWNlWzFdKSkge1xuICAgICAgICBhZGRQb2ludChzbGljZSwgc2xpY2VbMF0sIHNsaWNlWzFdLCBzbGljZVsyXSk7XG4gICAgfVxuXG4gICAgLy8gYWRkIHRoZSBmaW5hbCBzbGljZVxuICAgIGlmIChzbGljZS5sZW5ndGgpIHtcbiAgICAgICAgbmV3R2VvbS5wdXNoKHNsaWNlKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIG5ld1NsaWNlKGxpbmUpIHtcbiAgICB2YXIgc2xpY2UgPSBbXTtcbiAgICBzbGljZS5zaXplID0gbGluZS5zaXplO1xuICAgIHNsaWNlLnN0YXJ0ID0gbGluZS5zdGFydDtcbiAgICBzbGljZS5lbmQgPSBsaW5lLmVuZDtcbiAgICByZXR1cm4gc2xpY2U7XG59XG5cbmZ1bmN0aW9uIGNsaXBMaW5lcyhnZW9tLCBuZXdHZW9tLCBrMSwgazIsIGF4aXMsIGlzUG9seWdvbikge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZ2VvbS5sZW5ndGg7IGkrKykge1xuICAgICAgICBjbGlwTGluZShnZW9tW2ldLCBuZXdHZW9tLCBrMSwgazIsIGF4aXMsIGlzUG9seWdvbiwgZmFsc2UpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gYWRkUG9pbnQob3V0LCB4LCB5LCB6KSB7XG4gICAgb3V0LnB1c2goeCk7XG4gICAgb3V0LnB1c2goeSk7XG4gICAgb3V0LnB1c2goeik7XG59XG5cbmZ1bmN0aW9uIGludGVyc2VjdFgob3V0LCBheCwgYXksIGJ4LCBieSwgeCkge1xuICAgIHZhciB0ID0gKHggLSBheCkgLyAoYnggLSBheCk7XG4gICAgb3V0LnB1c2goeCk7XG4gICAgb3V0LnB1c2goYXkgKyAoYnkgLSBheSkgKiB0KTtcbiAgICBvdXQucHVzaCgxKTtcbiAgICByZXR1cm4gdDtcbn1cblxuZnVuY3Rpb24gaW50ZXJzZWN0WShvdXQsIGF4LCBheSwgYngsIGJ5LCB5KSB7XG4gICAgdmFyIHQgPSAoeSAtIGF5KSAvIChieSAtIGF5KTtcbiAgICBvdXQucHVzaChheCArIChieCAtIGF4KSAqIHQpO1xuICAgIG91dC5wdXNoKHkpO1xuICAgIG91dC5wdXNoKDEpO1xuICAgIHJldHVybiB0O1xufVxuIiwiXG5pbXBvcnQgY2xpcCBmcm9tICcuL2NsaXAnO1xuaW1wb3J0IGNyZWF0ZUZlYXR1cmUgZnJvbSAnLi9mZWF0dXJlJztcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gd3JhcChmZWF0dXJlcywgb3B0aW9ucykge1xuICAgIHZhciBidWZmZXIgPSBvcHRpb25zLmJ1ZmZlciAvIG9wdGlvbnMuZXh0ZW50O1xuICAgIHZhciBtZXJnZWQgPSBmZWF0dXJlcztcbiAgICB2YXIgbGVmdCAgPSBjbGlwKGZlYXR1cmVzLCAxLCAtMSAtIGJ1ZmZlciwgYnVmZmVyLCAgICAgMCwgLTEsIDIsIG9wdGlvbnMpOyAvLyBsZWZ0IHdvcmxkIGNvcHlcbiAgICB2YXIgcmlnaHQgPSBjbGlwKGZlYXR1cmVzLCAxLCAgMSAtIGJ1ZmZlciwgMiArIGJ1ZmZlciwgMCwgLTEsIDIsIG9wdGlvbnMpOyAvLyByaWdodCB3b3JsZCBjb3B5XG5cbiAgICBpZiAobGVmdCB8fCByaWdodCkge1xuICAgICAgICBtZXJnZWQgPSBjbGlwKGZlYXR1cmVzLCAxLCAtYnVmZmVyLCAxICsgYnVmZmVyLCAwLCAtMSwgMiwgb3B0aW9ucykgfHwgW107IC8vIGNlbnRlciB3b3JsZCBjb3B5XG5cbiAgICAgICAgaWYgKGxlZnQpIG1lcmdlZCA9IHNoaWZ0RmVhdHVyZUNvb3JkcyhsZWZ0LCAxKS5jb25jYXQobWVyZ2VkKTsgLy8gbWVyZ2UgbGVmdCBpbnRvIGNlbnRlclxuICAgICAgICBpZiAocmlnaHQpIG1lcmdlZCA9IG1lcmdlZC5jb25jYXQoc2hpZnRGZWF0dXJlQ29vcmRzKHJpZ2h0LCAtMSkpOyAvLyBtZXJnZSByaWdodCBpbnRvIGNlbnRlclxuICAgIH1cblxuICAgIHJldHVybiBtZXJnZWQ7XG59XG5cbmZ1bmN0aW9uIHNoaWZ0RmVhdHVyZUNvb3JkcyhmZWF0dXJlcywgb2Zmc2V0KSB7XG4gICAgdmFyIG5ld0ZlYXR1cmVzID0gW107XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGZlYXR1cmVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBmZWF0dXJlID0gZmVhdHVyZXNbaV0sXG4gICAgICAgICAgICB0eXBlID0gZmVhdHVyZS50eXBlO1xuXG4gICAgICAgIHZhciBuZXdHZW9tZXRyeTtcblxuICAgICAgICBpZiAodHlwZSA9PT0gJ1BvaW50JyB8fCB0eXBlID09PSAnTXVsdGlQb2ludCcgfHwgdHlwZSA9PT0gJ0xpbmVTdHJpbmcnKSB7XG4gICAgICAgICAgICBuZXdHZW9tZXRyeSA9IHNoaWZ0Q29vcmRzKGZlYXR1cmUuZ2VvbWV0cnksIG9mZnNldCk7XG5cbiAgICAgICAgfSBlbHNlIGlmICh0eXBlID09PSAnTXVsdGlMaW5lU3RyaW5nJyB8fCB0eXBlID09PSAnUG9seWdvbicpIHtcbiAgICAgICAgICAgIG5ld0dlb21ldHJ5ID0gW107XG4gICAgICAgICAgICBmb3IgKHZhciBqID0gMDsgaiA8IGZlYXR1cmUuZ2VvbWV0cnkubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgICAgICBuZXdHZW9tZXRyeS5wdXNoKHNoaWZ0Q29vcmRzKGZlYXR1cmUuZ2VvbWV0cnlbal0sIG9mZnNldCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKHR5cGUgPT09ICdNdWx0aVBvbHlnb24nKSB7XG4gICAgICAgICAgICBuZXdHZW9tZXRyeSA9IFtdO1xuICAgICAgICAgICAgZm9yIChqID0gMDsgaiA8IGZlYXR1cmUuZ2VvbWV0cnkubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgbmV3UG9seWdvbiA9IFtdO1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGsgPSAwOyBrIDwgZmVhdHVyZS5nZW9tZXRyeVtqXS5sZW5ndGg7IGsrKykge1xuICAgICAgICAgICAgICAgICAgICBuZXdQb2x5Z29uLnB1c2goc2hpZnRDb29yZHMoZmVhdHVyZS5nZW9tZXRyeVtqXVtrXSwgb2Zmc2V0KSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIG5ld0dlb21ldHJ5LnB1c2gobmV3UG9seWdvbik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBuZXdGZWF0dXJlcy5wdXNoKGNyZWF0ZUZlYXR1cmUoZmVhdHVyZS5pZCwgdHlwZSwgbmV3R2VvbWV0cnksIGZlYXR1cmUudGFncykpO1xuICAgIH1cblxuICAgIHJldHVybiBuZXdGZWF0dXJlcztcbn1cblxuZnVuY3Rpb24gc2hpZnRDb29yZHMocG9pbnRzLCBvZmZzZXQpIHtcbiAgICB2YXIgbmV3UG9pbnRzID0gW107XG4gICAgbmV3UG9pbnRzLnNpemUgPSBwb2ludHMuc2l6ZTtcblxuICAgIGlmIChwb2ludHMuc3RhcnQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBuZXdQb2ludHMuc3RhcnQgPSBwb2ludHMuc3RhcnQ7XG4gICAgICAgIG5ld1BvaW50cy5lbmQgPSBwb2ludHMuZW5kO1xuICAgIH1cblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcG9pbnRzLmxlbmd0aDsgaSArPSAzKSB7XG4gICAgICAgIG5ld1BvaW50cy5wdXNoKHBvaW50c1tpXSArIG9mZnNldCwgcG9pbnRzW2kgKyAxXSwgcG9pbnRzW2kgKyAyXSk7XG4gICAgfVxuICAgIHJldHVybiBuZXdQb2ludHM7XG59XG4iLCJcbi8vIFRyYW5zZm9ybXMgdGhlIGNvb3JkaW5hdGVzIG9mIGVhY2ggZmVhdHVyZSBpbiB0aGUgZ2l2ZW4gdGlsZSBmcm9tXG4vLyBtZXJjYXRvci1wcm9qZWN0ZWQgc3BhY2UgaW50byAoZXh0ZW50IHggZXh0ZW50KSB0aWxlIHNwYWNlLlxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gdHJhbnNmb3JtVGlsZSh0aWxlLCBleHRlbnQpIHtcbiAgICBpZiAodGlsZS50cmFuc2Zvcm1lZCkgcmV0dXJuIHRpbGU7XG5cbiAgICB2YXIgejIgPSAxIDw8IHRpbGUueixcbiAgICAgICAgdHggPSB0aWxlLngsXG4gICAgICAgIHR5ID0gdGlsZS55LFxuICAgICAgICBpLCBqLCBrO1xuXG4gICAgZm9yIChpID0gMDsgaSA8IHRpbGUuZmVhdHVyZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIGZlYXR1cmUgPSB0aWxlLmZlYXR1cmVzW2ldLFxuICAgICAgICAgICAgZ2VvbSA9IGZlYXR1cmUuZ2VvbWV0cnksXG4gICAgICAgICAgICB0eXBlID0gZmVhdHVyZS50eXBlO1xuXG4gICAgICAgIGZlYXR1cmUuZ2VvbWV0cnkgPSBbXTtcblxuICAgICAgICBpZiAodHlwZSA9PT0gMSkge1xuICAgICAgICAgICAgZm9yIChqID0gMDsgaiA8IGdlb20ubGVuZ3RoOyBqICs9IDIpIHtcbiAgICAgICAgICAgICAgICBmZWF0dXJlLmdlb21ldHJ5LnB1c2godHJhbnNmb3JtUG9pbnQoZ2VvbVtqXSwgZ2VvbVtqICsgMV0sIGV4dGVudCwgejIsIHR4LCB0eSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZm9yIChqID0gMDsgaiA8IGdlb20ubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgcmluZyA9IFtdO1xuICAgICAgICAgICAgICAgIGZvciAoayA9IDA7IGsgPCBnZW9tW2pdLmxlbmd0aDsgayArPSAyKSB7XG4gICAgICAgICAgICAgICAgICAgIHJpbmcucHVzaCh0cmFuc2Zvcm1Qb2ludChnZW9tW2pdW2tdLCBnZW9tW2pdW2sgKyAxXSwgZXh0ZW50LCB6MiwgdHgsIHR5KSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGZlYXR1cmUuZ2VvbWV0cnkucHVzaChyaW5nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHRpbGUudHJhbnNmb3JtZWQgPSB0cnVlO1xuXG4gICAgcmV0dXJuIHRpbGU7XG59XG5cbmZ1bmN0aW9uIHRyYW5zZm9ybVBvaW50KHgsIHksIGV4dGVudCwgejIsIHR4LCB0eSkge1xuICAgIHJldHVybiBbXG4gICAgICAgIE1hdGgucm91bmQoZXh0ZW50ICogKHggKiB6MiAtIHR4KSksXG4gICAgICAgIE1hdGgucm91bmQoZXh0ZW50ICogKHkgKiB6MiAtIHR5KSldO1xufVxuIiwiXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBjcmVhdGVUaWxlKGZlYXR1cmVzLCB6LCB0eCwgdHksIG9wdGlvbnMpIHtcbiAgICB2YXIgdG9sZXJhbmNlID0geiA9PT0gb3B0aW9ucy5tYXhab29tID8gMCA6IG9wdGlvbnMudG9sZXJhbmNlIC8gKCgxIDw8IHopICogb3B0aW9ucy5leHRlbnQpO1xuICAgIHZhciB0aWxlID0ge1xuICAgICAgICBmZWF0dXJlczogW10sXG4gICAgICAgIG51bVBvaW50czogMCxcbiAgICAgICAgbnVtU2ltcGxpZmllZDogMCxcbiAgICAgICAgbnVtRmVhdHVyZXM6IDAsXG4gICAgICAgIHNvdXJjZTogbnVsbCxcbiAgICAgICAgeDogdHgsXG4gICAgICAgIHk6IHR5LFxuICAgICAgICB6OiB6LFxuICAgICAgICB0cmFuc2Zvcm1lZDogZmFsc2UsXG4gICAgICAgIG1pblg6IDIsXG4gICAgICAgIG1pblk6IDEsXG4gICAgICAgIG1heFg6IC0xLFxuICAgICAgICBtYXhZOiAwXG4gICAgfTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGZlYXR1cmVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHRpbGUubnVtRmVhdHVyZXMrKztcbiAgICAgICAgYWRkRmVhdHVyZSh0aWxlLCBmZWF0dXJlc1tpXSwgdG9sZXJhbmNlLCBvcHRpb25zKTtcblxuICAgICAgICB2YXIgbWluWCA9IGZlYXR1cmVzW2ldLm1pblg7XG4gICAgICAgIHZhciBtaW5ZID0gZmVhdHVyZXNbaV0ubWluWTtcbiAgICAgICAgdmFyIG1heFggPSBmZWF0dXJlc1tpXS5tYXhYO1xuICAgICAgICB2YXIgbWF4WSA9IGZlYXR1cmVzW2ldLm1heFk7XG5cbiAgICAgICAgaWYgKG1pblggPCB0aWxlLm1pblgpIHRpbGUubWluWCA9IG1pblg7XG4gICAgICAgIGlmIChtaW5ZIDwgdGlsZS5taW5ZKSB0aWxlLm1pblkgPSBtaW5ZO1xuICAgICAgICBpZiAobWF4WCA+IHRpbGUubWF4WCkgdGlsZS5tYXhYID0gbWF4WDtcbiAgICAgICAgaWYgKG1heFkgPiB0aWxlLm1heFkpIHRpbGUubWF4WSA9IG1heFk7XG4gICAgfVxuICAgIHJldHVybiB0aWxlO1xufVxuXG5mdW5jdGlvbiBhZGRGZWF0dXJlKHRpbGUsIGZlYXR1cmUsIHRvbGVyYW5jZSwgb3B0aW9ucykge1xuXG4gICAgdmFyIGdlb20gPSBmZWF0dXJlLmdlb21ldHJ5LFxuICAgICAgICB0eXBlID0gZmVhdHVyZS50eXBlLFxuICAgICAgICBzaW1wbGlmaWVkID0gW107XG5cbiAgICBpZiAodHlwZSA9PT0gJ1BvaW50JyB8fCB0eXBlID09PSAnTXVsdGlQb2ludCcpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBnZW9tLmxlbmd0aDsgaSArPSAzKSB7XG4gICAgICAgICAgICBzaW1wbGlmaWVkLnB1c2goZ2VvbVtpXSk7XG4gICAgICAgICAgICBzaW1wbGlmaWVkLnB1c2goZ2VvbVtpICsgMV0pO1xuICAgICAgICAgICAgdGlsZS5udW1Qb2ludHMrKztcbiAgICAgICAgICAgIHRpbGUubnVtU2ltcGxpZmllZCsrO1xuICAgICAgICB9XG5cbiAgICB9IGVsc2UgaWYgKHR5cGUgPT09ICdMaW5lU3RyaW5nJykge1xuICAgICAgICBhZGRMaW5lKHNpbXBsaWZpZWQsIGdlb20sIHRpbGUsIHRvbGVyYW5jZSwgZmFsc2UsIGZhbHNlKTtcblxuICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gJ011bHRpTGluZVN0cmluZycgfHwgdHlwZSA9PT0gJ1BvbHlnb24nKSB7XG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBnZW9tLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBhZGRMaW5lKHNpbXBsaWZpZWQsIGdlb21baV0sIHRpbGUsIHRvbGVyYW5jZSwgdHlwZSA9PT0gJ1BvbHlnb24nLCBpID09PSAwKTtcbiAgICAgICAgfVxuXG4gICAgfSBlbHNlIGlmICh0eXBlID09PSAnTXVsdGlQb2x5Z29uJykge1xuXG4gICAgICAgIGZvciAodmFyIGsgPSAwOyBrIDwgZ2VvbS5sZW5ndGg7IGsrKykge1xuICAgICAgICAgICAgdmFyIHBvbHlnb24gPSBnZW9tW2tdO1xuICAgICAgICAgICAgZm9yIChpID0gMDsgaSA8IHBvbHlnb24ubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICBhZGRMaW5lKHNpbXBsaWZpZWQsIHBvbHlnb25baV0sIHRpbGUsIHRvbGVyYW5jZSwgdHJ1ZSwgaSA9PT0gMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoc2ltcGxpZmllZC5sZW5ndGgpIHtcbiAgICAgICAgdmFyIHRhZ3MgPSBmZWF0dXJlLnRhZ3MgfHwgbnVsbDtcbiAgICAgICAgaWYgKHR5cGUgPT09ICdMaW5lU3RyaW5nJyAmJiBvcHRpb25zLmxpbmVNZXRyaWNzKSB7XG4gICAgICAgICAgICB0YWdzID0ge307XG4gICAgICAgICAgICBmb3IgKHZhciBrZXkgaW4gZmVhdHVyZS50YWdzKSB0YWdzW2tleV0gPSBmZWF0dXJlLnRhZ3Nba2V5XTtcbiAgICAgICAgICAgIHRhZ3NbJ21hcGJveF9jbGlwX3N0YXJ0J10gPSBnZW9tLnN0YXJ0IC8gZ2VvbS5zaXplO1xuICAgICAgICAgICAgdGFnc1snbWFwYm94X2NsaXBfZW5kJ10gPSBnZW9tLmVuZCAvIGdlb20uc2l6ZTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgdGlsZUZlYXR1cmUgPSB7XG4gICAgICAgICAgICBnZW9tZXRyeTogc2ltcGxpZmllZCxcbiAgICAgICAgICAgIHR5cGU6IHR5cGUgPT09ICdQb2x5Z29uJyB8fCB0eXBlID09PSAnTXVsdGlQb2x5Z29uJyA/IDMgOlxuICAgICAgICAgICAgICAgIHR5cGUgPT09ICdMaW5lU3RyaW5nJyB8fCB0eXBlID09PSAnTXVsdGlMaW5lU3RyaW5nJyA/IDIgOiAxLFxuICAgICAgICAgICAgdGFnczogdGFnc1xuICAgICAgICB9O1xuICAgICAgICBpZiAoZmVhdHVyZS5pZCAhPT0gbnVsbCkge1xuICAgICAgICAgICAgdGlsZUZlYXR1cmUuaWQgPSBmZWF0dXJlLmlkO1xuICAgICAgICB9XG4gICAgICAgIHRpbGUuZmVhdHVyZXMucHVzaCh0aWxlRmVhdHVyZSk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBhZGRMaW5lKHJlc3VsdCwgZ2VvbSwgdGlsZSwgdG9sZXJhbmNlLCBpc1BvbHlnb24sIGlzT3V0ZXIpIHtcbiAgICB2YXIgc3FUb2xlcmFuY2UgPSB0b2xlcmFuY2UgKiB0b2xlcmFuY2U7XG5cbiAgICBpZiAodG9sZXJhbmNlID4gMCAmJiAoZ2VvbS5zaXplIDwgKGlzUG9seWdvbiA/IHNxVG9sZXJhbmNlIDogdG9sZXJhbmNlKSkpIHtcbiAgICAgICAgdGlsZS5udW1Qb2ludHMgKz0gZ2VvbS5sZW5ndGggLyAzO1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyIHJpbmcgPSBbXTtcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZ2VvbS5sZW5ndGg7IGkgKz0gMykge1xuICAgICAgICBpZiAodG9sZXJhbmNlID09PSAwIHx8IGdlb21baSArIDJdID4gc3FUb2xlcmFuY2UpIHtcbiAgICAgICAgICAgIHRpbGUubnVtU2ltcGxpZmllZCsrO1xuICAgICAgICAgICAgcmluZy5wdXNoKGdlb21baV0pO1xuICAgICAgICAgICAgcmluZy5wdXNoKGdlb21baSArIDFdKTtcbiAgICAgICAgfVxuICAgICAgICB0aWxlLm51bVBvaW50cysrO1xuICAgIH1cblxuICAgIGlmIChpc1BvbHlnb24pIHJld2luZChyaW5nLCBpc091dGVyKTtcblxuICAgIHJlc3VsdC5wdXNoKHJpbmcpO1xufVxuXG5mdW5jdGlvbiByZXdpbmQocmluZywgY2xvY2t3aXNlKSB7XG4gICAgdmFyIGFyZWEgPSAwO1xuICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSByaW5nLmxlbmd0aCwgaiA9IGxlbiAtIDI7IGkgPCBsZW47IGogPSBpLCBpICs9IDIpIHtcbiAgICAgICAgYXJlYSArPSAocmluZ1tpXSAtIHJpbmdbal0pICogKHJpbmdbaSArIDFdICsgcmluZ1tqICsgMV0pO1xuICAgIH1cbiAgICBpZiAoYXJlYSA+IDAgPT09IGNsb2Nrd2lzZSkge1xuICAgICAgICBmb3IgKGkgPSAwLCBsZW4gPSByaW5nLmxlbmd0aDsgaSA8IGxlbiAvIDI7IGkgKz0gMikge1xuICAgICAgICAgICAgdmFyIHggPSByaW5nW2ldO1xuICAgICAgICAgICAgdmFyIHkgPSByaW5nW2kgKyAxXTtcbiAgICAgICAgICAgIHJpbmdbaV0gPSByaW5nW2xlbiAtIDIgLSBpXTtcbiAgICAgICAgICAgIHJpbmdbaSArIDFdID0gcmluZ1tsZW4gLSAxIC0gaV07XG4gICAgICAgICAgICByaW5nW2xlbiAtIDIgLSBpXSA9IHg7XG4gICAgICAgICAgICByaW5nW2xlbiAtIDEgLSBpXSA9IHk7XG4gICAgICAgIH1cbiAgICB9XG59XG4iLCJcbmltcG9ydCBjb252ZXJ0IGZyb20gJy4vY29udmVydCc7ICAgICAvLyBHZW9KU09OIGNvbnZlcnNpb24gYW5kIHByZXByb2Nlc3NpbmdcbmltcG9ydCBjbGlwIGZyb20gJy4vY2xpcCc7ICAgICAgICAgICAvLyBzdHJpcGUgY2xpcHBpbmcgYWxnb3JpdGhtXG5pbXBvcnQgd3JhcCBmcm9tICcuL3dyYXAnOyAgICAgICAgICAgLy8gZGF0ZSBsaW5lIHByb2Nlc3NpbmdcbmltcG9ydCB0cmFuc2Zvcm0gZnJvbSAnLi90cmFuc2Zvcm0nOyAvLyBjb29yZGluYXRlIHRyYW5zZm9ybWF0aW9uXG5pbXBvcnQgY3JlYXRlVGlsZSBmcm9tICcuL3RpbGUnOyAgICAgLy8gZmluYWwgc2ltcGxpZmllZCB0aWxlIGdlbmVyYXRpb25cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gZ2VvanNvbnZ0KGRhdGEsIG9wdGlvbnMpIHtcbiAgICByZXR1cm4gbmV3IEdlb0pTT05WVChkYXRhLCBvcHRpb25zKTtcbn1cblxuZnVuY3Rpb24gR2VvSlNPTlZUKGRhdGEsIG9wdGlvbnMpIHtcbiAgICBvcHRpb25zID0gdGhpcy5vcHRpb25zID0gZXh0ZW5kKE9iamVjdC5jcmVhdGUodGhpcy5vcHRpb25zKSwgb3B0aW9ucyk7XG5cbiAgICB2YXIgZGVidWcgPSBvcHRpb25zLmRlYnVnO1xuXG4gICAgaWYgKGRlYnVnKSBjb25zb2xlLnRpbWUoJ3ByZXByb2Nlc3MgZGF0YScpO1xuXG4gICAgaWYgKG9wdGlvbnMubWF4Wm9vbSA8IDAgfHwgb3B0aW9ucy5tYXhab29tID4gMjQpIHRocm93IG5ldyBFcnJvcignbWF4Wm9vbSBzaG91bGQgYmUgaW4gdGhlIDAtMjQgcmFuZ2UnKTtcbiAgICBpZiAob3B0aW9ucy5wcm9tb3RlSWQgJiYgb3B0aW9ucy5nZW5lcmF0ZUlkKSB0aHJvdyBuZXcgRXJyb3IoJ3Byb21vdGVJZCBhbmQgZ2VuZXJhdGVJZCBjYW5ub3QgYmUgdXNlZCB0b2dldGhlci4nKTtcblxuICAgIHZhciBmZWF0dXJlcyA9IGNvbnZlcnQoZGF0YSwgb3B0aW9ucyk7XG5cbiAgICB0aGlzLnRpbGVzID0ge307XG4gICAgdGhpcy50aWxlQ29vcmRzID0gW107XG5cbiAgICBpZiAoZGVidWcpIHtcbiAgICAgICAgY29uc29sZS50aW1lRW5kKCdwcmVwcm9jZXNzIGRhdGEnKTtcbiAgICAgICAgY29uc29sZS5sb2coJ2luZGV4OiBtYXhab29tOiAlZCwgbWF4UG9pbnRzOiAlZCcsIG9wdGlvbnMuaW5kZXhNYXhab29tLCBvcHRpb25zLmluZGV4TWF4UG9pbnRzKTtcbiAgICAgICAgY29uc29sZS50aW1lKCdnZW5lcmF0ZSB0aWxlcycpO1xuICAgICAgICB0aGlzLnN0YXRzID0ge307XG4gICAgICAgIHRoaXMudG90YWwgPSAwO1xuICAgIH1cblxuICAgIGZlYXR1cmVzID0gd3JhcChmZWF0dXJlcywgb3B0aW9ucyk7XG5cbiAgICAvLyBzdGFydCBzbGljaW5nIGZyb20gdGhlIHRvcCB0aWxlIGRvd25cbiAgICBpZiAoZmVhdHVyZXMubGVuZ3RoKSB0aGlzLnNwbGl0VGlsZShmZWF0dXJlcywgMCwgMCwgMCk7XG5cbiAgICBpZiAoZGVidWcpIHtcbiAgICAgICAgaWYgKGZlYXR1cmVzLmxlbmd0aCkgY29uc29sZS5sb2coJ2ZlYXR1cmVzOiAlZCwgcG9pbnRzOiAlZCcsIHRoaXMudGlsZXNbMF0ubnVtRmVhdHVyZXMsIHRoaXMudGlsZXNbMF0ubnVtUG9pbnRzKTtcbiAgICAgICAgY29uc29sZS50aW1lRW5kKCdnZW5lcmF0ZSB0aWxlcycpO1xuICAgICAgICBjb25zb2xlLmxvZygndGlsZXMgZ2VuZXJhdGVkOicsIHRoaXMudG90YWwsIEpTT04uc3RyaW5naWZ5KHRoaXMuc3RhdHMpKTtcbiAgICB9XG59XG5cbkdlb0pTT05WVC5wcm90b3R5cGUub3B0aW9ucyA9IHtcbiAgICBtYXhab29tOiAxNCwgICAgICAgICAgICAvLyBtYXggem9vbSB0byBwcmVzZXJ2ZSBkZXRhaWwgb25cbiAgICBpbmRleE1heFpvb206IDUsICAgICAgICAvLyBtYXggem9vbSBpbiB0aGUgdGlsZSBpbmRleFxuICAgIGluZGV4TWF4UG9pbnRzOiAxMDAwMDAsIC8vIG1heCBudW1iZXIgb2YgcG9pbnRzIHBlciB0aWxlIGluIHRoZSB0aWxlIGluZGV4XG4gICAgdG9sZXJhbmNlOiAzLCAgICAgICAgICAgLy8gc2ltcGxpZmljYXRpb24gdG9sZXJhbmNlIChoaWdoZXIgbWVhbnMgc2ltcGxlcilcbiAgICBleHRlbnQ6IDQwOTYsICAgICAgICAgICAvLyB0aWxlIGV4dGVudFxuICAgIGJ1ZmZlcjogNjQsICAgICAgICAgICAgIC8vIHRpbGUgYnVmZmVyIG9uIGVhY2ggc2lkZVxuICAgIGxpbmVNZXRyaWNzOiBmYWxzZSwgICAgIC8vIHdoZXRoZXIgdG8gY2FsY3VsYXRlIGxpbmUgbWV0cmljc1xuICAgIHByb21vdGVJZDogbnVsbCwgICAgICAgIC8vIG5hbWUgb2YgYSBmZWF0dXJlIHByb3BlcnR5IHRvIGJlIHByb21vdGVkIHRvIGZlYXR1cmUuaWRcbiAgICBnZW5lcmF0ZUlkOiBmYWxzZSwgICAgICAvLyB3aGV0aGVyIHRvIGdlbmVyYXRlIGZlYXR1cmUgaWRzLiBDYW5ub3QgYmUgdXNlZCB3aXRoIHByb21vdGVJZFxuICAgIGRlYnVnOiAwICAgICAgICAgICAgICAgIC8vIGxvZ2dpbmcgbGV2ZWwgKDAsIDEgb3IgMilcbn07XG5cbkdlb0pTT05WVC5wcm90b3R5cGUuc3BsaXRUaWxlID0gZnVuY3Rpb24gKGZlYXR1cmVzLCB6LCB4LCB5LCBjeiwgY3gsIGN5KSB7XG5cbiAgICB2YXIgc3RhY2sgPSBbZmVhdHVyZXMsIHosIHgsIHldLFxuICAgICAgICBvcHRpb25zID0gdGhpcy5vcHRpb25zLFxuICAgICAgICBkZWJ1ZyA9IG9wdGlvbnMuZGVidWc7XG5cbiAgICAvLyBhdm9pZCByZWN1cnNpb24gYnkgdXNpbmcgYSBwcm9jZXNzaW5nIHF1ZXVlXG4gICAgd2hpbGUgKHN0YWNrLmxlbmd0aCkge1xuICAgICAgICB5ID0gc3RhY2sucG9wKCk7XG4gICAgICAgIHggPSBzdGFjay5wb3AoKTtcbiAgICAgICAgeiA9IHN0YWNrLnBvcCgpO1xuICAgICAgICBmZWF0dXJlcyA9IHN0YWNrLnBvcCgpO1xuXG4gICAgICAgIHZhciB6MiA9IDEgPDwgeixcbiAgICAgICAgICAgIGlkID0gdG9JRCh6LCB4LCB5KSxcbiAgICAgICAgICAgIHRpbGUgPSB0aGlzLnRpbGVzW2lkXTtcblxuICAgICAgICBpZiAoIXRpbGUpIHtcbiAgICAgICAgICAgIGlmIChkZWJ1ZyA+IDEpIGNvbnNvbGUudGltZSgnY3JlYXRpb24nKTtcblxuICAgICAgICAgICAgdGlsZSA9IHRoaXMudGlsZXNbaWRdID0gY3JlYXRlVGlsZShmZWF0dXJlcywgeiwgeCwgeSwgb3B0aW9ucyk7XG4gICAgICAgICAgICB0aGlzLnRpbGVDb29yZHMucHVzaCh7ejogeiwgeDogeCwgeTogeX0pO1xuXG4gICAgICAgICAgICBpZiAoZGVidWcpIHtcbiAgICAgICAgICAgICAgICBpZiAoZGVidWcgPiAxKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCd0aWxlIHolZC0lZC0lZCAoZmVhdHVyZXM6ICVkLCBwb2ludHM6ICVkLCBzaW1wbGlmaWVkOiAlZCknLFxuICAgICAgICAgICAgICAgICAgICAgICAgeiwgeCwgeSwgdGlsZS5udW1GZWF0dXJlcywgdGlsZS5udW1Qb2ludHMsIHRpbGUubnVtU2ltcGxpZmllZCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUudGltZUVuZCgnY3JlYXRpb24nKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmFyIGtleSA9ICd6JyArIHo7XG4gICAgICAgICAgICAgICAgdGhpcy5zdGF0c1trZXldID0gKHRoaXMuc3RhdHNba2V5XSB8fCAwKSArIDE7XG4gICAgICAgICAgICAgICAgdGhpcy50b3RhbCsrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gc2F2ZSByZWZlcmVuY2UgdG8gb3JpZ2luYWwgZ2VvbWV0cnkgaW4gdGlsZSBzbyB0aGF0IHdlIGNhbiBkcmlsbCBkb3duIGxhdGVyIGlmIHdlIHN0b3Agbm93XG4gICAgICAgIHRpbGUuc291cmNlID0gZmVhdHVyZXM7XG5cbiAgICAgICAgLy8gaWYgaXQncyB0aGUgZmlyc3QtcGFzcyB0aWxpbmdcbiAgICAgICAgaWYgKCFjeikge1xuICAgICAgICAgICAgLy8gc3RvcCB0aWxpbmcgaWYgd2UgcmVhY2hlZCBtYXggem9vbSwgb3IgaWYgdGhlIHRpbGUgaXMgdG9vIHNpbXBsZVxuICAgICAgICAgICAgaWYgKHogPT09IG9wdGlvbnMuaW5kZXhNYXhab29tIHx8IHRpbGUubnVtUG9pbnRzIDw9IG9wdGlvbnMuaW5kZXhNYXhQb2ludHMpIGNvbnRpbnVlO1xuXG4gICAgICAgIC8vIGlmIGEgZHJpbGxkb3duIHRvIGEgc3BlY2lmaWMgdGlsZVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gc3RvcCB0aWxpbmcgaWYgd2UgcmVhY2hlZCBiYXNlIHpvb20gb3Igb3VyIHRhcmdldCB0aWxlIHpvb21cbiAgICAgICAgICAgIGlmICh6ID09PSBvcHRpb25zLm1heFpvb20gfHwgeiA9PT0gY3opIGNvbnRpbnVlO1xuXG4gICAgICAgICAgICAvLyBzdG9wIHRpbGluZyBpZiBpdCdzIG5vdCBhbiBhbmNlc3RvciBvZiB0aGUgdGFyZ2V0IHRpbGVcbiAgICAgICAgICAgIHZhciBtID0gMSA8PCAoY3ogLSB6KTtcbiAgICAgICAgICAgIGlmICh4ICE9PSBNYXRoLmZsb29yKGN4IC8gbSkgfHwgeSAhPT0gTWF0aC5mbG9vcihjeSAvIG0pKSBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGlmIHdlIHNsaWNlIGZ1cnRoZXIgZG93biwgbm8gbmVlZCB0byBrZWVwIHNvdXJjZSBnZW9tZXRyeVxuICAgICAgICB0aWxlLnNvdXJjZSA9IG51bGw7XG5cbiAgICAgICAgaWYgKGZlYXR1cmVzLmxlbmd0aCA9PT0gMCkgY29udGludWU7XG5cbiAgICAgICAgaWYgKGRlYnVnID4gMSkgY29uc29sZS50aW1lKCdjbGlwcGluZycpO1xuXG4gICAgICAgIC8vIHZhbHVlcyB3ZSdsbCB1c2UgZm9yIGNsaXBwaW5nXG4gICAgICAgIHZhciBrMSA9IDAuNSAqIG9wdGlvbnMuYnVmZmVyIC8gb3B0aW9ucy5leHRlbnQsXG4gICAgICAgICAgICBrMiA9IDAuNSAtIGsxLFxuICAgICAgICAgICAgazMgPSAwLjUgKyBrMSxcbiAgICAgICAgICAgIGs0ID0gMSArIGsxLFxuICAgICAgICAgICAgdGwsIGJsLCB0ciwgYnIsIGxlZnQsIHJpZ2h0O1xuXG4gICAgICAgIHRsID0gYmwgPSB0ciA9IGJyID0gbnVsbDtcblxuICAgICAgICBsZWZ0ICA9IGNsaXAoZmVhdHVyZXMsIHoyLCB4IC0gazEsIHggKyBrMywgMCwgdGlsZS5taW5YLCB0aWxlLm1heFgsIG9wdGlvbnMpO1xuICAgICAgICByaWdodCA9IGNsaXAoZmVhdHVyZXMsIHoyLCB4ICsgazIsIHggKyBrNCwgMCwgdGlsZS5taW5YLCB0aWxlLm1heFgsIG9wdGlvbnMpO1xuICAgICAgICBmZWF0dXJlcyA9IG51bGw7XG5cbiAgICAgICAgaWYgKGxlZnQpIHtcbiAgICAgICAgICAgIHRsID0gY2xpcChsZWZ0LCB6MiwgeSAtIGsxLCB5ICsgazMsIDEsIHRpbGUubWluWSwgdGlsZS5tYXhZLCBvcHRpb25zKTtcbiAgICAgICAgICAgIGJsID0gY2xpcChsZWZ0LCB6MiwgeSArIGsyLCB5ICsgazQsIDEsIHRpbGUubWluWSwgdGlsZS5tYXhZLCBvcHRpb25zKTtcbiAgICAgICAgICAgIGxlZnQgPSBudWxsO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHJpZ2h0KSB7XG4gICAgICAgICAgICB0ciA9IGNsaXAocmlnaHQsIHoyLCB5IC0gazEsIHkgKyBrMywgMSwgdGlsZS5taW5ZLCB0aWxlLm1heFksIG9wdGlvbnMpO1xuICAgICAgICAgICAgYnIgPSBjbGlwKHJpZ2h0LCB6MiwgeSArIGsyLCB5ICsgazQsIDEsIHRpbGUubWluWSwgdGlsZS5tYXhZLCBvcHRpb25zKTtcbiAgICAgICAgICAgIHJpZ2h0ID0gbnVsbDtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChkZWJ1ZyA+IDEpIGNvbnNvbGUudGltZUVuZCgnY2xpcHBpbmcnKTtcblxuICAgICAgICBzdGFjay5wdXNoKHRsIHx8IFtdLCB6ICsgMSwgeCAqIDIsICAgICB5ICogMik7XG4gICAgICAgIHN0YWNrLnB1c2goYmwgfHwgW10sIHogKyAxLCB4ICogMiwgICAgIHkgKiAyICsgMSk7XG4gICAgICAgIHN0YWNrLnB1c2godHIgfHwgW10sIHogKyAxLCB4ICogMiArIDEsIHkgKiAyKTtcbiAgICAgICAgc3RhY2sucHVzaChiciB8fCBbXSwgeiArIDEsIHggKiAyICsgMSwgeSAqIDIgKyAxKTtcbiAgICB9XG59O1xuXG5HZW9KU09OVlQucHJvdG90eXBlLmdldFRpbGUgPSBmdW5jdGlvbiAoeiwgeCwgeSkge1xuICAgIHZhciBvcHRpb25zID0gdGhpcy5vcHRpb25zLFxuICAgICAgICBleHRlbnQgPSBvcHRpb25zLmV4dGVudCxcbiAgICAgICAgZGVidWcgPSBvcHRpb25zLmRlYnVnO1xuXG4gICAgaWYgKHogPCAwIHx8IHogPiAyNCkgcmV0dXJuIG51bGw7XG5cbiAgICB2YXIgejIgPSAxIDw8IHo7XG4gICAgeCA9ICgoeCAlIHoyKSArIHoyKSAlIHoyOyAvLyB3cmFwIHRpbGUgeCBjb29yZGluYXRlXG5cbiAgICB2YXIgaWQgPSB0b0lEKHosIHgsIHkpO1xuICAgIGlmICh0aGlzLnRpbGVzW2lkXSkgcmV0dXJuIHRyYW5zZm9ybSh0aGlzLnRpbGVzW2lkXSwgZXh0ZW50KTtcblxuICAgIGlmIChkZWJ1ZyA+IDEpIGNvbnNvbGUubG9nKCdkcmlsbGluZyBkb3duIHRvIHolZC0lZC0lZCcsIHosIHgsIHkpO1xuXG4gICAgdmFyIHowID0geixcbiAgICAgICAgeDAgPSB4LFxuICAgICAgICB5MCA9IHksXG4gICAgICAgIHBhcmVudDtcblxuICAgIHdoaWxlICghcGFyZW50ICYmIHowID4gMCkge1xuICAgICAgICB6MC0tO1xuICAgICAgICB4MCA9IE1hdGguZmxvb3IoeDAgLyAyKTtcbiAgICAgICAgeTAgPSBNYXRoLmZsb29yKHkwIC8gMik7XG4gICAgICAgIHBhcmVudCA9IHRoaXMudGlsZXNbdG9JRCh6MCwgeDAsIHkwKV07XG4gICAgfVxuXG4gICAgaWYgKCFwYXJlbnQgfHwgIXBhcmVudC5zb3VyY2UpIHJldHVybiBudWxsO1xuXG4gICAgLy8gaWYgd2UgZm91bmQgYSBwYXJlbnQgdGlsZSBjb250YWluaW5nIHRoZSBvcmlnaW5hbCBnZW9tZXRyeSwgd2UgY2FuIGRyaWxsIGRvd24gZnJvbSBpdFxuICAgIGlmIChkZWJ1ZyA+IDEpIGNvbnNvbGUubG9nKCdmb3VuZCBwYXJlbnQgdGlsZSB6JWQtJWQtJWQnLCB6MCwgeDAsIHkwKTtcblxuICAgIGlmIChkZWJ1ZyA+IDEpIGNvbnNvbGUudGltZSgnZHJpbGxpbmcgZG93bicpO1xuICAgIHRoaXMuc3BsaXRUaWxlKHBhcmVudC5zb3VyY2UsIHowLCB4MCwgeTAsIHosIHgsIHkpO1xuICAgIGlmIChkZWJ1ZyA+IDEpIGNvbnNvbGUudGltZUVuZCgnZHJpbGxpbmcgZG93bicpO1xuXG4gICAgcmV0dXJuIHRoaXMudGlsZXNbaWRdID8gdHJhbnNmb3JtKHRoaXMudGlsZXNbaWRdLCBleHRlbnQpIDogbnVsbDtcbn07XG5cbmZ1bmN0aW9uIHRvSUQoeiwgeCwgeSkge1xuICAgIHJldHVybiAoKCgxIDw8IHopICogeSArIHgpICogMzIpICsgejtcbn1cblxuZnVuY3Rpb24gZXh0ZW5kKGRlc3QsIHNyYykge1xuICAgIGZvciAodmFyIGkgaW4gc3JjKSBkZXN0W2ldID0gc3JjW2ldO1xuICAgIHJldHVybiBkZXN0O1xufVxuIiwiLy8gQGZsb3dcblxuaW1wb3J0IHsgZ2V0SlNPTiB9IGZyb20gJy4uL3V0aWwvYWpheCc7XG5cbmltcG9ydCBwZXJmb3JtYW5jZSBmcm9tICcuLi91dGlsL3BlcmZvcm1hbmNlJztcbmltcG9ydCByZXdpbmQgZnJvbSAnZ2VvanNvbi1yZXdpbmQnO1xuaW1wb3J0IEdlb0pTT05XcmFwcGVyIGZyb20gJy4vZ2VvanNvbl93cmFwcGVyJztcbmltcG9ydCB2dHBiZiBmcm9tICd2dC1wYmYnO1xuaW1wb3J0IHN1cGVyY2x1c3RlciBmcm9tICdzdXBlcmNsdXN0ZXInO1xuaW1wb3J0IGdlb2pzb252dCBmcm9tICdnZW9qc29uLXZ0JztcbmltcG9ydCBhc3NlcnQgZnJvbSAnYXNzZXJ0JztcbmltcG9ydCBWZWN0b3JUaWxlV29ya2VyU291cmNlIGZyb20gJy4vdmVjdG9yX3RpbGVfd29ya2VyX3NvdXJjZSc7XG5cbmltcG9ydCB0eXBlIHtcbiAgICBXb3JrZXJUaWxlUGFyYW1ldGVycyxcbiAgICBXb3JrZXJUaWxlQ2FsbGJhY2ssXG59IGZyb20gJy4uL3NvdXJjZS93b3JrZXJfc291cmNlJztcblxuaW1wb3J0IHR5cGUgQWN0b3IgZnJvbSAnLi4vdXRpbC9hY3Rvcic7XG5pbXBvcnQgdHlwZSBTdHlsZUxheWVySW5kZXggZnJvbSAnLi4vc3R5bGUvc3R5bGVfbGF5ZXJfaW5kZXgnO1xuXG5pbXBvcnQgdHlwZSB7TG9hZFZlY3RvckRhdGFDYWxsYmFja30gZnJvbSAnLi92ZWN0b3JfdGlsZV93b3JrZXJfc291cmNlJztcbmltcG9ydCB0eXBlIHsgUmVxdWVzdFBhcmFtZXRlcnMsIFJlc3BvbnNlQ2FsbGJhY2sgfSBmcm9tICcuLi91dGlsL2FqYXgnO1xuaW1wb3J0IHR5cGUgeyBDYWxsYmFjayB9IGZyb20gJy4uL3R5cGVzL2NhbGxiYWNrJztcbmltcG9ydCB0eXBlIHtHZW9KU09ORmVhdHVyZX0gZnJvbSAnQG1hcGJveC9nZW9qc29uLXR5cGVzJztcblxuZXhwb3J0IHR5cGUgTG9hZEdlb0pTT05QYXJhbWV0ZXJzID0ge1xuICAgIHJlcXVlc3Q/OiBSZXF1ZXN0UGFyYW1ldGVycyxcbiAgICBkYXRhPzogc3RyaW5nLFxuICAgIHNvdXJjZTogc3RyaW5nLFxuICAgIGNsdXN0ZXI6IGJvb2xlYW4sXG4gICAgc3VwZXJjbHVzdGVyT3B0aW9ucz86IE9iamVjdCxcbiAgICBnZW9qc29uVnRPcHRpb25zPzogT2JqZWN0XG59O1xuXG5leHBvcnQgdHlwZSBMb2FkR2VvSlNPTiA9IChwYXJhbXM6IExvYWRHZW9KU09OUGFyYW1ldGVycywgY2FsbGJhY2s6IFJlc3BvbnNlQ2FsbGJhY2s8T2JqZWN0PikgPT4gdm9pZDtcblxuZXhwb3J0IGludGVyZmFjZSBHZW9KU09OSW5kZXgge1xuICAgIGdldFRpbGUoejogbnVtYmVyLCB4OiBudW1iZXIsIHk6IG51bWJlcik6IE9iamVjdDtcblxuICAgIC8vIHN1cGVyY2x1c3RlciBtZXRob2RzXG4gICAgZ2V0Q2x1c3RlckV4cGFuc2lvblpvb20oY2x1c3RlcklkOiBudW1iZXIpOiBudW1iZXI7XG4gICAgZ2V0Q2hpbGRyZW4oY2x1c3RlcklkOiBudW1iZXIpOiBBcnJheTxHZW9KU09ORmVhdHVyZT47XG4gICAgZ2V0TGVhdmVzKGNsdXN0ZXJJZDogbnVtYmVyLCBsaW1pdDogbnVtYmVyLCBvZmZzZXQ6IG51bWJlcik6IEFycmF5PEdlb0pTT05GZWF0dXJlPjtcbn1cblxuZnVuY3Rpb24gbG9hZEdlb0pTT05UaWxlKHBhcmFtczogV29ya2VyVGlsZVBhcmFtZXRlcnMsIGNhbGxiYWNrOiBMb2FkVmVjdG9yRGF0YUNhbGxiYWNrKSB7XG4gICAgY29uc3QgY2Fub25pY2FsID0gcGFyYW1zLnRpbGVJRC5jYW5vbmljYWw7XG5cbiAgICBpZiAoIXRoaXMuX2dlb0pTT05JbmRleCkge1xuICAgICAgICByZXR1cm4gY2FsbGJhY2sobnVsbCwgbnVsbCk7ICAvLyB3ZSBjb3VsZG4ndCBsb2FkIHRoZSBmaWxlXG4gICAgfVxuXG4gICAgY29uc3QgZ2VvSlNPTlRpbGUgPSB0aGlzLl9nZW9KU09OSW5kZXguZ2V0VGlsZShjYW5vbmljYWwueiwgY2Fub25pY2FsLngsIGNhbm9uaWNhbC55KTtcbiAgICBpZiAoIWdlb0pTT05UaWxlKSB7XG4gICAgICAgIHJldHVybiBjYWxsYmFjayhudWxsLCBudWxsKTsgLy8gbm90aGluZyBpbiB0aGUgZ2l2ZW4gdGlsZVxuICAgIH1cblxuICAgIGNvbnN0IGdlb2pzb25XcmFwcGVyID0gbmV3IEdlb0pTT05XcmFwcGVyKGdlb0pTT05UaWxlLmZlYXR1cmVzKTtcblxuICAgIC8vIEVuY29kZSB0aGUgZ2VvanNvbi12dCB0aWxlIGludG8gYmluYXJ5IHZlY3RvciB0aWxlIGZvcm0uICBUaGlzXG4gICAgLy8gaXMgYSBjb252ZW5pZW5jZSB0aGF0IGFsbG93cyBgRmVhdHVyZUluZGV4YCB0byBvcGVyYXRlIHRoZSBzYW1lIHdheVxuICAgIC8vIGFjcm9zcyBgVmVjdG9yVGlsZVNvdXJjZWAgYW5kIGBHZW9KU09OU291cmNlYCBkYXRhLlxuICAgIGxldCBwYmYgPSB2dHBiZihnZW9qc29uV3JhcHBlcik7XG4gICAgaWYgKHBiZi5ieXRlT2Zmc2V0ICE9PSAwIHx8IHBiZi5ieXRlTGVuZ3RoICE9PSBwYmYuYnVmZmVyLmJ5dGVMZW5ndGgpIHtcbiAgICAgICAgLy8gQ29tcGF0aWJpbGl0eSB3aXRoIG5vZGUgQnVmZmVyIChodHRwczovL2dpdGh1Yi5jb20vbWFwYm94L3BiZi9pc3N1ZXMvMzUpXG4gICAgICAgIHBiZiA9IG5ldyBVaW50OEFycmF5KHBiZik7XG4gICAgfVxuXG4gICAgY2FsbGJhY2sobnVsbCwge1xuICAgICAgICB2ZWN0b3JUaWxlOiBnZW9qc29uV3JhcHBlcixcbiAgICAgICAgcmF3RGF0YTogcGJmLmJ1ZmZlclxuICAgIH0pO1xufVxuXG5leHBvcnQgdHlwZSBTb3VyY2VTdGF0ZSA9XG4gICAgfCAnSWRsZScgICAgICAgICAgICAvLyBTb3VyY2UgZW1wdHkgb3IgZGF0YSBsb2FkZWRcbiAgICB8ICdDb2FsZXNjaW5nJyAgICAgIC8vIERhdGEgZmluaXNoZWQgbG9hZGluZywgYnV0IGRpc2NhcmQgJ2xvYWREYXRhJyBtZXNzYWdlcyB1bnRpbCByZWNlaXZpbmcgJ2NvYWxlc2NlZCdcbiAgICB8ICdOZWVkc0xvYWREYXRhJzsgIC8vICdsb2FkRGF0YScgcmVjZWl2ZWQgd2hpbGUgY29hbGVzY2luZywgdHJpZ2dlciBvbmUgbW9yZSAnbG9hZERhdGEnIG9uIHJlY2VpdmluZyAnY29hbGVzY2VkJ1xuXG4vKipcbiAqIFRoZSB7QGxpbmsgV29ya2VyU291cmNlfSBpbXBsZW1lbnRhdGlvbiB0aGF0IHN1cHBvcnRzIHtAbGluayBHZW9KU09OU291cmNlfS5cbiAqIFRoaXMgY2xhc3MgaXMgZGVzaWduZWQgdG8gYmUgZWFzaWx5IHJldXNlZCB0byBzdXBwb3J0IGN1c3RvbSBzb3VyY2UgdHlwZXNcbiAqIGZvciBkYXRhIGZvcm1hdHMgdGhhdCBjYW4gYmUgcGFyc2VkL2NvbnZlcnRlZCBpbnRvIGFuIGluLW1lbW9yeSBHZW9KU09OXG4gKiByZXByZXNlbnRhdGlvbi4gIFRvIGRvIHNvLCBjcmVhdGUgaXQgd2l0aFxuICogYG5ldyBHZW9KU09OV29ya2VyU291cmNlKGFjdG9yLCBsYXllckluZGV4LCBjdXN0b21Mb2FkR2VvSlNPTkZ1bmN0aW9uKWAuXG4gKiBGb3IgYSBmdWxsIGV4YW1wbGUsIHNlZSBbbWFwYm94LWdsLXRvcG9qc29uXShodHRwczovL2dpdGh1Yi5jb20vZGV2ZWxvcG1lbnRzZWVkL21hcGJveC1nbC10b3BvanNvbikuXG4gKlxuICogQHByaXZhdGVcbiAqL1xuY2xhc3MgR2VvSlNPTldvcmtlclNvdXJjZSBleHRlbmRzIFZlY3RvclRpbGVXb3JrZXJTb3VyY2Uge1xuICAgIGxvYWRHZW9KU09OOiBMb2FkR2VvSlNPTjtcbiAgICBfc3RhdGU6IFNvdXJjZVN0YXRlO1xuICAgIF9wZW5kaW5nQ2FsbGJhY2s6IENhbGxiYWNrPHtcbiAgICAgICAgcmVzb3VyY2VUaW1pbmc/OiB7W3N0cmluZ106IEFycmF5PFBlcmZvcm1hbmNlUmVzb3VyY2VUaW1pbmc+fSxcbiAgICAgICAgYWJhbmRvbmVkPzogYm9vbGVhbiB9PjtcbiAgICBfcGVuZGluZ0xvYWREYXRhUGFyYW1zOiBMb2FkR2VvSlNPTlBhcmFtZXRlcnM7XG4gICAgX2dlb0pTT05JbmRleDogR2VvSlNPTkluZGV4XG5cbiAgICAvKipcbiAgICAgKiBAcGFyYW0gW2xvYWRHZW9KU09OXSBPcHRpb25hbCBtZXRob2QgZm9yIGN1c3RvbSBsb2FkaW5nL3BhcnNpbmcgb2ZcbiAgICAgKiBHZW9KU09OIGJhc2VkIG9uIHBhcmFtZXRlcnMgcGFzc2VkIGZyb20gdGhlIG1haW4tdGhyZWFkIFNvdXJjZS5cbiAgICAgKiBTZWUge0BsaW5rIEdlb0pTT05Xb3JrZXJTb3VyY2UjbG9hZEdlb0pTT059LlxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKGFjdG9yOiBBY3RvciwgbGF5ZXJJbmRleDogU3R5bGVMYXllckluZGV4LCBsb2FkR2VvSlNPTjogP0xvYWRHZW9KU09OKSB7XG4gICAgICAgIHN1cGVyKGFjdG9yLCBsYXllckluZGV4LCBsb2FkR2VvSlNPTlRpbGUpO1xuICAgICAgICBpZiAobG9hZEdlb0pTT04pIHtcbiAgICAgICAgICAgIHRoaXMubG9hZEdlb0pTT04gPSBsb2FkR2VvSlNPTjtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEZldGNoZXMgKGlmIGFwcHJvcHJpYXRlKSwgcGFyc2VzLCBhbmQgaW5kZXggZ2VvanNvbiBkYXRhIGludG8gdGlsZXMuIFRoaXNcbiAgICAgKiBwcmVwYXJhdG9yeSBtZXRob2QgbXVzdCBiZSBjYWxsZWQgYmVmb3JlIHtAbGluayBHZW9KU09OV29ya2VyU291cmNlI2xvYWRUaWxlfVxuICAgICAqIGNhbiBjb3JyZWN0bHkgc2VydmUgdXAgdGlsZXMuXG4gICAgICpcbiAgICAgKiBEZWZlcnMgdG8ge0BsaW5rIEdlb0pTT05Xb3JrZXJTb3VyY2UjbG9hZEdlb0pTT059IGZvciB0aGUgZmV0Y2hpbmcvcGFyc2luZyxcbiAgICAgKiBleHBlY3RpbmcgYGNhbGxiYWNrKGVycm9yLCBkYXRhKWAgdG8gYmUgY2FsbGVkIHdpdGggZWl0aGVyIGFuIGVycm9yIG9yIGFcbiAgICAgKiBwYXJzZWQgR2VvSlNPTiBvYmplY3QuXG4gICAgICpcbiAgICAgKiBXaGVuIGBsb2FkRGF0YWAgcmVxdWVzdHMgY29tZSBpbiBmYXN0ZXIgdGhhbiB0aGV5IGNhbiBiZSBwcm9jZXNzZWQsXG4gICAgICogdGhleSBhcmUgY29hbGVzY2VkIGludG8gYSBzaW5nbGUgcmVxdWVzdCB1c2luZyB0aGUgbGF0ZXN0IGRhdGEuXG4gICAgICogU2VlIHtAbGluayBHZW9KU09OV29ya2VyU291cmNlI2NvYWxlc2NlfVxuICAgICAqXG4gICAgICogQHBhcmFtIHBhcmFtc1xuICAgICAqIEBwYXJhbSBjYWxsYmFja1xuICAgICAqL1xuICAgIGxvYWREYXRhKHBhcmFtczogTG9hZEdlb0pTT05QYXJhbWV0ZXJzLCBjYWxsYmFjazogQ2FsbGJhY2s8e1xuICAgICAgICByZXNvdXJjZVRpbWluZz86IHtbc3RyaW5nXTogQXJyYXk8UGVyZm9ybWFuY2VSZXNvdXJjZVRpbWluZz59LFxuICAgICAgICBhYmFuZG9uZWQ/OiBib29sZWFuIH0+KSB7XG4gICAgICAgIGlmICh0aGlzLl9wZW5kaW5nQ2FsbGJhY2spIHtcbiAgICAgICAgICAgIC8vIFRlbGwgdGhlIGZvcmVncm91bmQgdGhlIHByZXZpb3VzIGNhbGwgaGFzIGJlZW4gYWJhbmRvbmVkXG4gICAgICAgICAgICB0aGlzLl9wZW5kaW5nQ2FsbGJhY2sobnVsbCwgeyBhYmFuZG9uZWQ6IHRydWUgfSk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fcGVuZGluZ0NhbGxiYWNrID0gY2FsbGJhY2s7XG4gICAgICAgIHRoaXMuX3BlbmRpbmdMb2FkRGF0YVBhcmFtcyA9IHBhcmFtcztcblxuICAgICAgICBpZiAodGhpcy5fc3RhdGUgJiZcbiAgICAgICAgICAgIHRoaXMuX3N0YXRlICE9PSAnSWRsZScpIHtcbiAgICAgICAgICAgIHRoaXMuX3N0YXRlID0gJ05lZWRzTG9hZERhdGEnO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5fc3RhdGUgPSAnQ29hbGVzY2luZyc7XG4gICAgICAgICAgICB0aGlzLl9sb2FkRGF0YSgpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogSW50ZXJuYWwgaW1wbGVtZW50YXRpb246IGNhbGxlZCBkaXJlY3RseSBieSBgbG9hZERhdGFgXG4gICAgICogb3IgYnkgYGNvYWxlc2NlYCB1c2luZyBzdG9yZWQgcGFyYW1ldGVycy5cbiAgICAgKi9cbiAgICBfbG9hZERhdGEoKSB7XG4gICAgICAgIGlmICghdGhpcy5fcGVuZGluZ0NhbGxiYWNrIHx8ICF0aGlzLl9wZW5kaW5nTG9hZERhdGFQYXJhbXMpIHtcbiAgICAgICAgICAgIGFzc2VydChmYWxzZSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgY2FsbGJhY2sgPSB0aGlzLl9wZW5kaW5nQ2FsbGJhY2s7XG4gICAgICAgIGNvbnN0IHBhcmFtcyA9IHRoaXMuX3BlbmRpbmdMb2FkRGF0YVBhcmFtcztcbiAgICAgICAgZGVsZXRlIHRoaXMuX3BlbmRpbmdDYWxsYmFjaztcbiAgICAgICAgZGVsZXRlIHRoaXMuX3BlbmRpbmdMb2FkRGF0YVBhcmFtcztcblxuICAgICAgICBjb25zdCBwZXJmID0gKHBhcmFtcyAmJiBwYXJhbXMucmVxdWVzdCAmJiBwYXJhbXMucmVxdWVzdC5jb2xsZWN0UmVzb3VyY2VUaW1pbmcpID9cbiAgICAgICAgICAgIG5ldyBwZXJmb3JtYW5jZS5QZXJmb3JtYW5jZShwYXJhbXMucmVxdWVzdCkgOiBmYWxzZTtcblxuICAgICAgICB0aGlzLmxvYWRHZW9KU09OKHBhcmFtcywgKGVycjogP0Vycm9yLCBkYXRhOiA/T2JqZWN0KSA9PiB7XG4gICAgICAgICAgICBpZiAoZXJyIHx8ICFkYXRhKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBkYXRhICE9PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhuZXcgRXJyb3IoXCJJbnB1dCBkYXRhIGlzIG5vdCBhIHZhbGlkIEdlb0pTT04gb2JqZWN0LlwiKSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJld2luZChkYXRhLCB0cnVlKTtcblxuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2dlb0pTT05JbmRleCA9IHBhcmFtcy5jbHVzdGVyID9cbiAgICAgICAgICAgICAgICAgICAgICAgIHN1cGVyY2x1c3RlcihwYXJhbXMuc3VwZXJjbHVzdGVyT3B0aW9ucykubG9hZChkYXRhLmZlYXR1cmVzKSA6XG4gICAgICAgICAgICAgICAgICAgICAgICBnZW9qc29udnQoZGF0YSwgcGFyYW1zLmdlb2pzb25WdE9wdGlvbnMpO1xuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB0aGlzLmxvYWRlZCA9IHt9O1xuXG4gICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0ge307XG4gICAgICAgICAgICAgICAgaWYgKHBlcmYpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVzb3VyY2VUaW1pbmdEYXRhID0gcGVyZi5maW5pc2goKTtcbiAgICAgICAgICAgICAgICAgICAgLy8gaXQncyBuZWNlc3NhcnkgdG8gZXZhbCB0aGUgcmVzdWx0IG9mIGdldEVudHJpZXNCeU5hbWUoKSBoZXJlIHZpYSBwYXJzZS9zdHJpbmdpZnlcbiAgICAgICAgICAgICAgICAgICAgLy8gbGF0ZSBldmFsdWF0aW9uIGluIHRoZSBtYWluIHRocmVhZCBjYXVzZXMgVHlwZUVycm9yOiBpbGxlZ2FsIGludm9jYXRpb25cbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlc291cmNlVGltaW5nRGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0LnJlc291cmNlVGltaW5nID0ge307XG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQucmVzb3VyY2VUaW1pbmdbcGFyYW1zLnNvdXJjZV0gPSBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KHJlc291cmNlVGltaW5nRGF0YSkpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIHJlc3VsdCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFdoaWxlIHByb2Nlc3NpbmcgYGxvYWREYXRhYCwgd2UgY29hbGVzY2UgYWxsIGZ1cnRoZXJcbiAgICAgKiBgbG9hZERhdGFgIG1lc3NhZ2VzIGludG8gYSBzaW5nbGUgY2FsbCB0byBfbG9hZERhdGFcbiAgICAgKiB0aGF0IHdpbGwgaGFwcGVuIG9uY2Ugd2UndmUgZmluaXNoZWQgcHJvY2Vzc2luZyB0aGVcbiAgICAgKiBmaXJzdCBtZXNzYWdlLiB7QGxpbmsgR2VvSlNPTlNvdXJjZSNfdXBkYXRlV29ya2VyRGF0YX1cbiAgICAgKiBpcyByZXNwb25zaWJsZSBmb3Igc2VuZGluZyB1cyB0aGUgYGNvYWxlc2NlYCBtZXNzYWdlXG4gICAgICogYXQgdGhlIHRpbWUgaXQgcmVjZWl2ZXMgYSByZXNwb25zZSBmcm9tIGBsb2FkRGF0YWBcbiAgICAgKlxuICAgICAqICAgICAgICAgIFN0YXRlOiBJZGxlXG4gICAgICogICAgICAgICAg4oaRICAgICAgICAgIHxcbiAgICAgKiAgICAgJ2NvYWxlc2NlJyAgICdsb2FkRGF0YSdcbiAgICAgKiAgICAgICAgICB8ICAgICAodHJpZ2dlcnMgbG9hZClcbiAgICAgKiAgICAgICAgICB8ICAgICAgICAgIOKGk1xuICAgICAqICAgICAgICBTdGF0ZTogQ29hbGVzY2luZ1xuICAgICAqICAgICAgICAgIOKGkSAgICAgICAgICB8XG4gICAgICogICAodHJpZ2dlcnMgbG9hZCkgICB8XG4gICAgICogICAgICdjb2FsZXNjZScgICAnbG9hZERhdGEnXG4gICAgICogICAgICAgICAgfCAgICAgICAgICDihpNcbiAgICAgKiAgICAgICAgU3RhdGU6IE5lZWRzTG9hZERhdGFcbiAgICAgKi9cbiAgICBjb2FsZXNjZSgpIHtcbiAgICAgICAgaWYgKHRoaXMuX3N0YXRlID09PSAnQ29hbGVzY2luZycpIHtcbiAgICAgICAgICAgIHRoaXMuX3N0YXRlID0gJ0lkbGUnO1xuICAgICAgICB9IGVsc2UgaWYgKHRoaXMuX3N0YXRlID09PSAnTmVlZHNMb2FkRGF0YScpIHtcbiAgICAgICAgICAgIHRoaXMuX3N0YXRlID0gJ0NvYWxlc2NpbmcnO1xuICAgICAgICAgICAgdGhpcy5fbG9hZERhdGEoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICogSW1wbGVtZW50cyB7QGxpbmsgV29ya2VyU291cmNlI3JlbG9hZFRpbGV9LlxuICAgICpcbiAgICAqIElmIHRoZSB0aWxlIGlzIGxvYWRlZCwgdXNlcyB0aGUgaW1wbGVtZW50YXRpb24gaW4gVmVjdG9yVGlsZVdvcmtlclNvdXJjZS5cbiAgICAqIE90aGVyd2lzZSwgc3VjaCBhcyBhZnRlciBhIHNldERhdGEoKSBjYWxsLCB3ZSBsb2FkIHRoZSB0aWxlIGZyZXNoLlxuICAgICpcbiAgICAqIEBwYXJhbSBwYXJhbXNcbiAgICAqIEBwYXJhbSBwYXJhbXMudWlkIFRoZSBVSUQgZm9yIHRoaXMgdGlsZS5cbiAgICAqL1xuICAgIHJlbG9hZFRpbGUocGFyYW1zOiBXb3JrZXJUaWxlUGFyYW1ldGVycywgY2FsbGJhY2s6IFdvcmtlclRpbGVDYWxsYmFjaykge1xuICAgICAgICBjb25zdCBsb2FkZWQgPSB0aGlzLmxvYWRlZCxcbiAgICAgICAgICAgIHVpZCA9IHBhcmFtcy51aWQ7XG5cbiAgICAgICAgaWYgKGxvYWRlZCAmJiBsb2FkZWRbdWlkXSkge1xuICAgICAgICAgICAgcmV0dXJuIHN1cGVyLnJlbG9hZFRpbGUocGFyYW1zLCBjYWxsYmFjayk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5sb2FkVGlsZShwYXJhbXMsIGNhbGxiYWNrKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEZldGNoIGFuZCBwYXJzZSBHZW9KU09OIGFjY29yZGluZyB0byB0aGUgZ2l2ZW4gcGFyYW1zLiAgQ2FsbHMgYGNhbGxiYWNrYFxuICAgICAqIHdpdGggYChlcnIsIGRhdGEpYCwgd2hlcmUgYGRhdGFgIGlzIGEgcGFyc2VkIEdlb0pTT04gb2JqZWN0LlxuICAgICAqXG4gICAgICogR2VvSlNPTiBpcyBsb2FkZWQgYW5kIHBhcnNlZCBmcm9tIGBwYXJhbXMudXJsYCBpZiBpdCBleGlzdHMsIG9yIGVsc2VcbiAgICAgKiBleHBlY3RlZCBhcyBhIGxpdGVyYWwgKHN0cmluZyBvciBvYmplY3QpIGBwYXJhbXMuZGF0YWAuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gcGFyYW1zXG4gICAgICogQHBhcmFtIFtwYXJhbXMudXJsXSBBIFVSTCB0byB0aGUgcmVtb3RlIEdlb0pTT04gZGF0YS5cbiAgICAgKiBAcGFyYW0gW3BhcmFtcy5kYXRhXSBMaXRlcmFsIEdlb0pTT04gZGF0YS4gTXVzdCBiZSBwcm92aWRlZCBpZiBgcGFyYW1zLnVybGAgaXMgbm90LlxuICAgICAqL1xuICAgIGxvYWRHZW9KU09OKHBhcmFtczogTG9hZEdlb0pTT05QYXJhbWV0ZXJzLCBjYWxsYmFjazogUmVzcG9uc2VDYWxsYmFjazxPYmplY3Q+KSB7XG4gICAgICAgIC8vIEJlY2F1c2Ugb2Ygc2FtZSBvcmlnaW4gaXNzdWVzLCB1cmxzIG11c3QgZWl0aGVyIGluY2x1ZGUgYW4gZXhwbGljaXRcbiAgICAgICAgLy8gb3JpZ2luIG9yIGFic29sdXRlIHBhdGguXG4gICAgICAgIC8vIGllOiAvZm9vL2Jhci5qc29uIG9yIGh0dHA6Ly9leGFtcGxlLmNvbS9iYXIuanNvblxuICAgICAgICAvLyBidXQgbm90IC4uL2Zvby9iYXIuanNvblxuICAgICAgICBpZiAocGFyYW1zLnJlcXVlc3QpIHtcbiAgICAgICAgICAgIGdldEpTT04ocGFyYW1zLnJlcXVlc3QsIGNhbGxiYWNrKTtcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgcGFyYW1zLmRhdGEgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhudWxsLCBKU09OLnBhcnNlKHBhcmFtcy5kYXRhKSk7XG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKG5ldyBFcnJvcihcIklucHV0IGRhdGEgaXMgbm90IGEgdmFsaWQgR2VvSlNPTiBvYmplY3QuXCIpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhuZXcgRXJyb3IoXCJJbnB1dCBkYXRhIGlzIG5vdCBhIHZhbGlkIEdlb0pTT04gb2JqZWN0LlwiKSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZW1vdmVTb3VyY2UocGFyYW1zOiB7c291cmNlOiBzdHJpbmd9LCBjYWxsYmFjazogQ2FsbGJhY2s8bWl4ZWQ+KSB7XG4gICAgICAgIGlmICh0aGlzLl9wZW5kaW5nQ2FsbGJhY2spIHtcbiAgICAgICAgICAgIC8vIERvbid0IGxlYWsgY2FsbGJhY2tzXG4gICAgICAgICAgICB0aGlzLl9wZW5kaW5nQ2FsbGJhY2sobnVsbCwgeyBhYmFuZG9uZWQ6IHRydWUgfSk7XG4gICAgICAgIH1cbiAgICAgICAgY2FsbGJhY2soKTtcbiAgICB9XG5cbiAgICBnZXRDbHVzdGVyRXhwYW5zaW9uWm9vbShwYXJhbXM6IHtjbHVzdGVySWQ6IG51bWJlcn0sIGNhbGxiYWNrOiBDYWxsYmFjazxudW1iZXI+KSB7XG4gICAgICAgIGNhbGxiYWNrKG51bGwsIHRoaXMuX2dlb0pTT05JbmRleC5nZXRDbHVzdGVyRXhwYW5zaW9uWm9vbShwYXJhbXMuY2x1c3RlcklkKSk7XG4gICAgfVxuXG4gICAgZ2V0Q2x1c3RlckNoaWxkcmVuKHBhcmFtczoge2NsdXN0ZXJJZDogbnVtYmVyfSwgY2FsbGJhY2s6IENhbGxiYWNrPEFycmF5PEdlb0pTT05GZWF0dXJlPj4pIHtcbiAgICAgICAgY2FsbGJhY2sobnVsbCwgdGhpcy5fZ2VvSlNPTkluZGV4LmdldENoaWxkcmVuKHBhcmFtcy5jbHVzdGVySWQpKTtcbiAgICB9XG5cbiAgICBnZXRDbHVzdGVyTGVhdmVzKHBhcmFtczoge2NsdXN0ZXJJZDogbnVtYmVyLCBsaW1pdDogbnVtYmVyLCBvZmZzZXQ6IG51bWJlcn0sIGNhbGxiYWNrOiBDYWxsYmFjazxBcnJheTxHZW9KU09ORmVhdHVyZT4+KSB7XG4gICAgICAgIGNhbGxiYWNrKG51bGwsIHRoaXMuX2dlb0pTT05JbmRleC5nZXRMZWF2ZXMocGFyYW1zLmNsdXN0ZXJJZCwgcGFyYW1zLmxpbWl0LCBwYXJhbXMub2Zmc2V0KSk7XG4gICAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBHZW9KU09OV29ya2VyU291cmNlO1xuIiwiLy8gQGZsb3dcblxuaW1wb3J0IEFjdG9yIGZyb20gJy4uL3V0aWwvYWN0b3InO1xuXG5pbXBvcnQgU3R5bGVMYXllckluZGV4IGZyb20gJy4uL3N0eWxlL3N0eWxlX2xheWVyX2luZGV4JztcbmltcG9ydCBWZWN0b3JUaWxlV29ya2VyU291cmNlIGZyb20gJy4vdmVjdG9yX3RpbGVfd29ya2VyX3NvdXJjZSc7XG5pbXBvcnQgUmFzdGVyREVNVGlsZVdvcmtlclNvdXJjZSBmcm9tICcuL3Jhc3Rlcl9kZW1fdGlsZV93b3JrZXJfc291cmNlJztcbmltcG9ydCBHZW9KU09OV29ya2VyU291cmNlIGZyb20gJy4vZ2VvanNvbl93b3JrZXJfc291cmNlJztcbmltcG9ydCBhc3NlcnQgZnJvbSAnYXNzZXJ0JztcbmltcG9ydCB7IHBsdWdpbiBhcyBnbG9iYWxSVExUZXh0UGx1Z2luIH0gZnJvbSAnLi9ydGxfdGV4dF9wbHVnaW4nO1xuXG5pbXBvcnQgdHlwZSB7XG4gICAgV29ya2VyU291cmNlLFxuICAgIFdvcmtlclRpbGVQYXJhbWV0ZXJzLFxuICAgIFdvcmtlckRFTVRpbGVQYXJhbWV0ZXJzLFxuICAgIFdvcmtlclRpbGVDYWxsYmFjayxcbiAgICBXb3JrZXJERU1UaWxlQ2FsbGJhY2ssXG4gICAgVGlsZVBhcmFtZXRlcnNcbn0gZnJvbSAnLi4vc291cmNlL3dvcmtlcl9zb3VyY2UnO1xuXG5pbXBvcnQgdHlwZSB7V29ya2VyR2xvYmFsU2NvcGVJbnRlcmZhY2V9IGZyb20gJy4uL3V0aWwvd2ViX3dvcmtlcic7XG5pbXBvcnQgdHlwZSB7Q2FsbGJhY2t9IGZyb20gJy4uL3R5cGVzL2NhbGxiYWNrJztcbmltcG9ydCB0eXBlIHtMYXllclNwZWNpZmljYXRpb259IGZyb20gJy4uL3N0eWxlLXNwZWMvdHlwZXMnO1xuXG4vKipcbiAqIEBwcml2YXRlXG4gKi9cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFdvcmtlciB7XG4gICAgc2VsZjogV29ya2VyR2xvYmFsU2NvcGVJbnRlcmZhY2U7XG4gICAgYWN0b3I6IEFjdG9yO1xuICAgIGxheWVySW5kZXhlczogeyBbc3RyaW5nXTogU3R5bGVMYXllckluZGV4IH07XG4gICAgd29ya2VyU291cmNlVHlwZXM6IHsgW3N0cmluZ106IENsYXNzPFdvcmtlclNvdXJjZT4gfTtcbiAgICB3b3JrZXJTb3VyY2VzOiB7IFtzdHJpbmddOiB7IFtzdHJpbmddOiB7IFtzdHJpbmddOiBXb3JrZXJTb3VyY2UgfSB9IH07XG4gICAgZGVtV29ya2VyU291cmNlczogeyBbc3RyaW5nXTogeyBbc3RyaW5nXTogUmFzdGVyREVNVGlsZVdvcmtlclNvdXJjZSB9IH07XG4gICAgcmVmZXJyZXI6ID9zdHJpbmc7XG5cbiAgICBjb25zdHJ1Y3RvcihzZWxmOiBXb3JrZXJHbG9iYWxTY29wZUludGVyZmFjZSkge1xuICAgICAgICB0aGlzLnNlbGYgPSBzZWxmO1xuICAgICAgICB0aGlzLmFjdG9yID0gbmV3IEFjdG9yKHNlbGYsIHRoaXMpO1xuXG4gICAgICAgIHRoaXMubGF5ZXJJbmRleGVzID0ge307XG5cbiAgICAgICAgdGhpcy53b3JrZXJTb3VyY2VUeXBlcyA9IHtcbiAgICAgICAgICAgIHZlY3RvcjogVmVjdG9yVGlsZVdvcmtlclNvdXJjZSxcbiAgICAgICAgICAgIGdlb2pzb246IEdlb0pTT05Xb3JrZXJTb3VyY2VcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBbbWFwSWRdW3NvdXJjZVR5cGVdW3NvdXJjZU5hbWVdID0+IHdvcmtlciBzb3VyY2UgaW5zdGFuY2VcbiAgICAgICAgdGhpcy53b3JrZXJTb3VyY2VzID0ge307XG4gICAgICAgIHRoaXMuZGVtV29ya2VyU291cmNlcyA9IHt9O1xuXG4gICAgICAgIHRoaXMuc2VsZi5yZWdpc3RlcldvcmtlclNvdXJjZSA9IChuYW1lOiBzdHJpbmcsIFdvcmtlclNvdXJjZTogQ2xhc3M8V29ya2VyU291cmNlPikgPT4ge1xuICAgICAgICAgICAgaWYgKHRoaXMud29ya2VyU291cmNlVHlwZXNbbmFtZV0pIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFdvcmtlciBzb3VyY2Ugd2l0aCBuYW1lIFwiJHtuYW1lfVwiIGFscmVhZHkgcmVnaXN0ZXJlZC5gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMud29ya2VyU291cmNlVHlwZXNbbmFtZV0gPSBXb3JrZXJTb3VyY2U7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5zZWxmLnJlZ2lzdGVyUlRMVGV4dFBsdWdpbiA9IChydGxUZXh0UGx1Z2luOiB7YXBwbHlBcmFiaWNTaGFwaW5nOiBGdW5jdGlvbiwgcHJvY2Vzc0JpZGlyZWN0aW9uYWxUZXh0OiBGdW5jdGlvbiwgcHJvY2Vzc1N0eWxlZEJpZGlyZWN0aW9uYWxUZXh0PzogRnVuY3Rpb259KSA9PiB7XG4gICAgICAgICAgICBpZiAoZ2xvYmFsUlRMVGV4dFBsdWdpbi5pc0xvYWRlZCgpKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdSVEwgdGV4dCBwbHVnaW4gYWxyZWFkeSByZWdpc3RlcmVkLicpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZ2xvYmFsUlRMVGV4dFBsdWdpblsnYXBwbHlBcmFiaWNTaGFwaW5nJ10gPSBydGxUZXh0UGx1Z2luLmFwcGx5QXJhYmljU2hhcGluZztcbiAgICAgICAgICAgIGdsb2JhbFJUTFRleHRQbHVnaW5bJ3Byb2Nlc3NCaWRpcmVjdGlvbmFsVGV4dCddID0gcnRsVGV4dFBsdWdpbi5wcm9jZXNzQmlkaXJlY3Rpb25hbFRleHQ7XG4gICAgICAgICAgICBnbG9iYWxSVExUZXh0UGx1Z2luWydwcm9jZXNzU3R5bGVkQmlkaXJlY3Rpb25hbFRleHQnXSA9IHJ0bFRleHRQbHVnaW4ucHJvY2Vzc1N0eWxlZEJpZGlyZWN0aW9uYWxUZXh0O1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIHNldFJlZmVycmVyKG1hcElEOiBzdHJpbmcsIHJlZmVycmVyOiBzdHJpbmcpIHtcbiAgICAgICAgdGhpcy5yZWZlcnJlciA9IHJlZmVycmVyO1xuICAgIH1cblxuICAgIHNldExheWVycyhtYXBJZDogc3RyaW5nLCBsYXllcnM6IEFycmF5PExheWVyU3BlY2lmaWNhdGlvbj4sIGNhbGxiYWNrOiBXb3JrZXJUaWxlQ2FsbGJhY2spIHtcbiAgICAgICAgdGhpcy5nZXRMYXllckluZGV4KG1hcElkKS5yZXBsYWNlKGxheWVycyk7XG4gICAgICAgIGNhbGxiYWNrKCk7XG4gICAgfVxuXG4gICAgdXBkYXRlTGF5ZXJzKG1hcElkOiBzdHJpbmcsIHBhcmFtczoge2xheWVyczogQXJyYXk8TGF5ZXJTcGVjaWZpY2F0aW9uPiwgcmVtb3ZlZElkczogQXJyYXk8c3RyaW5nPn0sIGNhbGxiYWNrOiBXb3JrZXJUaWxlQ2FsbGJhY2spIHtcbiAgICAgICAgdGhpcy5nZXRMYXllckluZGV4KG1hcElkKS51cGRhdGUocGFyYW1zLmxheWVycywgcGFyYW1zLnJlbW92ZWRJZHMpO1xuICAgICAgICBjYWxsYmFjaygpO1xuICAgIH1cblxuICAgIGxvYWRUaWxlKG1hcElkOiBzdHJpbmcsIHBhcmFtczogV29ya2VyVGlsZVBhcmFtZXRlcnMgJiB7dHlwZTogc3RyaW5nfSwgY2FsbGJhY2s6IFdvcmtlclRpbGVDYWxsYmFjaykge1xuICAgICAgICBhc3NlcnQocGFyYW1zLnR5cGUpO1xuICAgICAgICB0aGlzLmdldFdvcmtlclNvdXJjZShtYXBJZCwgcGFyYW1zLnR5cGUsIHBhcmFtcy5zb3VyY2UpLmxvYWRUaWxlKHBhcmFtcywgY2FsbGJhY2spO1xuICAgIH1cblxuICAgIGxvYWRERU1UaWxlKG1hcElkOiBzdHJpbmcsIHBhcmFtczogV29ya2VyREVNVGlsZVBhcmFtZXRlcnMsIGNhbGxiYWNrOiBXb3JrZXJERU1UaWxlQ2FsbGJhY2spIHtcbiAgICAgICAgdGhpcy5nZXRERU1Xb3JrZXJTb3VyY2UobWFwSWQsIHBhcmFtcy5zb3VyY2UpLmxvYWRUaWxlKHBhcmFtcywgY2FsbGJhY2spO1xuICAgIH1cblxuICAgIHJlbG9hZFRpbGUobWFwSWQ6IHN0cmluZywgcGFyYW1zOiBXb3JrZXJUaWxlUGFyYW1ldGVycyAmIHt0eXBlOiBzdHJpbmd9LCBjYWxsYmFjazogV29ya2VyVGlsZUNhbGxiYWNrKSB7XG4gICAgICAgIGFzc2VydChwYXJhbXMudHlwZSk7XG4gICAgICAgIHRoaXMuZ2V0V29ya2VyU291cmNlKG1hcElkLCBwYXJhbXMudHlwZSwgcGFyYW1zLnNvdXJjZSkucmVsb2FkVGlsZShwYXJhbXMsIGNhbGxiYWNrKTtcbiAgICB9XG5cbiAgICBhYm9ydFRpbGUobWFwSWQ6IHN0cmluZywgcGFyYW1zOiBUaWxlUGFyYW1ldGVycyAmIHt0eXBlOiBzdHJpbmd9LCBjYWxsYmFjazogV29ya2VyVGlsZUNhbGxiYWNrKSB7XG4gICAgICAgIGFzc2VydChwYXJhbXMudHlwZSk7XG4gICAgICAgIHRoaXMuZ2V0V29ya2VyU291cmNlKG1hcElkLCBwYXJhbXMudHlwZSwgcGFyYW1zLnNvdXJjZSkuYWJvcnRUaWxlKHBhcmFtcywgY2FsbGJhY2spO1xuICAgIH1cblxuICAgIHJlbW92ZVRpbGUobWFwSWQ6IHN0cmluZywgcGFyYW1zOiBUaWxlUGFyYW1ldGVycyAmIHt0eXBlOiBzdHJpbmd9LCBjYWxsYmFjazogV29ya2VyVGlsZUNhbGxiYWNrKSB7XG4gICAgICAgIGFzc2VydChwYXJhbXMudHlwZSk7XG4gICAgICAgIHRoaXMuZ2V0V29ya2VyU291cmNlKG1hcElkLCBwYXJhbXMudHlwZSwgcGFyYW1zLnNvdXJjZSkucmVtb3ZlVGlsZShwYXJhbXMsIGNhbGxiYWNrKTtcbiAgICB9XG5cbiAgICByZW1vdmVERU1UaWxlKG1hcElkOiBzdHJpbmcsIHBhcmFtczogVGlsZVBhcmFtZXRlcnMpIHtcbiAgICAgICAgdGhpcy5nZXRERU1Xb3JrZXJTb3VyY2UobWFwSWQsIHBhcmFtcy5zb3VyY2UpLnJlbW92ZVRpbGUocGFyYW1zKTtcbiAgICB9XG5cbiAgICByZW1vdmVTb3VyY2UobWFwSWQ6IHN0cmluZywgcGFyYW1zOiB7c291cmNlOiBzdHJpbmd9ICYge3R5cGU6IHN0cmluZ30sIGNhbGxiYWNrOiBXb3JrZXJUaWxlQ2FsbGJhY2spIHtcbiAgICAgICAgYXNzZXJ0KHBhcmFtcy50eXBlKTtcbiAgICAgICAgYXNzZXJ0KHBhcmFtcy5zb3VyY2UpO1xuXG4gICAgICAgIGlmICghdGhpcy53b3JrZXJTb3VyY2VzW21hcElkXSB8fFxuICAgICAgICAgICAgIXRoaXMud29ya2VyU291cmNlc1ttYXBJZF1bcGFyYW1zLnR5cGVdIHx8XG4gICAgICAgICAgICAhdGhpcy53b3JrZXJTb3VyY2VzW21hcElkXVtwYXJhbXMudHlwZV1bcGFyYW1zLnNvdXJjZV0pIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHdvcmtlciA9IHRoaXMud29ya2VyU291cmNlc1ttYXBJZF1bcGFyYW1zLnR5cGVdW3BhcmFtcy5zb3VyY2VdO1xuICAgICAgICBkZWxldGUgdGhpcy53b3JrZXJTb3VyY2VzW21hcElkXVtwYXJhbXMudHlwZV1bcGFyYW1zLnNvdXJjZV07XG5cbiAgICAgICAgaWYgKHdvcmtlci5yZW1vdmVTb3VyY2UgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgd29ya2VyLnJlbW92ZVNvdXJjZShwYXJhbXMsIGNhbGxiYWNrKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBMb2FkIGEge0BsaW5rIFdvcmtlclNvdXJjZX0gc2NyaXB0IGF0IHBhcmFtcy51cmwuICBUaGUgc2NyaXB0IGlzIHJ1blxuICAgICAqICh1c2luZyBpbXBvcnRTY3JpcHRzKSB3aXRoIGByZWdpc3RlcldvcmtlclNvdXJjZWAgaW4gc2NvcGUsIHdoaWNoIGlzIGFcbiAgICAgKiBmdW5jdGlvbiB0YWtpbmcgYChuYW1lLCB3b3JrZXJTb3VyY2VPYmplY3QpYC5cbiAgICAgKiAgQHByaXZhdGVcbiAgICAgKi9cbiAgICBsb2FkV29ya2VyU291cmNlKG1hcDogc3RyaW5nLCBwYXJhbXM6IHsgdXJsOiBzdHJpbmcgfSwgY2FsbGJhY2s6IENhbGxiYWNrPHZvaWQ+KSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICB0aGlzLnNlbGYuaW1wb3J0U2NyaXB0cyhwYXJhbXMudXJsKTtcbiAgICAgICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKGUudG9TdHJpbmcoKSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBsb2FkUlRMVGV4dFBsdWdpbihtYXA6IHN0cmluZywgcGx1Z2luVVJMOiBzdHJpbmcsIGNhbGxiYWNrOiBDYWxsYmFjazx2b2lkPikge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgaWYgKCFnbG9iYWxSVExUZXh0UGx1Z2luLmlzTG9hZGVkKCkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNlbGYuaW1wb3J0U2NyaXB0cyhwbHVnaW5VUkwpO1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGdsb2JhbFJUTFRleHRQbHVnaW4uaXNMb2FkZWQoKSA/XG4gICAgICAgICAgICAgICAgICAgIG51bGwgOlxuICAgICAgICAgICAgICAgICAgICBuZXcgRXJyb3IoYFJUTCBUZXh0IFBsdWdpbiBmYWlsZWQgdG8gaW1wb3J0IHNjcmlwdHMgZnJvbSAke3BsdWdpblVSTH1gKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKGUudG9TdHJpbmcoKSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBnZXRMYXllckluZGV4KG1hcElkOiBzdHJpbmcpIHtcbiAgICAgICAgbGV0IGxheWVySW5kZXhlcyA9IHRoaXMubGF5ZXJJbmRleGVzW21hcElkXTtcbiAgICAgICAgaWYgKCFsYXllckluZGV4ZXMpIHtcbiAgICAgICAgICAgIGxheWVySW5kZXhlcyA9IHRoaXMubGF5ZXJJbmRleGVzW21hcElkXSA9IG5ldyBTdHlsZUxheWVySW5kZXgoKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbGF5ZXJJbmRleGVzO1xuICAgIH1cblxuICAgIGdldFdvcmtlclNvdXJjZShtYXBJZDogc3RyaW5nLCB0eXBlOiBzdHJpbmcsIHNvdXJjZTogc3RyaW5nKSB7XG4gICAgICAgIGlmICghdGhpcy53b3JrZXJTb3VyY2VzW21hcElkXSlcbiAgICAgICAgICAgIHRoaXMud29ya2VyU291cmNlc1ttYXBJZF0gPSB7fTtcbiAgICAgICAgaWYgKCF0aGlzLndvcmtlclNvdXJjZXNbbWFwSWRdW3R5cGVdKVxuICAgICAgICAgICAgdGhpcy53b3JrZXJTb3VyY2VzW21hcElkXVt0eXBlXSA9IHt9O1xuXG4gICAgICAgIGlmICghdGhpcy53b3JrZXJTb3VyY2VzW21hcElkXVt0eXBlXVtzb3VyY2VdKSB7XG4gICAgICAgICAgICAvLyB1c2UgYSB3cmFwcGVkIGFjdG9yIHNvIHRoYXQgd2UgY2FuIGF0dGFjaCBhIHRhcmdldCBtYXBJZCBwYXJhbVxuICAgICAgICAgICAgLy8gdG8gYW55IG1lc3NhZ2VzIGludm9rZWQgYnkgdGhlIFdvcmtlclNvdXJjZVxuICAgICAgICAgICAgY29uc3QgYWN0b3IgPSB7XG4gICAgICAgICAgICAgICAgc2VuZDogKHR5cGUsIGRhdGEsIGNhbGxiYWNrKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYWN0b3Iuc2VuZCh0eXBlLCBkYXRhLCBjYWxsYmFjaywgbWFwSWQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHRoaXMud29ya2VyU291cmNlc1ttYXBJZF1bdHlwZV1bc291cmNlXSA9IG5ldyAodGhpcy53b3JrZXJTb3VyY2VUeXBlc1t0eXBlXTogYW55KSgoYWN0b3I6IGFueSksIHRoaXMuZ2V0TGF5ZXJJbmRleChtYXBJZCkpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXMud29ya2VyU291cmNlc1ttYXBJZF1bdHlwZV1bc291cmNlXTtcbiAgICB9XG5cbiAgICBnZXRERU1Xb3JrZXJTb3VyY2UobWFwSWQ6IHN0cmluZywgc291cmNlOiBzdHJpbmcpIHtcbiAgICAgICAgaWYgKCF0aGlzLmRlbVdvcmtlclNvdXJjZXNbbWFwSWRdKVxuICAgICAgICAgICAgdGhpcy5kZW1Xb3JrZXJTb3VyY2VzW21hcElkXSA9IHt9O1xuXG4gICAgICAgIGlmICghdGhpcy5kZW1Xb3JrZXJTb3VyY2VzW21hcElkXVtzb3VyY2VdKSB7XG4gICAgICAgICAgICB0aGlzLmRlbVdvcmtlclNvdXJjZXNbbWFwSWRdW3NvdXJjZV0gPSBuZXcgUmFzdGVyREVNVGlsZVdvcmtlclNvdXJjZSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXMuZGVtV29ya2VyU291cmNlc1ttYXBJZF1bc291cmNlXTtcbiAgICB9XG59XG5cbi8qIGdsb2JhbCBzZWxmLCBXb3JrZXJHbG9iYWxTY29wZSAqL1xuaWYgKHR5cGVvZiBXb3JrZXJHbG9iYWxTY29wZSAhPT0gJ3VuZGVmaW5lZCcgJiZcbiAgICB0eXBlb2Ygc2VsZiAhPT0gJ3VuZGVmaW5lZCcgJiZcbiAgICBzZWxmIGluc3RhbmNlb2YgV29ya2VyR2xvYmFsU2NvcGUpIHtcbiAgICBzZWxmLndvcmtlciA9IG5ldyBXb3JrZXIoc2VsZik7XG59XG4iXSwibmFtZXMiOlsiY29uc3QiLCJsZXQiLCJnZXRBcnJheUJ1ZmZlciIsInZ0IiwiUHJvdG9idWYiLCJwZXJmb3JtYW5jZSIsIldvcmtlclRpbGUiLCJ0aGlzIiwiZXh0ZW5kIiwiREVNRGF0YSIsIm12dCIsIkVYVEVOVCIsIlBvaW50IiwiZ2VvbWV0cnkiLCJwb2ludCIsInJlcXVpcmUkJDAiLCJHZW9KU09OV3JhcHBlciIsIkZlYXR1cmVXcmFwcGVyIiwiUGJmIiwic29ydCIsInJld2luZCIsInRyYW5zZm9ybSIsInZ0cGJmIiwic3VwZXIiLCJhc3NlcnQiLCJnZXRKU09OIiwiV29ya2VyIiwiQWN0b3IiLCJnbG9iYWxSVExUZXh0UGx1Z2luIiwiU3R5bGVMYXllckluZGV4Il0sIm1hcHBpbmdzIjoiOztJQUFBOzs7Ozs7SUFNQUEsSUFBTSxpQkFBaUIsR0FBRyxPQUFPLFdBQVcsS0FBSyxXQUFXLENBQUM7SUFDN0RBLElBQU0sT0FBTyxHQUFHLEVBQUUsQ0FBQzs7SUFFbkIsT0FBTyxDQUFDLGdCQUFnQixhQUFJLEdBQUcsVUFBVTtRQUNyQyxJQUFJLGlCQUFpQixJQUFJLFdBQVcsSUFBSSxXQUFXLENBQUMsZ0JBQWdCO2NBQ2hFLE9BQU8sV0FBVyxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxHQUFDOztjQUV6QyxPQUFPLEtBQUssR0FBQztLQUNwQixDQUFDOztJQUVGLE9BQU8sQ0FBQyxJQUFJLGFBQUksSUFBSSxVQUFVO1FBQzFCLElBQUksaUJBQWlCLElBQUksV0FBVyxJQUFJLFdBQVcsQ0FBQyxJQUFJO2NBQ3BELE9BQU8sV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBQzs7Y0FFOUIsT0FBTyxLQUFLLEdBQUM7S0FDcEIsQ0FBQzs7SUFFRixPQUFPLENBQUMsT0FBTyxhQUFJLElBQUksVUFBVSxTQUFTLFVBQVUsT0FBTyxVQUFVO1FBQ2pFLElBQUksaUJBQWlCLElBQUksV0FBVyxJQUFJLFdBQVcsQ0FBQyxPQUFPO2NBQ3ZELE9BQU8sV0FBVyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsU0FBUyxFQUFFLE9BQU8sQ0FBQyxHQUFDOztjQUVyRCxPQUFPLEtBQUssR0FBQztLQUNwQixDQUFDOztJQUVGLE9BQU8sQ0FBQyxVQUFVLGFBQUksSUFBSSxVQUFVO1FBQ2hDLElBQUksaUJBQWlCLElBQUksV0FBVyxJQUFJLFdBQVcsQ0FBQyxVQUFVO2NBQzFELE9BQU8sV0FBVyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsR0FBQzs7Y0FFcEMsT0FBTyxLQUFLLEdBQUM7S0FDcEIsQ0FBQzs7SUFFRixPQUFPLENBQUMsYUFBYSxhQUFJLElBQUksVUFBVTtRQUNuQyxJQUFJLGlCQUFpQixJQUFJLFdBQVcsSUFBSSxXQUFXLENBQUMsYUFBYTtjQUM3RCxPQUFPLFdBQVcsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLEdBQUM7O2NBRXZDLE9BQU8sS0FBSyxHQUFDO0tBQ3BCLENBQUM7Ozs7Ozs7O0lBUUYsSUFBTSxXQUFXLEdBR2Isb0JBQVcsRUFBRSxPQUFPLGlCQUFxQjtRQUN6QyxJQUFRLENBQUMsTUFBTSxHQUFHO1lBQ1YsS0FBSyxFQUFFLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDO1lBQ3ZDLEdBQUcsRUFBRSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQztZQUNuQyxPQUFPLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUU7U0FDbEMsQ0FBQzs7UUFFTixPQUFXLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDcEMsRUFBQzs7SUFFTCxzQkFBSSw0QkFBUztRQUNULE9BQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUM5QkMsSUFBSSxrQkFBa0IsR0FBRyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQzs7O1FBR3ZFLElBQUksa0JBQWtCLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtZQUNyQyxPQUFXLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDekUsa0JBQWtCLEdBQUcsT0FBTyxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUM7OztZQUd2RSxPQUFXLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDMUMsT0FBVyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ3hDLE9BQVcsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQztTQUM5Qzs7UUFFTCxPQUFXLGtCQUFrQixDQUFDO0lBQzlCLENBQUMsQ0FDSjs7SUFFRCxPQUFPLENBQUMsV0FBVyxHQUFHLFdBQVcsQ0FBQzs7SUNsRmxDOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7SUE0Q0EsU0FBUyxjQUFjLENBQUMsTUFBTSx3QkFBd0IsUUFBUSwwQkFBMEI7UUFDcEZELElBQU0sT0FBTyxHQUFHRSx3QkFBYyxDQUFDLE1BQU0sQ0FBQyxPQUFPLFlBQUcsR0FBRyxVQUFVLElBQUksZ0JBQWdCLFlBQVksV0FBVyxPQUFPLFdBQVc7WUFDdEgsSUFBSSxHQUFHLEVBQUU7Z0JBQ0wsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2FBQ2pCLE1BQU0sSUFBSSxJQUFJLEVBQUU7Z0JBQ2IsUUFBUSxDQUFDLElBQUksRUFBRTtvQkFDWCxVQUFVLEVBQUUsSUFBSUMsYUFBRSxDQUFDLFVBQVUsQ0FBQyxJQUFJQyxrQkFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO29CQUNqRCxPQUFPLEVBQUUsSUFBSTtvQkFDYixZQUFZLEVBQUUsWUFBWTtvQkFDMUIsT0FBTyxFQUFFLE9BQU87aUJBQ25CLENBQUMsQ0FBQzthQUNOO1NBQ0osQ0FBQyxDQUFDO1FBQ0gsbUJBQVU7WUFDTixPQUFPLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDakIsUUFBUSxFQUFFLENBQUM7U0FDZCxDQUFDO0tBQ0w7Ozs7Ozs7Ozs7O0lBV0QsSUFBTSxzQkFBc0IsR0FheEIsK0JBQVcsQ0FBQyxLQUFLLE9BQVMsVUFBVSxpQkFBbUIsY0FBYyxpQkFBbUI7VUFDcEYsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUM7VUFDbkIsSUFBSSxDQUFDLFVBQVUsR0FBRyxVQUFVLENBQUM7VUFDN0IsSUFBSSxDQUFDLGNBQWMsR0FBRyxjQUFjLElBQUksY0FBYyxDQUFDO1VBQ3ZELElBQUksQ0FBQyxPQUFPLEdBQUcsRUFBRSxDQUFDO1VBQ2xCLElBQUksQ0FBQyxNQUFNLEdBQUcsRUFBRSxDQUFDO1FBQ3BCOzs7Ozs7O01BT0gsaUNBQUUsOEJBQVMsTUFBTSxzQkFBd0IsUUFBUSxvQkFBc0I7OztVQUNqRUosSUFBTSxHQUFHLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQzs7VUFFdkIsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPO2NBQ2YsRUFBRSxJQUFJLENBQUMsT0FBTyxHQUFHLEVBQUUsR0FBQzs7VUFFdEJBLElBQU0sSUFBSSxHQUFHLENBQUMsTUFBTSxJQUFJLE1BQU0sQ0FBQyxPQUFPLElBQUksTUFBTSxDQUFDLE9BQU8sQ0FBQyxxQkFBcUI7Y0FDNUUsSUFBTUssT0FBVyxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLEdBQUcsS0FBSyxDQUFDOztVQUV4REwsSUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJTSxvQkFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1VBQzlELFVBQVUsQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLFlBQUcsR0FBRyxFQUFFLFFBQVEsRUFBRTtjQUMzRCxPQUFPQyxNQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDOztjQUV6QixJQUFJLEdBQUcsSUFBSSxDQUFDLFFBQVEsRUFBRTtrQkFDbEIsVUFBVSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7a0JBQzdCLE1BQU0sQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLEdBQUcsVUFBVSxDQUFDO2tCQUM5QixPQUFPLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQztlQUN4Qjs7Y0FFRFAsSUFBTSxXQUFXLEdBQUcsUUFBUSxDQUFDLE9BQU8sQ0FBQztjQUNyQ0EsSUFBTSxZQUFZLEdBQUcsRUFBRSxDQUFDO2NBQ3hCLElBQUksUUFBUSxDQUFDLE9BQU8sSUFBRSxZQUFZLENBQUMsT0FBTyxHQUFHLFFBQVEsQ0FBQyxPQUFPLEdBQUM7Y0FDOUQsSUFBSSxRQUFRLENBQUMsWUFBWSxJQUFFLFlBQVksQ0FBQyxZQUFZLEdBQUcsUUFBUSxDQUFDLFlBQVksR0FBQzs7Y0FFN0VBLElBQU0sY0FBYyxHQUFHLEVBQUUsQ0FBQztjQUM1QixJQUFNLElBQUksRUFBRTtrQkFDUixJQUFRLGtCQUFrQixHQUFHLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQzs7O2tCQUd6QyxJQUFJLGtCQUFrQjtzQkFDcEIsRUFBRSxjQUFjLENBQUMsY0FBYyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLEdBQUM7ZUFDdEY7O2NBRUQsVUFBVSxDQUFDLFVBQVUsR0FBRyxRQUFRLENBQUMsVUFBVSxDQUFDO2NBQzlDLFVBQVksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLFVBQVUsRUFBRU8sTUFBSSxDQUFDLFVBQVUsRUFBRUEsTUFBSSxDQUFDLEtBQUssWUFBRyxHQUFHLEVBQUUsTUFBTSxFQUFFO2tCQUMvRSxJQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sSUFBRSxPQUFPLFFBQVEsQ0FBQyxHQUFHLENBQUMsR0FBQzs7O2tCQUczQyxRQUFVLENBQUMsSUFBSSxFQUFFQyxnQkFBTSxDQUFDLENBQUMsV0FBVyxFQUFFLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxNQUFNLEVBQUUsWUFBWSxFQUFFLGNBQWMsQ0FBQyxDQUFDLENBQUM7ZUFDckcsQ0FBQyxDQUFDOztjQUVMLE1BQU0sQ0FBQyxNQUFNLEdBQUdELE1BQUksQ0FBQyxNQUFNLElBQUksRUFBRSxDQUFDO2NBQ2xDLE1BQU0sQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLEdBQUcsVUFBVSxDQUFDO1dBQ2pDLENBQUMsQ0FBQztRQUNOOzs7OztNQUtILGlDQUFFLGtDQUFXLE1BQU0sc0JBQXdCLFFBQVEsb0JBQXNCO1VBQ25FUCxJQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBTTtjQUN0QixHQUFHLEdBQUcsTUFBTSxDQUFDLEdBQUc7Y0FDbEIsUUFBVSxHQUFHLElBQUksQ0FBQztVQUNwQixJQUFJLE1BQU0sSUFBSSxNQUFNLENBQUMsR0FBRyxDQUFDLEVBQUU7Y0FDekIsSUFBUSxVQUFVLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2NBQy9CLFVBQVUsQ0FBQyxrQkFBa0IsR0FBRyxNQUFNLENBQUMsa0JBQWtCLENBQUM7O2NBRTVELElBQVEsSUFBSSxhQUFJLEdBQUcsRUFBRSxJQUFJLEVBQUU7a0JBQ3JCQSxJQUFNLGNBQWMsR0FBRyxVQUFVLENBQUMsY0FBYyxDQUFDO2tCQUNuRCxJQUFNLGNBQWMsRUFBRTtzQkFDaEIsT0FBTyxVQUFVLENBQUMsY0FBYyxDQUFDO3NCQUNqQyxVQUFVLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxVQUFVLEVBQUUsUUFBUSxDQUFDLFVBQVUsRUFBRSxRQUFRLENBQUMsS0FBSyxFQUFFLGNBQWMsQ0FBQyxDQUFDO21CQUNoRztrQkFDRCxRQUFRLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxDQUFDO2VBQ3ZCLENBQUM7O2NBRUYsSUFBSSxVQUFVLENBQUMsTUFBTSxLQUFLLFNBQVMsRUFBRTtrQkFDakMsVUFBVSxDQUFDLGNBQWMsR0FBRyxJQUFJLENBQUM7ZUFDcEMsTUFBTSxJQUFJLFVBQVUsQ0FBQyxNQUFNLEtBQUssTUFBTSxFQUFFOztrQkFFckMsSUFBSSxVQUFVLENBQUMsVUFBVSxFQUFFO3NCQUN2QixVQUFVLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDO21CQUM5RSxNQUFNO3NCQUNMLElBQU0sRUFBRSxDQUFDO21CQUNWO2VBQ0o7V0FDSjtRQUNKOzs7Ozs7OztNQVFILGlDQUFFLGdDQUFVLE1BQU0sZ0JBQWtCLFFBQVEsb0JBQXNCO1VBQzVEQSxJQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsT0FBTztjQUN4QixHQUFHLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQztVQUNyQixJQUFJLE9BQU8sSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssRUFBRTtjQUMvQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUM7Y0FDckIsT0FBTyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7V0FDdkI7VUFDSCxRQUFVLEVBQUUsQ0FBQztRQUNkOzs7Ozs7OztNQVFILGlDQUFFLGtDQUFXLE1BQU0sZ0JBQWtCLFFBQVEsb0JBQXNCO1VBQzdEQSxJQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBTTtjQUN0QixHQUFHLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQztVQUNyQixJQUFJLE1BQU0sSUFBSSxNQUFNLENBQUMsR0FBRyxDQUFDLEVBQUU7Y0FDdkIsT0FBTyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7V0FDdEI7VUFDSCxRQUFVLEVBQUUsQ0FBQztPQUNkLENBQ0o7O0lDL01EOzs7Ozs7Ozs7O0lBWUEsSUFBTSx5QkFBeUIsR0FJM0Isa0NBQVcsR0FBRztRQUNWLElBQUksQ0FBQyxNQUFNLEdBQUcsRUFBRSxDQUFDO0lBQ3JCLEVBQUM7O0lBRUwsb0NBQUksOEJBQVMsTUFBTSx1QkFBMkIsUUFBUSxxQkFBeUI7UUFDM0UsSUFBVztnQkFBSztnQkFBVSxZQUFZLHVCQUFXO1FBQzdDQSxJQUFNLEdBQUcsR0FBRyxJQUFJUyxpQkFBTyxDQUFDLEdBQUcsRUFBRSxZQUFZLEVBQUUsUUFBUSxDQUFDLENBQUM7O1FBRXpELElBQVEsQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sSUFBSSxFQUFFLENBQUM7UUFDcEMsSUFBUSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsR0FBRyxHQUFHLENBQUM7UUFDdkIsUUFBUSxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQztJQUN4QixFQUFDOztJQUVMLG9DQUFJLGtDQUFXLE1BQU0sY0FBa0I7UUFDL0JULElBQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNO1lBQ3RCLEdBQUcsR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDO1FBQ3JCLElBQUksTUFBTSxJQUFJLE1BQU0sQ0FBQyxHQUFHLENBQUMsRUFBRTtZQUN2QixPQUFPLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztTQUN0QjtJQUNMLENBQUMsQ0FDSjs7SUNwQ0QsVUFBcUIsR0FBRyxPQUFPLENBQUM7SUFDaEMsY0FBeUIsR0FBRyxDQUFDLENBQUMsYUFBYSxDQUFDO0lBQzVDLGdCQUEyQixHQUFHLFlBQVksQ0FBQzs7Ozs7Ozs7SUNBM0MsY0FBdUIsR0FBRyxRQUFRLENBQUM7SUFDbkMsUUFBbUIsR0FBRyxRQUFRLENBQUM7O0lBRS9CLFNBQVMsUUFBUSxDQUFDLENBQUMsRUFBRTtRQUNqQixJQUFJLElBQUksR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ2hCLFFBQVEsQ0FBQyxDQUFDLElBQUk7WUFDVixLQUFLLFNBQVM7Z0JBQ1YsT0FBTyxXQUFXLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBQ3RDLEtBQUssY0FBYztnQkFDZixLQUFLLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO29CQUN2QyxJQUFJLElBQUksV0FBVyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztpQkFDekM7Z0JBQ0QsT0FBTyxJQUFJLENBQUM7WUFDaEIsS0FBSyxPQUFPLENBQUM7WUFDYixLQUFLLFlBQVksQ0FBQztZQUNsQixLQUFLLFlBQVksQ0FBQztZQUNsQixLQUFLLGlCQUFpQjtnQkFDbEIsT0FBTyxDQUFDLENBQUM7WUFDYixLQUFLLG9CQUFvQjtnQkFDckIsS0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtvQkFDdEMsSUFBSSxJQUFJLFFBQVEsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7aUJBQ3JDO2dCQUNELE9BQU8sSUFBSSxDQUFDO1NBQ25CO0tBQ0o7O0lBRUQsU0FBUyxXQUFXLENBQUMsTUFBTSxFQUFFO1FBQ3pCLElBQUksSUFBSSxHQUFHLENBQUMsQ0FBQztRQUNiLElBQUksTUFBTSxJQUFJLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO1lBQzdCLElBQUksSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3RDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO2dCQUNwQyxJQUFJLElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQzthQUN6QztTQUNKO1FBQ0QsT0FBTyxJQUFJLENBQUM7S0FDZjs7Ozs7Ozs7Ozs7Ozs7Ozs7SUFpQkQsU0FBUyxRQUFRLENBQUMsTUFBTSxFQUFFO1FBQ3RCLElBQUksRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsVUFBVSxFQUFFLFdBQVcsRUFBRSxVQUFVLEVBQUUsQ0FBQztRQUN0RCxJQUFJLEdBQUcsQ0FBQztRQUNSLFlBQVksR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDOztRQUU3QixJQUFJLFlBQVksR0FBRyxDQUFDLEVBQUU7WUFDbEIsS0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxZQUFZLEVBQUUsQ0FBQyxFQUFFLEVBQUU7Z0JBQy9CLElBQUksQ0FBQyxLQUFLLFlBQVksR0FBRyxDQUFDLEVBQUU7b0JBQ3hCLFVBQVUsR0FBRyxZQUFZLEdBQUcsQ0FBQyxDQUFDO29CQUM5QixXQUFXLEdBQUcsWUFBWSxFQUFFLENBQUMsQ0FBQztvQkFDOUIsVUFBVSxHQUFHLENBQUMsQ0FBQztpQkFDbEIsTUFBTSxJQUFJLENBQUMsS0FBSyxZQUFZLEdBQUcsQ0FBQyxFQUFFO29CQUMvQixVQUFVLEdBQUcsWUFBWSxHQUFHLENBQUMsQ0FBQztvQkFDOUIsV0FBVyxHQUFHLENBQUMsQ0FBQztvQkFDaEIsVUFBVSxHQUFHLENBQUMsQ0FBQztpQkFDbEIsTUFBTTtvQkFDSCxVQUFVLEdBQUcsQ0FBQyxDQUFDO29CQUNmLFdBQVcsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUNsQixVQUFVLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztpQkFDcEI7Z0JBQ0QsRUFBRSxHQUFHLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQztnQkFDeEIsRUFBRSxHQUFHLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQztnQkFDekIsRUFBRSxHQUFHLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQztnQkFDeEIsSUFBSSxJQUFJLEVBQUUsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2FBQy9EOztZQUVELElBQUksR0FBRyxJQUFJLEdBQUcsS0FBSyxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQztTQUNqRDs7UUFFRCxPQUFPLElBQUksQ0FBQztLQUNmOztJQUVELFNBQVMsR0FBRyxDQUFDLENBQUMsRUFBRTtRQUNaLE9BQU8sQ0FBQyxHQUFHLElBQUksQ0FBQyxFQUFFLEdBQUcsR0FBRyxDQUFDOzs7Ozs7OztJQ3JGN0IsaUJBQWMsR0FBRyxNQUFNLENBQUM7O0lBRXhCLFNBQVMsTUFBTSxDQUFDLEVBQUUsRUFBRSxLQUFLLEVBQUU7UUFDdkIsUUFBUSxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsSUFBSSxLQUFLLElBQUk7WUFDM0IsS0FBSyxtQkFBbUI7Z0JBQ3BCLEVBQUUsQ0FBQyxRQUFRLEdBQUcsRUFBRSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDO2dCQUN6RCxPQUFPLEVBQUUsQ0FBQztZQUNkLEtBQUssU0FBUztnQkFDVixFQUFFLENBQUMsUUFBUSxHQUFHLE1BQU0sQ0FBQyxFQUFFLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFDO2dCQUN6QyxPQUFPLEVBQUUsQ0FBQztZQUNkLEtBQUssU0FBUyxDQUFDO1lBQ2YsS0FBSyxjQUFjO2dCQUNmLE9BQU8sT0FBTyxDQUFDLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztZQUM5QjtnQkFDSSxPQUFPLEVBQUUsQ0FBQztTQUNqQjtLQUNKOztJQUVELFNBQVMsVUFBVSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUU7UUFDdEIsT0FBTyxTQUFTLENBQUMsRUFBRSxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7S0FDMUM7O0lBRUQsU0FBUyxPQUFPLENBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRTtRQUN2QixJQUFJLENBQUMsQ0FBQyxJQUFJLEtBQUssU0FBUyxFQUFFO1lBQ3RCLENBQUMsQ0FBQyxXQUFXLEdBQUcsWUFBWSxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsS0FBSyxDQUFDLENBQUM7U0FDdEQsTUFBTSxJQUFJLENBQUMsQ0FBQyxJQUFJLEtBQUssY0FBYyxFQUFFO1lBQ2xDLENBQUMsQ0FBQyxXQUFXLEdBQUcsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLFlBQVksRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDO1NBQ3RFO1FBQ0QsT0FBTyxDQUFDLENBQUM7S0FDWjs7SUFFRCxTQUFTLFlBQVksQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFO1FBQzVCLEtBQUssR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDO1FBQ2hCLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ3pCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQy9CLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUM7U0FDN0I7UUFDRCxPQUFPLENBQUMsQ0FBQztLQUNaOztJQUVELFNBQVMsSUFBSSxDQUFDLENBQUMsRUFBRSxHQUFHLEVBQUU7UUFDbEIsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUM7S0FDMUM7O0lBRUQsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFFO1FBQ1gsT0FBTyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztLQUNuQzs7SUNoREQ7SUFLQUEsSUFBTSxTQUFTLEdBQUdVLGFBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDO0FBQzVEOzs7Ozs7Ozs7Ozs7Ozs7SUFnQkEsSUFBTSxjQUFjLEdBUWhCLHVCQUFXLENBQUMsT0FBTyxPQUFXO1FBQzFCLElBQUksQ0FBQyxRQUFRLEdBQUcsT0FBTyxDQUFDOztRQUV4QixJQUFJLENBQUMsTUFBTSxHQUFHQyxnQkFBTSxDQUFDO1FBQ3JCLElBQUksQ0FBQyxJQUFJLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQztRQUN6QixJQUFJLENBQUMsVUFBVSxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUM7Ozs7Ozs7O1FBUS9CLElBQUksSUFBSSxJQUFJLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLEVBQUU7WUFDdkMsSUFBSSxDQUFDLEVBQUUsR0FBRyxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztTQUN0QztJQUNMLEVBQUM7O0lBRUwseUJBQUksd0NBQWU7OztRQUNmLElBQVEsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEtBQUssQ0FBQyxFQUFFO1lBQzFCWCxJQUFNLFFBQVEsR0FBRyxFQUFFLENBQUM7WUFDcEIsS0FBSyxrQkFBZU8sTUFBSSxDQUFDLFFBQVEsQ0FBQyxpQ0FBUSxFQUFFO2dCQUF2Q1AsSUFBTTs7b0JBQ1AsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUlZLGVBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2FBQ2xEO1lBQ0wsT0FBVyxRQUFRLENBQUM7U0FDbkIsTUFBTTtZQUNIWixJQUFNYSxVQUFRLEdBQUcsRUFBRSxDQUFDO1lBQ3BCLEtBQUssc0JBQWNOLE1BQUksQ0FBQyxRQUFRLENBQUMsdUNBQVEsRUFBRTtnQkFBdENQLElBQU07O29CQUNQQSxJQUFNLE9BQU8sR0FBRyxFQUFFLENBQUM7Z0JBQ3ZCLEtBQVMsc0JBQWUsbUNBQUksRUFBRTtvQkFBckJBLElBQU1jOzt3QkFDUCxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUlGLGVBQUssQ0FBQ0UsT0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFQSxPQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2lCQUMvQztnQkFDREQsVUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQzthQUMxQjtZQUNMLE9BQVdBLFVBQVEsQ0FBQztTQUNuQjtJQUNMLEVBQUM7O0lBRUwseUJBQUksa0NBQVUsQ0FBQyxNQUFVLENBQUMsTUFBVSxDQUFDLE1BQVU7UUFDdkMsT0FBTyxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ3pDLENBQUMsQ0FDSjs7SUFFRCxJQUFNLGNBQWMsR0FPaEIsdUJBQVcsQ0FBQyxRQUFRLGNBQWtCO1FBQ3RDLElBQVEsQ0FBQyxNQUFNLEdBQUcsRUFBRSxtQkFBbUIsRUFBRSxJQUFJLEVBQUUsQ0FBQztRQUM1QyxJQUFJLENBQUMsSUFBSSxHQUFHLG1CQUFtQixDQUFDO1FBQ2hDLElBQUksQ0FBQyxNQUFNLEdBQUdGLGdCQUFNLENBQUM7UUFDckIsSUFBSSxDQUFDLE1BQU0sR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDO1FBQzlCLElBQUksQ0FBQyxTQUFTLEdBQUcsUUFBUSxDQUFDO0lBQzlCLEVBQUM7O0lBRUwseUJBQUksNEJBQVEsQ0FBQyxxQkFBeUI7UUFDbEMsT0FBVyxJQUFJLGNBQWMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDakQsQ0FBQyxDQUNKOztJQ3hGRCxJQUFJLGlCQUFpQixHQUFHSSxvQkFBOEIsQ0FBQyxrQkFBaUI7O0lBRXhFLG1CQUFjLEdBQUdDLGlCQUFjOzs7SUFHL0IsU0FBU0EsZ0JBQWMsRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFO01BQzFDLElBQUksQ0FBQyxPQUFPLEdBQUcsT0FBTyxJQUFJLEdBQUU7TUFDNUIsSUFBSSxDQUFDLFFBQVEsR0FBRyxTQUFRO01BQ3hCLElBQUksQ0FBQyxNQUFNLEdBQUcsUUFBUSxDQUFDLE9BQU07S0FDOUI7O0FBRURBLG9CQUFjLENBQUMsU0FBUyxDQUFDLE9BQU8sR0FBRyxVQUFVLENBQUMsRUFBRTtNQUM5QyxPQUFPLElBQUlDLGdCQUFjLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQztNQUNqRTs7SUFFRCxTQUFTQSxnQkFBYyxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUU7TUFDeEMsSUFBSSxDQUFDLEVBQUUsR0FBRyxPQUFPLE9BQU8sQ0FBQyxFQUFFLEtBQUssUUFBUSxHQUFHLE9BQU8sQ0FBQyxFQUFFLEdBQUcsVUFBUztNQUNqRSxJQUFJLENBQUMsSUFBSSxHQUFHLE9BQU8sQ0FBQyxLQUFJO01BQ3hCLElBQUksQ0FBQyxXQUFXLEdBQUcsT0FBTyxDQUFDLElBQUksS0FBSyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLEdBQUcsT0FBTyxDQUFDLFNBQVE7TUFDN0UsSUFBSSxDQUFDLFVBQVUsR0FBRyxPQUFPLENBQUMsS0FBSTtNQUM5QixJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sSUFBSSxLQUFJO0tBQzdCOztBQUVEQSxvQkFBYyxDQUFDLFNBQVMsQ0FBQyxZQUFZLEdBQUcsWUFBWTs7O01BQ2xELElBQUksS0FBSyxHQUFHLElBQUksQ0FBQyxZQUFXO01BQzVCLElBQUksQ0FBQyxRQUFRLEdBQUcsR0FBRTs7TUFFbEIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7UUFDckMsSUFBSSxJQUFJLEdBQUcsS0FBSyxDQUFDLENBQUMsRUFBQztRQUNuQixJQUFJLE9BQU8sR0FBRyxHQUFFO1FBQ2hCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO1VBQ3BDLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSUwsaUJBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUM7U0FDaEQ7UUFDREwsTUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFDO09BQzVCO01BQ0QsT0FBTyxJQUFJLENBQUMsUUFBUTtNQUNyQjs7QUFFRFUsb0JBQWMsQ0FBQyxTQUFTLENBQUMsSUFBSSxHQUFHLFlBQVk7TUFDMUMsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLElBQUUsSUFBSSxDQUFDLFlBQVksS0FBRTs7TUFFdkMsSUFBSSxLQUFLLEdBQUcsSUFBSSxDQUFDLFNBQVE7TUFDekIsSUFBSSxFQUFFLEdBQUcsU0FBUTtNQUNqQixJQUFJLEVBQUUsR0FBRyxDQUFDLFNBQVE7TUFDbEIsSUFBSSxFQUFFLEdBQUcsU0FBUTtNQUNqQixJQUFJLEVBQUUsR0FBRyxDQUFDLFNBQVE7O01BRWxCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO1FBQ3JDLElBQUksSUFBSSxHQUFHLEtBQUssQ0FBQyxDQUFDLEVBQUM7O1FBRW5CLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO1VBQ3BDLElBQUksS0FBSyxHQUFHLElBQUksQ0FBQyxDQUFDLEVBQUM7O1VBRW5CLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQyxFQUFDO1VBQzFCLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQyxFQUFDO1VBQzFCLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQyxFQUFDO1VBQzFCLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQyxFQUFDO1NBQzNCO09BQ0Y7O01BRUQsT0FBTyxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQztNQUN4Qjs7QUFFREEsb0JBQWMsQ0FBQyxTQUFTLENBQUMsU0FBUyxHQUFHLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxTQUFTOztJQy9EMUUsU0FBYyxHQUFHLGlCQUFnQjtJQUNqQyxzQkFBK0IsR0FBRyxpQkFBZ0I7SUFDbEQsbUJBQTRCLEdBQUcsY0FBYTtJQUM1QyxvQkFBNkIsR0FBR0QsZ0JBQWM7Ozs7Ozs7O0lBUTlDLFNBQVMsZ0JBQWdCLEVBQUUsSUFBSSxFQUFFO01BQy9CLElBQUksR0FBRyxHQUFHLElBQUlFLGFBQUcsR0FBRTtNQUNuQixTQUFTLENBQUMsSUFBSSxFQUFFLEdBQUcsRUFBQztNQUNwQixPQUFPLEdBQUcsQ0FBQyxNQUFNLEVBQUU7S0FDcEI7Ozs7Ozs7Ozs7O0lBV0QsU0FBUyxhQUFhLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRTtNQUN2QyxPQUFPLEdBQUcsT0FBTyxJQUFJLEdBQUU7TUFDdkIsSUFBSSxDQUFDLEdBQUcsR0FBRTtNQUNWLEtBQUssSUFBSSxDQUFDLElBQUksTUFBTSxFQUFFO1FBQ3BCLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJRixlQUFjLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxPQUFPLEVBQUM7UUFDdEQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksR0FBRyxFQUFDO1FBQ2IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUMsUUFBTztRQUM5QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxHQUFHLE9BQU8sQ0FBQyxPQUFNO09BQzdCO01BQ0QsT0FBTyxnQkFBZ0IsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztLQUNyQzs7SUFFRCxTQUFTLFNBQVMsRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFO01BQzdCLEtBQUssSUFBSSxHQUFHLElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRTtRQUMzQixHQUFHLENBQUMsWUFBWSxDQUFDLENBQUMsRUFBRSxVQUFVLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsRUFBQztPQUNsRDtLQUNGOztJQUVELFNBQVMsVUFBVSxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUU7TUFDL0IsR0FBRyxDQUFDLGdCQUFnQixDQUFDLEVBQUUsRUFBRSxLQUFLLENBQUMsT0FBTyxJQUFJLENBQUMsRUFBQztNQUM1QyxHQUFHLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxJQUFJLElBQUksRUFBRSxFQUFDO01BQ3pDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLE1BQU0sSUFBSSxJQUFJLEVBQUM7O01BRTdDLElBQUksRUFBQztNQUNMLElBQUksT0FBTyxHQUFHO1FBQ1osSUFBSSxFQUFFLEVBQUU7UUFDUixNQUFNLEVBQUUsRUFBRTtRQUNWLFFBQVEsRUFBRSxFQUFFO1FBQ1osVUFBVSxFQUFFLEVBQUU7UUFDZjs7TUFFRCxLQUFLLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7UUFDakMsT0FBTyxDQUFDLE9BQU8sR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsRUFBQztRQUNsQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUMsRUFBRSxZQUFZLEVBQUUsT0FBTyxFQUFDO09BQzNDOztNQUVELElBQUksSUFBSSxHQUFHLE9BQU8sQ0FBQyxLQUFJO01BQ3ZCLEtBQUssQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtRQUNoQyxHQUFHLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBQztPQUNqQzs7TUFFRCxJQUFJLE1BQU0sR0FBRyxPQUFPLENBQUMsT0FBTTtNQUMzQixLQUFLLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7UUFDbEMsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFDLEVBQUUsVUFBVSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBQztPQUMzQztLQUNGOztJQUVELFNBQVMsWUFBWSxFQUFFLE9BQU8sRUFBRSxHQUFHLEVBQUU7TUFDbkMsSUFBSSxPQUFPLEdBQUcsT0FBTyxDQUFDLFFBQU87O01BRTdCLElBQUksT0FBTyxDQUFDLEVBQUUsS0FBSyxTQUFTLEVBQUU7UUFDNUIsR0FBRyxDQUFDLGdCQUFnQixDQUFDLENBQUMsRUFBRSxPQUFPLENBQUMsRUFBRSxFQUFDO09BQ3BDOztNQUVELEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQyxFQUFFLGVBQWUsRUFBRSxPQUFPLEVBQUM7TUFDN0MsR0FBRyxDQUFDLGdCQUFnQixDQUFDLENBQUMsRUFBRSxPQUFPLENBQUMsSUFBSSxFQUFDO01BQ3JDLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQyxFQUFFLGFBQWEsRUFBRSxPQUFPLEVBQUM7S0FDNUM7O0lBRUQsU0FBUyxlQUFlLEVBQUUsT0FBTyxFQUFFLEdBQUcsRUFBRTtNQUN0QyxJQUFJLE9BQU8sR0FBRyxPQUFPLENBQUMsUUFBTztNQUM3QixJQUFJLElBQUksR0FBRyxPQUFPLENBQUMsS0FBSTtNQUN2QixJQUFJLE1BQU0sR0FBRyxPQUFPLENBQUMsT0FBTTtNQUMzQixJQUFJLFFBQVEsR0FBRyxPQUFPLENBQUMsU0FBUTtNQUMvQixJQUFJLFVBQVUsR0FBRyxPQUFPLENBQUMsV0FBVTs7TUFFbkMsS0FBSyxJQUFJLEdBQUcsSUFBSSxPQUFPLENBQUMsVUFBVSxFQUFFO1FBQ2xDLElBQUksUUFBUSxHQUFHLFFBQVEsQ0FBQyxHQUFHLEVBQUM7UUFDNUIsSUFBSSxPQUFPLFFBQVEsS0FBSyxXQUFXLEVBQUU7VUFDbkMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUM7VUFDZCxRQUFRLEdBQUcsSUFBSSxDQUFDLE1BQU0sR0FBRyxFQUFDO1VBQzFCLFFBQVEsQ0FBQyxHQUFHLENBQUMsR0FBRyxTQUFRO1NBQ3pCO1FBQ0QsR0FBRyxDQUFDLFdBQVcsQ0FBQyxRQUFRLEVBQUM7O1FBRXpCLElBQUksS0FBSyxHQUFHLE9BQU8sQ0FBQyxVQUFVLENBQUMsR0FBRyxFQUFDO1FBQ25DLElBQUksSUFBSSxHQUFHLE9BQU8sTUFBSztRQUN2QixJQUFJLElBQUksS0FBSyxRQUFRLElBQUksSUFBSSxLQUFLLFNBQVMsSUFBSSxJQUFJLEtBQUssUUFBUSxFQUFFO1VBQ2hFLEtBQUssR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBQztTQUM5QjtRQUNELElBQUksUUFBUSxHQUFHLElBQUksR0FBRyxHQUFHLEdBQUcsTUFBSztRQUNqQyxJQUFJLFVBQVUsR0FBRyxVQUFVLENBQUMsUUFBUSxFQUFDO1FBQ3JDLElBQUksT0FBTyxVQUFVLEtBQUssV0FBVyxFQUFFO1VBQ3JDLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFDO1VBQ2xCLFVBQVUsR0FBRyxNQUFNLENBQUMsTUFBTSxHQUFHLEVBQUM7VUFDOUIsVUFBVSxDQUFDLFFBQVEsQ0FBQyxHQUFHLFdBQVU7U0FDbEM7UUFDRCxHQUFHLENBQUMsV0FBVyxDQUFDLFVBQVUsRUFBQztPQUM1QjtLQUNGOztJQUVELFNBQVMsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLEVBQUU7TUFDN0IsT0FBTyxDQUFDLE1BQU0sSUFBSSxDQUFDLEtBQUssR0FBRyxHQUFHLEdBQUcsQ0FBQztLQUNuQzs7SUFFRCxTQUFTLE1BQU0sRUFBRSxHQUFHLEVBQUU7TUFDcEIsT0FBTyxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLEVBQUUsQ0FBQztLQUNoQzs7SUFFRCxTQUFTLGFBQWEsRUFBRSxPQUFPLEVBQUUsR0FBRyxFQUFFO01BQ3BDLElBQUksUUFBUSxHQUFHLE9BQU8sQ0FBQyxZQUFZLEdBQUU7TUFDckMsSUFBSSxJQUFJLEdBQUcsT0FBTyxDQUFDLEtBQUk7TUFDdkIsSUFBSSxDQUFDLEdBQUcsRUFBQztNQUNULElBQUksQ0FBQyxHQUFHLEVBQUM7TUFDVCxJQUFJLEtBQUssR0FBRyxRQUFRLENBQUMsT0FBTTtNQUMzQixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsS0FBSyxFQUFFLENBQUMsRUFBRSxFQUFFO1FBQzlCLElBQUksSUFBSSxHQUFHLFFBQVEsQ0FBQyxDQUFDLEVBQUM7UUFDdEIsSUFBSSxLQUFLLEdBQUcsRUFBQztRQUNiLElBQUksSUFBSSxLQUFLLENBQUMsRUFBRTtVQUNkLEtBQUssR0FBRyxJQUFJLENBQUMsT0FBTTtTQUNwQjtRQUNELEdBQUcsQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsRUFBQzs7UUFFbEMsSUFBSSxTQUFTLEdBQUcsSUFBSSxLQUFLLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsT0FBTTtRQUMxRCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsU0FBUyxFQUFFLENBQUMsRUFBRSxFQUFFO1VBQ2xDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxJQUFJLEtBQUssQ0FBQyxFQUFFO1lBQ3pCLEdBQUcsQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUMsRUFBRSxTQUFTLEdBQUcsQ0FBQyxDQUFDLEVBQUM7V0FDM0M7VUFDRCxJQUFJLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUM7VUFDdEIsSUFBSSxFQUFFLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFDO1VBQ3RCLEdBQUcsQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxFQUFDO1VBQzNCLEdBQUcsQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxFQUFDO1VBQzNCLENBQUMsSUFBSSxHQUFFO1VBQ1AsQ0FBQyxJQUFJLEdBQUU7U0FDUjtRQUNELElBQUksSUFBSSxLQUFLLENBQUMsRUFBRTtVQUNkLEdBQUcsQ0FBQyxXQUFX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QUksV0FBVyxDQUFDO1FBQzNCLElBQUksR0FBRyxJQUFJLElBQUksV0FBVyxDQUFDO1FBQzNCLFNBQVMsR0FBRyxTQUFTLElBQUksS0FBSyxDQUFDOztRQUUvQixJQUFJLENBQUMsUUFBUSxHQUFHLFFBQVEsSUFBSSxFQUFFLENBQUM7UUFDL0IsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7O1FBRXJCLElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxTQUFTLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3hDLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxTQUFTLENBQUMsTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQzs7UUFFL0MsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDcENULE1BQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ2hCQSxNQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDckNBLE1BQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDNUM7O1FBRURZLE1BQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0tBQ3pFOztJQUVELE1BQU0sQ0FBQyxTQUFTLEdBQUc7UUFDZixLQUFLLEVBQUUsVUFBVSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUU7WUFDckMsT0FBTyxLQUFLLENBQUMs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LEtBQUssR0FBRyxHQUFHLEdBQUcsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxHQUFHLEdBQUcsR0FBRyxJQUFJLEdBQUcsR0FBRyxHQUFHLENBQUM7WUFDL0UsSUFBSSxNQUFNLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDOztZQUVsRCxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksR0FBRyxFQUFFO2dCQUMxQixNQUFNLEdBQUcsQ0FBQyxHQUFHLENBQUM7Z0JBQ2QsTUFBTSxHQUFHLEdBQUcsQ0FBQzthQUNoQixNQUFNLElBQUksTUFBTSxHQUFHLE1BQU0sRUFBRTtnQkFDeEIsSUFBSSxVQUFVLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsR0FBRyxFQUFFLE1BQU0sQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO2dCQUN2RSxJQUFJLFVBQVUsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxNQUFNLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztnQkFDeEUsT0FBTyxVQUFVLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDO2FBQ3hDOztZQUVELElBQUksSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1lBQzdDLElBQUksR0FBRyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7WUFD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
