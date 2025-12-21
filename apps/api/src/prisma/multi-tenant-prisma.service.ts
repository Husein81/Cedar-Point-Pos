// =============================================================================
// MULTI-TENANT PRISMA SERVICE (SINGLE schema.prisma SETUP)
// =============================================================================
//
// Uses ONE generated PrismaClient from:
// ../../generated/prisma-client/client.js
//
// - public schema   → system tables (Tenant, License, SystemDevice, etc.)
// - tenant schemas  → per-tenant data via PostgreSQL search_path
//
// Notes on fixes vs previous version:
// ✅ No `any` access for request.tenantContext
// ✅ PrismaClient constructor gets options arg
// ✅ Transaction callback uses Prisma.TransactionClient (correct type)
// ✅ No async lifecycle method without await
// ✅ query() returns typed rows without unsafe any[] returns
// =============================================================================

import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Scope,
  Inject,
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import type { Request } from 'express';
import { Pool, PoolClient } from 'pg';

import { PrismaClient, Prisma } from '../../generated/prisma/client.js';

// =============================================================================
// Shared types
// =============================================================================

export interface TenantContext {
  tenantId: string;
  schemaName: string; // e.g. t_abc123
}

type RequestWithTenantContext = Request & {
  tenantContext?: TenantContext;
};

// =============================================================================
// SYSTEM PRISMA SERVICE (public schema)
// =============================================================================

@Injectable()
export class SystemPrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({} as Prisma.PrismaClientOptions);
  }

  async onModuleInit() {
    await this.$connect();

    // Optional but nice: ensure system client always defaults to public
    await this.$executeRaw`SET search_path TO public`;
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

// =============================================================================
// TENANT PRISMA SERVICE (request-scoped, search_path)
// =============================================================================

@Injectable({ scope: Scope.REQUEST })
export class TenantPrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private schemaName: string | null = null;

  constructor(
    @Inject(REQUEST) private readonly request: RequestWithTenantContext,
  ) {
    super({} as Prisma.PrismaClientOptions);
  }

  async onModuleInit() {
    await this.$connect();

    const ctx = this.request.tenantContext;

    if (!ctx?.schemaName) {
      throw new Error('Tenant context missing (tenantContext.schemaName)');
    }

    this.schemaName = ctx.schemaName;
    await this.setSearchPath(ctx.schemaName);
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  private async setSearchPath(schemaName: string): Promise<void> {
    // Validate schema name to prevent SQL injection
    if (!/^t_[a-z0-9]+$/i.test(schemaName)) {
      throw new Error(`Invalid schema name: ${schemaName}`);
    }

    // Use unsafe only for identifier interpolation; it's validated above.
    await this.$executeRawUnsafe(`SET search_path TO "${schemaName}", public`);
  }

  getSchemaName(): string | null {
    return this.schemaName;
  }

  /**
   * Recommended wrapper for tenant-scoped operations.
   * Ensures search_path is set for the transaction connection.
   */
  async withTenantTransaction<T>(
    callback: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    if (!this.schemaName) {
      throw new Error('Tenant schemaName not initialized');
    }

    const schemaName = this.schemaName;

    return this.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(
        `SET LOCAL search_path TO "${schemaName}", public`,
      );
      return callback(tx);
    });
  }
}

// =============================================================================
// DATABASE POOL SERVICE (DDL / schema management only)
// =============================================================================

@Injectable()
export class DatabasePoolService implements OnModuleInit, OnModuleDestroy {
  private pool!: Pool;

  // No async هنا لأن ما في await (to satisfy lint rule)
  onModuleInit() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
    });
  }

  async onModuleDestroy() {
    await this.pool.end();
  }

  async getClient(): Promise<PoolClient> {
    return this.pool.connect();
  }

  async query<T = unknown>(sql: string, params?: unknown[]): Promise<T[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(sql, params as any[] | undefined);
      return result.rows as T[];
    } finally {
      client.release();
    }
  }

  async queryWithSchema<T = unknown>(
    schemaName: string,
    sql: string,
    params?: unknown[],
  ): Promise<T[]> {
    if (!/^t_[a-z0-9]+$/i.test(schemaName)) {
      throw new Error(`Invalid schema name: ${schemaName}`);
    }

    const client = await this.pool.connect();
    try {
      await client.query(`SET LOCAL search_path TO "${schemaName}", public`);
      const result = await client.query(sql, params as any[] | undefined);
      return result.rows as T[];
    } finally {
      client.release();
    }
  }
}
