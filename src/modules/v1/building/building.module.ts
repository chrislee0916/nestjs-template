import { Module } from '@nestjs/common';
import { BuildingService } from './building.service';
import { BuildingController } from './building.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Building, BuildingSchema } from './entities/building.entity';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { BuildingBasicModule } from '../building-basic/building-basic.module';
import { BuildingBasicService } from '../building-basic/building-basic.service';
import { BuildingBasic, BuildingBasicSchema } from '../building-basic/entities/building-basic.entity';
import { CACHE_MANAGER, CacheModule } from '@nestjs/cache-manager';
import { CodeConvertModule } from '../code-convert/code-convert.module';
import buildingConfig from './config/building.config';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Building.name, schema: BuildingSchema },
      { name: BuildingBasic.name, schema: BuildingBasicSchema }
    ]),
    CodeConvertModule,
    HttpModule,
    ConfigModule.forFeature(buildingConfig)
  ],
  controllers: [BuildingController],
  providers: [BuildingService, BuildingBasicService],
})
export class BuildingModule {}
