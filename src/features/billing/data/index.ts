import type { ChargeRepository } from "../domain/repository";
import { stubChargeRepository } from "./stub-charge-repository";

/** The only place that knows which repository is used; a backend replaces the stub here. */
export function getChargeRepository(): ChargeRepository {
  return stubChargeRepository;
}
