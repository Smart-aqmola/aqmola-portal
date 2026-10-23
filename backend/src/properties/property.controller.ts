import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuthRequest, SessionGuard } from "../auth/auth.controller";
import { PropertyInputDto, UpdatePropertyDto } from "./property.dto";
import { PropertyService } from "./property.service";

@ApiTags("Properties")
@ApiBearerAuth()
@UseGuards(SessionGuard)
@Controller("properties")
export class PropertyController {
  constructor(private readonly properties: PropertyService) {}
  @Get()
  @ApiOperation({ summary: "List own properties (at most 30); no access to other users' objects" })
  list(@Req() request: AuthRequest) {
    return this.properties.list(request.identity.user.id);
  }
  @Get(":id")
  @ApiOperation({ summary: "Own property details" })
  get(@Req() request: AuthRequest, @Param("id", new ParseUUIDPipe({ version: "4" })) id: string) {
    return this.properties.get(request.identity.user.id, id);
  }
  @Post()
  @ApiOperation({ summary: "Add own unverified property; ownerId is assigned from session" })
  create(@Req() request: AuthRequest, @Body() input: PropertyInputDto) {
    return this.properties.create(request.identity.user.id, input);
  }
  @Patch(":id")
  @ApiOperation({
    summary: "Save complete editable form with expected version; rights remain unverified",
  })
  update(
    @Req() request: AuthRequest,
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() input: UpdatePropertyDto,
  ) {
    return this.properties.update(request.identity.user.id, id, input);
  }
}
