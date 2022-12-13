const { Parser } = require('binary-parser');
const assert = require('node:assert');
const md5 = require('md5');

const parser = new Parser()
  .useContextVars()
  .uint16be("signature", { assert: 0x494e })
  .uint8("version", { assert: 1 })
  .uint8("hash_size", { assert: 16 })
  .uint16be("num_tags")
  .uint32be("num_entries")
  .array("tags", {
    length: function() { return this.num_tags; },
    type: new Parser()
      .string("name", { zeroTerminated: true })
      .uint16be("type")
      .seek(function() { return Math.ceil(this.$parent.num_entries / 8); }),
  })
  .array("entries", {
    length: function() { return this.num_entries; },
    type: new Parser()
      .string("name", { zeroTerminated: true })
      .string("hash", { encoding: "hex", length: 16 })
      .uint32be("size")
  });

function parseInstall(buf) {
  return parser.parse(buf);
}

module.exports = {
  parse: parseInstall,
};
