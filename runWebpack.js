var webpack = require("webpack");
//var WebpackDevServer = require("webpack-dev-server");

// returns a Compiler instance
var compiler = webpack(require("./webpack.config"));

compiler.run(function (err, stats) {
    stats.compilation.errors.forEach(function (error, i) {
        console.log('*ERROR* ' + error);
    });
    stats.compilation.warnings.forEach(function (warning, i) {
        console.log(warning);
    });
    console.log('COMPILED');
    process.exit();
});

//var server = new WebpackDevServer(compiler, {
//
//});
//server.listen(8080);