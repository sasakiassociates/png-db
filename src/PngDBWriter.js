var fs = require("fs");
var path = require("path");
import FieldTypes from "./FieldTypes";
import PngDB from "./PngDB";

'use strict';
/**
 * Node.js class for writing databases
 */
export default class PngDBWriter extends PngDB {

    constructor() {
        super();

        this.MAX_VALUE = 256 * 256 * 256 - 1;
    }

    save(saveAs) {
        var size = this.records.length;
        var pxSize = Math.ceil(Math.sqrt(size));

        var dir = path.dirname(saveAs);

        console.log(`Saving ${size} records (width = ${pxSize})`);

        Object.keys(this.fields).forEach((k) => {
            var field = this.fields[k];
            if (field.type === FieldTypes.TEXT.name) {
                field.uniqueValues = [];
            }
            if (!FieldTypes.isNumeric(field.type)) return;
            field.range = {min: Number.MAX_VALUE, max: -Number.MAX_VALUE};
        });

        this.records.forEach((record, i) => {
            Object.keys(this.fields).forEach((k) => {
                var field = this.fields[k];
                var value = record[k];
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

        Object.keys(this.fields).forEach((k) => {
            var field = this.fields[k];
            if (field.range.max > this.MAX_VALUE) {
                field.precision = (this.MAX_VALUE - 1) / field.range.max;//use -1 to prevent floating point errors exceeding
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
                            throw 'Maximum value exceeded for ' + fieldName + ': ' + value;
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