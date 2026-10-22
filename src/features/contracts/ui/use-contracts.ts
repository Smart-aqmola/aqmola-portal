"use client";

import { createCollection } from "@/shared/lib/collection";
import { MAX_CONTRACTS, nextContractNumber, type ContractApplication } from "../domain/contract";
import { CONTRACTS_KEY, parseContracts } from "../domain/storage";

const contracts = createCollection<ContractApplication>({
  key: CONTRACTS_KEY,
  parse: parseContracts,
  max: MAX_CONTRACTS,
});

/** The next free number, looking at every application in this browser. */
const takeNumber = (now: Date) => nextContractNumber(contracts.snapshot(), now);

/** The contract applications of one person. */
export function useContracts(ownerId: string | null) {
  const mine = contracts.useMine(ownerId);
  return { mine, add: contracts.add, replace: contracts.replace, takeNumber };
}

/** Every application in this browser, for the cabinet of an organization (spec 12.2). */
export function useAllContracts() {
  return { all: contracts.useAll(), replace: contracts.replace };
}
