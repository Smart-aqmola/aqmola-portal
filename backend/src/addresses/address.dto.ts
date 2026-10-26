import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";

export class AddressSearchQuery {
  @ApiPropertyOptional({ description: "Every word must match; empty query returns []" })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;
  @ApiPropertyOptional({ enum: ["ru", "kk"], default: "ru" })
  @IsIn(["ru", "kk"])
  lang: "ru" | "kk" = "ru";
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) territoryId?: string;
}
