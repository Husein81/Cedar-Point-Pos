import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Req,
} from '@nestjs/common';
import { User, UserRole } from '@repo/types';
import type { Request } from 'express';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CategoryService } from './category.service.js';
import { Prisma } from '../../generated/prisma/client.js';
@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Get()
  getCategories(@Req() req: Request) {
    const user = req.user as User;
    if (!user.tenantId) {
      throw new Error('Tenant ID is required');
    }
    return this.categoryService.getCategories(user.tenantId);
  }

  @Get(':id')
  getCategory(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as User;
    if (!user.tenantId) {
      throw new Error('Tenant ID is required');
    }
    return this.categoryService.getCategory(user.tenantId, id);
  }

  @Post()
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  createCategory(
    @Req() req: Request,
    @Body() data: Prisma.CategoryCreateWithoutTenantInput,
  ) {
    const user = req.user as User;
    if (!user.tenantId) {
      throw new Error('Tenant ID is required');
    }
    return this.categoryService.createCategory(user.tenantId, data);
  }

  @Put(':id')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  updateCategory(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() data: Prisma.CategoryUpdateInput,
  ) {
    const user = req.user as User;
    if (!user.tenantId) {
      throw new Error('Tenant ID is required');
    }
    return this.categoryService.updateCategory(user.tenantId, id, data);
  }

  @Delete(':id')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  deleteCategory(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as User;
    if (!user.tenantId) {
      throw new Error('Tenant ID is required');
    }
    return this.categoryService.deleteCategory(user.tenantId, id);
  }

  @Post(':id/subcategories')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  createSubcategory(
    @Req() req: Request,
    @Param('id') categoryId: string,
    @Body() data: Prisma.SubcategoryCreateWithoutCategoryInput,
  ) {
    const user = req.user as User;
    if (!user.tenantId) {
      throw new Error('Tenant ID is required');
    }
    return this.categoryService.createSubcategory(
      user.tenantId,
      categoryId,
      data,
    );
  }
}
