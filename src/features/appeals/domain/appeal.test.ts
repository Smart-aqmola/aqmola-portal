import { describe, expect, it } from "vitest";
import type { ProviderInfo } from "@/features/account/domain/availability";
import {
  REGION_OFFICE,
  appealCategories,
  appealHasErrors,
  appealStatuses,
  applicantClose,
  applicantMessage,
  asksSector,
  awaitsApplicant,
  createAppeal,
  emptyAppealInput,
  executorOptions,
  executorStep,
  impliedSector,
  isClosedAppeal,
  lastExecutorText,
  needsSector,
  nextAppealNumber,
  responsibleOrganization,
  sectorOf,
  subcategories,
  validateAppeal,
  type Appeal,
  type AppealInput,
  type AppealStatus,
} from "./appeal";

const now = new Date("2026-10-21T06:00:00Z");
const later = new Date("2026-10-22T07:00:00Z");

function input(patch: Partial<AppealInput> = {}): AppealInput {
  return {
    ...emptyAppealInput("+7 701 123 45 67", "a@example.com"),
    category: "power_cut",
    subcategory: "long_outage",
    address: "Кокшетау, улица Абая, 10",
    description: "Света нет с утра, соседи тоже без света",
    ...patch,
  };
}

const providers: ProviderInfo[] = [
  { id: "grid", name: "Электросети", sector: "electricity", territories: "all" },
  { id: "water", name: "Водоканал", sector: "water", territories: ["atbasar"] },
];
const place = { territoryId: "kokshetau", without: [] } as const;
const office = "Управление ЖКХ области";

function make(
  patch: Partial<AppealInput> = {},
  organization = { id: "grid", name: "Электросети" },
) {
  return createAppeal(input(patch), { id: "a-1", ownerId: "o-1", organization }, [], now);
}

function walk(appeal: Appeal, ...steps: [AppealStatus, string?][]): Appeal {
  let current = appeal;
  for (const [to, text] of steps) {
    const result = executorStep(current, to, text ?? "", later);
    if (!result.ok) throw new Error(`${to}: ${result.reason}`);
    current = result.appeal;
  }
  return current;
}

describe("categories", () => {
  it("has the thirteen subjects of the specification, each with at least one subcategory", () => {
    expect(appealCategories).toHaveLength(13);
    for (const category of appealCategories)
      expect(subcategories[category].length).toBeGreaterThan(0);
  });

  it("knows which utility a category or its subcategory names", () => {
    expect(impliedSector("power_cut", "")).toBe("electricity");
    expect(impliedSector("waste_late", "")).toBe("waste");
    expect(impliedSector("no_service", "heat")).toBe("heat");
    expect(impliedSector("quality", "gas_quality")).toBe("gas");
    expect(impliedSector("wrong_charges", "wrong_amount")).toBeUndefined();
  });

  it("asks the person for the utility only where it cannot be known", () => {
    expect(needsSector("wrong_charges")).toBe(true);
    expect(needsSector("power_cut")).toBe(false);
    expect(needsSector("other")).toBe(false);
    expect(asksSector("other")).toBe(true);
    expect(asksSector("power_cut")).toBe(false);
    expect(
      sectorOf({ category: "wrong_charges", subcategory: "wrong_amount", sector: "gas" }),
    ).toBe("gas");
    expect(sectorOf({ category: "power_cut", subcategory: "x", sector: "gas" })).toBe(
      "electricity",
    );
    expect(sectorOf({ category: "", subcategory: "", sector: "gas" })).toBeUndefined();
  });
});

describe("validateAppeal", () => {
  it("accepts a filled form", () => {
    expect(validateAppeal(input(), now)).toEqual({});
  });

  it("asks for the category, the subcategory, the address, the description and the phone", () => {
    const errors = validateAppeal(emptyAppealInput(), now);
    expect(Object.keys(errors).sort()).toEqual([
      "address",
      "category",
      "contactPhone",
      "description",
    ]);
    expect(validateAppeal(input({ subcategory: "" }), now).subcategory).toBe("required");
    expect(validateAppeal(input({ subcategory: "nonsense" }), now).subcategory).toBe("required");
  });

  it("asks which utility where the category does not say", () => {
    const base = { category: "wrong_charges" as const, subcategory: "wrong_amount" };
    expect(validateAppeal(input(base), now).sector).toBe("required");
    expect(validateAppeal(input({ ...base, sector: "gas" }), now)).toEqual({});
  });

  it("checks the lengths and the contacts", () => {
    expect(validateAppeal(input({ description: "коротко" }), now).description).toBe("short");
    expect(validateAppeal(input({ description: "я".repeat(1001) }), now).description).toBe("long");
    expect(validateAppeal(input({ address: "ab" }), now).address).toBe("short");
    expect(validateAppeal(input({ contactPhone: "12" }), now).contactPhone).toBe("format");
    expect(validateAppeal(input({ contactEmail: "nope" }), now).contactEmail).toBe("format");
    expect(validateAppeal(input({ contactEmail: "" }), now).contactEmail).toBeUndefined();
  });

  it("checks the files like everywhere else", () => {
    expect(
      validateAppeal(input({ attachments: [{ name: "a.exe", size: 5 }] }), now).attachments,
    ).toBe("type");
    expect(
      validateAppeal(
        input({
          attachments: Array.from({ length: 6 }, (_, i) => ({ name: `${i}.png`, size: 5 })),
        }),
        now,
      ).attachments,
    ).toBe("many");
  });

  it("checks when and for how long the service was bad, only for the categories that ask (11.3)", () => {
    expect(validateAppeal(input({ violationDate: "2026-10-22" }), now).violationDate).toBe(
      "future",
    );
    expect(validateAppeal(input({ violationDate: "20.10" }), now).violationDate).toBe("format");
    expect(
      validateAppeal(input({ violationTime: "25:00", violationDate: "2026-10-20" }), now)
        .violationTime,
    ).toBe("format");
    expect(
      validateAppeal(input({ duration: "abc", violationDate: "2026-10-20" }), now).duration,
    ).toBe("format");
    expect(validateAppeal(input({ duration: "3" }), now).violationDate).toBe("required");
    expect(
      validateAppeal(
        input({ violationDate: "2026-10-20", violationTime: "08:30", duration: "5" }),
        now,
      ),
    ).toEqual({});
    const billing = input({
      category: "wrong_charges",
      subcategory: "wrong_amount",
      sector: "gas",
      violationDate: "2099-01-01",
    });
    expect(validateAppeal(billing, now)).toEqual({});
  });

  it("tells hasErrors apart", () => {
    expect(appealHasErrors({})).toBe(false);
    expect(appealHasErrors({ address: "required" })).toBe(true);
  });
});

describe("responsibleOrganization (11.4)", () => {
  it("takes the provider of the utility at the address", () => {
    expect(responsibleOrganization("electricity", place, providers, office)).toEqual({
      id: "grid",
      name: "Электросети",
    });
  });

  it("falls back to the region office when nobody serves it or there is no utility", () => {
    expect(responsibleOrganization("water", place, providers, office)).toEqual({
      id: REGION_OFFICE.id,
      name: office,
    });
    expect(responsibleOrganization(undefined, place, providers, office).id).toBe(REGION_OFFICE.id);
    expect(responsibleOrganization("electricity", undefined, providers, office).id).toBe(
      REGION_OFFICE.id,
    );
  });
});

describe("createAppeal (11.5)", () => {
  it("registers it with a number and sends it to the executor at once", () => {
    const appeal = make();
    expect(appeal.number).toBe("DEMO-OBR-2026-00001");
    expect(appeal.status).toBe("sent_to_executor");
    expect(appeal.events.map((event) => event.status)).toEqual(["registered", "sent_to_executor"]);
    expect(appeal.contactPhone).toBe("+77011234567");
    expect(appeal.sector).toBe("electricity");
    expect(appeal.external).toBeUndefined();
  });

  it("keeps the time of the violation only for the categories that ask", () => {
    expect(
      make({ violationDate: "2026-10-20", violationTime: "08:30", duration: "5" }).violation,
    ).toEqual({
      date: "2026-10-20",
      time: "08:30",
      duration: "5",
      unit: "hours",
    });
    expect(
      make({ category: "other", subcategory: "other", violationDate: "2026-10-20" }).violation,
    ).toBeUndefined();
  });

  it("enters an appeal for the region office into the system of electronic appeals (11.6)", () => {
    const appeal = make({}, { id: REGION_OFFICE.id, name: office });
    expect(appeal.external?.number).toBe("ЭО-2026-00001");
  });

  it("goes on from the highest number of the year and refuses to be made without a category", () => {
    expect(nextAppealNumber([{ number: "DEMO-OBR-2026-00009" }], now)).toBe("DEMO-OBR-2026-00010");
    expect(nextAppealNumber([{ number: "DEMO-OBR-2025-00009" }], now)).toBe("DEMO-OBR-2026-00001");
    expect(() => make({ category: "" })).toThrow();
  });
});

describe("the executor's steps (11.7)", () => {
  it("lists the ten statuses of the specification", () => {
    expect(appealStatuses).toHaveLength(10);
  });

  it("walks accepted -> in review -> answer ready -> executed -> closed", () => {
    const done = walk(
      make(),
      ["accepted"],
      ["in_review"],
      ["answer_ready", "Починили"],
      ["executed"],
      ["closed"],
    );
    expect(done.status).toBe("closed");
    expect(isClosedAppeal(done.status)).toBe(true);
    expect(done.events.map((event) => event.status)).toEqual([
      "registered",
      "sent_to_executor",
      "accepted",
      "in_review",
      "answer_ready",
      "executed",
      "closed",
    ]);
    expect(lastExecutorText(done)).toBe("Починили");
  });

  it("refuses a step that is not allowed", () => {
    expect(executorStep(make(), "executed", "x", later)).toEqual({
      ok: false,
      reason: "not_allowed",
    });
    expect(executorOptions("closed")).toEqual([]);
    expect(executorOptions("refused")).toEqual([]);
  });

  it("needs words for a question, an answer, a refusal and a redirect", () => {
    const accepted = walk(make(), ["accepted"]);
    for (const to of ["info_required", "refused", "redirected"] as const) {
      expect(executorStep(accepted, to, "  ", later)).toEqual({
        ok: false,
        reason: "text_required",
      });
    }
    const reviewing = walk(accepted, ["in_review"]);
    expect(executorStep(reviewing, "answer_ready", "", later)).toEqual({
      ok: false,
      reason: "text_required",
    });
  });

  it("moves a redirected appeal to the other organization and enters it into the system of electronic appeals", () => {
    const moved = walk(make(), ["accepted"]);
    const result = executorStep(moved, "redirected", "Это к акимату", later, {
      id: REGION_OFFICE.id,
      name: office,
    });
    if (!result.ok) throw new Error("redirect");
    expect(result.appeal).toMatchObject({ status: "redirected", organizationId: REGION_OFFICE.id });
    expect(result.appeal.external?.number).toBe("ЭО-2026-00001");
    const taken = walk(result.appeal, ["accepted"]);
    expect(taken.status).toBe("accepted");
  });
});

describe("the person's part", () => {
  it("answers a question: the reply puts the appeal back to review", () => {
    const asked = walk(make(), ["accepted"], ["info_required", "Какой номер счётчика?"]);
    expect(awaitsApplicant(asked)).toBe(true);
    const replied = applicantMessage(asked, "Номер 123", later);
    if (!replied.ok) throw new Error("reply");
    expect(replied.appeal.status).toBe("in_review");
    expect(replied.appeal.events.at(-1)).toMatchObject({
      actor: "applicant",
      status: "in_review",
      text: "Номер 123",
    });
    expect(awaitsApplicant(replied.appeal)).toBe(false);
  });

  it("writes a message without changing the status", () => {
    const accepted = walk(make(), ["accepted"]);
    const result = applicantMessage(accepted, "Уточняю: свет пропал в 8:00", later);
    expect(result.ok && result.appeal.status).toBe("accepted");
    expect(result.ok && result.appeal.events.at(-1)?.status).toBeUndefined();
  });

  it("cannot write an empty message or write to a closed appeal", () => {
    expect(applicantMessage(make(), "  ", later)).toEqual({ ok: false, reason: "text_required" });
    const closed = walk(make(), ["refused", "Не наша компетенция"]);
    expect(applicantMessage(closed, "Но как же", later)).toEqual({ ok: false, reason: "closed" });
  });

  it("closes the appeal when the answer is enough, not before", () => {
    expect(applicantClose(make(), later)).toEqual({ ok: false, reason: "not_allowed" });
    const answered = walk(make(), ["accepted"], ["in_review"], ["answer_ready", "Готово"]);
    const closed = applicantClose(answered, later);
    expect(closed.ok && closed.appeal.status).toBe("closed");
  });
});
