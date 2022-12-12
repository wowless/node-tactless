const { Parser } = require('binary-parser');
const assert = require('node:assert');
const md5 = require('md5');

const headerParser = new Parser()
  .uint16be("magic", { assert: 0x454e })
  .uint8("version", { assert: 1 })
  .uint8("hash_size_ckey", { assert: 16 })
  .uint8("hash_size_ekey", { assert: 16 })
  .uint16be("cekey_kb")
  .uint16be("espec_kb")
  .uint32be("cekey_count")
  .uint32be("espec_count")
  .uint8("_unknown_x11", { assert: 0 })
  .uint32be("espec_block_size");

function parseEncoding(buf) {
  const header = headerParser.parse(buf);
  const indexOffset = 22 + header.espec_block_size;
  const pageOffset = indexOffset + 32 * header.cekey_count;
  const pageSize = 1024 * header.cekey_kb;
  const result = new Map();
  for (let i = 0; i < header.cekey_count; ++i) {
    const ix = indexOffset + i * 32;
    const firstKey = buf.subarray(ix, ix + 16).toString('hex');
    const hash = buf.subarray(ix + 16, ix + 32).toString('hex');
    const pageStart = pageOffset + i * pageSize;
    const pageEnd = pageStart + pageSize;
    assert.strictEqual(md5(buf.subarray(pageStart, pageEnd)), hash, "encoding page hash");
    for (let px = pageStart; px + 22 < pageEnd && buf.readUInt8(px) != 0;) {
      const keyCount = buf.readUInt8(px);
      const ckey = buf.subarray(px + 6, px + 22).toString('hex');
      if (px == pageStart) {
        assert.strictEqual(ckey, firstKey, "encoding page first key");
      }
      px += 22;
      const ekeys = [];
      for (let j = 0; j < keyCount; ++j, px += 16) {
        ekeys.push(buf.subarray(px, px + 16).toString('hex'));
      }
      result.set(ckey, ekeys);
    }
  }
  return result;
}

module.exports = {
  parse: parseEncoding,
};
