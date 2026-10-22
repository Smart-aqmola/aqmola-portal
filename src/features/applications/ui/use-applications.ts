"use client";

import { createCollection } from "@/shared/lib/collection";
import { useHydrated } from "@/shared/lib/use-hydrated";
import { nextNumber, type Application } from "../domain/application";
import { APPLICATIONS_KEY, MAX_APPLICATIONS, parseApplications } from "../domain/storage";

const applications = createCollection<Application>({
  key: APPLICATIONS_KEY,
  parse: parseApplications,
  max: MAX_APPLICATIONS,
  idOf: (item) => item.number,
});

/** Takes a free number, builds the application with `make` and saves it. Returns it. */
function add(make: (number: string) => Application): Application {
  const created = make(nextNumber(applications.snapshot(), new Date()));
  applications.add(created);
  return created;
}

/** Saves several new applications at once; `make` gets the list as it is now. */
function addMany(make: (existing: Application[]) => Application[]) {
  applications.addMany(make(applications.snapshot()).reverse());
}

/** All applications made in this browser. The operator cabinet reads the same list. */
export function useApplications() {
  const ready = useHydrated();
  return {
    applications: applications.useAll(),
    ready,
    add,
    addMany,
    replace: applications.replace,
  };
}
