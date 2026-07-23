import type { Shift } from "../../shared/models";
import { CashMovementType, ShiftStatus } from "../../shared/enums";
import type {
  CashMovementInput,
  CloseShiftInput,
  OpenShiftInput,
} from "../../shared/schemas";
import { roundMoney } from "../../shared/financial";
import type { ShiftRepository } from "../repositories/shift.repository";
import { ConflictError, NotFoundError } from "../core/errors";
import { newId, nowIso } from "../core/id";
import type { SessionContext } from "./session-context";

export class ShiftsService {
  constructor(
    private readonly shifts: ShiftRepository,
    private readonly session: SessionContext,
  ) {}

  current(): Shift | null {
    const shift = this.shifts.findOpen();
    if (!shift) return null;
    return { ...shift, expectedCash: this.shifts.expectedCashFor(shift.id) };
  }

  open(input: OpenShiftInput): Shift {
    const userId = this.session.requireUserId();

    if (this.shifts.findOpen()) {
      throw new ConflictError("A shift is already open", "SHIFT_ALREADY_OPEN");
    }

    const now = nowIso();
    const shift: Shift = {
      id: newId(),
      userId,
      userName: null,
      status: ShiftStatus.OPEN,
      openingFloat: input.openingFloat,
      expectedCash: null,
      actualCash: null,
      difference: null,
      note: input.note,
      openedAt: now,
      closedAt: null,
    };

    this.shifts.insert(shift);
    this.shifts.insertCashMovement({
      id: newId(),
      shiftId: shift.id,
      type: CashMovementType.OPENING_FLOAT,
      amount: input.openingFloat,
      reason: "Opening float",
      userId,
      createdAt: now,
    });

    return this.shifts.findById(shift.id) ?? shift;
  }

  close(input: CloseShiftInput): Shift {
    this.session.requireUserId();

    const shift = this.shifts.findOpen();
    if (!shift) throw new NotFoundError("Open shift");

    // expectedCashFor = openingFloat + cash-affecting movements
    // (OPENING_FLOAT rows are excluded from the movement sum, so no double count).
    const expected = roundMoney(this.shifts.expectedCashFor(shift.id));

    const closed: Shift = {
      ...shift,
      status: ShiftStatus.CLOSED,
      expectedCash: expected,
      actualCash: input.actualCash,
      difference: roundMoney(input.actualCash - expected),
      note: input.note ?? shift.note,
      closedAt: nowIso(),
    };
    this.shifts.update(closed);
    return closed;
  }

  cashMovement(input: CashMovementInput): Shift {
    const userId = this.session.requireUserId();

    const shift = this.shifts.findOpen();
    if (!shift) throw new NotFoundError("Open shift");

    this.shifts.insertCashMovement({
      id: newId(),
      shiftId: shift.id,
      type: input.type,
      amount: input.amount,
      reason: input.reason,
      userId,
      createdAt: nowIso(),
    });

    const current = this.current();
    if (!current) throw new NotFoundError("Open shift");
    return current;
  }

  list(): Shift[] {
    return this.shifts.list();
  }
}
