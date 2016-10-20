import PngDBWriter from "../../../src/PngDBWriter";
import FieldTypes from "../../../src/FieldTypes";

var db = new PngDBWriter();
db.addField('Id', FieldTypes.KEY);
db.addField('Property Type', FieldTypes.TEXT);

db.addMetaData('LatLonEncoding', {
    Name: 'Bond'
});

db.addRecord({
    'Id': '007',
    'Property Type': 'House',
});

db.save('../data/simplest.json');