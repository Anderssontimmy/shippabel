import { describe, expect, it } from "vitest";
import { earningExample, formatUsd, SHIP_PRICE_USD } from "./earningExample";

describe("earningExample", () => {
  it("multiplies one price by fixed example audiences, so every figure can be checked by hand", () => {
    const example = earningExample({ billing: "monthly", price_usd: 3.99 }, false);
    expect(example?.rows).toEqual([
      { customers: 25, total: 99.75 },
      { customers: 100, total: 399 },
      { customers: 500, total: 1995 },
    ]);
  });

  it("says whether the money comes every month or once", () => {
    expect(earningExample({ billing: "monthly", price_usd: 4 }, false)?.paid).toBe("a month");
    expect(earningExample({ billing: "once", price_usd: 4 }, false)?.paid).toBe("once");
  });

  it("works out how many paying customers would cover Ship's price, rounded up", () => {
    expect(earningExample({ billing: "monthly", price_usd: 3.99 }, true)?.shipCovered).toBe(Math.ceil(SHIP_PRICE_USD / 3.99));
    expect(earningExample({ billing: "once", price_usd: 30 }, true)?.shipCovered).toBe(4);
    expect(earningExample({ billing: "once", price_usd: 1 }, true)?.shipCovered).toBe(99);
  });

  it("leaves Ship's price out for someone who already has Ship", () => {
    expect(earningExample({ billing: "monthly", price_usd: 4 }, false)?.shipCovered).toBeNull();
  });

  it("gives nothing for a price that cannot be trusted", () => {
    for (const price of [0, -3, NaN, Infinity, 0.99, 30.5, 1000]) {
      expect(earningExample({ billing: "monthly", price_usd: price }, true), String(price)).toBeNull();
    }
    expect(earningExample({ billing: "weekly" as never, price_usd: 4 }, true)).toBeNull();
    expect(earningExample(undefined, true)).toBeNull();
  });

  it("writes prices with cents only when they have cents, and thousands with a comma", () => {
    expect(formatUsd(4)).toBe("$4");
    expect(formatUsd(3.99)).toBe("$3.99");
    expect(formatUsd(99.75)).toBe("$99.75");
    expect(formatUsd(1995)).toBe("$1,995");
    expect(formatUsd(12345.6)).toBe("$12,345.60");
  });
});
