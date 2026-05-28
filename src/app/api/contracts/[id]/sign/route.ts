import { NextRequest } from "next/server";
import { z } from "zod";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { getAppSession, requirePermission } from "@/lib/session";
import { getContract, updateContract } from "@/lib/contracts/repo";
import { getDocument, createDocument } from "@/lib/documents/repo";
import { getBlobStream, uploadToBlob } from "@/lib/documents/blob";
import { idFromProxyUrl } from "@/lib/documents/schema";

interface Ctx {
  params: Promise<{ id: string }>;
}

const singlePlacementSchema = z.object({
  pageIndex: z.number().int().min(0),
  xPct: z.number().min(0).max(1),
  yPct: z.number().min(0).max(1),
  widthPct: z.number().min(0.05).max(0.95).optional(),
});

const multiPlacementSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("signature"),
    pageIndex: z.number().int().min(0),
    xPct: z.number().min(0).max(1),
    yPct: z.number().min(0).max(1),
    widthPct: z.number().min(0.05).max(0.95).optional(),
  }),
  z.object({
    kind: z.literal("text"),
    pageIndex: z.number().int().min(0),
    xPct: z.number().min(0).max(1),
    yPct: z.number().min(0).max(1),
    text: z.string().trim().min(1).max(500),
  }),
]);

const bodySchema = z.object({
  signatureDataUrl: z
    .string()
    .regex(/^data:image\/(png|jpeg);base64,/, "Must be a base64 PNG or JPEG"),
  signerName: z.string().trim().max(200).optional(),
  // Old shape (single signature) is still accepted for back-compat with any
  // outstanding clients - the multi-placement client always sends the new
  // `placements` array.
  placement: singlePlacementSchema.optional(),
  placements: z.array(multiPlacementSchema).min(1).max(20).optional(),
});

export async function POST(req: NextRequest, ctx: Ctx) {
  const session = await getAppSession();
  if (!session)
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  const denied = requirePermission(session, "contracts.edit");
  if (denied) return denied;

  const { id } = await ctx.params;
  const contract = await getContract(id);
  if (!contract) return Response.json({ error: "Not found" }, { status: 404 });
  if (!contract.fileUrl)
    return Response.json(
      { error: "No draft file uploaded yet" },
      { status: 422 },
    );

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success)
    return Response.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 },
    );

  // Resolve the draft document row so we can get the raw blob URL
  const docId = idFromProxyUrl(contract.fileUrl);
  if (!docId)
    return Response.json(
      {
        error: "Contract file URL is not a system document. Re-upload the PDF.",
      },
      { status: 422 },
    );

  const doc = await getDocument(docId);
  if (!doc)
    return Response.json(
      { error: "Document record not found" },
      { status: 404 },
    );

  if (doc.mimeType && !doc.mimeType.startsWith("application/pdf"))
    return Response.json(
      { error: "Only PDF contracts can be signed in-system" },
      { status: 422 },
    );

  // Fetch PDF bytes from private blob
  const blobResult = await getBlobStream(doc.url);
  if (!blobResult)
    return Response.json(
      { error: "Could not fetch the draft PDF" },
      { status: 502 },
    );

  const arrayBuffer = await new Response(blobResult.stream).arrayBuffer();
  const pdfBytes = new Uint8Array(arrayBuffer);

  // Embed each placement (signature image or text label) onto the right page.
  // Back-compat: if a legacy `placement` is sent without `placements`, treat
  // it as a single signature placement.
  let signedPdfBytes: Uint8Array;
  try {
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pdfPages = pdfDoc.getPages();
    const { placement, placements } = parsed.data;
    // Prefer client-supplied signerName, but fall back to the session's
    // profile name so the stamp ("Name - 15 May 2026") is always populated.
    const signerName = parsed.data.signerName ?? session.user.name ?? undefined;

    const items =
      placements && placements.length > 0
        ? placements
        : placement
          ? [
              {
                kind: "signature" as const,
                pageIndex: placement.pageIndex,
                xPct: placement.xPct,
                yPct: placement.yPct,
                widthPct: placement.widthPct,
              },
            ]
          : [
              // No placement provided at all - fall back to the original
              // bottom-right default on the last page.
              {
                kind: "signature" as const,
                pageIndex: pdfPages.length - 1,
                xPct: 0.85,
                yPct: 0.9,
              },
            ];

    // Decode and embed the signature image once (used by every signature
    // placement).
    const dataUrl = parsed.data.signatureDataUrl;
    const base64 = dataUrl.split(",")[1];
    const imgBytes = Buffer.from(base64, "base64");
    const isPng = dataUrl.startsWith("data:image/png");
    const embeddedImg = isPng
      ? await pdfDoc.embedPng(imgBytes)
      : await pdfDoc.embedJpg(imgBytes);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const dateStr = new Date().toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const stampLine = signerName ? `${signerName} - ${dateStr}` : dateStr;

    for (const item of items) {
      const targetIdx = Math.min(item.pageIndex, pdfPages.length - 1);
      const targetPage = pdfPages[targetIdx];
      const { width: pageW, height: pageH } = targetPage.getSize();

      if (item.kind === "signature") {
        const widthFrac = item.widthPct ?? 0.26;
        const sigW = widthFrac * pageW;
        const sigH = (embeddedImg.height / embeddedImg.width) * sigW;
        let sigX = item.xPct * pageW - sigW / 2;
        let sigY = pageH - item.yPct * pageH - sigH / 2;
        sigX = Math.max(0, Math.min(pageW - sigW, sigX));
        sigY = Math.max(0, Math.min(pageH - sigH, sigY));

        targetPage.drawImage(embeddedImg, {
          x: sigX,
          y: sigY,
          width: sigW,
          height: sigH,
        });

        // Signer name + date below every signature placement.
        targetPage.drawText(stampLine, {
          x: sigX,
          y: Math.max(0, sigY - 14),
          size: 9,
          font,
          color: rgb(0.35, 0.35, 0.35),
        });

        // Divider line above signature.
        targetPage.drawLine({
          start: { x: sigX, y: sigY + sigH + 8 },
          end: { x: sigX + sigW, y: sigY + sigH + 8 },
          thickness: 0.5,
          color: rgb(0.7, 0.7, 0.7),
        });
      } else {
        const fontSize = 11;
        const textWidth = font.widthOfTextAtSize(item.text, fontSize);
        const x = Math.max(
          0,
          Math.min(pageW - textWidth, item.xPct * pageW - textWidth / 2),
        );
        const y = Math.max(
          0,
          Math.min(pageH - fontSize, pageH - item.yPct * pageH - fontSize / 2),
        );
        targetPage.drawText(item.text, {
          x,
          y,
          size: fontSize,
          font,
          color: rgb(0.1, 0.1, 0.1),
        });
      }
    }

    signedPdfBytes = await pdfDoc.save();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json(
      { error: `PDF processing failed: ${msg}` },
      { status: 502 },
    );
  }

  // Upload signed PDF to blob (overwrite if already signed before)
  const signedPathname = `${session.workspaceId}/contract/${id}-signed.pdf`;
  let signedBlobUrl: string;
  try {
    const result = await uploadToBlob(
      signedPathname,
      signedPdfBytes.buffer as ArrayBuffer,
      "application/pdf",
    );
    signedBlobUrl = result.url;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: `Upload failed: ${msg}` }, { status: 502 });
  }

  // Create a document record for the signed file
  const signedDoc = await createDocument({
    workspaceId: session.workspaceId,
    entityType: "contract",
    entityId: id,
    filename: `${doc.filename.replace(/\.pdf$/i, "")}-signed.pdf`,
    mimeType: "application/pdf",
    sizeBytes: signedPdfBytes.byteLength,
    url: signedBlobUrl,
    uploadedBy: session.user.id,
    tags: ["contract", "signed"],
  });

  // Update contract: signed file URL, timestamp, status
  const updated = await updateContract(id, {
    signedFileUrl: `/api/documents/${signedDoc.id}`,
    signedAt: new Date(),
    status: "signed",
  });

  return Response.json({ contract: updated });
}
