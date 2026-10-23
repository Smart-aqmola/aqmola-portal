import {
  CanActivate,
  Controller,
  ExecutionContext,
  Get,
  HttpCode,
  Injectable,
  Post,
  Patch,
  Body,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiOkResponse,
  ApiCreatedResponse,
} from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import {
  RegisterDto,
  RequestCodeDto,
  VerifyCodeDto,
  UpdateProfileDto,
  UserResponseDto,
  SessionResponseDto,
} from "./auth.dto";

export type Identity = Awaited<ReturnType<AuthService["authenticate"]>>;
export type AuthRequest = {
  headers: Record<string, string | string[] | undefined>;
  socket: { remoteAddress?: string };
  identity: Identity;
};

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthRequest>();
    request.identity = await this.auth.authenticate(request.headers.authorization);
    return true;
  }
}

@ApiTags("Authentication")
@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("otp/request")
  @HttpCode(202)
  @ApiOperation({
    summary: "Request one-time code; 60s cooldown, 5 per phone/hour, 20 per IP/hour",
  })
  request(@Body() input: RequestCodeDto, @Req() request: AuthRequest) {
    return this.auth.requestCode(input, request.socket.remoteAddress ?? "unknown");
  }

  @Post("register")
  @ApiCreatedResponse({ type: SessionResponseDto })
  @ApiOperation({
    summary: "Register with verified phone, declared identity and consent; returns Bearer session",
  })
  register(@Body() input: RegisterDto) {
    return this.auth.verify(input, input);
  }

  @Post("otp/verify")
  @ApiOkResponse({ type: SessionResponseDto })
  @HttpCode(200)
  @ApiOperation({ summary: "Sign in using one-time code; returns Bearer session" })
  login(@Body() input: VerifyCodeDto) {
    return this.auth.verify(input);
  }

  @Post("logout")
  @HttpCode(204)
  @UseGuards(SessionGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Revoke current session" })
  logout(@Req() request: AuthRequest) {
    return this.auth.logout(request.identity.sessionId);
  }

  @Post("logout-all")
  @HttpCode(204)
  @UseGuards(SessionGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Revoke all current user sessions" })
  logoutAll(@Req() request: AuthRequest) {
    return this.auth.logoutAll(request.identity.user.id);
  }
}

@ApiTags("Profile")
@ApiBearerAuth()
@UseGuards(SessionGuard)
@Controller("me")
export class ProfileController {
  constructor(private readonly auth: AuthService) {}
  @Get()
  @ApiOkResponse({ type: UserResponseDto })
  @ApiOperation({ summary: "Current profile; IIN masked, roles server-controlled" })
  me(@Req() request: AuthRequest) {
    return request.identity.user;
  }
  @Patch()
  @ApiOkResponse({ type: UserResponseDto })
  @ApiOperation({
    summary: "Update names/email using expected version; no phone, identity or role changes",
  })
  update(@Req() request: AuthRequest, @Body() input: UpdateProfileDto) {
    return this.auth.updateProfile(request.identity.user.id, input);
  }
}
