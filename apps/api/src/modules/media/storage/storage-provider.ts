/**
 * Storage abstraction (the "port"). Callers depend on this interface, never on a
 * concrete cloud SDK, so the provider can be swapped (B2 ↔ S3 ↔ local) or extended
 * (e.g. presigned URLs) without touching MediaService or any consumer.
 */
export const STORAGE_PROVIDER = Symbol('STORAGE_PROVIDER');

export interface StorageProvider {
  /** Upload an object under `key` with the given content type. */
  upload(key: string, body: Buffer, contentType: string): Promise<void>;

  /** Delete the object at `key`. Should resolve even if the object is absent. */
  delete(key: string): Promise<void>;

  /** Derive the public (CDN) URL for a stored object key. */
  getPublicUrl(key: string): string;
}
