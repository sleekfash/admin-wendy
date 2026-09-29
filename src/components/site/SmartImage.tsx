import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type Props = {
  src: string;
  alt: string;
  className?: string;
  /** Tailwind aspect utility, e.g. "aspect-square" or "aspect-[4/3]". */
  ratio?: string;
  rounded?: string;
  priority?: boolean;
  fit?: "cover" | "contain";
};

/** Image inside a fixed-ratio box with a skeleton while it loads. */
export function SmartImage({
  src,
  alt,
  className = "",
  ratio = "aspect-[4/3]",
  rounded = "rounded-[1.15rem]",
  priority = false,
  fit = "cover",
}: Props) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className={cn("relative w-full overflow-hidden bg-secondary", ratio, rounded, className)}>
      {!loaded && <Skeleton className="absolute inset-0 h-full w-full rounded-none" />}
      <img
        src={src}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(true)}
        className={cn(
          "h-full w-full transition-opacity duration-500",
          fit === "contain" ? "object-contain" : "object-cover",
          loaded ? "opacity-100" : "opacity-0",
        )}
      />
    </div>
  );
}
