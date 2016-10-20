var fs = require("fs");
import FieldTypes from "./FieldTypes";
import PngDB from "./PngDB";

'use strict';
/**
 * Node.js class for writing databases
 */
export default class PngDBWriter extends PngDB {

    constructor() {
        super();
    }

    save(saveAs) {
        var size = this.records.length;
        var pxSize = Math.ceil(Math.sqrt(size));

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
                this.writeKeyData(fieldName, field);
            } else {
                this.writePngData(fieldName, field, pxSize);
            }
        });
    }

    writeKeyData(fieldName, field) {
        var recordKeys = [];
        var fileName = `${fieldName}.json`;
        this.records.forEach(function (record, i) {
            recordKeys.push(record[fieldName]);
        });
        fs.writeFile(fileName, JSON.stringify(recordKeys), (err) => {
            if (err) throw err;
            console.log('Saved ' + fileName);
        });
    }

    writePngData(fieldName, field, pxSize) {
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
                        }
                        var encodedValue = 0;
                        if (value > 255) {
                            var b = value % 256;
                            var g = Math.floor(value / 256);
                            //TODO support third channel (red)
                            //TODO resolve alpha channel
                            //Using anything other than 255 for alpha can cause weird behavior when reading values back - we may have to settle for just 3 channels
                            //Maybe the alpha channel becomes the way to specify NULL vs ZERO?
                            // if (i < 10) {
                            //     console.log(`${fieldName} ${i}: 0,${g},${b} from ${value}`);
                            // }
                            encodedValue = Jimp.rgbaToInt(0, g, b, 255);
                        } else {
                            encodedValue = Jimp.rgbaToInt(0, 0, value, 255);
                        }
                        image.setPixelColor(encodedValue, x, y);
                    }
                }
            }
            var fileName = `${fieldName}.png`;
            image.write(fileName);
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