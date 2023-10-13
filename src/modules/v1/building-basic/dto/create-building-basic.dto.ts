import { IsNotEmpty, IsString } from "class-validator";

export class CreateBuildingBasicDto {
  @IsNotEmpty()
  readonly label: Record<string, any>
  @IsNotEmpty()
  readonly own: Record<string, any>
  @IsNotEmpty()
  readonly other: Record<string, any>
}
