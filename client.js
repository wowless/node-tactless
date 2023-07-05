const axios = require('axios');
const cacache = require('cacache');
const fs = require('fs');
const md5 = require('md5');
const tactless = require('./tactless');

async function fetch(url) {
  console.log(`fetching ${url}`);
  const result = await axios({
    method: 'get',
    responseType: 'arraybuffer',
    url: url,
  });
  return result.data;
}

function mkcdn(host, path) {
  return async function(kind, hash, suffix) {
    const ab = hash.slice(0, 2);
    const cd = hash.slice(2, 4);
    const key = `${path}/${kind}/${ab}/${cd}/${hash}${suffix || ''}`;
    try {
      return (await cacache.get('tactclient-cache', key)).data;
    } catch (_) {
      const data = await fetch(`http://${host}/${key}`);
      await cacache.put('tactclient-cache', key, data);
      return data;
    }
  };
}

(async () => {
  const region = 'us';
  const product = 'wow';
  const tactbase = `http://${region}.patch.battle.net:1119/${product}/`;
  const cdn = await (async () => {
    const content = await fetch(tactbase + 'cdns');
    for (const record of tactless.pipe(content.toString()).data) {
      if (record.Name == region) {
        return mkcdn(record.Hosts.split(' ')[0], record.Path);
      }
    }
    throw "no cdns record for region";
  })();
  const [buildConfig, cdnConfig] = await (async () => {
    const content = await fetch(tactbase + 'versions');
    for (const record of tactless.pipe(content.toString()).data) {
      if (record.Region == region) {
        return [record.BuildConfig, record.CDNConfig];
      }
    }
    throw "no version record for region";
  })();
  const build = tactless
    .config((await cdn('config', buildConfig)).toString())
    .data;
  const encoding = tactless.encoding(tactless.blte(
    await cdn('data', build.encoding[1]), build.encoding[1]));
  const install = tactless.install(tactless.blte(
    await cdn('data', build.install[1]), build.install[1]));
  for (const e of install.entries) {
    if (e.name == 'Wow.exe') {
      const ekey = encoding.get(e.hash)[0];
      const content = await cdn('data', ekey);
      fs.writeFileSync('Wow.exe', tactless.blte(content, ekey));
    }
  }
  const index = await (async () => {
    const archives = tactless
      .config((await cdn('config', cdnConfig)).toString())
      .data
      .archives;
    const index = new Map();
    for (const archive of archives) {
      const content = await cdn('data', archive, '.index');
      tactless.index(content, archive).forEach(v => index.set(v.ekey, v));
    }
    return index;
  })();
  const root = await (async () => {
    const ekey = encoding.get(build.root[0])[0];
    return tactless.root(tactless.blte(await cdn('data', ekey), ekey));
  })();
  {
    const fdid = 841788;
    const ckey = root.fdid2ckey.get(fdid)[0].ckey;
    const ekey = encoding.get(ckey)[0];
    const entry = index.get(ekey);
    console.log(entry);
  }
})();
