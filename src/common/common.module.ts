import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { AuthGuard } from './guard/auth.guard';
import { ParseBaseQueryMiddleware } from './middleware/parse-base-query.middleware';
import { AuthModule } from 'src/modules/auth/auth.module';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { ApiLogMiddleware } from './middleware/api-log.middleware';

@Module({
    imports: [AuthModule],
    providers: [
        {
          provide: APP_GUARD,
          useClass: AuthGuard
        },
        {
          provide: APP_FILTER,
          useClass: HttpExceptionFilter
        }
    ]

})
export class CommonModule implements NestModule{
    configure(consumer: MiddlewareConsumer) {
        consumer.apply(ParseBaseQueryMiddleware).forRoutes('*')
    }
}
