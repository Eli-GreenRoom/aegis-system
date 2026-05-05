import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/session", () => ({
  getAppSession: vi.fn(),
  requirePermission: vi.fn(() => null),
}));

vi.mock("@/lib/ai/parse-invoice", () => ({
  parseInvoiceText: vi.fn(),
}));

vi.mock("@/lib/ai/parse-flight", () => ({
  parseFlightText: vi.fn(),
}));

import * as session from "@/lib/session";
import * as invoiceParser from "@/lib/ai/parse-invoice";
import * as flightParser from "@/lib/ai/parse-flight";
import { POST as parseInvoicePOST } from "@/app/api/ai/parse-invoice/route";
import { POST as parseFlightPOST } from "@/app/api/ai/parse-flight/route";

const mocks = {
  session: vi.mocked(session),
  invoice: vi.mocked(invoiceParser),
  flight: vi.mocked(flightParser),
};

const fakeSession = {
  user: { id: "u1", email: "booking@aegisfestival.com", name: "Eli" },
  ownerId: "u1",
  isOwner: true,
  role: "owner" as const,
  permissions: { payments: true, flights: true },
};

function jsonReq(url: string, body: unknown): NextRequest {
  return new NextRequest(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  mocks.session.getAppSession.mockResolvedValue(fakeSession);
  mocks.session.requirePermission.mockReturnValue(null);
});

// ── /api/ai/parse-invoice ───────────────────────────────────────────────

describe("POST /api/ai/parse-invoice", () => {
  it("returns parsed JSON on success", async () => {
    mocks.invoice.parseInvoiceText.mockResolvedValueOnce({
      vendor: "BSM",
      invoiceNumber: "INV-1",
      amount: 1000,
      currency: "USD",
      issueDate: "2026-04-14",
      dueDate: "2026-05-01",
      lineItems: [],
      issuerKind: "hotel",
    });
    const res = await parseInvoicePOST(
      jsonReq("http://test/api/ai/parse-invoice", {
        text: "a long enough invoice text body to pass the guard",
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.parsed.vendor).toBe("BSM");
  });

  it("400 when text too short", async () => {
    const res = await parseInvoicePOST(
      jsonReq("http://test/api/ai/parse-invoice", { text: "short" })
    );
    expect(res.status).toBe(400);
    expect(mocks.invoice.parseInvoiceText).not.toHaveBeenCalled();
  });

  it("400 missing text", async () => {
    const res = await parseInvoicePOST(
      jsonReq("http://test/api/ai/parse-invoice", {})
    );
    expect(res.status).toBe(400);
  });

  it("400 malformed JSON", async () => {
    const req = new NextRequest("http://test/api/ai/parse-invoice", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{nope",
    });
    const res = await parseInvoicePOST(req);
    expect(res.status).toBe(400);
  });

  it("502 when parser throws", async () => {
    mocks.invoice.parseInvoiceText.mockRejectedValueOnce(
      new Error("Anthropic 500")
    );
    const res = await parseInvoicePOST(
      jsonReq("http://test/api/ai/parse-invoice", {
        text: "long enough text to pass the guard",
      })
    );
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toContain("Anthropic 500");
  });

  it("401 unauth", async () => {
    mocks.session.getAppSession.mockResolvedValueOnce(null);
    const res = await parseInvoicePOST(
      jsonReq("http://test/api/ai/parse-invoice", {
        text: "long enough text to pass the guard",
      })
    );
    expect(res.status).toBe(401);
  });

  it("403 when payments permission denied", async () => {
    mocks.session.requirePermission.mockReturnValueOnce(
      Response.json({ error: "Forbidden" }, { status: 403 })
    );
    const res = await parseInvoicePOST(
      jsonReq("http://test/api/ai/parse-invoice", {
        text: "long enough text to pass the guard",
      })
    );
    expect(res.status).toBe(403);
  });
});

// ── /api/ai/parse-flight ────────────────────────────────────────────────

describe("POST /api/ai/parse-flight", () => {
  it("returns parsed JSON on success", async () => {
    mocks.flight.parseFlightText.mockResolvedValueOnce({
      passengerName: "Hiroko",
      airline: "Air France",
      flightNumber: "AF137",
      fromAirport: "CDG",
      toAirport: "BEY",
      scheduledDt: "2026-08-15T18:45:00Z",
      pnr: "ABC123",
      seat: "14A",
      direction: "inbound",
    });
    const res = await parseFlightPOST(
      jsonReq("http://test/api/ai/parse-flight", {
        text: "a long enough flight confirmation body to pass the guard",
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.parsed.flightNumber).toBe("AF137");
  });

  it("400 short text", async () => {
    const res = await parseFlightPOST(
      jsonReq("http://test/api/ai/parse-flight", { text: "x" })
    );
    expect(res.status).toBe(400);
  });

  it("502 when parser throws", async () => {
    mocks.flight.parseFlightText.mockRejectedValueOnce(
      new Error("model output failed validation: ...")
    );
    const res = await parseFlightPOST(
      jsonReq("http://test/api/ai/parse-flight", {
        text: "long enough text to pass the guard",
      })
    );
    expect(res.status).toBe(502);
  });

  it("401 unauth", async () => {
    mocks.session.getAppSession.mockResolvedValueOnce(null);
    const res = await parseFlightPOST(
      jsonReq("http://test/api/ai/parse-flight", {
        text: "long enough text to pass the guard",
      })
    );
    expect(res.status).toBe(401);
  });

  it("403 when flights permission denied", async () => {
    mocks.session.requirePermission.mockReturnValueOnce(
      Response.json({ error: "Forbidden" }, { status: 403 })
    );
    const res = await parseFlightPOST(
      jsonReq("http://test/api/ai/parse-flight", {
        text: "long enough text to pass the guard",
      })
    );
    expect(res.status).toBe(403);
  });
});
