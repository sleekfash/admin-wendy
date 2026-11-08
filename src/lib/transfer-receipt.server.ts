import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { SLIP_EXTENSIONS, type TRANSFER_RECEIPT_TYPES } from "@/lib/order-schemas";
import { verifyOrderPaymentAccess } from "@/lib/order-access.server";

type ReceiptType = (typeof TRANSFER_RECEIPT_TYPES)[number];

export async function receiptTarget(data: {
  reference: string;
  access: string;
  uploadId: string;
  contentType: ReceiptType;
}) {
  const { data: order, error } = await supabaseAdmin.from("orders")
    .select("id, reference, checkout_method, payment_status, status, slip_path")
    .eq("reference", data.reference)
    .maybeSingle();
  if (error) throw new Error("Could not load the order. Please try again.");
  if (!order || order.checkout_method !== "bank_transfer" ||
      !verifyOrderPaymentAccess(order.id, order.reference, data.access)) {
    throw new Error("Invalid payment link.");
  }
  const path = `${order.id}/transfer-${data.uploadId}.${SLIP_EXTENSIONS[data.contentType]}`;
  const alreadySubmitted = order.slip_path === path;
  if (!alreadySubmitted && (order.slip_path || order.status === "cancelled" || order.payment_status !== "not_paid")) {
    throw new Error("This order cannot accept a new receipt. Please contact the bakery.");
  }
  return { order, path, alreadySubmitted };
}

export function matchesReceiptImage(bytes: Uint8Array, mime: ReceiptType): boolean {
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.slice(start, end));
  switch (mime) {
    case "image/jpeg":
      return bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    case "image/png":
      return [137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => bytes[index] === byte);
    case "image/webp":
      return ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP";
    case "image/heic": {
      if (bytes.length < 16 || ascii(4, 8) !== "ftyp") return false;
      const boxSize = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(0);
      const brands = ["heic", "heix", "hevc", "hevx"];
      if (boxSize < 16) return false;
      if (brands.includes(ascii(8, 12))) return true;
      for (let offset = 16; offset + 4 <= Math.min(boxSize, bytes.length); offset += 4) {
        if (brands.includes(ascii(offset, offset + 4))) return true;
      }
      return false;
    }
  }
}
