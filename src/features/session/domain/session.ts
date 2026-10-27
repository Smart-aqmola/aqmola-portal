export const SESSION_KEY = "aqmola:session";

export type DemoRole = "resident" | "business" | "operator" | "admin";
export type ApplicantRole = Exclude<DemoRole, "operator" | "admin">;

/** Staff of an organization and of the portal: they work in their own cabinets, not as applicants (spec 19.6). */
export const isStaffRole = (role: DemoRole): role is "operator" | "admin" =>
  role === "operator" || role === "admin";

export type DemoSession = {
  role: DemoRole;
  name: string;
  organizationId?: string;
  /** Set when a registered resident signed in; links the session to the saved profile. */
  userId?: string;
};

/** The only people who can "sign in": fictional, picked on the sign-in page. */
export const DEMO_PROFILES = {
  resident: { role: "resident", name: "Демо Житель" },
  business: { role: "business", name: "ТОО «Демо-Бизнес»" },
} as const satisfies Record<ApplicantRole, DemoSession>;

const ORGANIZATION_ID = /^[a-z0-9-]{1,60}$/;
const USER_ID = /^[a-z0-9-]{1,60}$/;

/** A registered resident: the name comes from the profile, the id points back at it. */
export function residentSession(userId: string, name: string): DemoSession {
  return { role: "resident", name, userId };
}

/** Who owns saved data (objects, drafts): the registered user, or the shared demo profile. */
export function ownerIdOf(session: Pick<DemoSession, "role" | "userId">): string {
  return session.userId ?? `demo-${session.role}`;
}

/** The administrator of the portal (spec 13): a demo profile with no organization. */
export function adminSession(): DemoSession {
  return { role: "admin", name: "Демо Администратор" };
}

/** The operator works for one organization, chosen at sign-in. */
export function operatorSession(organizationId: string): DemoSession {
  return { role: "operator", name: "Демо Оператор", organizationId };
}

function parseJson(raw: string | null): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

const isNameText = (value: string) => value.trim() !== "" && value.length <= 100;

export function parseSession(raw: string | null): DemoSession | null {
  const value = parseJson(raw);
  if (typeof value !== "object" || value === null) return null;
  const { role, name, organizationId, userId } = value as Record<string, unknown>;
  if (role === "resident" && typeof userId === "string") {
    const valid = USER_ID.test(userId) && typeof name === "string" && isNameText(name);
    return valid ? residentSession(userId, name as string) : null;
  }
  if (role === "operator") {
    const valid = typeof organizationId === "string" && ORGANIZATION_ID.test(organizationId);
    return valid && name === operatorSession(organizationId).name
      ? operatorSession(organizationId)
      : null;
  }
  if (role === "admin") return name === adminSession().name ? adminSession() : null;
  if (role !== "resident" && role !== "business") return null;
  const profile = DEMO_PROFILES[role];
  return name === profile.name ? profile : null;
}
