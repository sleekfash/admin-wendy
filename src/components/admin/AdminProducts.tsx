import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, Search } from "lucide-react";
import { adminDeleteProduct, adminListProducts, adminSaveProduct } from "@/lib/admin.functions";
import { formatMoney, imageSrc } from "@/lib/shop";
import { AdminProductOptions } from "@/components/admin/AdminProductOptions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Catalog = Awaited<ReturnType<typeof adminListProducts>>;
type ProductRow = Catalog["products"][number];
type Status = "available" | "unavailable" | "archived";
type PaymentRule = "full" | "deposit";

type Draft = {
  id?: string;
  slug: string;
  name: string;
  category_id: string | null;
  short: string;
  description: string;
  payment_rule: PaymentRule;
  price: string;
  deposit: string;
  pack_size: string;
  pack_unit: string;
  price_note: string;
  lead_time: string;
  serves: string;
  includes: string;
  image_url: string;
  status: Status;
  sort_order: number;
};

function toDraft(p?: ProductRow): Draft {
  const includes = Array.isArray(p?.includes) ? (p.includes as string[]) : [];
  return {
    ...(p ? { id: p.id } : {}),
    slug: p?.slug ?? "",
    name: p?.name ?? "",
    category_id: p?.category_id ?? null,
    short: p?.short ?? "",
    description: p?.description ?? "",
    payment_rule: (p?.payment_rule as PaymentRule) ?? "full",
    price: p?.price_cents != null ? (p.price_cents / 100).toString() : "",
    deposit: p?.deposit_cents != null ? (p.deposit_cents / 100).toString() : "",
    pack_size: p?.pack_size != null ? String(p.pack_size) : "",
    pack_unit: p?.pack_unit ?? "",
    price_note: p?.price_note ?? "",
    lead_time: p?.lead_time ?? "",
    serves: p?.serves ?? "",
    includes: includes.join("\n"),
    image_url: p?.image_url ?? "",
    status: (p?.status as Status) ?? "available",
    sort_order: p?.sort_order ?? 0,
  };
}

function toCents(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}

const STATUS_TONE: Record<Status, "default" | "secondary" | "outline"> = {
  available: "default",
  unavailable: "secondary",
  archived: "outline",
};

export function AdminProducts() {
  const listProducts = useServerFn(adminListProducts);
  const saveProduct = useServerFn(adminSaveProduct);
  const deleteProduct = useServerFn(adminDeleteProduct);
  const queryClient = useQueryClient();

  const { data, isPending } = useQuery({
    queryKey: ["admin", "products"],
    queryFn: () => listProducts(),
  });

  const [draft, setDraft] = useState<Draft | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all");

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin"] });
    void queryClient.invalidateQueries({ queryKey: ["catalog"] });
  };

  const save = useMutation({
    mutationFn: (d: Draft) =>
      saveProduct({
        data: {
          ...(d.id ? { id: d.id } : {}),
          slug: d.slug.trim(),
          name: d.name.trim(),
          category_id: d.category_id,
          short: d.short.trim(),
          description: d.description.trim(),
          payment_rule: d.payment_rule,
          price_cents: toCents(d.price),
          deposit_cents: toCents(d.deposit),
          pack_size: d.pack_size.trim() ? Number(d.pack_size) : null,
          pack_unit: d.pack_unit.trim() || null,
          price_note: d.price_note.trim() || null,
          lead_time: d.lead_time.trim(),
          serves: d.serves.trim() || null,
          includes: d.includes
            .split("\n")
            .map((l) => l.trim())
            .filter(Boolean),
          image_url: d.image_url.trim() || null,
          status: d.status,
          sort_order: d.sort_order,
        },
      }),
    onSuccess: () => {
      toast.success("Product saved.");
      setDraft(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteProduct({ data: { id } }),
    onSuccess: () => {
      toast.success("Product removed.");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const categories = data?.categories ?? [];

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (data?.products ?? []).filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (!term) return true;
      return `${p.name} ${p.slug}`.toLowerCase().includes(term);
    });
  }, [data?.products, search, statusFilter]);

  if (isPending) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-64 w-full rounded-[1rem]" />
        ))}
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
            placeholder="Search cakes"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as Status | "all")}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="available">Available</SelectItem>
            <SelectItem value="unavailable">Unavailable</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => setDraft(toDraft())}>
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" /> New product
        </Button>
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing matches those filters.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((p) => (
            <div key={p.id} className="rounded-[1rem] border border-border bg-card p-4">
              <img
                src={imageSrc(p)}
                alt=""
                loading="lazy"
                className="aspect-[4/3] w-full rounded-[0.75rem] object-cover"
              />
              <div className="mt-3 flex items-start justify-between gap-2">
                <h3 className="font-display text-lg leading-tight">{p.name}</h3>
                <Badge variant={STATUS_TONE[(p.status as Status) ?? "available"]}>{p.status}</Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {formatMoney(p.price_cents ?? 0)}
                {p.payment_rule === "deposit"
                  ? ` · ${formatMoney(p.deposit_cents ?? 0)} deposit`
                  : ""}
                {p.pack_size ? ` · ${p.pack_size} ${p.pack_unit ?? "pieces"} per pack` : ""}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => setDraft(toDraft(p))}>
                  Edit
                </Button>
                {p.status !== "archived" ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => save.mutate({ ...toDraft(p), status: "archived" })}
                  >
                    Archive
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => save.mutate({ ...toDraft(p), status: "available" })}
                  >
                    Restore
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => {
                    if (confirm(`Delete ${p.name}? Archive is usually safer.`)) remove.mutate(p.id);
                  }}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!draft} onOpenChange={(open) => !open && setDraft(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          {draft && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-2xl">
                  {draft.id ? "Edit product" : "New product"}
                </DialogTitle>
              </DialogHeader>
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  save.mutate(draft);
                }}
              >
                <Field label="Name">
                  <Input
                    value={draft.name}
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                    required
                  />
                </Field>
                <Field label="Slug (web address)">
                  <Input
                    value={draft.slug}
                    onChange={(e) => setDraft({ ...draft, slug: e.target.value })}
                    required
                  />
                </Field>
                <Field label="Collection">
                  <Select
                    value={draft.category_id ?? "none"}
                    onValueChange={(v) =>
                      setDraft({ ...draft, category_id: v === "none" ? null : v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No collection</SelectItem>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Short line">
                  <Input
                    value={draft.short}
                    onChange={(e) => setDraft({ ...draft, short: e.target.value })}
                  />
                </Field>
                <Field label="Description">
                  <Textarea
                    rows={4}
                    value={draft.description}
                    onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                  />
                </Field>
                <Field label="Payment">
                  <Select
                    value={draft.payment_rule}
                    onValueChange={(v) => setDraft({ ...draft, payment_rule: v as PaymentRule })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full">Pay in full at checkout</SelectItem>
                      <SelectItem value="deposit">Deposit now, balance later</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Price (CAD)">
                    <Input
                      inputMode="decimal"
                      required
                      value={draft.price}
                      onChange={(e) => setDraft({ ...draft, price: e.target.value })}
                    />
                  </Field>
                  <Field label="Deposit (CAD)">
                    <Input
                      inputMode="decimal"
                      disabled={draft.payment_rule !== "deposit"}
                      value={draft.deposit}
                      onChange={(e) => setDraft({ ...draft, deposit: e.target.value })}
                    />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Pieces per pack (optional)">
                    <Input
                      inputMode="numeric"
                      placeholder="12"
                      value={draft.pack_size}
                      onChange={(e) => setDraft({ ...draft, pack_size: e.target.value })}
                    />
                  </Field>
                  <Field label="Pack contains (e.g. pies)">
                    <Input
                      value={draft.pack_unit}
                      onChange={(e) => setDraft({ ...draft, pack_unit: e.target.value })}
                    />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Price note">
                    <Input
                      value={draft.price_note}
                      onChange={(e) => setDraft({ ...draft, price_note: e.target.value })}
                    />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Lead time (e.g. 5 days)">
                    <Input
                      value={draft.lead_time}
                      onChange={(e) => setDraft({ ...draft, lead_time: e.target.value })}
                    />
                  </Field>
                  <Field label="Serves">
                    <Input
                      value={draft.serves}
                      onChange={(e) => setDraft({ ...draft, serves: e.target.value })}
                    />
                  </Field>
                </div>
                <Field label="Includes (one per line)">
                  <Textarea
                    rows={3}
                    value={draft.includes}
                    onChange={(e) => setDraft({ ...draft, includes: e.target.value })}
                  />
                </Field>
                <Field label="Image URL">
                  <Input
                    value={draft.image_url}
                    onChange={(e) => setDraft({ ...draft, image_url: e.target.value })}
                  />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Sort order">
                    <Input
                      type="number"
                      value={draft.sort_order}
                      onChange={(e) =>
                        setDraft({ ...draft, sort_order: Number(e.target.value) || 0 })
                      }
                    />
                  </Field>
                  <Field label="Status">
                    <Select
                      value={draft.status}
                      onValueChange={(v) => setDraft({ ...draft, status: v as Status })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="available">Available</SelectItem>
                        <SelectItem value="unavailable">Unavailable</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
                {draft.id ? (
                  <div className="rounded-[0.75rem] border border-border bg-muted/30 p-3">
                    <h4 className="font-display text-lg">Customer choices</h4>
                    <div className="mt-2">
                      <AdminProductOptions productId={draft.id} />
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Save the product first, then add sizes, flavours and other choices.
                  </p>
                )}
                <Button type="submit" disabled={save.isPending} className="w-full">
                  {save.isPending ? "Saving…" : "Save product"}
                </Button>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
