import { TransferStatus } from '@repo/db';

export type UpdateTransferDto = {
  status?: TransferStatus;
  notes?: string;
};
