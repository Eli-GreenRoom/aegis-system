import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import {
  FIXTURE_ARTIST_ID,
  FIXTURE_EDITION_ID,
  FIXTURE_INVOICE_ID,
  FIXTURE_PAYMENT_ID,
  FIXTURE_VENDOR_ID,
  fixtureInvoice,
  fixturePayment,
} from "../fixtures/payments";
import { fakeOwnerSession } from "../fixtures/session";

vi.mock("@/lib/session", () => ({
  getAppSession: vi.fn(),
  requirePermission: vi.fn(() => null),
}));

vi.mock("@/lib/edition", () => ({
  getCurrentEdition: vi.fn(async () => ({
    id: FIXTURE_EDITION_ID,
    year: 2026,
    name: "Aegis Festival 2026",
    startDate: "2026-08-14",
    endDate: "2026-08-16",
    location: "Aranoon Village, Batroun",
    festivalModeActive: false,
    createdAt: new Date(),
  })),
}));

const batchImpl = vi.fn(async (_queries: unknown[]): Promise<unknown[]> => []);

vi.mock("@/db/client", () => ({
  db: {
    batch: (queries: unknown[]) => batchImpl(queries),
  },
  schema: {},
}));

vi.mock("@/lib/audit", () => ({
  recordTransition: vi.fn(() => ({ __auditBuilder: true })),
}));

vi.mock("@/lib/payments/repo", () => ({
  // invoices
  listInvoices: vi.fn(async () => [fixtureInvoice]),
  listInvoiceIssuerKinds: vi.fn(async () => ["agency"]),
  getInvoice: vi.fn(async () => fixtureInvoice),
  createInvoice: vi.fn(async (_editionId, input) => ({
    ...fixtureInvoice,
    ...input,
    id: FIXTURE_INVOICE_ID,
  })),
  updateInvoice: vi.fn(async (_id, input) => ({ ...fixtureInvoice, ...input })),
  buildUpdateInvoice: vi.fn((_id, input) => ({
    __updateBuilder: "invoice",
    input,
  })),
  deleteInvoice: vi.fn(async () => fixtureInvoice),
  // payments
  listPayments: vi.fn(async () => [fixturePayment]),
  getPayment: vi.fn(async () => fixturePayment),
  createPayment: vi.fn(async (_editionId, input) => ({
    ...fixturePayment,
    ...input,
    id: FIXTURE_PAYMENT_ID,
  })),
  updatePayment: vi.fn(async (_id, input) => ({ ...fixturePayment, ...input })),
  buildUpdatePayment: vi.fn((_id, input) => ({
    __updateBuilder: "payment",
    input,
  })),
  deletePayment: vi.fn(async () => fixturePayment),
  getPaymentsSummary: vi.fn(),
}));

import * as session from "@/lib/session";
import * as repo from "@/lib/payments/repo";
import * as audit from "@/lib/audit";

import {
  GET as invoicesListGET,
  POST as invoicesPOST,
} from "@/app/api/invoices/route";
import {
  GET as invoiceGET,
  PATCH as invoicePATCH,
  DELETE as invoiceDELETE,
} from "@/app/api/invoices/[id]/route";

import {
  GET as paymentsListGET,
  POST as paymentsPOST,
} from "@/app/api/payments/route";
import {
  GET as paymentGET,
  PATCH as paymentPATCH,
  DELETE as paymentDELETE,
} from "@/app/api/payments/[id]/route";

const mocks = {
  session: vi.mocked(session),
  repo: vi.mocked(repo),
  audit: vi.mocked(audit),
};

function jsonReq(url: string, method: string, body?: unknown): NextRequest {
  return new NextRequest(url, {
    method,
    headers: { "content-type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

beforeEach(() => {
  mocks.session.getAppSession.mockResolvedValue(fakeOwnerSession);
  mocks.session.requirePermission.mockReturnValue(null);
  batchImpl.mockReset();
  // Default: invoice transitions return [[invoice], [audit]]; payment
  // transitions return [[payment], [audit]]. Tests that need a specific
  // shape override per-test.
  batchImpl.mockImplementation(async (queries: unknown[]) => {
    if (queries.length === 2) return [[fixturePayment], [{}]];
    return [];
  });
  mocks.audit.recordTransition.mockClear();
});

// ── /api/invoices ───────────────────────────────────────────────────────

describe("/api/invoices", () => {
  it("GET returns the list", async () => {
    const res = await invoicesListGET(
      jsonReq("http://test/api/invoices", "GET"),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.invoices).toHaveLength(1);
  });

  it("GET threads filters", async () => {
    await invoicesListGET(
      jsonReq(
        "http://test/api/invoices?search=hiroko&status=received&issuerKind=agency",
        "GET",
      ),
    );
    expect(mocks.repo.listInvoices).toHaveBeenCalledWith({
      editionId: FIXTURE_EDITION_ID,
      search: "hiroko",
      status: "received",
      issuerKind: "agency",
    });
  });

  it("GET 401 unauth", async () => {
    mocks.session.getAppSession.mockResolvedValueOnce(null);
    const res = await invoicesListGET(
      jsonReq("http://test/api/invoices", "GET"),
    );
    expect(res.status).toBe(401);
  });

  it("GET 403 when permission denied", async () => {
    mocks.session.requirePermission.mockReturnValueOnce(
      Response.json({ error: "Forbidden" }, { status: 403 }),
    );
    const res = await invoicesListGET(
      jsonReq("http://test/api/invoices", "GET"),
    );
    expect(res.status).toBe(403);
  });

  const validInvoice = {
    issuerKind: "agency",
    amountCents: 250000,
    currency: "USD",
  };

  it("POST creates with valid input", async () => {
    const res = await invoicesPOST(
      jsonReq("http://test/api/invoices", "POST", validInvoice),
    );
    expect(res.status).toBe(201);
    expect(mocks.repo.createInvoice).toHaveBeenCalledWith(
      FIXTURE_EDITION_ID,
      expect.objectContaining({
        issuerKind: "agency",
        amountCents: 250000,
        currency: "USD",
        status: "received",
      }),
    );
  });

  it("POST defaults status to 'received'", async () => {
    await invoicesPOST(
      jsonReq("http://test/api/invoices", "POST", validInvoice),
    );
    expect(mocks.repo.createInvoice).toHaveBeenCalledWith(
      FIXTURE_EDITION_ID,
      expect.objectContaining({ status: "received" }),
    );
  });

  it("POST normalises empty optional fields to null", async () => {
    await invoicesPOST(
      jsonReq("http://test/api/invoices", "POST", {
        ...validInvoice,
        number: "",
        fileUrl: "",
        comments: "",
      }),
    );
    expect(mocks.repo.createInvoice).toHaveBeenCalledWith(
      FIXTURE_EDITION_ID,
      expect.objectContaining({
        number: null,
        fileUrl: null,
        comments: null,
      }),
    );
  });

  it("POST 400 missing issuerKind", async () => {
    const { issuerKind: _drop, ...rest } = validInvoice;
    void _drop;
    const res = await invoicesPOST(
      jsonReq("http://test/api/invoices", "POST", rest),
    );
    expect(res.status).toBe(400);
  });

  it("POST 400 missing amount/currency", async () => {
    const res = await invoicesPOST(
      jsonReq("http://test/api/invoices", "POST", { issuerKind: "agency" }),
    );
    expect(res.status).toBe(400);
  });

  it("POST 400 invalid currency", async () => {
    const res = await invoicesPOST(
      jsonReq("http://test/api/invoices", "POST", {
        ...validInvoice,
        currency: "GBP",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("POST 400 negative amount", async () => {
    const res = await invoicesPOST(
      jsonReq("http://test/api/invoices", "POST", {
        ...validInvoice,
        amountCents: -1,
      }),
    );
    expect(res.status).toBe(400);
  });

  it("POST 400 bad URL", async () => {
    const res = await invoicesPOST(
      jsonReq("http://test/api/invoices", "POST", {
        ...validInvoice,
        fileUrl: "not a url",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("POST 400 malformed JSON", async () => {
    const req = new NextRequest("http://test/api/invoices", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{nope",
    });
    const res = await invoicesPOST(req);
    expect(res.status).toBe(400);
  });
});

describe("/api/invoices/[id]", () => {
  const ctx = { params: Promise.resolve({ id: FIXTURE_INVOICE_ID }) };

  it("GET returns the invoice", async () => {
    const res = await invoiceGET(
      jsonReq("http://test/api/invoices/x", "GET"),
      ctx,
    );
    expect(res.status).toBe(200);
  });

  it("GET 404 missing", async () => {
    mocks.repo.getInvoice.mockResolvedValueOnce(null);
    const res = await invoiceGET(
      jsonReq("http://test/api/invoices/missing", "GET"),
      { params: Promise.resolve({ id: "missing" }) },
    );
    expect(res.status).toBe(404);
  });

  it("PATCH non-status field uses updateInvoice directly", async () => {
    await invoicePATCH(
      jsonReq("http://test/api/invoices/x", "PATCH", { number: "INV-002" }),
      ctx,
    );
    expect(batchImpl).not.toHaveBeenCalled();
    expect(mocks.audit.recordTransition).not.toHaveBeenCalled();
    expect(mocks.repo.updateInvoice).toHaveBeenCalledWith(FIXTURE_INVOICE_ID, {
      number: "INV-002",
    });
  });

  it("PATCH status change goes via db.batch and records the transition", async () => {
    batchImpl.mockImplementationOnce(async () => [[fixtureInvoice], [{}]]);
    const res = await invoicePATCH(
      jsonReq("http://test/api/invoices/x", "PATCH", { status: "approved" }),
      ctx,
    );
    expect(res.status).toBe(200);
    expect(batchImpl).toHaveBeenCalledTimes(1);
    expect(mocks.repo.buildUpdateInvoice).toHaveBeenCalledWith(
      FIXTURE_INVOICE_ID,
      { status: "approved" },
    );
    expect(mocks.audit.recordTransition).toHaveBeenCalledWith(
      expect.anything(),
      {
        actorId: "u1",
        entity: { type: "invoice", id: FIXTURE_INVOICE_ID },
        diff: { field: "status", from: "received", to: "approved" },
      },
    );
    expect(mocks.repo.updateInvoice).not.toHaveBeenCalled();
  });

  it("PATCH where db.batch rejects propagates the error", async () => {
    batchImpl.mockRejectedValueOnce(new Error("constraint violation"));
    await expect(
      invoicePATCH(
        jsonReq("http://test/api/invoices/x", "PATCH", { status: "approved" }),
        ctx,
      ),
    ).rejects.toThrow("constraint violation");
  });

  it("PATCH 400 empty body", async () => {
    const res = await invoicePATCH(
      jsonReq("http://test/api/invoices/x", "PATCH", {}),
      ctx,
    );
    expect(res.status).toBe(400);
  });

  it("DELETE removes", async () => {
    const res = await invoiceDELETE(
      jsonReq("http://test/api/invoices/x", "DELETE"),
      ctx,
    );
    expect(res.status).toBe(200);
  });
});

// ── /api/payments ───────────────────────────────────────────────────────

describe("/api/payments", () => {
  it("GET returns the list", async () => {
    const res = await paymentsListGET(
      jsonReq("http://test/api/payments", "GET"),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.payments).toHaveLength(1);
  });

  it("GET threads filters", async () => {
    await paymentsListGET(
      jsonReq(
        `http://test/api/payments?search=hiroko&status=paid&artistId=${FIXTURE_ARTIST_ID}&vendorId=${FIXTURE_VENDOR_ID}&invoiceId=${FIXTURE_INVOICE_ID}`,
        "GET",
      ),
    );
    expect(mocks.repo.listPayments).toHaveBeenCalledWith({
      editionId: FIXTURE_EDITION_ID,
      search: "hiroko",
      status: "paid",
      artistId: FIXTURE_ARTIST_ID,
      vendorId: FIXTURE_VENDOR_ID,
      invoiceId: FIXTURE_INVOICE_ID,
    });
  });

  it("GET silently ignores invalid status", async () => {
    await paymentsListGET(
      jsonReq("http://test/api/payments?status=teleported", "GET"),
    );
    expect(mocks.repo.listPayments).toHaveBeenCalledWith(
      expect.objectContaining({ status: undefined }),
    );
  });

  const validPayment = {
    description: "Hiroko - deposit",
    amountCents: 100000,
    currency: "USD",
    artistId: FIXTURE_ARTIST_ID,
  };

  it("POST creates with valid input", async () => {
    const res = await paymentsPOST(
      jsonReq("http://test/api/payments", "POST", validPayment),
    );
    expect(res.status).toBe(201);
    expect(mocks.repo.createPayment).toHaveBeenCalledWith(
      FIXTURE_EDITION_ID,
      expect.objectContaining({
        description: "Hiroko - deposit",
        amountCents: 100000,
        currency: "USD",
        artistId: FIXTURE_ARTIST_ID,
        status: "pending",
      }),
    );
  });

  it("POST defaults status to pending", async () => {
    await paymentsPOST(
      jsonReq("http://test/api/payments", "POST", validPayment),
    );
    expect(mocks.repo.createPayment).toHaveBeenCalledWith(
      FIXTURE_EDITION_ID,
      expect.objectContaining({ status: "pending" }),
    );
  });

  it("POST 400 missing description", async () => {
    const { description: _drop, ...rest } = validPayment;
    void _drop;
    const res = await paymentsPOST(
      jsonReq("http://test/api/payments", "POST", rest),
    );
    expect(res.status).toBe(400);
  });

  it("POST 400 invalid status", async () => {
    const res = await paymentsPOST(
      jsonReq("http://test/api/payments", "POST", {
        ...validPayment,
        status: "almost",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("POST 400 bad popUrl", async () => {
    const res = await paymentsPOST(
      jsonReq("http://test/api/payments", "POST", {
        ...validPayment,
        popUrl: "not a url",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("POST allows blank artistId/vendorId/invoiceId", async () => {
    await paymentsPOST(
      jsonReq("http://test/api/payments", "POST", {
        ...validPayment,
        artistId: "",
        vendorId: "",
        invoiceId: "",
      }),
    );
    expect(mocks.repo.createPayment).toHaveBeenCalledWith(
      FIXTURE_EDITION_ID,
      expect.objectContaining({
        artistId: null,
        vendorId: null,
        invoiceId: null,
      }),
    );
  });
});

describe("/api/payments/[id]", () => {
  const ctx = { params: Promise.resolve({ id: FIXTURE_PAYMENT_ID }) };

  it("GET returns the payment", async () => {
    const res = await paymentGET(
      jsonReq("http://test/api/payments/x", "GET"),
      ctx,
    );
    expect(res.status).toBe(200);
  });

  it("PATCH non-status field uses updatePayment directly", async () => {
    await paymentPATCH(
      jsonReq("http://test/api/payments/x", "PATCH", { description: "Final" }),
      ctx,
    );
    expect(batchImpl).not.toHaveBeenCalled();
    expect(mocks.audit.recordTransition).not.toHaveBeenCalled();
    expect(mocks.repo.updatePayment).toHaveBeenCalledWith(FIXTURE_PAYMENT_ID, {
      description: "Final",
    });
  });

  it("PATCH status change to paid records audit and stamps paidAt", async () => {
    const res = await paymentPATCH(
      jsonReq("http://test/api/payments/x", "PATCH", { status: "paid" }),
      ctx,
    );
    expect(res.status).toBe(200);
    expect(batchImpl).toHaveBeenCalledTimes(1);
    // The build helper gets the patch with paidAt auto-stamped to a Date.
    expect(mocks.repo.buildUpdatePayment).toHaveBeenCalledWith(
      FIXTURE_PAYMENT_ID,
      expect.objectContaining({
        status: "paid",
        paidAt: expect.any(Date),
      }),
    );
    expect(mocks.audit.recordTransition).toHaveBeenCalledWith(
      expect.anything(),
      {
        actorId: "u1",
        entity: { type: "payment", id: FIXTURE_PAYMENT_ID },
        diff: { field: "status", from: "pending", to: "paid" },
      },
    );
  });

  it("PATCH status change to paid honours an explicit paidAt", async () => {
    const explicit = "2026-04-15T10:00:00Z";
    await paymentPATCH(
      jsonReq("http://test/api/payments/x", "PATCH", {
        status: "paid",
        paidAt: explicit,
      }),
      ctx,
    );
    expect(mocks.repo.buildUpdatePayment).toHaveBeenCalledWith(
      FIXTURE_PAYMENT_ID,
      expect.objectContaining({ status: "paid" }),
    );
    // The auto-stamp should NOT overwrite — the patch already had paidAt.
    const call = mocks.repo.buildUpdatePayment.mock.calls.at(-1);
    const passed = call?.[1] as { paidAt: Date };
    expect(passed.paidAt.toISOString()).toBe("2026-04-15T10:00:00.000Z");
  });

  it("PATCH transitioning to overdue does NOT auto-stamp paidAt", async () => {
    await paymentPATCH(
      jsonReq("http://test/api/payments/x", "PATCH", { status: "overdue" }),
      ctx,
    );
    const call = mocks.repo.buildUpdatePayment.mock.calls.at(-1);
    const passed = call?.[1] as { status: string; paidAt?: Date | null };
    expect(passed.status).toBe("overdue");
    expect("paidAt" in passed).toBe(false);
  });

  it("PATCH 400 invalid status", async () => {
    const res = await paymentPATCH(
      jsonReq("http://test/api/payments/x", "PATCH", { status: "almost" }),
      ctx,
    );
    expect(res.status).toBe(400);
  });

  it("PATCH where db.batch rejects propagates the error", async () => {
    batchImpl.mockRejectedValueOnce(new Error("constraint violation"));
    await expect(
      paymentPATCH(
        jsonReq("http://test/api/payments/x", "PATCH", { status: "paid" }),
        ctx,
      ),
    ).rejects.toThrow("constraint violation");
  });

  it("PATCH 400 empty body", async () => {
    const res = await paymentPATCH(
      jsonReq("http://test/api/payments/x", "PATCH", {}),
      ctx,
    );
    expect(res.status).toBe(400);
  });

  it("DELETE removes", async () => {
    const res = await paymentDELETE(
      jsonReq("http://test/api/payments/x", "DELETE"),
      ctx,
    );
    expect(res.status).toBe(200);
  });

  it("DELETE 401 unauth", async () => {
    mocks.session.getAppSession.mockResolvedValueOnce(null);
    const res = await paymentDELETE(
      jsonReq("http://test/api/payments/x", "DELETE"),
      ctx,
    );
    expect(res.status).toBe(401);
  });
});
