import { Prisma } from '@repo/db';

export type CreateRecipeDto = Prisma.RecipeCreateInput & {
  productId: string;
  ingredientId: string;
};
