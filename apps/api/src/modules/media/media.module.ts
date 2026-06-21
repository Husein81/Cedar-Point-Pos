import { Module } from '@nestjs/common';
import { mediaConfigProvider } from './media.config.js';
import { MediaController } from './media.controller.js';
import { MediaService } from './media.service.js';
import { B2StorageService } from './storage/b2-storage.service.js';
import { STORAGE_PROVIDER } from './storage/storage-provider.js';

@Module({
  controllers: [MediaController],
  providers: [
    mediaConfigProvider,
    MediaService,
    { provide: STORAGE_PROVIDER, useClass: B2StorageService },
  ],
  // STORAGE_PROVIDER is exported so ProductsModule can derive image URLs from keys.
  exports: [STORAGE_PROVIDER, MediaService],
})
export class MediaModule {}
