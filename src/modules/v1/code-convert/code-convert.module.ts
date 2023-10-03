import { Module } from '@nestjs/common';
import { CodeConvertService } from './code-convert.service';
import { CodeConvertController } from './code-convert.controller';
import { HttpModule } from '@nestjs/axios';
import { MongooseModule } from '@nestjs/mongoose';
import { CodeConvert, CodeConvertSchema } from './entities/code-convert.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CodeConvert.name, schema: CodeConvertSchema }
    ]),
    HttpModule
  ],
  controllers: [CodeConvertController],
  providers: [CodeConvertService],
})
export class CodeConvertModule {}
