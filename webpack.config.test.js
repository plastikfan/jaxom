const path = require('path');

module.exports = env => {
  const { getIfUtils } = require('webpack-config-utils');
  const nodeExternals = require('webpack-node-externals');
  const { ifProduction } = getIfUtils(env);
  const mode = ifProduction('production', 'development');

  console.log('>>> Jaxom Webpack Environment mode: ' + env.mode);

  return {
    devtool: 'source-map',
    mode: mode,
    entry: ['./tests/all-tests-entry.js'],
    target: 'node',
    externals: [nodeExternals()],
    module: {
      rules: [
        {
          test: /\.xml$/i,
          use: 'raw-loader'
        },
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
          loader: 'json-loader'
        }
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
};
