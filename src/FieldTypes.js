'use strict';
class FieldTypes {
    constructor(name) {
        this.name = name;
    }

    toString() {
        return `FieldTypes.${this.name}`;
    }

    static isNumeric(name) {
        return name === FieldTypes.INTEGER.name
            || name === FieldTypes.DECIMAL.name;
    }
}

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

export default FieldTypes;