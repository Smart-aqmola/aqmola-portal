import { describe, expect, it } from "vitest";
import { createMeter, emptyMeterInput, type Meter } from "./meter";
import {
  completeRequest,
  createRequest,
  emptyRequestInput,
  isRequestFinal,
  nextRequestNumber,
  requestForms,
  requestHasErrors,
  requestKinds,
  requestProviderChange,
  requestProviderOptions,
  validateRequest,
  type MeterRequest,
  type RequestInput,
  type RequestKind,
} from "./meter-request";

const now = new Date("2026-10-21T06:00:00Z");

const meter: Meter = createMeter(
  {
    ...emptyMeterInput("12345678"),
    resource: "cold_water",
    type: "mechanical",
    serial: "SN-1",
    installedAt: "2024-05-01",
    initialReading: "100",
    sealedAt: "2024-05-02",
    sealNumber: "P-1",
  },
  { id: "m-1", ownerId: "o-1", propertyId: "p-1", address: "Кокшетау" },
  now,
);

function input(kind: RequestKind, patch: Partial<RequestInput> = {}): RequestInput {
  const base = emptyRequestInput(kind, "+7 701 123 45 67");
  return {
    ...base,
    propertyId: "p-1",
    resource: "cold_water",
    meterId: "m-1",
    reason: requestForms[kind].reasons[0],
    currentReading: "150",
    slots: [{ date: "2026-10-25", time: "morning" }],
    details: {
      faultInfo: "Не крутится",
      installedAt: "2024-05-01",
      plannedWork: "Ремонт трубы",
    },
    ...patch,
  };
}

describe("validateRequest", () => {
  it("accepts a filled form of every kind", () => {
    for (const kind of requestKinds) {
      expect(validateRequest(input(kind), now, meter), kind).toEqual({});
    }
  });

  it("asks for the common fields", () => {
    const errors = validateRequest(
      { ...emptyRequestInput("replacement"), slots: [{ date: "", time: "morning" }] },
      now,
    );
    expect(errors).toMatchObject({
      propertyId: "required",
      resource: "required",
      meterId: "required",
      reason: "required",
      contactPhone: "required",
      slots: "required",
      currentReading: "required",
      details: { faultInfo: "required" },
    });
  });

  it("does not need a meter to install one, nor a reading", () => {
    const errors = validateRequest(input("installation", { meterId: "", currentReading: "" }), now);
    expect(errors).toEqual({});
  });

  it("asks for what is special to each service (8.3–8.6)", () => {
    expect(validateRequest(input("sealing", { details: {} }), now).details).toEqual({
      installedAt: "required",
    });
    expect(validateRequest(input("unseal", { details: {} }), now).details).toEqual({
      plannedWork: "required",
    });
    expect(validateRequest(input("fault", { details: {} }), now).details).toEqual({
      faultInfo: "required",
    });
  });

  it("checks the dates of a verification", () => {
    const errors = validateRequest(
      input("verification", {
        details: { lastVerifiedAt: "2026-01-01", nextVerificationAt: "2025-01-01" },
      }),
      now,
    );
    expect(errors.details).toEqual({ nextVerificationAt: "order" });
  });

  it("checks the visit dates: past, too far, repeated", () => {
    const slots = (...dates: string[]) => dates.map((date) => ({ date, time: "morning" as const }));
    expect(validateRequest(input("fault", { slots: slots("2026-10-20") }), now).slots).toBe("past");
    expect(validateRequest(input("fault", { slots: slots("2027-03-01") }), now).slots).toBe("far");
    expect(
      validateRequest(input("fault", { slots: slots("2026-10-25", "2026-10-25") }), now).slots,
    ).toBe("same");
    expect(
      validateRequest(
        input("fault", {
          slots: [
            { date: "2026-10-25", time: "morning" },
            { date: "2026-10-25", time: "day" },
          ],
        }),
        now,
      ).slots,
    ).toBeUndefined();
  });

  it("checks the phone, the reading against the meter, the comment and the files", () => {
    expect(validateRequest(input("fault", { contactPhone: "12" }), now).contactPhone).toBe(
      "format",
    );
    expect(
      validateRequest(input("replacement", { currentReading: "123456789" }), now, meter)
        .currentReading,
    ).toBe("digits");
    expect(validateRequest(input("fault", { comment: "x".repeat(501) }), now).comment).toBe("long");
    expect(
      validateRequest(input("fault", { attachments: [{ name: "a.exe", size: 5 }] }), now)
        .attachments,
    ).toBe("type");
    expect(
      validateRequest(
        input("fault", {
          attachments: Array.from({ length: 6 }, (_, i) => ({ name: `${i}.pdf`, size: 5 })),
        }),
        now,
      ).attachments,
    ).toBe("many");
  });

  it("tells hasErrors from a clean result", () => {
    expect(requestHasErrors({})).toBe(false);
    expect(requestHasErrors({ reason: "required" })).toBe(true);
  });
});

function create(kind: RequestKind, patch: Partial<RequestInput> = {}): MeterRequest {
  return createRequest(
    input(kind, patch),
    { id: "q-1", ownerId: "o-1", address: "Кокшетау" },
    [],
    now,
  );
}

describe("createRequest", () => {
  it("registers the request at once with a number and the first line of history", () => {
    const request = create("replacement");
    expect(request.number).toBe("DEMO-ZPR-2026-00001");
    expect(request.status).toBe("registered");
    expect(request.history).toHaveLength(1);
    expect(request.contactPhone).toBe("+77011234567");
  });

  it("keeps only the details this kind asks for", () => {
    const request = create("fault");
    expect(request.details).toEqual({ faultInfo: "Не крутится" });
  });

  it("drops empty visit lines and keeps the name and size of files", () => {
    const request = create("fault", {
      slots: [
        { date: "2026-10-25", time: "day" },
        { date: "", time: "morning" },
      ],
      attachments: [{ name: "a.jpg", size: 10 }],
    });
    expect(request.slots).toEqual([{ date: "2026-10-25", time: "day" }]);
    expect(request.attachments).toEqual([{ name: "a.jpg", size: 10 }]);
  });
});

describe("nextRequestNumber", () => {
  it("goes on from the highest number of the year", () => {
    expect(nextRequestNumber([{ number: "DEMO-ZPR-2026-00004" }], now)).toBe("DEMO-ZPR-2026-00005");
  });
});

describe("provider steps", () => {
  it("lists the steps from each status", () => {
    expect(requestProviderOptions("registered")).toEqual([
      "in_progress",
      "info_requested",
      "rejected",
    ]);
    expect(requestProviderOptions("done")).toEqual([]);
    expect(isRequestFinal("done")).toBe(true);
    expect(isRequestFinal("scheduled")).toBe(false);
  });

  it("needs a reason to reject or to ask for more", () => {
    const request = create("fault");
    expect(requestProviderChange(request, "rejected", now)).toEqual({
      ok: false,
      reason: "note_required",
    });
    expect(requestProviderChange(request, "info_requested", now, { note: " " })).toEqual({
      ok: false,
      reason: "note_required",
    });
  });

  it("refuses a step that is not allowed", () => {
    expect(requestProviderChange(create("fault"), "done", now)).toEqual({
      ok: false,
      reason: "not_allowed",
    });
  });

  it("needs a date and a specialist to schedule, and a reason to move the date", () => {
    const working = requestProviderChange(create("fault"), "in_progress", now);
    if (!working.ok) throw new Error("in_progress");
    expect(requestProviderChange(working.request, "scheduled", now)).toEqual({
      ok: false,
      reason: "slot_required",
    });
    const slot = { date: "2026-10-25", time: "morning" as const };
    const planned = requestProviderChange(working.request, "scheduled", now, {
      slot,
      assignee: "Сергеев А.",
    });
    if (!planned.ok) throw new Error("scheduled");
    expect(planned.request.scheduled).toEqual(slot);
    const other = { date: "2026-10-27", time: "day" as const };
    expect(
      requestProviderChange(planned.request, "scheduled", now, {
        slot: other,
        assignee: "Сергеев А.",
      }),
    ).toEqual({
      ok: false,
      reason: "note_required",
    });
    const moved = requestProviderChange(planned.request, "scheduled", now, {
      slot: other,
      assignee: "Сергеев А.",
      note: "Специалист болен",
    });
    expect(moved.ok && moved.request.history.at(-1)?.note).toBe("Специалист болен");
  });

  it("needs the result of the work: the new serial and the first reading for a replacement", () => {
    const request = scheduled(create("replacement"));
    expect(requestProviderChange(request, "done", now)).toEqual({
      ok: false,
      reason: "result_required",
    });
    expect(
      requestProviderChange(request, "done", now, {
        result: { at: "2026-10-25", newSerial: "N-2" },
      }),
    ).toEqual({ ok: false, reason: "result_required" });
    expect(
      requestProviderChange(request, "done", now, {
        result: { at: "2026-10-25", newSerial: "N-2", reading: "abc" },
      }),
    ).toEqual({ ok: false, reason: "result_required" });
    const done = requestProviderChange(request, "done", now, {
      result: { at: "2026-10-25", newSerial: "N-2", reading: "0" },
    });
    expect(done.ok && done.request.status).toBe("done");
  });
});

function scheduled(request: MeterRequest): MeterRequest {
  let current = request;
  const step = (to: Parameters<typeof requestProviderChange>[1], extra = {}) => {
    const result = requestProviderChange(current, to, now, extra);
    if (!result.ok) throw new Error(`${to}: ${result.reason}`);
    current = result.request;
  };
  step("in_progress");
  step("scheduled", { slot: { date: "2026-10-25", time: "morning" }, assignee: "Сергеев А." });
  return current;
}

function finish(
  kind: RequestKind,
  result: Parameters<typeof requestProviderChange>[3] = {},
): MeterRequest {
  const done = requestProviderChange(scheduled(create(kind)), "done", now, result);
  if (!done.ok) throw new Error(done.reason);
  return done.request;
}

describe("completeRequest", () => {
  it("does nothing for a request that is not done", () => {
    expect(completeRequest(create("fault"), [meter], "n-1", now)).toEqual({
      updated: [],
      created: [],
    });
  });

  it("makes a new meter after an installation", () => {
    const request = finish("installation", {
      result: { at: "2026-10-25", newSerial: "N-1", reading: "3" },
    });
    const { created, updated } = completeRequest(request, [], "n-1", now);
    expect(updated).toEqual([]);
    expect(created).toHaveLength(1);
    expect(created[0]).toMatchObject({
      id: "n-1",
      serial: "N-1",
      initialReading: 3,
      state: "working",
    });
  });

  it("marks the old meter replaced and starts a new one with the same account and capacity", () => {
    const request = finish("replacement", {
      result: { at: "2026-10-25", newSerial: "N-2", reading: "0" },
    });
    const { created, updated } = completeRequest(request, [meter], "n-2", now);
    expect(updated[0]).toMatchObject({ id: "m-1", state: "replaced", sealNumber: "" });
    expect(updated[0].history.at(-1)).toEqual({ kind: "replaced", at: "2026-10-25", note: "N-2" });
    expect(created[0]).toMatchObject({ serial: "N-2", personalAccount: "12345678", digits: 5 });
  });

  it("puts a seal on and takes it off", () => {
    const sealed = finish("sealing", { result: { at: "2026-10-25", seal: "P-9" } });
    expect(completeRequest(sealed, [meter], "x", now).updated[0]).toMatchObject({
      sealNumber: "P-9",
      sealedAt: "2026-10-25",
    });
    const open = finish("unseal", { result: { at: "2026-10-25" } });
    expect(completeRequest(open, [meter], "x", now).updated[0]).toMatchObject({
      sealNumber: "",
      sealedAt: "",
    });
  });

  it("moves the dates of a verification and marks a fault", () => {
    const verified = finish("verification", {
      result: { at: "2026-10-25", nextVerification: "2032-10-25" },
    });
    expect(completeRequest(verified, [meter], "x", now).updated[0]).toMatchObject({
      lastVerifiedAt: "2026-10-25",
      nextVerificationAt: "2032-10-25",
    });
    const faulty = finish("fault", { result: { at: "2026-10-25" } });
    expect(completeRequest(faulty, [meter], "x", now).updated[0].state).toBe("faulty");
  });
});
