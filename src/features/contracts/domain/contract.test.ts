import { describe, expect, it } from "vitest";
import {
  contractStatuses,
  contractText,
  createDraft,
  edited,
  isConcluded,
  isEditable,
  isFinal,
  nextContractNumber,
  providerChange,
  providerOptions,
  readiness,
  requiredDocuments,
  signApplication,
  signContract,
  submitApplication,
  validateApplication,
  validateDocuments,
  type ContractApplication,
  type ContractStatus,
} from "./contract";

const now = new Date("2026-10-21T06:00:00Z");
const later = new Date("2026-10-22T07:30:00Z");

function draft(): ContractApplication {
  return createDraft(
    {
      propertyId: "p-1",
      sector: "water",
      serviceSlug: "water-contract-resident",
      serviceTitle: "Заключение договора на водоснабжение",
      providerId: "akmola-water",
      providerName: "Водоканал Акмолы",
      applicant: {
        lastName: "Иванов",
        firstName: "Иван",
        middleName: "",
        iin: "900101300123",
        phone: "+77011234567",
        email: "",
      },
      address: "Кокшетау, улица Абая, 10, кв. 5",
      propertyType: "apartment",
      basis: "owner",
      personalAccount: "",
    },
    "c-1",
    "u-1",
    now,
  );
}

/** A draft that passes every check: documents attached and consents given. */
function ready(): ContractApplication {
  return {
    ...draft(),
    attachments: [
      { key: "identity", name: "id.pdf", size: 1000 },
      { key: "property", name: "deed.pdf", size: 2000 },
    ],
    consents: { personalData: true, terms: true },
  };
}

function sent(): ContractApplication {
  const signed = signApplication(ready(), "Иванов Иван", now);
  if (!signed.ok) throw new Error("sign failed");
  const result = submitApplication(signed.application, "DEMO-DOG-2026-00001", now);
  if (!result.ok) throw new Error("submit failed");
  return result.application;
}

/** Moves the provider through the given statuses; a step may carry a note. */
function moveProvider(
  app: ContractApplication,
  ...steps: (ContractStatus | [ContractStatus, string])[]
): ContractApplication {
  let current = app;
  for (const step of steps) {
    const [to, note] = Array.isArray(step) ? step : [step, undefined];
    const result = providerChange(current, to, later, note);
    if (!result.ok) throw new Error(`cannot go to ${to}: ${result.reason}`);
    current = result.application;
  }
  return current;
}

describe("createDraft", () => {
  it("starts as a draft without a number and with what the object knows", () => {
    const app = draft();
    expect(app).toMatchObject({ status: "draft", version: 1, basis: "owner", notifyBy: "cabinet" });
    expect(app).not.toHaveProperty("number");
    expect(app.history).toEqual([{ status: "draft", at: now.toISOString(), actor: "applicant" }]);
  });
});

describe("validateApplication", () => {
  it("accepts a filled application", () => {
    expect(validateApplication(draft(), now)).toEqual({});
  });

  it("asks for the name, IIN and phone", () => {
    const app = draft();
    const errors = validateApplication(
      { ...app, applicant: { ...app.applicant, lastName: "", firstName: " ", iin: "", phone: "" } },
      now,
    );
    expect(errors).toEqual({
      lastName: "required",
      firstName: "required",
      iin: "required",
      phone: "required",
    });
  });

  it("names a broken IIN, phone and email", () => {
    const app = draft();
    const errors = validateApplication(
      { ...app, applicant: { ...app.applicant, iin: "12", phone: "5", email: "x" } },
      now,
    );
    expect(errors).toEqual({ iin: "format", phone: "format", email: "format" });
  });

  it("needs an email when notices go by email", () => {
    const app = { ...draft(), notifyBy: "email" as const };
    expect(validateApplication(app, now).email).toBe("needed");
    const filled = { ...app, applicant: { ...app.applicant, email: "a@b.kz" } };
    expect(validateApplication(filled, now)).toEqual({});
  });

  it("refuses a right date in the future or not a date", () => {
    expect(validateApplication({ ...draft(), rightSince: "2026-10-21" }, now)).toEqual({});
    expect(validateApplication({ ...draft(), rightSince: "2026-10-22" }, now).rightSince).toBe(
      "date",
    );
    expect(validateApplication({ ...draft(), rightSince: "2026-13-40" }, now).rightSince).toBe(
      "date",
    );
  });

  it("checks the personal account and the previous contract text", () => {
    const errors = validateApplication(
      { ...draft(), personalAccount: "12ab", previousContract: "x".repeat(101) },
      now,
    );
    expect(errors).toEqual({ personalAccount: "format", previousContract: "long" });
  });

  it("asks for the meter number only when there is a meter", () => {
    expect(validateApplication(draft(), now)).toEqual({});
    const withMeter = { ...draft(), meter: { has: true, serial: "", reading: "12,5x" } };
    expect(validateApplication(withMeter, now)).toEqual({
      meterSerial: "required",
      meterReading: "format",
    });
    const ok = { ...draft(), meter: { has: true, serial: "SN-123/4", reading: "1250,5" } };
    expect(validateApplication(ok, now)).toEqual({});
  });
});

describe("documents", () => {
  it("requires different papers for each ground of use", () => {
    expect(requiredDocuments("owner")).toEqual(["identity", "property"]);
    expect(requiredDocuments("representative")).toEqual(["identity", "property", "proxy"]);
    expect(requiredDocuments("tenant")).toEqual(["identity", "lease"]);
    expect(requiredDocuments("lawful_user")).toEqual(["identity", "basis"]);
  });

  it("names the documents that are not attached yet", () => {
    expect(validateDocuments(draft())).toEqual({
      missing: ["identity", "property"],
      problems: [],
      tooMany: false,
    });
  });

  it("flags a file that cannot be accepted and too many files", () => {
    const app = {
      ...ready(),
      attachments: [
        { key: "identity" as const, name: "id.exe", size: 10 },
        { key: "property" as const, name: "deed.pdf", size: 6 * 1024 * 1024 },
      ],
    };
    expect(validateDocuments(app).problems).toEqual([
      { key: "identity", problem: "type" },
      { key: "property", problem: "size" },
    ]);
    const many = {
      ...ready(),
      attachments: Array.from({ length: 6 }, (_, i) => ({
        key: "identity" as const,
        name: `${i}.pdf`,
        size: 1,
      })),
    };
    expect(validateDocuments(many).tooMany).toBe(true);
  });
});

describe("readiness", () => {
  it("is ready only with fields, documents and both consents", () => {
    expect(readiness(ready(), now).ready).toBe(true);
    expect(readiness(draft(), now).ready).toBe(false);
    const noConsent = { ...ready(), consents: { personalData: true, terms: false } };
    expect(readiness(noConsent, now)).toMatchObject({ consents: false, ready: false });
  });
});

describe("signApplication and submitApplication", () => {
  it("does not sign an application that is not complete", () => {
    expect(signApplication(draft(), "Иванов Иван", now)).toEqual({
      ok: false,
      reason: "not_ready",
    });
  });

  it("does not send without a signature", () => {
    expect(submitApplication(ready(), "DEMO-DOG-2026-00001", now)).toEqual({
      ok: false,
      reason: "not_signed",
    });
  });

  it("registers a signed application with a number and a time, but it is not a contract yet", () => {
    const app = sent();
    expect(app).toMatchObject({
      status: "registered",
      number: "DEMO-DOG-2026-00001",
      submittedAt: now.toISOString(),
    });
    expect(app.signatures.application).toMatchObject({ name: "Иванов Иван", method: "demo_ecp" });
    expect(app.history.map((entry) => entry.status)).toEqual(["draft", "registered"]);
    expect(isConcluded(app.status)).toBe(false);
  });

  it("does not let a sent application be sent again", () => {
    const app = sent();
    expect(submitApplication(app, "DEMO-DOG-2026-00002", now)).toEqual({
      ok: false,
      reason: "forbidden",
    });
    expect(signApplication(app, "x", now)).toEqual({ ok: false, reason: "forbidden" });
  });

  it("drops the signature when the text is edited, so it has to be signed again", () => {
    const signed = signApplication(ready(), "Иванов Иван", now);
    if (!signed.ok) throw new Error("sign failed");
    const changed = edited(signed.application, { previousContract: "договор 5" }, later);
    expect(changed.signatures.application).toBeUndefined();
    expect(changed.previousContract).toBe("договор 5");
    expect(submitApplication(changed, "DEMO-DOG-2026-00001", later)).toEqual({
      ok: false,
      reason: "not_signed",
    });
  });
});

describe("the provider's steps", () => {
  it("goes from registered through review to a contract waiting for the applicant", () => {
    const app = moveProvider(sent(), "under_review", "awaiting_applicant_signature");
    expect(app.status).toBe("awaiting_applicant_signature");
    expect(isConcluded(app.status)).toBe(false);
  });

  it("allows only the steps of the table", () => {
    expect(providerChange(sent(), "concluded", later)).toEqual({ ok: false, reason: "forbidden" });
    expect(providerChange(sent(), "refused", later, "нет")).toEqual({
      ok: false,
      reason: "forbidden",
    });
    expect(providerOptions("draft")).toEqual([]);
    expect(providerOptions("registered")).toEqual(["under_review"]);
  });

  it("needs the reason when the application is returned or refused", () => {
    const review = moveProvider(sent(), "under_review");
    expect(providerChange(review, "returned_for_revision", later)).toEqual({
      ok: false,
      reason: "no_remarks",
    });
    expect(providerChange(review, "refused", later, "  ")).toEqual({
      ok: false,
      reason: "no_remarks",
    });
    const returned = moveProvider(review, ["returned_for_revision", "Документ не читается"]);
    expect(returned).toMatchObject({
      status: "returned_for_revision",
      remarks: "Документ не читается",
    });
    expect(returned.history.at(-1)).toMatchObject({
      actor: "provider",
      note: "Документ не читается",
    });
  });

  it("refuses a change made on stale data", () => {
    const app = sent();
    expect(providerChange(app, "under_review", later, undefined, app.version - 1)).toEqual({
      ok: false,
      reason: "stale",
    });
  });

  it("sends an inspection or technical conditions back to review without concluding anything", () => {
    const app = moveProvider(sent(), "under_review", "inspection_required");
    expect(isConcluded(app.status)).toBe(false);
    expect(providerOptions(app.status)).toEqual(["under_review"]);
    const again = moveProvider(
      app,
      "under_review",
      "technical_conditions_required",
      "under_review",
    );
    expect(again.status).toBe("under_review");
  });

  it("ends a refused application and keeps the reason", () => {
    const app = moveProvider(sent(), "under_review", ["refused", "Нет технической возможности"]);
    expect(isFinal(app.status)).toBe(true);
    expect(app.remarks).toBe("Нет технической возможности");
    expect(providerOptions(app.status)).toEqual([]);
  });
});

describe("correcting a returned application", () => {
  it("can be edited, signed and sent again under the same number", () => {
    const app = moveProvider(sent(), "under_review", ["returned_for_revision", "Приложите копию"]);
    expect(isEditable(app)).toBe(true);
    const fixed = edited(
      app,
      { attachments: [...app.attachments, { key: "identity", name: "id2.pdf", size: 5 }] },
      later,
    );
    const signed = signApplication(fixed, "Иванов Иван", later);
    if (!signed.ok) throw new Error("sign failed");
    const result = submitApplication(signed.application, "DEMO-DOG-2026-00009", later);
    if (!result.ok) throw new Error("submit failed");
    expect(result.application.number).toBe("DEMO-DOG-2026-00001");
    expect(result.application.status).toBe("registered");
    expect(result.application).not.toHaveProperty("remarks");
    expect(result.application.history.map((entry) => entry.status)).toEqual([
      "draft",
      "registered",
      "under_review",
      "returned_for_revision",
      "registered",
    ]);
  });
});

describe("the contract itself", () => {
  const toSigning = () => moveProvider(sent(), "under_review", "awaiting_applicant_signature");

  it("is signed by the applicant, then by the provider, and only then is concluded", () => {
    const signed = signContract(toSigning(), "Иванов Иван", later);
    if (!signed.ok) throw new Error("sign failed");
    expect(signed.application.status).toBe("awaiting_provider_signature");
    expect(isConcluded(signed.application.status)).toBe(false);
    expect(signed.application.signatures.contractApplicant?.name).toBe("Иванов Иван");

    const concluded = moveProvider(signed.application, "concluded");
    expect(isConcluded(concluded.status)).toBe(true);
    expect(concluded.signatures.contractProvider).toBeDefined();

    const active = moveProvider(concluded, "active");
    expect(active.status).toBe("active");
    expect(active.startsAt).toBe(later.toISOString());
  });

  it("cannot be signed by the applicant before the provider has approved it", () => {
    expect(signContract(sent(), "Иванов Иван", later)).toEqual({ ok: false, reason: "forbidden" });
  });

  it("can be suspended, resumed and ended after it came into force", () => {
    const signed = signContract(toSigning(), "Иванов Иван", later);
    if (!signed.ok) throw new Error("sign failed");
    const active = moveProvider(signed.application, "concluded", "active");
    const resumed = moveProvider(active, "suspended", "active");
    expect(resumed.status).toBe("active");
    const ended = moveProvider(resumed, "terminated");
    expect(isFinal(ended.status)).toBe(true);
    expect(isConcluded(ended.status)).toBe(false);
  });
});

describe("statuses and numbers", () => {
  it("lists the fifteen statuses of the specification", () => {
    expect(contractStatuses).toHaveLength(15);
  });

  it("gives the next free number of the year", () => {
    expect(nextContractNumber([], now)).toBe("DEMO-DOG-2026-00001");
    expect(
      nextContractNumber(
        [{ number: "DEMO-DOG-2026-00007" }, { number: "DEMO-DOG-2025-00099" }, {}],
        now,
      ),
    ).toBe("DEMO-DOG-2026-00008");
  });
});

describe("contractText", () => {
  it("fills the template with the data of the application", () => {
    const text = contractText(sent(), [
      "Договор № {number}",
      "{provider} и {applicant}: {address}",
    ]);
    expect(text).toBe(
      "Договор № DEMO-DOG-2026-00001\n\nВодоканал Акмолы и Иванов Иван: Кокшетау, улица Абая, 10, кв. 5",
    );
  });
});
