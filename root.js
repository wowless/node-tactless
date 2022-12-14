const { Parser } = require('binary-parser');
const assert = require('node:assert');

const parser = new Parser()
  .uint32le("magic", { assert: 0x4d465354 })
  .uint32le("total_file_count")
  .uint32le("named_file_count")
  .array("blocks", {
    readUntil: "eof",
    type: new Parser()
      .uint32le("num_records")
      .uint32le("flags")
      .uint32le("locale")
      .array("fdid_deltas", {
        length: "num_records",
        type: "int32le",
      })
      .array("content_keys", {
        length: "num_records",
        type: new Parser().string("", { encoding: "hex", length: 16 }),
      })
      .array("name_hashes", {
        length: function() {
          return (this.flags & 0x10000000) ? 0 : this.num_records;
        },
        type: new Parser().string("", { encoding: "hex", length: 8 }),
      }),
  });

function parseRoot(buf) {
  const data = parser.parse(buf);
  const name2fdid = new Map();
  const fdid2ckey = new Map();
  for (const block of data.blocks) {
    if ((block.locale & 0x2) && !(block.locale & 0x100)) { // TODO support multiple locales
      let fdid = -1;
      for (let i = 0; i < block.num_records; ++i) {
        fdid = fdid + 1 + block.fdid_deltas[i];
        assert(!fdid2ckey.has(fdid));
        fdid2ckey.set(fdid, block.content_keys[i]);
        const name = block.name_hashes[i];
        if (name) {
          assert(!name2fdid.has(name));
          name2fdid.set(name, fdid);
        }
      }
    }
  }
  return {
    fdid2ckey: fdid2ckey,
    name2fdid: name2fdid,
  };
}

module.exports = {
  parse: parseRoot,
};
