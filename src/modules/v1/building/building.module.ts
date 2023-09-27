import { Module } from '@nestjs/common';
import { BuildingService } from './building.service';
import { BuildingController } from './building.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Building, BuildingSchema } from './entities/building.entity';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Building.name, schema: BuildingSchema }
    ]),
    HttpModule,
    ConfigModule
  ],
  controllers: [BuildingController],
  providers: [BuildingService],
})
export class BuildingModule {}
