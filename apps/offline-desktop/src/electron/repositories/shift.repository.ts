import type Database from "better-sqlite3";
import type { CashMovement, Shift } from "../../shared/models";

const SELECT_SHIFT = `
  SELECT s.*, u.name AS userName
  FROM shifts s
  LEFT JOIN users u ON u.id = s.userId
`;

export class ShiftRepository {
  constructor(private readonly db: Database.Database) {}

  findOpen(): Shift | null {
    return (
      this.db
        .prepare<[], Shift>(`${SELECT_SHIFT} WHERE s.status = 'OPEN' LIMIT 1`)
        .get() ?? null
    );
  }

  findById(id: string): Shift | null {
    return (
      this.db
        .prepare<[string], Shift>(`${SELECT_SHIFT} WHERE s.id = ?`)
        .get(id) ?? null
    );
  }

  list(): Shift[] {
    return this.db
      .prepare<[], Shift>(`${SELECT_SHIFT} ORDER BY s.openedAt DESC LIMIT 100`)
      .all();
  }

  insert(shift: Shift): void {
    this.db
      .prepare(
        `INSERT INTO shifts (id, userId, status, openingFloat, expectedCash, actualCash,
            difference, note, openedAt, closedAt)
         VALUES (@id, @userId, @status, @openingFloat, @expectedCash, @actualCash,
            @difference, @note, @openedAt, @closedAt)`,
      )
      .run(shift);
  }

  update(shift: Shift): void {
    this.db
      .prepare(
        `UPDATE shifts
         SET status = @status, expectedCash = @expectedCash, actualCash = @actualCash,
             difference = @difference, note = @note, closedAt = @closedAt
         WHERE id = @id`,
      )
      .run(shift);
  }

  insertCashMovement(movement: CashMovement): void {
    this.db
      .prepare(
        `INSERT INTO cash_movements (id, shiftId, type, amount, reason, userId, createdAt)
         VALUES (@id, @shiftId, @type, @amount, @reason, @userId, @createdAt)`,
      )
      .run(movement);
  }

  cashMovementsFor(shiftId: string): CashMovement[] {
    return this.db
      .prepare<[string], CashMovement>(
        "SELECT * FROM cash_movements WHERE shiftId = ? ORDER BY createdAt",
      )
      .all(shiftId);
  }

  // Expected cash = opening float + cash-affecting movements during the shift.
  expectedCashFor(shiftId: string): number {
    const shift = this.findById(shiftId);
    if (!shift) return 0;

    const row = this.db
      .prepare<[string], { total: number | null }>(
        `SELECT SUM(CASE
            WHEN type IN ('CASH_IN','SALE') THEN amount
            WHEN type IN ('CASH_OUT','REFUND') THEN -amount
            ELSE 0 END) AS total
         FROM cash_movements WHERE shiftId = ?`,
      )
      .get(shiftId);

    return shift.openingFloat + (row?.total ?? 0);
  }
}
