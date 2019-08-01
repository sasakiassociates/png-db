const { PngDBWriter, FieldTypes } = require('../../../versions/node/dist/png-db');

const count = 30;
const range = {
    min: 30,
    max: 1000,
};

//const sizes = [1000, 1000, 195, 12, 21, 70, 200, 200];
const sizes = [1200, 1200, 200, 200, 200, 200];
const bucketSize = (range.max - range.min) / 30;

const data = sizes.reduce((data, size, i) => {
    const dataForSize = [];

    const min = (i * bucketSize) + range.min;
    const max = min + bucketSize;

    for (let i = 0; i < size; i++) {
        dataForSize.push({
            Value: Math.round(Math.random() * (max - min)) + min,
        });
    };

    return data.concat(dataForSize);
}, []);


const db = new PngDBWriter();
db.addField('Value', FieldTypes.INTEGER, { buckets: { count } });
data.forEach(record => db.addRecord(record));
db.save('./data/iqr.json');
