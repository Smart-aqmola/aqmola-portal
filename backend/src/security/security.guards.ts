import { CanActivate, ExecutionContext, Injectable, SetMetadata } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Role } from "../../generated/prisma/client";
import { Database } from "../database";
import { ApiFault } from "../api-errors";
import type { AuthRequest } from "../auth/auth.controller";
import { isEmployee } from "./roles";

const ROLE_METADATA = "portal:required-roles";
export const RequireRoles = (...roles: Role[]) => SetMetadata(ROLE_METADATA, roles);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}
  canActivate(context: ExecutionContext) {
    const roles = this.reflector.getAllAndOverride<Role[]>(ROLE_METADATA, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!roles?.length) throw new ApiFault(403, "forbidden");
    const request = context.switchToHttp().getRequest<AuthRequest>();
    if (!request.identity?.user.roles.some((role) => roles.includes(role)))
      throw new ApiFault(403, "forbidden");
    return true;
  }
}

@Injectable()
export class OrganizationGuard implements CanActivate {
  constructor(private readonly db: Database) {}
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthRequest>();
    const user = request.identity?.user;
    if (!user?.organizationId || !isEmployee(user.roles)) throw new ApiFault(403, "forbidden");
    const organization = await this.db.organization.findUnique({
      where: { id: user.organizationId },
    });
    if (!organization || organization.blocked) throw new ApiFault(403, "forbidden");
    return true;
  }
}
