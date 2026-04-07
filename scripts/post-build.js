import {cpSync, existsSync, mkdirSync} from 'node:fs';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const dist = resolve(root, 'dist');

if (!existsSync(dist)) {
  mkdirSync(dist, {recursive: true});
}

cpSync(resolve(root, 'demo', 'index-dist.html'), resolve(dist, 'index.html'));
cpSync(
  resolve(root, 'demo', 'compressed.tracemonkey-pldi-09.pdf'),
  resolve(dist, 'compressed.tracemonkey-pldi-09.pdf')
);

console.log('post-build: copied index-dist.html → dist/index.html');
console.log('post-build: copied compressed.tracemonkey-pldi-09.pdf → dist/');
