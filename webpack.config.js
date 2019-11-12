const path = require('path');
const webpack = require('webpack');

module.exports = env => {
  const { getIfUtils } = require('webpack-config-utils');
  const nodeExternals = require('webpack-node-externals');
  const { ifProduction } = getIfUtils(env);
  const mode = ifProduction('production', 'development');

  console.log('>>> Jaxom Webpack Environment mode: ' + env.mode);
  return {
    entry: {
      index: './lib/index.ts'
    },
    target: 'node',
    externals: [nodeExternals()],
    mode: mode,
    module: {
      rules: [
        {
          test: /\.ts(x?)$/,
          use: 'ts-loader'
        },
        {
          test: /\.json$/,
          use: 'json-loader'
        }
      ]
    },
    plugins: [
      new webpack.DefinePlugin({ 'process.env.NODE_ENV': '"production"' }),
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
      libraryTarget: 'commonjs',
      path: path.join(__dirname, 'dist'),
      filename: 'jaxom-bundle.js'
    }
  };
};
