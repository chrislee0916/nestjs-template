import { IsNotEmpty, IsString } from "class-validator";

export class CreateBuildingBasicDto {
  @IsString()
  @IsNotEmpty()
  readonly name: string;
}
