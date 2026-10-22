"use client";

import { createCollection } from "@/shared/lib/collection";
import { MAX_PROPERTIES, type Property } from "../domain/property";
import { PROPERTIES_KEY, parseProperties } from "../domain/storage";

const properties = createCollection<Property>({
  key: PROPERTIES_KEY,
  parse: parseProperties,
  max: MAX_PROPERTIES,
});

/** The objects of one owner; `count` is every object in this browser. */
export function useProperties(ownerId: string | null) {
  const mine = properties.useMine(ownerId);
  const count = properties.useAll().length;
  return { mine, count, add: properties.add, replace: properties.replace };
}

/** Every object in this browser, for the cabinet of an organization (spec 12.3). */
export function useAllProperties() {
  return properties.useAll();
}
