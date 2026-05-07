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
import {
  CreateCategoryDto,
  UpdateCategoryDto,
} from './dto/category.dto.js';

@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Get()
  getCategories(@Req() req: Request) {
    const user = req.user as User;
    if (!user.tenantId) {
      throw new Error('Tenant ID is required');
    }
    return this.categoryService.getCategories(
      user.tenantId,
      req.query.search as string,
    );
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
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  createCategory(@Req() req: Request, @Body() data: CreateCategoryDto) {
    console.log('Cat', data);
    const user = req.user as User;
    if (!user.tenantId) {
      throw new Error('Tenant ID is required');
    }

    return this.categoryService.createCategory({
      ...data,
      tenantId: user.tenantId,
    });
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  updateCategory(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() data: UpdateCategoryDto,
  ) {
    const user = req.user as User;
    if (!user.tenantId) {
      throw new Error('Tenant ID is required');
    }
    return this.categoryService.updateCategory({
      ...data,
      id,
      tenantId: user.tenantId,
    });
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  deleteCategory(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as User;
    if (!user.tenantId) {
      throw new Error('Tenant ID is required');
    }
    return this.categoryService.deleteCategory(user.tenantId, id);
  }

  @Post(':id/subcategories')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
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
