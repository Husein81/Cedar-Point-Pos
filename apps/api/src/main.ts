import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap(): Promise<void> {
  try {
    const app = await NestFactory.create(AppModule);
    await app.listen(process.env.PORT ?? 3000);
  } catch (error) {
    console.error(error);
  }
}

await bootstrap();
