import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsString } from "class-validator";

export class CreateAuthDto {
  @ApiProperty({
    required: true,
    description: '帳號',
    example: 'username@gmail.com'
  })
  @IsEmail(undefined, { message: '檢查字符串是否是電子郵件' })
  @IsString()
  readonly email: string;

  @ApiProperty({
    required: true,
    description: '密碼',
    example: '12345678'
  })
  @IsString()
  readonly password: string;
}
