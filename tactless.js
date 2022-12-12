const config = require('./config');
const index = require('./index');
const pipe = require('./pipe');

module.exports = {
  blte: require('./blte').parse,
  config: s => config.parse(s),
  index: (s, n) => index.parse(s, n),
  pipe: s => pipe.parse(s),
};
