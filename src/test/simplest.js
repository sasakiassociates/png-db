import PngDB from "../PngDB";
import FieldTypes from "../FieldType";

var db = new PngDB();
db.addField('Id', FieldTypes.KEY);
db.addField('Property Type', FieldTypes.TEXT);

db.addMetaData('LatLonEncoding', {
    Name: 'Bond'
});

db.addRecord({
    'Id': '007',
    'Property Type': 'House',
});

db.save();