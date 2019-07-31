import fs from 'fs';
import path from 'path';
import Jimp from 'jimp';

import PngDB from "./PngDB";
import FieldTypes from "./FieldTypes";

'use strict';

const isVal = x => typeof x !== 'undefined' && x !== null && !isNaN(x);


/**
 * Node.js class for writing databases
 */
export default class PngDBWriter extends PngDB {

    constructor({quantiles = 0} = {}) {
        super();

        this.MAX_VALUE = 255 * 256 * 256 - 1;
        this.stats = {
            quantiles, //e.g. use 4 for 'quartiles' (25th percentile, 50th percentile etc)
        };
    }

    save(saveAs) {
        try {
            const size = this.records.length;
            const pxSize = Math.ceil(Math.sqrt(size));

            console.log(`Saving ${size} records (width = ${pxSize}) ...`);

            const dir = path.dirname(saveAs);

            if (!fs.existsSync(dir)) {
                console.log(`Making dir ${dir} ...`);
                fs.mkdirSync(dir);
            }

            Object.keys(this.fields).forEach((k) => {
                const field = this.fields[k];
                if (field.type === FieldTypes.TEXT.name) {
                    field.uniqueValues = [];
                }
                if (!FieldTypes.isNumeric(field.type)) return;
                field.range = {min: Number.MAX_VALUE, max: -Number.MAX_VALUE};
            });

            const sortedValues = {};

            this.records.forEach((record, i) => {
                Object.keys(this.fields).forEach((k) => {
                    const field = this.fields[k];
                    let value = record[k];
                    if (this.stats.quantiles > 1 || field.buckets.count > 1) {
                        if (!sortedValues[k]) sortedValues[k] = [];
                        sortedValues[k].push(value);
                    }
                    if (field.range) {
                        if (field.treatAsArray) {
                            if (value && value.length > 0) {
                                for (let j = 0; j < value.length; j++) {
                                    const v = value[j];

                                    if (isVal(v)) {
                                        field.range.min = Math.min(field.range.min, v);
                                        field.range.max = Math.max(field.range.max, v);
                                    }
                                }
                            }
                        } else {
                            if (isVal(value)) {
                                field.range.min = Math.min(field.range.min, value);
                                field.range.max = Math.max(field.range.max, value);
                            }
                        }

                    }
                    if (field.uniqueValues && field.uniqueValues.indexOf(value) < 0) {
                        field.uniqueValues.push(value);
                    }
                });
            });

            let sortNumber = (a, b) => {
                return a - b;
            };

            Object.keys(this.fields).forEach((k) => {
                const field = this.fields[k];
                if (field.range && field.range.max > this.MAX_VALUE) {
                    field.precision = (this.MAX_VALUE - 1) / field.range.max;//use -1 to prevent floating point errors exceeding
                }

                const generateQuantiles = field.range && !field.treatAsArray && this.stats.quantiles > 1;
                const generateBuckets = field.range && !field.treatAsArray && field.buckets.count > 1;

                if (generateQuantiles || generateBuckets) {
                    sortedValues[k].sort(sortNumber);
                }

                if (generateQuantiles) {
                    field.quantiles = [];
                    for (let i = 1; i < this.stats.quantiles; i++) {
                        let frac = i / this.stats.quantiles;
                        let pos = Math.round(frac * sortedValues[k].length);
                        field.quantiles.push({
                            position: 100 * frac,
                            value: sortedValues[k][pos],
                        });
                    }
                }

                if (generateBuckets) {
                    const buckets = [];

                    const min = 'min' in field.buckets ? field.buckets.min : field.range.min;
                    const max = 'max' in field.buckets ? field.buckets.max : field.range.max;
                    const range = max - min;
                    const size = range / field.buckets.count;

                    for (let i = 0; i <= field.buckets.count; i++) {
                        buckets.push({
                            quantity: 0,
                            range: {
                                min: (i * size) + min,
                                max: ((i + 1) * size) + min,
                            }
                        });
                    }

                    const supraMinBucket = {
                        quantity: 0,
                        range: {
                            min: -Infinity,
                            max: min,
                        },
                    };
                    const superMaxBucket = {
                        quantity: 0,
                        range: {
                            min: max,
                            max: Infinity,
                        },
                    };

                    sortedValues[k].forEach(val => {
                        if (val > max) {
                            superMaxBucket.quantity++;
                        }
                        else if (val < min) {
                            supraMinBucket.quantity++;
                        }
                        else {
                            buckets.some((bucket, i) => {
                                if (bucket.range.min >= val && buckets[i - 1]) {
                                    if (buckets[i - 1]) {
                                        buckets[i - 1].quantity++;
                                    }

                                    return true;
                                }
                            });
                        }
                    });

                    // Since we aggregate i - 1 to exclude values below the min, we only needed
                    // the extra bucket for aggregating values into the actual last bucket.
                    buckets.pop();
                    if (supraMinBucket.quantity > 0 || superMaxBucket.quantity > 0) {
                        field.gutterBuckets = {};
                    }
                    if (supraMinBucket.quantity > 0) {
                        field.gutterBuckets.min = supraMinBucket;
                    }
                    if (superMaxBucket.quantity > 0) {
                        field.gutterBuckets.max = superMaxBucket;
                    }

                    field.buckets = buckets;
                }
                else {
                    delete field.buckets;
                }
            });

            const metaDataFile = {
                metadata: this.metadata,
                fields: this.fields,
                recordCount: size,
                imageSize: {width: pxSize, height: pxSize}
            };

            Object.keys(this.fields).forEach((fieldName) => {
                const field = this.fields[fieldName];
                if (field.type === FieldTypes.KEY.name) {
                    this.writeKeyData(dir, fieldName, field);
                } else {
                    this.writePngData(dir, fieldName, field, pxSize);
                }
            });

            fs.writeFile(saveAs, JSON.stringify(metaDataFile, null, 2), (err) => {
                if (err) throw err;
                console.log('Saved ' + saveAs);
            });
        } catch (e) {
            console.error(e, e.stack);//for some reason errors aren't always reported in Node.js so we catch and report them here
        }
    }

    writeKeyData(dir, fieldName, field) {
        const recordKeys = [];
        const fileName = `${fieldName}.json`;
        this.records.forEach(function (record, i) {
            recordKeys.push(record[fieldName]);
        });
        fs.writeFile(path.join(dir, fileName), JSON.stringify(recordKeys), (err) => {
            if (err) throw err;
            console.log('Saved ' + fileName);
        });
    }

    writePngData(dir, fieldName, field, pxSize) {
        let imgSize = pxSize;
        let numTilesEach = 0;
        if (field.treatAsArray) {
            let maxLen = 0;
            for (let i = 0; i < this.records.length; i++) {
                const record = this.records[i++];
                const arr = record[fieldName];

                if (arr != null) {
                    if (!Array.isArray(arr)) {
                        throw `Array value expected on record ${i}: Found ${arr}`;
                    }
                    maxLen = Math.max(maxLen, arr.length);
                }
            }
            field.longestArray = maxLen;
            numTilesEach = Math.ceil(Math.sqrt(maxLen));
            imgSize = pxSize * numTilesEach;
        }

        const setPixel = (image, x, y, value) => {
            if (field.range) {
                value = value - field.range.min;//store the offset from the min value for smaller integers and also to allow signed values with the same methodology
            }
            if (field.precision) {
                value = Math.round(value * field.precision);
            } else {
                value = Math.round(value);
            }
            if (value > this.MAX_VALUE) {
                console.warn(`Maximum value exceeded for ${fieldName}: ${value} (TRUNCATED)`);
                value = this.MAX_VALUE;
            }
            let encodedValue = 0;
            if (value > 255) {
                let r = 0;
                const b = value % 256;
                let g = Math.floor(value / 256);

                if (g > 255) {
                    r = Math.floor(g / 256);
                    g = g % 256;
                }
                encodedValue = Jimp.rgbaToInt(r, g, b, 255);
            } else {
                encodedValue = Jimp.rgbaToInt(0, 0, value, 255);
            }
            image.setPixelColor(encodedValue, x, y);
        };

        new Jimp(imgSize, imgSize, (err, image) => {
            if (field.treatAsArray) {

                let i = 0;
                for (let y = 0; y < pxSize; y++) {
                    for (let x = 0; x < pxSize; x++) {
                        const record = this.records[i++];
                        if (!record) continue;
                        const arr = record[fieldName];
                        if (!arr) return;
                        let a = 0;
                        for (let ty = 0; ty < numTilesEach; ty++) {
                            for (let tx = 0; tx < numTilesEach; tx++) {
                                if (a < arr.length) {
                                    const value = arr[a];
                                    if (isVal(value)) {
                                        setPixel(image, tx * pxSize + x, ty * pxSize + y, value);
                                    }
                                }
                                a++;
                            }
                        }
                    }
                }
            } else {
                let i = 0;
                for (let y = 0; y < pxSize; y++) {
                    for (let x = 0; x < pxSize; x++) {
                        const record = this.records[i++];
                        if (!record) continue;
                        let value = 0;
                        if (field.uniqueValues) {
                            value = field.uniqueValues.indexOf(record[fieldName]);
                        } else {
                            value = record[fieldName];
                        }

                        if (isVal(value)) {
                            setPixel(image, x, y, value);
                        }
                    }
                }
            }
            const fileName = `${fieldName}.png`;
            image.write(path.join(dir, fileName));
            console.log(`${fileName} saved`);
        });
    }

    /**
     * Use this method to provide an alternative way to load and save data (as JSON)
     * @param saveAs
     */
    saveAllRecordsAsJson(saveAs) {
        const fullDataFile = {
            metadata: this.metadata,
            fields: this.fields,
            records: this.records
        };

        fs.writeFile(saveAs, JSON.stringify(fullDataFile, null, 2), (err) => {
            if (err) throw err;
            console.log('Saved ' + saveAs);
        });
    }

}
