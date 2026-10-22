"use client";

import { createCollection } from "@/shared/lib/collection";
import type { Profile } from "../domain/profile";
import { MAX_PROFILES, PROFILES_KEY, parseProfiles } from "../domain/storage";

const profiles = createCollection<Profile>({
  key: PROFILES_KEY,
  parse: parseProfiles,
  max: MAX_PROFILES,
});

/** People who registered in this browser. */
export function useProfiles() {
  return { profiles: profiles.useAll(), add: profiles.add };
}
