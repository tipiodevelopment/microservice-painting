import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { urlencoded, json } from 'express';

async function bootstrap() {
  const app: any = await NestFactory.create(AppModule);
  // const redisIoAdapter = new RedisIoAdapter(app);
  // redisIoAdapter.appHost = AppModule.appHost;
  // await redisIoAdapter.connectToRedis(AppModule.redisUrl);
  // app.useWebSocketAdapter(redisIoAdapter);
  app.setGlobalPrefix(AppModule.basePath);
  app.useGlobalPipes(new ValidationPipe());

  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));
  app.enableCors();
  await app.listen(AppModule.port);
}
bootstrap();
