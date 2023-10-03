import { IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";

export class CreateBuildingDto {
  @IsString()
  @IsNotEmpty()
  readonly code: string;
  @IsString()
  @IsNotEmpty()
  readonly city: string;
  @IsString()
  @IsNotEmpty()
  readonly area: string;
  @IsString()
  @IsOptional()
  readonly street?: string;
  @IsNumber()
  @IsOptional()
  readonly section?: number;
  @IsNumber()
  @IsOptional()
  readonly lane?: number;
  @IsNumber()
  @IsOptional()
  readonly lane1?: number;
  @IsNumber()
  @IsOptional()
  readonly alley?: number;
  @IsNumber()
  @IsOptional()
  readonly alley1?: number;
  @IsNumber()
  @IsOptional()
  readonly small_alley?: number;
  @IsString()
  @IsOptional()
  readonly district?: string;
  @IsNumber()
  @IsOptional()
  readonly number?: number;
  @IsNumber()
  @IsOptional()
  readonly number1?: number;
  @IsNumber()
  @IsOptional()
  readonly number2?: number;
  @IsNumber()
  @IsOptional()
  readonly floor?: number;
  @IsNumber()
  @IsOptional()
  readonly ext?: number;
}
