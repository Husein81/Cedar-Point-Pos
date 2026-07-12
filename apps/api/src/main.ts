import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import 'dotenv/config';
import { AppModule } from './app.module.js';

async function bootstrap() {
  try {
    const app = await NestFactory.create(AppModule);
    app.use(cookieParser());
    app.enableCors({
      origin: [
        'http://localhost:3000', // Admin dashboard
        'http://localhost:5173', // POS web
        'http://localhost:19006', // Expo / RN web
        'http://192.168.0.102:8081', // Mobile web
      ],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Device-Token',
        'X-Device-Id',
      ],
    });
    // `whitelist` strips properties without a validation decorator so DTOs
    // can't be used to mass-assign unexpected fields. `transform` instantiates
    // the DTO class and runs class-transformer (`@Type`, `@Transform`) so query
    // params are coerced (string → number/Date/boolean) before validation.
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );

    const config = new DocumentBuilder()
      .setTitle('Cedar Point API')
      .setDescription('The Cedar Point POS API documentation')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);

    await app.listen(process.env.PORT ?? 5000, '0.0.0.0');
  } catch (error) {
    console.error(error);
  }
}

void bootstrap();
