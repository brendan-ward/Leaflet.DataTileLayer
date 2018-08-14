# Leaflet.DataTileLayer

A leaflet tile layer for encoded data tiles. In short, data tiles are a way of encoding multiple raster data layers into a single layer for transport to the browser, and then decoding in the browser.

Tiles are currently packaged into grayscale or RGB PNG files. Due to issues with RGBA decoding\*, RGBA PNGs are not currently supported.

-   Different browsers apply gamma correction differently for RGBA PNG files, which means that the RGBA values derived from the image no longer match the values used when encoding the data tiles - which completely breaks the decoding process.

UNDER HEAVY DEVELOPMENT AND SUBJECT TO MAJOR BREAKING CHANGES

## Encoding

The core idea of data tiles is to use an encoding to "stack" multiple raster data tiles into a single layer, and then cut into tiles.

The essential information for decoding is passed in as `encoding` to this layer.

Example:

```
{
    "type": "exponential",
    "base": 8,
    "dtype": "uint16",
    "nodata": 65535,
    "layers": [
        {
            "id": "Layer 1",
            "nodata": 7,
            "type": "indexed",
            "values": [1, 2, 3, 4, 5]
        },
        {
            "id": "Layer 2",
            "nodata": 7,
            "type": "indexed",
            "values": [10, 20, 30, 40, 50]
        }
    ]
}
```

`exponential` is currently the only supported encoder; others are planned.

The basic idea of the exponential encoder is that the `base` is raised to the index of the layer (for layers 2..n) and added to the value of the layer.

Layers can be further encoded using indexed values. This means that unique values are extracted to `values` and an index to them is encoded into the data tile.

Further documentation of encoding is TODO.

## Usage

Once this package has stabilized, it will be published to NPM.

Example of usage is under development.

## Development

`rollup` is used with `babel` to package the files into `dist/index.js`.

1. `yarn install` or `npm install`
2. `yarn watch` to run the `rollup` watch process on the files.

## Credits:

This project was inspired by encoded elevation data, such as [Mapbox elevation tiles](https://www.mapbox.com/help/access-elevation-data/).

The tile pixel data extraction process was derived from: https://github.com/frogcat/leaflet-tilelayer-colorpicker
