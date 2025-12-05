import { Prisma } from '@repo/db';

export type UpdateRecipeDto = Prisma.RecipeUpdateInput & {
  productId?: string;
  ingredientId?: string;
};
