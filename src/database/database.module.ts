import { Global, Logger, Module } from '@nestjs/common';
import mongoose from 'mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

@Global()
@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const db_url = `${configService.get(
          'DATABASE_HOST',
        )}:${configService.get('DATABASE_PORT')}/${configService.get(
          'DATABASE_NAME',
        )}`;

        Logger.log(db_url, ' DB連線網址 ');

        const obj = {
          uri: `mongodb://${db_url}`,
          user: '',
          pass: '',
        };

        if (!!configService.get('DATABASE_USER_NAME')) {
          obj.user = configService.get('DATABASE_USER_NAME');
        }
        if (!!configService.get('DATABASE_USER_PASSWORD')) {
          obj.pass = configService.get('DATABASE_USER_PASSWORD');
        }

        // Logger.log(obj, ' DB 設定檔  ');

        mongoose.set('debug', true);

        return {
          ...obj,
        };
      },
      inject: [ConfigService],
    }),
  ],
})
export class DatabaseModule {}
