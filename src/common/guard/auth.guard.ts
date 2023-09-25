import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { AuthService } from 'src/modules/auth/auth.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
    private readonly authService: AuthService
  ){}
  async canActivate(
    context: ExecutionContext,
  ):   Promise<boolean> | never {
    const isPublic = this.reflector.get(IS_PUBLIC_KEY, context.getHandler())
    if(isPublic) {
      return true
    }

    const contextType: string = context.getType();
    const req =
      contextType == 'ws'
        ? context.switchToWs().getClient().handshake
        : context.switchToHttp().getRequest;

    const headers = req.headers;

    const authorization: string = headers?.authorization;
    if(!authorization) {
      throw new UnauthorizedException();
    }

    const bearer: string[] = authorization.split(' ');
    if(!!authorization.indexOf('Bearer ') || !bearer || bearer.length<2) {
      throw new UnauthorizedException()
    }

    const token: string = bearer[1];
    const TokenValidate = await this.authService.validate(token);
    console.debug('TokenValidate', TokenValidate);

    return true;
  }
}
