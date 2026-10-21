import {
  CanActivate,
  Controller,
  ExecutionContext,
  Get,
  HttpCode,
  Injectable,
  Post,
  Body,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { RegisterDto, RequestCodeDto, VerifyCodeDto } from "./auth.dto";

type Identity = Awaited<ReturnType<AuthService["authenticate"]>>;
type AuthRequest = {
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

  @Post("codes")
  @HttpCode(202)
  @ApiOperation({
    summary: "Request one-time code; 60s cooldown, 5 per phone/hour, 20 per IP/hour",
  })
  request(@Body() input: RequestCodeDto, @Req() request: AuthRequest) {
    return this.auth.requestCode(input, request.socket.remoteAddress ?? "unknown");
  }

  @Post("register")
  @ApiOperation({
    summary: "Register with verified phone, declared identity and consent; returns Bearer session",
  })
  register(@Body() input: RegisterDto) {
    return this.auth.verify(input, input);
  }

  @Post("login")
  @HttpCode(200)
  @ApiOperation({ summary: "Sign in using one-time code; returns Bearer session" })
  login(@Body() input: VerifyCodeDto) {
    return this.auth.verify(input);
  }

  @Get("me")
  @UseGuards(SessionGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get current user" })
  me(@Req() request: AuthRequest) {
    return request.identity.user;
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
