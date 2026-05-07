export class CreateColorDto {
  name!: string;
  hex!: string;
  tenantId!: string;
}

export type UpdateColorDto = Partial<CreateColorDto> & { id: string };
