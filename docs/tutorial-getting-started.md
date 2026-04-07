# Installation

```js
npm install   @blockquote-web-components/pdf-viewer-advanced
```

## How to use with Lit

The component is built for standard Web Components and works perfectly with [Lit](https://lit.dev).

```ts
import '@blockquote-web-components/pdf-viewer-advanced/pdf-viewer-advanced.js';
import {html, LitElement} from 'lit';

export class MyComponent extends LitElement {
  render() {
    return html`
      <pdf-viewer-advanced
        src="/pdfs/report.pdf"
        page="3"
        zoom="page-width"
        viewer-css-theme="DARK"
        @page-change=${(e) => console.log('Current page:', e.detail.page)}
      ></pdf-viewer-advanced>
    `;
  }
}
```

## How to programmatically control navigation

Modify properties on the element to trigger navigation. These changes are synchronized via the internal PDF.js hash system.

```js
const viewer = document.querySelector('pdf-viewer-advanced');

async function jumpToPage() {
  // Always wait for initialization before hardware-interacting with the viewer
  await viewer.initComplete;

  viewer.page = '10';
  viewer.zoom = '200';
  viewer.search = 'conclusion';
}
```

## How to style the internal viewer

Since the viewer is isolated in a `srcdoc` iframe, use the `injectViewerStyles` method to pass CSS into the sandbox.

```js
const viewer = document.querySelector('pdf-viewer-advanced');

async function customizeInterface() {
  await viewer.initComplete;

  await viewer.injectViewerStyles(`
    .toolbar {
      background-color: #2c3e50 !important;
    }
    #viewerContainer {
      background-color: #ecf0f1;
    }
  `);
}
```

## How to pass advanced PDF.js options

For settings that don't have dedicated attributes (like `scrollModeOnLoad`), use `setViewerOptions`.

```js
const viewer = document.querySelector('pdf-viewer-advanced');

viewer.setViewerOptions({
  scrollModeOnLoad: 1, // 0: None, 1: Vertical, 2: Horizontal, 3: Wrapped
  spreadModeOnLoad: 0, // 0: None, 1: Odd, 2: Even
});
```
