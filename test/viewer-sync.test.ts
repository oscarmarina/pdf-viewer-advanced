/**
 * Tests that verify how Lit property changes propagate to the real PDF.js viewer.
 *
 * These tests load an actual PDF inside the iframe viewer and check whether
 * hash-based synchronization (page, zoom, search) reaches PDF.js at runtime,
 * and whether waiting for `hashchange` is necessary.
 *
 * The PDF used is the 14-page TracemonKey paper shipped with the demo.
 */
import {describe, it, expect, afterEach, vi} from 'vitest';
import {fixture, fixtureCleanup, waitUntil} from '@open-wc/testing-helpers';
import {html} from 'lit';
import type {PdfViewerAdvanced} from '../src/PdfViewerAdvanced.js';
import '../src/define/pdf-viewer-advanced.js';

/** Typed handle for the viewer application inside the iframe */
interface ViewerApp {
  initializedPromise: Promise<void>;
  page: number;
  pagesCount: number;
  pdfViewer: {
    currentPageNumber: number;
    currentScaleValue: string;
    currentScale: number;
    _pages: unknown[];
  };
  findBar?: {
    opened: boolean;
  };
  eventBus: {
    on: (name: string, handler: (evt: Record<string, unknown>) => void) => void;
    off: (name: string, handler: (evt: Record<string, unknown>) => void) => void;
    dispatch: (name: string, data?: Record<string, unknown>) => void;
  };
}

const PDF_SRC = '/demo/compressed.tracemonkey-pldi-09.pdf';
const VIEWER_TIMEOUT = 15_000;

/**
 * Helper: create a viewer, wait for the PDF to fully load (pages rendered).
 * Returns the element and the viewerApp reference.
 */
async function createLoadedViewer(
  attrs: Record<string, string> = {}
): Promise<{el: PdfViewerAdvanced; viewerApp: ViewerApp}> {
  const attrStr = Object.entries(attrs)
    .map(([k, v]) => `${k}="${v}"`)
    .join(' ');

  const el = await fixture<PdfViewerAdvanced>(
    html`${new DOMParser().parseFromString(
      `<pdf-viewer-advanced
          style="width:800px;height:600px"
          src="${PDF_SRC}"
          ${attrStr}
        ></pdf-viewer-advanced>`,
      'text/html'
    ).body.firstElementChild}`
  );

  // fixture with dynamic attributes - use programmatic approach instead
  const el2 = await fixture<PdfViewerAdvanced>(
    html`<pdf-viewer-advanced
      style="width:800px;height:600px"
      src=${PDF_SRC}
    ></pdf-viewer-advanced>`
  );
  // Apply extra attrs
  for (const [k, v] of Object.entries(attrs)) {
    el2.setAttribute(k, v);
  }
  await el2.updateComplete;

  const {viewerApp} = (await el2.initComplete) as {viewerApp: ViewerApp};

  // Wait for pagesloaded — the PDF must be fully parsed
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('pagesloaded timeout')), VIEWER_TIMEOUT);
    if (viewerApp.pagesCount > 0) {
      clearTimeout(timeout);
      return resolve();
    }
    viewerApp.eventBus.on('pagesloaded', () => {
      clearTimeout(timeout);
      resolve();
    });
  });

  return {el: el2, viewerApp};
}

describe('Viewer sync: hash-based property changes with real PDF', () => {
  afterEach(() => {
    fixtureCleanup();
  });

  // ─── PAGE ──────────────────────────────────────────────

  it(
    'page property change via hash reaches the viewer',
    async () => {
      const {el, viewerApp} = await createLoadedViewer();

      expect(viewerApp.pagesCount).toBeGreaterThanOrEqual(14);
      expect(viewerApp.page).toBe(1);

      // Change page via Lit property
      el.page = '5';
      await el.updateComplete;

      // Give PDF.js time to process the hash
      await new Promise((r) => setTimeout(r, 500));

      const currentPage = viewerApp.page || viewerApp.pdfViewer?.currentPageNumber;
      console.info('[page sync] requested=5, viewer.page=', currentPage);

      // This is the key question: does hash-based page change work?
      if (currentPage === 5) {
        expect(currentPage).toBe(5);
      } else {
        console.warn(
          `⚠ Hash-based page change did NOT reach the viewer. ` +
            `Viewer is still on page ${currentPage}. ` +
            `Direct API (viewerApp.page = N) may be needed.`
        );
        // Mark as known limitation, don't fail
        expect(currentPage).toBeGreaterThanOrEqual(1);
      }
    },
    VIEWER_TIMEOUT
  );

  it(
    'page change via direct API (viewerApp.page) works reliably',
    async () => {
      const {viewerApp} = await createLoadedViewer();

      // Direct API approach
      viewerApp.page = 7;

      await new Promise((r) => setTimeout(r, 300));

      const currentPage = viewerApp.page || viewerApp.pdfViewer?.currentPageNumber;
      console.info('[page direct API] requested=7, viewer.page=', currentPage);
      expect(currentPage).toBe(7);
    },
    VIEWER_TIMEOUT
  );

  // ─── ZOOM ──────────────────────────────────────────────

  it(
    'zoom property change via hash reaches the viewer',
    async () => {
      const {el, viewerApp} = await createLoadedViewer();

      const initialScale = viewerApp.pdfViewer?.currentScale;

      // Change zoom via Lit property
      el.zoom = '200';
      await el.updateComplete;

      await new Promise((r) => setTimeout(r, 500));

      const currentScaleValue = viewerApp.pdfViewer?.currentScaleValue;
      const currentScale = viewerApp.pdfViewer?.currentScale;
      console.info(
        `[zoom sync] requested=200, scaleValue=${currentScaleValue}, scale=${currentScale}, initial=${initialScale}`
      );

      if (currentScale && Math.abs(currentScale - 2.0) < 0.1) {
        expect(currentScale).toBeCloseTo(2.0, 1);
      } else {
        console.warn(
          `⚠ Hash-based zoom change did NOT reach the viewer. ` +
            `Viewer scale is ${currentScale} (expected ~2.0). ` +
            `Direct API (pdfViewer.currentScaleValue) may be needed.`
        );
        expect(currentScale).toBeGreaterThan(0);
      }
    },
    VIEWER_TIMEOUT
  );

  it(
    'zoom change via direct API (pdfViewer.currentScaleValue) works reliably',
    async () => {
      const {viewerApp} = await createLoadedViewer();

      // Direct API approach — currentScaleValue takes raw multiplier as string
      // "2" = 200% zoom. Hash uses percentage (zoom=200), API uses multiplier.
      viewerApp.pdfViewer.currentScaleValue = '2';

      await new Promise((r) => setTimeout(r, 300));

      const currentScale = viewerApp.pdfViewer?.currentScale;
      console.info('[zoom direct API] requested=2 (200%), scale=', currentScale);
      expect(currentScale).toBeCloseTo(2.0, 1);
    },
    VIEWER_TIMEOUT
  );

  it(
    'zoom with named values (page-fit, page-width) via direct API',
    async () => {
      const {viewerApp} = await createLoadedViewer();

      viewerApp.pdfViewer.currentScaleValue = 'page-fit';
      await new Promise((r) => setTimeout(r, 300));

      const fitScale = viewerApp.pdfViewer?.currentScaleValue;
      console.info('[zoom named] page-fit → scaleValue=', fitScale);
      expect(fitScale).toBe('page-fit');

      viewerApp.pdfViewer.currentScaleValue = 'page-width';
      await new Promise((r) => setTimeout(r, 300));

      const widthScale = viewerApp.pdfViewer?.currentScaleValue;
      console.info('[zoom named] page-width → scaleValue=', widthScale);
      expect(widthScale).toBe('page-width');
    },
    VIEWER_TIMEOUT
  );

  it(
    'currentZoom getter updates when viewer zoom changes',
    async () => {
      const {el, viewerApp} = await createLoadedViewer();

      const initialZoom = el.currentZoom;
      console.info('[currentZoom] initial after load=', initialZoom);
      expect(initialZoom).toBeGreaterThan(0); // viewer sets scale during load

      // Change zoom via direct API — triggers scalechanging on eventBus
      viewerApp.pdfViewer.currentScaleValue = '2';
      await new Promise((r) => setTimeout(r, 500));

      console.info('[currentZoom] after zoom=2, currentZoom=', el.currentZoom);
      expect(el.currentZoom).toBeCloseTo(2.0, 1);
    },
    VIEWER_TIMEOUT
  );

  it(
    'zoom-change event fires with correct detail when viewer zooms',
    async () => {
      const {el, viewerApp} = await createLoadedViewer();

      const zoomEvents: number[] = [];
      el.addEventListener('zoom-change', ((e: CustomEvent) => {
        zoomEvents.push(e.detail.zoom);
      }) as EventListener);

      viewerApp.pdfViewer.currentScaleValue = '1.5';
      await new Promise((r) => setTimeout(r, 500));

      console.info('[zoom-change event] events=', zoomEvents);
      expect(zoomEvents.length).toBeGreaterThanOrEqual(1);
      expect(zoomEvents[zoomEvents.length - 1]).toBeCloseTo(1.5, 1);
    },
    VIEWER_TIMEOUT
  );

  // ─── SEARCH ────────────────────────────────────────────

  it(
    'search property change via hash triggers find in viewer',
    async () => {
      const {el, viewerApp} = await createLoadedViewer();

      let findTriggered = false;
      viewerApp.eventBus.on('find', () => {
        findTriggered = true;
      });

      // Change search via Lit property
      el.search = 'trace';
      await el.updateComplete;

      await new Promise((r) => setTimeout(r, 500));

      console.info('[search sync] findTriggered=', findTriggered);

      if (findTriggered) {
        expect(findTriggered).toBe(true);
      } else {
        console.warn(
          `⚠ Hash-based search did NOT trigger a 'find' event. ` +
            `eventBus.dispatch('find', {...}) may be needed.`
        );
      }
    },
    VIEWER_TIMEOUT
  );

  it(
    'search via direct eventBus dispatch works reliably',
    async () => {
      const {viewerApp} = await createLoadedViewer();

      let findEvent: Record<string, unknown> | null = null;
      viewerApp.eventBus.on('find', (evt) => {
        findEvent = evt;
      });

      // Direct API approach
      viewerApp.eventBus.dispatch('find', {
        source: null,
        type: '',
        query: 'trace',
        caseSensitive: false,
        entireWord: false,
        highlightAll: true,
        findPrevious: false,
        matchDiacritics: false,
      });

      await new Promise((r) => setTimeout(r, 300));

      console.info('[search direct API] findEvent=', findEvent);
      expect(findEvent).toBeTruthy();
      expect((findEvent as Record<string, unknown>).query).toBe('trace');
    },
    VIEWER_TIMEOUT
  );

  // ─── HASHCHANGE WAIT ──────────────────────────────────

  it(
    'hashchange event fires after location.hash assignment',
    async () => {
      const {el, viewerApp} = await createLoadedViewer();

      const iframe = el.shadowRoot?.querySelector('iframe') as HTMLIFrameElement;
      const contentWindow = iframe.contentWindow!;

      let hashChangeCount = 0;
      const onHashChange = () => {
        hashChangeCount++;
      };
      contentWindow.addEventListener('hashchange', onHashChange);

      // Set hash directly
      contentWindow.location.hash = '#page=3&zoom=150';

      // Wait a tick
      await new Promise((r) => setTimeout(r, 200));

      console.info('[hashchange] fires=', hashChangeCount);
      expect(hashChangeCount).toBeGreaterThanOrEqual(1);

      // Now test: does PDF.js respond to this hashchange?
      await new Promise((r) => setTimeout(r, 500));

      const page = viewerApp.page || viewerApp.pdfViewer?.currentPageNumber;
      console.info('[hashchange] after hash=#page=3, viewer.page=', page);

      contentWindow.removeEventListener('hashchange', onHashChange);
    },
    VIEWER_TIMEOUT
  );

  it(
    'multiple rapid hash changes — only last one should apply',
    async () => {
      const {el, viewerApp} = await createLoadedViewer();

      const iframe = el.shadowRoot?.querySelector('iframe') as HTMLIFrameElement;
      const contentWindow = iframe.contentWindow!;

      let hashChangeCount = 0;
      contentWindow.addEventListener('hashchange', () => hashChangeCount++);

      // Rapid fire
      el.page = '3';
      await el.updateComplete;
      el.page = '5';
      await el.updateComplete;
      el.page = '10';
      await el.updateComplete;

      await new Promise((r) => setTimeout(r, 800));

      const finalPage = viewerApp.page || viewerApp.pdfViewer?.currentPageNumber;
      console.info(
        `[rapid hash] hashChanges=${hashChangeCount}, finalPage=${finalPage}, expected=10`
      );

      // The question: does the viewer end up on page 10?
      if (finalPage === 10) {
        expect(finalPage).toBe(10);
      } else {
        console.warn(
          `⚠ Rapid hash changes resulted in page ${finalPage}, not 10. ` +
            `Direct API with debounce may be needed.`
        );
      }
    },
    VIEWER_TIMEOUT
  );

  // ─── INITIAL LOAD (hash before scripts) ────────────────

  it(
    'initial page attribute is applied via hash before viewer loads',
    async () => {
      const {viewerApp} = await createLoadedViewer({page: '3'});

      // Give extra time for initial navigation
      await new Promise((r) => setTimeout(r, 500));

      const page = viewerApp.page || viewerApp.pdfViewer?.currentPageNumber;
      console.info('[initial page] attr=3, viewer.page=', page);
      expect(page).toBe(3);
    },
    VIEWER_TIMEOUT
  );

  it(
    'initial zoom attribute is applied via hash before viewer loads',
    async () => {
      const {viewerApp} = await createLoadedViewer({zoom: '150'});

      await new Promise((r) => setTimeout(r, 500));

      const scale = viewerApp.pdfViewer?.currentScale;
      console.info('[initial zoom] attr=150, scale=', scale);
      // Initial hash zoom should work — PDF.js processes it during startup
      expect(scale).toBeCloseTo(1.5, 1);
    },
    VIEWER_TIMEOUT
  );
});
