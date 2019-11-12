const path = require('path');
const nodeExternals = require('webpack-node-externals');

module.exports = {
  devtool: 'source-map',
  mode: 'development',
  entry: ['./tests/all-tests-entry.js', './lib'],
  target: 'node',
  externals: [nodeExternals()],
  module: {
    rules: [
      {
        test: /\.xml$/i,
        use: 'raw-loader'
      },
      { test: /\.ts(x?)$/, loader: 'ts-loader' },
      { test: /\.json$/, loader: 'json-loader' }
    ]
  },
  resolve: {
    extensions: ['.ts', '.js', '.json']
  },
  watchOptions: {
    ignored: /node_modules/
  },
  output: {
    filename: 'jaxom-test-bundle.js',
    sourceMapFilename: 'jaxom-test-bundle.js.map',
    path: path.resolve(__dirname, 'dist'),
    libraryTarget: 'commonjs'
  }
};
