import { IsNotEmpty, IsString } from "class-validator";

export class CreateBuildingBasicDto {
  @IsNotEmpty()
  readonly label: Record<string, any>
}
