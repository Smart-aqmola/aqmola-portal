"use client";

import { createCollection } from "@/shared/lib/collection";
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

const meters = createCollection<Meter>({ key: METERS_KEY, parse: parseMeters, max: MAX_METERS });
const readings = createCollection<Reading>({
  key: READINGS_KEY,
  parse: parseReadings,
  max: MAX_READINGS,
});
const requests = createCollection<MeterRequest>({
  key: METER_REQUESTS_KEY,
  parse: parseMeterRequests,
  max: MAX_REQUESTS,
});

const writes = {
  addMeter: meters.add,
  /** Saves changed meters (same ids) and adds new ones, as one write. */
  saveMeters: meters.save,
  addReading: readings.add,
  replaceReading: readings.replace,
  addRequest: requests.add,
  replaceRequest: requests.replace,
  /** Every number in this browser, so a new one never repeats. */
  allReadings: readings.snapshot,
  allRequests: requests.snapshot,
};

/** Meters, readings and requests of one person. */
export function useMeterData(ownerId: string | null) {
  return {
    meters: meters.useMine(ownerId),
    readings: readings.useMine(ownerId),
    requests: requests.useMine(ownerId),
    ...writes,
  };
}

/** Every meter, reading and request in this browser, for the cabinet of an organization (spec 12.2). */
export function useAllMeterData() {
  return {
    meters: meters.useAll(),
    readings: readings.useAll(),
    requests: requests.useAll(),
    saveMeters: writes.saveMeters,
    replaceReading: writes.replaceReading,
    replaceRequest: writes.replaceRequest,
  };
}
