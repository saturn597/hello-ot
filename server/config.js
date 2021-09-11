const path = require('path');

const config = {
  buildPath: path.join(__dirname, '../../build'),
  sslCertPath: path.join(__dirname, '../ssl/self.cert'),
  sslKeyPath: path.join(__dirname, '../ssl/self.key'),
};

export default config;
