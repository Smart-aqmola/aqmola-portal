import { describe, expect, it } from "vitest";
import { parseProfiles, parseProperties } from "@/features/account/domain/storage";
import { parseConfig } from "@/features/admin/domain/config";
import { parseAppeals } from "@/features/appeals/domain/storage";
import { parseApplications } from "@/features/applications/domain/storage";
import { parseSession } from "@/features/session/domain/session";
import { parsePayments } from "@/features/billing/domain/storage";
import { parseContracts } from "@/features/contracts/domain/storage";
import { parseSettings } from "@/features/display/domain/settings";
import { parseFavorites } from "@/features/favorites/domain/favorites";
import { parseMeterRequests, parseMeters, parseReadings } from "@/features/meters/domain/storage";
import { parseReadState } from "@/features/notifications/domain/read-state";
import { parseAudit } from "@/features/organization/domain/audit";

// Data in the browser can be broken by an old version, an extension or by hand. Every parser
// must turn anything into a usable value, or the whole page falls over on load.
const parsers = {
  parseProfiles,
  parseProperties,
  parseConfig,
  parseAppeals,
  parseApplications,
  parseSession,
  parsePayments,
  parseContracts,
  parseSettings,
  parseFavorites,
  parseMeterRequests,
  parseMeters,
  parseReadings,
  parseReadState,
  parseAudit,
} as const;

const junk: (string | null)[] = [
  null,
  "",
  "{",
  "null",
  "true",
  "42",
  '"text"',
  "[]",
  "{}",
  "[null]",
  '[1, "a", true]',
  '[{"id": 1}]',
  '[{"__proto__": {"polluted": true}}]',
  '{"__proto__": {"polluted": true}}',
  '[{"id":"x","number":null,"history":"no","status":{"a":1},"lines":[null]}]',
  '{"blockedOrganizations":"all","staff":[null],"templates":{"ru":{"x":5}}}',
  JSON.stringify([{ id: "x".repeat(100_000) }]),
];

describe("every stored-data parser", () => {
  for (const [name, parse] of Object.entries(parsers)) {
    it(`${name} survives broken data`, () => {
      for (const raw of junk) {
        expect(() => parse(raw as never)).not.toThrow();
      }
      expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    });
  }
});
