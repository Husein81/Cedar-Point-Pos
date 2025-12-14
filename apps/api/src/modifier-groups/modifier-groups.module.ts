import { Module } from '@nestjs/common';
import { ModifierGroupsController } from './modifier-groups.controller';
import { ModifierGroupsService } from './modifier-groups.service';
import { ModifiersController } from './modifiers.controller';
import { ModifiersService } from './modifiers.service';

@Module({
  controllers: [ModifierGroupsController, ModifiersController],
  providers: [ModifierGroupsService, ModifiersService],
  exports: [ModifierGroupsService, ModifiersService],
})
export class ModifierGroupsModule {}
