'use strict';

var babel = require('rollup-plugin-babel');
var babelrc = require('babelrc-rollup');
var rollup = require('rollup');
var fs = require("fs");
var path = require("path");

var rollupVersion = function (entry, pkg) {
    let external = Object.keys(pkg.dependencies);

    var settings = {
        entry: entry,
        plugins: [
            babel(babelrc.default())
        ],
        external: external
    };

    rollup.rollup(settings).then(function (bundle) {
        bundle.write({
            format: 'cjs',
            dest: 'dist/' + entry,
            sourceMap: true
        }).then(function () {
            console.log('BUNDLED: '+entry);
            process.exit();
        });
    }).catch((e) => {
        console.log(e.stack);
        process.exit();
    })
};
rollupVersion('testDb.js', {
    "dependencies": {}
});