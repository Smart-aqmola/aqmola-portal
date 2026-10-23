import { Type, Transform } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsIn,
  IsInt,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from "class-validator";

export class ExpectedVersionDto {
  @ApiProperty({ minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2147483647)
  version!: number;
}
export class VerificationRequestDto extends ExpectedVersionDto {
  @ApiProperty({ enum: ["document", "state_integration"] })
  @IsIn(["document", "state_integration"])
  method!: "document" | "state_integration";
  @ApiPropertyOptional({
    type: [String],
    description: "IDs of 1–5 files already uploaded to this property",
  })
  @ValidateIf((o, value) => o.method === "document" || value !== undefined)
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(5)
  @ArrayUnique()
  @IsUUID("4", { each: true })
  documents?: string[];
}
export class VerificationDecisionDto extends ExpectedVersionDto {
  @ApiProperty({ enum: ["confirmed", "rejected"] })
  @IsIn(["confirmed", "rejected"])
  decision!: "confirmed" | "rejected";
  @ApiPropertyOptional({ description: "Required for rejection" })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @ValidateIf((o, value) => o.decision === "rejected" || value !== undefined)
  @IsString()
  @MaxLength(1000)
  note?: string;
}
