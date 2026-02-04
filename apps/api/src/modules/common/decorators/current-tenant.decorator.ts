import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';

/**
 * Custom decorator to extract tenantId from the authenticated user in the request
 * Throws UnauthorizedException if tenantId is not found
 * 
 * @example
 * @Get('/branch/:branchId')
 * getTables(@Param('branchId') branchId: string, @CurrentTenant() tenantId: string) {
 *   return this.tablesService.getTablesByBranch(branchId, tenantId);
 * }
 */
export const CurrentTenant = createParamDecorator(
    (data: unknown, ctx: ExecutionContext): string => {
        const request = ctx.switchToHttp().getRequest();
        const tenantId = request.user?.tenantId;

        if (!tenantId) {
            throw new UnauthorizedException('Tenant ID not found in request');
        }

        return tenantId;
    },
);
