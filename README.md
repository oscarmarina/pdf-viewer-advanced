![Lit](https://img.shields.io/badge/lit-3.0.0-blue.svg)

`blockquote-pdf-viewer-advanced` A Web Component that wraps the official
[PDF.js](https://mozilla.github.io/pdf.js/) viewer inside a sandboxed `srcdoc` iframe, exposing a declarative Lit property interface on top.

```js
import '@blockquote-web-components/pdf-viewer-advanced/pdf-viewer-advanced.js';
import {html, LitElement} from 'lit';

export class MyPdfApp extends LitElement {
  render() {
    return html`
      <pdf-viewer-advanced
        src="/assets/manual.pdf"
        page="1"
        locale="de"
        viewer-css-theme="DARK"
      ></pdf-viewer-advanced>
    `;
  }
}
```

### Using with Vanilla JS

Register the component via a script tag and use it like any standard HTML element.

```html
<script
  type="module"
  src="node_modules/@blockquote-web-components/pdf-viewer-advanced/pdf-viewer-advanced.js"
></script>

<pdf-viewer-advanced id="myViewer" src="sample.pdf"></pdf-viewer-advanced>

<script>
  const viewer = document.getElementById('myViewer');
  viewer.addEventListener('page-change', (e) => {
    console.log('Navigated to page:', e.detail.page);
  });

  // Programmatic control after initialization
  viewer.initComplete.then(() => {
    viewer.page = '5';
    viewer.zoom = '200';
  });
</script>
```

## Key Features

- **Total Isolation**: Uses a sandboxed `srcdoc` iframe. Your app's CSS cannot leak into the viewer, and vice versa.
- **Modern Theming**: Support for `LIGHT`, `DARK`, and `AUTOMATIC` (OS-preference) themes.
- **Internationalization**: Support for over 100+ locales via PDF.js Fluent system.
- **Native Annotations**: Built-in editor for highlighters, free-text, ink drawings, and signatures.
- **Reactive Sync**: Properties like `page`, `zoom`, and `search` are bidirectionally synced with the viewer's internal state.

## Documentation

- **[Getting Started](./docs/tutorial-getting-started.md)**
---


### `src/PdfViewerAdvanced.ts`:

#### class: `PdfViewerAdvanced`, `pdf-viewer-advanced`

##### Fields

| Name                  | Privacy | Type                          | Default        | Description                                                                                                                                                                                                                                                   | Inherited From |
| --------------------- | ------- | ----------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| `src`                 |         | `string`                      | `''`           | URL of the PDF document to display. Supports absolute and relative paths.                                                                                                                                                                                     |                |
| `page`                |         | `string`                      | `''`           | Page number to navigate to (string, e.g. \`"5"\`). Synced via \`location.hash\`.                                                                                                                                                                              |                |
| `zoom`                |         | `string`                      | `''`           | Zoom level as percentage string (e.g. \`"150"\`) or named value&#xA;(\`"page-fit"\`, \`"page-width"\`, \`"auto"\`). Synced via \`location.hash\`.                                                                                                             |                |
| `search`              |         | `string`                      | `''`           | Text to search for within the document. Synced via \`location.hash\`.                                                                                                                                                                                         |                |
| `phrase`              |         | `string`                      | `''`           | Whether \`search\` is an exact phrase (\`"true"\`) or individual words.                                                                                                                                                                                       |                |
| `pagemode`            |         | `string`                      | `'none'`       | Sidebar mode: \`"none"\`, \`"thumbs"\`, \`"bookmarks"\`, or \`"attachments"\`.                                                                                                                                                                                |                |
| `locale`              |         | `string`                      | `''`           | BCP 47 locale for the viewer UI (e.g. \`"es"\`, \`"de"\`).&#xA;Changing this triggers a full viewer re-initialization — there is no&#xA;incremental locale update in PDF.js.                                                                                  |                |
| `viewerCssTheme`      |         | `ViewerCssThemeKey`           | `'AUTOMATIC'`  | Color theme for the viewer: \`"AUTOMATIC"\`, \`"LIGHT"\`, or \`"DARK"\`.                                                                                                                                                                                      |                |
| `iframeTitle`         |         | `string`                      | `'PDF viewer'` | Accessibility title for the \`\<iframe>\` element.                                                                                                                                                                                                            |                |
| `workerSrc`           |         | `string`                      | `''`           | Override URL for the PDF.js web worker script.                                                                                                                                                                                                                |                |
| `cMapUrl`             |         | `string`                      | `''`           | Override URL for CMap (character map) files.                                                                                                                                                                                                                  |                |
| `iccUrl`              |         | `string`                      | `''`           | Override URL for ICC color profile files.                                                                                                                                                                                                                     |                |
| `imageResourcesPath`  |         | `string`                      | `''`           | Override URL for viewer image resources.                                                                                                                                                                                                                      |                |
| `sandboxBundleSrc`    |         | `string`                      | `''`           | Override URL for the scripting sandbox bundle.                                                                                                                                                                                                                |                |
| `standardFontDataUrl` |         | `string`                      | `''`           | Override URL for standard PDF font data.                                                                                                                                                                                                                      |                |
| `wasmUrl`             |         | `string`                      | `''`           | Override URL for WebAssembly files used by PDF.js.                                                                                                                                                                                                            |                |
| `initComplete`        |         | `Promise<InitializationData>` |                | Promise that resolves when the viewer is fully initialized.&#xA;&#xA;Await this to access the PDF.js \`viewerApp\` instance:&#xA;\`\`\`ts&#xA;const {viewerApp} = await el.initComplete;&#xA;viewerApp?.eventBus.on('pagesloaded', () => { ... });&#xA;\`\`\` |                |
| `currentPage`         |         | `number`                      |                | Current visible page number (1-based). Updated via the PDF.js \`pagechanging\` event.                                                                                                                                                                         |                |
| `totalPages`          |         | `number`                      |                | Total number of pages in the loaded document. Set after the \`pagesloaded\` event.                                                                                                                                                                            |                |
| `currentZoom`         |         | `number`                      |                | Current zoom as a raw scale multiplier (e.g. \`1.5\` means 150%). Updated via \`scalechanging\`.                                                                                                                                                              |                |

##### Methods

| Name                 | Privacy | Description                                                                                                                                                                                                                                                                                                                                                                                        | Parameters                                  | Return          | Inherited From |
| -------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- | --------------- | -------------- |
| `injectViewerStyles` |         | Injects custom CSS into the viewer iframe.&#xA;&#xA;Styles survive viewer re-initialization (e.g. locale changes) — they are&#xA;stored internally and re-applied after each init cycle. Duplicate strings&#xA;are ignored.                                                                                                                                                                        | `styleText: string`                         | `Promise<void>` |                |
| `setViewerOptions`   |         | Sets PDF.js \`AppOptions\` on the viewer.&#xA;&#xA;If the viewer is already initialized, options are applied immediately.&#xA;If called before initialization completes, options are queued and applied&#xA;during the init sequence.&#xA;&#xA;\*\*Note:\*\* Some structural options (e.g. \`workerSrc\`) require a full&#xA;viewer reload to take effect. Use the dedicated attributes for those. | `options: Record<string, string \| number>` |                 |                |

##### Events

| Name           | Type                          | Description                                                                                         | Inherited From |
| -------------- | ----------------------------- | --------------------------------------------------------------------------------------------------- | -------------- |
| `viewer-error` | `CustomEvent`                 | An error occurred during initialization or PDF loading. \`event.detail\` contains the error object. |                |
| `page-change`  | `CustomEvent<{page: number}>` | The visible page changed. \`event.detail.page\` is the 1-based page number.                         |                |
| `zoom-change`  | `CustomEvent<{zoom: number}>` | The zoom level changed. \`event.detail.zoom\` is the raw scale multiplier (e.g. \`1.5\` = 150%).    |                |

##### Attributes

| Name                     | Field               | Inherited From |
| ------------------------ | ------------------- | -------------- |
| `src`                    | src                 |                |
| `page`                   | page                |                |
| `zoom`                   | zoom                |                |
| `search`                 | search              |                |
| `phrase`                 | phrase              |                |
| `pagemode`               | pagemode            |                |
| `locale`                 | locale              |                |
| `viewer-css-theme`       | viewerCssTheme      |                |
| `iframe-title`           | iframeTitle         |                |
| `worker-src`             | workerSrc           |                |
| `c-map-url`              | cMapUrl             |                |
| `icc-url`                | iccUrl              |                |
| `image-resources-path`   | imageResourcesPath  |                |
| `sandbox-bundle-src`     | sandboxBundleSrc    |                |
| `standard-font-data-url` | standardFontDataUrl |                |
| `wasm-url`               | wasmUrl             |                |

##### Slots

| Name | Description                                 |
| ---- | ------------------------------------------- |
|      | No slots — the component is self-contained. |

<hr/>

#### Exports

| Kind | Name                | Declaration       | Module                   | Package |
| ---- | ------------------- | ----------------- | ------------------------ | ------- |
| `js` | `PdfViewerAdvanced` | PdfViewerAdvanced | src/PdfViewerAdvanced.ts |         |

### `src/index.ts`:

#### Exports

| Kind | Name                 | Declaration        | Module                 | Package |
| ---- | -------------------- | ------------------ | ---------------------- | ------- |
| `js` | `PdfViewerAdvanced`  | PdfViewerAdvanced  | ./PdfViewerAdvanced.js |         |
| `js` | `ViewerCssTheme`     | ViewerCssTheme     | ./types.js             |         |
| `js` | `ViewerCssThemeKey`  | ViewerCssThemeKey  | ./types.js             |         |
| `js` | `InitializationData` | InitializationData | ./types.js             |         |
| `js` | `IframeWindow`       | IframeWindow       | ./types.js             |         |

### `src/types.ts`:

#### Variables

| Name             | Description                                                                                                                                                                                                                                                                              | Type                                |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| `ViewerCssTheme` | Numeric values for the PDF.js \`viewerCssTheme\` option.&#xA;&#xA;- \`AUTOMATIC\` (0) — follows the user's OS preference via \`prefers-color-scheme\`.&#xA;- \`LIGHT\` (1) — forces light mode regardless of OS setting.&#xA;- \`DARK\` (2) — forces dark mode regardless of OS setting. | `{AUTOMATIC: 0, LIGHT: 1, DARK: 2}` |

<hr/>

#### Exports

| Kind | Name             | Declaration    | Module       | Package |
| ---- | ---------------- | -------------- | ------------ | ------- |
| `js` | `ViewerCssTheme` | ViewerCssTheme | src/types.ts |         |

### `src/define/pdf-viewer-advanced.ts`:

#### Exports

| Kind                        | Name                  | Declaration       | Module                    | Package |
| --------------------------- | --------------------- | ----------------- | ------------------------- | ------- |
| `custom-element-definition` | `pdf-viewer-advanced` | PdfViewerAdvanced | /src/PdfViewerAdvanced.js |         |

### `src/styles/pdf-viewer-advanced-styles.css.ts`:

#### Variables

| Name     | Description | Type |
| -------- | ----------- | ---- |
| `styles` |             |      |

<hr/>

#### Exports

| Kind | Name     | Declaration | Module                                       | Package |
| ---- | -------- | ----------- | -------------------------------------------- | ------- |
| `js` | `styles` | styles      | src/styles/pdf-viewer-advanced-styles.css.ts |         |
