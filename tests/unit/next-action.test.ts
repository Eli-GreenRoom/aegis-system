import { describe, it, expect } from "vitest";
import { getNextAction } from "@/lib/artists/next-action";
import type { ArtistRoadsheet } from "@/lib/aggregators";

const ARTIST_ID = "11111111-1111-4111-8111-111111111111";

function emptySheet(): ArtistRoadsheet {
  return {
    artist: {
      id: ARTIST_ID,
      name: "Test Artist",
      needsContract: true,
      needsFlight: true,
      needsHotel: true,
      needsGround: true,
      needsPayment: true,
      needsRider: true,
    } as ArtistRoadsheet["artist"],
    set: null,
    inboundFlight: null,
    outboundFlight: null,
    hotel: null,
    pickups: [],
    riders: [],
    payments: [],
    contract: null,
  };
}

function confirmedSet(): ArtistRoadsheet["set"] {
  return {
    set: {
      id: "s1",
      status: "confirmed",
    } as ArtistRoadsheet["set"] extends infer T
      ? T extends { set: infer S }
        ? S
        : never
      : never,
    slot: {
      id: "sl1",
      date: "2026-08-15",
      startTime: "22:00",
    } as ArtistRoadsheet["set"] extends infer T
      ? T extends { slot: infer SL }
        ? SL
        : never
      : never,
    stage: { id: "st1", name: "Main" } as ArtistRoadsheet["set"] extends infer T
      ? T extends { stage: infer ST }
        ? ST
        : never
      : never,
  };
}

describe("getNextAction", () => {
  it("returns null next when fully prepped", () => {
    const sheet = emptySheet();
    sheet.set = confirmedSet();
    sheet.contract = { status: "signed" } as ArtistRoadsheet["contract"];
    sheet.inboundFlight = {
      status: "scheduled",
    } as ArtistRoadsheet["inboundFlight"];
    sheet.hotel = {
      booking: { status: "booked" },
      hotelName: "Byblos",
    } as ArtistRoadsheet["hotel"];
    sheet.pickups = [{ id: "p1" } as ArtistRoadsheet["pickups"][number]];
    sheet.payments = [
      { status: "paid" } as ArtistRoadsheet["payments"][number],
    ];

    const out = getNextAction(sheet);
    expect(out.next).toBeNull();
    expect(out.gaps).toEqual([]);
    expect(out.doneSteps).toBe(6);
  });

  it("flags 'set' first when nothing is scheduled", () => {
    const out = getNextAction(emptySheet());
    expect(out.next?.gap).toBe("set");
    expect(out.next?.sheet).toBeNull();
    expect(out.next?.href).toBe("/lineup");
    expect(out.gaps[0]).toBe("set");
    expect(out.doneSteps).toBe(0);
  });

  it("flags 'contract' once set is confirmed", () => {
    const sheet = emptySheet();
    sheet.set = confirmedSet();
    const out = getNextAction(sheet);
    expect(out.next?.gap).toBe("contract");
    expect(out.next?.sheet).toBe("contract");
  });

  it("flags 'inbound_flight' once contract is signed", () => {
    const sheet = emptySheet();
    sheet.set = confirmedSet();
    sheet.contract = { status: "signed" } as ArtistRoadsheet["contract"];
    const out = getNextAction(sheet);
    expect(out.next?.gap).toBe("inbound_flight");
    expect(out.next?.sheet).toBe("flight_inbound");
    // Reason should mention the set date
    expect(out.next?.reason).toContain("2026-08-15");
  });

  it("skips flight gap when needsFlight is false", () => {
    const sheet = emptySheet();
    sheet.artist = { ...sheet.artist, needsFlight: false };
    sheet.set = confirmedSet();
    sheet.contract = { status: "signed" } as ArtistRoadsheet["contract"];
    const out = getNextAction(sheet);
    expect(out.next?.gap).toBe("hotel");
    expect(out.gaps).not.toContain("inbound_flight");
  });

  it("treats unsigned contract as missing", () => {
    const sheet = emptySheet();
    sheet.set = confirmedSet();
    sheet.contract = { status: "sent" } as ArtistRoadsheet["contract"];
    const out = getNextAction(sheet);
    expect(out.next?.gap).toBe("contract");
    expect(out.next?.sheet).toBeNull();
    expect(out.next?.href).toContain("/contracts/");
  });

  it("flags payment last", () => {
    const sheet = emptySheet();
    sheet.set = confirmedSet();
    sheet.contract = { status: "signed" } as ArtistRoadsheet["contract"];
    sheet.inboundFlight = {
      status: "scheduled",
    } as ArtistRoadsheet["inboundFlight"];
    sheet.hotel = {
      booking: { status: "booked" },
      hotelName: "Byblos",
    } as ArtistRoadsheet["hotel"];
    sheet.pickups = [{ id: "p1" } as ArtistRoadsheet["pickups"][number]];
    // No payments at all
    const out = getNextAction(sheet);
    expect(out.next?.gap).toBe("payment");
    expect(out.next?.sheet).toBe("payment");
    expect(out.doneSteps).toBe(5);
  });

  it("treats cancelled hotel as missing", () => {
    const sheet = emptySheet();
    sheet.set = confirmedSet();
    sheet.contract = { status: "signed" } as ArtistRoadsheet["contract"];
    sheet.inboundFlight = {
      status: "scheduled",
    } as ArtistRoadsheet["inboundFlight"];
    sheet.hotel = {
      booking: { status: "cancelled" },
      hotelName: "Byblos",
    } as ArtistRoadsheet["hotel"];
    const out = getNextAction(sheet);
    expect(out.next?.gap).toBe("hotel");
  });
});
