import Image from "next/image";

import { initials, logoUrl } from "@/lib/logos";
import { cn } from "@/lib/utils";

/**
 * The client's logo, or their initials on navy when there is none. Always
 * the same square so a list of clients lines up whether or not every one
 * has a logo yet.
 */
export function ClientMark({
  name,
  logoPath,
  size = "md",
  className,
}: {
  name: string;
  logoPath: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const url = logoUrl(logoPath);
  const box = { sm: "size-8 text-xs", md: "size-11 text-sm", lg: "size-16 text-lg" }[size];
  const px = { sm: 32, md: 44, lg: 64 }[size];

  if (url) {
    return (
      <span
        className={cn(
          "flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-white",
          box,
          className
        )}
      >
        <Image
          src={url}
          alt=""
          width={px}
          height={px}
          className="size-full object-contain p-0.5"
          unoptimized={logoPath?.endsWith(".svg")}
        />
      </span>
    );
  }

  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-lg bg-navy font-semibold tracking-wide text-white",
        box,
        className
      )}
    >
      {initials(name)}
    </span>
  );
}
