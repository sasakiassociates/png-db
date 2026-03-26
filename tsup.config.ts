import { defineConfig } from "tsup";

export default defineConfig([
    {
        entry: {
            index: "src/index.ts",
            "browser/index": "src/browser/index.ts",
            "node/index": "src/node/index.ts",
        },
        format: ["esm", "cjs"],
        dts: true,
        sourcemap: true,
        clean: true,
        splitting: false,
        target: "es2020",
    },
]);
