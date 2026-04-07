import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import https from 'node:https';
import process from 'node:process';
import {execSync} from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const VIEWER_DIR = path.join(ROOT, 'src/viewer');
const TEMP_DIR = path.join(ROOT, '.tmp/update-cache');

const COMPONENTS = [
  {
    name: 'PDF.js Core',
    repo: 'mozilla/pdf.js',
    assetPattern: '-dist.zip',
    mappings: [
      {src: 'build', dest: 'build', strategy: 'replace'},
      {src: 'web', dest: 'web', strategy: 'preserve'},
    ],
  },
];

/**
 * @param {string} url
 */
async function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, {headers: {'User-Agent': 'Node.js'}}, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => resolve(JSON.parse(data)));
      })
      .on('error', reject);
  });
}

/**
 * @param {string} url
 * @param {string} dest
 */
function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (
          res.statusCode &&
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          return downloadFile(res.headers.location, dest).then(resolve).catch(reject);
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`Failed to download: ${res.statusCode}`));
        }
        const file = fs.createWriteStream(dest);
        res.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve(undefined);
        });
      })
      .on('error', (err) => {
        reject(err);
      });
  });
}

/**
 * @param {any} component
 */
async function updateComponent(component) {
  console.log(`\n--- Updating ${component.name} ---`);
  const api = `https://api.github.com/repos/${component.repo}/releases/latest`;
  const release = await fetchJson(api);

  const asset = release.assets.find((a) => a.name.endsWith(component.assetPattern));
  if (!asset) {
    throw new Error(`Could not find ${component.assetPattern} asset for ${component.name}.`);
  }

  console.log(`Found version ${release.tag_name}. Downloading ${asset.name}...`);
  const componentTempDir = path.join(TEMP_DIR, component.repo.replace('/', '_'));
  if (!fs.existsSync(componentTempDir)) {
    fs.mkdirSync(componentTempDir, {recursive: true});
  }

  const zipPath = path.join(componentTempDir, 'archive.zip');
  await downloadFile(asset.browser_download_url, zipPath);

  console.log('Extracting assets...');
  const extractDir = path.join(componentTempDir, 'extracted');
  if (fs.existsSync(extractDir)) {
    fs.rmSync(extractDir, {recursive: true});
  }
  fs.mkdirSync(extractDir);
  execSync(`unzip -o "${zipPath}" -d "${extractDir}"`);

  for (const mapping of component.mappings) {
    const src = mapping.src === '.' ? extractDir : path.join(extractDir, mapping.src);
    const dest = path.join(VIEWER_DIR, mapping.dest);

    console.log(`Updating ${mapping.dest} using ${mapping.strategy} strategy...`);

    if (mapping.strategy === 'preserve') {
      // Replaces files but preserves subdirectories not present in src
      if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, {recursive: true});
      }
      const files = fs.readdirSync(src);
      for (const file of files) {
        const fileSrc = path.join(src, file);
        const fileDest = path.join(dest, file);

        if (fs.lstatSync(fileSrc).isDirectory()) {
          if (fs.existsSync(fileDest)) {
            console.log(`  Replacing directory: ${file}`);
            fs.rmSync(fileDest, {recursive: true});
          }
          fs.cpSync(fileSrc, fileDest, {recursive: true});
        } else {
          fs.copyFileSync(fileSrc, fileDest);
        }
      }
    } else {
      // Replace whole directory
      if (fs.existsSync(dest)) {
        console.log(`  Deleting old ${mapping.dest} directory...`);
        fs.rmSync(dest, {recursive: true});
      }
      fs.cpSync(src, dest, {recursive: true});
    }
  }
  console.log(`Successfully updated ${component.name} to ${release.tag_name}`);
}

async function main() {
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, {recursive: true});
  }

  for (const component of COMPONENTS) {
    try {
      await updateComponent(component);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`Failed to update ${component.name}:`, message);
    }
  }

  console.log('\nCleaning up...');
  fs.rmSync(TEMP_DIR, {recursive: true});
  console.log('Update complete.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Unified update failed:', err);
  process.exit(1);
});
