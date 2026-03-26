import FieldTypes from "../core/FieldTypes";
import PngDB from "../core/PngDB";
import type {
    ImageSize,
    PngDBFieldMeta,
    PngDBRecord,
    RootJsonFile,
} from "../core/types";

export default class PngDBReader<
    TRecord extends PngDBRecord = PngDBRecord
> extends PngDB<TRecord> {
    public url: string | null = null;
    public cacheTime = Date.now();
    public imageSize?: ImageSize;

    protected _getDir(url: string): string {
        const bits = url.split("/");
        bits.pop();
        return bits.join("/");
    }

    protected async _getJSON<T>(url: string): Promise<T> {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to load JSON: ${url} (${response.status})`);
        }
        return (await response.json()) as T;
    }

    async load(url: string): Promise<void> {
        this.url = url;
        const data = await this._getJSON<RootJsonFile>(url);

        this.metadata = data.metadata ?? {};
        this.fields = data.fields ?? {};
        this.imageSize = data.imageSize ?? { width: 0, height: 0 };
        this.records = [];

        const recordCount = data.recordCount ?? 0;
        for (let i = 0; i < recordCount; i++) {
            this.records.push({} as TRecord);
        }
    }

    loadImagePixels(url: string): Promise<Uint8ClampedArray> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "Anonymous";

            img.onload = () => {
                const canvas = document.createElement("canvas");
                canvas.width = img.width;
                canvas.height = img.height;

                const context = canvas.getContext("2d");
                if (!context) {
                    reject(new Error("Could not acquire 2D canvas context"));
                    return;
                }

                context.drawImage(img, 0, 0);
                const imageData = context.getImageData(0, 0, img.width, img.height);
                resolve(imageData.data);
            };

            img.onerror = (err) => reject(err);
            img.src = url;
        });
    }

    async loadFields(fieldNames: string[], forceRefresh = false): Promise<void> {
        await Promise.all(fieldNames.map((fieldName) => this.loadField(fieldName, forceRefresh)));
    }

    async loadField(fieldName: string, forceRefresh = false): Promise<void> {
        if (!this.url) {
            throw new Error("Please load the database first");
        }

        const field = this.fields[fieldName];
        if (!field) {
            throw new Error(`Unknown field ${fieldName}`);
        }

        const dir = this._getDir(this.url);

        if (field.dataLoaded && !forceRefresh) {
            return;
        }

        if (field.type === FieldTypes.KEY.name) {
            const data = await this._getJSON<unknown[]>(
                `${dir}/${encodeURIComponent(fieldName)}.json`
            );

            for (let i = 0; i < this.records.length; i++) {
                (this.records[i] as Record<string, unknown>)[fieldName] = data[i];
            }
            field.dataLoaded = true;
            return;
        }

        const pixels = await this.loadImagePixels(
            `${dir}/${encodeURIComponent(fieldName)}.png?ac=${this.cacheTime}`
        );

        const valFromPixel = (pos: number): unknown => {
            const a = pixels[pos + 3];
            if (a === 0) return null;

            const r = pixels[pos] ?? 0;
            const g = pixels[pos + 1] ?? 0;
            const b = pixels[pos + 2] ?? 0;

            let value: unknown = (r << 16) | (g << 8) | b;

            if (field.uniqueValues) {
                value = field.uniqueValues[value as number];
            } else {
                if (field.precision) {
                    value = (value as number) / field.precision;
                }
                if (field.range) {
                    value = (value as number) + field.range.min;
                }
            }

            return value;
        };

        field.dataLoaded = true;

        if (field.treatAsArray) {
            if (!this.imageSize) {
                throw new Error("Missing imageSize metadata for array field");
            }

            const longestArray = field.longestArray ?? 0;
            const numTilesEach = Math.ceil(Math.sqrt(longestArray));
            const pxSize = this.imageSize.width;
            const imgSize = pxSize * numTilesEach;

            let recordIndex = 0;
            for (let y = 0; y < pxSize; y++) {
                for (let x = 0; x < pxSize; x++) {
                    const arr: unknown[] = [];

                    for (let ty = 0; ty < numTilesEach; ty++) {
                        for (let tx = 0; tx < numTilesEach; tx++) {
                            const xPos = tx * pxSize + x;
                            const yPos = ty * pxSize + y;
                            const pos = yPos * (imgSize * 4) + xPos * 4;
                            const value = valFromPixel(pos);
                            if (value !== null) {
                                arr.push(value);
                            }
                        }
                    }

                    if (recordIndex < this.records.length) {
                        (this.records[recordIndex] as Record<string, unknown>)[fieldName] = arr;
                    }
                    recordIndex++;
                }
            }
        } else {
            for (let i = 0; i < this.records.length; i++) {
                const pos = i * 4;
                (this.records[i] as Record<string, unknown>)[fieldName] = valFromPixel(pos);
            }
        }
    }

    async loadAllRecordsFromJson(url: string): Promise<void> {
        this.url = url;
        const data = await this._getJSON<RootJsonFile>(url);

        this.metadata = data.metadata ?? {};
        this.fields = data.fields ?? {};
        this.records = (data.records ?? []) as TRecord[];

        Object.keys(this.fields).forEach((fieldName) => {
            let field = this.fields[fieldName];
            if (field) field.dataLoaded = true;
        });
    }
}
