import { ApiProperty } from "@nestjs/swagger";
import { DefaultDataDto } from "src/common/dto/default.dto";

export class ShowBuildingBasicDto extends DefaultDataDto {
  @ApiProperty({
    required: true,
    description: '標記部',
    example: { landLabel: {}, buildingLabel: {} }
  })
  label: Record<string, any>

  @ApiProperty({
    required: true,
    description: '所有權部',
    example: { landOwns: [], buildingOwns: [] }
  })
  own: Record<string, any>

  @ApiProperty({
    required: true,
    description: '其他項權利部',
    example: { landOthers: [], buildingOthers: [] }
  })
  other: Record<string, any>
}