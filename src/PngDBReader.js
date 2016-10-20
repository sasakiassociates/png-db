import FieldTypes from "./FieldTypes";
import PngDB from "./PngDB";

// var getPixels = require("get-pixels");

'use strict';
/**
 * Node.js class for writing databases
 */
export default class PngDBReader extends PngDB {

    constructor() {
        super();
        this.url = null;
        this.cacheTime = new Date().getTime();
    }

    _getDir(url) {
        var bits = url.split('/');
        bits.pop();
        return bits.join('/');
    }

    _getJSON(url) {
        var xhr = new XMLHttpRequest();
        return new Promise((resolve, reject) => {
            xhr.onreadystatechange = function () {
                if (xhr.readyState === 4) {
                    if (xhr.status === 200) {
                        resolve(JSON.parse(xhr.responseText));
                    } else {
                        reject(xhr.responseText);
                    }
                }
            };
            xhr.open('GET', url);
            xhr.send();
        });
    }

    load(url) {
        this.url = url;
        return new Promise((resolve, reject) => {
            this._getJSON(url).then((data) => {
                this.metadata = data.metadata;
                this.fields = data.fields;
                this.imageSize = data.imageSize;
                this.records = [];
                for (var i = 0; i < data.recordCount; i++) {
                    this.records.push({});//empty for now, but will be populated when fields are loaded
                }
                resolve();
            }, function (err) {
                reject(err);
            })
        });
    }

    loadImagePixels(url, cb) {
        var img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = function () {
            var canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            var context = canvas.getContext('2d');
            context.drawImage(img, 0, 0);
            var imageData = context.getImageData(0, 0, img.width, img.height);
            cb(null, imageData.data);// ndarray(new Uint8Array(pixels.data), [img.width, img.height, 4], [4, 4*img.width, 1], 0))
        };
        img.onerror = function (err) {
            cb(err)
        };
        console.log('Loading Image: ' + url);
        img.src = url;
    }

    loadFields(fieldNames, forceRefresh) {
        return new Promise((resolve, reject) => {
            var calls = [];
            fieldNames.forEach((fieldName, i) => {
                calls.push(this.loadField(fieldName, forceRefresh));
            });
            Promise.all(calls)
                .then(function (results) {
                    resolve();
                });
        });
    }

    loadField(fieldName, forceRefresh) {
        if (!this.url) throw 'Please load the database first';
        var field = this.fields[fieldName];
        if (!field) throw 'Unknown field ' + fieldName;

        var dir = this._getDir(this.url);
        return new Promise((resolve, reject) => {
            if (field.dataLoaded && !forceRefresh) {
                resolve();
                return;
            }
            if (field.type === FieldTypes.KEY.name) {
                this._getJSON(`${dir}/${encodeURIComponent(fieldName)}.json`).then((data) => {
                    for (var i = 0; i < this.records.length; i++) {
                        this.records[i][fieldName] = data[i];
                    }
                    field.dataLoaded = true;
                    resolve();
                }, function (err) {
                    reject(err);
                });
                return;
            }
            this.loadImagePixels(`${dir}/${encodeURIComponent(fieldName)}.png?ac=${this.cacheTime}`, (err, pixels) => {
                if (err) {
                    reject("Bad image path: " + err);
                    return;
                }
                field.dataLoaded = true;
                for (var i = 0; i < this.records.length; i++) {
                    var pos = i * 4;
                    var r = pixels[pos];
                    var g = pixels[pos + 1];
                    var b = pixels[pos + 2];
                    // var a = pixels[pos + 3];
                    var val = r << 16 | g << 8 | b;

                    if (field.uniqueValues) {
                        val = field.uniqueValues[val];
                    } else {
                        if (field.precision) {
                            val /= field.precision;
                        }

                        if (field.range) {
                            val += field.range.min;// we store the offset from the min value for smaller integers and also to allow signed values with the same methodology
                        }
                    }

                    this.records[i][fieldName] = val;
                }
                resolve();
            })
        });
    }

    loadAllRecordsFromJson(url) {
        this.url = url;
        return new Promise((resolve, reject) => {
            this._getJSON(url).then((data) => {
                this.metadata = data.metadata;
                this.fields = data.fields;
                this.records = data.records;

                Object.keys(this.fields).forEach((fieldName) => {
                    var field = this.fields[fieldName];
                    field.dataLoaded = true;
                });
                resolve();
            }, function (err) {
                reject(err);
            })
        });
    }
}