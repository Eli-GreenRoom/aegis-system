import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { format } from "date-fns";
import { getAppSession } from "@/lib/session";
import { getArtistRoadsheet } from "@/lib/aggregators";

interface Params {
  params: Promise<{ artistId: string }>;
}

const C = {
  bg: rgb(0.055, 0.055, 0.063), // #0E0E10
  surface: rgb(0.082, 0.082, 0.098), // #15151A
  gold: rgb(0.898, 0.722, 0.353), // #E5B85A
  muted: rgb(0.45, 0.45, 0.5),
  subtle: rgb(0.3, 0.3, 0.35),
  fg: rgb(0.93, 0.93, 0.94),
  white: rgb(1, 1, 1),
  coral: rgb(0.906, 0.243, 0.329), // #E73E54
  mint: rgb(0.086, 0.816, 0.376), // #16D060
} as const;

export async function GET(req: NextRequest, { params }: Params) {
  const session = await getAppSession(req.headers);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { artistId } = await params;
  const day = req.nextUrl.searchParams.get("day") ?? undefined;

  const sheet = await getArtistRoadsheet(artistId, day);
  if (!sheet) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const {
    artist,
    set,
    inboundFlight,
    outboundFlight,
    hotel,
    pickups,
    riders,
    payments,
    contract,
  } = sheet;

  const doc = await PDFDocument.create();
  const pageW = 595,
    pageH = 842; // A4
  const marginL = 48,
    marginR = 48,
    marginT = 56,
    col = pageW - marginL - marginR;

  const helvetica = await doc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await doc.embedFont(StandardFonts.HelveticaBold);

  let page = doc.addPage([pageW, pageH]);
  let y = pageH - marginT;

  function ensureSpace(needed: number) {
    if (y - needed < 48) {
      page = doc.addPage([pageW, pageH]);
      y = pageH - marginT;
      drawPageBg();
    }
  }

  function drawPageBg() {
    page.drawRectangle({
      x: 0,
      y: 0,
      width: pageW,
      height: pageH,
      color: C.bg,
    });
  }

  function text(
    str: string,
    x: number,
    yPos: number,
    opts: {
      size?: number;
      font?: typeof helvetica;
      color?: ReturnType<typeof rgb>;
      maxWidth?: number;
    } = {},
  ) {
    const { size = 10, font = helvetica, color = C.fg, maxWidth } = opts;
    let s = str;
    if (maxWidth) {
      while (s.length > 4 && font.widthOfTextAtSize(s, size) > maxWidth) {
        s = s.slice(0, -1);
      }
      if (s !== str) s = s.slice(0, -1) + "…";
    }
    page.drawText(s, { x, y: yPos, size, font, color });
  }

  function sectionHeader(label: string) {
    ensureSpace(28);
    y -= 6;
    page.drawLine({
      start: { x: marginL, y },
      end: { x: pageW - marginR, y },
      thickness: 0.5,
      color: C.subtle,
    });
    y -= 14;
    text(label.toUpperCase(), marginL, y, {
      size: 8,
      font: helveticaBold,
      color: C.gold,
    });
    y -= 10;
  }

  function row(label: string, value: string, valueColor = C.fg) {
    ensureSpace(18);
    text(label, marginL, y, { size: 9, color: C.muted, maxWidth: 100 });
    text(value, marginL + 110, y, {
      size: 9,
      color: valueColor,
      maxWidth: col - 110,
    });
    y -= 14;
  }

  // ── Background ──────────────────────────────────────────────────────────────
  drawPageBg();

  // ── Gold top bar ────────────────────────────────────────────────────────────
  page.drawRectangle({
    x: 0,
    y: pageH - 6,
    width: pageW,
    height: 6,
    color: C.gold,
  });

  // ── Artist name ─────────────────────────────────────────────────────────────
  text(artist.name, marginL, y, {
    size: 22,
    font: helveticaBold,
    color: C.white,
  });
  y -= 28;

  if (artist.legalName) {
    text(`Legal: ${artist.legalName}`, marginL, y, { size: 9, color: C.muted });
    y -= 14;
  }

  const meta = [
    artist.nationality,
    artist.agency,
    artist.visaStatus ? `Visa: ${artist.visaStatus}` : null,
  ]
    .filter(Boolean)
    .join("  ·  ");
  if (meta) {
    text(meta, marginL, y, { size: 9, color: C.muted });
    y -= 14;
  }

  const contact = [
    artist.email,
    artist.phone,
    artist.agentEmail ? `Agent: ${artist.agentEmail}` : null,
  ]
    .filter(Boolean)
    .join("  ·  ");
  if (contact) {
    text(contact, marginL, y, { size: 9, color: C.muted });
    y -= 14;
  }

  y -= 4;

  // ── Set ─────────────────────────────────────────────────────────────────────
  sectionHeader("Set");
  if (set) {
    row("Stage", set.stage.name);
    row(
      "Time",
      `${set.slot.date}  ${set.slot.startTime} – ${set.slot.endTime}`,
    );
    row("Status", set.set.status);
  } else {
    text("No set scheduled.", marginL, y, { size: 9, color: C.subtle });
    y -= 14;
  }

  // ── Travel ──────────────────────────────────────────────────────────────────
  sectionHeader("Travel");
  if (inboundFlight) {
    const dt = inboundFlight.scheduledDt
      ? format(new Date(inboundFlight.scheduledDt), "EEE d MMM HH:mm")
      : "—";
    row(
      "Inbound",
      `${inboundFlight.airline ?? ""} ${inboundFlight.flightNumber ?? ""}  ${inboundFlight.fromAirport ?? "?"}→${inboundFlight.toAirport ?? "?"}  ${dt}`,
    );
    row("Status", inboundFlight.status);
  } else {
    text("No inbound flight.", marginL, y, { size: 9, color: C.subtle });
    y -= 14;
  }
  if (outboundFlight) {
    const dt = outboundFlight.scheduledDt
      ? format(new Date(outboundFlight.scheduledDt), "EEE d MMM HH:mm")
      : "—";
    row(
      "Outbound",
      `${outboundFlight.airline ?? ""} ${outboundFlight.flightNumber ?? ""}  ${outboundFlight.fromAirport ?? "?"}→${outboundFlight.toAirport ?? "?"}  ${dt}`,
    );
  }

  // ── Hotel ───────────────────────────────────────────────────────────────────
  sectionHeader("Hotel");
  if (hotel) {
    row("Hotel", hotel.hotelName);
    row("Dates", `${hotel.booking.checkin} → ${hotel.booking.checkout}`);
    if (hotel.booking.roomType) row("Room", hotel.booking.roomType);
    row("Status", hotel.booking.status);
    if (hotel.booking.bookingNumber) row("Ref", hotel.booking.bookingNumber);
  } else {
    text("No active booking.", marginL, y, { size: 9, color: C.subtle });
    y -= 14;
  }

  // ── Pickups ─────────────────────────────────────────────────────────────────
  sectionHeader("Pickups");
  if (pickups.length === 0) {
    text("No pickups scheduled.", marginL, y, { size: 9, color: C.subtle });
    y -= 14;
  } else {
    for (const p of pickups) {
      const dt = format(new Date(p.pickupDt), "EEE HH:mm");
      const detail = [
        p.routeFrom + " → " + p.routeTo,
        p.driverName,
        p.driverPhone,
        p.status,
      ]
        .filter(Boolean)
        .join("  ·  ");
      row(dt, detail);
    }
  }

  // ── Riders ──────────────────────────────────────────────────────────────────
  sectionHeader("Riders");
  if (riders.length === 0) {
    text("No riders on file.", marginL, y, { size: 9, color: C.subtle });
    y -= 14;
  } else {
    for (const r of riders) {
      row(
        r.kind,
        r.confirmed ? "confirmed" : "pending",
        r.confirmed ? C.mint : C.gold,
      );
    }
  }

  // ── Contract ─────────────────────────────────────────────────────────────────
  sectionHeader("Contract");
  if (contract) {
    row("Status", contract.status);
    if (contract.signedAt)
      row("Signed", format(new Date(contract.signedAt), "d MMM yyyy"));
  } else {
    text("No contract on file.", marginL, y, { size: 9, color: C.subtle });
    y -= 14;
  }

  // ── Payments ─────────────────────────────────────────────────────────────────
  sectionHeader("Outstanding Payments");
  if (payments.length === 0) {
    text("All paid.", marginL, y, { size: 9, color: C.mint });
    y -= 14;
  } else {
    for (const p of payments) {
      const amt = `${(p.amountCents / 100).toFixed(2)} ${p.currency}`;
      const detail = [
        p.description,
        p.dueDate ? `due ${p.dueDate}` : null,
        p.status,
      ]
        .filter(Boolean)
        .join("  ·  ");
      row(amt, detail, p.status === "overdue" ? C.coral : C.fg);
    }
  }

  // ── Footer ───────────────────────────────────────────────────────────────────
  ensureSpace(30);
  y -= 10;
  page.drawLine({
    start: { x: marginL, y },
    end: { x: pageW - marginR, y },
    thickness: 0.5,
    color: C.subtle,
  });
  y -= 14;
  const footerStr = `GreenRoom Stages · roadsheet · ${format(new Date(), "EEE d MMM yyyy HH:mm")}${day ? `  ·  ${day}` : ""}`;
  text(footerStr, marginL, y, { size: 8, color: C.subtle });

  const bytes = await doc.save();
  const filename = `roadsheet-${artist.name.toLowerCase().replace(/\s+/g, "-")}${day ? `-${day}` : ""}.pdf`;

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
