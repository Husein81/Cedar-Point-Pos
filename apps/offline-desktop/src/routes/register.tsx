import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button, Icon, Input, Shad, Skeleton } from "@repo/ui";
import {
  useCashMovement,
  useCloseShift,
  useCurrentShift,
  useOpenShift,
  useShifts,
} from "@/hooks/useShift";
import { useSettings } from "@/hooks/useSettings";
import { CashMovementType, ShiftStatus } from "@/shared/enums";
import { formatDate, formatMoney } from "@/utils/format";

export const Route = createFileRoute("/register")({
  component: RegisterPage,
});

function RegisterPage() {
  const { data: currentShift, isLoading } = useCurrentShift();
  const { data: shifts } = useShifts();
  const { data: settings } = useSettings();

  const openShift = useOpenShift();
  const closeShift = useCloseShift();
  const cashMovement = useCashMovement();

  const [openingFloat, setOpeningFloat] = useState("");
  const [actualCash, setActualCash] = useState("");
  const [movementAmount, setMovementAmount] = useState("");
  const [movementReason, setMovementReason] = useState("");

  const currencySymbol = settings?.currencySymbol ?? "$";

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Cash Register</h1>
        <p className="text-sm text-muted-foreground">
          Open and close shifts, track cash in the drawer
        </p>
      </div>

      {currentShift ? (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Current shift */}
          <Shad.Card>
            <Shad.CardHeader>
              <Shad.CardTitle className="flex items-center gap-2">
                <Icon name="Banknote" className="w-4 h-4" />
                Open Shift
              </Shad.CardTitle>
              <Shad.CardDescription>
                Opened {formatDate(currentShift.openedAt)} by{" "}
                {currentShift.userName ?? "Unknown"}
              </Shad.CardDescription>
            </Shad.CardHeader>
            <Shad.CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Opening float</p>
                  <p className="font-semibold text-lg">
                    {formatMoney(currentShift.openingFloat, currencySymbol)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Expected in drawer</p>
                  <p className="font-semibold text-lg">
                    {formatMoney(
                      currentShift.expectedCash ?? currentShift.openingFloat,
                      currencySymbol,
                    )}
                  </p>
                </div>
              </div>

              {/* Cash in / out */}
              <div className="space-y-2 border-t pt-4">
                <p className="text-sm font-medium">Cash movement</p>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Amount"
                    value={movementAmount}
                    onChange={(e) => setMovementAmount(e.target.value)}
                  />
                  <Input
                    placeholder="Reason"
                    value={movementReason}
                    onChange={(e) => setMovementReason(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    disabled={
                      !Number(movementAmount) ||
                      !movementReason ||
                      cashMovement.isPending
                    }
                    onClick={async () => {
                      await cashMovement.mutateAsync({
                        type: CashMovementType.CASH_IN,
                        amount: Number(movementAmount),
                        reason: movementReason,
                      });
                      setMovementAmount("");
                      setMovementReason("");
                    }}
                  >
                    <Icon name="ArrowDownToLine" className="w-4 h-4" />
                    Cash In
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    disabled={
                      !Number(movementAmount) ||
                      !movementReason ||
                      cashMovement.isPending
                    }
                    onClick={async () => {
                      await cashMovement.mutateAsync({
                        type: CashMovementType.CASH_OUT,
                        amount: Number(movementAmount),
                        reason: movementReason,
                      });
                      setMovementAmount("");
                      setMovementReason("");
                    }}
                  >
                    <Icon name="ArrowUpFromLine" className="w-4 h-4" />
                    Cash Out
                  </Button>
                </div>
              </div>
            </Shad.CardContent>
          </Shad.Card>

          {/* Close shift */}
          <Shad.Card>
            <Shad.CardHeader>
              <Shad.CardTitle>Close Shift</Shad.CardTitle>
              <Shad.CardDescription>
                Count the drawer and enter the actual cash amount
              </Shad.CardDescription>
            </Shad.CardHeader>
            <Shad.CardContent className="space-y-4">
              <Input
                type="number"
                step="0.01"
                placeholder="Actual cash counted"
                value={actualCash}
                onChange={(e) => setActualCash(e.target.value)}
                className="h-12 text-lg text-right"
              />
              <Button
                variant="destructive"
                className="w-full"
                disabled={actualCash === "" || closeShift.isPending}
                isSubmitting={closeShift.isPending}
                onClick={async () => {
                  await closeShift.mutateAsync({
                    actualCash: Number(actualCash),
                    note: null,
                  });
                  setActualCash("");
                }}
              >
                Close Shift
              </Button>
            </Shad.CardContent>
          </Shad.Card>
        </div>
      ) : (
        /* No open shift */
        <Shad.Card className="max-w-md">
          <Shad.CardHeader>
            <Shad.CardTitle>Open a Shift</Shad.CardTitle>
            <Shad.CardDescription>
              Enter the opening cash float to start selling
            </Shad.CardDescription>
          </Shad.CardHeader>
          <Shad.CardContent className="space-y-4">
            <Input
              type="number"
              step="0.01"
              placeholder="Opening float"
              value={openingFloat}
              onChange={(e) => setOpeningFloat(e.target.value)}
              className="h-12 text-lg text-right"
              autoFocus
            />
            <Button
              className="w-full"
              disabled={openingFloat === "" || openShift.isPending}
              isSubmitting={openShift.isPending}
              onClick={async () => {
                await openShift.mutateAsync({
                  openingFloat: Number(openingFloat),
                  note: null,
                });
                setOpeningFloat("");
              }}
            >
              Open Shift
            </Button>
          </Shad.CardContent>
        </Shad.Card>
      )}

      {/* Shift history */}
      {shifts && shifts.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Shift History</h2>
          <div className="rounded-md border">
            <Shad.Table>
              <Shad.TableHeader>
                <Shad.TableRow>
                  <Shad.TableHead>Opened</Shad.TableHead>
                  <Shad.TableHead>Closed</Shad.TableHead>
                  <Shad.TableHead>Cashier</Shad.TableHead>
                  <Shad.TableHead className="text-right">Float</Shad.TableHead>
                  <Shad.TableHead className="text-right">
                    Expected
                  </Shad.TableHead>
                  <Shad.TableHead className="text-right">Actual</Shad.TableHead>
                  <Shad.TableHead className="text-right">
                    Difference
                  </Shad.TableHead>
                </Shad.TableRow>
              </Shad.TableHeader>
              <Shad.TableBody>
                {shifts.map((shift) => (
                  <Shad.TableRow key={shift.id}>
                    <Shad.TableCell>
                      {formatDate(shift.openedAt)}
                    </Shad.TableCell>
                    <Shad.TableCell>
                      {shift.closedAt ? formatDate(shift.closedAt) : "—"}
                    </Shad.TableCell>
                    <Shad.TableCell>{shift.userName ?? "—"}</Shad.TableCell>
                    <Shad.TableCell className="text-right">
                      {formatMoney(shift.openingFloat, currencySymbol)}
                    </Shad.TableCell>
                    <Shad.TableCell className="text-right">
                      {shift.expectedCash !== null
                        ? formatMoney(shift.expectedCash, currencySymbol)
                        : "—"}
                    </Shad.TableCell>
                    <Shad.TableCell className="text-right">
                      {shift.actualCash !== null
                        ? formatMoney(shift.actualCash, currencySymbol)
                        : "—"}
                    </Shad.TableCell>
                    <Shad.TableCell className="text-right">
                      {shift.status === ShiftStatus.CLOSED &&
                      shift.difference !== null ? (
                        <span
                          className={
                            shift.difference === 0
                              ? "text-green-600"
                              : "text-destructive"
                          }
                        >
                          {shift.difference > 0 ? "+" : ""}
                          {formatMoney(shift.difference, currencySymbol)}
                        </span>
                      ) : (
                        "—"
                      )}
                    </Shad.TableCell>
                  </Shad.TableRow>
                ))}
              </Shad.TableBody>
            </Shad.Table>
          </div>
        </div>
      )}
    </div>
  );
}
