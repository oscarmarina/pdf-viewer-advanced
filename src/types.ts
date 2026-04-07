/**
 * Numeric values for the PDF.js `viewerCssTheme` option.
 *
 * - `AUTOMATIC` (0) — follows the user's OS preference via `prefers-color-scheme`.
 * - `LIGHT` (1) — forces light mode regardless of OS setting.
 * - `DARK` (2) — forces dark mode regardless of OS setting.
 */
export const ViewerCssTheme = {AUTOMATIC: 0, LIGHT: 1, DARK: 2} as const;

/** String union of valid theme keys: `'AUTOMATIC' | 'LIGHT' | 'DARK'`. */
export type ViewerCssThemeKey = keyof typeof ViewerCssTheme;

/**
 * Shape of the `contentWindow` inside the PDF.js viewer iframe.
 *
 * Extends the standard `Window` with the two globals that PDF.js
 * attaches at startup: `PDFViewerApplication` (runtime API) and
 * `PDFViewerApplicationOptions` (configuration store).
 */
export interface IframeWindow extends Window {
  PDFViewerApplication?: {
    initializedPromise: Promise<void>;
    initialized: boolean;
    eventBus: EventBus;
    open: (params: {url: string; originalUrl?: string} | {data: Uint8Array} | Uint8Array) => void;
    pagesCount: number;
    page: number;
    appConfig: Record<string, Record<string, HTMLElement>>;
  };
  PDFViewerApplicationOptions?: {
    set: (name: string, value: string | boolean | number | Record<string, unknown>) => void;
    getAll: () => Record<string, unknown>;
  };
}

/**
 * Subset of the PDF.js internal event bus used by the component.
 *
 * Key events:
 * - `pagechanging` — fired when the visible page changes.
 * - `pagesloaded` — fired once all pages are parsed.
 * - `scalechanging` — fired when the zoom level changes.
 */
export interface EventBus {
  on: (name: string, handler: (evt: Record<string, unknown>) => void) => void;
  off: (name: string, handler: (evt: Record<string, unknown>) => void) => void;
  dispatch: (name: string, data?: Record<string, unknown>) => void;
}

/** An `HTMLIFrameElement` whose `contentWindow` is typed as {@link IframeWindow}. */
export interface PdfjsViewerIframe extends HTMLIFrameElement {
  contentWindow: IframeWindow;
}

/**
 * Data returned by the viewer initialization sequence.
 *
 * Available via `await element.initComplete`.
 */
export interface InitializationData {
  /** Reference to the PDF.js application instance inside the iframe. */
  viewerApp?: IframeWindow['PDFViewerApplication'];
}
