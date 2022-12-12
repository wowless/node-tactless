const { Parser } = require('binary-parser');
const assert = require('node:assert');
const md5 = require('md5');

const archiveIndexFooterParser = new Parser()
  .buffer("tocChecksum", { length: 8 })
  .uint8("version", { assert: 1 })
  .uint8("f3", { assert: 0 })
  .uint8("f4", { assert: 0 })
  .uint8("blockSize", { assert: 4 })
  .uint8("offsetBytes", { assert: 4 })
  .uint8("sizeBytes", { assert: 4 })
  .uint8("keySize", { assert: 16 })
  .uint8("checksumSize", { assert: 8 })
  .uint32le("numElements")
  .buffer("checksum", { length: 8 });

function sub(buf, offset, size) {
  return buf.subarray(offset, offset + size);
}

function parseArchiveIndex(buf, name) {
  const footerOffset = buf.length - 28;
  assert(footerOffset >= 0, "footer length");
  const footerBytes = buf.subarray(footerOffset);
  assert.strictEqual(md5(footerBytes), name, "footer checksum");
  const blockSize = 4096;
  const bytesPerBlock = blockSize + 24;
  assert.strictEqual(footerOffset % bytesPerBlock, 0, "content size");
  const footer = archiveIndexFooterParser.parse(footerBytes);
  const numBlocks = Math.trunc(footerOffset / bytesPerBlock);
  const blockHashesOffset = footerOffset - numBlocks * 8;
  const lastEntriesOffset = blockHashesOffset - numBlocks * 16;
  assert.strictEqual(
    md5(buf.subarray(lastEntriesOffset, footerOffset)).substring(0, 16),
    footer.tocChecksum.toString('hex'),
    "toc checksum");
  assert.strictEqual(
    md5(Buffer.concat([
      buf.subarray(footerOffset + 8, footerOffset + 20),
      Buffer.from('\0'.repeat(8)),
    ])).substring(0, 16),
    footer.checksum.toString('hex'),
    "internal footer checksum");
  const result = [];
  for (let i = 0; i < numBlocks; ++i) {
    const block = sub(buf, blockSize * i, blockSize);
    const lastEntry = sub(buf, lastEntriesOffset + i * 16, 16).toString('hex');
    const blockHash = sub(buf, blockHashesOffset + i * 8, 8).toString('hex');
    assert.strictEqual(md5(block).substring(0, 16), blockHash, "block hash");
    let found = false;
    for (let p = 0; p <= blockSize - 24 && !found; p += 24) {
      const ekey = block.subarray(p, p + 16).toString('hex');
      const size = block.readUInt32BE(p + 16);
      const offset = block.readUInt32BE(p + 20);
      result.push({
        ekey: ekey,
        offset: offset,
        size: size,
      });
      found = ekey == lastEntry;
    }
    assert(found, "last key found");
  }
  return result;
}

module.exports = {
  parse: parseArchiveIndex,
};
