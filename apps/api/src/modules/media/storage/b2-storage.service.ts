import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Inject, Injectable } from '@nestjs/common';
import { MEDIA_CONFIG, type MediaConfig } from '../media.config.js';
import type { StorageProvider } from './storage-provider.js';

/**
 * Backblaze B2 adapter over the S3-compatible API. Holds the only S3 client in
 * the app; credentials live here and never leave the server.
 */
@Injectable()
export class B2StorageService implements StorageProvider {
  private readonly client: S3Client;

  constructor(@Inject(MEDIA_CONFIG) private readonly config: MediaConfig) {
    this.client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  async upload(key: string, body: Buffer, contentType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        // Keys are content-unique (UUID), so the object never changes — let the
        // browser and CDN cache it indefinitely.
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    );
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
      }),
    );
  }

  getPublicUrl(key: string): string {
    return `${this.config.cdnBaseUrl}/${key}`;
  }
}
