import { Role } from "../../generated/prisma/client";

/** Spec 2.6; belonging to these categories never grants rights to a property by itself. */
export const organizationRoles: readonly Role[] = [
  Role.provider_employee,
  Role.contact_operator,
  Role.request_specialist,
  Role.inspector,
  Role.meter_specialist,
  Role.accountant,
  Role.organization_admin,
];
export const isEmployee = (roles: readonly Role[]) =>
  roles.some((role) => organizationRoles.includes(role));
export function sessionRole(roles: readonly Role[]) {
  if (roles.includes(Role.system_admin)) return "admin";
  return isEmployee(roles) ? "operator" : "resident";
}
export const managementLock = "portal-security-management";
