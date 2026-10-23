import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ValidateIf,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Role } from "../../generated/prisma/client";

export class RegistryQuery {
  @ApiPropertyOptional({ default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100000)
  page: number = 1;
  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize: number = 20;
}
export class UserAccessDto {
  @ApiProperty({ minimum: 1 }) @IsInt() @Min(1) @Max(2147483647) version!: number;
  @ApiPropertyOptional({ enum: Role, isArray: true })
  @ValidateIf((_object, value) => value !== undefined)
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @ArrayMaxSize(12)
  @IsEnum(Role, { each: true })
  roles?: Role[];
  @ApiPropertyOptional({ enum: ["active", "blocked"] })
  @ValidateIf((_object, value) => value !== undefined)
  @IsIn(["active", "blocked"])
  status?: "active" | "blocked";
  @ApiPropertyOptional({
    nullable: true,
    description: "Required for staff roles; null for a resident or system administrator",
  })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9-]{1,60}$/)
  organizationId?: string | null;
}
export class OrganizationAccessDto {
  @ApiProperty({ minimum: 1 }) @IsInt() @Min(1) @Max(2147483647) version!: number;
  @ApiProperty() @IsBoolean() blocked!: boolean;
}
