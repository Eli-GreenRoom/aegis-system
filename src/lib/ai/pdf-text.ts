/**
 * Server-side PDF -> plain text extraction.
 *
 * Uses pdfjs-dist (already a dep for client-side rendering). Imports the
 * legacy build because it ships ESM that runs cleanly under Node without
 * needing a DOM. We don't need rendering here, just text content per page,
 * so this stays small.
 *
 * Used only by `/api/ai/parse-flight-pdf` and `parseFlightText` callers.
 * Never import this from a React component.
 */

interface TextItem {
  str: string;
}

interface TextContent {
  items: TextItem[];
}

interface PDFPageProxy {
  getTextContent: () => Promise<TextContent>;
}

interface PDFDocumentProxy {
  numPages: number;
  getPage: (n: number) => Promise<PDFPageProxy>;
}

interface GetDocumentParams {
  data: Uint8Array;
  isEvalSupported?: boolean;
  useSystemFonts?: boolean;
}

interface GlobalWorkerOptions {
  workerSrc: string;
}

interface PDFJS {
  GlobalWorkerOptions: GlobalWorkerOptions;
  getDocument: (src: GetDocumentParams) => {
    promise: Promise<PDFDocumentProxy>;
  };
}

/** Extract all text from a PDF, page-separated by "\n\n---\n\n". */
export async function extractPdfText(bytes: Uint8Array): Promise<string> {
  // pdfjs-dist uses DOMMatrix / DOMPoint internally even for text extraction.
  // These browser globals don't exist in Node — polyfill with identity stubs
  // before importing pdfjs so it doesn't throw "DOMMatrix is not defined".
  if (typeof globalThis.DOMMatrix === "undefined") {
    // @ts-expect-error — stubbing browser global for server-side use
    globalThis.DOMMatrix = class DOMMatrix {
      // pdfjs only needs basic construction and the `a`-`f` / `m`-prefix props
      constructor() {
        Object.assign(this, {
          a: 1,
          b: 0,
          c: 0,
          d: 1,
          e: 0,
          f: 0,
          m11: 1,
          m12: 0,
          m13: 0,
          m14: 0,
          m21: 0,
          m22: 1,
          m23: 0,
          m24: 0,
          m31: 0,
          m32: 0,
          m33: 1,
          m34: 0,
          m41: 0,
          m42: 0,
          m43: 0,
          m44: 1,
          is2D: true,
          isIdentity: true,
        });
      }
      // pdfjs calls these chained transform methods during text positioning
      translate() {
        return this;
      }
      scale() {
        return this;
      }
      multiply() {
        return this;
      }
      inverse() {
        return this;
      }
      transformPoint(p: { x: number; y: number }) {
        return p;
      }
    };
  }
  if (typeof globalThis.DOMPoint === "undefined") {
    // @ts-expect-error — stubbing browser global for server-side use
    globalThis.DOMPoint = class DOMPoint {
      x: number;
      y: number;
      z: number;
      w: number;
      constructor(x = 0, y = 0, z = 0, w = 1) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.w = w;
      }
    };
  }

  // Import both the main module and the worker module together. In pdfjs v5,
  // importing the worker alongside the main build causes it to self-register
  // its worker class, which satisfies the "No GlobalWorkerOptions.workerSrc
  // specified" guard without spawning a real worker thread or fetching a URL.
  const [pdfjs] = await Promise.all([
    import("pdfjs-dist/legacy/build/pdf.mjs"),
    // @ts-expect-error — no types shipped for the worker subpath; side-effect
    // import self-registers the worker class so pdfjs runs without a URL.
    import("pdfjs-dist/legacy/build/pdf.worker.mjs"),
  ]);
  const lib = pdfjs as unknown as PDFJS;

  const doc = await lib.getDocument({
    data: bytes,
    isEvalSupported: false,
    useSystemFonts: false,
  }).promise;
  const out: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items.map((it) => it.str).join(" ");
    out.push(text);
  }
  return out.join("\n\n---\n\n");
}
