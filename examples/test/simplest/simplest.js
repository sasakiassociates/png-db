import PngDBWriter from "../../../src/PngDBWriter";
import FieldTypes from "../../../src/FieldTypes";

var db = new PngDBWriter();
db.addField('Id', FieldTypes.KEY);
db.addField('Property Type', FieldTypes.TEXT);
db.addField('Unit Count', FieldTypes.INTEGER);

db.addMetaData('LatLonEncoding', {
    Name: 'Bond'
});

db.addRecord({
    'Id': '007',
    'Property Type': 'House',
    'Unit Count': 1,
});

db.save('../data/simplest.json');