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

interface PDFJS {
  getDocument: (src: { data: Uint8Array }) => {
    promise: Promise<PDFDocumentProxy>;
  };
}

/** Extract all text from a PDF, page-separated by "\n\n---\n\n". */
export async function extractPdfText(bytes: Uint8Array): Promise<string> {
  // Import the legacy build to avoid bundler resolution issues server-side.
  const pdfjs =
    (await import("pdfjs-dist/legacy/build/pdf.mjs")) as unknown as PDFJS;

  const doc = await pdfjs.getDocument({ data: bytes }).promise;
  const out: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items.map((it) => it.str).join(" ");
    out.push(text);
  }
  return out.join("\n\n---\n\n");
}
