import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { json } from 'express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as compression from 'compression';


async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });

  app.use(json({ limit: '5mb' }));
  app.use(compression({
    filter: () => { return true },
    threshold: 0
  }))

  const configService = app.get(ConfigService);
  Logger.log(configService.get('SERVER_NAME'), ' 啟動服務 ');
  Logger.log(configService.get('VERSION'), '   版本   ');
  Logger.log(configService.get('SERVER_PORT'), '   port   ');

  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1'
  });

  const config = new DocumentBuilder()
    .setTitle('不動產說明說 API')
    .setDescription('API 僅供參考')
    .setVersion('1.0')
    .addBearerAuth()
    .addServer(`http://localhost:${configService.get('SERVER_PORT')}/api`)
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('apidoc', app, document);

  await app.listen(configService.get('SERVER_PORT'));

  console.log('process.env.NODE_ENV : ', process.env);
  console.log('configService : ', configService);

  console.log(`Application is running on: ${await app.getUrl()}`);

}
bootstrap();
