export type CreateModifierDto = {
  name: string;
  price: number;
  productId?: string;
};

export type UpdateModifierDto = {
  name?: string;
  price?: number;
  productId?: string;
};
