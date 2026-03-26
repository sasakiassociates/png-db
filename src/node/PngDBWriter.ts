import fs from "node:fs/promises";
import path from "node:path";
import { Jimp, rgbaToInt } from "jimp";

import PngDB from "../core/PngDB";
import FieldTypes from "../core/FieldTypes";
import type {
    Bucket,
    BucketOptions,
    PngDBFieldMeta,
    PngDBRecord,
    Quantile,
} from "../core/types";

const isNumber = (x: unknown): x is number =>
    typeof x === "number" && !Number.isNaN(x);

export interface WriterStatsOptions {
    quantiles?: number;
}

type MutableField = PngDBFieldMeta & {
    uniqueValues?: unknown[];
};

export default class PngDBWriter<
    TRecord extends PngDBRecord = PngDBRecord
> extends PngDB<TRecord> {
    public readonly MAX_VALUE = 255 * 256 * 256 - 1;

    public stats: {
        quantiles: number;
    };

    constructor({ quantiles = 0 }: WriterStatsOptions = {}) {
        super();
        this.stats = { quantiles };
    }

    async save(saveAs: string): Promise<void> {
        const size = this.records.length;
        const pxSize = Math.ceil(Math.sqrt(size));
        const dir = path.dirname(saveAs);

        await fs.mkdir(dir, { recursive: true });

        for (const fieldName of Object.keys(this.fields)) {
            const field = this.fields[fieldName] as MutableField;

            if (field.type === FieldTypes.TEXT.name) {
                field.uniqueValues = [];
            }

            if (FieldTypes.isNumeric(field.type)) {
                field.range = { min: Number.MAX_VALUE, max: -Number.MAX_VALUE };
            }
        }

        const sortedValues: Record<string, number[]> = {};

        for (const record of this.records) {
            for (const fieldName of Object.keys(this.fields)) {
                const field = this.fields[fieldName] as MutableField;
                const value = record[fieldName];

                const bucketOpts = this.getBucketOptions(field);
                if (
                    (this.stats.quantiles > 1 || (bucketOpts?.count ?? 0) > 1) &&
                    typeof value === "number"
                ) {
                    if (!sortedValues[fieldName]) sortedValues[fieldName] = [];
                    sortedValues[fieldName].push(value);
                }

                if (field.range) {
                    if (field.treatAsArray) {
                        if (Array.isArray(value)) {
                            for (const v of value) {
                                if (isNumber(v)) {
                                    field.range.min = Math.min(field.range.min, v);
                                    field.range.max = Math.max(field.range.max, v);
                                }
                            }
                            field.longestArray = Math.max(field.longestArray ?? 0, value.length);
                        }
                    } else if (isNumber(value)) {
                        field.range.min = Math.min(field.range.min, value);
                        field.range.max = Math.max(field.range.max, value);
                    }
                }

                if (field.uniqueValues && !field.uniqueValues.includes(value)) {
                    field.uniqueValues.push(value);
                }
            }
        }

        for (const fieldName of Object.keys(this.fields)) {
            const field = this.fields[fieldName] as MutableField;
            const bucketOpts = this.getBucketOptions(field);

            if (field.range && field.range.max > this.MAX_VALUE) {
                field.precision = (this.MAX_VALUE - 1) / field.range.max;
            }

            const generateQuantiles =
                !!field.range && !field.treatAsArray && this.stats.quantiles > 1;
            const generateBuckets =
                !!field.range && !field.treatAsArray && (bucketOpts?.count ?? 0) > 1;

            if ((generateQuantiles || generateBuckets) && sortedValues[fieldName]) {
                sortedValues[fieldName].sort((a, b) => a - b);
            }

            if (generateQuantiles && sortedValues[fieldName]) {
                field.quantiles = this.computeQuantiles(
                    sortedValues[fieldName],
                    this.stats.quantiles
                );
            }

            if (generateBuckets && sortedValues[fieldName] && bucketOpts) {
                const { buckets, underflow, overflow } = this.computeBuckets(
                    sortedValues[fieldName],
                    field.range!,
                    bucketOpts
                );
                field.buckets = buckets;
                field.underflow = underflow;
                field.overflow = overflow;
            }
        }

        await this.writeRootJson(saveAs, pxSize);

        for (const fieldName of Object.keys(this.fields)) {
            const field = this.fields[fieldName];
            if (!field) continue;
            if (field.type === FieldTypes.KEY.name) {
                await this.writeKeyData(dir, fieldName, field);
            } else {
                await this.writePngData(dir, fieldName, field, pxSize);
            }
        }
    }

    async saveAllRecordsAsJson(saveAs: string): Promise<void> {
        const dir = path.dirname(saveAs);
        await fs.mkdir(dir, { recursive: true });

        const payload = {
            metadata: this.metadata,
            fields: this.fields,
            records: this.records,
        };

        await fs.writeFile(saveAs, JSON.stringify(payload, null, 2), "utf8");
    }

    async writeKeyData(
        dir: string,
        fieldName: string,
        _field: PngDBFieldMeta
    ): Promise<void> {
        const values = this.records.map((record) => record[fieldName] ?? null);
        await fs.writeFile(
            path.join(dir, `${fieldName}.json`),
            JSON.stringify(values),
            "utf8"
        );
    }

    async writePngData(
        dir: string,
        fieldName: string,
        field: PngDBFieldMeta,
        pxSize: number
    ): Promise<void> {
        const numTilesEach = field.treatAsArray
            ? Math.ceil(Math.sqrt(field.longestArray ?? 0))
            : 1;

        const width = pxSize * numTilesEach;
        const height = pxSize * numTilesEach;

        const image = new Jimp({
            width,
            height,
            color: 0x00000000,
        });

        const encodeValue = (raw: unknown): number | null => {
            if (raw === null || typeof raw === "undefined") return null;

            if (field.uniqueValues) {
                const idx = field.uniqueValues.indexOf(raw);
                return idx >= 0 ? idx : null;
            }

            if (typeof raw !== "number" || Number.isNaN(raw)) return null;

            let value = raw;
            if (field.range) value -= field.range.min;
            if (field.precision) value *= field.precision;

            return Math.round(value);
        };

        const setPixel = (x: number, y: number, encoded: number | null): void => {
            if (encoded === null) {
                image.setPixelColor(rgbaToInt(0, 0, 0, 0), x, y);
                return;
            }

            const r = (encoded >> 16) & 255;
            const g = (encoded >> 8) & 255;
            const b = encoded & 255;
            image.setPixelColor(rgbaToInt(r, g, b, 255), x, y);
        };

        if (field.treatAsArray) {
            this.records.forEach((record, recordIndex) => {
                const values = Array.isArray(record[fieldName]) ? record[fieldName] : [];
                const x = recordIndex % pxSize;
                const y = Math.floor(recordIndex / pxSize);

                for (let i = 0; i < (field.longestArray ?? 0); i++) {
                    const tx = i % numTilesEach;
                    const ty = Math.floor(i / numTilesEach);
                    const encoded = encodeValue(values[i]);
                    setPixel(tx * pxSize + x, ty * pxSize + y, encoded);
                }
            });
        } else {
            this.records.forEach((record, recordIndex) => {
                const x = recordIndex % pxSize;
                const y = Math.floor(recordIndex / pxSize);
                const encoded = encodeValue(record[fieldName]);
                setPixel(x, y, encoded);
            });
        }

        const outPath = path.join(dir, `${fieldName}.png`) as `${string}.png`;
        await image.write(outPath);
    }

    private async writeRootJson(saveAs: string, pxSize: number): Promise<void> {
        const payload = {
            metadata: this.metadata,
            fields: this.fields,
            imageSize: {
                width: pxSize,
                height: pxSize,
            },
            recordCount: this.records.length,
        };

        await fs.writeFile(saveAs, JSON.stringify(payload, null, 2), "utf8");
    }

    private getBucketOptions(field: PngDBFieldMeta): BucketOptions | undefined {
        return Array.isArray(field.buckets) ? undefined : field.buckets;
    }

    private computeQuantiles(values: number[], quantiles: number): Quantile[] {
        const result: Quantile[] = [];
        for (let i = 1; i < quantiles; i++) {
            const frac = i / quantiles;
            const pos = Math.round(frac * values.length);
            result.push({
                position: 100 * frac,
                value: values[pos] ?? values[values.length - 1] ?? -1,
            });
        }
        return result;
    }

    private computeBuckets(
        values: number[],
        range: { min: number; max: number },
        opts: BucketOptions
    ): { buckets: Bucket[]; underflow: Bucket; overflow: Bucket } {
        const count = opts.count ?? 0;
        const min = typeof opts.min === "number" ? opts.min : range.min;
        const max = typeof opts.max === "number" ? opts.max : range.max;

        const bucketRange = max - min;
        const bucketSize = count > 0 ? bucketRange / count : 0;

        const buckets: Bucket[] = [];
        for (let i = 0; i < count; i++) {
            buckets.push({
                quantity: 0,
                range: {
                    min: i * bucketSize + min,
                    max: (i + 1) * bucketSize + min,
                },
            });
        }

        const underflow: Bucket = {
            quantity: 0,
            range: { min: -Infinity, max: min },
        };

        const overflow: Bucket = {
            quantity: 0,
            range: { min: max, max: Infinity },
        };

        for (const value of values) {
            if (value < min) {
                underflow.quantity++;
                continue;
            }
            if (value > max) {
                overflow.quantity++;
                continue;
            }

            if (count === 0) continue;

            const idx = Math.min(
                count - 1,
                Math.max(0, Math.floor((value - min) / bucketSize))
            );
            let bucket = buckets[idx];
            if (bucket) bucket.quantity++;
        }

        return { buckets, underflow, overflow };
    }
}
