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

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Building.name, schema: BuildingSchema },
      { name: BuildingBasic.name, schema: BuildingBasicSchema }
    ]),
    // CacheModule.register(),
    HttpModule,
    ConfigModule
  ],
  controllers: [BuildingController],
  providers: [BuildingService, BuildingBasicService],
})
export class BuildingModule {}
