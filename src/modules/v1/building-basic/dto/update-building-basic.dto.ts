import { PartialType } from '@nestjs/swagger';
import { CreateBuildingBasicDto } from './create-building-basic.dto';

export class UpdateBuildingBasicDto extends PartialType(CreateBuildingBasicDto) {}
