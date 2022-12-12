const assert = require('node:assert');
const md5 = require('md5');
const zlib = require('node:zlib');

function parseDataChunk(buf) {
  const encodingMode = buf.readUInt8(0);
  switch (encodingMode) {
    case 0x4e: // N
      return buf.subarray(1);
    case 0x5a: // Z
      return zlib.inflateSync(buf.subarray(1));
    default:
      assert(false, "BLTE encoding mode");
  }
}

function parseBLTE(buf, hash) {
  assert.strictEqual(buf.readUInt32BE(0), 0x424c5445, "BLTE magic");
  const headerSize = buf.readUInt32BE(4);
  assert.strictEqual(md5(buf.subarray(0, headerSize)), hash, "BLTE checksum");
  if (headerSize == 0) {
    return parseDataChunk(buf.subarray(8));
  } else {
    assert.strictEqual(buf.readUInt8(8), 0xf, "BLTE flags");
    const chunkCount = buf.readUInt32BE(8) & 0x00ffffff;
    assert.strictEqual(chunkCount * 24 + 12, headerSize, "BLTE header");
    const chunks = [];
    for (let i = 0; i < chunkCount; ++i) {
      const p = i * 24 + 12;
      chunks.push({
        compressedSize: buf.readUInt32BE(p),
        decompressedSize: buf.readUInt32BE(p + 4),
        checksum: buf.subarray(p + 8, p + 24).toString('hex'),
      });
    }
    const compressedSize = chunks.reduce((t, c) => t + c.compressedSize, 0);
    assert.strictEqual(buf.length - headerSize, compressedSize, "BLTE size");
    let cursor = headerSize;
    const buffers = [];
    for (const chunk of chunks) {
      const cbuf = buf.subarray(cursor, cursor + chunk.compressedSize);
      assert.strictEqual(md5(cbuf), chunk.checksum, "BLTE chunk checksum");
      const data = parseDataChunk(cbuf);
      assert.strictEqual(data.length, chunk.decompressedSize, "BLTE decompressed size");
      buffers.push(data);
      cursor += chunk.compressedSize;
    }
    return Buffer.concat(buffers);
  }
}

module.exports = {
  parse: parseBLTE,
};
