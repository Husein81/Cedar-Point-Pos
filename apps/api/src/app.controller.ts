import { Controller, Get } from '@nestjs/common';

@Controller('test')
export class AppController {
  @Get()
  getHello(): string {
    return 'Hello World!';
  }
}
