import type { FieldTypeName } from "./types";

export default class FieldTypes {
    public static readonly KEY = new FieldTypes("KEY");
    public static readonly TEXT = new FieldTypes("TEXT");
    public static readonly DECIMAL = new FieldTypes("DECIMAL");
    public static readonly INTEGER = new FieldTypes("INTEGER");

    public readonly name: FieldTypeName;

    constructor(name: FieldTypeName) {
        this.name = name;
    }

    toString(): string {
        return `FieldTypes.${this.name}`;
    }

    static isNumeric(name: string): boolean {
        return name === FieldTypes.INTEGER.name || name === FieldTypes.DECIMAL.name;
    }
}
