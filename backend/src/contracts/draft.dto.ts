import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsObject,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from "class-validator";

export class CreateDraftDto {
  @ApiProperty() @IsUUID("4") propertyId!: string;
  @ApiProperty() @IsString() @MaxLength(100) serviceSlug!: string;
  @ApiPropertyOptional({ enum: ["ru", "kk"], default: "ru" }) @IsIn(["ru", "kk"]) lang:
    "ru" | "kk" = "ru";
}
export class ApplicantPatchDto {
  @ApiPropertyOptional()
  @ValidateIf((_, v) => v !== undefined)
  @IsString()
  @MaxLength(80)
  lastName?: string;
  @ApiPropertyOptional()
  @ValidateIf((_, v) => v !== undefined)
  @IsString()
  @MaxLength(80)
  firstName?: string;
  @ApiPropertyOptional()
  @ValidateIf((_, v) => v !== undefined)
  @IsString()
  @MaxLength(80)
  middleName?: string;
  @ApiPropertyOptional({
    description: "Identity cannot change; accepts the same masked IIN or the user's own IIN",
  })
  @ValidateIf((_, v) => v !== undefined)
  @IsString()
  @MaxLength(20)
  iin?: string;
  @ApiPropertyOptional()
  @ValidateIf((_, v) => v !== undefined)
  @IsString()
  @MaxLength(30)
  phone?: string;
  @ApiPropertyOptional()
  @ValidateIf((_, v) => v !== undefined)
  @IsString()
  @MaxLength(120)
  email?: string;
}
export class MeterPatchDto {
  @ApiPropertyOptional() @ValidateIf((_, v) => v !== undefined) @IsBoolean() has?: boolean;
  @ApiPropertyOptional()
  @ValidateIf((_, v) => v !== undefined)
  @IsString()
  @MaxLength(60)
  serial?: string;
  @ApiPropertyOptional()
  @ValidateIf((_, v) => v !== undefined)
  @IsString()
  @MaxLength(30)
  reading?: string;
}
export class ConsentsPatchDto {
  @ApiPropertyOptional() @ValidateIf((_, v) => v !== undefined) @IsBoolean() personalData?: boolean;
  @ApiPropertyOptional() @ValidateIf((_, v) => v !== undefined) @IsBoolean() terms?: boolean;
}
export class SaveDraftDto {
  @ApiProperty({ minimum: 1 }) @IsInt() @Min(1) @Max(2147483647) version!: number;
  @ApiPropertyOptional({ type: ApplicantPatchDto })
  @ValidateIf((_, v) => v !== undefined)
  @IsObject()
  @ValidateNested()
  @Type(() => ApplicantPatchDto)
  applicant?: ApplicantPatchDto;
  @ApiPropertyOptional()
  @ValidateIf((_, v) => v !== undefined)
  @IsString()
  @MaxLength(12)
  rightSince?: string;
  @ApiPropertyOptional()
  @ValidateIf((_, v) => v !== undefined)
  @IsString()
  @MaxLength(20)
  personalAccount?: string;
  @ApiPropertyOptional()
  @ValidateIf((_, v) => v !== undefined)
  @IsString()
  @MaxLength(200)
  previousContract?: string;
  @ApiPropertyOptional({ type: MeterPatchDto })
  @ValidateIf((_, v) => v !== undefined)
  @IsObject()
  @ValidateNested()
  @Type(() => MeterPatchDto)
  meter?: MeterPatchDto;
  @ApiPropertyOptional({ enum: ["cabinet", "email", "sms"] })
  @ValidateIf((_, v) => v !== undefined)
  @IsIn(["cabinet", "email", "sms"])
  notifyBy?: "cabinet" | "email" | "sms";
  @ApiPropertyOptional({ type: ConsentsPatchDto })
  @ValidateIf((_, v) => v !== undefined)
  @IsObject()
  @ValidateNested()
  @Type(() => ConsentsPatchDto)
  consents?: ConsentsPatchDto;
  @ApiPropertyOptional({
    description: "Only [] at this stage; contract document upload comes separately",
  })
  @ValidateIf((_, v) => v !== undefined)
  @IsArray()
  @ArrayMaxSize(0)
  attachments?: never[];
}
