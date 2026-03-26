export type FieldTypeName = "KEY" | "TEXT" | "DECIMAL" | "INTEGER";

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
    type: FieldTypeName;
    precision?: number;
    range?: NumericRange;
    uniqueValues?: unknown[];
    treatAsArray?: boolean;
    longestArray?: number;
    dataLoaded?: boolean;
    quantiles?: Quantile[];
    buckets: BucketOptions | Bucket[];
    underflow?: Bucket;
    overflow?: Bucket;
}

export type PngDBScalar = string | number | boolean | null | undefined;
export type PngDBValue = PngDBScalar | PngDBScalar[];
export type PngDBRecord = Record<string, PngDBValue>;

export interface ImageSize {
    width: number;
    height: number;
}

export interface RootJsonFile {
    metadata: Record<string, unknown>;
    fields: Record<string, PngDBFieldMeta>;
    imageSize?: ImageSize;
    recordCount?: number;
    records?: PngDBRecord[];
}
