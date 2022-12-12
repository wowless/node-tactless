const config = require('./config');
const pipe = require('./pipe');

module.exports = {
  config: s => config.parse(s),
  pipe: s => pipe.parse(s),
};
