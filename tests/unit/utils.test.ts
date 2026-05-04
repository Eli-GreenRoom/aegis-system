import { describe, it, expect } from "vitest";
import { cn, formatCents } from "@/lib/utils";

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("dedupes conflicting tailwind utilities", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });

  it("ignores falsy values", () => {
    expect(cn("a", false && "b", null, undefined, "c")).toBe("a c");
  });
});

describe("formatCents", () => {
  it("formats whole-number cents to two decimals", () => {
    expect(formatCents(120000)).toBe("1,200.00");
  });

  it("formats small amounts", () => {
    expect(formatCents(99)).toBe("0.99");
  });

  it("returns dash for null and undefined", () => {
    expect(formatCents(null)).toBe("—");
    expect(formatCents(undefined)).toBe("—");
  });
});
