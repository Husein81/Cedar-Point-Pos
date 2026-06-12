import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  Inject,
  Injectable,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import sharp from 'sharp';
import {
  MEDIA_ALLOWED_MIME_TYPES,
  MEDIA_IMAGE_MAX_DIMENSION,
  MEDIA_WEBP_QUALITY,
  PRODUCT_IMAGE_PREFIX,
} from './media.constants.js';
import {
  STORAGE_PROVIDER,
  type StorageProvider,
} from './storage/storage-provider.js';

export interface UploadedImage {
  key: string;
  url: string;
}

@Injectable()
export class MediaService {
  constructor(
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
  ) {}

  /**
   * Validate, normalize and store a product image, returning its durable storage
   * key plus the derived public URL. The key is tenant-scoped so a tenant can
   * never write outside its own prefix.
   */
  async uploadProductImage(
    tenantId: string,
    file: Express.Multer.File | undefined,
  ): Promise<UploadedImage> {
    this.assertValidImage(file);

    const optimized = await this.toOptimizedWebp(file.buffer);
    const key = `${tenantId}/${PRODUCT_IMAGE_PREFIX}/${randomUUID()}.webp`;

    await this.storage.upload(key, optimized, 'image/webp');

    return { key, url: this.storage.getPublicUrl(key) };
  }

  private assertValidImage(
    file: Express.Multer.File | undefined,
  ): asserts file is Express.Multer.File {
    if (!file) {
      throw new BadRequestException('No image file provided');
    }

    const isAllowed = (
      MEDIA_ALLOWED_MIME_TYPES as readonly string[]
    ).includes(file.mimetype);

    if (!isAllowed) {
      throw new UnsupportedMediaTypeException(
        `Unsupported image type. Allowed: ${MEDIA_ALLOWED_MIME_TYPES.join(', ')}`,
      );
    }
  }

  /**
   * Re-encode to WebP at a bounded size. sharp reads the real bytes (not the
   * declared mime type), so a non-image or polyglot payload throws here and is
   * rejected; metadata (EXIF/GPS) is dropped by default, with `.rotate()`
   * applying any orientation first.
   */
  private async toOptimizedWebp(buffer: Buffer): Promise<Buffer> {
    try {
      return await sharp(buffer)
        .rotate()
        .resize(MEDIA_IMAGE_MAX_DIMENSION, MEDIA_IMAGE_MAX_DIMENSION, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: MEDIA_WEBP_QUALITY })
        .toBuffer();
    } catch {
      throw new BadRequestException('Invalid or corrupt image file');
    }
  }
}
