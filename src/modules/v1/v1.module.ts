import { Module } from '@nestjs/common';
import { UserModule } from './user/user.module';
import { BuildingModule } from './building/building.module';
import { BuildingBasicModule } from './building-basic/building-basic.module';
import { CodeConvertModule } from './code-convert/code-convert.module';

@Module({
  imports: [UserModule, BuildingModule, BuildingBasicModule, CodeConvertModule],
})
export class Module_v1 {}
