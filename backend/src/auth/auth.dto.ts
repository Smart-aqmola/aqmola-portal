import { Transform } from "class-transformer";
import {
  Equals,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
const trim = ({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value);
const optionalText = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim() || null : value;
const NAME = /^[\p{L}][\p{L}\s'’-]*$/u;
const normalizePhone = ({ value }: { value: unknown }) => {
  if (typeof value !== "string") return value;
  let digits = value.replace(/\D/g, "");
  if (digits.length === 11 && /^[78]/.test(digits)) digits = digits.slice(1);
  return /^7\d{9}$/.test(digits) ? `+7${digits}` : value;
};
export class RequestCodeDto {
  @ApiProperty({ description: "Kazakhstan mobile: +77011234567, 8 (701) 123-45-67 or 7011234567" })
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value !== "string") return value;
    let digits = value.replace(/\D/g, "");
    if (digits.length === 11 && /^[78]/.test(digits)) digits = digits.slice(1);
    return /^7\d{9}$/.test(digits) ? `+7${digits}` : value;
  })
  @Matches(/^\+77\d{9}$/)
  phone!: string;
  @ApiProperty({ enum: ["register", "login"] })
  @IsIn(["register", "login"])
  purpose!: "register" | "login";
}
export class VerifyCodeDto {
  @ApiProperty() @IsUUID("4") challengeId!: string;
  @ApiProperty({ description: "Six-digit one-time code" }) @Matches(/^\d{6}$/) code!: string;
}
export class RegisterDto extends VerifyCodeDto {
  @ApiPropertyOptional({
    description: "May be omitted: derived from challenge; if present must match its verified phone",
  })
  @Transform(normalizePhone)
  @ValidateIf((_object, value) => value !== undefined)
  @Matches(/^\+77\d{9}$/)
  phone?: string;
  @ApiProperty({
    description: "12 digits, YYMMDD prefix; declared identity, not government verification",
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.replace(/\s/g, "") : value,
  )
  @Matches(/^\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])\d{6}$/)
  iin!: string;
  @ApiProperty()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  @Matches(NAME)
  firstName!: string;
  @ApiProperty()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  @Matches(NAME)
  lastName!: string;
  @ApiPropertyOptional({ nullable: true })
  @Transform(optionalText)
  @IsOptional()
  @IsString()
  @MaxLength(60)
  @Matches(NAME)
  middleName?: string | null;
  @ApiPropertyOptional({ nullable: true })
  @Transform(optionalText)
  @IsOptional()
  @Matches(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
  @MaxLength(100)
  email?: string | null;
  @ApiProperty({ enum: [true] }) @Equals(true) consent!: boolean;
}
export class UpdateProfileDto {
  @ApiProperty({ minimum: 1, description: "Expected current profile version" })
  @IsInt()
  @Min(1)
  version!: number;
  @ApiPropertyOptional()
  @Transform(trim)
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  @Matches(NAME)
  firstName?: string;
  @ApiPropertyOptional()
  @Transform(trim)
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  @Matches(NAME)
  lastName?: string;
  @ApiPropertyOptional({ nullable: true })
  @Transform(optionalText)
  @IsOptional()
  @IsString()
  @MaxLength(60)
  @Matches(NAME)
  middleName?: string | null;
  @ApiPropertyOptional({ nullable: true })
  @Transform(optionalText)
  @IsOptional()
  @Matches(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
  @MaxLength(100)
  email?: string | null;
}
export class UserResponseDto {
  @ApiPropertyOptional() organizationId?: string;
  @ApiProperty({ format: "uuid" }) id!: string;
  @ApiProperty({ example: "900101••••23" }) iin!: string;
  @ApiProperty() firstName!: string;
  @ApiProperty() lastName!: string;
  @ApiPropertyOptional() middleName?: string;
  @ApiProperty() phone!: string;
  @ApiPropertyOptional() email?: string;
  @ApiProperty({ type: [String], example: ["resident"] }) roles!: string[];
  @ApiProperty({ enum: ["active", "blocked"] }) status!: string;
  @ApiProperty() version!: number;
  @ApiProperty({ format: "date-time" }) createdAt!: Date;
}
export class SessionInfoDto {
  @ApiPropertyOptional() organizationId?: string;
  @ApiProperty() role!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ format: "date-time" }) expiresAt!: Date;
  @ApiProperty({ format: "date-time" }) idleExpiresAt!: Date;
}
export class SessionResponseDto {
  @ApiProperty() token!: string;
  @ApiProperty({ enum: ["Bearer"] }) tokenType!: string;
  @ApiProperty({ format: "date-time" }) expiresAt!: Date;
  @ApiProperty({ format: "date-time" }) idleExpiresAt!: Date;
  @ApiProperty({ type: UserResponseDto }) user!: UserResponseDto;
  @ApiProperty({ type: SessionInfoDto }) session!: SessionInfoDto;
}
