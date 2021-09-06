const nodeExternals = require('webpack-node-externals');
const path = require('path');

module.exports = {
  entry: './server/server.js',
  externals: [nodeExternals()],
  mode: 'development',
  node: {
    __dirname: false,
  },
  output: {
    path: path.join(__dirname, 'server', 'build'),
    filename: 'app.js',
  },
  target: 'node',
};
