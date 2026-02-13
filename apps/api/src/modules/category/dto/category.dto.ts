export type CreateCategoryDto = {
  id?: string;
  name: string;
  code?: string | null;
  description?: string | null;
  isDeleted?: boolean;
  tenantId: string;
  colorId?: string;
};

export type UpdateCategoryDto = Partial<CreateCategoryDto>;
