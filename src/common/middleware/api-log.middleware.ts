import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { PickType } from '@nestjs/mapped-types';

@Injectable()
export class ApiLogMiddleware implements NestMiddleware {
  use(req: any, res: any, next: () => void) {
    console.log(
      '===================== app 中間件 apiLog ====================='
    );

    const { ip, body, query, params, originalUrl, method, headers } = req;

    const obj = {ip, method, originalUrl, headers, params, query, body };

    Logger.verbose(ip, ' ip ');
    Logger.verbose(originalUrl, ' Url ');
    Logger.verbose(method, ' method ');
    Logger.verbose(headers.authorization, ' authorization ');
    Logger.verbose(params, ' params ');
    Logger.verbose(query, ' query ');
    Logger.verbose(body, ' body ');
    console.log('==========================================');

    next();
  }
}
