'use strict';
class FieldTypes {
    constructor(name) {
        this.name = name;
    }

    toString() {
        return `FieldTypes.${this.name}`;
    }

    static isNumeric(name) {
        return name === FieldTypes.TINYINT.name
            || name === FieldTypes.SMALLINT.name
            || name === FieldTypes.MEDIUMINT.name
            || name === FieldTypes.DECIMAL.name
            || name === FieldTypes.INT.name;
    }
}

FieldTypes.KEY = new FieldTypes('KEY');
FieldTypes.TEXT = new FieldTypes('TEXT');

/**
 * decimals are stored as integers representing the offset minimum value for each field and a multiplier for precision
 * @type {FieldTypes}
 */
FieldTypes.DECIMAL = new FieldTypes('DECIMAL');

/**
 * (1 byte) up to 256 values
 * @type {FieldTypes}
 */
FieldTypes.TINYINT = new FieldTypes('TINYINT');

/**
 * (2 bytes) up to 65,535 values (2 smallints can be encoded in 1 PNG)
 * @type {FieldTypes}
 */
FieldTypes.SMALLINT = new FieldTypes('SMALLINT');

/**
 * (3 bytes) up to 16,777,215 values
 * @type {FieldTypes}
 */
FieldTypes.MEDIUMINT = new FieldTypes('MEDIUMINT');

/**
 * (4 bytes) up to 4,294,967,295 values (large values supported, but uses entire PNG)
 * @type {FieldTypes}
 */
FieldTypes.INT = new FieldTypes('INT');

export default FieldTypes;