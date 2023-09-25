import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ApiLogMiddleware } from './common/middleware/api-log.middleware';
import { ParseBaseQueryMiddleware } from './common/middleware/parse-base-query.middleware';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/v1/user/user.module';
import { DatabaseModule } from './database/database.module';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from './common/guard/auth.guard';
import { BuildingModule } from './modules/v1/building/building.module';
import { Module_v1 } from './modules/v1/v1.module';
import { CommonModule } from './common/common.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath:
        process.env.NODE_ENV === 'prod'
          ? ['.env.production.local', '.env.production', '.env']
          : process.env.NODE_ENV === 'dev'
          ? ['.env.development.local', '.env.development', '.env']
          : process.env.NODE_ENV === 'test'
          ? ['.env.test.local', '.env.test', '.env']
          : '.env',
    }),
    AuthModule,
    DatabaseModule,
    CommonModule,
    Module_v1,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AuthGuard
    }
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(ParseBaseQueryMiddleware).forRoutes('*')
  }
}
