var map = L.map("Map", {
    center: [36, -80],
    zoom: 5,
    // minZoom: 0,
    maxZoom: 11 //TODO: 13
});
map.zoomControl.setPosition("bottomright");
L.tileLayer("//{s}.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}", {
    attribution:
        "Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community",
    subdomains: ["server", "services"],
    label: "ESRI Topo"
}).addTo(map);

// const encoding = {
//     type: "exponential",
//     base: 8,
//     dtype: "uint16",
//     nodata: 65535,
//     layers: [
//         {
//             id: "Marine_Birds",
//             nodata: 7,
//             type: "indexed",
//             values: [1, 2, 3, 4, 5]
//         },
//         {
//             id: "Marine_Mammals",
//             nodata: 7,
//             type: "indexed",
//             values: [1, 2, 3, 4, 5]
//         },
//         {
//             id: "Marine_PotentialHardbottomCondition",
//             nodata: 7,
//             type: "indexed",
//             values: [0, 1, 2, 3]
//         }
//     ]
// };

// const layer = L.dataTileLayer("http://localhost:8001/services/test/tiles/{z}/{x}/{y}.png", {
//     encoding: encoding,
//     opacity: 0.5
// }).addTo(map);

const url = "http://localhost:8001/services/test";
d3.json(url, function(tileJSON) {
    console.log(tileJSON);

    const layer = L.dataTileLayer(tileJSON.tiles[0], {
        encoding: JSON.parse(tileJSON.encoding),
        opacity: 0.5
    }).addTo(map);

    function getValue() {
        var values = layer.decodePoint(map.getCenter());
        console.log("values", values);
        // displayValues(values);
    }

    layer.on("load", getValue); //call after tiles have loaded
    map.on("move", getValue);
});

// var getValue = function() {
//     var values = layer.getValue(map.getCenter());
//     console.log("values", values);
// };

// layer.on("load", getValue); //call after tiles have loaded
// map.on("move", getValue);
