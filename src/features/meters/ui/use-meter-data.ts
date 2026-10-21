"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { createLocalStore } from "@/shared/lib/local-store";
import { MAX_METERS, type Meter } from "../domain/meter";
import { MAX_REQUESTS, type MeterRequest } from "../domain/meter-request";
import { MAX_READINGS, type Reading } from "../domain/reading";
import {
  METERS_KEY,
  METER_REQUESTS_KEY,
  READINGS_KEY,
  parseMeterRequests,
  parseMeters,
  parseReadings,
} from "../domain/storage";

const NONE_METERS: Meter[] = [];
const NONE_READINGS: Reading[] = [];
const NONE_REQUESTS: MeterRequest[] = [];

const metersStore = createLocalStore<Meter[]>({
  key: METERS_KEY,
  parse: parseMeters,
  empty: NONE_METERS,
});
const readingsStore = createLocalStore<Reading[]>({
  key: READINGS_KEY,
  parse: parseReadings,
  empty: NONE_READINGS,
});
const requestsStore = createLocalStore<MeterRequest[]>({
  key: METER_REQUESTS_KEY,
  parse: parseMeterRequests,
  empty: NONE_REQUESTS,
});

function useMine<T extends { ownerId: string }>(
  store: ReturnType<typeof createLocalStore<T[]>>,
  none: T[],
  ownerId: string | null,
): T[] {
  const all = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  return useMemo(
    () => (ownerId ? all.filter((item) => item.ownerId === ownerId) : none),
    [all, none, ownerId],
  );
}

/** Meters, readings and requests of one person. With a server this becomes calls to the backend. */
export function useMeterData(ownerId: string | null) {
  const meters = useMine(metersStore, NONE_METERS, ownerId);
  const readings = useMine(readingsStore, NONE_READINGS, ownerId);
  const requests = useMine(requestsStore, NONE_REQUESTS, ownerId);

  const addMeter = useCallback((meter: Meter) => {
    metersStore.write([meter, ...metersStore.getSnapshot()].slice(0, MAX_METERS));
  }, []);

  /** Saves changed meters (same ids) and adds new ones, as one write. */
  const saveMeters = useCallback((changes: { updated: Meter[]; created: Meter[] }) => {
    const changed = new Map(changes.updated.map((item) => [item.id, item]));
    const next = metersStore.getSnapshot().map((item) => changed.get(item.id) ?? item);
    metersStore.write([...changes.created, ...next].slice(0, MAX_METERS));
  }, []);

  const addReading = useCallback((reading: Reading) => {
    readingsStore.write([reading, ...readingsStore.getSnapshot()].slice(0, MAX_READINGS));
  }, []);

  const replaceReading = useCallback((changed: Reading) => {
    readingsStore.write(
      readingsStore.getSnapshot().map((item) => (item.id === changed.id ? changed : item)),
    );
  }, []);

  const addRequest = useCallback((request: MeterRequest) => {
    requestsStore.write([request, ...requestsStore.getSnapshot()].slice(0, MAX_REQUESTS));
  }, []);

  const replaceRequest = useCallback((changed: MeterRequest) => {
    requestsStore.write(
      requestsStore.getSnapshot().map((item) => (item.id === changed.id ? changed : item)),
    );
  }, []);

  /** Every number in this browser, so a new one never repeats. */
  const allReadings = useCallback(() => readingsStore.getSnapshot(), []);
  const allRequests = useCallback(() => requestsStore.getSnapshot(), []);

  return {
    meters,
    readings,
    requests,
    addMeter,
    saveMeters,
    addReading,
    replaceReading,
    addRequest,
    replaceRequest,
    allReadings,
    allRequests,
  };
}

/** Every meter, reading and request in this browser, for the cabinet of an organization (spec 12.2). */
export function useAllMeterData() {
  const meters = useSyncExternalStore(
    metersStore.subscribe,
    metersStore.getSnapshot,
    metersStore.getServerSnapshot,
  );
  const readings = useSyncExternalStore(
    readingsStore.subscribe,
    readingsStore.getSnapshot,
    readingsStore.getServerSnapshot,
  );
  const requests = useSyncExternalStore(
    requestsStore.subscribe,
    requestsStore.getSnapshot,
    requestsStore.getServerSnapshot,
  );

  const saveMeters = useCallback((changes: { updated: Meter[]; created: Meter[] }) => {
    const changed = new Map(changes.updated.map((item) => [item.id, item]));
    const next = metersStore.getSnapshot().map((item) => changed.get(item.id) ?? item);
    metersStore.write([...changes.created, ...next].slice(0, MAX_METERS));
  }, []);
  const replaceReading = useCallback((changed: Reading) => {
    readingsStore.write(
      readingsStore.getSnapshot().map((item) => (item.id === changed.id ? changed : item)),
    );
  }, []);
  const replaceRequest = useCallback((changed: MeterRequest) => {
    requestsStore.write(
      requestsStore.getSnapshot().map((item) => (item.id === changed.id ? changed : item)),
    );
  }, []);

  return { meters, readings, requests, saveMeters, replaceReading, replaceRequest };
}
