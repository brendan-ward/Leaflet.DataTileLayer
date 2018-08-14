(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (factory((global.DataTiles = {})));
}(this, (function (exports) { 'use strict';

  var slicedToArray = function () {
    function sliceIterator(arr, i) {
      var _arr = [];
      var _n = true;
      var _d = false;
      var _e = undefined;

      try {
        for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {
          _arr.push(_s.value);

          if (i && _arr.length === i) break;
        }
      } catch (err) {
        _d = true;
        _e = err;
      } finally {
        try {
          if (!_n && _i["return"]) _i["return"]();
        } finally {
          if (_d) throw _e;
        }
      }

      return _arr;
    }

    return function (arr, i) {
      if (Array.isArray(arr)) {
        return arr;
      } else if (Symbol.iterator in Object(arr)) {
        return sliceIterator(arr, i);
      } else {
        throw new TypeError("Invalid attempt to destructure non-iterable instance");
      }
    };
  }();

  /**
   * Decode an rgba Uint8ClampedArray to appropriate value for data type, or null if value is nodata
   * @param {string} dtype - data type: uint8, uint16, uint32
   * @param {uint} nodata - nodata value for all layers, typically the highest value for dtype
   * @param {Uint8ClampedArray} rgba - rgba values obtained from canvas
   */
  function rgbaDecoder(dtype, nodata, rgba) {
      var _rgba = slicedToArray(rgba, 4),
          r = _rgba[0],
          g = _rgba[1],
          b = _rgba[2],
          a = _rgba[3];

      // if all channels are 0, it is outside tile bounds.
      // if all channels are 255, assume this is NODATA (by convention)


      var sumChannels = r + g + b + a;
      if (sumChannels === 0 || sumChannels === 1020) {
          // value is nodata
          return null;
      }

      var value = null;

      switch (dtype) {
          case "uint8":
              {
                  value = r;
                  break;
              }
          case "uint16":
              {
                  value = r << 16 | g << 8 | b;
                  break;
              }
          case "uint32":
              {
                  // the image may be RGB or RGBA
                  if (a === 255) {
                      // type is RGB
                      value = r << 16 | g << 8 | b;
                  } else {
                      // Note: browsers do not consistently decode RGBA PNG files to the exact pixel values,
                      // which breaks this approach.

                      // DO NOT USE RGBA AT THIS TIME!!
                      // type is RGBA, use bit shifting to force output to uint
                      // TODO: figure out if alpha is first or last value in int
                      // value = (((r << 24) >>> 0) | (g << 16) | ((b << 8) + a)) >>> 0;
                      // value = (((a << 24) >>> 0) | (r << 16) | ((g << 8) + b)) >>> 0;
                      // We can also get the uint32 directly:
                      // value = new Uint32Array(rgba.buffer);

                      throw new Error("RGBA PNG files are not supported at this time");
                  }
              }
      }

      return value === nodata ? null : value;
  }

  /**
   *
   * @param {object} encoding - encoding parameters: {layers: [{id: <id>, type: <layer type>, values: <unique values (optional)}]}
   * @param {number} value - value to decode
   */
  function exponentialDecoder(encoding, value) {
      var values = {};
      var numLayers = encoding.layers.length;
      var base = encoding.base;
      var decoded = null;
      var factor = null;
      var remainder = null;
      for (var i = numLayers - 1; i >= 0; i--) {
          var layer = encoding.layers[i];
          if (i === 0) {
              decoded = value;
          } else {
              factor = Math.pow(base, i);
              remainder = value % factor;
              decoded = Math.round((value - remainder) / factor);
              value = remainder;
          }

          if (decoded === layer.nodata) {
              values[layer.id] = null;
          } else if (layer.type === "indexed") {
              values[layer.id] = layer.values[decoded];
          } else {
              values[layer.id] = decoded;
          }
      }
      return values;
  }

  /**
   * DataTileLayer implements the TileLayer interface with ability to decode pixel values to layer values.
   * Requires an encoding parameter, see README for details on encoding
   */
  var DataTileLayer = L.TileLayer.extend({
      options: {
          crossOrigin: true,
          encoding: null
      },
      initialize: function initialize(url, options) {
          L.TileLayer.prototype.initialize.call(this, url, options);
          var encoding = options.encoding;

          if (!encoding) {
              throw new Error("encoding is required");
          }

          var encodingType = encoding.type,
              dtype = encoding.dtype,
              nodata = encoding.nodata;

          if (encodingType !== "exponential") {
              throw new Error("Encoding type is not supported: " + encodingType);
          }
          if (!(dtype === "uint8" || dtype === "uint16" || dtype === "uint32")) {
              throw new Error("dtype is not supported " + dtype);
          }
          if (nodata === null || nodata === undefined) {
              throw new Error("nodata value is required");
          }

          this.rgbaDecoder = rgbaDecoder.bind(null, dtype, nodata);
          switch (encodingType) {
              case "exponential":
                  {
                      this.decoder = exponentialDecoder.bind(null, options.encoding);
                      break;
                  }
          }
      },

      /**
       * Get value for a given latlng.
       * If value is NODATA, null will be returned.
       * Otherwise this will return an object with a key for each layer and the decoded value
       */
      decodePoint: function decodePoint(latlng) {
          // derived from: https://github.com/frogcat/leaflet-tilelayer-colorpicker
          var size = this.getTileSize();
          var point = this._map.project(latlng, this._tileZoom).floor();
          var coords = point.unscaleBy(size).floor();
          var offset = point.subtract(coords.scaleBy(size));
          coords.z = this._tileZoom;
          var tile = this._tiles[this._tileCoordsToKey(coords)];
          if (!tile || !tile.loaded) return null;
          try {
              var canvas = document.createElement("canvas");
              canvas.width = 1;
              canvas.height = 1;
              var context = canvas.getContext("2d");
              context.drawImage(tile.el, -offset.x, -offset.y, size.x, size.y);
              var rgba = context.getImageData(0, 0, 1, 1).data;
              var value = this.rgbaDecoder(rgba);

              if (value !== null && this.decoder) {
                  var decoded = this.decoder(value);
                  return decoded;
              }
              return null;
          } catch (err) {
              console.error(err);
              return null;
          }
      }
  });

  function dataTileLayer(url, options) {
      return new DataTileLayer(url, options);
  }

  L.dataTileLayer = dataTileLayer;

  exports.DataTileLayer = DataTileLayer;
  exports.default = dataTileLayer;

  Object.defineProperty(exports, '__esModule', { value: true });

})));
