const { PngDBWriter, FieldTypes } = require('../../../versions/node/dist/png-db');

const sizes = [5, 3, 5, 2, 2, 7];
const buckets = {
    count: sizes.length,
    min: 0,
    max: 300,
}
const bucketSize = Math.floor((buckets.max - buckets.min) / sizes.length);

const data = sizes.reduce((data, size, i) => {
    const dataForSize = [];

    const min = (i * bucketSize) + buckets.min;
    const max = min + bucketSize;

    for (let i = 0; i < size; i++) {
        dataForSize.push({
            Value: Math.floor(Math.random() * (max - min)) + min,
        });
    };

    return data.concat(dataForSize);
}, []);

const db = new PngDBWriter({ buckets });
db.addField('Value', FieldTypes.INTEGER);
data.forEach(record => db.addRecord(record));
db.save('./data/buckets.json');
