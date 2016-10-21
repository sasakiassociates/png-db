'use strict';

var babel = require('rollup-plugin-babel');
var babelrc = require('babelrc-rollup');

var rollup = require('rollup');
var fs = require("fs");
var path = require("path");

var rollupVersion = function (version, pkg) {
    let external = Object.keys(pkg.dependencies);

    var settings = {
        entry: path.join(version, 'index.js'),
        plugins: [
            babel(babelrc.default())
        ],
        external: external
    };

    rollup.rollup(settings).then(function (bundle) {
        bundle.write({
            format: 'es',
            dest: path.join(version, 'dist/png-db.es.js'),
            sourceMap: true
        });
        bundle.write({
            format: 'cjs',
            dest: path.join(version, 'dist/png-db.js'),
            sourceMap: true
        });
    });
};
rollupVersion('versions/client', {
    "dependencies": {}
});
rollupVersion('versions/node', {
    "dependencies": {
        "jimp": "^0.2.27"
    }
});