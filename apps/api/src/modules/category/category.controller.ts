import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Put,
} from '@nestjs/common';
import { UserRole } from '@repo/types';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator.js';
import { CategoryService } from './category.service.js';
import { Prisma } from '../../generated/prisma/client.js';
import type {
  CreateCategoryDto,
  UpdateCategoryDto,
} from './dto/category.dto.js';
@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Get()
  getCategories(
    @CurrentTenant() tenantId: string,
    @Query('search') search?: string,
  ) {
    return this.categoryService.getCategories(tenantId, search);
  }

  @Get(':id')
  getCategory(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.categoryService.getCategory(tenantId, id);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  createCategory(
    @CurrentTenant() tenantId: string,
    @Body() data: CreateCategoryDto,
  ) {
    return this.categoryService.createCategory({
      ...data,
      tenantId,
    });
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  updateCategory(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() data: UpdateCategoryDto,
  ) {
    return this.categoryService.updateCategory({
      ...data,
      id,
      tenantId,
    });
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  deleteCategory(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.categoryService.deleteCategory(tenantId, id);
  }

  @Post(':id/subcategories')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  createSubcategory(
    @CurrentTenant() tenantId: string,
    @Param('id') categoryId: string,
    @Body() data: Prisma.SubcategoryCreateWithoutCategoryInput,
  ) {
    return this.categoryService.createSubcategory(tenantId, categoryId, data);
  }
}
