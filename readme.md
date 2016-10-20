#png-db
png-db uses PNG files to encode large datasets for use in the browser. This is intended to be used for tools where a large amount of data needs to be displayed in the browser at one time and server-side querying is not suitable.

##Installation
`npm install --save png-db`

##Creating the database (Node.js)
```javascript
var db = new PngDB();

db.addField('Id', FieldTypes.KEY);
db.addField('Property Type', FieldTypes.TEXT);

db.addRecord({
    'Id': '007',
    'Property Type': 'House',
});

db.save('test-db.json');
```

##Reading the database (browser)
The following implementation creates a button for each field in the database that loads field data when clicked.
```javascript
var db = new PngDBReader();

db.load(`test-db.json`).then(()=> {
    Object.keys(db.fields).forEach(function (fieldName) {
        $('<button>').text(fieldName).appendTo($panel).click(function () {
            db.loadField(fieldName).then(()=> {
                db.records.forEach(function (record, i) {
                    //refresh view of data 
                });                
            })
        });
    });
});
```

##Field Properties
The following metadata is stored for each field when the database is saved
```javascript
var fieldMetaData = db.fields['numberField'];
fieldMetaData.range.min; // Minimum value stored in this field
fieldMetaData.range.max; // Maximum value stored in this field

var fieldMetaData = db.fields['numberField'];
fieldMetaData.uniqueValues; //An array of all text values stored in this field
```

##Motivation
Whereas databases and JSON files typically get large and cumbersome at around 50K records, image files of millions of pixels are routinely loaded into web pages. Each pixel of a PNG file has access to 4 channels of 8 bits (1 byte) each. We can take advantage of this to store multiple fields in a single PNG and create a large database from a handful of PNGs. 

Queries are simple because there is no record filtering (you get every single value). The only filtering we allow is selecting which fields to include.
Storing each field in PNGs also allows for really large databases to be available and fields to be queried on demand.  

PNG DB can be hosted statically without a server and can be used without gzip support for JSON. Since PNG files are compressed, this can offer impressive space savings over uncompressed JSON (see Metrics below)

##Supported Field Types
###Numbers
Number types related directly to the encoding of PNGs
TINYINT (1 byte) up to 256 values
SMALLINT (2 bytes) up to 65,535 values (2 smallints can be encoded in 1 PNG)
MEDIUMINT (3 bytes) up to 16,777,215 values
INT (4 bytes) up to 4,294,967,295 values (large values supported, but uses entire PNG)

###Text
Text values (TEXT) are also supported through an index file that references a number. Only repeating text values (not unique values) should be stored this way. The size of the integer (and number of bytes needed) depends on the number of unique values for the text field. Most text classifications will fit in 1 byte (255 values) so 4 fields can be stored per PNG.

###Keys
Key values (KEY) are not stored in PNG, but only in the JSON metadata. There is no efficiency gained by storing values in the key field, but sometimes you need a unique value per record. Typically this is used as a unique key for each record, but you can have multiple KEY fields (use sparingly for large datasets)

###Null values
Null values are stored as the maximum value for each integer type. This means that technically you only have 255 values for TINYINT (0-254) and a value of 255 means NULL.

##Metadata
Metadata is used to define what information (fields) are encoded in which PNG files and the meaning of those values. For indexed text classifications we store the text value associated with the integer.

Any additional data associated with this database can be stored using "addMetaData". This simply adds it to the JSON file.

##Why PNG?
Whereas JPEG (JPG) is lossy, PNG files use lossless compression so that individual pixel values are reliable. JPEG's Lossless compression is unsuitable for this type of use because we don't care about what the image looks like and do care about the exact values encoded in every pixel.

###Other PNG formats?
PNG supports 1 byte through 4 byte images and also 16 bits x 4 channels. We might be able to simplify the organization of the DB, but need to be careful to ensure compatibility with all browsers and tools.

###Optimization thoughts
Given the way PNG compression works, there may not be much benefit to combining multiple fields into a single image vs keeping them separate as 1 field per PNG
This would also simplify loading images on-demand. PNG compression is probably by channel, so we should check if there is an advantage to combining?
Small numbers encoded this way are very efficient right now - e.g. 11 classes for 156K points are 40KB, whereas point data with precision of 10000 are 500K (or 200K for precision of 100)

##Metrics
Your may results may vary, but some benchmarks for a city parcel dataset:
```
Records: 156132
Saved as JSON: 21MB
Saved as JSON (gzip): 811KB (96.1%)
Saved as JSON (7z): 617KB (97.1%)
Saved as PNG DB: 594KB (97.2%)
```
Note that this test did not include any unique KEY fields that must be saved as raw JSON. 
For the same records, a list of IDs (KEY) of this format '0015304017000' take up 2.38MB as pure JSON, or 495KB GZipped.
Not all applications will need a unique key beyond the numeric row number, so use only if needed.

##Limits
Browsers can read PNG images up to 3 megapixels. Therefore the maximum #rows supported is 3,145,728 (3 * 1024 * 1024) since each row is represented by a pixel. Tiling PNGs would allow us to extend this limit, but multiple other practical limitations are likely to be hit first.

##Repository Structure
This database is designed to be written using Node.js and read in the browser. Code is written in ES6 and transpiled.

###Working with ES6
Rollup is used to package the files in a future-proof way. You can use the npm installed package as usual with any ES5 project or target the ES6 modules directly using the jsnext:main file (dist/png-db.mjs)

For use with ES6 modules on the client side, we recommended bundling with jspm.

```
jspm install npm:png-db
```
