import type { ProviderInfo } from "@/features/account/domain/availability";

/** The outside systems the portal talks to besides the providers (spec 14.1). */
export const serviceSystems = [
  "payment_gateway",
  "ecp",
  "egov",
  "appeals_system",
  "notifications",
] as const;
export type ServiceSystem = (typeof serviceSystems)[number];

export type SystemKind = "provider" | ServiceSystem;

/** Codes of the problems the log shows; the person never sees more than a code (spec 18.8, 19.8). */
export const errorCodes = ["timeout", "bad_response", "auth_retry", "duplicate_message"] as const;
export type ErrorCode = (typeof errorCodes)[number];

export type IntegrationSystem = {
  id: string;
  kind: SystemKind;
  /** The name of a provider; the other systems are named in the dictionary by their kind. */
  name?: string;
  /** Share of successful calls over the last week, in percent. */
  availability: number;
  status: "available" | "degraded" | "unavailable";
  /** ISO date and time of the last check. */
  checkedAt: string;
};

export type IntegrationError = {
  id: string;
  /** ISO date and time. */
  at: string;
  systemId: string;
  code: ErrorCode;
  /** The call was repeated and went through (spec 7.11, 20.5). */
  retried: boolean;
};

export const LOG_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

function hash(text: string): number {
  let value = 2166136261;
  for (const char of text) {
    value ^= char.codePointAt(0) ?? 0;
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

const statusOf = (availability: number): IntegrationSystem["status"] =>
  availability >= 98 ? "available" : availability >= 90 ? "degraded" : "unavailable";

/**
 * A made-up state of the integrations for the demo (there is nothing to integrate with): the same
 * for the same day, so the administrator sees a stable picture. The silent waste operator is the
 * one that is always down, like in the charges (spec 9.8).
 */
export function integrationLog(
  providers: readonly ProviderInfo[],
  now: Date,
): { systems: IntegrationSystem[]; errors: IntegrationError[] } {
  const day = now.toISOString().slice(0, 10);
  const ids: { id: string; kind: SystemKind; name?: string; sector?: string }[] = [
    ...providers.map((provider) => ({
      id: provider.id,
      kind: "provider" as const,
      name: provider.name,
      sector: provider.sector,
    })),
    ...serviceSystems.map((id) => ({ id, kind: id })),
  ];

  const systems = ids.map<IntegrationSystem>((entry) => {
    const silent = entry.sector === "waste";
    const availability = silent ? 82 : 96 + (hash(`${entry.id}:${day}`) % 5);
    return {
      id: entry.id,
      kind: entry.kind,
      ...(entry.name ? { name: entry.name } : {}),
      availability,
      status: statusOf(availability),
      checkedAt: new Date(now.getTime() - (hash(entry.id) % 50) * 60_000).toISOString(),
    };
  });

  const errors: IntegrationError[] = [];
  for (const entry of ids) {
    const silent = entry.sector === "waste";
    for (let back = 0; back < LOG_DAYS; back += 1) {
      const date = new Date(now.getTime() - back * DAY_MS).toISOString().slice(0, 10);
      const count = silent ? 3 : hash(`${entry.id}:${date}:n`) % 3 === 0 ? 1 : 0;
      for (let index = 0; index < count; index += 1) {
        const seed = hash(`${entry.id}:${date}:${index}`);
        const minutes = seed % (24 * 60);
        const at = `${date}T${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}:00.000Z`;
        if (at > now.toISOString()) continue;
        errors.push({
          id: `${entry.id}-${date}-${index}`,
          at,
          systemId: entry.id,
          code: errorCodes[seed % errorCodes.length],
          retried: !silent && seed % 5 !== 0,
        });
      }
    }
  }
  return { systems, errors: errors.sort((a, b) => b.at.localeCompare(a.at)) };
}
