import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface SamvaadLogoProps {
  readonly size?: "sm" | "default" | "lg" | "xl";
  readonly showText?: boolean;
  readonly textClassName?: string;
  readonly className?: string;
  readonly themeIntensity?: "auto" | "light" | "dark";
  readonly href?: string;
}

const SIZE_MAP = {
  sm: {
    heightClass: "h-6 sm:h-7",
    widthPx: 74,
    heightPx: 28,
  },
  default: {
    heightClass: "h-7 sm:h-8",
    widthPx: 95,
    heightPx: 36,
  },
  lg: {
    heightClass: "h-9 sm:h-10",
    widthPx: 120,
    heightPx: 45,
  },
  xl: {
    heightClass: "h-11 sm:h-12",
    widthPx: 150,
    heightPx: 56,
  },
} as const;

export function SamvaadLogo({
  size = "default",
  className,
  themeIntensity = "auto",
  href = "/",
}: SamvaadLogoProps): React.JSX.Element {
  const config = SIZE_MAP[size];

  const logoGraphic = (
    <div
      className={cn(
        "relative flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-[1.03]",
        className,
      )}
    >
      {/* Light Theme: Pure Black Logo on transparent background (ZERO black box, ZERO text clipping) */}
      {(themeIntensity === "auto" || themeIntensity === "dark") && (
        <Image
          src="/samvaad-logo-black.png"
          alt="Samvaad AI"
          width={config.widthPx}
          height={config.heightPx}
          className={cn(
            "w-auto object-contain select-none",
            config.heightClass,
            themeIntensity === "auto" && "dark:hidden",
          )}
          priority
        />
      )}

      {/* Dark Theme: Pure White Logo on transparent background */}
      {(themeIntensity === "auto" || themeIntensity === "light") && (
        <Image
          src="/samvaad-logo-white.png"
          alt="Samvaad AI"
          width={config.widthPx}
          height={config.heightPx}
          className={cn(
            "w-auto object-contain select-none",
            config.heightClass,
            themeIntensity === "auto" ? "hidden dark:block" : "",
          )}
          priority
        />
      )}
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="group inline-flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded-lg"
        aria-label="Samvaad AI Home"
      >
        {logoGraphic}
      </Link>
    );
  }

  return <div className="inline-flex items-center">{logoGraphic}</div>;
}
