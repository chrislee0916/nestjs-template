import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";

export class CreateBuildingDto {
  @ApiProperty({
    required: true,
    description: '縣市代碼',
    example: 'A'
  })
  @IsString()
  @IsNotEmpty()
  readonly code: string;

  @ApiProperty({
    required: true,
    description: '縣市',
    example: '台北市'
  })
  @IsString()
  @IsNotEmpty()
  readonly city: string;

  @ApiProperty({
    required: true,
    description: '鄉(鎮市區)',
    example: '中正區'
  })
  @IsString()
  @IsNotEmpty()
  readonly area: string;

  @ApiProperty({
    required: false,
    description: '街、路',
    example: '北平東路'
  })
  @IsString()
  @IsOptional()
  readonly street?: string;

  @ApiProperty({
    required: false,
    description: '段',
    example: 1
  })
  @IsNumber()
  @IsOptional()
  readonly section?: number;

  @ApiProperty({
    required: false,
    description: '巷',
    example: 1
  })
  @IsNumber()
  @IsOptional()
  readonly lane?: number;

  @ApiProperty({
    required: false,
    description: '之巷',
    example: 2
  })
  @IsNumber()
  @IsOptional()
  readonly lane1?: number;

  @ApiProperty({
    required: false,
    description: '弄',
    example: 1
  })
  @IsNumber()
  @IsOptional()
  readonly alley?: number;

  @ApiProperty({
    required: false,
    description: '之弄',
    example: 2
  })
  @IsNumber()
  @IsOptional()
  readonly alley1?: number;

  @ApiProperty({
    required: false,
    description: '衖',
    example: 3
  })
  @IsNumber()
  @IsOptional()
  readonly small_alley?: number;

  @ApiProperty({
    required: false,
    description: '地域前綴',
    example: '後庄'
  })
  @IsString()
  @IsOptional()
  readonly district?: string;

  @ApiProperty({
    required: false,
    description: '號',
    example: 1
  })
  @IsNumber()
  @IsOptional()
  readonly number?: number;

  @ApiProperty({
    required: false,
    description: '之號',
    example: 2
  })
  @IsNumber()
  @IsOptional()
  readonly number1?: number;

  @ApiProperty({
    required: false,
    description: '之號',
    example: 3
  })
  @IsNumber()
  @IsOptional()
  readonly number2?: number;

  @ApiProperty({
    required: false,
    description: '樓',
    example: 10
  })
  @IsNumber()
  @IsOptional()
  readonly floor?: number;

  @ApiProperty({
    required: false,
    description: '之',
    example: 1
  })
  @IsNumber()
  @IsOptional()
  readonly ext?: number;
}
