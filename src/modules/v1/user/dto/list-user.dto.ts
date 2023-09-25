

// class User_List_items extends Default_data_Dto {
//   @ApiProperty({
//     description: '使用者名稱',
//     example: 'jos',
//   })
//   username: string;
// }

import { DefaultListResponsesDto } from "src/common/dto/default.dto";
import { UserShowResponsesDto } from "./show-user.dto";

export class UserListResponsesDto extends DefaultListResponsesDto {
  items: UserShowResponsesDto[];
}
