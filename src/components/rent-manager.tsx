"use client";

import type React from "react";
import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  CheckCircle,
  Clock,
  Edit,
  IndianRupee,
  Loader2,
  Package,
  Plus,
  Search,
  XCircle
} from "lucide-react";
import { toast } from "sonner";

import { closeRentalAction, createRentalAction } from "@/app/actions/rentals";
import { ProductIcon } from "@/components/product-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { RentableMachineRecord, RentalRecord } from "@/lib/types";
import {
  calculateRentalCalendarDays,
  cn,
  formatCurrency,
  formatDateTime
} from "@/lib/utils";

type RentalFormState = {
  productId: string;
  customerName: string;
  customerPhone: string;
  deposit: string;
  dailyRent: string;
  paymentMode: "CASH" | "UPI";
  note: string;
};

function defaultForm(machine?: RentableMachineRecord | null): RentalFormState {
  return {
    productId: machine?.id ?? "",
    customerName: "",
    customerPhone: "",
    deposit: String(machine?.defaultRentDeposit ?? 0),
    dailyRent: String(machine?.defaultDailyRent ?? 0),
    paymentMode: "CASH",
    note: ""
  };
}

function machineMatchesSearch(machine: RentableMachineRecord, search: string) {
  const haystack = [machine.title, machine.sku, machine.brand, machine.category].filter(Boolean).join(" ").toLowerCase();

  return haystack.includes(search.toLowerCase());
}

function customerLabel(rental: RentalRecord) {
  return [rental.customerName, rental.customerPhone].filter(Boolean).join(" / ") || "Walk-in";
}

function paymentModeLabel(mode: RentalRecord["paymentMode"] | RentalFormState["paymentMode"]) {
  return mode === "UPI" ? "UPI" : "Cash";
}

function currentRentalTotals(rental: RentalRecord) {
  const days = calculateRentalCalendarDays(rental.startedAt);
  const rent = days * rental.dailyRent;

  return {
    days,
    rent,
    balance: rental.deposit - rent
  };
}

function MachineCard({
  machine,
  onStart
}: {
  machine: RentableMachineRecord;
  onStart: (machine: RentableMachineRecord) => void;
}) {
  const available = machine.availableForRent > 0;

  return (
    <article
      className={cn(
        "grid gap-4 rounded-lg border bg-card p-4",
        !available && "border-red-200 bg-red-50/50 dark:border-red-950 dark:bg-red-950/20"
      )}
    >
      <div className="flex min-w-0 gap-3">
        <ProductIcon
          title={machine.title}
          brand={machine.brand}
          category={machine.category}
          href={`/products/${machine.id}`}
          className="size-14"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <Link
                href={`/products/${machine.id}`}
                className="block break-words text-sm font-semibold leading-5 hover:text-primary"
              >
                {machine.title}
              </Link>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Badge variant="outline">{machine.sku}</Badge>
                <Badge variant={available ? "success" : "danger"}>
                  {available ? `${machine.availableForRent} available` : "Not available for rent"}
                </Badge>
              </div>
            </div>
          </div>
          {[machine.brand, machine.category].filter(Boolean).length ? (
            <p className="mt-2 break-words text-xs text-muted-foreground">
              {[machine.brand, machine.category].filter(Boolean).join(" / ")}
            </p>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 rounded-md bg-muted/50 p-2 text-center">
        <div className="min-w-0">
          <p className="text-[11px] uppercase text-muted-foreground">Total</p>
          <p className="truncate text-sm font-semibold">{machine.quantity}</p>
        </div>
        <div className="min-w-0">
          <p className="text-[11px] uppercase text-muted-foreground">On Rent</p>
          <p className="truncate text-sm font-semibold">{machine.openRentals}</p>
        </div>
        <div className="min-w-0">
          <p className="text-[11px] uppercase text-muted-foreground">Daily</p>
          <p className="truncate text-sm font-semibold">{formatCurrency(machine.defaultDailyRent ?? 0)}</p>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <Button type="button" disabled={!available} onClick={() => onStart(machine)}>
          <Plus />
          Start Rent
        </Button>
        <Button asChild variant="outline">
          <Link href={`/products/${machine.id}/edit`}>
            <Edit />
            Edit Qty
          </Link>
        </Button>
      </div>
    </article>
  );
}

function MobileField({ label, value, danger = false }: { label: string; value: React.ReactNode; danger?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] uppercase text-muted-foreground">{label}</p>
      <div className={cn("mt-1 break-words text-sm font-medium", danger && "text-red-600")}>{value}</div>
    </div>
  );
}

function OpenRentalRow({
  rental,
  onClose
}: {
  rental: RentalRecord;
  onClose: (rental: RentalRecord) => void;
}) {
  const totals = currentRentalTotals(rental);

  return (
    <TableRow>
      <TableCell>
        <div className="min-w-52">
          <p className="font-medium">{rental.machineTitle}</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <Badge variant="outline">{rental.machineSku}</Badge>
            <Badge variant="warning">{totals.days} day{totals.days === 1 ? "" : "s"}</Badge>
          </div>
        </div>
      </TableCell>
      <TableCell>{customerLabel(rental)}</TableCell>
      <TableCell>{formatDateTime(rental.startedAt)}</TableCell>
      <TableCell>{paymentModeLabel(rental.paymentMode)}</TableCell>
      <TableCell>{formatCurrency(rental.dailyRent)}</TableCell>
      <TableCell>{formatCurrency(rental.deposit)}</TableCell>
      <TableCell className="font-medium">{formatCurrency(totals.rent)}</TableCell>
      <TableCell>
        <span className={cn("font-medium", totals.balance < 0 && "text-red-600")}>
          {formatCurrency(totals.balance)}
        </span>
      </TableCell>
      <TableCell className="text-right">
        <Button type="button" size="sm" onClick={() => onClose(rental)}>
          <CheckCircle />
          Finish
        </Button>
      </TableCell>
    </TableRow>
  );
}

function OpenRentalMobileItem({
  rental,
  onClose
}: {
  rental: RentalRecord;
  onClose: (rental: RentalRecord) => void;
}) {
  const totals = currentRentalTotals(rental);

  return (
    <article className="grid gap-3 border-b py-4 last:border-0">
      <div className="min-w-0">
        <p className="break-words text-sm font-semibold">{rental.machineTitle}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Badge variant="outline">{rental.machineSku}</Badge>
          <Badge variant="warning">
            {totals.days} day{totals.days === 1 ? "" : "s"}
          </Badge>
          <Badge variant="secondary">{paymentModeLabel(rental.paymentMode)}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <MobileField label="Customer" value={customerLabel(rental)} />
        <MobileField label="Started" value={formatDateTime(rental.startedAt)} />
        <MobileField label="Daily" value={formatCurrency(rental.dailyRent)} />
        <MobileField label="Deposit" value={formatCurrency(rental.deposit)} />
        <MobileField label="Rent" value={formatCurrency(totals.rent)} />
        <MobileField label="Balance" value={formatCurrency(totals.balance)} danger={totals.balance < 0} />
      </div>

      <Button type="button" size="sm" className="w-full" onClick={() => onClose(rental)}>
        <CheckCircle />
        Finish
      </Button>
    </article>
  );
}

function ClosedRentalRow({ rental }: { rental: RentalRecord }) {
  return (
    <TableRow>
      <TableCell>
        <div className="min-w-52">
          <p className="font-medium">{rental.machineTitle}</p>
          <Badge variant="outline" className="mt-1">
            {rental.machineSku}
          </Badge>
        </div>
      </TableCell>
      <TableCell>{customerLabel(rental)}</TableCell>
      <TableCell>{formatDateTime(rental.startedAt)}</TableCell>
      <TableCell>{rental.closedAt ? formatDateTime(rental.closedAt) : "-"}</TableCell>
      <TableCell>{paymentModeLabel(rental.paymentMode)}</TableCell>
      <TableCell>{rental.calendarDays ?? 0}</TableCell>
      <TableCell>{formatCurrency(rental.rentTotal ?? 0)}</TableCell>
      <TableCell>
        <span className={cn("font-medium", (rental.depositBalance ?? 0) < 0 && "text-red-600")}>
          {formatCurrency(rental.depositBalance ?? 0)}
        </span>
      </TableCell>
    </TableRow>
  );
}

function ClosedRentalMobileItem({ rental }: { rental: RentalRecord }) {
  const balance = rental.depositBalance ?? 0;

  return (
    <article className="grid gap-3 border-b py-4 last:border-0">
      <div className="min-w-0">
        <p className="break-words text-sm font-semibold">{rental.machineTitle}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Badge variant="outline">{rental.machineSku}</Badge>
          <Badge variant="secondary">{paymentModeLabel(rental.paymentMode)}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <MobileField label="Customer" value={customerLabel(rental)} />
        <MobileField label="Days" value={rental.calendarDays ?? 0} />
        <MobileField label="Started" value={formatDateTime(rental.startedAt)} />
        <MobileField label="Closed" value={rental.closedAt ? formatDateTime(rental.closedAt) : "-"} />
        <MobileField label="Rent" value={formatCurrency(rental.rentTotal ?? 0)} />
        <MobileField label="Balance" value={formatCurrency(balance)} danger={balance < 0} />
      </div>
    </article>
  );
}

export function RentManager({
  machines,
  rentals
}: {
  machines: RentableMachineRecord[];
  rentals: RentalRecord[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formState, setFormState] = useState<RentalFormState>(() => defaultForm(machines.find((machine) => machine.availableForRent > 0)));
  const [startedAtPreview, setStartedAtPreview] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [closeTarget, setCloseTarget] = useState<RentalRecord | null>(null);
  const [isPending, startTransition] = useTransition();

  const availableMachines = useMemo(() => machines.filter((machine) => machine.availableForRent > 0), [machines]);
  const filteredMachines = useMemo(
    () => machines.filter((machine) => !search || machineMatchesSearch(machine, search)),
    [machines, search]
  );
  const openRentals = useMemo(() => rentals.filter((rental) => rental.status === "OPEN"), [rentals]);
  const closedRentals = useMemo(() => rentals.filter((rental) => rental.status === "CLOSED"), [rentals]);
  const selectedMachine = machines.find((machine) => machine.id === formState.productId) ?? null;
  const closeTotals = closeTarget ? currentRentalTotals(closeTarget) : null;

  const updateForm = (field: keyof RentalFormState, value: string) => {
    setFormState((current) => ({
      ...current,
      [field]: value
    }));
  };

  const openCreateDialog = (machine?: RentableMachineRecord) => {
    const target = machine ?? availableMachines[0] ?? machines[0] ?? null;

    setFormState(defaultForm(target));
    setStartedAtPreview(formatDateTime(new Date()));
    setFieldErrors({});
    setDialogOpen(true);
  };

  const changeSelectedMachine = (machineId: string) => {
    const machine = machines.find((item) => item.id === machineId);

    setFormState((current) => ({
      ...current,
      productId: machineId,
      deposit: String(machine?.defaultRentDeposit ?? current.deposit),
      dailyRent: String(machine?.defaultDailyRent ?? current.dailyRent)
    }));
  };

  const submitRental = () => {
    startTransition(async () => {
      const result = await createRentalAction({
        productId: formState.productId,
        customerName: formState.customerName,
        customerPhone: formState.customerPhone,
        deposit: Number(formState.deposit),
        dailyRent: Number(formState.dailyRent),
        paymentMode: formState.paymentMode,
        note: formState.note
      });

      if (!result.ok) {
        setFieldErrors(result.fieldErrors ?? {});
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      setDialogOpen(false);
      router.refresh();
    });
  };

  const closeRental = () => {
    if (!closeTarget) {
      return;
    }

    const target = closeTarget;
    startTransition(async () => {
      const result = await closeRentalAction(target.id);

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      setCloseTarget(null);
      router.refresh();
    });
  };

  return (
    <div className="grid gap-5">
      <div className="flex flex-col gap-3 rounded-lg border bg-card p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-9"
            placeholder="Search machines, SKU, brand"
          />
        </div>
        <Button type="button" disabled={!availableMachines.length} onClick={() => openCreateDialog()} className="w-full sm:w-auto">
          <Plus />
          Start Rent
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filteredMachines.length ? (
          filteredMachines.map((machine) => <MachineCard key={machine.id} machine={machine} onStart={openCreateDialog} />)
        ) : (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground md:col-span-2 xl:col-span-3">
            No rentable machines match the current search.
          </div>
        )}
      </div>

      <Tabs defaultValue="open">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList className="grid w-full grid-cols-2 sm:inline-flex sm:w-auto">
            <TabsTrigger value="open">
              <Clock className="mr-2 size-4" />
              Open
            </TabsTrigger>
            <TabsTrigger value="closed">
              <CalendarDays className="mr-2 size-4" />
              Closed
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="open">
          <Card>
            <CardHeader className="p-4 pb-2 sm:p-5 sm:pb-3">
              <CardTitle>Open Rentals</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {openRentals.length ? (
                <>
                  <div className="grid px-4 md:hidden">
                    {openRentals.map((rental) => (
                      <OpenRentalMobileItem key={rental.id} rental={rental} onClose={setCloseTarget} />
                    ))}
                  </div>
                  <div className="hidden md:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Machine</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Started</TableHead>
                          <TableHead>Payment</TableHead>
                          <TableHead>Daily</TableHead>
                          <TableHead>Deposit</TableHead>
                          <TableHead>Rent</TableHead>
                          <TableHead>Balance</TableHead>
                          <TableHead />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {openRentals.map((rental) => (
                          <OpenRentalRow key={rental.id} rental={rental} onClose={setCloseTarget} />
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              ) : (
                <div className="grid place-items-center gap-3 px-4 py-12 text-center">
                  <Package className="size-10 text-muted-foreground" />
                  <p className="text-sm font-medium">No open rentals</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="closed">
          <Card>
            <CardHeader className="p-4 pb-2 sm:p-5 sm:pb-3">
              <CardTitle>Closed Rentals</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {closedRentals.length ? (
                <>
                  <div className="grid px-4 md:hidden">
                    {closedRentals.map((rental) => (
                      <ClosedRentalMobileItem key={rental.id} rental={rental} />
                    ))}
                  </div>
                  <div className="hidden md:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Machine</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Started</TableHead>
                          <TableHead>Closed</TableHead>
                          <TableHead>Payment</TableHead>
                          <TableHead>Days</TableHead>
                          <TableHead>Rent</TableHead>
                          <TableHead>Balance</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {closedRentals.map((rental) => (
                          <ClosedRentalRow key={rental.id} rental={rental} />
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              ) : (
                <div className="grid place-items-center gap-3 px-4 py-12 text-center">
                  <CheckCircle className="size-10 text-muted-foreground" />
                  <p className="text-sm font-medium">No closed rentals</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[calc(100dvh-1rem)] overflow-y-auto p-4 sm:max-w-xl sm:p-5">
          <DialogHeader>
            <DialogTitle>Start Rent</DialogTitle>
            <DialogDescription>Started at {startedAtPreview || "Now"}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="machine">Machine</Label>
              <Select value={formState.productId} onValueChange={changeSelectedMachine}>
                <SelectTrigger id="machine">
                  <SelectValue placeholder="Choose machine" />
                </SelectTrigger>
                <SelectContent>
                  {machines.map((machine) => (
                    <SelectItem key={machine.id} value={machine.id} disabled={machine.availableForRent <= 0}>
                      {machine.title} ({machine.availableForRent} available)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldErrors.productId?.[0] ? <p className="text-xs text-red-600">{fieldErrors.productId[0]}</p> : null}
            </div>

            {selectedMachine ? (
              <div
                className={cn(
                  "grid gap-2 rounded-lg border p-3",
                  selectedMachine.availableForRent <= 0 && "border-red-200 bg-red-50 dark:border-red-950 dark:bg-red-950/20"
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium">{selectedMachine.title}</span>
                  <Badge variant={selectedMachine.availableForRent > 0 ? "success" : "danger"}>
                    {selectedMachine.availableForRent > 0 ? `${selectedMachine.availableForRent} available` : "Not available"}
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                  <span>Total {selectedMachine.quantity}</span>
                  <span>On rent {selectedMachine.openRentals}</span>
                  <span>SKU {selectedMachine.sku}</span>
                </div>
              </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="customerName">Customer Name</Label>
                <Input
                  id="customerName"
                  value={formState.customerName}
                  onChange={(event) => updateForm("customerName", event.target.value)}
                  placeholder="Walk-in"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="customerPhone">Customer Phone</Label>
                <Input
                  id="customerPhone"
                  value={formState.customerPhone}
                  onChange={(event) => updateForm("customerPhone", event.target.value)}
                  placeholder="Mobile number"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="deposit">Deposit</Label>
                <Input
                  id="deposit"
                  type="number"
                  min={0}
                  step="0.01"
                  value={formState.deposit}
                  onChange={(event) => updateForm("deposit", event.target.value)}
                />
                {fieldErrors.deposit?.[0] ? <p className="text-xs text-red-600">{fieldErrors.deposit[0]}</p> : null}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="dailyRent">Daily Rent</Label>
                <Input
                  id="dailyRent"
                  type="number"
                  min={0}
                  step="0.01"
                  value={formState.dailyRent}
                  onChange={(event) => updateForm("dailyRent", event.target.value)}
                />
                {fieldErrors.dailyRent?.[0] ? <p className="text-xs text-red-600">{fieldErrors.dailyRent[0]}</p> : null}
              </div>

              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="paymentMode">Payment Mode</Label>
                <Select
                  value={formState.paymentMode}
                  onValueChange={(value) => updateForm("paymentMode", value as RentalFormState["paymentMode"])}
                >
                  <SelectTrigger id="paymentMode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="UPI">UPI</SelectItem>
                  </SelectContent>
                </Select>
                {fieldErrors.paymentMode?.[0] ? <p className="text-xs text-red-600">{fieldErrors.paymentMode[0]}</p> : null}
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="rentNote">Note</Label>
              <Textarea
                id="rentNote"
                value={formState.note}
                onChange={(event) => updateForm("note", event.target.value)}
                placeholder="Accessories, condition, or ID proof"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button type="button" onClick={submitRental} disabled={isPending || !availableMachines.length} className="w-full sm:w-auto">
              {isPending ? <Loader2 className="animate-spin" /> : <IndianRupee />}
              Start
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(closeTarget)} onOpenChange={(open) => !open && setCloseTarget(null)}>
        <DialogContent className="max-h-[calc(100dvh-1rem)] overflow-y-auto p-4 sm:p-5">
          <DialogHeader>
            <DialogTitle>Close Rent</DialogTitle>
            <DialogDescription>{closeTarget?.machineTitle}</DialogDescription>
          </DialogHeader>

          {closeTarget && closeTotals ? (
            <div className="grid gap-3">
              <div className="grid grid-cols-2 gap-2 rounded-lg border bg-muted/40 p-3">
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Calendar Days</p>
                  <p className="mt-1 text-lg font-semibold">{closeTotals.days}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Rent</p>
                  <p className="mt-1 text-lg font-semibold">{formatCurrency(closeTotals.rent)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Deposit</p>
                  <p className="mt-1 text-lg font-semibold">{formatCurrency(closeTarget.deposit)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Balance</p>
                  <p className={cn("mt-1 text-lg font-semibold", closeTotals.balance < 0 && "text-red-600")}>
                    {formatCurrency(closeTotals.balance)}
                  </p>
                </div>
              </div>
              {closeTotals.balance < 0 ? (
                <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-950 dark:bg-red-950/30 dark:text-red-300">
                  <XCircle className="size-4" />
                  Extra due: {formatCurrency(Math.abs(closeTotals.balance))}
                </div>
              ) : null}
            </div>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCloseTarget(null)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button type="button" onClick={closeRental} disabled={isPending} className="w-full sm:w-auto">
              {isPending ? <Loader2 className="animate-spin" /> : <CheckCircle />}
              Close Rent
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
