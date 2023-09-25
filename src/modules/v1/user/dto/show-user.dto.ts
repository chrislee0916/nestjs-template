import { ApiProperty } from '@nestjs/swagger';
import { DefaultDataDto } from 'src/common/dto/default.dto';

export class UserShowResponsesDto extends DefaultDataDto {
  username: string;
}
