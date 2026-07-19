import Image from "next/image";
import { cn } from "@/lib/utils";

type LogoProps = {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  showText?: boolean;
  variant?: "default" | "light";
};

const sizes = {
  sm: { img: "h-9 w-9", text: "text-xs" },
  md: { img: "h-11 w-11 sm:h-12 sm:w-12", text: "text-sm" },
  lg: { img: "h-32 w-32 sm:h-40 sm:w-40", text: "text-base" },
  xl: { img: "h-44 w-44 sm:h-52 sm:w-52", text: "text-lg" },
};

export function Logo({
  size = "md",
  className,
  showText = false,
  variant = "default",
}: LogoProps) {
  const s = sizes[size];

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <Image
        src="/logo.png"
        alt="Badel Group"
        width={208}
        height={208}
        className={cn(s.img, "object-contain")}
        priority={size === "lg" || size === "xl"}
      />
      {showText && (
        <div>
          <p
            className={cn(
              "font-bold tracking-wide uppercase",
              s.text,
              variant === "light" ? "text-white" : "text-primary-dark",
            )}
          >
            Badel Group
          </p>
          <p
            className={cn(
              "text-xs",
              variant === "light" ? "text-white/70" : "text-gray-500",
            )}
          >
            Padel Tournaments
          </p>
        </div>
      )}
    </div>
  );
}
