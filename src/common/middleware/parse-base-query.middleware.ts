import { Injectable, NestMiddleware } from '@nestjs/common';

@Injectable()
export class ParseBaseQueryMiddleware implements NestMiddleware {
  use(req: any, res: any, next: () => void) {
    if(req.method === 'GET') {
      const limit = parseInt(req.query.limit, 10);
      const skip = parseInt(req.query.skip, 10);
      req.query.limit = Number.isNaN(limit) ?  25 : Math.max(0, limit);
      req.query.skip = Number.isNaN(skip) ? 0 : Math.max(0, skip);
      req.query.sort = req.query.sort ? req.query.sort : '-createdAt';
    }
    next();
  }
}
