import { Controller, Get, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { AddressSearchQuery } from "./address.dto";
import { AddressService } from "./address.service";

@ApiTags("Addresses")
@Controller("addresses")
export class AddressController {
  constructor(private readonly addresses: AddressService) {}
  @Get("search")
  @ApiOperation({
    summary:
      "Search fictional street directory (ru/kk), at most 8 results; houses are entered separately",
  })
  search(@Query() query: AddressSearchQuery) {
    return this.addresses.search(query);
  }
}
