import { Controller, Get, Param, ParseUUIDPipe, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuthRequest, SessionGuard } from "../auth/auth.controller";
import { AvailabilityQuery } from "./availability.dto";
import { AvailabilityService } from "./availability.service";

@ApiTags("Services at property address")
@ApiBearerAuth()
@UseGuards(SessionGuard)
@Controller("properties/:id/services")
export class AvailabilityController {
  constructor(private readonly availability: AvailabilityService) {}
  @Get()
  @ApiOperation({
    summary:
      "Five utility sectors and eligible providers for own confirmed property; fictional street coverage",
  })
  services(
    @Req() request: AuthRequest,
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Query() query: AvailabilityQuery,
  ) {
    return this.availability.services(request.identity.user.id, id, query.lang);
  }
  @Get(":code")
  @ApiOperation({
    summary:
      "Check a catalog service code against own confirmed address; unavailable gives 422 not_serviced",
  })
  service(
    @Req() request: AuthRequest,
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Param("code") code: string,
    @Query() query: AvailabilityQuery,
  ) {
    return this.availability.service(request.identity.user.id, id, code, query.lang);
  }
}
