import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  Req,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { RecipesService } from './recipes.service.js';
import type { CreateRecipeDto } from './dto/create-recipe.dto.js';
import type { UpdateRecipeDto } from './dto/update-recipe.dto.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import type { Request } from 'express';
import { UserRole } from '@repo/types';

@Controller('recipes')
export class RecipesController {
  constructor(private readonly recipesService: RecipesService) {}

  /**
   * Create a new recipe
   */
  @Post()
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  create(@Req() req: Request, @Body() createRecipeDto: CreateRecipeDto) {
    const user = req.user as { tenantId: string };
    return this.recipesService.create(user.tenantId, createRecipeDto);
  }

  /**
   * Get all recipes with optional filters
   */
  @Get()
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
  findAll(
    @Req() req: Request,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('productId') productId?: string,
    @Query('ingredientId') ingredientId?: string,
  ) {
    const user = req.user as { tenantId: string };
    return this.recipesService.findAll(user.tenantId, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
      productId,
      ingredientId,
    });
  }

  /**
   * Get all recipes for a specific product
   */
  @Get('product/:productId')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER, UserRole.KITCHEN)
  findByProduct(@Req() req: Request, @Param('productId') productId: string) {
    const user = req.user as { tenantId: string };
    return this.recipesService.findByProduct(user.tenantId, productId);
  }

  /**
   * Calculate ingredient requirements for a quantity of product
   */
  @Get('product/:productId/calculate')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER, UserRole.KITCHEN)
  calculateRequirements(
    @Req() req: Request,
    @Param('productId') productId: string,
    @Query('quantity', ParseIntPipe) quantity: number,
  ) {
    const user = req.user as { tenantId: string };
    return this.recipesService.calculateIngredientRequirements(
      user.tenantId,
      productId,
      quantity,
    );
  }

  /**
   * Get a specific recipe by ID
   */
  @Get(':id')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
  findOne(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as { tenantId: string };
    return this.recipesService.findOne(user.tenantId, id);
  }

  /**
   * Update a recipe
   */
  @Put(':id')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() updateRecipeDto: UpdateRecipeDto,
  ) {
    const user = req.user as { tenantId: string };
    return this.recipesService.update(user.tenantId, id, updateRecipeDto);
  }

  /**
   * Delete a recipe
   */
  @Delete(':id')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  remove(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as { tenantId: string };
    return this.recipesService.remove(user.tenantId, id);
  }

  /**
   * Bulk create/update recipes for a product
   */
  @Post('product/:productId/bulk')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  bulkCreate(
    @Req() req: Request,
    @Param('productId') productId: string,
    @Body()
    body: {
      ingredients: Array<{ ingredientId: string; quantity: number }>;
    },
  ) {
    const user = req.user as { tenantId: string };
    return this.recipesService.bulkCreate(
      user.tenantId,
      productId,
      body.ingredients,
    );
  }
}
