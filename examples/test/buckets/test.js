const { PngDBWriter, FieldTypes } = require('../../../versions/node/dist/png-db');

const sizes = [15, 3, 5, 12, 2, 7];
const buckets = {
    count: sizes.length,
    min: 50,
    max: 250,
}
const bucketSize = (buckets.max - buckets.min) / sizes.length;

const data = sizes.reduce((data, size, i) => {
    const dataForSize = [];

    const min = (i * bucketSize) + buckets.min;
    const max = min + bucketSize;

    for (let i = 0; i < size; i++) {
        dataForSize.push({
            Value: Math.round(Math.random() * (max - min)) + min,
        });
    };

    return data.concat(dataForSize);
}, []);


// Add some out-of-bounds data
data.push({ Value: 10 });
data.push({ Value: 30 });
data.push({ Value: 20 });

data.push({ Value: 1000 });
data.push({ Value: 280 });
data.push({ Value: 305 });
data.push({ Value: 315 });

const db = new PngDBWriter({ buckets });
db.addField('Value', FieldTypes.INTEGER);
data.forEach(record => db.addRecord(record));
db.save('./data/buckets.json');
