'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var fs = _interopDefault(require('fs'));
var path = _interopDefault(require('path'));
var Jimp = _interopDefault(require('jimp'));

var asyncGenerator = function () {
  function AwaitValue(value) {
    this.value = value;
  }

  function AsyncGenerator(gen) {
    var front, back;

    function send(key, arg) {
      return new Promise(function (resolve, reject) {
        var request = {
          key: key,
          arg: arg,
          resolve: resolve,
          reject: reject,
          next: null
        };

        if (back) {
          back = back.next = request;
        } else {
          front = back = request;
          resume(key, arg);
        }
      });
    }

    function resume(key, arg) {
      try {
        var result = gen[key](arg);
        var value = result.value;

        if (value instanceof AwaitValue) {
          Promise.resolve(value.value).then(function (arg) {
            resume("next", arg);
          }, function (arg) {
            resume("throw", arg);
          });
        } else {
          settle(result.done ? "return" : "normal", result.value);
        }
      } catch (err) {
        settle("throw", err);
      }
    }

    function settle(type, value) {
      switch (type) {
        case "return":
          front.resolve({
            value: value,
            done: true
          });
          break;

        case "throw":
          front.reject(value);
          break;

        default:
          front.resolve({
            value: value,
            done: false
          });
          break;
      }

      front = front.next;

      if (front) {
        resume(front.key, front.arg);
      } else {
        back = null;
      }
    }

    this._invoke = send;

    if (typeof gen.return !== "function") {
      this.return = undefined;
    }
  }

  if (typeof Symbol === "function" && Symbol.asyncIterator) {
    AsyncGenerator.prototype[Symbol.asyncIterator] = function () {
      return this;
    };
  }

  AsyncGenerator.prototype.next = function (arg) {
    return this._invoke("next", arg);
  };

  AsyncGenerator.prototype.throw = function (arg) {
    return this._invoke("throw", arg);
  };

  AsyncGenerator.prototype.return = function (arg) {
    return this._invoke("return", arg);
  };

  return {
    wrap: function (fn) {
      return function () {
        return new AsyncGenerator(fn.apply(this, arguments));
      };
    },
    await: function (value) {
      return new AwaitValue(value);
    }
  };
}();

var classCallCheck = function (instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
};

var createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();

var _extends = Object.assign || function (target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i];

    for (var key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
  }

  return target;
};

var inherits = function (subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
  }

  subClass.prototype = Object.create(superClass && superClass.prototype, {
    constructor: {
      value: subClass,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
  if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
};

var possibleConstructorReturn = function (self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }

  return call && (typeof call === "object" || typeof call === "function") ? call : self;
};

var FieldTypes = function () {
  function FieldTypes(name) {
    classCallCheck(this, FieldTypes);

    this.name = name;
  }

  createClass(FieldTypes, [{
    key: 'toString',
    value: function toString() {
      return 'FieldTypes.' + this.name;
    }
  }], [{
    key: 'isNumeric',
    value: function isNumeric(name) {
      return name === FieldTypes.INTEGER.name || name === FieldTypes.DECIMAL.name;
    }
  }]);
  return FieldTypes;
}();

/**
 * KEY values are stored as a flat JSON array with no compression. Use sparingly.
 * @type {FieldTypes}
 */


FieldTypes.KEY = new FieldTypes('KEY');

/**
 * TEXT values are stored as indexed values using an integer. The index (text strings for each integer) is stored in the main json file. Don't use this for primary keys or other values that don't repeat much.
 * @type {FieldTypes}
 */
FieldTypes.TEXT = new FieldTypes('TEXT');

/**
 * decimals are stored as integers representing the offset minimum value for each field and a multiplier for precision
 * @type {FieldTypes}
 */
FieldTypes.DECIMAL = new FieldTypes('DECIMAL');

/**
 * (3 bytes) up to 16,777,215 values
 * @type {FieldTypes}
 */
FieldTypes.INTEGER = new FieldTypes('INTEGER');

/**
 * Node.js class for writing databases
 */

var PngDB = function () {
    function PngDB() {
        classCallCheck(this, PngDB);

        this.fields = {};
        this.metadata = {};
        this.records = [];
    }

    /**
     * Add a field to the database
     * @param {String} fieldName (any string)
     * @param {FieldTypes} type
     * @param {Object} [opts] - field options
     */


    createClass(PngDB, [{
        key: 'addField',
        value: function addField(fieldName, type) {
            var opts = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

            var ft = new FieldTypes();
            this.fields[fieldName] = { type: type.name };

            this.fields[fieldName].buckets = _extends({
                count: 0
            }, opts.buckets);

            if ('precision' in opts) {
                this.fields[fieldName].precision = opts.precision;
            }
        }

        /**
         * Add an Array field to the database. Arrays are represented as a large images tiled together.
         * @param {String} fieldName (any string)
         * @param {FieldTypes} type
         * @param {Object} [opts] - field options
         */

    }, {
        key: 'addArrayField',
        value: function addArrayField(fieldName, type) {
            var opts = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

            this.addField(fieldName, type, opts);
            this.fields[fieldName].treatAsArray = true;
        }

        /**
         * add any metadata to be stored as JSON
         * @param {String} key
         * @param {Object} value
         */

    }, {
        key: 'addMetaData',
        value: function addMetaData(key, value) {
            this.metadata[key] = value;
        }

        /**
         * add a record object - object properties must match field names exactly
         * @param {Object} record
         */

    }, {
        key: 'addRecord',
        value: function addRecord(record) {
            // console.log('Add record');
            this.records.push(record);
        }
    }, {
        key: '_shiftBits',
        value: function _shiftBits(number, columns) {
            if (!number) number = 0;
            if (columns === 0) return number;
            if (columns === 1) return number << 8;
            if (columns === 2) return number << 16;
            if (columns === 3) return number << 32;
        }
    }, {
        key: '_encodeFields',
        value: function _encodeFields(record, field1, field2) {
            //(0x6633 << 16 | 0x3399).toString(16)
            return this._shiftBits(record[field1], 2) | record[field2];
        }
    }]);
    return PngDB;
}();

/**
 * Node.js class for writing databases
 */

var PngDBReader = function (_PngDB) {
    inherits(PngDBReader, _PngDB);

    function PngDBReader() {
        classCallCheck(this, PngDBReader);

        var _this = possibleConstructorReturn(this, (PngDBReader.__proto__ || Object.getPrototypeOf(PngDBReader)).call(this));

        _this.url = null;
        _this.cacheTime = new Date().getTime();
        return _this;
    }

    createClass(PngDBReader, [{
        key: "_getDir",
        value: function _getDir(url) {
            var bits = url.split('/');
            bits.pop();
            return bits.join('/');
        }
    }, {
        key: "_getJSON",
        value: function _getJSON(url) {
            var xhr = new XMLHttpRequest();
            return new Promise(function (resolve, reject) {
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
    }, {
        key: "load",
        value: function load(url) {
            var _this2 = this;

            this.url = url;
            return new Promise(function (resolve, reject) {
                _this2._getJSON(url).then(function (data) {
                    _this2.metadata = data.metadata;
                    _this2.fields = data.fields;
                    _this2.imageSize = data.imageSize;
                    _this2.records = [];
                    for (var i = 0; i < data.recordCount; i++) {
                        _this2.records.push({}); //empty for now, but will be populated when fields are loaded
                    }
                    resolve();
                }, function (err) {
                    reject(err);
                });
            });
        }
    }, {
        key: "loadImagePixels",
        value: function loadImagePixels(url, cb) {
            var img = new Image();
            img.crossOrigin = "Anonymous";
            img.onload = function () {
                var canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                var context = canvas.getContext('2d');
                context.drawImage(img, 0, 0);
                var imageData = context.getImageData(0, 0, img.width, img.height);
                cb(null, imageData.data); // ndarray(new Uint8Array(pixels.data), [img.width, img.height, 4], [4, 4*img.width, 1], 0))
            };
            img.onerror = function (err) {
                cb(err);
            };
            console.log('Loading Image: ' + url);
            img.src = url;
        }
    }, {
        key: "loadFields",
        value: function loadFields(fieldNames, forceRefresh) {
            var _this3 = this;

            return new Promise(function (resolve, reject) {
                var calls = [];
                fieldNames.forEach(function (fieldName, i) {
                    calls.push(_this3.loadField(fieldName, forceRefresh));
                });
                Promise.all(calls).then(function (results) {
                    resolve();
                });
            });
        }
    }, {
        key: "loadField",
        value: function loadField(fieldName, forceRefresh) {
            var _this4 = this;

            if (!this.url) throw 'Please load the database first';
            var field = this.fields[fieldName];
            if (!field) throw 'Unknown field ' + fieldName;

            var dir = this._getDir(this.url);
            return new Promise(function (resolve, reject) {
                if (field.dataLoaded && !forceRefresh) {
                    resolve();
                    return;
                }
                if (field.type === FieldTypes.KEY.name) {
                    _this4._getJSON(dir + "/" + encodeURIComponent(fieldName) + ".json").then(function (data) {
                        for (var i = 0; i < _this4.records.length; i++) {
                            _this4.records[i][fieldName] = data[i];
                        }
                        field.dataLoaded = true;
                        resolve();
                    }, function (err) {
                        reject(err);
                    });
                    return;
                }
                _this4.loadImagePixels(dir + "/" + encodeURIComponent(fieldName) + ".png?ac=" + _this4.cacheTime, function (err, pixels) {
                    if (err) {
                        reject("Bad image path: " + err);
                        return;
                    }

                    var valFromPixel = function valFromPixel(pos) {
                        var a = pixels[pos + 3];
                        if (a === 0) return null;

                        var r = pixels[pos];
                        var g = pixels[pos + 1];
                        var b = pixels[pos + 2];

                        var val = r << 16 | g << 8 | b;

                        if (field.uniqueValues) {
                            val = field.uniqueValues[val];
                        } else {
                            if (field.precision) {
                                val /= field.precision;
                            }

                            if (field.range) {
                                val += field.range.min; // we store the offset from the min value for smaller integers and also to allow signed values with the same methodology
                            }
                        }
                        return val;
                    };

                    field.dataLoaded = true;
                    var val = null;
                    if (field.treatAsArray) {
                        var numTilesEach = Math.ceil(Math.sqrt(field.longestArray));
                        var pxSize = _this4.imageSize.width;
                        var imgSize = pxSize * numTilesEach;
                        var i = 0;
                        for (var y = 0; y < pxSize; y++) {
                            for (var x = 0; x < pxSize; x++) {
                                var arr = [];
                                for (var ty = 0; ty < numTilesEach; ty++) {
                                    for (var tx = 0; tx < numTilesEach; tx++) {
                                        var xPos = tx * pxSize + x;
                                        var yPos = ty * pxSize + y;
                                        var pos = yPos * (imgSize * 4) + xPos * 4;

                                        var _val = valFromPixel(pos);
                                        if (_val !== null) {
                                            arr.push(_val);
                                        }
                                    }
                                }
                                if (i < _this4.records.length) {
                                    _this4.records[i][fieldName] = arr;
                                }
                                i++;
                            }
                        }
                    } else {
                        for (var _i = 0; _i < _this4.records.length; _i++) {
                            var _pos = _i * 4;
                            val = valFromPixel(_pos);
                            _this4.records[_i][fieldName] = val;
                        }
                    }

                    resolve();
                });
            });
        }
    }, {
        key: "loadAllRecordsFromJson",
        value: function loadAllRecordsFromJson(url) {
            var _this5 = this;

            this.url = url;
            return new Promise(function (resolve, reject) {
                _this5._getJSON(url).then(function (data) {
                    _this5.metadata = data.metadata;
                    _this5.fields = data.fields;
                    _this5.records = data.records;

                    Object.keys(_this5.fields).forEach(function (fieldName) {
                        var field = _this5.fields[fieldName];
                        field.dataLoaded = true;
                    });
                    resolve();
                }, function (err) {
                    reject(err);
                });
            });
        }
    }]);
    return PngDBReader;
}(PngDB);

var isVal = function isVal(x) {
    return typeof x !== 'undefined' && x !== null && !isNaN(x);
};

/**
 * Node.js class for writing databases
 */

var PngDBWriter = function (_PngDB) {
    inherits(PngDBWriter, _PngDB);

    function PngDBWriter() {
        var _ref = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

        var _ref$quantiles = _ref.quantiles;
        var quantiles = _ref$quantiles === undefined ? 0 : _ref$quantiles;
        classCallCheck(this, PngDBWriter);

        var _this = possibleConstructorReturn(this, (PngDBWriter.__proto__ || Object.getPrototypeOf(PngDBWriter)).call(this));

        _this.MAX_VALUE = 255 * 256 * 256 - 1;
        _this.stats = {
            quantiles: quantiles };
        return _this;
    }

    createClass(PngDBWriter, [{
        key: 'save',
        value: function save(saveAs) {
            var _this2 = this;

            try {
                (function () {
                    var size = _this2.records.length;
                    var pxSize = Math.ceil(Math.sqrt(size));

                    console.log('Saving ' + size + ' records (width = ' + pxSize + ') ...');

                    var dir = path.dirname(saveAs);

                    if (!fs.existsSync(dir)) {
                        console.log('Making dir ' + dir + ' ...');
                        fs.mkdirSync(dir);
                    }

                    Object.keys(_this2.fields).forEach(function (k) {
                        var field = _this2.fields[k];
                        if (field.type === FieldTypes.TEXT.name) {
                            field.uniqueValues = [];
                        }
                        if (!FieldTypes.isNumeric(field.type)) return;
                        field.range = { min: Number.MAX_VALUE, max: -Number.MAX_VALUE };
                    });

                    var sortedValues = {};

                    _this2.records.forEach(function (record, i) {
                        Object.keys(_this2.fields).forEach(function (k) {
                            var field = _this2.fields[k];
                            var value = record[k];
                            if (_this2.stats.quantiles > 1 || field.buckets.count > 1) {
                                if (!sortedValues[k]) sortedValues[k] = [];
                                sortedValues[k].push(value);
                            }
                            if (field.range) {
                                if (field.treatAsArray) {
                                    if (value && value.length > 0) {
                                        for (var j = 0; j < value.length; j++) {
                                            var v = value[j];

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

                    var sortNumber = function sortNumber(a, b) {
                        return a - b;
                    };

                    Object.keys(_this2.fields).forEach(function (k) {
                        var field = _this2.fields[k];
                        if (field.range && field.range.max > _this2.MAX_VALUE) {
                            field.precision = (_this2.MAX_VALUE - 1) / field.range.max; //use -1 to prevent floating point errors exceeding
                        }

                        var generateQuantiles = field.range && !field.treatAsArray && _this2.stats.quantiles > 1;
                        var generateBuckets = field.range && !field.treatAsArray && field.buckets.count > 1;

                        if (generateQuantiles || generateBuckets) {
                            sortedValues[k].sort(sortNumber);
                        }

                        if (generateQuantiles) {
                            field.quantiles = [];
                            for (var i = 1; i < _this2.stats.quantiles; i++) {
                                var frac = i / _this2.stats.quantiles;
                                var pos = Math.round(frac * sortedValues[k].length);
                                field.quantiles.push({
                                    position: 100 * frac,
                                    value: sortedValues[k][pos]
                                });
                            }
                        }

                        if (generateBuckets) {
                            (function () {
                                var buckets = [];

                                var min = 'min' in field.buckets ? field.buckets.min : field.range.min;
                                var max = 'max' in field.buckets ? field.buckets.max : field.range.max;

                                /*
                                if (!('min' in field.buckets && 'max' in field.buckets)) {
                                    let data = sortedValues[k];
                                    if ('min' in field.buckets || 'max' in field.buckets) {
                                        data =  sortedValues[k].filter(val => min <= val && max)
                                    }
                                     const median = data[Math.round(data.length * .5)];
                                    const mean = data.reduce((a,b) => a + b, 0) / data.length;
                                     console.log(median, mean, Math.abs((median - mean) / median));
                                     const twentyFifth = Math.round(data.length * .25);
                                    const seventyFifth = Math.round(data.length * .75);
                                }
                                */

                                var range = max - min;
                                var size = range / field.buckets.count;

                                for (var _i = 0; _i <= field.buckets.count; _i++) {
                                    buckets.push({
                                        quantity: 0,
                                        range: {
                                            min: _i * size + min,
                                            max: (_i + 1) * size + min
                                        }
                                    });
                                }

                                var underflow = {
                                    quantity: 0,
                                    range: {
                                        min: -Infinity,
                                        max: min
                                    }
                                };
                                var overflow = {
                                    quantity: 0,
                                    range: {
                                        min: max,
                                        max: Infinity
                                    }
                                };

                                sortedValues[k].forEach(function (val) {
                                    if (val > max) {
                                        overflow.quantity++;
                                    } else if (val < min) {
                                        underflow.quantity++;
                                    } else {
                                        buckets.some(function (bucket, i) {
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
                                if (underflow.quantity > 0 || overflow.quantity > 0) {
                                    field.gutterBuckets = {};
                                }
                                if (underflow.quantity > 0) {
                                    field.underflow = underflow;
                                }
                                if (overflow.quantity > 0) {
                                    field.overflow = overflow;
                                }

                                field.buckets = buckets;
                            })();
                        } else {
                            delete field.buckets;
                        }
                    });

                    var metaDataFile = {
                        metadata: _this2.metadata,
                        fields: _this2.fields,
                        recordCount: size,
                        imageSize: { width: pxSize, height: pxSize }
                    };

                    Object.keys(_this2.fields).forEach(function (fieldName) {
                        var field = _this2.fields[fieldName];
                        if (field.type === FieldTypes.KEY.name) {
                            _this2.writeKeyData(dir, fieldName, field);
                        } else {
                            _this2.writePngData(dir, fieldName, field, pxSize);
                        }
                    });

                    fs.writeFile(saveAs, JSON.stringify(metaDataFile, null, 2), function (err) {
                        if (err) throw err;
                        console.log('Saved ' + saveAs);
                    });
                })();
            } catch (e) {
                console.error(e, e.stack); //for some reason errors aren't always reported in Node.js so we catch and report them here
            }
        }
    }, {
        key: 'writeKeyData',
        value: function writeKeyData(dir, fieldName, field) {
            var recordKeys = [];
            var fileName = fieldName + '.json';
            this.records.forEach(function (record, i) {
                recordKeys.push(record[fieldName]);
            });
            fs.writeFile(path.join(dir, fileName), JSON.stringify(recordKeys), function (err) {
                if (err) throw err;
                console.log('Saved ' + fileName);
            });
        }
    }, {
        key: 'writePngData',
        value: function writePngData(dir, fieldName, field, pxSize) {
            var _this3 = this;

            var imgSize = pxSize;
            var numTilesEach = 0;
            if (field.treatAsArray) {
                var maxLen = 0;
                for (var i = 0; i < this.records.length; i++) {
                    var record = this.records[i++];
                    var arr = record[fieldName];

                    if (arr != null) {
                        if (!Array.isArray(arr)) {
                            throw 'Array value expected on record ' + i + ': Found ' + arr;
                        }
                        maxLen = Math.max(maxLen, arr.length);
                    }
                }
                field.longestArray = maxLen;
                numTilesEach = Math.ceil(Math.sqrt(maxLen));
                imgSize = pxSize * numTilesEach;
            }

            var setPixel = function setPixel(image, x, y, value) {
                if (field.range) {
                    value = value - field.range.min; //store the offset from the min value for smaller integers and also to allow signed values with the same methodology
                }
                if (field.precision) {
                    value = Math.round(value * field.precision);
                } else {
                    value = Math.round(value);
                }
                if (value > _this3.MAX_VALUE) {
                    console.warn('Maximum value exceeded for ' + fieldName + ': ' + value + ' (TRUNCATED)');
                    value = _this3.MAX_VALUE;
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
            };

            new Jimp(imgSize, imgSize, function (err, image) {
                if (field.treatAsArray) {

                    var _i2 = 0;
                    for (var y = 0; y < pxSize; y++) {
                        for (var x = 0; x < pxSize; x++) {
                            var _record = _this3.records[_i2++];
                            if (!_record) continue;
                            var _arr = _record[fieldName];
                            if (!_arr) return;
                            var a = 0;
                            for (var ty = 0; ty < numTilesEach; ty++) {
                                for (var tx = 0; tx < numTilesEach; tx++) {
                                    if (a < _arr.length) {
                                        var value = _arr[a];
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
                    var _i3 = 0;
                    for (var _y = 0; _y < pxSize; _y++) {
                        for (var _x2 = 0; _x2 < pxSize; _x2++) {
                            var _record2 = _this3.records[_i3++];
                            if (!_record2) continue;
                            var _value = 0;
                            if (field.uniqueValues) {
                                _value = field.uniqueValues.indexOf(_record2[fieldName]);
                            } else {
                                _value = _record2[fieldName];
                            }

                            if (isVal(_value)) {
                                setPixel(image, _x2, _y, _value);
                            }
                        }
                    }
                }
                var fileName = fieldName + '.png';
                image.write(path.join(dir, fileName));
                console.log(fileName + ' saved');
            });
        }

        /**
         * Use this method to provide an alternative way to load and save data (as JSON)
         * @param saveAs
         */

    }, {
        key: 'saveAllRecordsAsJson',
        value: function saveAllRecordsAsJson(saveAs) {
            var fullDataFile = {
                metadata: this.metadata,
                fields: this.fields,
                records: this.records
            };

            fs.writeFile(saveAs, JSON.stringify(fullDataFile, null, 2), function (err) {
                if (err) throw err;
                console.log('Saved ' + saveAs);
            });
        }
    }]);
    return PngDBWriter;
}(PngDB);

exports.PngDBReader = PngDBReader;
exports.PngDBWriter = PngDBWriter;
exports.FieldTypes = FieldTypes;
//# sourceMappingURL=png-db.js.map
