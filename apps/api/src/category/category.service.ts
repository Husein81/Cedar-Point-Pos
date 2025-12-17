import { Injectable, NotFoundException } from '@nestjs/common';

import { QueryParams } from '@repo/types';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma.service.js';

@Injectable()
export class CategoryService {
  constructor(private prisma: PrismaService) {}
  async createCategory(
    tenantId: string,
    data: Prisma.CategoryCreateWithoutTenantInput,
  ) {
    return await this.prisma.category.create({
      data: {
        ...data,
        tenantId,
      },
    });
  }

  async getCategoriesPagination(tenantId: string, params: QueryParams) {
    const page = Number(params.page) || 1;
    const limit = Number(params.limit) || 10;
    const search = params.search || '';

    const whereClause: Prisma.CategoryWhereInput = {
      tenantId,
      isDeleted: false,
    };

    if (search !== '') {
      whereClause.name = {
        contains: search,
        mode: Prisma.QueryMode.insensitive,
      };
    }

    const [totalCount, data] = await Promise.all([
      this.prisma.category.count({ where: whereClause }),
      this.prisma.category.findMany({
        where: whereClause,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          subcategories: {
            where: { isDeleted: false },
          },
        },
      }),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }

  async getCategories(tenantId: string) {
    return this.prisma.category.findMany({
      where: {
        tenantId,
        isDeleted: false,
      },
      include: {
        subcategories: {
          where: { isDeleted: false },
        },
      },
    });
  }

  async getCategory(tenantId: string, id: string) {
    const category = await this.prisma.category.findFirst({
      where: {
        id,
        tenantId,
        isDeleted: false,
      },
      include: {
        subcategories: {
          where: { isDeleted: false },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  async updateCategory(
    tenantId: string,
    id: string,
    data: Prisma.CategoryUpdateInput,
  ) {
    await this.getCategory(tenantId, id);

    return this.prisma.category.update({
      where: { id },
      data,
    });
  }

  async deleteCategory(tenantId: string, id: string) {
    await this.getCategory(tenantId, id);

    return this.prisma.category.update({
      where: { id },
      data: { isDeleted: true },
    });
  }

  async createSubcategory(
    tenantId: string,
    categoryId: string,
    data: Prisma.SubcategoryCreateWithoutCategoryInput,
  ) {
    const category = await this.prisma.category.findFirst({
      where: { id: categoryId, tenantId, isDeleted: false },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return this.prisma.subcategory.create({
      data: {
        ...data,
        categoryId,
      },
    });
  }

  async updateSubcategory(
    tenantId: string,
    id: string,
    data: Prisma.SubcategoryUpdateInput,
  ) {
    const subcategory = await this.prisma.subcategory.findFirst({
      where: {
        id,
        category: { tenantId },
        isDeleted: false,
      },
    });

    if (!subcategory) {
      throw new NotFoundException('Subcategory not found');
    }

    return this.prisma.subcategory.update({
      where: { id },
      data,
    });
  }

  async deleteSubcategory(tenantId: string, id: string) {
    const subcategory = await this.prisma.subcategory.findFirst({
      where: {
        id,
        category: { tenantId },
        isDeleted: false,
      },
    });

    if (!subcategory) {
      throw new NotFoundException('Subcategory not found');
    }

    return this.prisma.subcategory.update({
      where: { id },
      data: { isDeleted: true },
    });
  }
}
