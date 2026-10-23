import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Role } from "../../generated/prisma/client";
import { SessionGuard, type AuthRequest } from "../auth/auth.controller";
import { RequireRoles, RolesGuard, OrganizationGuard } from "./security.guards";
import { SecurityService } from "./security.service";
import { organizationRoles } from "./roles";
import { OrganizationAccessDto, RegistryQuery, UserAccessDto } from "./security.dto";

@ApiTags("Administration")
@ApiBearerAuth()
@UseGuards(SessionGuard, RolesGuard)
@RequireRoles(Role.system_admin)
@Controller("admin")
export class SecurityAdminController {
  constructor(private readonly security: SecurityService) {}
  @Get("users")
  @ApiOperation({ summary: "User registry; personal identifiers masked" })
  users(@Query() query: RegistryQuery) {
    return this.security.users(query);
  }
  @Patch("users/:id")
  @ApiOperation({
    summary:
      "Change access, revoke sessions and append audit; protects last active system administrator",
  })
  updateUser(
    @Req() request: AuthRequest,
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() input: UserAccessDto,
  ) {
    return this.security.updateUser(request.identity, id, input);
  }
  @Get("organizations")
  @ApiOperation({ summary: "Organization registry and access status" })
  organizations(@Query() query: RegistryQuery) {
    return this.security.organizations(query);
  }
  @Patch("organizations/:id")
  @ApiOperation({ summary: "Block/unblock an organization; block revokes current staff sessions" })
  updateOrganization(
    @Req() request: AuthRequest,
    @Param("id") id: string,
    @Body() input: OrganizationAccessDto,
  ) {
    return this.security.updateOrganization(request.identity, id, input);
  }
}

@ApiTags("Organization")
@ApiBearerAuth()
@UseGuards(SessionGuard, OrganizationGuard, RolesGuard)
@RequireRoles(...organizationRoles)
@Controller("org")
export class OrganizationController {
  constructor(private readonly security: SecurityService) {}
  @Get()
  @ApiOperation({
    summary: "Current employee's active organization; scope comes from server session",
  })
  organization(@Req() request: AuthRequest) {
    return this.security.ownOrganization(request.identity);
  }
  @Get("staff")
  @RequireRoles(Role.organization_admin)
  @ApiOperation({ summary: "Staff registry of your organization only; no role assignment" })
  staff(@Req() request: AuthRequest, @Query() query: RegistryQuery) {
    return this.security.staff(request.identity, query);
  }
}
