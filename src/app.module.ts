import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { Module_v1 } from './modules/v1/v1.module';
import { CommonModule } from './common/common.module';
import { ScheduleModule } from '@nestjs/schedule';
import { CacheModule, CacheStore } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-store';
import type { RedisClientOptions } from 'redis';


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
    ScheduleModule.forRoot(),
    CacheModule.registerAsync<RedisClientOptions>({
      isGlobal: true,
      useFactory: async (configService: ConfigService) => {
        const store = await redisStore({
          socket: {
            host: configService.get('CACHE_HOST'),
            port: configService.get('CACHE_PORT')
          },
          password: configService.get('CACHE_PASSWORD'),
        })
        return {
          store: store as unknown as CacheStore,
          ttl: 0
        }
      },
      inject: [ConfigService]
    }),
    AuthModule,
    DatabaseModule,
    CommonModule,
    Module_v1,
  ],
})
export class AppModule {}
