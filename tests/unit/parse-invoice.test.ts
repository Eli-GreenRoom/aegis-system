import { describe, it, expect, vi, beforeEach } from "vitest";

const { messagesCreate } = vi.hoisted(() => {
  return { messagesCreate: vi.fn() };
});

vi.mock("@/lib/ai/client", () => ({
  anthropic: { messages: { create: messagesCreate } },
  AI_MODEL: "claude-sonnet-4-6",
}));

import { parseInvoiceText } from "@/lib/ai/parse-invoice";

beforeEach(() => {
  messagesCreate.mockReset();
});

function modelResponds(payload: unknown) {
  messagesCreate.mockResolvedValueOnce({
    content: [{ type: "text", text: JSON.stringify(payload) }],
  });
}

function modelRespondsRaw(text: string) {
  messagesCreate.mockResolvedValueOnce({
    content: [{ type: "text", text }],
  });
}

describe("parseInvoiceText", () => {
  it("returns the structured JSON when the model responds correctly", async () => {
    modelResponds({
      vendor: "Byblos Sur Mer",
      invoiceNumber: "BSM-1042",
      amount: 8325,
      currency: "USD",
      issueDate: "2026-04-14",
      dueDate: "2026-05-01",
      lineItems: [
        { description: "10x Deluxe Sea View, 3 nights @ $250", amount: 7500 },
        { description: "VAT 11%", amount: 825 },
      ],
      issuerKind: "hotel",
    });

    const out = await parseInvoiceText("any input long enough to pass guard");
    expect(out.vendor).toBe("Byblos Sur Mer");
    expect(out.amount).toBe(8325);
    expect(out.currency).toBe("USD");
    expect(out.issueDate).toBe("2026-04-14");
    expect(out.lineItems).toHaveLength(2);
    expect(out.issuerKind).toBe("hotel");
  });

  it("accepts null fields when the model can't extract them", async () => {
    modelResponds({
      vendor: "X",
      invoiceNumber: null,
      amount: null,
      currency: null,
      issueDate: null,
      dueDate: null,
      lineItems: [],
      issuerKind: null,
    });
    const out = await parseInvoiceText("blah blah");
    expect(out.vendor).toBe("X");
    expect(out.amount).toBeNull();
    expect(out.lineItems).toEqual([]);
  });

  it("throws on empty input", async () => {
    await expect(parseInvoiceText("   ")).rejects.toThrow("Empty input");
    expect(messagesCreate).not.toHaveBeenCalled();
  });

  it("throws when the model returns invalid JSON", async () => {
    modelRespondsRaw("not json at all");
    await expect(parseInvoiceText("blah blah")).rejects.toThrow(
      /invalid JSON/
    );
  });

  it("throws when validation fails (e.g. wrong currency)", async () => {
    modelResponds({
      vendor: "X",
      invoiceNumber: null,
      amount: 100,
      currency: "GBP",
      issueDate: null,
      dueDate: null,
      lineItems: [],
      issuerKind: null,
    });
    await expect(parseInvoiceText("blah blah")).rejects.toThrow(
      /failed validation/
    );
  });

  it("throws when validation fails on bad date format", async () => {
    modelResponds({
      vendor: "X",
      invoiceNumber: null,
      amount: 100,
      currency: "USD",
      issueDate: "April 14, 2026",
      dueDate: null,
      lineItems: [],
      issuerKind: null,
    });
    await expect(parseInvoiceText("blah blah")).rejects.toThrow(
      /failed validation/
    );
  });

  it("calls Claude with the configured model + system prompt", async () => {
    modelResponds({
      vendor: null,
      invoiceNumber: null,
      amount: null,
      currency: null,
      issueDate: null,
      dueDate: null,
      lineItems: [],
      issuerKind: null,
    });
    await parseInvoiceText("blah blah");
    const call = messagesCreate.mock.calls[0][0];
    expect(call.model).toBe("claude-sonnet-4-6");
    expect(call.system).toContain("structured data from inbound invoices");
    expect(call.messages).toEqual([
      { role: "user", content: "blah blah" },
    ]);
  });
});
