import {html, LitElement} from 'lit';
import {property, state} from 'lit/decorators.js';
import {styles} from './styles/pdf-viewer-advanced-styles.css.js';
import {
  ViewerCssTheme,
  type ViewerCssThemeKey,
  type IframeWindow,
  type PdfjsViewerIframe,
  type InitializationData,
} from './types.js';

/** @internal Default property values used as fallbacks in hash construction. */
const DEFAULTS = {
  src: '',
  iframeTitle: 'PDF viewer',
  page: '',
  search: '',
  phrase: '',
  zoom: '',
  pagemode: 'none',
  locale: '',
  viewerCssTheme: 'AUTOMATIC' as ViewerCssThemeKey,
} as const;

/**
 * ![Lit](https://img.shields.io/badge/lit-3.0.0-blue.svg)
 *
 * `blockquote-pdf-viewer-advanced` A Web Component that wraps the official
 * [PDF.js](https://mozilla.github.io/pdf.js/) viewer inside a sandboxed `srcdoc` iframe, exposing a declarative Lit property interface on top.
 *
 * ```js
 * import '@blockquote-web-components/pdf-viewer-advanced/pdf-viewer-advanced.js';
 * import {html, LitElement} from 'lit';
 *
 * export class MyPdfApp extends LitElement {
 *   render() {
 *     return html`
 *       <pdf-viewer-advanced
 *         src="/assets/manual.pdf"
 *         page="1"
 *         locale="de"
 *         viewer-css-theme="DARK"
 *       ></pdf-viewer-advanced>
 *     `;
 *   }
 * }
 * ```
 *
 * ### Using with Vanilla JS
 *
 * Register the component via a script tag and use it like any standard HTML element.
 *
 * ```html
 * <script
 *   type="module"
 *   src="node_modules/@blockquote-web-components/pdf-viewer-advanced/pdf-viewer-advanced.js"
 * ></script>
 *
 * <pdf-viewer-advanced id="myViewer" src="sample.pdf"></pdf-viewer-advanced>
 *
 * <script>
 *   const viewer = document.getElementById('myViewer');
 *   viewer.addEventListener('page-change', (e) => {
 *     console.log('Navigated to page:', e.detail.page);
 *   });
 *
 *   // Programmatic control after initialization
 *   viewer.initComplete.then(() => {
 *     viewer.page = '5';
 *     viewer.zoom = '200';
 *   });
 * </script>
 * ```
 *
 * ## Key Features
 *
 * - **Total Isolation**: Uses a sandboxed `srcdoc` iframe. Your app's CSS cannot leak into the viewer, and vice versa.
 * - **Modern Theming**: Support for `LIGHT`, `DARK`, and `AUTOMATIC` (OS-preference) themes.
 * - **Internationalization**: Support for over 100+ locales via PDF.js Fluent system.
 * - **Native Annotations**: Built-in editor for highlighters, free-text, ink drawings, and signatures.
 * - **Reactive Sync**: Properties like `page`, `zoom`, and `search` are bidirectionally synced with the viewer's internal state.
 *
 * ## Documentation
 *
 * - **[Getting Started](./docs/tutorial-getting-started.md)**
 * ---
 *
 * @element pdf-viewer-advanced
 * @slot - No slots — the component is self-contained.
 *
 * @attribute {string} src - URL of the PDF to display (absolute or relative).
 * @attribute {string} page - Page number to navigate to (e.g. `"5"`).
 * @attribute {string} zoom - Zoom level as percentage (e.g. `"150"`) or named
 *   value (`"page-fit"`, `"page-width"`, `"auto"`).
 * @attribute {string} search - Text to search for in the document.
 * @attribute {string} phrase - Whether the search term is an exact phrase (`"true"` / `"false"`).
 * @attribute {string} pagemode - Sidebar mode: `"none"`, `"thumbs"`, `"bookmarks"`, `"attachments"`.
 * @attribute {string} locale - BCP 47 locale for the viewer UI (e.g. `"es"`, `"de"`, `"ja"`).
 *   Changing this at runtime triggers a full viewer re-initialization.
 * @attribute {string} viewer-css-theme - Color theme: `"AUTOMATIC"`, `"LIGHT"`, or `"DARK"`.
 * @attribute {string} iframe-title - Accessibility title for the iframe element.
 * @attribute {string} worker-src - Custom URL for the PDF.js worker script.
 * @attribute {string} c-map-url - Custom URL for CMap files.
 * @attribute {string} icc-url - Custom URL for ICC profile files.
 * @attribute {string} image-resources-path - Custom URL for viewer images.
 * @attribute {string} sandbox-bundle-src - Custom URL for the sandbox bundle.
 * @attribute {string} standard-font-data-url - Custom URL for standard fonts.
 * @attribute {string} wasm-url - Custom URL for WebAssembly files.
 *
 * @fires {CustomEvent<{page: number}>} page-change - The visible page changed.
 *   `event.detail.page` is the 1-based page number.
 * @fires {CustomEvent<{zoom: number}>} zoom-change - The zoom level changed.
 *   `event.detail.zoom` is the raw scale multiplier (e.g. `1.5` = 150%).
 * @fires {CustomEvent} viewer-error - An error occurred during initialization
 *   or PDF loading. `event.detail` contains the error object.
 */
export class PdfViewerAdvanced extends LitElement {
  static override styles = [styles];

  /** URL of the PDF document to display. Supports absolute and relative paths. */
  @property({type: String})
  src = '';

  /** Page number to navigate to (string, e.g. `"5"`). Synced via `location.hash`. */
  @property({type: String})
  page = '';

  /**
   * Zoom level as percentage string (e.g. `"150"`) or named value
   * (`"page-fit"`, `"page-width"`, `"auto"`). Synced via `location.hash`.
   */
  @property({type: String})
  zoom = '';

  /** Text to search for within the document. Synced via `location.hash`. */
  @property({type: String})
  search = '';

  /** Whether `search` is an exact phrase (`"true"`) or individual words. */
  @property({type: String})
  phrase = '';

  /** Sidebar mode: `"none"`, `"thumbs"`, `"bookmarks"`, or `"attachments"`. */
  @property({type: String})
  pagemode = 'none';

  /**
   * BCP 47 locale for the viewer UI (e.g. `"es"`, `"de"`).
   * Changing this triggers a full viewer re-initialization — there is no
   * incremental locale update in PDF.js.
   */
  @property({type: String})
  locale = '';

  /** Color theme for the viewer: `"AUTOMATIC"`, `"LIGHT"`, or `"DARK"`. */
  @property({type: String, attribute: 'viewer-css-theme'})
  viewerCssTheme: ViewerCssThemeKey = 'AUTOMATIC';

  /** Accessibility title for the `<iframe>` element. */
  @property({type: String, attribute: 'iframe-title'})
  iframeTitle = 'PDF viewer';

  /** Override URL for the PDF.js web worker script. */
  @property({type: String, attribute: 'worker-src'})
  workerSrc = '';

  /** Override URL for CMap (character map) files. */
  @property({type: String, attribute: 'c-map-url'})
  cMapUrl = '';

  /** Override URL for ICC color profile files. */
  @property({type: String, attribute: 'icc-url'})
  iccUrl = '';

  /** Override URL for viewer image resources. */
  @property({type: String, attribute: 'image-resources-path'})
  imageResourcesPath = '';

  /** Override URL for the scripting sandbox bundle. */
  @property({type: String, attribute: 'sandbox-bundle-src'})
  sandboxBundleSrc = '';

  /** Override URL for standard PDF font data. */
  @property({type: String, attribute: 'standard-font-data-url'})
  standardFontDataUrl = '';

  /** Override URL for WebAssembly files used by PDF.js. */
  @property({type: String, attribute: 'wasm-url'})
  wasmUrl = '';

  /** @internal Reactive state — current page reported by the viewer. */
  @state()
  private _currentPage = 1;

  /** @internal Reactive state — total page count after document load. */
  @state()
  private _totalPages = 0;

  /** @internal Reactive state — current zoom scale (raw multiplier, e.g. 1.5 = 150%). */
  @state()
  private _currentZoom = 0;

  /** @internal Whether the viewer has completed initialization and is ready for property syncs. */
  private _ready = false;

  /** @internal Reference to the viewer iframe element. */
  #iframe: PdfjsViewerIframe | null = null;

  /** @internal Accumulated custom CSS strings to inject into the viewer iframe. */
  #viewerStyles = new Set<string>();

  /** @internal Options queued before initialization, flushed during init. */
  #optionsToSet: Record<string, string | number> = {};

  /** @internal Handler reference for cleanup of `pagechanging` eventBus listener. */
  #pageChangeHandler: ((evt: Record<string, unknown>) => void) | null = null;

  /**
   * @internal Symbol token for stale-load detection.
   * When `src` changes rapidly, only the most recent load proceeds.
   */
  #currentSrcLoad: symbol | null = null;

  /**
   * Promise that resolves when the viewer is fully initialized.
   *
   * Await this to access the PDF.js `viewerApp` instance:
   * ```ts
   * const {viewerApp} = await el.initComplete;
   * viewerApp?.eventBus.on('pagesloaded', () => { ... });
   * ```
   */
  initComplete: Promise<InitializationData> = Promise.resolve({});

  override render() {
    return html`
      <div class="viewer-container">
        <div class="iframe-wrapper">
          <iframe loading="lazy" title="${this.iframeTitle}"></iframe>
        </div>
      </div>
    `;
  }

  override firstUpdated() {
    this.#iframe = this.shadowRoot?.querySelector('iframe') as PdfjsViewerIframe;
    if (this.#iframe) {
      this.initComplete = this.#bootViewerApp().catch((error) => {
        this.dispatchEvent(new CustomEvent('viewer-error', {detail: error, bubbles: true}));
        throw error;
      });
    }
  }

  override updated(props: Map<PropertyKey, unknown>) {
    super.updated(props);
    if (!this.#iframe) {
      return;
    }

    // Fire-and-forget — don't block the sync update cycle.
    // #handleSrcChange has its own stale-load guard for rapid changes.
    if (props.has('src') && this._ready) {
      this.#handleSrcChange().catch((error) => {
        this.dispatchEvent(new CustomEvent('viewer-error', {detail: error, bubbles: true}));
      });
    }

    if (props.has('viewerCssTheme') && this._ready) {
      this.#applyViewerTheme();
    }

    if (props.has('locale') && props.get('locale') !== undefined && this._ready) {
      this.initComplete = this.#bootViewerApp().catch((error) => {
        this.dispatchEvent(new CustomEvent('viewer-error', {detail: error, bubbles: true}));
        throw error;
      });
    }

    const hashAttrs = ['page', 'zoom', 'search', 'phrase', 'pagemode'] as const;
    if (hashAttrs.some((a) => props.has(a)) && this._ready) {
      this.#syncNavigationState();
    }
  }

  /**
   * @internal Full initialization sequence for the PDF.js viewer.
   *
   * 1. Bootstrap the iframe sandbox with HTML and CSS.
   * 2. Sync initial navigation state before scripts load.
   * 3. Inject PDF.js engines and wait for standard globals.
   * 4. Configure AppOptions with component attributes.
   * 5. Await initializedPromise.
   * 6. Attach reactive listeners.
   */
  async #bootViewerApp(): Promise<InitializationData> {
    if (!this.#iframe) {
      return {};
    }

    this._ready = false;

    await this.#bootIframe();

    // Apply hash before scripts
    this.#syncNavigationState();

    const viewerApp = await this.#injectPdfjsEngine();

    // Wait for initialization
    await viewerApp?.initializedPromise;

    // Apply queued runtime styles
    this.#viewerStyles.forEach((s) => this.#appendRuntimeStyle(s));

    // Listen for page changes
    this.#attachViewerListeners(viewerApp);

    this._ready = true;

    return {viewerApp};
  }

  /** @internal */
  async #bootIframe() {
    // Build the srcdoc HTML
    const [viewerHtml, viewerCss, themeCSS] = await Promise.all([
      import('./viewer/web/viewer.html?raw'),
      import('./viewer/web/viewer.css?inline'),
      import('./styles/pdf-viewer-advanced-theme.css?inline'),
    ]);

    const injectedStyles = [
      `<style>${viewerCss.default}</style>`,
      `<style>${themeCSS.default}</style>`,
      ...Array.from(this.#viewerStyles).map((s) => `<style>${s}</style>`),
    ].join('\n');

    const resolvedLocaleUrl = new URL(
      /* @vite-ignore */ './viewer/web/locale/locale.json',
      import.meta.url
    ).href;

    // Strip internal script/link tags from official viewer.html since we inject them manually
    // with different resolution logic or we handle them via AppOptions.
    const completeHtml = (viewerHtml.default as string)
      .replace(/<script[^>]*src=[^>]*pdf\.mjs[^>]*><\/script>/g, '')
      .replace(/<script[^>]*src=[^>]*viewer\.mjs[^>]*><\/script>/g, '')
      .replace(
        /<link[^>]*rel="resource"[^>]*href=[^>]*locale\.json[^>]*>/g,
        `<link rel="resource" type="application/l10n" href="${resolvedLocaleUrl}">`
      )
      .replace(/<link[^>]*href="viewer\.css"[^>]*\/>/g, '')
      .replace('</head>', `${injectedStyles}</head>`);

    // Set iframe content
    await new Promise<void>((resolve) => {
      this.#iframe!.addEventListener('load', () => resolve(), {once: true});
      this.#iframe!.srcdoc = completeHtml;
    });
  }

  /** @internal */
  async #injectPdfjsEngine() {
    // Inject PDF.js scripts
    const [pdfBuild, viewerBuild] = await Promise.all([
      import('./viewer/build/pdf.mjs?raw'),
      import('./viewer/web/viewer.mjs?raw'),
    ]);

    this.#injectScript(pdfBuild.default as string);
    this.#injectScript(viewerBuild.default as string);

    // Wait for PDFViewerApplication
    return await this.#onViewerAppCreated();
  }

  /** @internal */
  #configureViewerDefaults() {
    // Resolve resource URLs against import.meta.url so they work inside srcdoc iframe
    const workerSrc =
      this.workerSrc ||
      new URL(/* @vite-ignore */ './viewer/build/pdf.worker.mjs', import.meta.url).href;
    const cMapUrl =
      this.cMapUrl || new URL(/* @vite-ignore */ './viewer/web/cmaps/', import.meta.url).href;
    const iccUrl =
      this.iccUrl || new URL(/* @vite-ignore */ './viewer/web/iccs/', import.meta.url).href;
    const imageResourcesPath =
      this.imageResourcesPath ||
      new URL(/* @vite-ignore */ './viewer/web/images/', import.meta.url).href;
    const standardFontDataUrl =
      this.standardFontDataUrl ||
      new URL(/* @vite-ignore */ './viewer/web/standard_fonts/', import.meta.url).href;
    const wasmUrl =
      this.wasmUrl || new URL(/* @vite-ignore */ './viewer/web/wasm/', import.meta.url).href;
    const sandboxBundleSrc = this.sandboxBundleSrc || '';

    const viewerOptions = this.#iframe!.contentWindow?.PDFViewerApplicationOptions;
    viewerOptions?.set('workerSrc', workerSrc);
    viewerOptions?.set('cMapUrl', cMapUrl);
    viewerOptions?.set('iccUrl', iccUrl);
    viewerOptions?.set('imageResourcesPath', imageResourcesPath);
    viewerOptions?.set('standardFontDataUrl', standardFontDataUrl);
    viewerOptions?.set('wasmUrl', wasmUrl);
    if (sandboxBundleSrc) {
      viewerOptions?.set('sandboxBundleSrc', sandboxBundleSrc);
    }
    viewerOptions?.set('defaultUrl', this.#getFullPath(this.src || DEFAULTS.src));
    viewerOptions?.set('disablePreferences', true);
    viewerOptions?.set('eventBusDispatchToDOM', true);
    viewerOptions?.set('localeProperties', {lang: this.locale || DEFAULTS.locale});
    viewerOptions?.set('viewerCssTheme', this.#getCssThemeValue());

    for (const [key, value] of Object.entries(this.#optionsToSet)) {
      viewerOptions?.set(key, value);
    }
    this.#optionsToSet = {};
  }

  /** @internal */
  #attachViewerListeners(viewerApp: IframeWindow['PDFViewerApplication'] | undefined) {
    if (!viewerApp?.eventBus) {
      return;
    }

    if (this.#pageChangeHandler) {
      viewerApp.eventBus.off('pagechanging', this.#pageChangeHandler);
    }

    this.#pageChangeHandler = (evt) => {
      const pageNumber = evt.pageNumber as number;
      if (pageNumber && pageNumber !== this._currentPage) {
        this._currentPage = pageNumber;
        this.dispatchEvent(
          new CustomEvent('page-change', {detail: {page: pageNumber}, bubbles: true})
        );
      }
    };

    viewerApp.eventBus.on('pagechanging', this.#pageChangeHandler);

    viewerApp.eventBus.on('pagesloaded', (evt) => {
      this._totalPages = (evt.pagesCount as number) || 0;
    });

    viewerApp.eventBus.on('scalechanging', (evt) => {
      const scale = evt.scale as number;
      if (scale && scale !== this._currentZoom) {
        this._currentZoom = scale;
        this.dispatchEvent(new CustomEvent('zoom-change', {detail: {zoom: scale}, bubbles: true}));
      }
    });
  }

  /**
   * @internal Waits for PDF.js to create `PDFViewerApplicationOptions` on the iframe's window.
   *
   * Uses a configurable property descriptor as a one-shot trap: when PDF.js
   * assigns the global, the setter fires, configures defaults synchronously
   * before PDF.js `webViewerLoad` runs, resolves the promise with `PDFViewerApplication`,
   * then replaces itself with a plain data property so subsequent reads/writes work normally.
   */
  #onViewerAppCreated(): Promise<IframeWindow['PDFViewerApplication']> {
    return new Promise((resolve) => {
      const contentWindow = this.#iframe!.contentWindow as IframeWindow;
      if (contentWindow.PDFViewerApplicationOptions) {
        this.#configureViewerDefaults();
        resolve(contentWindow.PDFViewerApplication!);
        return;
      }

      let appOptionsValue: IframeWindow['PDFViewerApplicationOptions'] | undefined;

      Object.defineProperty(contentWindow, 'PDFViewerApplicationOptions', {
        get() {
          return appOptionsValue;
        },
        set: (value: IframeWindow['PDFViewerApplicationOptions']) => {
          appOptionsValue = value;
          // Replace trap with plain property for normal operation
          delete contentWindow.PDFViewerApplicationOptions;
          contentWindow.PDFViewerApplicationOptions = value;

          // Configure defaults synchronously before viewer.mjs executes webViewerLoad
          this.#configureViewerDefaults();

          resolve(contentWindow.PDFViewerApplication!);
        },
        configurable: true,
      });
    });
  }

  /** @internal */
  #injectScript(content: string, type = 'module') {
    const doc = this.#iframe?.contentDocument;
    if (!doc) {
      return;
    }
    if (!doc.head) {
      const head = doc.createElement('head');
      doc.documentElement?.prepend(head);
    }
    const script = document.createElement('script');
    script.type = type;
    script.textContent = content;
    doc.head?.appendChild(script);
  }

  /** @internal */
  #getIframeLocationHash(): string {
    const params: Record<string, string> = {
      page: this.page || DEFAULTS.page,
      zoom: this.zoom || DEFAULTS.zoom,
      pagemode: this.pagemode || DEFAULTS.pagemode,
      search: this.search || DEFAULTS.search,
      phrase: this.phrase || DEFAULTS.phrase,
    };

    return (
      '#' +
      Object.entries(params)
        .filter(([, v]) => v)
        .map(([k, v]) => `${k}=${v}`)
        .join('&')
    );
  }

  /** @internal */
  #syncNavigationState() {
    if (!this.#iframe?.contentWindow) {
      return;
    }
    // console.info('syncNavigationState', this.#getIframeLocationHash());
    this.#iframe.contentWindow.location.hash = this.#getIframeLocationHash();
  }

  /**
   * @internal Opens a new PDF when `src` changes at runtime.
   *
   * Uses a Symbol token to guard against stale loads: if `src` changes
   * again while awaiting `initializedPromise`, the earlier load is discarded.
   */
  async #handleSrcChange() {
    const viewerApp = this.#iframe?.contentWindow?.PDFViewerApplication;
    if (!viewerApp) {
      return;
    }

    const currentLoad = Symbol('src');
    this.#currentSrcLoad = currentLoad;

    await viewerApp.initializedPromise;

    // Stale load guard — a newer src change has superseded this one
    if (this.#currentSrcLoad !== currentLoad) {
      return;
    }

    const url = this.#getFullPath(this.src || DEFAULTS.src);
    if (url) {
      viewerApp.open({url});
    }
  }

  /** @internal */
  #applyViewerTheme() {
    const theme = this.#getCssThemeValue();
    const viewerOptions = this.#iframe?.contentWindow?.PDFViewerApplicationOptions;
    viewerOptions?.set('viewerCssTheme', theme);

    const doc = this.#iframe?.contentDocument;
    if (!doc?.documentElement) {
      return;
    }

    const mode =
      theme === ViewerCssTheme.LIGHT ? 'light' : theme === ViewerCssTheme.DARK ? 'dark' : '';
    if (mode) {
      doc.documentElement.style.setProperty('color-scheme', mode);
    } else {
      doc.documentElement.style.removeProperty('color-scheme');
    }
  }

  /** @internal */
  #getCssThemeValue(): number {
    return Object.keys(ViewerCssTheme).includes(this.viewerCssTheme)
      ? ViewerCssTheme[this.viewerCssTheme]
      : ViewerCssTheme[DEFAULTS.viewerCssTheme];
  }

  /** @internal */
  #getFullPath(path: string): string {
    if (!path) {
      return path;
    }
    try {
      return new URL(path, document.baseURI).href;
    } catch {
      return path;
    }
  }

  /** @internal */
  #appendRuntimeStyle(styleText: string) {
    const doc = this.#iframe?.contentDocument;
    if (!doc?.head || !styleText) {
      return;
    }

    const exists = Array.from(doc.querySelectorAll('style')).some(
      (node) => node.textContent === styleText
    );
    if (exists) {
      return;
    }

    const styleEl = doc.createElement('style');
    styleEl.setAttribute('data-runtime-style', 'true');
    styleEl.textContent = styleText;
    doc.head.appendChild(styleEl);
  }

  // ── Public API ─────────────────────────────────────────

  /**
   * Injects custom CSS into the viewer iframe.
   *
   * Styles survive viewer re-initialization (e.g. locale changes) — they are
   * stored internally and re-applied after each init cycle. Duplicate strings
   * are ignored.
   *
   * @param styleText - Raw CSS string to inject (not a URL).
   *
   * @example
   * ```ts
   * await viewer.initComplete;
   * viewer.injectViewerStyles(`
   *   #toolbarContainer {
   *     opacity:  0.2 !important;
   *   }
   * `);
   * ```
   */
  async injectViewerStyles(styleText: string): Promise<void> {
    if (!styleText) {
      return;
    }
    this.#viewerStyles.add(styleText);
    this.#appendRuntimeStyle(styleText);
  }

  /**
   * Sets PDF.js `AppOptions` on the viewer.
   *
   * If the viewer is already initialized, options are applied immediately.
   * If called before initialization completes, options are queued and applied
   * during the init sequence.
   *
   * **Note:** Some structural options (e.g. `workerSrc`) require a full
   * viewer reload to take effect. Use the dedicated attributes for those.
   *
   * @param options - Key-value pairs matching PDF.js `AppOptions` names.
   * @returns The `PDFViewerApplicationOptions` reference after init completes.
   *
   * @example
   * ```ts
   * await viewer.initComplete;
   * viewer.setViewerOptions({
   *   scrollModeOnLoad: 1, // vertical scrolling
   *   spreadModeOnLoad: 0, // no spreads
   *   sidebarViewOnLoad: 0, // no sidebar
   * });
   * ```
   */
  async setViewerOptions(
    options: Record<string, string | number> = {}
  ): Promise<{viewerOptions: IframeWindow['PDFViewerApplicationOptions'] | undefined}> {
    const viewerOptions = this.#iframe?.contentWindow?.PDFViewerApplicationOptions;

    if (this._ready && viewerOptions) {
      // Apply immediately if viewer is ready
      for (const [key, value] of Object.entries(options)) {
        viewerOptions.set(key, value);
      }
    } else {
      // Queue for initialization
      this.#optionsToSet = {...this.#optionsToSet, ...options};
    }

    await this.initComplete;
    return {
      viewerOptions: this.#iframe?.contentWindow?.PDFViewerApplicationOptions,
    };
  }

  /** Current visible page number (1-based). Updated via the PDF.js `pagechanging` event. */
  get currentPage(): number {
    return this._currentPage;
  }

  /** Total number of pages in the loaded document. Set after the `pagesloaded` event. */
  get totalPages(): number {
    return this._totalPages;
  }

  /** Current zoom as a raw scale multiplier (e.g. `1.5` means 150%). Updated via `scalechanging`. */
  get currentZoom(): number {
    return this._currentZoom;
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    if (this.#iframe) {
      this.#iframe.src = 'about:blank';
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'pdf-viewer-advanced': PdfViewerAdvanced;
  }
}
