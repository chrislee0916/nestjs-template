import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateBuildingDto } from './create-building.dto';
import { IsArray, IsObject } from 'class-validator';

export class LandRNosBuildingDto {
  @ApiProperty({
    required: true,
    description: '土地登記次序',
    example: { '03160000': ['0031', '0032'] }
  })
  landRNos: Record<string, string[]>
}
