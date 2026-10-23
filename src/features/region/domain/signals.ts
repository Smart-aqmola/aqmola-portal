/**
 * Demo weather and exchange rates for the "My region" panel. There is no external service in the
 * test portal, so the numbers are made from the date: the same day always shows the same values,
 * close to what is usual for Kokshetau in that month. The panel marks them as demo.
 */

export const weatherKinds = ["clear", "cloudy", "rain", "snow"] as const;
export type WeatherKind = (typeof weatherKinds)[number];

/** A small repeatable number in [0, 1) from a day, so tests and pages agree. */
function seeded(day: string, salt: number): number {
  let hash = 2166136261 ^ salt;
  for (const char of day) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return ((hash >>> 0) % 10000) / 10000;
}

// Usual day temperature in Kokshetau by month, January to December.
const MONTHLY = [-14, -13, -5, 7, 16, 22, 23, 21, 14, 6, -4, -11];

export function weatherFor(day: string): { temperature: number; kind: WeatherKind } {
  const month = Number(day.slice(5, 7)) - 1;
  const temperature = MONTHLY[month] + Math.round((seeded(day, 1) - 0.5) * 8);
  const roll = seeded(day, 2);
  const wet = temperature <= 0 ? "snow" : "rain";
  const kind: WeatherKind = roll < 0.4 ? "clear" : roll < 0.8 ? "cloudy" : wet;
  return { temperature, kind };
}

export const currencies = ["USD", "EUR", "RUB"] as const;
export type Currency = (typeof currencies)[number];

const BASE: Record<Currency, number> = { USD: 448, EUR: 521, RUB: 5.6 };

/** Tenge per unit, within ±1 % of a fixed base. */
export function ratesFor(day: string): Record<Currency, number> {
  return Object.fromEntries(
    currencies.map((code, index) => {
      const value = BASE[code] * (1 + (seeded(day, 10 + index) - 0.5) * 0.02);
      return [code, Math.round(value * 100) / 100];
    }),
  ) as Record<Currency, number>;
}
