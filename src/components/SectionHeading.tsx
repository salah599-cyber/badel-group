import { cn } from "@/lib/utils";

export function SectionHeading({
  title,
  subtitle,
  align = "left",
  className,
}: {
  title: string;
  subtitle?: string;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-8",
        align === "center" && "text-center",
        className,
      )}
    >
      <div
        className={cn(
          "mb-3 flex items-center gap-3",
          align === "center" && "justify-center",
        )}
      >
        <span className="h-px w-8 bg-secondary" aria-hidden />
        <span className="text-xs font-bold tracking-[0.2em] text-primary uppercase">
          Badel Group
        </span>
        <span className="h-px w-8 bg-secondary" aria-hidden />
      </div>
      <h2 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl md:text-4xl">
        {title}
      </h2>
      {subtitle && (
        <p
          className={cn(
            "mt-2 max-w-2xl text-base text-gray-600 sm:text-lg",
            align === "center" && "mx-auto",
          )}
        >{subtitle}</p>
      )}
    </div>
  );
}
