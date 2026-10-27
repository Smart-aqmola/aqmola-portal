import type { ContractSector } from "@/features/catalog/domain/contract-services";

/**
 * What a provider has charged for one object and one month (spec 9.2). The portal only shows it
 * and never changes it (9.7): a correction is made by the provider and comes with the next data.
 * Amounts are whole tenge.
 */
export type Charge = {
  id: string;
  propertyId: string;
  providerId: string;
  providerName: string;
  sector: ContractSector;
  personalAccount: string;
  /** `YYYY-MM`. */
  period: string;
  previousDebt: number;
  accrued: number;
  /** Negative when the provider took something off, positive when it added (spec 9.2). */
  recalculated: number;
  penalty: number;
  paid: number;
  overpayment: number;
  /** What is left to pay: debt, accrued, recalculations and penalty, less payments and overpayment. */
  total: number;
  /** ISO date and time the charge was made. */
  generatedAt: string;
  /** `YYYY-MM-DD`; absent when the provider does not give a term. */
  dueAt?: string;
  /** When the provider last sent its data (spec 9.8). */
  updatedAt: string;
  /** False when the provider has sent nothing fresh: the amounts are the last known (spec 9.8). */
  available: boolean;
};

export const PERIODS_SHOWN = 6;

/** "2026-10" for a date; the month never shifts with the visitor's time zone. */
export function periodOf(now: Date): string {
  return now.toISOString().slice(0, 7);
}

/** The month and the months before it, newest first: ("2026-02", 3) -> 2026-02, 2026-01, 2025-12. */
export function periodsBack(current: string, count: number): string[] {
  const [year, month] = current.split("-").map(Number);
  return Array.from({ length: count }, (_, index) => {
    const total = year * 12 + (month - 1) - index;
    return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
  });
}

export type Totals = Pick<
  Charge,
  "previousDebt" | "accrued" | "recalculated" | "penalty" | "paid" | "overpayment" | "total"
>;

/** The sums over several charges, for the summary of an object (spec 9.3). */
export function totalsOf(charges: readonly Charge[]): Totals {
  const sum = (key: keyof Totals) => charges.reduce((all, charge) => all + charge[key], 0);
  return {
    previousDebt: sum("previousDebt"),
    accrued: sum("accrued"),
    recalculated: sum("recalculated"),
    penalty: sum("penalty"),
    paid: sum("paid"),
    overpayment: sum("overpayment"),
    total: sum("total"),
  };
}

/** A charge can be paid when there is something to pay and the provider's data is fresh. */
export function isPayable(charge: Pick<Charge, "total" | "available">): boolean {
  return charge.available && charge.total > 0;
}
