import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, IsString, Max, Min, ValidateIf } from "class-validator";

/** Form names match account/domain/property.ts. Semantic checks run after trimming. */
export class PropertyInputDto {
  @ApiProperty() @IsString() territoryId!: string;
  @ApiProperty() @IsString() locality!: string;
  @ApiProperty() @IsString() street!: string;
  @ApiProperty() @IsString() house!: string;
  @ApiPropertyOptional() @ValidateIf((_, v) => v !== undefined) @IsString() flat?: string;
  @ApiProperty({ enum: ["apartment", "house", "non_residential", "other"] })
  @IsString()
  type!: string;
  @ApiProperty({ enum: ["owner", "representative", "tenant", "lawful_user"] })
  @IsString()
  relation!: string;
  @ApiPropertyOptional()
  @ValidateIf((_, v) => v !== undefined)
  @IsString()
  personalAccount?: string;
  @ApiProperty() @IsString() ownerInfo!: string;
  @ApiPropertyOptional({
    description: "Unverified directory reference; does not confirm an address or rights",
  })
  @ValidateIf((_, v) => v !== undefined)
  @IsString()
  addressId?: string;
}

export class UpdatePropertyDto extends PropertyInputDto {
  @ApiProperty({ minimum: 1 }) @IsInt() @Min(1) @Max(2147483647) version!: number;
}
