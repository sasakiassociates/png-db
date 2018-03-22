import PngDBWriter from "../../../src/PngDBWriter";
import PngDBReader from "../../../src/PngDBReader";
import FieldTypes from "../../../src/FieldTypes";

const fs = require("fs");

const limit = 10000;//Number.MAX_VALUE


const latLonPrecision = 1000;

const db = new PngDBWriter({quantiles: 8});
// var db = new PngDBWriter();
db.addField('Id', FieldTypes.KEY);
db.addField('LU Type', FieldTypes.TEXT);
db.addField('Property Type', FieldTypes.TEXT);
db.addField('# Units', FieldTypes.INTEGER);
db.addField('Lat', FieldTypes.DECIMAL, latLonPrecision);//allow Lat/Lon to be stored as integers (pretty cool how reducing precision reduces file size in the PNG)
db.addField('Lon', FieldTypes.DECIMAL, latLonPrecision);
db.addArrayField('LonA', FieldTypes.DECIMAL, latLonPrecision);
db.addArrayField('LatA', FieldTypes.DECIMAL, latLonPrecision);

const dataDir = './data/';
const parcels = JSON.parse(fs.readFileSync(dataDir + 'parcel_points.geojson', 'utf-8'));

// var baseCoord = [Number.MAX_VALUE, Number.MAX_VALUE];

//use minimum for each x and y to ensure only positive values
// parcels.features.forEach(function (parcelFeature, i) {
//     baseCoord[0] = Math.min(baseCoord[0], parcelFeature.geometry.coordinates[0]);
//     baseCoord[1] = Math.min(baseCoord[1], parcelFeature.geometry.coordinates[1]);
// });

// db.addMetaData('LatLonEncoding', {
//     baseCoord: baseCoord,
//     precision: latLonPrecision
// });

console.log('Adding records');

parcels.features.forEach(function (parcelFeature, i) {
    if (i > limit) return;
    const parcelId = parcelFeature.properties.SCHEDNUM;
    const record = {
        'Id': parcelId,
        'LU Type': parcelFeature.properties['CPD_LU_II'],
        'Property Type': parcelFeature.properties['D_CLASS_CN'],
        '# Units': parcelFeature.properties['UNITS'],
        'Lat': parcelFeature.geometry.coordinates[1],
        'Lon': parcelFeature.geometry.coordinates[0],
        'LatA': [parcelFeature.geometry.coordinates[1] - 0.001, parcelFeature.geometry.coordinates[1], parcelFeature.geometry.coordinates[1] + 0.001],
        'LonA': [parcelFeature.geometry.coordinates[0] - 0.001, parcelFeature.geometry.coordinates[0], parcelFeature.geometry.coordinates[0] + 0.001],
    };
    db.addRecord(record);
});

console.log('Done adding records');
db.save('db/test-db.json');
//Note, saving all records as JSON as a sanity check to test on the client-side. See implementations/testBrowserRead for client-side test code.
// db.saveAllRecordsAsJson('db/full.json');

