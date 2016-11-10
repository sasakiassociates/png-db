var fs = require("fs");
var path = require("path");
import FieldTypes from "./FieldTypes";
import PngDB from "./PngDB";

'use strict';
/**
 * Node.js class for writing databases
 */
export default class PngDBWriter extends PngDB {

    constructor({quantiles = 0} = {}) {
        super();

        this.MAX_VALUE = 255 * 256 * 256 - 1;
        this.stats = {
            quantiles: quantiles//e.g. use 4 for 'quartiles' (25th percentile, 50th percentile etc)
        };
    }

    save(saveAs) {
        try {
            var size = this.records.length;
            var pxSize = Math.ceil(Math.sqrt(size));

            console.log(`Saving ${size} records (width = ${pxSize}) ...`);

            var dir = path.dirname(saveAs);

            if (!fs.existsSync(dir)){
                console.log(`Making dir ${dir} ...`);
                fs.mkdirSync(dir);
            }


            Object.keys(this.fields).forEach((k) => {
                var field = this.fields[k];
                if (field.type === FieldTypes.TEXT.name) {
                    field.uniqueValues = [];
                }
                if (!FieldTypes.isNumeric(field.type)) return;
                field.range = {min: Number.MAX_VALUE, max: -Number.MAX_VALUE};
            });

            var sortedValues = {};

            this.records.forEach((record, i) => {
                Object.keys(this.fields).forEach((k) => {
                    var field = this.fields[k];
                    var value = record[k];
                    if (this.stats.quantiles > 1) {
                        if (!sortedValues[k]) sortedValues[k] = [];
                        sortedValues[k].push(value);
                    }
                    if (field.range) {
                        if (typeof value !== "undefined") {
                            field.range.min = Math.min(field.range.min, value);
                            field.range.max = Math.max(field.range.max, value);
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
                var field = this.fields[k];
                if (field.range && field.range.max > this.MAX_VALUE) {
                    field.precision = (this.MAX_VALUE - 1) / field.range.max;//use -1 to prevent floating point errors exceeding
                }

                if (field.range && this.stats.quantiles > 1) {
                    sortedValues[k].sort(sortNumber);
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
            });

            var metaDataFile = {
                metadata: this.metadata,
                fields: this.fields,
                recordCount: size,
                imageSize: {width: pxSize, height: pxSize}
            };

            fs.writeFile(saveAs, JSON.stringify(metaDataFile, null, 2), (err) => {
                if (err) throw err;
                console.log('Saved ' + saveAs);
            });

            Object.keys(this.fields).forEach((fieldName) => {
                var field = this.fields[fieldName];
                if (field.type === FieldTypes.KEY.name) {
                    this.writeKeyData(dir, fieldName, field);
                } else {
                    this.writePngData(dir, fieldName, field, pxSize);
                }
            });
        } catch (e) {
            console.error(e, e.stack);//for some reason errors aren't always reported in Node.js so we catch and report them here
        }
    }

    writeKeyData(dir, fieldName, field) {
        var recordKeys = [];
        var fileName = `${fieldName}.json`;
        this.records.forEach(function (record, i) {
            recordKeys.push(record[fieldName]);
        });
        fs.writeFile(path.join(dir, fileName), JSON.stringify(recordKeys), (err) => {
            if (err) throw err;
            console.log('Saved ' + fileName);
        });
    }

    writePngData(dir, fieldName, field, pxSize) {
        var Jimp = require("jimp");
        new Jimp(pxSize, pxSize, (err, image) => {
            var i = 0;
            for (var y = 0; y < pxSize; y++) {
                for (var x = 0; x < pxSize; x++) {
                    var record = this.records[i++];
                    if (record) {
                        var value = 0;
                        if (field.uniqueValues) {
                            value = field.uniqueValues.indexOf(record[fieldName]);
                        } else {
                            value = record[fieldName]
                        }
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
                        var encodedValue = 0;
                        if (value > 255) {
                            var r = 0;
                            var b = value % 256;
                            var g = Math.floor(value / 256);

                            if (g > 255) {
                                r = Math.floor(g / 256);
                                g = g % 256;
                            }
                            encodedValue = Jimp.rgbaToInt(r, g, b, 255);
                        } else {
                            encodedValue = Jimp.rgbaToInt(0, 0, value, 255);
                        }
                        image.setPixelColor(encodedValue, x, y);
                    }
                }
            }
            var fileName = `${fieldName}.png`;
            image.write(path.join(dir, fileName));
            console.log(`${fileName} saved`);
        });
    }

    /**
     * Use this method to provide an alternative way to load and save data (as JSON)
     * @param saveAs
     */
    saveAllRecordsAsJson(saveAs) {
        var fullDataFile = {
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