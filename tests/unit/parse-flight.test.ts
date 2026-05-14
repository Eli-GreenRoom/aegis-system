import { describe, it, expect, vi, beforeEach } from "vitest";

const { messagesCreate } = vi.hoisted(() => {
  return { messagesCreate: vi.fn() };
});

vi.mock("@/lib/ai/client", () => ({
  anthropic: { messages: { create: messagesCreate } },
  AI_MODEL: "claude-sonnet-4-6",
}));

import { parseFlightText } from "@/lib/ai/parse-flight";

beforeEach(() => {
  messagesCreate.mockReset();
});

function modelResponds(payload: unknown) {
  messagesCreate.mockResolvedValueOnce({
    content: [{ type: "text", text: JSON.stringify(payload) }],
  });
}

describe("parseFlightText", () => {
  it("returns the structured JSON for a typical confirmation", async () => {
    modelResponds({
      passengerName: "Hiroko Yamamura",
      airline: "Air France",
      flightNumber: "TK826",
      fromAirport: "CDG",
      toAirport: "BEY",
      scheduledDt: "2026-08-15T18:45:00Z",
      pnr: "ABC123",
      seat: "14A",
      direction: "inbound",
    });
    const out = await parseFlightText("Air France booking confirmation...");
    expect(out.flightNumber).toBe("TK826");
    expect(out.fromAirport).toBe("CDG");
    expect(out.toAirport).toBe("BEY");
    expect(out.direction).toBe("inbound");
    expect(out.pnr).toBe("ABC123");
  });

  it("accepts null fields when info is missing", async () => {
    modelResponds({
      passengerName: null,
      airline: null,
      flightNumber: null,
      fromAirport: null,
      toAirport: null,
      scheduledDt: null,
      pnr: null,
      seat: null,
      direction: null,
    });
    const out = await parseFlightText("anything at all");
    expect(out.flightNumber).toBeNull();
    expect(out.direction).toBeNull();
  });

  it("rejects non-IATA airport codes", async () => {
    modelResponds({
      passengerName: "X",
      airline: null,
      flightNumber: null,
      fromAirport: "Paris",
      toAirport: "BEY",
      scheduledDt: null,
      pnr: null,
      seat: null,
      direction: null,
    });
    await expect(parseFlightText("blah blah")).rejects.toThrow(
      /failed validation/,
    );
  });

  it("rejects lowercase airport codes", async () => {
    modelResponds({
      passengerName: null,
      airline: null,
      flightNumber: null,
      fromAirport: "cdg",
      toAirport: null,
      scheduledDt: null,
      pnr: null,
      seat: null,
      direction: null,
    });
    await expect(parseFlightText("blah blah")).rejects.toThrow(
      /failed validation/,
    );
  });

  it("throws on empty input", async () => {
    await expect(parseFlightText("")).rejects.toThrow("Empty input");
    expect(messagesCreate).not.toHaveBeenCalled();
  });

  it("rejects invalid direction value", async () => {
    modelResponds({
      passengerName: null,
      airline: null,
      flightNumber: null,
      fromAirport: null,
      toAirport: null,
      scheduledDt: null,
      pnr: null,
      seat: null,
      direction: "sideways",
    });
    await expect(parseFlightText("anything at all")).rejects.toThrow(
      /failed validation/,
    );
  });

  it("calls Claude with model + Lebanon system prompt", async () => {
    modelResponds({
      passengerName: null,
      airline: null,
      flightNumber: null,
      fromAirport: null,
      toAirport: null,
      scheduledDt: null,
      pnr: null,
      seat: null,
      direction: null,
    });
    await parseFlightText("blah blah");
    const call = messagesCreate.mock.calls[0][0];
    expect(call.model).toBe("claude-sonnet-4-6");
    expect(call.system).toContain("Beirut, Lebanon (BEY)");
  });
});
