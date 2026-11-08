import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { PageHeader, Section } from "@/components/site/Bits";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMoney } from "@/lib/shop";
import { getTransferPayment, submitTransferReceipt } from "@/lib/orders.functions";

const MAX_BYTES = 5 * 1024 * 1024;
const MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"];

export const Route = createFileRoute("/pay-order")({
  head: () => ({
    meta: [
      { title: "Complete your order payment — Wendy's Bakehouse" },
      { name: "robots", content: "noindex,nofollow" },
      { name: "referrer", content: "no-referrer" },
    ],
  }),
  component: OrderPaymentPage,
});

type Payment = Awaited<ReturnType<ReturnType<typeof useServerFn<typeof getTransferPayment>>>>;

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Unable to read your receipt."));
    reader.readAsDataURL(file);
  });
}

function OrderPaymentPage() {
  const getPayment = useServerFn(getTransferPayment);
  const uploadReceipt = useServerFn(submitTransferReceipt);
  const [reference, setReference] = useState("");
  const [access, setAccess] = useState("");
  const [payment, setPayment] = useState<Payment | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [payer, setPayer] = useState("");
  const [transferReference, setTransferReference] = useState("");
  const [date, setDate] = useState("");
  const [slip, setSlip] = useState<File | null>(null);

  useEffect(() => {
    // The bearer access key is in the URL fragment: it is never sent as part
    // of a page request or included in referrer headers.
    const url = new URL(window.location.href);
    const ref = url.searchParams.get("reference") ?? "";
    const key = new URLSearchParams(url.hash.slice(1)).get("access") ?? "";
    setReference(ref);
    setAccess(key);
    if (!ref || !key) {
      setError("Use the secure payment link supplied after submitting your order.");
      setLoading(false);
      return;
    }
    getPayment({ data: { reference: ref, access: key } })
      .then(setPayment)
      .catch((e) => setError(e instanceof Error ? e.message : "Unable to load this payment."))
      .finally(() => setLoading(false));
  }, [getPayment]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !slip) return;
    if (!MIME_TYPES.includes(slip.type) || slip.size === 0 || slip.size > MAX_BYTES) {
      toast.error("Upload a valid JPG, PNG, WEBP, HEIC or PDF receipt under 5MB.");
      return;
    }
    setBusy(true);
    try {
      await uploadReceipt({
        data: {
          reference,
          access,
          payer_name: payer,
          transfer_reference: transferReference || undefined,
          transfer_date: date || undefined,
          slip: {
            filename: slip.name,
            content_type: slip.type as "image/jpeg" | "image/png" | "image/webp" | "image/heic" | "application/pdf",
            data_base64: await readFile(slip),
          },
        },
      });
      setPayment((prev) => prev ? { ...prev, paymentStatus: "pending_verification", slipUploaded: true } : prev);
      setSlip(null);
      toast.success("Receipt submitted. Your payment is awaiting verification.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Receipt submission failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow={reference ? `Order ${reference}` : "Order payment"}
        title="Complete your bank transfer"
        lead="Your order is saved. Transfer the amount due, then upload your payment receipt for verification."
      />
      <Section>
        <div className="mx-auto max-w-2xl space-y-6">
          {loading && <p role="status">Loading your secure payment details…</p>}
          {error && <p role="alert" className="text-destructive">{error}</p>}
          {payment && (
            <>
              <div className="rounded-[1.5rem] border border-border bg-card p-6 space-y-3">
                <h2 className="font-display text-2xl">Order {payment.reference}</h2>
                <p>Order total: <strong>{formatMoney(payment.totalCents)}</strong></p>
                <p>Amount due now: <strong>{formatMoney(payment.dueNowCents)}</strong></p>
                {payment.balanceCents > 0 && <p>Balance due later: {formatMoney(payment.balanceCents)}</p>}
                <p className="capitalize">Payment status: {payment.paymentStatus.replaceAll("_", " ")}</p>
              </div>
              {!payment.cancelled && payment.paymentStatus === "not_paid" && (
                <>
                  <div className="rounded-[1.5rem] border border-border bg-secondary p-6 space-y-2">
                    <h2 className="font-display text-xl">Transfer to this account</h2>
                    <p className="font-semibold">{payment.bank.bank_account_name}</p>
                    <p>{payment.bank.bank_name}</p>
                    <p>Account number: <strong>{payment.bank.bank_account_number}</strong></p>
                    {payment.bank.bank_note && <p className="text-sm text-muted-foreground">{payment.bank.bank_note}</p>}
                    <button type="button" className="rounded-sm border border-input px-4 py-2 text-sm" onClick={() => {
                      navigator.clipboard.writeText(payment.bank.bank_account_number).then(() => toast.success("Account number copied")).catch(() => toast.error("Unable to copy account number"));
                    }}>Copy account number</button>
                  </div>
                  <form className="space-y-5 rounded-[1.5rem] border border-border p-6" onSubmit={submit}>
                    <h2 className="font-display text-xl">Submit payment receipt</h2>
                    <div className="space-y-2">
                      <Label htmlFor="payer">Name on the transfer</Label>
                      <Input id="payer" required maxLength={100} value={payer} onChange={e => setPayer(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reference">Transfer reference (optional)</Label>
                      <Input id="reference" maxLength={80} value={transferReference} onChange={e => setTransferReference(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="date">Transfer date (optional)</Label>
                      <Input id="date" type="date" value={date} onChange={e => setDate(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="slip">Payment receipt (JPG, PNG, WEBP, HEIC or PDF, max 5MB)</Label>
                      <Input id="slip" required type="file" accept={MIME_TYPES.join(",")} onChange={e => setSlip(e.target.files?.[0] ?? null)} />
                    </div>
                    <button type="submit" disabled={busy || !slip} className="rounded-sm bg-primary px-5 py-3 font-semibold text-primary-foreground disabled:opacity-60">
                      {busy ? "Submitting receipt…" : "Submit receipt for verification"}
                    </button>
                  </form>
                </>
              )}
              {(payment.paymentStatus === "pending_verification" || payment.slipUploaded) && (
                <div role="status" className="rounded-[1.5rem] border border-border p-6">
                  Your receipt has been received. Wendy will verify the transfer. No second order is needed.
                </div>
              )}
              {payment.paymentStatus === "paid" && <p role="status">Payment confirmed. Thank you!</p>}
              {payment.cancelled && <p role="status">This order has been cancelled. Contact the bakery for assistance.</p>}
            </>
          )}
          <Link to="/menu" search={{}} className="inline-block underline">Back to the menu</Link>
        </div>
      </Section>
    </>
  );
}
