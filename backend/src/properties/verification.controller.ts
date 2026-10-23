import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Role } from "../../generated/prisma/client";
import { AuthRequest, SessionGuard } from "../auth/auth.controller";
import { RequireRoles, RolesGuard, OrganizationGuard } from "../security/security.guards";
import { RegistryQuery } from "../security/security.dto";
import { MAX_DOCUMENT_BYTES, UploadedDocument } from "./document-format";
import { VerificationService } from "./verification.service";
import {
  ExpectedVersionDto,
  VerificationDecisionDto,
  VerificationRequestDto,
} from "./verification.dto";

const uuid = () => new ParseUUIDPipe({ version: "4" });

@ApiTags("Property documents and verification")
@ApiBearerAuth()
@UseGuards(SessionGuard)
@Controller("properties/:id")
export class PropertyVerificationController {
  constructor(private readonly verification: VerificationService) {}
  @Post("documents")
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      required: ["file", "version"],
      properties: {
        file: { type: "string", format: "binary" },
        version: { type: "integer", minimum: 1 },
      },
    },
  })
  @ApiOperation({
    summary:
      "Upload one PDF/JPEG/PNG up to 5 MiB to own editable property; max 5 files, version incremented",
  })
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: MAX_DOCUMENT_BYTES, files: 1, fields: 1, parts: 2, fieldSize: 32 },
    }),
  )
  upload(
    @Req() request: AuthRequest,
    @Param("id", uuid()) id: string,
    @Body() input: ExpectedVersionDto,
    @UploadedFile() file?: UploadedDocument,
  ) {
    return this.verification.upload(request.identity.user.id, id, input.version, file);
  }
  @Get("documents")
  @ApiOperation({ summary: "Own uploaded document metadata" })
  documents(@Req() request: AuthRequest, @Param("id", uuid()) id: string) {
    return this.verification.documents(request.identity.user.id, id);
  }
  @Get("documents/:documentId")
  @Header("X-Content-Type-Options", "nosniff")
  @Header("Content-Security-Policy", "sandbox")
  @ApiOperation({ summary: "Download own private document; attachment, never a public URL" })
  download(
    @Req() request: AuthRequest,
    @Param("id", uuid()) id: string,
    @Param("documentId", uuid()) documentId: string,
  ) {
    return this.verification.download(request.identity.user.id, id, documentId);
  }
  @Delete("documents/:documentId")
  @ApiOperation({
    summary: "Remove own document before submission or after rejection; expected version in query",
  })
  remove(
    @Req() request: AuthRequest,
    @Param("id", uuid()) id: string,
    @Param("documentId", uuid()) documentId: string,
    @Query() input: ExpectedVersionDto,
  ) {
    return this.verification.remove(request.identity.user.id, id, documentId, input.version);
  }
  @Post("verification")
  @ApiOperation({
    summary:
      "Submit 1–5 uploaded document IDs for review; government integration unavailable (503)",
  })
  verify(
    @Req() request: AuthRequest,
    @Param("id", uuid()) id: string,
    @Body() input: VerificationRequestDto,
  ) {
    return this.verification.request(request.identity.user.id, id, input);
  }
}

@ApiTags("Property rights review")
@ApiBearerAuth()
@UseGuards(SessionGuard, OrganizationGuard, RolesGuard)
@RequireRoles(Role.request_specialist)
@Controller("org/property-verifications")
export class PropertyReviewController {
  constructor(private readonly verification: VerificationService) {}
  @Get()
  @ApiOperation({
    summary: "Pending reviews in organization's territories; excludes your own properties",
  })
  queue(@Req() request: AuthRequest, @Query() query: RegistryQuery) {
    return this.verification.queue(request.identity, query);
  }
  @Get(":id")
  @ApiOperation({ summary: "Pending review detail in own organization's territory" })
  details(@Req() request: AuthRequest, @Param("id", uuid()) id: string) {
    return this.verification.reviewDetails(request.identity, id);
  }
  @Get(":id/documents/:documentId")
  @Header("X-Content-Type-Options", "nosniff")
  @Header("Content-Security-Policy", "sandbox")
  @ApiOperation({ summary: "Download only a document submitted for an accessible pending review" })
  document(
    @Req() request: AuthRequest,
    @Param("id", uuid()) id: string,
    @Param("documentId", uuid()) documentId: string,
  ) {
    return this.verification.reviewDownload(request.identity, id, documentId);
  }
  @Post(":id/decision")
  @ApiOperation({
    summary: "Confirm or reject a pending review with expected version; rejection requires note",
  })
  decision(
    @Req() request: AuthRequest,
    @Param("id", uuid()) id: string,
    @Body() input: VerificationDecisionDto,
  ) {
    return this.verification.decide(request.identity, id, input);
  }
}
