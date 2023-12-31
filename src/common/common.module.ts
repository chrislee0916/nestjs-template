import { MiddlewareConsumer, Module, NestModule, RequestMethod, ValidationPipe } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { AuthGuard } from './guard/auth.guard';
import { ParseBaseQueryMiddleware } from './middleware/parse-base-query.middleware';
import { AuthModule } from 'src/modules/auth/auth.module';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { LoggingInterceptor } from './interceptor/logging.interceptor';

@Module({
    imports: [AuthModule],
    providers: [
        // {
        //   provide: APP_GUARD,
        //   useClass: AuthGuard
        // },
        {
          provide: APP_FILTER,
          useClass: HttpExceptionFilter
        },
        {
          provide: APP_PIPE,
          useValue: new ValidationPipe({
            whitelist: true,
            transform: true
          })
        },
        {
          provide: APP_INTERCEPTOR,
          useClass: LoggingInterceptor
        }
    ]

})
export class CommonModule implements NestModule{
    configure(consumer: MiddlewareConsumer) {
        consumer.apply(ParseBaseQueryMiddleware).forRoutes({ path: '*', method: RequestMethod.GET });
    }
}
