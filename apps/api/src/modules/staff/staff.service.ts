import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  UserRole,
  type CreateStaffInput,
  type StaffActivityQuery,
  type StaffQuery,
  type UpdateStaffInput,
} from '@repo/types';
import bcrypt from 'bcrypt';
import { Prisma } from '../../generated/prisma/client.js';
import {
  assertAssignableRole,
  assertCanManageRole,
} from '../common/role-authorization.js';
import { PrismaService } from '../prisma/prisma.service.js';

const PASSWORD_SALT_ROUNDS = 12;
/** Cost factor for hashing POS PINs at rest (matches password hashing). */
const PIN_SALT_ROUNDS = 12;
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const RECENT_ACTIVITY_LIMIT = 10;

// Fields safe to read for staff management. `pinHash` is selected only to derive
// `isPinSet` and is stripped by `toStaffView` before anything leaves the service.
const STAFF_SELECT = {
  id: true,
  name: true,
  username: true,
  email: true,
  phone: true,
  avatar: true,
  role: true,
  isActive: true,
  hasPosAccess: true,
  branchId: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
  tenantId: true,
  pinHash: true,
  branch: { select: { id: true, name: true } },
} satisfies Prisma.UserSelect;

@Injectable()
export class StaffService {
  constructor(private readonly prisma: PrismaService) {}

  /** Paginated, filterable staff list scoped to the tenant. */
  async getStaff(tenantId: string, query: StaffQuery) {
    const { page, limit, skip } = this.resolvePagination(
      query.page,
      query.limit,
    );

    const where: Prisma.UserWhereInput = { tenantId };
    if (query.role) where.role = query.role;
    if (query.branchId) where.branchId = query.branchId;
    if (typeof query.isActive === 'boolean') where.isActive = query.isActive;
    if (typeof query.hasPosAccess === 'boolean')
      where.hasPosAccess = query.hasPosAccess;

    const search = query.search?.trim();
    if (search) {
      where.OR = [
        { name: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { username: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { email: { contains: search, mode: Prisma.QueryMode.insensitive } },
      ];
    }

    const [totalCount, rows] = await this.prisma.$transaction([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        select: STAFF_SELECT,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take: limit,
      }),
    ]);

    return {
      data: rows.map((row) => this.toStaffView(row)),
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }

  /** Single staff profile with recent activity and the active POS session. */
  async getStaffById(tenantId: string, staffId: string) {
    const staff = await this.prisma.user.findFirst({
      where: { id: staffId, tenantId },
      select: STAFF_SELECT,
    });

    if (!staff) {
      throw new NotFoundException('Staff member not found');
    }

    const [recentActivity, activeSession] = await Promise.all([
      this.prisma.staffActivityLog.findMany({
        where: { staffId, tenantId },
        orderBy: { createdAt: 'desc' },
        take: RECENT_ACTIVITY_LIMIT,
      }),
      this.prisma.staffSession.findFirst({
        where: { staffId, tenantId, isActive: true },
        orderBy: { startedAt: 'desc' },
      }),
    ]);

    return {
      ...this.toStaffView(staff),
      recentActivity,
      activeSession,
    };
  }

  /** Create a tenant staff member (a `User` record) with a hashed password. */
  async createStaff(tenantId: string, dto: CreateStaffInput) {
    assertAssignableRole(dto.role);

    if (dto.branchId) {
      await this.assertBranchInTenant(tenantId, dto.branchId);
    }

    const hashedPassword = await bcrypt.hash(
      dto.password,
      PASSWORD_SALT_ROUNDS,
    );
    // Hash the PIN up front when supplied so the account is POS-ready on
    // creation; otherwise it stays null until set via PATCH /staff/:id/set-pin.
    const pinHash = dto.pin
      ? await bcrypt.hash(dto.pin, PIN_SALT_ROUNDS)
      : null;

    try {
      const created = await this.prisma.user.create({
        data: {
          tenantId,
          name: dto.name,
          username: dto.username,
          password: hashedPassword,
          role: dto.role,
          email: dto.email ?? null,
          phone: dto.phone ?? null,
          avatar: dto.avatar ?? null,
          branchId: dto.branchId ?? null,
          hasPosAccess: dto.hasPosAccess,
          pinHash,
        },
        select: STAFF_SELECT,
      });

      return this.toStaffView(created);
    } catch (error) {
      throw this.mapUniqueConstraint(error);
    }
  }

  /** Update mutable identity fields. Security flags use dedicated endpoints. */
  async updateStaff(
    tenantId: string,
    actorRole: UserRole,
    staffId: string,
    dto: UpdateStaffInput,
  ) {
    const target = await this.findStaffOrThrow(tenantId, staffId);

    // The actor must be allowed to manage this account, and to assign any new
    // role — blocks a manager from editing or escalating an admin account.
    assertCanManageRole(actorRole, target.role);
    if (dto.role) {
      assertCanManageRole(actorRole, dto.role);
    }
    if (dto.branchId) {
      await this.assertBranchInTenant(tenantId, dto.branchId);
    }

    const data: Prisma.UserUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.role !== undefined) data.role = dto.role;
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.avatar !== undefined) data.avatar = dto.avatar;
    if (dto.branchId !== undefined) {
      data.branch = dto.branchId
        ? { connect: { id: dto.branchId } }
        : { disconnect: true };
    }

    try {
      const updated = await this.prisma.user.update({
        where: { id: staffId },
        data,
        select: STAFF_SELECT,
      });
      return this.toStaffView(updated);
    } catch (error) {
      throw this.mapUniqueConstraint(error);
    }
  }

  /** Flip `isActive`. Deactivating also revokes POS access. */
  async toggleActive(tenantId: string, staffId: string) {
    const staff = await this.findStaffOrThrow(tenantId, staffId);
    const nextActive = !staff.isActive;

    // Never let the tenant deactivate its last remaining admin (lockout).
    if (!nextActive && staff.role === UserRole.ADMIN) {
      const otherActiveAdmins = await this.prisma.user.count({
        where: {
          tenantId,
          role: UserRole.ADMIN,
          isActive: true,
          id: { not: staffId },
        },
      });
      if (otherActiveAdmins === 0) {
        throw new BadRequestException(
          'Cannot deactivate the last active admin',
        );
      }
    }

    const updated = await this.prisma.user.update({
      where: { id: staffId },
      data: {
        isActive: nextActive,
        ...(nextActive ? {} : { hasPosAccess: false }),
      },
      select: STAFF_SELECT,
    });

    return this.toStaffView(updated);
  }

  /** Flip POS register access independently of `isActive`. */
  async togglePosAccess(
    tenantId: string,
    actorRole: UserRole,
    staffId: string,
  ) {
    const staff = await this.findStaffOrThrow(tenantId, staffId);
    assertCanManageRole(actorRole, staff.role);

    if (!staff.isActive && !staff.hasPosAccess) {
      throw new BadRequestException(
        'Cannot grant POS access to an inactive staff member',
      );
    }

    const updated = await this.prisma.user.update({
      where: { id: staffId },
      data: { hasPosAccess: !staff.hasPosAccess },
      select: STAFF_SELECT,
    });

    return this.toStaffView(updated);
  }

  /**
   * Set or reset a staff member's POS PIN, gated by the role hierarchy so a
   * manager cannot set a PIN on an admin account (which would let them
   * PIN-login with admin privileges).
   */
  async setPin(
    tenantId: string,
    actorRole: UserRole,
    staffId: string,
    pin: string,
  ): Promise<{ message: string }> {
    const staff = await this.findStaffOrThrow(tenantId, staffId);
    assertCanManageRole(actorRole, staff.role);

    const pinHash = await bcrypt.hash(pin, PIN_SALT_ROUNDS);
    await this.prisma.user.update({
      where: { id: staffId },
      data: { pinHash },
    });

    return { message: 'PIN updated successfully' };
  }

  /** Paginated activity log for a staff member, filterable by module and date. */
  async getActivityLogs(
    tenantId: string,
    staffId: string,
    query: StaffActivityQuery,
  ) {
    await this.findStaffOrThrow(tenantId, staffId);

    const { page, limit, skip } = this.resolvePagination(
      query.page,
      query.limit,
    );

    const where: Prisma.StaffActivityLogWhereInput = { staffId, tenantId };
    if (query.module) where.module = query.module;
    if (query.from || query.to) {
      where.createdAt = {
        ...(query.from ? { gte: query.from } : {}),
        ...(query.to ? { lte: query.to } : {}),
      };
    }

    const [totalCount, data] = await this.prisma.$transaction([
      this.prisma.staffActivityLog.count({ where }),
      this.prisma.staffActivityLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }

  /** Close an open POS session (idempotent). */
  async endSession(tenantId: string, sessionId: string) {
    const session = await this.prisma.staffSession.findFirst({
      where: { id: sessionId, tenantId },
      select: { id: true, isActive: true },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (!session.isActive) {
      return { id: session.id, isActive: false };
    }

    return this.prisma.staffSession.update({
      where: { id: sessionId },
      data: { isActive: false, endedAt: new Date() },
    });
  }

  // ─── Helpers ───

  private resolvePagination(rawPage?: number, rawLimit?: number) {
    const page = Math.max(rawPage ?? DEFAULT_PAGE, 1);
    const limit = Math.min(Math.max(rawLimit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
    return { page, limit, skip: (page - 1) * limit };
  }

  private async findStaffOrThrow(tenantId: string, staffId: string) {
    const staff = await this.prisma.user.findFirst({
      where: { id: staffId, tenantId },
      select: { id: true, role: true, isActive: true, hasPosAccess: true },
    });
    if (!staff) {
      throw new NotFoundException('Staff member not found');
    }
    return staff;
  }

  private async assertBranchInTenant(
    tenantId: string,
    branchId: string,
  ): Promise<void> {
    const branch = await this.prisma.branch.findFirst({
      where: { id: branchId, tenantId, isDeleted: false },
      select: { id: true },
    });
    if (!branch) {
      throw new BadRequestException('Branch not found for this tenant');
    }
  }

  private mapUniqueConstraint(error: unknown): Error {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      const target = Array.isArray(error.meta?.target)
        ? error.meta.target.join(', ')
        : 'field';
      return new ConflictException(`A user with this ${target} already exists`);
    }
    return error instanceof Error ? error : new Error(String(error));
  }

  private toStaffView<T extends { pinHash: string | null }>(
    user: T,
  ): Omit<T, 'pinHash'> & { isPinSet: boolean } {
    const { pinHash, ...rest } = user;
    return { ...rest, isPinSet: Boolean(pinHash) };
  }
}
