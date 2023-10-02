import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { BuildingBasicService } from './building-basic.service';
import { CreateBuildingBasicDto } from './dto/create-building-basic.dto';
import { UpdateBuildingBasicDto } from './dto/update-building-basic.dto';

@Controller('building-basic')
export class BuildingBasicController {
  constructor(private readonly buildingBasicService: BuildingBasicService) {}

  @Post()
  create(@Body() createBuildingBasicDto: CreateBuildingBasicDto) {
    return this.buildingBasicService.create(createBuildingBasicDto);
  }

}
