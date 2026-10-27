import type { EarningExample } from "@/lib/types";

export const SHIP_PRICE_USD = 99;

// Nobody can know how many people will pay for an app, so the model is never asked. It picks a believable price
// and how it is paid; this is the one stated number of paying customers that "an app like this succeeds" stands
// for, and the page shows plain multiplication.
export const SUCCESS_CUSTOMERS = 250;
const MIN_PRICE = 1;
const MAX_PRICE = 30;

export interface ComputedExample {
  price: number;
  paid: "a month" | "once";
  customers: number;
  total: number;
  shipCovered: number | null;
}

export function earningExample(example: EarningExample | undefined, coverShip: boolean): ComputedExample | null {
  if (!example || (example.billing !== "monthly" && example.billing !== "once")) return null;
  const price = example.price_usd;
  if (typeof price !== "number" || !Number.isFinite(price) || price < MIN_PRICE || price > MAX_PRICE) return null;
  const cents = Math.round(price * 100);
  return {
    price,
    paid: example.billing === "monthly" ? "a month" : "once",
    customers: SUCCESS_CUSTOMERS,
    total: Math.round((cents * SUCCESS_CUSTOMERS) / 100),
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
