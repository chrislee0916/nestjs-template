import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateAuthDto } from './dto/create-auth.dto';
import { UpdateAuthDto } from './dto/update-auth.dto';
import { DefaultResponsesDto } from 'src/common/dto/default.dto';
import { UserService } from '../v1/user/user.service';
import { AuthLoginDto, AuthLoginResponsesDto } from './dto/login-auth.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService
    ) {}

  @Post('register')
  async register(@Body() body: CreateAuthDto): Promise<DefaultResponsesDto> {
    const { email, password } = body;
    const Auth = await this.authService.register({ email, password });

    const User = await this.userService.create({ username: email });
    console.log('User ', User);
    Auth.set('user', User._id);
    await Auth.save();

    return { success: true }
  }

  @Post('login')
  async login(@Body() body: AuthLoginDto): Promise<AuthLoginResponsesDto>{
    console.log('dddddd: ', body)
    const Login = await this.authService.login(body)
    return { access_token: Login.token, expiredAt: Login.expiredAt }
  }

}
