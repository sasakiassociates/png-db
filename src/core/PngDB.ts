import FieldTypes from "./FieldTypes";
import type {
    AddFieldOptions,
    PngDBFieldMeta,
    PngDBRecord,
} from "./types";

export default class PngDB<TRecord extends PngDBRecord = PngDBRecord> {
    public fields: Record<string, PngDBFieldMeta> = {};
    public metadata: Record<string, unknown> = {};
    public records: TRecord[] = [];

    addField(fieldName: string, type: FieldTypes, opts: AddFieldOptions = {}): void {
        this.fields[fieldName] = {
            type: type.name,
            buckets: {
                count: 0,
                ...(opts.buckets ?? {}),
            },
        };

        if ("precision" in opts && typeof opts.precision !== "undefined") {
            this.fields[fieldName].precision = opts.precision;
        }
    }

    addArrayField(fieldName: string, type: FieldTypes, opts: AddFieldOptions = {}): void {
        this.addField(fieldName, type, opts);
        let field = this.fields[fieldName];
        if (field) field.treatAsArray = true;
    }

    addMetaData(key: string, value: unknown): void {
        this.metadata[key] = value;
    }

    addRecord(record: TRecord): void {
        this.records.push(record);
    }

    protected _shiftBits(value: number | null | undefined, columns: number): number {
        const safe = value ?? 0;
        if (columns === 0) return safe;
        if (columns === 1) return safe << 8;
        if (columns === 2) return safe << 16;
        if (columns === 3) return safe << 32;
        return safe;
    }

    protected _encodeFields(
        record: Record<string, number>,
        field1: string,
        field2: string
    ): number {
        return this._shiftBits(record[field1], 2) | record[field2]!;
    }
}
