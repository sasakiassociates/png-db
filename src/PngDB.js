import FieldTypes from "./FieldTypes";

'use strict';
/**
 * Node.js class for writing databases
 */
export default class PngDB {

    constructor() {
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
    addField(fieldName, type, opts = {}) {
        var ft = new FieldTypes();
        this.fields[fieldName] = {type: type.name};

        if ('buckets' in opts) {
            this.fields[fieldName].buckets = opts.buckets;
        }
        else {
            this.fields[fieldName].buckets = { count: 0 };
        }
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
    addArrayField(fieldName, type, opts = {}) {
        this.addField(fieldName, type, opts);
        this.fields[fieldName].treatAsArray = true;
    }

    /**
     * add any metadata to be stored as JSON
     * @param {String} key
     * @param {Object} value
     */
    addMetaData(key, value) {
        this.metadata[key] = value;
    }

    /**
     * add a record object - object properties must match field names exactly
     * @param {Object} record
     */
    addRecord(record) {
        // console.log('Add record');
        this.records.push(record);
    }

    _shiftBits(number, columns) {
        if (!number) number = 0;
        if (columns === 0) return number;
        if (columns === 1) return number << 8;
        if (columns === 2) return number << 16;
        if (columns === 3) return number << 32;
    }

    _encodeFields(record, field1, field2) {
        //(0x6633 << 16 | 0x3399).toString(16)
        return this._shiftBits(record[field1], 2) | record[field2];
    }
}
