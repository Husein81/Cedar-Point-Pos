/**
 * DI token for the validated Backblaze B2 / CDN configuration.
 * Resolved once at boot; the factory throws (fail-fast) if anything is missing
 * or malformed, so the API never starts in a half-configured media state.
 */
export const MEDIA_CONFIG = Symbol('MEDIA_CONFIG');

export interface MediaConfig {
  endpoint: string; // e.g. https://s3.eu-central-003.backblazeb2.com
  region: string; // e.g. eu-central-003
  bucket: string; // e.g. pointverse-media
  accessKeyId: string; // B2 application keyID
  secretAccessKey: string; // B2 applicationKey
  cdnBaseUrl: string; // public read base, e.g. https://cdn.pointverse.com
}

function isValidUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

export const mediaConfigProvider = {
  provide: MEDIA_CONFIG,
  useFactory: (): MediaConfig => {
    const raw = {
      endpoint: process.env.B2_ENDPOINT,
      region: process.env.B2_REGION,
      bucket: process.env.B2_BUCKET,
      accessKeyId: process.env.B2_ACCESS_KEY_ID,
      secretAccessKey: process.env.B2_SECRET_ACCESS_KEY,
      cdnBaseUrl: process.env.MEDIA_CDN_BASE_URL,
    };

    const errors: string[] = [];
    const requiredKeys: (keyof MediaConfig)[] = [
      'endpoint',
      'region',
      'bucket',
      'accessKeyId',
      'secretAccessKey',
      'cdnBaseUrl',
    ];
    for (const key of requiredKeys) {
      if (!raw[key]) errors.push(`${key}: required`);
    }
    if (raw.endpoint && !isValidUrl(raw.endpoint)) {
      errors.push('endpoint: must be a valid URL');
    }
    if (raw.cdnBaseUrl && !isValidUrl(raw.cdnBaseUrl)) {
      errors.push('cdnBaseUrl: must be a valid URL');
    }

    if (errors.length > 0) {
      throw new Error(
        `Invalid media (B2) configuration — ${errors.join('; ')}`,
      );
    }

    // Strip trailing slashes so getPublicUrl can always join with a single '/'.
    return {
      endpoint: raw.endpoint!,
      region: raw.region!,
      bucket: raw.bucket!,
      accessKeyId: raw.accessKeyId!,
      secretAccessKey: raw.secretAccessKey!,
      cdnBaseUrl: raw.cdnBaseUrl!.replace(/\/+$/, ''),
    };
  },
};
