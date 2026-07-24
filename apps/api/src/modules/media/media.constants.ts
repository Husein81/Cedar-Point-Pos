/**
 * Media upload constraints and image-processing settings.
 * Centralized so the controller (multer limits) and service (validation/encoding)
 * share a single source of truth.
 */

// Hard cap enforced by multer before the buffer ever reaches the service.
export const MEDIA_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

// First-pass allow-list on the client-declared mime type. sharp re-validates the
// actual bytes downstream, so this is a cheap early rejection, not the real guard.
export const MEDIA_ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
] as const;

// Longest edge after resize; images smaller than this are never upscaled.
export const MEDIA_IMAGE_MAX_DIMENSION = 1024; // px

// WebP encoder quality (0-100). 80 is a strong size/quality trade-off.
export const MEDIA_WEBP_QUALITY = 80;

// Key segment grouping product images within a tenant prefix.
export const PRODUCT_IMAGE_PREFIX = 'products';

// Key segment grouping tenant logo images within a tenant prefix.
export const LOGO_IMAGE_PREFIX = 'logos';
