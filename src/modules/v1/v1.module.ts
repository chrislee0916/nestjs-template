import { Module } from '@nestjs/common';
import { UserModule } from './user/user.module';
import { BuildingModule } from './building/building.module';

@Module({
  imports: [UserModule, BuildingModule],
})
export class Module_v1 {}
