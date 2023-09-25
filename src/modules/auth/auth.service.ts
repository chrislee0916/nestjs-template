import { HttpException, HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { CreateAuthDto } from './dto/create-auth.dto';
import { UpdateAuthDto } from './dto/update-auth.dto';
import { DatabaseService } from 'src/database/database.service';
import { InjectModel } from '@nestjs/mongoose';
import { Auth } from './entities/auth.entity';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../v1/user/user.service';

@Injectable()
export class AuthService extends DatabaseService {
  constructor(
    @InjectModel(Auth.name) private DB: Model<Auth>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly userService: UserService,
  ){
    super(DB)
  }

  private async verify(token: string): Promise<any> {
    try {
      return this.jwtService.verifyAsync(token, {
        secret: this.configService.get('JWT_SECRET'),
      });
    } catch {
      throw new UnauthorizedException()
    }
  }

  async validate(token: string) {
    const decoded: any = await this.verify(token);

    if (!decoded || !decoded.payload)
      throw new HttpException(
        this.configService.get('ERR_AUTH_VALIDATE_BAD_ACCESS_TOKEN'),
        HttpStatus.BAD_REQUEST,
      );

      const authId: string = decoded.payload.authId;
      const Auth = await this.ensureExist(authId);
      console.log('Auth ', Auth);

      const User = await this.userService.ensureExist(Auth.user);
      console.log('User ', User);

      return { authId: Auth._id.toString(), user: User }
  }
}
