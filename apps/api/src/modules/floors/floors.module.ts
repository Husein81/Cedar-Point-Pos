import { Module } from '@nestjs/common';
import { FloorsController } from './floors.controller.js';
import { FloorsService } from './floors.service.js';

@Module({
    controllers: [FloorsController],
    providers: [FloorsService],
})
export class FloorsModule { }
