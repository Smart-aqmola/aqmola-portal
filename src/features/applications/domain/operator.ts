import { changeStatus, createApplication, nextNumber, type Application } from "./application";
import { statuses, type ApplicationStatus } from "./status";
import { DEMO_PROFILES } from "@/features/session/domain/session";

export function forOrganization(
  applications: readonly Application[],
  organizationId: string,
): Application[] {
  return applications.filter((item) => item.organizationId === organizationId);
}

export function countByStatus(
  applications: readonly Application[],
): Record<ApplicationStatus, number> {
  const counts = Object.fromEntries(statuses.map((status) => [status, 0])) as Record<
    ApplicationStatus,
    number
  >;
  for (const item of applications) counts[item.status] += 1;
  return counts;
}

const SAMPLE_COUNT = 3;

/** Test applications from the demo resident, so an empty operator cabinet can be tried at once. */
export function buildSamples(input: {
  organizationId: string;
  services: readonly { slug: string; title: string }[];
  existing: readonly { number: string }[];
  now: Date;
}): Application[] {
  const made: Application[] = [];
  for (const service of input.services.slice(0, SAMPLE_COUNT)) {
    const number = nextNumber([...input.existing, ...made], input.now);
    let application = createApplication({
      serviceSlug: service.slug,
      serviceTitle: service.title,
      organizationId: input.organizationId,
      ownerRole: "resident",
      ownerName: DEMO_PROFILES.resident.name,
      form: {
        territoryId: "kokshetau",
        address: "ул. Тестовая, 1",
        attached: [],
        comment: "",
        consent: true,
      },
      number,
      now: input.now,
    });
    if (made.length === 1) {
      const result = changeStatus(application, "in_progress", input.now, "Принято в работу");
      if (result.ok) application = result.application;
    }
    made.push(application);
  }
  return made;
}
