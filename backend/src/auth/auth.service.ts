import {
  ConflictException,
  HttpException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import {
  createHash,
  createHmac,
  randomBytes,
  randomInt,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import { Database } from "../database";
import { LocalSms } from "./local-sms";
import { RegisterDto, RequestCodeDto, VerifyCodeDto } from "./auth.dto";
import { Prisma } from "../../generated/prisma/client";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const SESSION_LIFETIME = 7 * 24 * HOUR;
const userFields = {
  id: true,
  phone: true,
  iin: true,
  firstName: true,
  lastName: true,
  patronymic: true,
  email: true,
  phoneVerifiedAt: true,
  createdAt: true,
} as const;
const digestToken = (token: string) => createHash("sha256").update(token).digest("hex");

@Injectable()
export class AuthService {
  private readonly secret: string;
  constructor(
    private readonly db: Database,
    private readonly sms: LocalSms,
  ) {
    const secret = process.env.AUTH_OTP_SECRET;
    if (!secret || Buffer.byteLength(secret) < 32)
      throw new Error("AUTH_OTP_SECRET must contain at least 32 bytes");
    this.secret = secret;
  }

  private hash(value: string) {
    return createHmac("sha256", this.secret).update(value).digest("hex");
  }

  async requestCode(input: RequestCodeDto, ip: string) {
    const id = randomUUID();
    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    const ipHash = this.hash(`ip:${ip}`);
    const expiresAt = await this.db.$transaction(async (tx) => {
      // Shared database locks make limits effective across multiple API processes.
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`otp-ip:${ipHash}`}, 0))::text`;
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`otp-phone:${input.phone}`}, 0))::text`;
      const now = new Date();
      const since = new Date(now.getTime() - HOUR);
      const [recent, byPhone, byIp] = await Promise.all([
        tx.otpChallenge.findFirst({
          where: { phone: input.phone },
          orderBy: { createdAt: "desc" },
        }),
        tx.otpChallenge.count({ where: { phone: input.phone, createdAt: { gte: since } } }),
        tx.otpChallenge.count({ where: { ipHash, createdAt: { gte: since } } }),
      ]);
      if (
        (recent && now.getTime() - recent.createdAt.getTime() < MINUTE) ||
        byPhone >= 5 ||
        byIp >= 20
      ) {
        throw new HttpException("OTP_RATE_LIMITED", 429);
      }
      const expiresAt = new Date(now.getTime() + 5 * MINUTE);
      await tx.otpChallenge.updateMany({
        where: { phone: input.phone, consumedAt: null },
        data: { consumedAt: now },
      });
      await tx.otpChallenge.create({
        data: {
          id,
          phone: input.phone,
          purpose: input.purpose,
          codeHash: this.hash(`code:${id}:${code}`),
          ipHash,
          expiresAt,
          createdAt: now,
        },
      });
      return expiresAt;
    });
    try {
      await this.sms.send(id, input.phone, code, expiresAt);
      await this.db.otpChallenge.update({ where: { id }, data: { deliveredAt: new Date() } });
    } catch {
      await this.db.otpChallenge.update({ where: { id }, data: { consumedAt: new Date() } });
      throw new ServiceUnavailableException("OTP_DELIVERY_FAILED");
    }
    // Never reveal whether the phone is registered, nor return the code in API responses.
    return { challengeId: id, expiresAt, resendAfterSeconds: 60 };
  }

  async verify(input: VerifyCodeDto, registration?: RegisterDto) {
    const token = randomBytes(32).toString("base64url");
    try {
      const result = await this.db.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM "OtpChallenge" WHERE id = ${input.challengeId} FOR UPDATE`;
        const challenge = await tx.otpChallenge.findUnique({ where: { id: input.challengeId } });
        const now = new Date();
        if (
          !challenge ||
          challenge.consumedAt ||
          !challenge.deliveredAt ||
          challenge.attempts >= 5 ||
          challenge.expiresAt <= now ||
          challenge.purpose !== (registration ? "register" : "login")
        ) {
          return { error: "invalid" } as const;
        }
        await tx.otpChallenge.update({
          where: { id: challenge.id },
          data: { attempts: { increment: 1 } },
        });
        if (
          !timingSafeEqual(
            Buffer.from(challenge.codeHash, "hex"),
            Buffer.from(this.hash(`code:${challenge.id}:${input.code}`), "hex"),
          )
        ) {
          return { error: "invalid" } as const;
        }
        await tx.otpChallenge.update({ where: { id: challenge.id }, data: { consumedAt: now } });
        let user;
        if (registration) {
          const existing = await tx.user.findFirst({
            where: { OR: [{ phone: challenge.phone }, { iin: registration.iin }] },
          });
          if (existing) return { error: "conflict" } as const;
          user = await tx.user.create({
            data: {
              phone: challenge.phone,
              iin: registration.iin,
              firstName: registration.firstName,
              lastName: registration.lastName,
              patronymic: registration.patronymic,
              email: registration.email,
              phoneVerifiedAt: now,
              consentAt: now,
            },
            select: userFields,
          });
        } else {
          user = await tx.user.findUnique({
            where: { phone: challenge.phone, blocked: false },
            select: userFields,
          });
          if (!user) return { error: "invalid" } as const;
        }
        const expiresAt = new Date(now.getTime() + SESSION_LIFETIME);
        await tx.session.create({
          data: { tokenHash: digestToken(token), userId: user.id, expiresAt },
        });
        return { user, expiresAt };
      });
      // Throw outside the transaction, so incorrect attempts and consumed codes remain recorded.
      if (result.error === "conflict") throw new ConflictException("REGISTRATION_CONFLICT");
      if (result.error) throw new UnauthorizedException("OTP_INVALID_OR_EXPIRED");
      return { token, tokenType: "Bearer", expiresAt: result.expiresAt, user: result.user };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictException("REGISTRATION_CONFLICT");
      }
      throw error;
    }
  }

  async authenticate(header?: string | string[]) {
    if (typeof header !== "string" || !/^Bearer [A-Za-z0-9_-]{43}$/.test(header))
      throw new UnauthorizedException("SESSION_REQUIRED");
    const session = await this.db.session.findUnique({
      where: { tokenHash: digestToken(header.slice(7)) },
      include: { user: { select: { ...userFields, blocked: true } } },
    });
    if (!session || session.revokedAt || session.expiresAt <= new Date() || session.user.blocked) {
      throw new UnauthorizedException("SESSION_INVALID_OR_EXPIRED");
    }
    const { blocked: _blocked, ...user } = session.user;
    return { sessionId: session.id, user };
  }

  async logout(sessionId: string) {
    await this.db.session.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
  async logoutAll(userId: string) {
    await this.db.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
