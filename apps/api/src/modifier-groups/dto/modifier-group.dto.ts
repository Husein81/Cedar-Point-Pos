import { ModifierType } from '@repo/db';

export type CreateModifierGroupDto = {
  name: string;
  type: ModifierType;
};

export type UpdateModifierGroupDto = {
  name?: string;
  type?: ModifierType;
};
