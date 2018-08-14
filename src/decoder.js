/**
 * Decode an rgba Uint8ClampedArray to appropriate value for data type, or null if value is nodata
 * @param {string} dtype - data type: uint8, uint16, uint32
 * @param {uint} nodata - nodata value for all layers, typically the highest value for dtype
 * @param {Uint8ClampedArray} rgba - rgba values obtained from canvas
 */
export function rgbaDecoder(dtype, nodata, rgba) {
    const [r, g, b, a] = rgba;

    // if all channels are 0, it is outside tile bounds.
    // if all channels are 255, assume this is NODATA (by convention)
    const sumChannels = r + g + b + a;
    if (sumChannels === 0 || sumChannels === 1020) {
        // value is nodata
        return null;
    }

    let value = null;

    switch (dtype) {
        case "uint8": {
            value = r;
            break;
        }
        case "uint16": {
            value = (r << 16) | (g << 8) | b;
            break;
        }
        case "uint32": {
            // the image may be RGB or RGBA
            if (a === 255) {
                // type is RGB
                value = (r << 16) | (g << 8) | b;
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
export function exponentialDecoder(encoding, value) {
    var values = {};
    const numLayers = encoding.layers.length;
    const base = encoding.base;
    let decoded = null;
    let factor = null;
    let remainder = null;
    for (var i = numLayers - 1; i >= 0; i--) {
        const layer = encoding.layers[i];
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
