import { NestFactory } from '@nestjs/core';
import 'dotenv/config';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module.js';
import { ZodValidationPipe } from './common/pipes/zod.pipe.js';

async function bootstrap() {
  try {
    const app = await NestFactory.create(AppModule);
    app.use(cookieParser());
    app.enableCors({
      origin: [
        'http://localhost:3000', // Admin dashboard
        'http://localhost:5173', // POS web
        'http://localhost:19006', // Expo / RN web
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
    app.useGlobalPipes(new ZodValidationPipe());
    await app.listen(process.env.PORT ?? 5000);
  } catch (error) {
    console.error(error);
  }
}

void bootstrap();
