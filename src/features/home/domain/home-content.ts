import type { IconName } from "@/shared/ui/icon/icon";

/**
 * The utility services shown as cards on the home page (spec 1.2). Fifteen cards for fourteen
 * lines of the specification: waste removal has one card for the city and one for the districts,
 * because they are different companies.
 */
export const HOME_UTILITY_SLUGS = [
  "electricity-contract-resident",
  "water-contract-resident",
  "heat-contract",
  "gas-contract",
  "waste-contract-kokshetau",
  "waste-contract-region",
  "water-meter-readings",
  "meter-installation-replacement",
  "water-meter-sealing",
  "meter-unsealing",
  "meter-verification",
  "unified-receipt",
  "utility-payment",
  "recalculation-request",
  "service-quality-complaint",
] as const;

export type PortalSectionId =
  | "contractNew"
  | "meters"
  | "billing"
  | "applications"
  | "contracts"
  | "notifications"
  | "appeals"
  | "organizations"
  | "help";

export type PortalSection = {
  id: PortalSectionId;
  /** Address inside a language, for example "/applications"; null while the section is not built. */
  path: string | null;
  icon: IconName;
};

/**
 * The sections of the portal named in the specification (1.1). A section without a path is shown
 * as "soon" instead of a link that leads nowhere; each stage of the plan fills in its own path.
 */
export const portalSections: readonly PortalSection[] = [
  { id: "contractNew", path: "/contracts/new", icon: "doc" },
  { id: "meters", path: null, icon: "meter" },
  { id: "billing", path: null, icon: "chart" },
  { id: "applications", path: "/applications", icon: "files" },
  { id: "contracts", path: null, icon: "doc" },
  { id: "notifications", path: null, icon: "online" },
  { id: "appeals", path: null, icon: "chat" },
  { id: "organizations", path: "/organizations", icon: "house" },
  { id: "help", path: "/help", icon: "search" },
];
