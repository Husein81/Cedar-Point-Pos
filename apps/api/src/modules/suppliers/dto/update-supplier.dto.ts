/**
 * Shape of the update-supplier request body.
 *
 * The suppliers controller reads and forwards `req.body` directly, so this is a
 * type contract for the service layer — not a validated request DTO.
 */
export interface UpdateSupplierDto {
  name?: string;
  companyName?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  category?: string | null;
  notes?: string | null;
  currentBalance?: number;
}
