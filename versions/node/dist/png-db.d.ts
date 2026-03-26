export class FieldTypes {
    readonly name: "KEY" | "TEXT" | "DECIMAL" | "INTEGER";

    constructor(name?: string);

    toString(): string;

    static isNumeric(name: string): boolean;

    static KEY: FieldTypes;
    static TEXT: FieldTypes;
    static DECIMAL: FieldTypes;
    static INTEGER: FieldTypes;
}

export interface NumericRange {
    min: number;
    max: number;
}

export interface Quantile {
    position: number;
    value: number;
}

export interface BucketRange {
    min: number;
    max: number;
}

export interface Bucket {
    quantity: number;
    range: BucketRange;
}

export interface BucketOptions {
    count?: number;
    min?: number;
    max?: number;
}

export interface AddFieldOptions {
    precision?: number;
    buckets?: BucketOptions;
}

export interface PngDBFieldMeta {
    type: string;
    precision?: number;
    range?: NumericRange;
    uniqueValues?: Array<string | number | boolean | null>;
    treatAsArray?: boolean;
    longestArray?: number;
    dataLoaded?: boolean;
    quantiles?: Quantile[];
    buckets?: BucketOptions | Bucket[];
    gutterBuckets?: Record<string, never>;
    underflow?: Bucket;
    overflow?: Bucket;
}

export type PngDBRecordScalar =
    | string
    | number
    | boolean
    | null
    | undefined;

export type PngDBRecordValue =
    | PngDBRecordScalar
    | PngDBRecordScalar[];

export type PngDBRecord = Record<string, PngDBRecordValue>;

export class PngDB<TRecord extends PngDBRecord = PngDBRecord> {
    fields: Record<string, PngDBFieldMeta>;
    metadata: Record<string, unknown>;
    records: TRecord[];

    constructor();

    addField(
        fieldName: string,
        type: FieldTypes,
        opts?: AddFieldOptions
    ): void;

    addArrayField(
        fieldName: string,
        type: FieldTypes,
        opts?: AddFieldOptions
    ): void;

    addMetaData(key: string, value: unknown): void;

    addRecord(record: TRecord): void;
}

export class PngDBReader<
    TRecord extends PngDBRecord = PngDBRecord
> extends PngDB<TRecord> {
    url: string | null;
    cacheTime: number;
    imageSize?: {
        width: number;
        height: number;
    };

    constructor();

    load(url: string): Promise<void>;

    loadFields(fieldNames: string[], forceRefresh?: boolean): Promise<void>;

    loadField(fieldName: string, forceRefresh?: boolean): Promise<void>;

    loadAllRecordsFromJson(url: string): Promise<void>;

    loadImagePixels(
        url: string,
        cb: (err: unknown, pixels: Uint8ClampedArray) => void
    ): void;
}

export interface WriterStatsOptions {
    quantiles?: number;
}

export class PngDBWriter<
    TRecord extends PngDBRecord = PngDBRecord
> extends PngDB<TRecord> {
    MAX_VALUE: number;
    stats: {
        quantiles: number;
    };

    constructor(opts?: WriterStatsOptions);

    save(saveAs: string): void;

    saveAllRecordsAsJson(saveAs: string): void;

    writeKeyData(
        dir: string,
        fieldName: string,
        field: PngDBFieldMeta
    ): void;

    writePngData(
        dir: string,
        fieldName: string,
        field: PngDBFieldMeta,
        pxSize: number
    ): void;
}
