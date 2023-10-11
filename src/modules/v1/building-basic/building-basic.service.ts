import { Injectable } from '@nestjs/common';
import { CreateBuildingBasicDto } from './dto/create-building-basic.dto';
import { UpdateBuildingBasicDto } from './dto/update-building-basic.dto';
import { InjectModel } from '@nestjs/mongoose';
import { BuildingBasic, BuildingBasicDocument } from './entities/building-basic.entity';
import { Model } from 'mongoose';

@Injectable()
export class BuildingBasicService {
  constructor(
    @InjectModel(BuildingBasic.name) private readonly buildingBasicModel: Model<BuildingBasicDocument>
  ){}

  create(createBuildingBasicDto: CreateBuildingBasicDto) {
    return createBuildingBasicDto
    return this.buildingBasicModel.create(createBuildingBasicDto)
  }
}
