import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Observable, map } from 'rxjs';
import * as dayjs from 'dayjs';


@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const { body, query, params, method, url, headers } = context.switchToHttp().getRequest();
    const controller = context.getClass().name;
    const handler = context.getHandler().name;

    Logger.log(' ---------------- HTTP Request ---------------- ');
    Logger.log(`${controller}`, ' controller ');
    Logger.log(`${handler}`, '   handler  ');
    Logger.log(`${method}`, '   method   ');
    Logger.log(`${url}`, '    url     ');
    Logger.log(`${JSON.stringify(headers)}`, ' headers ');

    if (headers.authorization && Object.keys(headers.authorization).length)
      Logger.log(`${headers.authorization}`, ' headers Authorization ');

    if (Object.keys(params).length) Logger.log(params, ' params ');
    if (Object.keys(query).length) Logger.log(query, ' query ');
    if (Object.keys(body).length) Logger.log(body, ' body ');

    const now = dayjs()
    return next.handle().pipe(
      map( async (data) => {
        try {
          Logger.log(' ---------------- HTTP Response ---------------- ');
          Logger.log(data, ' Response Data ');
          const timeDiff = dayjs().diff(now);
          Logger.log(`${timeDiff} 毫秒(ms)`, ' 處理時間 ');
          Logger.log(' ---------------- HTTP End ---------------- ');
          const time = dayjs();
          return {
            success: true,
            data: data,
            runTimes: timeDiff,
            time: time.format('YYYY-MM-DD HH:mm:ss'),
            timestamp: time.valueOf(),
          };
        } catch (error) {
          Logger.log('====================================');
          console.log('回傳錯誤 :::::::::', error);
          Logger.log('====================================');
        }
      })
    );
  }
}
