import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserListDto } from './dto/query-user.dto';
import { UserListResponsesDto } from './dto/list-user.dto';
import { UserShowResponsesDto } from './dto/show-user.dto';


@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  async list(@Query() query: UserListDto): Promise<UserListResponsesDto> {
    const items = await this.userService.list(query);
    const total = await this.userService.count(query);

    const doc = {
      limit: query.limit,
      skip: query.skip,
      sort: query.sort,
      total,
      items,
    };
    return doc;
  }

  @Get(':userId')
  async show(@Param('userId') userId: string): Promise<UserShowResponsesDto> {
    return await this.userService.ensureExist(userId);
  }
}
