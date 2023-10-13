import { Module } from '@nestjs/common';
import { BuildingBasicService } from './building-basic.service';
import { BuildingBasicController } from './building-basic.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { BuildingBasic, BuildingBasicSchema } from './entities/building-basic.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BuildingBasic.name, schema: BuildingBasicSchema}
    ])
  ],
  // controllers: [BuildingBasicController],
  providers: [BuildingBasicService],
})
export class BuildingBasicModule {}
