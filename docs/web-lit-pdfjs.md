# Domain Profile: Web Frontend - Lit + PDF.js

**Domain:** Web Frontend
**Stack:** Lit 3, Vite, TypeScript, PDF.js (pdfjs-dist)
**Standards:** Web Components, Custom Elements v1

## Selection Metadata (Operational Contract)

**Profile ID:** web-lit-pdfjs
**Match Keywords:** lit, web components, pdf, pdfjs, pdfjs-dist, vite, canvas, viewer
**Use When:** Building PDF viewers or PDF-related Web Components with Lit and PDF.js
**Do Not Use When:** Building PDF generation/server-side tools, or non-Lit frameworks
**Last Verified:** 2026-03-28

## Terminology Mapping

| Framework Term | Domain Term | Notes |
|---|---|---|
| Build/Compile | `npm run build` | Vite lib build + tsc declarations |
| Test suite | `npm test` | Vitest browser mode with Playwright |
| Dev server | `npm start` | Vite dev server + sass watcher |
| Package/dependency | npm package | |
| Import/module | ES import | .js extension required |
| Deployment | Static hosting / npm publish | |

## Verification Commands

**GATE 0 (Dependencies):**
- Command: `npm --prefix pdf-viewer-advanced/pdf-viewer-advanced install`
- Expected output: Exit 0, dependencies resolved

**GATE 1 (Scaffold):**
- Command: `npm --prefix pdf-viewer-advanced/pdf-viewer-advanced run build`
- Expected output: Exit 0, dist/ directory populated

**GATE 2 (Feature):**
- Command: `npm --prefix pdf-viewer-advanced/pdf-viewer-advanced run build`
- Expected output: Exit 0, no regressions

**GATE 3 (Tests):**
- Command: `npm --prefix pdf-viewer-advanced/pdf-viewer-advanced test`
- Expected output: All tests pass in real browser
- Coverage command: `npm --prefix pdf-viewer-advanced/pdf-viewer-advanced test -- --coverage`

**GATE 4 (Final):**
- Clean command (POSIX): `rm -rf pdf-viewer-advanced/pdf-viewer-advanced/node_modules pdf-viewer-advanced/pdf-viewer-advanced/dist && npm --prefix pdf-viewer-advanced/pdf-viewer-advanced install && npm --prefix pdf-viewer-advanced/pdf-viewer-advanced run build && npm --prefix pdf-viewer-advanced/pdf-viewer-advanced test`
- Expected output: Everything passes from clean state

## Common Pitfalls

### Pitfall 1: PDF.js render task not cancelled before reuse
- **What goes wrong:** Canvas is reused for a new render while previous render is still in progress. This causes "Cannot use the same canvas during multiple render() operations" error.
- **Correct approach:** Always `await previousRenderTask.cancel()` and wait for the render promise to settle (resolve or reject) before starting a new render on the same canvas.
- **Detection:** `grep -r "render(" src/ | grep -v "cancel"` — verify every render call site has cancellation logic nearby.

### Pitfall 2: PDF.js worker not configured
- **What goes wrong:** PDF.js falls back to main-thread parsing, blocking the UI. No explicit error, just poor performance.
- **Correct approach:** Set `GlobalWorkerOptions.workerSrc` before calling `getDocument()`. Use the worker file from `pdfjs-dist/build/pdf.worker.min.mjs`.
- **Detection:** `grep -r "GlobalWorkerOptions" src/` — must find at least one result.

### Pitfall 3: Missing .js extensions in imports
- **What goes wrong:** TypeScript builds succeed but runtime fails because ES modules require explicit `.js` extensions.
- **Correct approach:** Always use `.js` extension in import paths, even for `.ts` files.
- **Detection:** `grep -rn "from '\.\." src/ | grep -v "\.js'" | grep -v "\.css'"` — should return no results.

### Pitfall 4: Canvas size not matching viewport dimensions
- **What goes wrong:** PDF renders blurry or at wrong scale because canvas pixel dimensions don't match the PDF.js viewport.
- **Correct approach:** Set `canvas.width = viewport.width` and `canvas.height = viewport.height` before render.
- **Detection:** Grep for `viewport.width` and `canvas.width` assignments near render calls.

### Pitfall 5: Text layer positioned incorrectly
- **What goes wrong:** Text selection doesn't align with visible text because text layer div isn't positioned/scaled correctly relative to canvas.
- **Correct approach:** Apply the same viewport transform to the text layer container. Set its dimensions to match the viewport, and use CSS `transform: scale()` if using a different resolution.
- **Detection:** Visual inspection — select text and verify highlight aligns with visible text.

### Pitfall 6: Annotation layer events interfere with text selection
- **What goes wrong:** When annotation tool is active, text selection breaks, or vice versa.
- **Correct approach:** Use pointer-events CSS property to toggle which layer receives events based on active tool mode.
- **Detection:** Manual testing — verify text selection works when no annotation tool is active.
+
+### Pitfall 10: Race condition between iframe load and engine start
+- **What goes wrong:** PDF.js `webViewerLoad` starts executing before the host finishes injecting options via `.set()`, leading to default settings (wrong locale, missing cmaps) being used during initial load.
+- **Correct approach:** Use the **Setter Trap** pattern: define a property setter for `PDFViewerApplicationOptions` on the iframe window *before* injecting scripts. This ensures synchronous capture of the options object as soon as the engine tries to access it.
+- **Detection:** Check if `PdfViewerAdvanced.ts` uses `Object.defineProperty(window, 'PDFViewerApplicationOptions', ...)` inside the injection logic.

## Adversary Questions

- "What happens if the PDF URL returns a 404 or CORS error?"
- "What happens if a render is cancelled mid-operation and a new render starts immediately?"
- "What happens when the user rapidly clicks next/previous page?"
- "What happens when zoom changes while a render is in progress?"
- "What happens with a 500-page PDF — does initial load attempt to render all pages?"
- "What happens if the canvas element is resized while rendering?"
- "What if the PDF has no text content — does the text layer error?"
- "What happens when the user switches tools while mid-annotation?"

## Integration Rules

### Data Flow: PDF.js → Lit Component
- PDF.js `getDocument()` returns a proxy; page rendering is async via `page.render()`
- RenderTask has a `.promise` property — always await it
- Cancel previous render before starting new one on same canvas

### Data Flow: Viewer EventBus → Lit Reactive State
- PDF.js viewer emits events on its internal `eventBus` (e.g. `pagechanging`, `scalechanging`, `pagesloaded`)
- The component listens to these events and maps them to `@state()` properties with deduplication
- Each `@state()` property has a read-only public getter (e.g. `currentPage`, `currentZoom`, `totalPages`)
- State changes emit corresponding DOM events on the host (`page-change`, `zoom-change`) so consumers can listen
- Pattern: `eventBus.on('event') → deduplicate → @state update → CustomEvent dispatch`

### Data Flow: Lit Properties → Viewer (Sync Strategy)
- `page`, `zoom`, `search`, `phrase`, `pagemode`: synced via `location.hash` — PDF.js parses hash on `hashchange`.
- `src`: synced via direct API call `PDFViewerApplication.open({url})` with stale-load guard.
- `viewerCssTheme`: synced via `PDFViewerApplicationOptions.set()` + DOM `color-scheme`.
- `locale`: triggers full viewer re-initialization. Requires both `localeProperties` AppOption and a resolved `<link rel="resource" type="application/l10n">` tag in the HTML to avoid 404s for localization assets in `srcdoc`.
+
+### Initialization Strategy: The Setter Trap
+To avoid race conditions where the engine starts before properties are set:
+1. The host component defines a setter on `window.PDFViewerApplicationOptions`.
+2. When the engine's `viewer.mjs` initializing code assigns to this property, the trap intercepts it.
+3. The trap immediately injects all default/reactive properties into the options object synchronously.
+4. This guarantees that `webViewerLoad()` sees the correct configuration from the very first frame.

### Data Flow: Annotation State → Rendering
- Native PDF.js annotation editor handles annotation state internally
- Annotation changes are persisted via `pdfDocument.saveDocument()` on download

### Build Scoping
- PDF.js worker file must be copied to build output or served separately
- Vite config needs to handle the worker import properly

## Automated Checks

| Check | Command | Expected Result |
|-------|---------|-----------------|
| Worker configured | `grep -r "GlobalWorkerOptions" src/` | At least one result |
| No missing .js extensions | `grep -rn "from '\.\." src/ \| grep -v "\.js'" \| grep -v "\.css'"` | No results |
| Render cancellation exists | `grep -r "cancel" src/ \| grep -i "render"` | At least one result |
| viewer.html tags stripped | `grep -E "replace.*(pdf\.mjs\|viewer\.mjs\|locale\.json\|viewer\.css)" src/PdfViewerAdvanced.ts` | 4 successful matches in replacement chain |
| dist/ viewer assets present | `ls dist/viewer/build/pdf.worker.mjs dist/viewer/web/locale/locale.json` | Both files exist |

### Pitfall 7: Viewer assets bundled in TypeScript/coverage scope
- **What goes wrong:** TypeScript errors on bundled .mjs files; coverage includes 2MB+ of vendor code, skewing metrics.
- **Correct approach:** Exclude `src/viewer/**` from `tsconfig.json` and coverage config.
- **Detection:** Check tsconfig `exclude` and vite.config coverage `exclude` arrays.

### Pitfall 8: Relative URLs fail inside srcdoc iframe
- **What goes wrong:** Resources (PDF, cmaps, fonts, wasm) referenced with relative paths resolve against `about:srcdoc` which has no base URL.
- **Correct approach:** Resolve all resource URLs to absolute paths using `new URL(path, import.meta.url).href` before passing to PDFViewerApplicationOptions. Resolve PDF src with `new URL(path, document.baseURI).href`.
- **Detection:** Load a PDF via relative src and check browser network tab for failed requests.

### Pitfall 9: Manual Engine Updates
- **What goes wrong:** Overwriting the `src/viewer` folder manually will delete the `themes/` folder.
- **Correct approach:** Always use `npm run update:pdfjs` (which uses `scripts/update-pdfjs.js`). This script updates the PDF.js core from GitHub while preserving local themes.
- **Detection:** Run the update script and verify that `src/viewer/build/` is updated and `src/viewer/themes/` is preserved.

### Pitfall 12: Reactive Options
- **What goes wrong:** PDF.js `AppOptions` are partially reactive.
- **Correct approach:** While `setViewerOptions` now applies them immediately, some structural options (like `workerSrc`) still require a viewer reload to take effect.
- **Detection:** Test changes to `AppOptions` and observe if they take effect without a full viewer reload.

### Pitfall 13: Viewer HTML contains link tags that resolve against srcdoc
- **What goes wrong:** The official `viewer.html` includes `<link href="viewer.css">` and `<link rel="resource" href="locale/locale.json">`. When loaded via srcdoc iframe, these resolve against `about:srcdoc` and produce 404 errors.
- **Correct approach:** Strip these link tags from the HTML before injecting into the iframe, since the CSS and locale are already handled via inline injection (`?inline` import) and `localeProperties` AppOption respectively.
- **Detection:** Open the viewer and check browser console for 404 errors on `viewer.css` or `locale.json`.

### Pitfall 14: dist/ missing runtime assets loaded via import.meta.url
- **What goes wrong:** `vite build --lib` only bundles TypeScript/JS source. Assets loaded at runtime via `new URL('./path', import.meta.url)` (worker, cmaps, fonts, locale, annotation extension) are not included in `dist/`. Consumers installing from npm get 404 errors.
- **Correct approach:** Use `rollup-plugin-copy` in the lib build config to copy all viewer assets referenced by `import.meta.url` to `dist/viewer/`. Exclude `.map` files and files already inlined by Vite (`viewer.html`, `viewer.css`, `viewer.mjs`, `pdf.mjs`).
- **Detection:** After `build:lib`, verify `dist/viewer/` contains `build/pdf.worker.mjs`, `web/cmaps/`, `web/locale/`.

## Decision History

| Date | Decision | Context | Constraint |
|------|----------|---------|------------|
| 2026-03-25 | PDF.js worker must be explicitly configured | Main-thread parsing blocks UI | MUST set GlobalWorkerOptions.workerSrc |
| 2026-03-25 | Render cancellation is mandatory | Canvas reuse crashes without it | MUST cancel previous render before starting new one |
| 2026-03-25 | Iframe-wrapping official viewer preferred over custom rendering | Custom rendering requires reimplementing all viewer features | v2 approach wraps full viewer in iframe |
| 2026-03-28 | Use native PDF.js annotation editor instead of extension | Native editor covers highlight, freetext, ink, stamp, signature with zero extra dependencies | Removed pdfjs-annotation-extension (v2.5) |
| 2026-03-25 | All resource URLs must be resolved to absolute paths | srcdoc iframe has no base URL | Use import.meta.url for viewer assets, document.baseURI for PDF src |
| 2026-03-27 | Automated Update Suite | Automated update for PDF.js Core from GitHub | Single script maintains engine currency while preserving themes |
| 2026-03-27 | Strip viewer.html link tags in srcdoc | viewer.css and locale.json links produce 404 in srcdoc iframe | CSS is inline-injected; locale via AppOptions |
| 2026-03-27 | Copy viewer assets to dist/ via rollup-plugin-copy | lib build excludes runtime assets loaded by import.meta.url | dist/ must be self-contained for npm consumers |
| 2026-04-01 | Use Setter Trap for sync configuration | AppOptions.set() is async relative to boot | Captured engine configuration via window property trap |
| 2026-04-01 | Absolute resolution for locale.json resource | rel="resource" links resolve against about:srcdoc | Replaced link tag with absolute URL via import.meta.url |

## Review Checklist

- [ ] PDF.js worker is configured before first getDocument() call
- [ ] Every render() call has corresponding cancellation logic
- [ ] Canvas dimensions match viewport dimensions before render
- [ ] Text layer is properly positioned relative to canvas
- [ ] Annotation state is separate from PDF rendering state
- [ ] Lazy rendering — only visible pages are rendered
- [ ] No jsdom usage in tests
- [ ] Import paths use .js extensions

## Constraints and Standards

- Target browsers: Chrome 71+, Safari/WebKit (as per Vitest browser config)
- Web Components v1 / Custom Elements v1
- Shadow DOM encapsulation
- ES2023 target
