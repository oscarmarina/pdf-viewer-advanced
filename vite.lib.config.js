import {defineConfig} from 'vite';
import {nodeExternals} from 'rollup-plugin-node-externals';
import copy from 'rollup-plugin-copy';
import {globSync} from 'tinyglobby';

const ENTRIES_DIR = 'src';
const ENTRIES_GLOB = [`${ENTRIES_DIR}/**/*.ts`, `!${ENTRIES_DIR}/viewer/**`];

// https://github.com/vitejs/vite/discussions/1736#discussioncomment-5126923
const entries = Object.fromEntries(
  globSync(ENTRIES_GLOB).map((file) => {
    const [key] = file.match(new RegExp(`(?<=${ENTRIES_DIR}/).*`)) || [];
    return [key?.replace(/\.[^.]*$/, ''), file];
  })
);

// Viewer assets loaded at runtime via import.meta.url (not bundled by Vite)
const viewerAssetsCopy = {
  targets: [
    {src: 'src/viewer/build/pdf.worker.mjs', dest: 'dist/viewer/build'},
    {src: 'src/viewer/build/pdf.sandbox.mjs', dest: 'dist/viewer/build'},
    {src: 'src/viewer/web/cmaps', dest: 'dist/viewer/web'},
    {src: 'src/viewer/web/iccs', dest: 'dist/viewer/web'},
    {src: 'src/viewer/web/images', dest: 'dist/viewer/web'},
    {src: 'src/viewer/web/standard_fonts', dest: 'dist/viewer/web'},
    {src: 'src/viewer/web/wasm', dest: 'dist/viewer/web'},
    {src: 'src/viewer/web/locale', dest: 'dist/viewer/web'},
    {src: 'src/styles/pdf-viewer-advanced-theme.css', dest: 'dist/styles/'},
  ],
  hook: 'writeBundle',
};

export default defineConfig({
  plugins: [nodeExternals(), copy(viewerAssetsCopy)],
  build: {
    rolldownOptions: {
      transform: {
        target: ['es2022'],
        assumptions: {
          setPublicClassFields: true,
        },
        typescript: {
          removeClassFieldsWithoutInitializer: true,
        },
        decorator: {
          legacy: true,
        },
      },
      treeshake: true,
    },
    minify: false,
    lib: {
      entry: entries,
      formats: ['es'],
    },
  },
});
