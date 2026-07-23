import { IsHexColor, IsNotEmpty, IsString } from 'class-validator';

export class CreateColorDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsHexColor()
  hex!: string;

  // Injected by the controller from the JWT — intentionally undecorated so the
  // ValidationPipe strips any client-supplied value (mass-assignment guard).
  tenantId!: string;
}

export type UpdateColorDto = Partial<CreateColorDto> & { id: string };
