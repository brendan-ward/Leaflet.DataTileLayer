import { exponentialDecoder, rgbaDecoder } from "./decoder";

/**
 * DataTileLayer implements the TileLayer interface with ability to decode pixel values to layer values.
 * Requires an encoding parameter, see README for details on encoding
 */
export const DataTileLayer = L.TileLayer.extend({
    options: {
        crossOrigin: true,
        encoding: null,
        imageSize: 256 // actual size of the image in pixels; tileSize must be 256 or Leaflet breaks
    },
    initialize: function(url, options) {
        L.TileLayer.prototype.initialize.call(this, url, options);
        const { encoding } = options;
        if (!encoding) {
            throw new Error("encoding is required");
        }

        const { type: encodingType, dtype, nodata } = encoding;
        if (encodingType !== "exponential") {
            throw new Error(`Encoding type is not supported: ${encodingType}`);
        }
        if (!(dtype === "uint8" || dtype === "uint16" || dtype === "uint32")) {
            throw new Error(`dtype is not supported ${dtype}`);
        }
        if (nodata === null || nodata === undefined) {
            throw new Error("nodata value is required");
        }

        this.rgbaDecoder = rgbaDecoder.bind(null, dtype, nodata);
        switch (encodingType) {
            case "exponential": {
                this.decoder = exponentialDecoder.bind(null, options.encoding);
                break;
            }
        }
    },

    /**
     * Get value for a given latlng, scaling to match the image size if needed
     * If value is NODATA, null will be returned.
     * Otherwise this will return an object with a key for each layer and the decoded value
     */
    decodePoint: function(latlng) {
        const imageSize = this.options.imageSize || 256;
        const tileFootprint = this.getTileSize(); // tile footprint should always be 256x256
        const point = this._map.project(latlng, this._tileZoom).floor();
        const coords = point.unscaleBy(tileFootprint).floor();
        let offset = point.subtract(coords.scaleBy(tileFootprint)); // offset within a 256 pixel footprint
        if (this.options.imageSize && this.options.imageSize !== 256) {
            // scale to the actual image size
            const scale = this.options.imageSize / 256;
            offset = offset.scaleBy({ x: scale, y: scale }).floor();
        }

        coords.z = this._tileZoom;
        const tile = this._tiles[this._tileCoordsToKey(coords)];
        if (!tile || !tile.loaded) return null;
        try {
            var canvas = document.createElement("canvas");
            canvas.width = 1;
            canvas.height = 1;
            const context = canvas.getContext("2d");
            context.drawImage(tile.el, -offset.x, -offset.y, imageSize, imageSize);
            const rgba = context.getImageData(0, 0, 1, 1).data;
            const value = this.rgbaDecoder(rgba);

            if (value !== null && this.decoder) {
                const decoded = this.decoder(value);
                return decoded;
            }
            return null;
        } catch (err) {
            console.error(err);
            return null;
        }
    }
});

export default function dataTileLayer(url, options) {
    return new DataTileLayer(url, options);
}

L.dataTileLayer = dataTileLayer;
