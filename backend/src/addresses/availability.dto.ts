import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn } from "class-validator";
export class AvailabilityQuery {
  @ApiPropertyOptional({ enum: ["ru", "kk"], default: "ru" })
  @IsIn(["ru", "kk"])
  lang: "ru" | "kk" = "ru";
}
