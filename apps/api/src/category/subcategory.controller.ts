import { Body, Controller, Delete, Param, Put, Req } from '@nestjs/common';
import { Prisma, User, UserRole } from '@repo/db';
import type { Request } from 'express';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CategoryService } from './category.service.js';

@Controller('subcategories')
export class SubcategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Put(':id')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  updateSubcategory(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() data: Prisma.SubcategoryUpdateInput,
  ) {
    const user = req.user as { tenantId: string };
    return this.categoryService.updateSubcategory(user.tenantId, id, data);
  }

  @Delete(':id')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  deleteSubcategory(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as User;
    if (!user.tenantId) {
      throw new Error('Tenant ID is required');
    }
    return this.categoryService.deleteSubcategory(user.tenantId, id);
  }
}
