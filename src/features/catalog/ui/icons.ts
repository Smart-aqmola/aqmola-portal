import type { IconName } from "@/shared/ui/icon/icon";
import type { Sector, SituationId } from "../domain/types";

export const situationIcons: Record<SituationId, IconName> = {
  meters: "meter",
  connection: "plug",
  contracts: "doc",
  heating: "heat",
  housing: "house",
  construction: "crane",
  business: "chart",
  appeals: "chat",
};

export const categoryIcons: Record<Sector, IconName> = {
  water: "water",
  heat: "heat",
  electricity: "bolt",
  gas: "flame",
  waste: "trash",
  billing: "doc",
  housing: "house",
  architecture: "crane",
  business: "chart",
  dispatch: "chat",
};
