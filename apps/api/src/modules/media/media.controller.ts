import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserRole } from '@repo/types';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { MEDIA_MAX_FILE_SIZE_BYTES } from './media.constants.js';
import { MediaService } from './media.service.js';

@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  /**
   * Upload a product image. Decoupled from the product record (returns a key the
   * client saves on create/update) so it works before a product id exists.
   */
  @Post('products/image')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MEDIA_MAX_FILE_SIZE_BYTES, files: 1 },
    }),
  )
  uploadProductImage(
    @CurrentTenant() tenantId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.mediaService.uploadProductImage(tenantId, file);
  }

  /**
   * Upload a tenant logo. Returns a key + public URL; the client saves the URL
   * on the tenant via PUT /tenant/my-tenant.
   */
  @Post('tenant/logo')
  @Roles(UserRole.ADMIN)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MEDIA_MAX_FILE_SIZE_BYTES, files: 1 },
    }),
  )
  uploadTenantLogo(
    @CurrentTenant() tenantId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.mediaService.uploadTenantLogo(tenantId, file);
  }
}
