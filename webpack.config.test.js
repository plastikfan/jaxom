const path = require('path');
const webpack = require('webpack');

module.exports = env => {
  const nodeExternals = require('webpack-node-externals');
  const { getIfUtils } = require('webpack-config-utils');
  const { ifProduction } = getIfUtils(env);
  const mode = ifProduction('production', 'development');
  console.log('>>> Jaxom Webpack Environment mode: ' + env.mode);

  return {
    mode: mode,
    entry: ['./tests/all-tests-entry.js'],
    target: 'node',
    externals: [nodeExternals()],
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: [{
            loader: 'ts-loader',
            options: {
              configFile: 'tsconfig.tests.json'
            }
          }]
        },
        {
          test: /\.json$/,
          use: 'json-loader'
        },
        {
          test: /\.xml$/i,
          use: 'raw-loader'
        }
      ]
    },
    plugins: [
      new webpack.DefinePlugin({ 'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV) }),
      new webpack.BannerPlugin({
        banner: '#!/usr/bin/env node',
        raw: true
      })
    ],
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
    },
    devtool: 'inline-source-map'
  };
};
