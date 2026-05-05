import { describe, it, expect } from "vitest";
import { autoFestivalMode, isFestivalMode } from "@/lib/festival-mode";

const edition = (
  start: string,
  end: string,
  active: boolean
) =>
  ({
    startDate: start,
    endDate: end,
    festivalModeActive: active,
  }) as const;

describe("isFestivalMode", () => {
  it("on when festivalModeActive=true regardless of date", () => {
    expect(
      isFestivalMode(
        edition("2026-08-14", "2026-08-16", true),
        new Date("2026-01-01T00:00:00Z")
      )
    ).toBe(true);
  });

  it("on when within date range and active=false", () => {
    expect(
      isFestivalMode(
        edition("2026-08-14", "2026-08-16", false),
        new Date("2026-08-15T18:00:00Z")
      )
    ).toBe(true);
  });

  it("on for the start date itself", () => {
    expect(
      isFestivalMode(
        edition("2026-08-14", "2026-08-16", false),
        new Date("2026-08-14T00:00:00Z")
      )
    ).toBe(true);
  });

  it("on for the end date itself", () => {
    expect(
      isFestivalMode(
        edition("2026-08-14", "2026-08-16", false),
        new Date("2026-08-16T23:59:59Z")
      )
    ).toBe(true);
  });

  it("off before the date range", () => {
    expect(
      isFestivalMode(
        edition("2026-08-14", "2026-08-16", false),
        new Date("2026-08-13T23:59:59Z")
      )
    ).toBe(false);
  });

  it("off after the date range", () => {
    expect(
      isFestivalMode(
        edition("2026-08-14", "2026-08-16", false),
        new Date("2026-08-17T00:00:00Z")
      )
    ).toBe(false);
  });
});

describe("autoFestivalMode", () => {
  it("ignores the active flag and goes off date only", () => {
    expect(
      autoFestivalMode(
        edition("2026-08-14", "2026-08-16", true),
        new Date("2026-01-01T00:00:00Z")
      )
    ).toBe(false);
    expect(
      autoFestivalMode(
        edition("2026-08-14", "2026-08-16", false),
        new Date("2026-08-15T00:00:00Z")
      )
    ).toBe(true);
  });
});
