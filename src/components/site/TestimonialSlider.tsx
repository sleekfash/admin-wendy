import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import reviewOne from "@/assets/testimonials/customer-review-1.webp";
import reviewTwo from "@/assets/testimonials/customer-review-2.webp";
import reviewThree from "@/assets/testimonials/customer-review-3.webp";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { getTestimonials } from "@/lib/testimonials.functions";

const BUNDLED_REVIEWS = [
  {
    id: "bundled-review-1",
    src: reviewOne,
    alt: "Customer review saying the cake was delivered and loved",
    customerLabel: "Celebration cake customer",
  },
  {
    id: "bundled-review-2",
    src: reviewTwo,
    alt: "Customer review praising a beautiful cake that Emily loved",
    customerLabel: "Birthday cake customer",
  },
  {
    id: "bundled-review-3",
    src: reviewThree,
    alt: "Customer review praising a lovely cake and flawless design",
    customerLabel: "Event cake customer",
  },
];

export function TestimonialSlider() {
  const listTestimonials = useServerFn(getTestimonials);
  const { data } = useQuery({
    queryKey: ["testimonials"],
    queryFn: () => listTestimonials(),
    staleTime: 5 * 60_000,
    retry: 1,
  });

  const uploaded = (data ?? []).map((review) => ({
    id: review.id,
    src: `/api/public/testimonial-image/${review.image_path}`,
    alt: review.alt_text,
    customerLabel: review.customer_label,
  }));
  const reviews = [...BUNDLED_REVIEWS, ...uploaded];

  return (
    <Carousel className="mx-auto w-full max-w-[560px]" opts={{ loop: reviews.length > 1 }}>
      <CarouselContent>
        {reviews.map((review) => (
          <CarouselItem key={review.id}>
            <figure className="overflow-hidden rounded-[1.5rem] border border-gold/35 bg-card p-2 shadow-sm">
              <img
                src={review.src}
                alt={review.alt}
                className="aspect-square w-full rounded-[1.1rem] object-cover"
                loading="lazy"
              />
              <figcaption className="px-4 py-3 text-center text-sm text-muted-foreground">
                {review.customerLabel}
              </figcaption>
            </figure>
          </CarouselItem>
        ))}
      </CarouselContent>
      {reviews.length > 1 && (
        <>
          <CarouselPrevious className="left-3 border-gold/40 bg-background/95" />
          <CarouselNext className="right-3 border-gold/40 bg-background/95" />
        </>
      )}
    </Carousel>
  );
}
