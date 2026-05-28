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
  /** Run pdfjs in-process; no worker fetch. Required server-side under
   *  Turbopack, which can't resolve pdf.worker.mjs from chunked output. */
  disableWorker?: boolean;
  /** Some Node setups don't support function-eval; disabling keeps
   *  pdfjs happy without falling back to a worker. */
  isEvalSupported?: boolean;
  useSystemFonts?: boolean;
}

interface PDFJS {
  getDocument: (src: GetDocumentParams) => {
    promise: Promise<PDFDocumentProxy>;
  };
}

/** Extract all text from a PDF, page-separated by "\n\n---\n\n". */
export async function extractPdfText(bytes: Uint8Array): Promise<string> {
  // Import the legacy build to avoid bundler resolution issues server-side.
  const pdfjs =
    (await import("pdfjs-dist/legacy/build/pdf.mjs")) as unknown as PDFJS;

  const doc = await pdfjs.getDocument({
    data: bytes,
    // Run pdfjs in-process. Under Turbopack the dev server can't resolve
    // pdf.worker.mjs from the chunked output ("Setting up fake worker
    // failed"); disabling the worker keeps everything in the request
    // process where it just works.
    disableWorker: true,
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
