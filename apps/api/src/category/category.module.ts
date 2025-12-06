import { Module } from '@nestjs/common';
import { CategoryService } from './category.service';
import { CategoryController } from './category.controller';
import { SubcategoryController } from './subcategory.controller';

@Module({
  controllers: [CategoryController, SubcategoryController],
  providers: [CategoryService],
  exports: [CategoryService],
})
export class CategoryModule {}
