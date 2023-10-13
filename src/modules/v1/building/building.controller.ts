import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { BuildingService } from './building.service';
import { CreateBuildingDto } from './dto/create-building.dto';
import { ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ShowBuildingDto, ShowDetailBuildingDto } from './dto/show-building.dto';

@ApiTags('building (建物檔案)')
@Controller('building')
export class BuildingController {
  constructor(private readonly buildingService: BuildingService) {}

  @Post()
  @ApiOperation({
    summary: '建立建號檔案',
    description: '使用地址查詢所需要的建號'
  })
  @ApiCreatedResponse({
    type: [ShowBuildingDto]
  })
  create(@Body() createBuildingDto: CreateBuildingDto) {
    return this.buildingService.create(createBuildingDto);
  }

  @Get(':id')
  @ApiOperation({
    summary: '建立建號相關',
    description: '依照建號建立相關資料，例如：基本資訊、地圖等等'
  })
  @ApiCreatedResponse({
    type: ShowDetailBuildingDto
  })
  async findOne(@Param('id') id: string) {
    return this.buildingService.findOne(id);
  }

}
