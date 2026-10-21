import { describe, expect, it } from "vitest";
import { createAppeal, emptyAppealInput, executorStep } from "@/features/appeals/domain/appeal";
import {
  createProperty,
  decideVerification,
  requestVerification,
  type Property,
} from "@/features/account/domain/property";
import { changeStatus, createApplication } from "@/features/applications/domain/application";
import { createPayment, gatewayNotice } from "@/features/billing/domain/payment";
import type { Charge } from "@/features/billing/domain/charge";
import {
  createDraft,
  providerChange,
  type ContractApplication,
} from "@/features/contracts/domain/contract";
import { createMeter, emptyMeterInput } from "@/features/meters/domain/meter";
import {
  createRequest,
  emptyRequestInput,
  requestProviderChange,
} from "@/features/meters/domain/meter-request";
import { submitReading } from "@/features/meters/domain/reading";
import {
  READING_DUE_DAY,
  buildNotifications,
  notificationEvents,
  unreadOf,
  type NotificationSources,
} from "./notifications";

const t0 = new Date("2026-10-05T06:00:00Z");
const t1 = new Date("2026-10-06T06:00:00Z");
const t2 = new Date("2026-10-07T06:00:00Z");

const empty: NotificationSources = {
  properties: [],
  applications: [],
  contracts: [],
  meters: [],
  readings: [],
  requests: [],
  payments: [],
  appeals: [],
};
const events = (sources: Partial<NotificationSources>, now = t2) =>
  buildNotifications({ ...empty, ...sources }, now).map((item) => item.event);

function property(): Property {
  return createProperty(
    {
      territoryId: "kokshetau",
      locality: "Кокшетау",
      street: "улица Абая",
      house: "10",
      flat: "5",
      type: "apartment",
      relation: "owner",
      personalAccount: "",
      ownerInfo: "Иван",
    },
    "p-1",
    "o-1",
    t0,
  );
}

const meter = createMeter(
  {
    ...emptyMeterInput(),
    resource: "cold_water",
    type: "mechanical",
    serial: "SN-1",
    installedAt: "2024-05-01",
    initialReading: "100",
    lastVerifiedAt: "2020-01-01",
    nextVerificationAt: "2026-11-15",
  },
  { id: "m-1", ownerId: "o-1", propertyId: "p-1", address: "Кокшетау" },
  t0,
);

describe("buildNotifications", () => {
  it("has nothing to say about nothing", () => {
    expect(buildNotifications(empty, t2)).toEqual([]);
  });

  it("tells about the registration of the person and about an object that was added, confirmed or rejected", () => {
    const added = property();
    const pending = requestVerification(
      added,
      { method: "document", documents: [{ name: "a.pdf", size: 5 }] },
      t1,
    );
    if (!pending.ok) throw new Error("setup failed");
    const confirmed = decideVerification(pending.property, "confirmed", undefined, t2);
    const rejected = decideVerification(pending.property, "rejected", "Документ нечитаем", t2);
    if (!confirmed.ok || !rejected.ok) throw new Error("setup failed");

    expect(
      events({ profile: { createdAt: t0.toISOString() }, properties: [confirmed.property] }),
    ).toEqual(["property_confirmed", "property_added", "registered"]);
    const bad = buildNotifications({ ...empty, properties: [rejected.property] }, t2);
    expect(bad[0]).toMatchObject({
      event: "property_rejected",
      note: "Документ нечитаем",
      address: "Кокшетау, улица Абая, 10",
    });
    expect(bad[0].path).toBe("/properties/p-1");
  });

  it("tells about the status of a service application", () => {
    const made = createApplication({
      serviceSlug: "gas-contract",
      serviceTitle: "Договор на газ",
      organizationId: "akmola-gas",
      ownerRole: "resident",
      ownerName: "Иван",
      form: {
        territoryId: "kokshetau",
        address: "Абая, 10",
        attached: [],
        comment: "",
        consent: true,
      },
      number: "DEMO-2026-00001",
      now: t0,
    });
    const working = changeStatus(made, "in_progress", t1);
    if (!working.ok) throw new Error("setup failed");
    const found = buildNotifications({ ...empty, applications: [working.application] }, t2);
    expect(found.map((item) => item.event)).toEqual([
      "application_status",
      "application_submitted",
    ]);
    expect(found[0]).toMatchObject({
      refs: { scope: "application", status: "in_progress" },
      number: "DEMO-2026-00001",
      path: "/applications/DEMO-2026-00001",
    });
  });

  it("tells about a contract: submitted, returned with the remarks, sent to sign, concluded, any other status", () => {
    const base: ContractApplication = {
      ...createDraft(
        {
          propertyId: "p-1",
          sector: "water",
          serviceSlug: "water-contract-resident",
          serviceTitle: "Договор на воду",
          providerId: "akmola-water",
          providerName: "Водоканал",
          applicant: {
            lastName: "И",
            firstName: "И",
            middleName: "",
            iin: "900101300123",
            phone: "+77011234567",
            email: "",
          },
          address: "Кокшетау",
          propertyType: "house",
          basis: "owner",
          personalAccount: "",
        },
        "c-1",
        "o-1",
        t0,
      ),
      status: "registered",
      number: "DEMO-DOG-2026-00001",
      notifyBy: "sms",
      history: [
        { status: "draft", at: t0.toISOString(), actor: "applicant" },
        { status: "registered", at: t0.toISOString(), actor: "applicant" },
      ],
    };
    let current = base;
    for (const [to, note] of [
      ["under_review", undefined],
      ["returned_for_revision", "Приложите документ"],
    ] as const) {
      const step = providerChange(current, to, t1, note);
      if (!step.ok) throw new Error("setup failed");
      current = step.application;
    }
    const found = buildNotifications({ ...empty, contracts: [current] }, t2);
    expect(found.map((item) => item.event)).toEqual([
      "contract_returned",
      "contract_status",
      "contract_submitted",
    ]);
    expect(found[0]).toMatchObject({
      note: "Приложите документ",
      channel: "sms",
      path: "/contracts/c-1",
    });

    const signing = {
      ...base,
      history: [
        ...base.history,
        {
          status: "awaiting_applicant_signature" as const,
          at: t1.toISOString(),
          actor: "provider" as const,
        },
        {
          status: "awaiting_provider_signature" as const,
          at: t1.toISOString(),
          actor: "applicant" as const,
        },
        { status: "concluded" as const, at: t2.toISOString(), actor: "provider" as const },
      ],
    };
    expect(events({ contracts: [signing] })).toEqual([
      "contract_concluded",
      "contract_to_sign",
      "contract_submitted",
    ]);
  });

  it("tells about readings: registered, rejected with the note, any other status; not about the sending itself", () => {
    const sent = submitReading(
      meter,
      [],
      { valueText: "110", readingDate: "2026-10-05", authentic: true, decreaseConfirmed: false },
      { id: "r-1", ownerId: "o-1" },
      t0,
    );
    if (!sent.ok) throw new Error("setup failed");
    const rejected = {
      ...sent.reading,
      history: [
        ...sent.reading.history,
        {
          status: "rejected" as const,
          at: t1.toISOString(),
          actor: "provider" as const,
          note: "Фото нечёткое",
        },
      ],
    };
    const processed = {
      ...sent.reading,
      history: [
        ...sent.reading.history,
        { status: "accepted" as const, at: t1.toISOString(), actor: "provider" as const },
      ],
    };
    expect(events({ readings: [rejected] })).toEqual(["reading_rejected", "reading_registered"]);
    expect(events({ readings: [processed] })).toEqual(["reading_status", "reading_registered"]);
    expect(buildNotifications({ ...empty, readings: [rejected] }, t2)[0].note).toBe(
      "Фото нечёткое",
    );
  });

  it("tells about the work on a meter: registered, scheduled, rescheduled (with the new slot), done", () => {
    let request = createRequest(
      {
        ...emptyRequestInput("fault", "+77011234567"),
        propertyId: "p-1",
        resource: "cold_water",
        meterId: "m-1",
        reason: "leak",
        details: { faultInfo: "течёт" },
        slots: [{ date: "2026-10-20", time: "day" }],
      },
      { id: "q-1", ownerId: "o-1", address: "Кокшетау" },
      [],
      t0,
    );
    const steps: [
      Parameters<typeof requestProviderChange>[1],
      Parameters<typeof requestProviderChange>[3],
    ][] = [
      ["in_progress", {}],
      ["scheduled", { slot: { date: "2026-10-20", time: "day" }, assignee: "Сергеев А." }],
      [
        "scheduled",
        { slot: { date: "2026-10-22", time: "morning" }, assignee: "Сергеев А.", note: "Болен" },
      ],
      ["done", { result: { at: "2026-10-22" } }],
    ];
    for (const [to, extra] of steps) {
      const step = requestProviderChange(request, to, t1, extra);
      if (!step.ok) throw new Error(`${to}: ${step.reason}`);
      request = step.request;
    }
    const found = buildNotifications({ ...empty, requests: [request] }, t2);
    expect(found.map((item) => item.event).sort()).toEqual(
      [
        "meter_request_done",
        "meter_request_registered",
        "meter_request_rescheduled",
        "meter_request_scheduled",
        "meter_request_status",
      ].sort(),
    );
    expect(found.find((item) => item.event === "meter_request_rescheduled")?.refs.slot).toEqual({
      date: "2026-10-22",
      time: "morning",
    });
    expect(
      found.find((item) => item.event === "meter_request_scheduled")?.refs.slot,
    ).toBeUndefined();
    expect(found.find((item) => item.event === "meter_request_scheduled")?.assignee).toBe(
      "Сергеев А.",
    );
  });

  it("tells about the processing and the receipt of a payment, not about the person's own steps", () => {
    const charge: Charge = {
      id: "p-1:g:2026-10",
      propertyId: "p-1",
      providerId: "g",
      providerName: "Газ",
      sector: "gas",
      personalAccount: "1",
      period: "2026-10",
      previousDebt: 0,
      accrued: 10,
      recalculated: 0,
      penalty: 0,
      paid: 0,
      overpayment: 0,
      total: 10,
      generatedAt: "2026-10-01T06:00:00.000Z",
      updatedAt: "2026-10-05T06:00:00.000Z",
      available: true,
    };
    let payment = createPayment(
      [charge],
      "gateway",
      { id: "pay-1", ownerId: "o-1", address: "Кокшетау" },
      [],
      t0,
    );
    for (const [to, id] of [
      ["processing", "n-1"],
      ["paid", "n-2"],
    ] as const) {
      const step = gatewayNotice(payment, to, id, t1);
      if (!step.ok) throw new Error("setup failed");
      payment = step.payment;
    }
    expect(events({ payments: [payment] })).toEqual(["payment_paid", "payment_processing"]);
  });

  it("tells about an appeal: registration, a question, an answer, other statuses; not the person's own messages", () => {
    let appeal = createAppeal(
      {
        ...emptyAppealInput("+77011234567"),
        category: "power_cut",
        subcategory: "long_outage",
        address: "Абая, 10",
        description: "Света нет с утра, соседи тоже",
      },
      { id: "a-1", ownerId: "o-1", organization: { id: "grid", name: "Электросети" } },
      [],
      t0,
    );
    for (const [to, text] of [
      ["accepted", ""],
      ["info_required", "С какого часа?"],
      ["refused", "Не наша компетенция"],
    ] as const) {
      const step = executorStep(appeal, to, text, t1);
      if (!step.ok) throw new Error("setup failed");
      appeal = step.appeal;
    }
    const found = buildNotifications({ ...empty, appeals: [appeal] }, t2);
    expect(found.map((item) => item.event).sort()).toEqual(
      ["appeal_question", "appeal_registered", "appeal_status", "appeal_status"].sort(),
    );
    expect(found.find((item) => item.event === "appeal_question")?.note).toBe("С какого часа?");

    const answered = (() => {
      let current = createAppeal(
        {
          ...emptyAppealInput("+77011234567"),
          category: "power_cut",
          subcategory: "long_outage",
          address: "Абая, 10",
          description: "Света нет с утра, соседи тоже",
        },
        { id: "a-2", ownerId: "o-1", organization: { id: "grid", name: "Электросети" } },
        [],
        t0,
      );
      for (const [to, text] of [
        ["accepted", ""],
        ["in_review", ""],
        ["answer_ready", "Починили"],
      ] as const) {
        const step = executorStep(current, to, text, t1);
        if (!step.ok) throw new Error("setup failed");
        current = step.appeal;
      }
      return current;
    })();
    expect(events({ appeals: [answered] })).toContain("appeal_answer");
  });

  it("reminds about a reading from the 20th, until one is sent this month", () => {
    const before = new Date(`2026-10-${READING_DUE_DAY - 1}T06:00:00Z`);
    const from = new Date(`2026-10-${READING_DUE_DAY}T06:00:00Z`);
    expect(events({ meters: [{ ...meter, nextVerificationAt: "" }] }, before)).toEqual([]);
    const due = buildNotifications(
      { ...empty, meters: [{ ...meter, nextVerificationAt: "" }] },
      from,
    );
    expect(due).toHaveLength(1);
    expect(due[0]).toMatchObject({
      event: "reading_due",
      refs: { resource: "cold_water", serial: "SN-1" },
      path: "/meters/submit?meter=m-1",
    });

    const sent = submitReading(
      meter,
      [],
      { valueText: "110", readingDate: "2026-10-05", authentic: true, decreaseConfirmed: false },
      { id: "r-1", ownerId: "o-1" },
      t0,
    );
    if (!sent.ok) throw new Error("setup failed");
    expect(
      events({ meters: [{ ...meter, nextVerificationAt: "" }], readings: [sent.reading] }, from),
    ).not.toContain("reading_due");
  });

  it("does not remind about a meter that was replaced", () => {
    const from = new Date("2026-10-25T06:00:00Z");
    expect(
      events({ meters: [{ ...meter, state: "replaced", nextVerificationAt: "" }] }, from),
    ).toEqual([]);
  });

  it("warns that a verification is near, only inside the last sixty days", () => {
    expect(events({ meters: [meter] }, new Date("2026-10-05T06:00:00Z"))).toEqual([
      "verification_soon",
    ]);
    expect(events({ meters: [meter] }, new Date("2026-08-01T06:00:00Z"))).toEqual([]);
    expect(events({ meters: [meter] }, new Date("2026-11-16T06:00:00Z"))).toEqual([]);
    const found = buildNotifications(
      { ...empty, meters: [meter] },
      new Date("2026-10-05T06:00:00Z"),
    );
    expect(found[0].refs.date).toBe("2026-11-15");
  });

  it("keeps the same ids and the newest first", () => {
    const sources = {
      ...empty,
      profile: { createdAt: t0.toISOString() },
      properties: [property()],
    };
    const first = buildNotifications(sources, t2);
    expect(
      buildNotifications(sources, new Date("2026-10-30T06:00:00Z")).map((item) => item.id),
    ).toEqual(first.map((item) => item.id));
    expect(first.map((item) => item.at)).toEqual(
      [...first.map((item) => item.at)].sort().reverse(),
    );
    expect(new Set(first.map((item) => item.id)).size).toBe(first.length);
  });

  it("has a text for each of the events in the specification", () => {
    expect(notificationEvents.length).toBeGreaterThanOrEqual(20);
    expect(new Set(notificationEvents).size).toBe(notificationEvents.length);
  });
});

describe("unreadOf", () => {
  const items = buildNotifications(
    { ...empty, profile: { createdAt: t0.toISOString() }, properties: [property()] },
    t2,
  );

  it("counts everything as unread before the person has read anything", () => {
    expect(unreadOf(items, undefined)).toHaveLength(items.length);
  });

  it("counts only what is newer than the last time everything was marked as read", () => {
    expect(unreadOf(items, t0.toISOString())).toEqual([]);
    expect(unreadOf(items, "2026-10-01T00:00:00.000Z")).toHaveLength(items.length);
  });
});
