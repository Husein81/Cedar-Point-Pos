import { Module } from '@nestjs/common';
import { ModifierGroupsController } from './modifier-groups.controller.js';
import { ModifierGroupsService } from './modifier-groups.service.js';
import { ModifiersController } from './modifiers.controller.js';
import { ModifiersService } from './modifiers.service.js';

@Module({
  controllers: [ModifierGroupsController, ModifiersController],
  providers: [ModifierGroupsService, ModifiersService],
  exports: [ModifierGroupsService, ModifiersService],
})
export class ModifierGroupsModule {}
