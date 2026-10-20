import type { Service, SituationId } from "./types";

export type StepKey = "login" | "data" | "documents" | "review" | "sign" | "visit" | "result";

export type DocumentKey =
  | "identity"
  | "organization"
  | "proxy"
  | "meterPhoto"
  | "plan"
  | "property"
  | "account"
  | "problemPhoto";

type Needs = Pick<Service, "audiences" | "situationId" | "channel">;

/** The path from the first click to the result. A visit step appears when someone must come in person. */
export function stepsFor(service: Pick<Service, "channel">): StepKey[] {
  return [
    "login",
    "data",
    "documents",
    "review",
    "sign",
    ...(service.channel === "front-office" ? (["visit"] as const) : []),
    "result",
  ];
}

const byAudience = {
  resident: ["identity"],
  business: ["organization", "proxy"],
  both: ["identity", "organization"],
} as const satisfies Record<string, readonly DocumentKey[]>;

const bySituation: Record<SituationId, readonly DocumentKey[]> = {
  meters: ["meterPhoto"],
  connection: ["property", "plan"],
  contracts: ["account"],
  heating: ["property"],
  housing: ["property"],
  construction: ["property", "plan"],
  business: [],
  appeals: ["problemPhoto"],
};

/** Test documents: who the applicant is, plus what this kind of request usually needs. */
export function documentsFor(service: Pick<Needs, "audiences" | "situationId">): DocumentKey[] {
  const residents = service.audiences.includes("resident");
  const business = service.audiences.includes("business");
  const base =
    residents && business ? byAudience.both : business ? byAudience.business : byAudience.resident;
  return [...new Set<DocumentKey>([...base, ...bySituation[service.situationId]])];
}
