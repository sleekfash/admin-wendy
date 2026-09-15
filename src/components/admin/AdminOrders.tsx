import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { FileText, Loader2, Search } from "lucide-react";
import { adminListOrders, adminSlipUrl, adminUpdateOrder } from "@/lib/admin.functions";
import {
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  nextOrderStatuses,
  nextPaymentStatuses,
  statusLabel,
  type OrderStatus,
  type PaymentStatus,
} from "@/lib/order-status";
import { formatMoney } from "@/lib/shop";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type OrderRow = Awaited<ReturnType<typeof adminListOrders>>[number];

function paymentTone(status: string) {
  if (status === "paid") return "default" as const;
  if (status === "refunded") return "outline" as const;
  if (status === "pending_verification") return "secondary" as const;
  return "destructive" as const;
}

export function AdminOrders({ paymentsOnly = false }: { paymentsOnly?: boolean }) {
  const listOrders = useServerFn(adminListOrders);
  const updateOrder = useServerFn(adminUpdateOrder);
  const slipUrl = useServerFn(adminSlipUrl);
  const queryClient = useQueryClient();

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ["admin", "orders"],
    queryFn: () => listOrders(),
  });

  const [selected, setSelected] = useState<OrderRow | null>(null);
  const [slips, setSlips] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [paymentFilter, setPaymentFilter] = useState<PaymentStatus | "all">("all");
  const [pendingId, setPendingId] = useState<string | null>(null);

  const mutate = useMutation({
    mutationFn: (input: { id: string; status?: OrderStatus; payment_status?: PaymentStatus }) => {
      setPendingId(input.id);
      return updateOrder({ data: input });
    },
    onSuccess: () => {
      toast.success("Order updated.");
      void queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (e: Error) => toast.error(e.message),
    onSettled: () => setPendingId(null),
  });

  async function openSlip(order: OrderRow) {
    if (!order.slip_path) return;
    try {
      const cached = slips[order.id];
      const url = cached ?? (await slipUrl({ data: { path: order.slip_path } })).url;
      setSlips((s) => ({ ...s, [order.id]: url }));
      window.open(url, "_blank", "noopener");
    } catch {
      toast.error("Could not open that slip.");
    }
  }

  const scoped = useMemo(
    () =>
      (data ?? []).filter((o) =>
        paymentsOnly ? o.checkout_method === "bank_transfer" || o.payment_status !== "paid" : true,
      ),
    [data, paymentsOnly],
  );

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return scoped.filter((o) => {
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      if (paymentFilter !== "all" && o.payment_status !== paymentFilter) return false;
      if (!term) return true;
      return `${o.reference} ${o.customer_name} ${o.phone} ${o.email ?? ""}`
        .toLowerCase()
        .includes(term);
    });
  }, [scoped, search, statusFilter, paymentFilter]);

  const filtersActive = search.trim() !== "" || statusFilter !== "all" || paymentFilter !== "all";

  function clearFilters() {
    setSearch("");
    setStatusFilter("all");
    setPaymentFilter("all");
  }

  if (isPending) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-[1rem] border border-border p-6">
        <p className="text-sm text-muted-foreground">
          {(error as Error)?.message ?? "Could not load orders."}
        </p>
        <Button className="mt-3" size="sm" variant="outline" onClick={() => void refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            className="pl-9"
            placeholder="Search reference, name, phone or email"
            aria-label="Search orders"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as OrderStatus | "all")}>
          <SelectTrigger className="w-40" aria-label="Filter by order status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {ORDER_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {statusLabel(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={paymentFilter}
          onValueChange={(v) => setPaymentFilter(v as PaymentStatus | "all")}
        >
          <SelectTrigger className="w-44" aria-label="Filter by payment status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All payments</SelectItem>
            {PAYMENT_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {statusLabel(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {filtersActive && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear
          </Button>
        )}
      </div>

      {scoped.length === 0 ? (
        <p className="text-sm text-muted-foreground">No orders yet.</p>
      ) : visible.length === 0 ? (
        <p className="text-sm text-muted-foreground">No orders match those filters.</p>
      ) : (
        <div className="overflow-x-auto rounded-[1rem] border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="hidden md:table-cell">Needed</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead className="hidden lg:table-cell">Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((o) => {
                const busy = mutate.isPending && pendingId === o.id;
                const statusMoves = nextOrderStatuses(o.status);
                const paymentMoves = nextPaymentStatuses(o.payment_status);
                return (
                  <TableRow key={o.id} className={busy ? "opacity-60" : undefined}>
                    <TableCell className="font-medium">{o.reference}</TableCell>
                    <TableCell>
                      <div className="min-w-0">
                        <p className="truncate">{o.customer_name}</p>
                        <p className="truncate text-xs text-muted-foreground">{o.phone}</p>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {o.pickup_date ?? "—"}
                    </TableCell>
                    <TableCell>
                      <div className="min-w-0">
                        <p>{formatMoney(o.total_cents)}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatMoney(o.due_now_cents)} due now
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant={paymentTone(o.payment_status)}>
                          {statusLabel(o.payment_status)}
                        </Badge>
                        {o.slip_path && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => openSlip(o)}
                            title="View slip"
                          >
                            <FileText className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <Select
                        value={o.status}
                        disabled={busy || statusMoves.length === 0}
                        onValueChange={(v) => mutate.mutate({ id: o.id, status: v as OrderStatus })}
                      >
                        <SelectTrigger className="h-8 w-36" aria-label="Order status">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={o.status}>{statusLabel(o.status)}</SelectItem>
                          {statusMoves.map((s) => (
                            <SelectItem key={s} value={s}>
                              {statusLabel(s)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Select
                          value={o.payment_status}
                          disabled={busy || paymentMoves.length === 0}
                          onValueChange={(v) =>
                            mutate.mutate({ id: o.id, payment_status: v as PaymentStatus })
                          }
                        >
                          <SelectTrigger className="h-8 w-40" aria-label="Payment status">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={o.payment_status}>
                              {statusLabel(o.payment_status)}
                            </SelectItem>
                            {paymentMoves.map((s) => (
                              <SelectItem key={s} value={s}>
                                {statusLabel(s)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button size="sm" variant="outline" onClick={() => setSelected(o)}>
                          View
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {mutate.isPending && (
        <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> Saving…
        </p>
      )}

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-2xl">{selected.reference}</DialogTitle>
                <DialogDescription>
                  Placed {new Date(selected.created_at).toLocaleString()} ·{" "}
                  {selected.checkout_method === "bank_transfer"
                    ? "Bank transfer"
                    : selected.checkout_method === "card"
                      ? "Card (Stripe)"
                      : "WhatsApp"}
                </DialogDescription>
              </DialogHeader>

              <dl className="grid grid-cols-2 gap-3 text-sm">
                <Detail label="Customer" value={selected.customer_name} />
                <Detail label="Phone" value={selected.phone} />
                <Detail label="Email" value={selected.email ?? "—"} />
                <Detail label="Needed" value={selected.pickup_date ?? "—"} />
                <Detail label="Window" value={selected.pickup_window ?? "—"} />
                <Detail
                  label="Fulfilment"
                  value={
                    selected.fulfilment === "delivery"
                      ? `Delivery — ${selected.delivery_area ?? "area TBC"}`
                      : "Pickup"
                  }
                />
                <Detail label="Occasion" value={selected.occasion ?? "—"} />
                <Detail label="Allergies" value={selected.allergies ?? "—"} />
              </dl>

              {selected.notes && (
                <p className="rounded-[0.75rem] bg-secondary p-3 text-sm">{selected.notes}</p>
              )}

              <div>
                <h3 className="eyebrow text-muted-foreground">Items</h3>
                <ul className="mt-2 space-y-2 text-sm">
                  {(selected.order_items ?? []).map((item) => (
                    <li
                      key={item.id}
                      className="flex justify-between gap-4 border-b border-border pb-2"
                    >
                      <span>
                        {item.quantity} × {item.name}
                        {Array.isArray(item.options_snapshot) &&
                          item.options_snapshot.length > 0 && (
                            <span className="block text-xs text-muted-foreground">
                              {(
                                item.options_snapshot as {
                                  group_label: string;
                                  choice_label: string;
                                }[]
                              )
                                .map((o) => `${o.group_label}: ${o.choice_label}`)
                                .join(" · ")}
                            </span>
                          )}
                      </span>
                      <span className="shrink-0">
                        {formatMoney(item.line_total_cents)}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 space-y-1 text-sm">
                  <p className="flex justify-between">
                    <span>Subtotal</span>
                    <span>{formatMoney(selected.subtotal_cents)}</span>
                  </p>
                  {selected.delivery_fee_cents > 0 && (
                    <p className="flex justify-between">
                      <span>Delivery{selected.delivery_postal_code ? ` · ${selected.delivery_postal_code}` : ""}</span>
                      <span>{formatMoney(selected.delivery_fee_cents)}</span>
                    </p>
                  )}
                  <p className="flex justify-between font-display text-lg">
                    <span>Total</span>
                    <span>{formatMoney(selected.total_cents)}</span>
                  </p>
                  <p className="flex justify-between">
                    <span>Paid now</span>
                    <span>{formatMoney(selected.due_now_cents)}</span>
                  </p>
                  {selected.balance_cents > 0 && (
                    <p className="flex justify-between text-muted-foreground">
                      <span>Balance due</span>
                      <span>{formatMoney(selected.balance_cents)}</span>
                    </p>
                  )}
                </div>
              </div>

              {selected.checkout_method === "card" && (
                <div className="rounded-[0.75rem] border border-border p-3 text-sm">
                  <h3 className="eyebrow text-muted-foreground">Card payment</h3>
                  <p className="mt-2">Stripe reference: {selected.payment_reference ?? "—"}</p>
                  <p>
                    Paid at:{" "}
                    {selected.paid_at ? new Date(selected.paid_at).toLocaleString() : "—"}
                  </p>
                  <p className="mt-2 text-muted-foreground">
                    Refunds are handled in your Stripe dashboard.
                  </p>
                </div>
              )}

              {selected.checkout_method === "bank_transfer" && (
                <div className="rounded-[0.75rem] border border-border p-3 text-sm">
                  <h3 className="eyebrow text-muted-foreground">Transfer details</h3>
                  <p className="mt-2">Payer: {selected.payer_name ?? "—"}</p>
                  <p>Reference: {selected.transfer_reference ?? "—"}</p>
                  <p>Date sent: {selected.transfer_date ?? "—"}</p>
                  {selected.slip_path ? (
                    <Button className="mt-3" size="sm" onClick={() => openSlip(selected)}>
                      Open payment slip
                    </Button>
                  ) : (
                    <p className="mt-2 text-muted-foreground">No slip uploaded.</p>
                  )}
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="break-words">{value}</dd>
    </div>
  );
}
