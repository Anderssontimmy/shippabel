import type { EarningExample } from "@/lib/types";

export const SHIP_PRICE_USD = 99;

// Nobody can know how many people will pay for an app, so the model is never asked. It picks a believable price
// and how it is paid; these audience sizes are fixed, and the page shows plain multiplication.
const AUDIENCES = [25, 100, 500];
const MIN_PRICE = 1;
const MAX_PRICE = 30;

export interface EarningRow {
  customers: number;
  total: number;
}

export interface ComputedExample {
  price: number;
  paid: "a month" | "once";
  rows: EarningRow[];
  shipCovered: number | null;
}

export function earningExample(example: EarningExample | undefined, coverShip: boolean): ComputedExample | null {
  if (!example || (example.billing !== "monthly" && example.billing !== "once")) return null;
  const price = example.price_usd;
  if (typeof price !== "number" || !Number.isFinite(price) || price < MIN_PRICE || price > MAX_PRICE) return null;
  return {
    price,
    paid: example.billing === "monthly" ? "a month" : "once",
    rows: AUDIENCES.map((customers) => ({ customers, total: Math.round(customers * price * 100) / 100 })),
    shipCovered: coverShip ? Math.ceil(SHIP_PRICE_USD / price) : null,
  };
}

export function formatUsd(amount: number): string {
  const whole = Number.isInteger(amount);
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  });
}
