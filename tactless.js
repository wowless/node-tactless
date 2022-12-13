const config = require('./config');
const index = require('./index');
const pipe = require('./pipe');

module.exports = {
  blte: require('./blte').parse,
  config: s => config.parse(s),
  encoding: require('./encoding').parse,
  index: (s, n) => index.parse(s, n),
  install: require('./install').parse,
  pipe: s => pipe.parse(s),
};
