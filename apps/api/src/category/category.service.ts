import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, prisma } from '@repo/db';

@Injectable()
export class CategoryService {
  async createCategory(
    tenantId: string,
    data: Prisma.CategoryCreateWithoutTenantInput,
  ) {
    return prisma.category.create({
      data: {
        ...data,
        tenantId,
      },
    });
  }

  async getCategories(tenantId: string) {
    return prisma.category.findMany({
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
    const category = await prisma.category.findFirst({
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

    return prisma.category.update({
      where: { id },
      data,
    });
  }

  async deleteCategory(tenantId: string, id: string) {
    await this.getCategory(tenantId, id);

    return prisma.category.update({
      where: { id },
      data: { isDeleted: true },
    });
  }

  async createSubcategory(
    tenantId: string,
    categoryId: string,
    data: Prisma.SubcategoryCreateWithoutCategoryInput,
  ) {
    const category = await prisma.category.findFirst({
      where: { id: categoryId, tenantId, isDeleted: false },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return prisma.subcategory.create({
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
    const subcategory = await prisma.subcategory.findFirst({
      where: {
        id,
        category: { tenantId },
        isDeleted: false,
      },
    });

    if (!subcategory) {
      throw new NotFoundException('Subcategory not found');
    }

    return prisma.subcategory.update({
      where: { id },
      data,
    });
  }

  async deleteSubcategory(tenantId: string, id: string) {
    const subcategory = await prisma.subcategory.findFirst({
      where: {
        id,
        category: { tenantId },
        isDeleted: false,
      },
    });

    if (!subcategory) {
      throw new NotFoundException('Subcategory not found');
    }

    return prisma.subcategory.update({
      where: { id },
      data: { isDeleted: true },
    });
  }
}
