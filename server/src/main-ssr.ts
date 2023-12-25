declare const Express: any;

import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppSSRModule } from './app-ssr.module';
import { Logger } from '@nestjs/common';
import { setAppDB } from './setAppDB';

async function bootstrap() {
  const logger = new Logger('boostrap');

  const app = await NestFactory.create<NestExpressApplication>(AppSSRModule);

  console.log(JSON.stringify(process.env));
  setAppDB(app);
  await app.listen(process.env.PORT ?? 4000);
  logger.log('App listening on port ' + process.env.PORT);
}

bootstrap().catch((err) => console.error(err));
