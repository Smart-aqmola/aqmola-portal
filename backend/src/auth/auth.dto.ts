import { Transform } from "class-transformer";
import {
  Equals,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class RequestCodeDto {
  @ApiProperty({ description: "Mobile number in +7 format; spaces and parentheses allowed" })
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value !== "string") return value;
    let phone = value.replace(/[\s()\-]/g, "");
    if (/^8\d{10}$/.test(phone)) phone = "+7" + phone.slice(1);
    return phone;
  })
  @Matches(/^\+7[67]\d{9}$/)
  phone!: string;

  @ApiProperty({ enum: ["register", "login"] })
  @IsIn(["register", "login"])
  purpose!: "register" | "login";
}

export class VerifyCodeDto {
  @ApiProperty()
  @IsUUID("4")
  challengeId!: string;

  @ApiProperty({ description: "Six-digit one-time code" })
  @Matches(/^\d{6}$/)
  code!: string;
}

export class RegisterDto extends VerifyCodeDto {
  @ApiProperty({
    description: "12 digits; government identity verification is a separate integration",
  })
  @Matches(/^\d{12}$/)
  iin!: string;

  @ApiProperty()
  @Transform(({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName!: string;

  @ApiProperty()
  @Transform(({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName!: string;

  @ApiPropertyOptional()
  @Transform(({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  patronymic?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string;

  @ApiProperty({ enum: [true], description: "Consent to personal data processing" })
  @Equals(true)
  consent!: boolean;
}
