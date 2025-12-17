import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma, prisma } from '@repo/db';
import type { CreateRecipeDto } from './dto/create-recipe.dto.js';
import type { UpdateRecipeDto } from './dto/update-recipe.dto.js';

@Injectable()
export class RecipesService {
  /**
   * Create a new recipe linking a sellable product to an ingredient
   */
  async create(tenantId: string, createRecipeDto: CreateRecipeDto) {
    const { productId, ingredientId, quantity } = createRecipeDto;

    // Validate that the product exists and belongs to tenant
    const product = await prisma.product.findFirst({
      where: { id: productId, tenantId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Validate that the ingredient exists, belongs to tenant, and is marked as ingredient
    const ingredient = await prisma.product.findFirst({
      where: { id: ingredientId, tenantId, isIngredient: true },
    });

    if (!ingredient) {
      throw new NotFoundException(
        'Ingredient not found or not marked as ingredient',
      );
    }

    // Check if recipe already exists
    const existingRecipe = await prisma.recipe.findUnique({
      where: {
        productId_ingredientId: {
          productId,
          ingredientId,
        },
      },
    });

    if (existingRecipe) {
      throw new ConflictException(
        'Recipe with this product-ingredient combination already exists',
      );
    }

    return prisma.recipe.create({
      data: {
        tenantId,
        productId,
        ingredientId,
        quantity: new Prisma.Decimal(Number(quantity)),
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
          },
        },
        ingredient: {
          select: {
            id: true,
            name: true,
            sku: true,
            isIngredient: true,
          },
        },
      },
    });
  }

  /**
   * Get all recipes for a specific product (showing all ingredients)
   */
  async findByProduct(tenantId: string, productId: string) {
    const recipes = await prisma.recipe.findMany({
      where: {
        tenantId,
        productId,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
          },
        },
        ingredient: {
          select: {
            id: true,
            name: true,
            sku: true,
            isIngredient: true,
          },
        },
      },
      orderBy: {
        ingredient: {
          name: 'asc',
        },
      },
    });

    return recipes.map((recipe) => ({
      ...recipe,
      quantity: Number(recipe.quantity),
    }));
  }

  /**
   * Get all recipes for the tenant with pagination
   */
  async findAll(
    tenantId: string,
    params: {
      page?: number;
      limit?: number;
      productId?: string;
      ingredientId?: string;
    },
  ) {
    const { page = 1, limit = 10, productId, ingredientId } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.RecipeWhereInput = {
      tenantId,
      ...(productId && { productId }),
      ...(ingredientId && { ingredientId }),
    };

    const [totalCount, recipes] = await Promise.all([
      prisma.recipe.count({ where }),
      prisma.recipe.findMany({
        where,
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
            },
          },
          ingredient: {
            select: {
              id: true,
              name: true,
              sku: true,
              isIngredient: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: [
          { product: { name: 'asc' } },
          { ingredient: { name: 'asc' } },
        ],
      }),
    ]);

    return {
      data: recipes.map((recipe) => ({
        ...recipe,
        quantity: Number(recipe.quantity),
      })),
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }

  /**
   * Get a specific recipe by ID
   */
  async findOne(tenantId: string, id: string) {
    const recipe = await prisma.recipe.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
          },
        },
        ingredient: {
          select: {
            id: true,
            name: true,
            sku: true,
            isIngredient: true,
          },
        },
      },
    });

    if (!recipe) {
      throw new NotFoundException('Recipe not found');
    }

    return {
      ...recipe,
      quantity: Number(recipe.quantity),
    };
  }

  /**
   * Update recipe quantity
   */
  async update(tenantId: string, id: string, updateRecipeDto: UpdateRecipeDto) {
    const recipe = await prisma.recipe.findFirst({
      where: { id, tenantId },
    });

    if (!recipe) {
      throw new NotFoundException('Recipe not found');
    }

    const updated = await prisma.recipe.update({
      where: { id },
      data: {
        ...(updateRecipeDto.quantity !== undefined && {
          quantity: new Prisma.Decimal(Number(updateRecipeDto.quantity)),
        }),
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
          },
        },
        ingredient: {
          select: {
            id: true,
            name: true,
            sku: true,
            isIngredient: true,
          },
        },
      },
    });

    return {
      ...updated,
      quantity: Number(updated.quantity),
    };
  }

  /**
   * Delete a recipe
   */
  async remove(tenantId: string, id: string) {
    const recipe = await prisma.recipe.findFirst({
      where: { id, tenantId },
    });

    if (!recipe) {
      throw new NotFoundException('Recipe not found');
    }

    await prisma.recipe.delete({
      where: { id },
    });

    return { message: 'Recipe deleted successfully' };
  }

  /**
   * Calculate total ingredient requirements for a given quantity of product
   * Useful for inventory planning and automatic deductions
   */
  async calculateIngredientRequirements(
    tenantId: string,
    productId: string,
    productQuantity: number,
  ) {
    if (productQuantity <= 0) {
      throw new BadRequestException('Product quantity must be greater than 0');
    }

    const recipes = await prisma.recipe.findMany({
      where: {
        tenantId,
        productId,
      },
      include: {
        ingredient: {
          select: {
            id: true,
            name: true,
            sku: true,
          },
        },
      },
    });

    if (recipes.length === 0) {
      throw new NotFoundException('No recipe found for this product');
    }

    return {
      productId,
      productQuantity,
      ingredients: recipes.map((recipe) => ({
        ingredientId: recipe.ingredientId,
        ingredientName: recipe.ingredient.name,
        ingredientSku: recipe.ingredient.sku,
        quantityPerUnit: Number(recipe.quantity),
        totalRequired: Number(recipe.quantity) * productQuantity,
      })),
    };
  }

  /**
   * Bulk create recipes for a product
   */
  async bulkCreate(
    tenantId: string,
    productId: string,
    ingredients: Array<{ ingredientId: string; quantity: number }>,
  ) {
    // Validate product exists
    const product = await prisma.product.findFirst({
      where: { id: productId, tenantId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Validate all ingredients exist and are marked as ingredients
    const ingredientIds = ingredients.map((i) => i.ingredientId);
    const validIngredients = await prisma.product.findMany({
      where: {
        id: { in: ingredientIds },
        tenantId,
        isIngredient: true,
      },
    });

    if (validIngredients.length !== ingredientIds.length) {
      throw new BadRequestException(
        'One or more ingredients are invalid or not marked as ingredients',
      );
    }

    // Create all recipes in a transaction
    const createdRecipes = await prisma.$transaction(
      ingredients.map((ingredient) =>
        prisma.recipe.upsert({
          where: {
            productId_ingredientId: {
              productId,
              ingredientId: ingredient.ingredientId,
            },
          },
          create: {
            tenantId,
            productId,
            ingredientId: ingredient.ingredientId,
            quantity: new Prisma.Decimal(ingredient.quantity),
          },
          update: {
            quantity: new Prisma.Decimal(ingredient.quantity),
          },
          include: {
            ingredient: {
              select: {
                id: true,
                name: true,
                sku: true,
              },
            },
          },
        }),
      ),
    );

    return createdRecipes.map((recipe) => ({
      ...recipe,
      quantity: Number(recipe.quantity),
    }));
  }
}
