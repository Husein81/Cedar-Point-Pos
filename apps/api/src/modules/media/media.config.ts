import { z } from 'zod';

/**
 * DI token for the validated Backblaze B2 / CDN configuration.
 * Resolved once at boot; the factory throws (fail-fast) if anything is missing
 * or malformed, so the API never starts in a half-configured media state.
 */
export const MEDIA_CONFIG = Symbol('MEDIA_CONFIG');

const MediaConfigSchema = z.object({
  endpoint: z.string().url(), // e.g. https://s3.eu-central-003.backblazeb2.com
  region: z.string().min(1), // e.g. eu-central-003
  bucket: z.string().min(1), // e.g. pointverse-media
  accessKeyId: z.string().min(1), // B2 application keyID
  secretAccessKey: z.string().min(1), // B2 applicationKey
  cdnBaseUrl: z.string().url(), // public read base, e.g. https://cdn.pointverse.com
});

export type MediaConfig = z.infer<typeof MediaConfigSchema>;

export const mediaConfigProvider = {
  provide: MEDIA_CONFIG,
  useFactory: (): MediaConfig => {
    const parsed = MediaConfigSchema.safeParse({
      endpoint: process.env.B2_ENDPOINT,
      region: process.env.B2_REGION,
      bucket: process.env.B2_BUCKET,
      accessKeyId: process.env.B2_ACCESS_KEY_ID,
      secretAccessKey: process.env.B2_SECRET_ACCESS_KEY,
      cdnBaseUrl: process.env.MEDIA_CDN_BASE_URL,
    });

    if (!parsed.success) {
      const details = parsed.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join('; ');
      throw new Error(`Invalid media (B2) configuration — ${details}`);
    }

    // Strip trailing slashes so getPublicUrl can always join with a single '/'.
    return {
      ...parsed.data,
      cdnBaseUrl: parsed.data.cdnBaseUrl.replace(/\/+$/, ''),
    };
  },
};
