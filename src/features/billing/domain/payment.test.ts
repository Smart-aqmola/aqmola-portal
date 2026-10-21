import { describe, expect, it } from "vitest";
import type { Charge } from "./charge";
import {
  applicantAction,
  applyPayments,
  checkSelection,
  createPayment,
  gatewayNotice,
  gatewayOptions,
  isFinalPayment,
  isOpen,
  nextPaymentNumber,
  paymentReference,
  paymentStatuses,
  type Payment,
} from "./payment";

const now = new Date("2026-10-21T06:00:00Z");

const charge = (id: string, patch: Partial<Charge> = {}): Charge => ({
  id,
  propertyId: "p-1",
  providerId: `prov-${id}`,
  providerName: `Поставщик ${id}`,
  sector: "gas",
  personalAccount: "12345678",
  period: "2026-10",
  previousDebt: 0,
  accrued: 1000,
  recalculated: 0,
  penalty: 0,
  paid: 0,
  overpayment: 0,
  total: 1000,
  generatedAt: "2026-10-01T06:00:00.000Z",
  updatedAt: "2026-10-21T06:00:00.000Z",
  available: true,
  ...patch,
});

function payment(charges: Charge[] = [charge("a"), charge("b", { total: 2500 })]): Payment {
  return createPayment(
    charges,
    "gateway",
    { id: "11112222-3333", ownerId: "o-1", address: "Кокшетау, Абая, 1" },
    [],
    now,
  );
}

describe("createPayment", () => {
  it("pays every chosen service in full and keeps the split by provider (9.12)", () => {
    const made = payment();
    expect(made.total).toBe(3500);
    expect(made.lines.map((line) => [line.providerId, line.amount])).toEqual([
      ["prov-a", 1000],
      ["prov-b", 2500],
    ]);
    expect(made.status).toBe("awaiting_payment");
    expect(made.number).toBe("DEMO-PAY-2026-00001");
    expect(made.reference).toBe("PAY-11112222");
    expect(made.history).toHaveLength(1);
  });

  it("will not make a payment for nothing", () => {
    expect(() => payment([])).toThrow();
  });

  it("goes on from the highest number of the year", () => {
    expect(nextPaymentNumber([{ number: "DEMO-PAY-2026-00007" }], now)).toBe("DEMO-PAY-2026-00008");
    expect(nextPaymentNumber([{ number: "DEMO-PAY-2025-00007" }], now)).toBe("DEMO-PAY-2026-00001");
  });

  it("makes the identifier from the id, upper case without dashes", () => {
    expect(paymentReference("ab12-cd34-ef56")).toBe("PAY-AB12CD34");
  });
});

describe("checkSelection", () => {
  it("accepts services with something to pay", () => {
    expect(checkSelection([charge("a")], [])).toBeNull();
  });

  it("names what is wrong", () => {
    expect(checkSelection([], [])).toBe("empty");
    expect(checkSelection([charge("a", { available: false })], [])).toBe("unavailable");
    expect(checkSelection([charge("a", { total: 0 })], [])).toBe("nothing_due");
  });

  it("does not let a service be paid twice while a payment for it is on its way", () => {
    const open = payment([charge("a")]);
    expect(checkSelection([charge("a")], [open])).toBe("pending");
    const done = { ...open, status: "declined" as const };
    expect(checkSelection([charge("a")], [done])).toBeNull();
  });
});

describe("the person's steps", () => {
  it("goes to pay and can give up before the service has taken it", () => {
    const started = applicantAction(payment(), "start", now);
    if (!started.ok) throw new Error("start");
    expect(started.payment.status).toBe("initiated");
    const cancelled = applicantAction(started.payment, "cancel", now);
    expect(cancelled.ok && cancelled.payment.status).toBe("cancelled");
  });

  it("cannot start twice or cancel what is already being processed", () => {
    const started = applicantAction(payment(), "start", now);
    if (!started.ok) throw new Error("start");
    expect(applicantAction(started.payment, "start", now)).toEqual({
      ok: false,
      reason: "not_allowed",
    });
    const processing = gatewayNotice(started.payment, "processing", "n-1", now);
    if (!processing.ok) throw new Error("processing");
    expect(applicantAction(processing.payment, "cancel", now)).toEqual({
      ok: false,
      reason: "not_allowed",
    });
  });
});

describe("the notices of the payment service (9.15–9.17)", () => {
  function through(...steps: [Payment["status"], string][]): Payment {
    let current = payment();
    for (const [to, id] of steps) {
      const result = gatewayNotice(current, to, id, now);
      if (!result.ok) throw new Error(`${to}: ${result.reason}`);
      current = result.payment;
    }
    return current;
  }

  it("walks processing -> paid and keeps every step in the history", () => {
    const paid = through(["processing", "n-1"], ["paid", "n-2"]);
    expect(paid.status).toBe("paid");
    expect(paid.history.map((entry) => entry.status)).toEqual([
      "awaiting_payment",
      "processing",
      "paid",
    ]);
  });

  it("takes a repeated notice in once: nothing changes the second time", () => {
    const paid = through(["processing", "n-1"], ["paid", "n-2"]);
    const again = gatewayNotice(paid, "paid", "n-2", now);
    expect(again).toMatchObject({ ok: true, duplicate: true });
    expect(again.ok && again.payment).toBe(paid);
  });

  it("refuses a step that is not allowed and a new notice for a finished payment", () => {
    expect(gatewayNotice(payment(), "paid", "n-1", now)).toEqual({
      ok: false,
      reason: "not_allowed",
    });
    const declined = through(["processing", "n-1"], ["declined", "n-2"]);
    expect(gatewayNotice(declined, "paid", "n-3", now)).toEqual({
      ok: false,
      reason: "not_allowed",
    });
  });

  it("can wait for the bank and be refunded after being paid", () => {
    const waiting = through(["processing", "n-1"], ["awaiting_confirmation", "n-2"]);
    expect(gatewayOptions(waiting.status)).toEqual(["paid", "declined"]);
    const refunded = through(["processing", "n-1"], ["paid", "n-2"], ["refunded", "n-3"]);
    expect(refunded.status).toBe("refunded");
    expect(isFinalPayment(refunded.status)).toBe(true);
  });

  it("knows which statuses are still open", () => {
    expect(paymentStatuses.filter(isOpen)).toEqual([
      "awaiting_payment",
      "initiated",
      "processing",
      "awaiting_confirmation",
    ]);
  });
});

describe("applyPayments", () => {
  const charges = [charge("a"), charge("b", { total: 2500 })];
  const paid = (): Payment => {
    const made = payment(charges);
    return { ...made, status: "paid" };
  };

  it("takes a paid payment into the charges the way the provider would show it", () => {
    const [a, b] = applyPayments(charges, [paid()]);
    expect(a).toMatchObject({ paid: 1000, total: 0, overpayment: 0 });
    expect(b).toMatchObject({ paid: 2500, total: 0 });
  });

  it("ignores payments that are not paid or were refunded", () => {
    for (const status of ["awaiting_payment", "processing", "declined", "refunded"] as const) {
      expect(applyPayments(charges, [{ ...paid(), status }])).toEqual(charges);
    }
  });

  it("leaves the other charges alone and never changes the originals", () => {
    const only = payment([charge("a")]);
    const [a, b] = applyPayments(charges, [{ ...only, status: "paid" }]);
    expect(a.total).toBe(0);
    expect(b).toBe(charges[1]);
    expect(charges[0].total).toBe(1000);
  });
});
