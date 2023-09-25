import { ApiProperty } from '@nestjs/swagger';
import { DefaultListQueryDto } from 'src/common/dto/default.dto';


export class UserListDto extends DefaultListQueryDto {
  username: string;
}
