import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuthRequest, SessionGuard } from "../auth/auth.controller";
import { RegistryQuery } from "../security/security.dto";
import { CreateDraftDto, SaveDraftDto } from "./draft.dto";
import { DraftService } from "./draft.service";

@ApiTags("Contract application drafts")
@ApiBearerAuth()
@UseGuards(SessionGuard)
@Controller("contract-applications")
export class DraftController {
  constructor(private readonly drafts: DraftService) {}
  @Post()
  @ApiOperation({
    summary:
      "Create own prefilled draft from confirmed property and available contract service; no number or signature",
  })
  create(@Req() request: AuthRequest, @Body() input: CreateDraftDto) {
    return this.drafts.create(request.identity, input);
  }
  @Get()
  @ApiOperation({
    summary: "Own drafts only; organizations and administrators have no implicit access",
  })
  list(@Req() request: AuthRequest, @Query() query: RegistryQuery) {
    return this.drafts.list(request.identity.user.id, query);
  }
  @Get(":id")
  @ApiOperation({ summary: "Restore own saved draft" })
  get(@Req() request: AuthRequest, @Param("id", new ParseUUIDPipe({ version: "4" })) id: string) {
    return this.drafts.get(request.identity.user.id, id);
  }
  @Put(":id")
  @ApiOperation({
    summary:
      "Merge editable draft fields with expected version; incomplete bounded form values allowed; never submits",
  })
  save(
    @Req() request: AuthRequest,
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() input: SaveDraftDto,
  ) {
    return this.drafts.save(request.identity, id, input);
  }
}
