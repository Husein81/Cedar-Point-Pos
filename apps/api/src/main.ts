import { NestFactory } from '@nestjs/core';
import 'dotenv/config';
import { AppModule } from './app.module.js';
import { ZodValidationPipe } from './common/pipes/zod.pipe.js';

async function bootstrap() {
  try {
    const app = await NestFactory.create(AppModule);
    app.useGlobalPipes(new ZodValidationPipe());
    await app.listen(process.env.PORT ?? 5000);
  } catch (error) {
    console.error(error);
  }
}

void bootstrap();
