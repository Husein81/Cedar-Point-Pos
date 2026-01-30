import { Module } from '@nestjs/common';
import { CategoryService } from './category.service.js';
import { CategoryController } from './category.controller.js';
import { SubcategoryController } from './subcategory.controller.js';

@Module({
  controllers: [CategoryController, SubcategoryController],
  providers: [CategoryService],
  exports: [CategoryService],
})
export class CategoryModule {}
