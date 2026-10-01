import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ImagePlus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  adminCreateTestimonialUpload,
  adminDeleteTestimonial,
  adminDiscardTestimonialUpload,
  adminFinalizeTestimonialUpload,
  adminListTestimonials,
  adminSaveTestimonial,
} from "@/lib/testimonials.functions";
import { transformTestimonialImage } from "@/lib/testimonial-image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

type Testimonial = Awaited<ReturnType<typeof adminListTestimonials>>[number];

export function AdminTestimonials() {
  const list = useServerFn(adminListTestimonials);
  const createUpload = useServerFn(adminCreateTestimonialUpload);
  const finalizeUpload = useServerFn(adminFinalizeTestimonialUpload);
  const discardUpload = useServerFn(adminDiscardTestimonialUpload);
  const saveTestimonial = useServerFn(adminSaveTestimonial);
  const deleteTestimonial = useServerFn(adminDeleteTestimonial);
  const queryClient = useQueryClient();

  const {
    data = [],
    isPending,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["admin", "testimonials"],
    queryFn: () => list(),
  });

  const [source, setSource] = useState<File | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [transformed, setTransformed] = useState<Blob | null>(null);
  const [transformedUrl, setTransformedUrl] = useState<string | null>(null);
  const [customerLabel, setCustomerLabel] = useState("Verified customer feedback");
  const [altText, setAltText] = useState(
    "Customer message praising a Wendy's Bakehouse celebration cake",
  );
  const [sortOrder, setSortOrder] = useState(0);
  const [visible, setVisible] = useState(true);
  const [transforming, setTransforming] = useState(false);

  useEffect(
    () => () => {
      if (sourceUrl) URL.revokeObjectURL(sourceUrl);
      if (transformedUrl) URL.revokeObjectURL(transformedUrl);
    },
    [sourceUrl, transformedUrl],
  );

  async function makePreview(file = source) {
    if (!file) return;
    setTransforming(true);
    try {
      const output = await transformTestimonialImage(file, { customerLabel });
      if (transformedUrl) URL.revokeObjectURL(transformedUrl);
      setTransformed(output);
      setTransformedUrl(URL.createObjectURL(output));
    } catch (previewError) {
      toast.error((previewError as Error).message);
    } finally {
      setTransforming(false);
    }
  }

  function resetComposer() {
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    if (transformedUrl) URL.revokeObjectURL(transformedUrl);
    setSource(null);
    setSourceUrl(null);
    setTransformed(null);
    setTransformedUrl(null);
    setCustomerLabel("Verified customer feedback");
    setAltText("Customer message praising a Wendy's Bakehouse celebration cake");
    setSortOrder(0);
    setVisible(true);
  }

  const publish = useMutation({
    mutationFn: async () => {
      if (!transformed) throw new Error("Prepare and approve the transformed preview first.");
      const prepared = await createUpload({
        data: { content_type: "image/jpeg", size_bytes: transformed.size },
      });
      try {
        const { error: uploadError } = await supabase.storage
          .from("testimonial-images")
          .uploadToSignedUrl(prepared.path, prepared.token, transformed, {
            contentType: "image/jpeg",
          });
        if (uploadError) throw new Error("Could not upload the transformed review image.");
        await finalizeUpload({
          data: { path: prepared.path, content_type: "image/jpeg" },
        });
        await saveTestimonial({
          data: {
            image_path: prepared.path,
            alt_text: altText.trim(),
            customer_label: customerLabel.trim(),
            visible,
            sort_order: sortOrder,
          },
        });
      } catch (publishError) {
        await discardUpload({ data: { path: prepared.path } }).catch(() => undefined);
        throw publishError;
      }
    },
    onSuccess: () => {
      toast.success("Review transformed and published.");
      resetComposer();
      void queryClient.invalidateQueries({ queryKey: ["admin", "testimonials"] });
      void queryClient.invalidateQueries({ queryKey: ["testimonials"] });
    },
    onError: (publishError: Error) => toast.error(publishError.message),
  });

  const update = useMutation({
    mutationFn: (row: Testimonial) =>
      saveTestimonial({
        data: {
          id: row.id,
          image_path: row.image_path,
          alt_text: row.alt_text,
          customer_label: row.customer_label,
          visible: row.visible,
          sort_order: row.sort_order,
        },
      }),
    onSuccess: () => {
      toast.success("Review settings saved.");
      void queryClient.invalidateQueries({ queryKey: ["admin", "testimonials"] });
      void queryClient.invalidateQueries({ queryKey: ["testimonials"] });
    },
    onError: (updateError: Error) => toast.error(updateError.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteTestimonial({ data: { id } }),
    onSuccess: () => {
      toast.success("Review deleted.");
      void queryClient.invalidateQueries({ queryKey: ["admin", "testimonials"] });
      void queryClient.invalidateQueries({ queryKey: ["testimonials"] });
    },
    onError: (removeError: Error) => toast.error(removeError.message),
  });

  if (isPending) return <Skeleton className="h-96 w-full rounded-[1rem]" />;
  if (isError) {
    return (
      <div className="rounded-[1rem] border border-border p-6">
        <p className="text-sm text-muted-foreground">
          {(error as Error)?.message ?? "Could not load testimonials."}
        </p>
        <Button className="mt-3" size="sm" variant="outline" onClick={() => void refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="rounded-[1rem] border border-border bg-card p-5">
        <div className="flex items-start gap-3">
          <ImagePlus className="mt-1 h-5 w-5 text-primary" aria-hidden="true" />
          <div>
            <h2 className="font-display text-2xl">Transform a customer message</h2>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Choose the original phone-chat screenshot. The editor replaces neutral black chat
              backgrounds with Wendy&rsquo;s cocoa-rose palette and builds the approved
              customer-review card. Only the transformed image is uploaded.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <div>
            <Label htmlFor="testimonial-source">Original screenshot</Label>
            <Input
              id="testimonial-source"
              className="mt-2"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                if (!file) return;
                if (sourceUrl) URL.revokeObjectURL(sourceUrl);
                setSource(file);
                setSourceUrl(URL.createObjectURL(file));
                setTransformed(null);
                if (transformedUrl) URL.revokeObjectURL(transformedUrl);
                setTransformedUrl(null);
                void makePreview(file);
              }}
            />
            {sourceUrl && (
              <img
                src={sourceUrl}
                alt="Original screenshot preview"
                className="mt-4 aspect-square w-full rounded-[1rem] border border-border bg-muted object-contain"
              />
            )}
          </div>
          <div>
            <div className="flex items-center justify-between gap-3">
              <Label>Branded result</Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!source || transforming}
                onClick={() => void makePreview()}
              >
                <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
                {transforming ? "Transforming…" : "Refresh preview"}
              </Button>
            </div>
            {transformedUrl ? (
              <img
                src={transformedUrl}
                alt="Transformed testimonial preview"
                className="mt-4 aspect-square w-full rounded-[1rem] border border-gold/35 bg-muted object-contain"
              />
            ) : (
              <div className="mt-4 grid aspect-square place-items-center rounded-[1rem] border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
                The transformed result appears here before anything is uploaded.
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="testimonial-label">Customer label</Label>
            <Input
              id="testimonial-label"
              className="mt-2"
              value={customerLabel}
              onChange={(event) => setCustomerLabel(event.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="testimonial-order">Slider order</Label>
            <Input
              id="testimonial-order"
              className="mt-2"
              type="number"
              min={0}
              max={9999}
              value={sortOrder}
              onChange={(event) => setSortOrder(Number(event.target.value))}
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="testimonial-alt">Accessible image description</Label>
            <Textarea
              id="testimonial-alt"
              className="mt-2"
              value={altText}
              onChange={(event) => setAltText(event.target.value)}
            />
          </div>
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
          <label className="flex items-center gap-3 text-sm">
            <Switch checked={visible} onCheckedChange={setVisible} />
            Display immediately on the storefront
          </label>
          <Button disabled={!transformed || publish.isPending} onClick={() => publish.mutate()}>
            {publish.isPending ? "Publishing…" : "Approve and publish"}
          </Button>
        </div>
      </section>

      <section>
        <h2 className="font-display text-2xl">Uploaded reviews</h2>
        {data.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            No database reviews yet. The storefront currently shows the three bundled review cards;
            every approved upload will join them in the same slider.
          </p>
        ) : (
          <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {data.map((row) => (
              <article key={row.id} className="rounded-[1rem] border border-border bg-card p-4">
                <img
                  src={`/api/public/testimonial-image/${row.image_path}`}
                  alt={row.alt_text}
                  className="aspect-square w-full rounded-lg bg-muted object-cover"
                />
                <p className="mt-3 font-medium">{row.customer_label}</p>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{row.alt_text}</p>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <label className="flex items-center gap-2 text-sm">
                    <Switch
                      checked={row.visible}
                      onCheckedChange={(checked) => update.mutate({ ...row, visible: checked })}
                    />
                    Visible
                  </label>
                  <Button
                    size="icon"
                    variant="outline"
                    aria-label={`Delete ${row.customer_label}`}
                    disabled={remove.isPending}
                    onClick={() => {
                      if (window.confirm("Delete this review image permanently?")) {
                        remove.mutate(row.id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
