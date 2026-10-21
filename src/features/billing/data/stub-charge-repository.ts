import { PERIODS_SHOWN, periodOf, periodsBack, type Charge } from "../domain/charge";
import type { ChargeRepository, FeedProvider } from "../domain/repository";

/** The same text always gives the same number, so the test amounts do not jump between visits. */
function hash(text: string): number {
  let value = 2166136261;
  for (const char of text) {
    value ^= char.codePointAt(0) ?? 0;
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

const tens = (value: number) => Math.round(value / 10) * 10;

/** [lowest, spread] of the monthly charge in tenge. */
const RANGES: Record<FeedProvider["sector"], readonly [number, number]> = {
  electricity: [6000, 9000],
  water: [2500, 4500],
  heat: [9000, 16000],
  gas: [3000, 6000],
  waste: [800, 700],
};

/** In the test data the waste operator never sends fresh data, to show the notice of spec 9.8. */
const SILENT = ["waste"] as const;
const SILENT_DAYS = 12;

function chargesOfProvider(propertyId: string, provider: FeedProvider, now: Date): Charge[] {
  const current = periodOf(now);
  const periods = periodsBack(current, PERIODS_SHOWN).reverse();
  const behaviour = hash(`${propertyId}:${provider.id}`) % 4;
  const account = String(10_000_000 + (hash(`account:${propertyId}:${provider.id}`) % 89_999_999));
  const silent = (SILENT as readonly string[]).includes(provider.sector);
  const [lowest, spread] = RANGES[provider.sector];

  const charges: Charge[] = [];
  let debt = 0;
  let credit = 0;
  periods.forEach((period, index) => {
    const seed = hash(`${propertyId}:${provider.id}:${period}`);
    const accrued = tens(lowest + (seed % spread));
    const recalculated = seed % 7 === 0 ? -tens(accrued * 0.05) : 0;
    const penalty = debt > 0 ? Math.round(debt * 0.01) : 0;
    const due = debt + accrued + recalculated + penalty - credit;
    const isCurrent = period === current;
    // Most people pay in full; one provider in four has a month left unpaid and a month half paid,
    // and one in four has a month overpaid, so the lists show debt and overpayment (spec 9.2).
    let paid = due;
    if (isCurrent) paid = 0;
    else if (behaviour === 2 && index === 2) paid = 0;
    else if (behaviour === 2 && index === 3) paid = Math.floor(due / 2);
    else if (behaviour === 3 && index === 1) paid = due + 500;
    const net = due - paid;
    const generatedAt = `${period}-01T06:00:00.000Z`;
    const stale = silent && isCurrent;
    charges.push({
      id: `${propertyId}:${provider.id}:${period}`,
      propertyId,
      providerId: provider.id,
      providerName: provider.name,
      sector: provider.sector,
      personalAccount: account,
      period,
      previousDebt: debt,
      accrued,
      recalculated,
      penalty,
      paid,
      overpayment: Math.max(-net, 0),
      total: Math.max(net, 0),
      generatedAt,
      ...(silent ? {} : { dueAt: `${period}-25` }),
      updatedAt: stale
        ? new Date(now.getTime() - SILENT_DAYS * 24 * 60 * 60 * 1000).toISOString()
        : isCurrent
          ? now.toISOString()
          : generatedAt,
      available: !stale,
    });
    debt = Math.max(net, 0);
    credit = Math.max(-net, 0);
  });
  return charges;
}

/** Charges made up from the id of the object, the provider and the month; nothing is stored. */
export const stubChargeRepository: ChargeRepository = {
  listForProperty({ propertyId, providers, now }) {
    return providers.flatMap((provider) => chargesOfProvider(propertyId, provider, now));
  },
};
