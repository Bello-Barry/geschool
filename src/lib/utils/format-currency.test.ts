import { describe, it, expect } from "vitest";
import { formatCurrency } from "@/lib/utils/format-currency";

describe("formatCurrency", () => {
  it("formats integers with space thousands separator and FCFA suffix", () => {
    expect(formatCurrency(12000)).toBe("12 000 FCFA");
  });

  it("handles small amounts", () => {
    expect(formatCurrency(0)).toBe("0 FCFA");
    expect(formatCurrency(100)).toBe("100 FCFA");
  });

  it("handles large amounts", () => {
    expect(formatCurrency(2500000)).toBe("2 500 000 FCFA");
  });

  it("never uses comma separator or ₣ symbol", () => {
    const out = formatCurrency(2500000);
    expect(out).not.toContain(",");
    expect(out).not.toContain("₣");
    expect(out).toContain("FCFA");
  });

  it("rounds non-integer amounts", () => {
    expect(formatCurrency(12000.5)).toBe("12 001 FCFA");
    expect(formatCurrency(12000.4)).toBe("12 000 FCFA");
  });

  it("handles negative amounts", () => {
    expect(formatCurrency(-5000)).toBe("-5 000 FCFA");
  });

  it("handles NaN and Infinity safely", () => {
    expect(formatCurrency(NaN)).toBe("0 FCFA");
    expect(formatCurrency(Infinity)).toBe("0 FCFA");
  });
});
