import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import 'dotenv/config';
import { AppModule } from './app.module.js';
import { ZodValidationPipe } from './modules/common/pipes/zod.pipe.js';

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
    app.useGlobalPipes(new ZodValidationPipe(), new ValidationPipe());

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
