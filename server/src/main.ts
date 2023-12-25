import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as dotenv from 'dotenv';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { setAppDB } from './setAppDB';

async function bootstrap() {
  dotenv.config();
  const logger = new Logger('boostrap');

  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  setAppDB(app);

  const port = process.env.PORT;
  await app.listen(port);
  logger.log('App listening on port ' + port);
}

bootstrap();
