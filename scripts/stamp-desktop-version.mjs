import { readFileSync, writeFileSync } from 'node:fs';

const run = String(process.env.GITHUB_RUN_NUMBER || '0').replace(/\D/g, '') || '0';
const version = '1.0.' + run;

const confPath = new URL('../src-tauri/tauri.conf.json', import.meta.url);
const conf = JSON.parse(readFileSync(confPath, 'utf8'));
conf.version = version;
writeFileSync(confPath, JSON.stringify(conf, null, 2) + '\n');

for (const rel of ['../package.json', '../web/package.json']) {
  const path = new URL(rel, import.meta.url);
  const pkg = JSON.parse(readFileSync(path, 'utf8'));
  pkg.version = version;
  writeFileSync(path, JSON.stringify(pkg, null, 2) + '\n');
}

console.log('desktop version', version);
