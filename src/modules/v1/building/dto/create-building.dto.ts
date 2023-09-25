import { IsNumber, IsOptional, IsString } from "class-validator";

export class CreateBuildingDto {
  @IsString()
  readonly city: string;
  @IsString()
  readonly area: string;
  @IsString()
  @IsOptional()
  street?: string;
  @IsNumber()
  @IsOptional()
  section?: number;
  @IsNumber()
  @IsOptional()
  lane?: number;
  @IsNumber()
  @IsOptional()
  lane1?: number;
  @IsNumber()
  @IsOptional()
  alley?: number;
  @IsNumber()
  @IsOptional()
  alley1?: number;
  small_alley?: number;
  @IsString()
  @IsOptional()
  district?: string;
  @IsNumber()
  @IsOptional()
  number?: number;
  @IsNumber()
  @IsOptional()
  number1?: number;
  @IsNumber()
  @IsOptional()
  number2?: number;
  @IsNumber()
  @IsOptional()
  floor?: number;
  @IsNumber()
  @IsOptional()
  ext?: number;
}
