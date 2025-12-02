import { Injectable } from '@nestjs/common';

@Injectable()
export class TokenBlacklistService {
  // In-memory store for blacklisted tokens
  // In production, use Redis or a database for distributed systems
  private blacklistedTokens: Map<string, number> = new Map();

  blacklist(token: string, ttlMs: number): void {
    const expiresAt = Date.now() + ttlMs;
    this.blacklistedTokens.set(token, expiresAt);

    // Clean up expired tokens periodically
    this.cleanupExpiredTokens();
  }

  isBlacklisted(token: string): boolean {
    const expiresAt = this.blacklistedTokens.get(token);

    if (!expiresAt) {
      return false;
    }

    // Check if token has expired from blacklist
    if (Date.now() > expiresAt) {
      this.blacklistedTokens.delete(token);
      return false;
    }

    return true;
  }

  private cleanupExpiredTokens(): void {
    const now = Date.now();
    for (const [token, expiresAt] of this.blacklistedTokens.entries()) {
      if (now > expiresAt) {
        this.blacklistedTokens.delete(token);
      }
    }
  }
}
