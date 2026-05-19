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

const inboundFlight = {
  passengerName: "Hiroko Yamamura",
  airline: "Air France",
  flightNumber: "TK826",
  fromAirport: "CDG",
  toAirport: "BEY",
  scheduledDt: "2026-08-15T18:45:00Z",
  pnr: "ABC123",
  seat: "14A",
  direction: "inbound",
};

const outboundFlight = {
  passengerName: "Hiroko Yamamura",
  airline: "Air France",
  flightNumber: "TK827",
  fromAirport: "BEY",
  toAirport: "CDG",
  scheduledDt: "2026-08-18T09:00:00Z",
  pnr: "ABC123",
  seat: "14B",
  direction: "outbound",
};

const nullFlight = {
  passengerName: null,
  airline: null,
  flightNumber: null,
  fromAirport: null,
  toAirport: null,
  scheduledDt: null,
  pnr: null,
  seat: null,
  direction: null,
};

describe("parseFlightText", () => {
  it("returns an array with one flight for a one-way confirmation", async () => {
    modelResponds([inboundFlight]);
    const out = await parseFlightText("Air France booking confirmation...");
    expect(out).toHaveLength(1);
    expect(out[0].flightNumber).toBe("TK826");
    expect(out[0].fromAirport).toBe("CDG");
    expect(out[0].toAirport).toBe("BEY");
    expect(out[0].direction).toBe("inbound");
    expect(out[0].pnr).toBe("ABC123");
  });

  it("returns both legs for a round-trip confirmation", async () => {
    modelResponds([inboundFlight, outboundFlight]);
    const out = await parseFlightText("Round-trip confirmation...");
    expect(out).toHaveLength(2);
    expect(out[0].direction).toBe("inbound");
    expect(out[1].direction).toBe("outbound");
    expect(out[1].flightNumber).toBe("TK827");
  });

  it("normalises a legacy single-object response to array", async () => {
    modelResponds(inboundFlight);
    const out = await parseFlightText("one-way confirmation...");
    expect(Array.isArray(out)).toBe(true);
    expect(out[0].flightNumber).toBe("TK826");
  });

  it("accepts null fields when info is missing", async () => {
    modelResponds([nullFlight]);
    const out = await parseFlightText("anything at all");
    expect(out[0].flightNumber).toBeNull();
    expect(out[0].direction).toBeNull();
  });

  it("rejects non-IATA airport codes", async () => {
    modelResponds([{ ...nullFlight, fromAirport: "Paris", toAirport: "BEY" }]);
    await expect(parseFlightText("blah blah")).rejects.toThrow(
      /failed validation/,
    );
  });

  it("rejects lowercase airport codes", async () => {
    modelResponds([{ ...nullFlight, fromAirport: "cdg" }]);
    await expect(parseFlightText("blah blah")).rejects.toThrow(
      /failed validation/,
    );
  });

  it("throws on empty input", async () => {
    await expect(parseFlightText("")).rejects.toThrow("Empty input");
    expect(messagesCreate).not.toHaveBeenCalled();
  });

  it("rejects invalid direction value", async () => {
    modelResponds([{ ...nullFlight, direction: "sideways" }]);
    await expect(parseFlightText("anything at all")).rejects.toThrow(
      /failed validation/,
    );
  });

  it("calls Claude with model + Lebanon system prompt", async () => {
    modelResponds([nullFlight]);
    await parseFlightText("blah blah");
    const call = messagesCreate.mock.calls[0][0];
    expect(call.model).toBe("claude-sonnet-4-6");
    expect(call.system).toContain("Beirut, Lebanon (BEY)");
  });

  it("uses the festival location in the system prompt when provided", async () => {
    modelResponds([nullFlight]);
    await parseFlightText("blah blah", "Batroun, Lebanon (BEY)");
    const call = messagesCreate.mock.calls[0][0];
    expect(call.system).toContain("Batroun, Lebanon (BEY)");
  });
});
