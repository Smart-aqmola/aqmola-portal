import type { IconName } from "@/shared/ui/icon/icon";

/**
 * The utility services shown as cards on the home page (spec 1.2): eight, so they fill two even
 * rows of four. The rest of the fourteen lines of the specification are one click away in the catalog.
 */
export const HOME_UTILITY_SLUGS = [
  "electricity-contract-resident",
  "water-contract-resident",
  "heat-contract",
  "gas-contract",
  "waste-contract-kokshetau",
  "water-meter-readings",
  "utility-payment",
  "service-quality-complaint",
] as const;

export type PortalSectionId =
  | "contractNew"
  | "meters"
  | "billing"
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
 * Eight, for two even rows of four; "My applications" is left to the main menu, where it already is.
 */
export const portalSections: readonly PortalSection[] = [
  { id: "contractNew", path: "/contracts/new", icon: "doc" },
  { id: "meters", path: "/meters", icon: "meter" },
  { id: "billing", path: "/billing", icon: "chart" },
  { id: "contracts", path: "/contracts", icon: "doc" },
  { id: "notifications", path: "/notifications", icon: "online" },
  { id: "appeals", path: "/appeals", icon: "chat" },
  { id: "organizations", path: "/organizations", icon: "house" },
  { id: "help", path: "/help", icon: "search" },
];
