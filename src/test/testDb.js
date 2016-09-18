import PngDBWriter from "../PngDBWriter";
import FieldTypes from "../FieldType";

var latLonPrecision = 1000;

var db = new PngDBWriter();
db.addField('Id', FieldTypes.KEY);
db.addField('LU Type', FieldTypes.TEXT);
db.addField('Property Type', FieldTypes.TEXT);
db.addField('# Units', FieldTypes.SMALLINT);
db.addField('Lat', FieldTypes.DECIMAL, latLonPrecision);//allow Lat/Lon to be stored as integers (pretty cool how reducing precision reduces file size in the PNG)
db.addField('Lon', FieldTypes.DECIMAL, latLonPrecision);

var fs = require("fs");
var dataDir = 'C:\\Users\\Ken\\Google Drive\\Transfer\\GIS\\Denver\\';
var parcels = JSON.parse(fs.readFileSync(dataDir + 'parcel_points.geojson', 'utf-8'));

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
    // if (i > 1000) return;
    var parcelId = parcelFeature.properties.SCHEDNUM;
    var record = {
        'Id': parcelId,
        'LU Type': parcelFeature.properties['CPD_LU_II'],
        'Property Type': parcelFeature.properties['D_CLASS_CN'],
        '# Units': parcelFeature.properties['UNITS'],
        'Lat': parcelFeature.geometry.coordinates[1],
        'Lon': parcelFeature.geometry.coordinates[0]
    };
    db.addRecord(record);
});

console.log('Done adding records');
db.save('test-db.json');
db.saveAllRecordsAsJson('full.json');

