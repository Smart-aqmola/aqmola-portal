"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { useSession } from "@/features/applications/ui/use-session";
import { useAudit } from "@/features/organization/ui/use-audit";
import { createLocalStore } from "@/shared/lib/local-store";
import type { Locale } from "@/shared/i18n/config";
import {
  CONFIG_KEY,
  DEFAULT_CONFIG,
  changedParameters,
  contractRules,
  parseConfig,
  type AdminConfig,
} from "../domain/config";

const store = createLocalStore<AdminConfig>({
  key: CONFIG_KEY,
  parse: parseConfig,
  empty: DEFAULT_CONFIG,
});

/** The settings of the portal. Changing them is the administrator's work and is written to the journal (spec 13.4). */
export function useAdminConfig() {
  const config = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  const { session } = useSession();
  const { log } = useAudit();

  /** Saves the new settings; returns false when nothing changed. `section` names the page that did it. */
  const update = useCallback(
    (next: AdminConfig, section: string): boolean => {
      const changed = changedParameters(store.getSnapshot(), next);
      if (changed.length === 0) return false;
      store.write(next);
      log({
        organizationId: "portal",
        actor: session?.name ?? "",
        entity: "config",
        entityId: section,
        number: section,
        action: "config",
        note: changed.join(", "),
      });
      return true;
    },
    [log, session?.name],
  );

  return { config, update };
}

/** What the form of an application for a contract must follow now (spec 4.3, 13.2). */
export function useContractRules() {
  const config = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  return useMemo(() => contractRules(config), [config]);
}

/** The languages the switcher shows: those the administrator left on (spec 18.9). */
export function useEnabledLocales(): readonly Locale[] {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot)
    .languages;
}
