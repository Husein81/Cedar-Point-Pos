import {
  Controller,
  Post,
  Req,
  Headers,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { SyncService } from './sync.service.js';
import type { SyncBatch } from './dto/sync.dto.js';
import { DevicesService } from '../devices/devices.service.js';
import { DeviceAuthGuard } from '../common/guards/device-auth.guard.js';

@Controller('sync')
@UseGuards(DeviceAuthGuard)
export class SyncController {
  constructor(
    private readonly syncService: SyncService,
    private readonly devicesService: DevicesService,
  ) {}

  /**
   * POST /sync/push
   * Receives sync batch from POS device
   *
   * Headers:
   * - X-Device-Token: Device authentication token
   *
   * Body: SyncBatch
   * {
   *   orders?: Order[],
   *   payments?: Payment[],
   *   inventoryHistory?: InventoryHistory[],
   *   shifts?: Shift[],
   *   customers?: Customer[]
   * }
   *
   * Response: SyncResponse
   * {
   *   success: boolean,
   *   synced: { orders?: string[], payments?: string[], ... },
   *   conflicts: { orders?: string[], payments?: string[], ... },
   *   errors?: Array<{ entityType, entityId, error }>
   * }
   */
  @Post('push')
  @HttpCode(HttpStatus.OK)
  async pushSync(
    @Headers('x-device-token') deviceToken: string,
    @Req() req: Request,
  ) {
    if (!deviceToken) {
      throw new Error('Device token required');
    }

    const batch = req.body as SyncBatch;

    // Validate batch is not empty
    const hasData =
      (batch.orders && batch.orders.length > 0) ||
      (batch.payments && batch.payments.length > 0) ||
      (batch.inventoryHistory && batch.inventoryHistory.length > 0) ||
      (batch.shifts && batch.shifts.length > 0) ||
      (batch.customers && batch.customers.length > 0);

    if (!hasData) {
      return {
        success: true,
        synced: {},
        conflicts: {},
        errors: [],
      };
    }

    return await this.syncService.processSyncBatch(deviceToken, batch);
  }

  /**
   * POST /sync/pull
   * Pulls latest data from server (for initial sync or catch-up)
   *
   * Headers:
   * - X-Device-Token: Device authentication token
   *
   * Query params:
   * - lastSyncTime: ISO timestamp of last successful sync
   *
   * Response: SyncBatch with server data
   */
  @Post('pull')
  @HttpCode(HttpStatus.OK)
  async pullSync(
    @Headers('x-device-token') deviceToken: string,
    @Req() req: Request,
  ) {
    if (!deviceToken) {
      throw new Error('Device token required');
    }

    const device = await this.devicesService.validateDeviceToken(deviceToken);
    if (!device || !device.isActive) {
      throw new Error('Invalid or inactive device token');
    }

    const lastSyncTime = req.query.lastSyncTime as string;
    const since = lastSyncTime ? new Date(lastSyncTime) : null;

    console.log(since);
    // Implement pull logic to fetch data changed since lastSyncTime
    const updates = await this.syncService.pullUpdates(device.tenantId, since);

    return {
      orders: [], // We don't pull orders yet
      payments: [], // We don't pull payments yet
      inventoryHistory: [], // We don't pull inventory history yet
      shifts: updates.shifts,
      customers: updates.customers,
    };
  }

  /**
   * POST /sync/ack
   * Acknowledges successful sync (optional, for tracking)
   */
  @Post('ack')
  @HttpCode(HttpStatus.OK)
  async acknowledgeSync(
    @Headers('x-device-token') deviceToken: string,
    @Req() req: Request,
  ) {
    if (!deviceToken) {
      throw new Error('Device token required');
    }

    const { syncedIds } = req.body as { syncedIds: string[] };
    console.log('Acknowledged synced IDs:', syncedIds);
    // Update device lastSync timestamp
    const device = await this.devicesService.validateDeviceToken(deviceToken);
    if (device) {
      // Device lastSync is updated in processSyncBatch
      // This endpoint is for explicit acknowledgment if needed
    }

    return { success: true };
  }
}
