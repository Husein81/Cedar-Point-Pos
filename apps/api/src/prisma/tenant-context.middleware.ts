// =============================================================================
// TENANT CONTEXT MIDDLEWARE
// =============================================================================

import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { SystemPrismaService } from './multi-tenant-prisma.service.js';

// =============================================================================
// TYPES (no namespace, no any)
// =============================================================================

interface JwtUser {
  id: string;
  tenantId?: string;
  email?: string;
}

export interface TenantContext {
  tenantId: string;
  schemaName: string;
}

type RequestWithUser = Request & {
  user?: JwtUser;
  tenantContext?: TenantContext;
};

// =============================================================================
// MIDDLEWARE
// =============================================================================

@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TenantContextMiddleware.name);

  constructor(private readonly systemPrisma: SystemPrismaService) {}

  async use(req: Request, _res: Response, next: NextFunction): Promise<void> {
    try {
      const request = req as RequestWithUser;

      // Skip tenant resolution for system/public routes
      if (this.isSystemRoute(request.path)) {
        return next();
      }

      const tenantId = this.extractTenantId(request);

      // If route does not require tenant context, continue
      if (!tenantId) {
        return next();
      }

      const tenant = await this.systemPrisma.tenant.findUnique({
        where: { id: tenantId },
        select: {
          id: true,
          name: true,
          schemaName: true,
          status: true,
        },
      });

      if (!tenant) {
        throw new UnauthorizedException('Tenant not found');
      }

      switch (tenant.status) {
        case 'SUSPENDED':
          throw new ForbiddenException('Tenant account is suspended');
        case 'TERMINATED':
          throw new ForbiddenException('Tenant account is terminated');
        case 'ONBOARDING':
          throw new ForbiddenException(
            'Tenant account is still being provisioned',
          );
      }

      request.tenantContext = {
        tenantId: tenant.id,
        schemaName: tenant.schemaName,
      };

      this.logger.debug(
        `Tenant resolved: ${tenant.name} (${tenant.schemaName})`,
      );

      next();
    } catch (error) {
      next(error);
    }
  }

  // =============================================================================
  // TENANT ID EXTRACTION
  // =============================================================================

  private extractTenantId(request: RequestWithUser): string | null {
    // 1. JWT user (preferred)
    if (request.user && typeof request.user.tenantId === 'string') {
      return request.user.tenantId;
    }

    // 2. X-Tenant-ID header
    const headerTenantId = request.headers['x-tenant-id'];
    if (typeof headerTenantId === 'string' && headerTenantId.length > 0) {
      return headerTenantId;
    }

    // 3. Subdomain (optional – not implemented yet)
    const host = request.headers.host;
    if (typeof host === 'string') {
      const subdomain = this.extractSubdomain(host);
      if (subdomain && subdomain !== 'www' && subdomain !== 'api') {
        // Future: lookup tenant by slug
        return null;
      }
    }

    return null;
  }

  // =============================================================================
  // HELPERS
  // =============================================================================

  private extractSubdomain(host: string): string | null {
    const hostname = host.split(':')[0];
    const parts = hostname.split('.');

    if (parts.length >= 3) {
      return parts[0];
    }

    return null;
  }

  private isSystemRoute(path: string): boolean {
    const systemRoutes = [
      '/health',
      '/api/health',
      '/auth/login',
      '/auth/register',
      '/admin',
      '/system',
      '/tenants',
    ];

    return systemRoutes.some((route) => path.startsWith(route));
  }
}
