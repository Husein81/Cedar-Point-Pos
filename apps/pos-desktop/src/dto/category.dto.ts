import { Category } from "@repo/types";

export interface CreateCategoryDto {
  name: string;
  code?: string;
  description?: string;
}

export interface UpdateCategoryDto {
  name?: string;
  code?: string;
  description?: string;
}

export interface CategoryWithSubcategories extends Category {
  subcategories?: Array<{
    id: string;
    categoryId: string;
    name: string;
    description?: string | null;
    isDeleted: boolean;
  }> | null;
}

export interface CreateSubcategoryDto {
  name: string;
  description?: string;
}

export interface UpdateSubcategoryDto {
  name?: string;
  description?: string;
}
