import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { urlencoded, json } from 'express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

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

  const config = new DocumentBuilder()
    .setTitle('Paints Microservice')
    .setDescription('This microservice handles paints.')
    .setVersion('1.0')
    // .addServer('/api')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(AppModule.docUrl, app, document, {
    explorer: true,
    swaggerOptions: {
      filter: true,
      showRequestDuration: true,
    },
  });

  await app.listen(AppModule.port);
}
bootstrap();
