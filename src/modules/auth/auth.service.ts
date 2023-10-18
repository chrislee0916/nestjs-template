import { HttpException, HttpStatus, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { CreateAuthDto } from './dto/create-auth.dto';
import { UpdateAuthDto } from './dto/update-auth.dto';
import { DatabaseService } from 'src/database/database.service';
import { InjectModel } from '@nestjs/mongoose';
import { Auth, AuthDocument } from './entities/auth.entity';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../v1/user/user.service';
import * as bcrypt from 'bcrypt'
import * as dayjs from 'dayjs';

export class AuthServiceLoginResponses {
  token: string;
  expiredAt: number;
}

@Injectable()
export class AuthService extends DatabaseService {
  constructor(
    @InjectModel(Auth.name) private DB: Model<AuthDocument>,
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

  async register({ email, password }: { email: string, password: string }): Promise<AuthDocument> {
    console.log('================ auth register ====================');
    console.log('email ', email);

    const authFindOne = await this.DB.findOne({ email }).where('deletedAt').equals(null);
    if(authFindOne != null) {
      throw new HttpException(
        this.configService.get('ERR_AUTH_REGISTER_USER_EXIST'),
        HttpStatus.BAD_REQUEST
      )
    }

    const authObj = {
      email,
      password: this.encodePassword(password)
    }

    const Auth = await this.DB.create(authObj);
    console.log('Auht', Auth)
    console.log('====================================');
    return Auth
  }

  async login({ email, password }: { email: string, password: string }): Promise<AuthServiceLoginResponses> {
    console.log('================ auth login ====================');
    const Auth = await this.DB.findOne({ email, deletedAt: null });

    if(!Auth){
      throw new HttpException(
        this.configService.get('ERR_AUTH_LOGIN_NOT_REGISTER_USER'),
        HttpStatus.BAD_REQUEST
      )
    }

    const isPasswordValid = this.isPasswordValid(password, Auth.password);

    if(!isPasswordValid) {
      throw new HttpException(
        this.configService.get('ERR_AUTH_LOGIN_PASSWORD_NOT'),
        HttpStatus.BAD_REQUEST
      )
    }

    return await this.generateToken(Auth._id);

  }

  encodePassword(password: string): string {
    return bcrypt.hashSync(password, 10)
  }

  isPasswordValid(password: string, hashedPassword: string): boolean {
    return bcrypt.compareSync(password, hashedPassword)
  }

  async generateToken(authId: string, expiredAt?: number): Promise<any> {
    const exp = expiredAt ? expiredAt : dayjs().add(10, 'd').unix();
    Logger.log(authId, ' authId ');
    Logger.log(exp, ' 過期時間 ');

    const Token = await this.jwtService.signAsync({
      exp,
      payload: { authId }
    });
    return { expiredAt: exp, token: Token }

  }

}
