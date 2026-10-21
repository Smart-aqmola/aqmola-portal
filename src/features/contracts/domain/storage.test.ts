import { describe, expect, it } from "vitest";
import { createDraft, type ContractApplication } from "./contract";
import { parseContracts } from "./storage";

const draft: ContractApplication = createDraft(
  {
    propertyId: "p-1",
    sector: "gas",
    serviceSlug: "gas-contract",
    serviceTitle: "Договор на газоснабжение",
    providerId: "akmola-gas",
    providerName: "Газ Акмола",
    applicant: {
      lastName: "Иванов",
      firstName: "Иван",
      middleName: "",
      iin: "900101300123",
      phone: "+77011234567",
      email: "",
    },
    address: "Кокшетау, улица Абая, 10",
    propertyType: "house",
    basis: "owner",
    personalAccount: "",
  },
  "c-1",
  "u-1",
  new Date("2026-10-21T06:00:00Z"),
);

const full: ContractApplication = {
  ...draft,
  number: "DEMO-DOG-2026-00001",
  status: "registered",
  attachments: [{ key: "identity", name: "id.pdf", size: 10 }],
  signatures: {
    application: { name: "Иванов Иван", at: "2026-10-21T06:00:00.000Z", method: "demo_ecp" },
  },
  submittedAt: "2026-10-21T06:00:00.000Z",
};

describe("parseContracts", () => {
  it("returns what was saved, a draft and a sent application", () => {
    expect(parseContracts(JSON.stringify([draft, full]))).toEqual([draft, full]);
  });

  it("returns an empty list for nothing, broken text or the wrong shape", () => {
    expect(parseContracts(null)).toEqual([]);
    expect(parseContracts("{oops")).toEqual([]);
    expect(parseContracts(JSON.stringify("x"))).toEqual([]);
  });

  it("drops entries that were edited into nonsense", () => {
    const broken = [
      { ...draft, status: "done" },
      { ...draft, sector: "billing" },
      { ...draft, id: "Bad Id" },
      { ...draft, number: "DEMO-2026-00001" },
      { ...draft, basis: "king" },
      { ...draft, applicant: { ...draft.applicant, iin: 5 } },
      { ...draft, attachments: [{ key: "virus", name: "x", size: 1 }] },
      { ...draft, signatures: { application: { name: "x" } } },
      { ...draft, history: [{ status: "draft", at: "x", actor: "robot" }] },
      null,
      draft,
    ];
    expect(parseContracts(JSON.stringify(broken))).toEqual([draft]);
  });
});
