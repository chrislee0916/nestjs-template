import { DefaultListResponsesDto } from "src/common/dto/default.dto";
import { ShowBuildingDto } from "./show-building.dto";
import { ApiProperty } from "@nestjs/swagger";

export class ListBuildingDto {
  @ApiProperty({
    description: '資料',
    type: [ShowBuildingDto],
  })
  items: ShowBuildingDto[]
}