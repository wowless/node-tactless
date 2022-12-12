const config = require('./config');
const index = require('./index');
const pipe = require('./pipe');

module.exports = {
  config: s => config.parse(s),
  index: s => index.parse(s),
  pipe: s => pipe.parse(s),
};
