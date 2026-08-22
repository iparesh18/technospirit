import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * The primary CTA. Built on the shadcn Button primitive (asChild → router
 * Link), then re-skinned completely: zero radius, hard black slab, and a red
 * panel that wipes up from the bottom edge on hover. No shadows, no gradient.
 */
export function ActionLink({ to, children, className, tone = "solid", ...props }) {
  return (
    <Button
      asChild
      size="lg"
      variant="ghost"
      data-cursor="start"
      className={cn(
        "group/cta relative h-auto overflow-hidden rounded-none px-0 py-0 transition-none hover:bg-transparent",
        className,
      )}
      {...props}
    >
      <Link to={to}>
        <span
          className={cn(
            "relative flex w-full items-center justify-between gap-6 border px-7 py-5 sm:px-9 sm:py-6",
            tone === "solid"
              ? "border-[var(--fg)] bg-[var(--fg)] text-[var(--bg)]"
              : "border-[var(--line-strong)] bg-transparent text-[var(--fg)]",
          )}
        >
          {/* red signal panel wipes up from the baseline */}
          <span
            aria-hidden="true"
            className="absolute inset-0 origin-bottom scale-y-0 bg-signal transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/cta:scale-y-100 group-focus-visible/cta:scale-y-100"
          />
          <span className="ts-label relative z-10 text-[0.7rem] transition-colors duration-300 group-hover/cta:text-white group-focus-visible/cta:text-white">
            {children}
          </span>
          <ArrowUpRight
            className="relative z-10 size-4 shrink-0 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/cta:translate-x-1 group-hover/cta:-translate-y-1 group-hover/cta:text-white"
            strokeWidth={1.75}
          />
        </span>
      </Link>
    </Button>
  );
}

/**
 * Inline text link with a signal underline that draws left → right.
 */
export function SignalLink({ to, children, className, external = false }) {
  const Tag = external ? "a" : Link;
  const linkProps = external
    ? { href: to, target: "_blank", rel: "noreferrer noopener" }
    : { to };

  return (
    <Tag
      {...linkProps}
      data-cursor="open"
      className={cn(
        "group/link relative inline-flex items-center gap-1.5 text-[var(--fg)] transition-colors duration-300 hover:text-[var(--red-text)]",
        className,
      )}
    >
      <span className="relative">
        {children}
        <span
          aria-hidden="true"
          className="absolute -bottom-0.5 left-0 h-px w-full origin-right scale-x-0 bg-signal transition-transform duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/link:origin-left group-hover/link:scale-x-100 group-focus-visible/link:origin-left group-focus-visible/link:scale-x-100"
        />
      </span>
    </Tag>
  );
}

export default ActionLink;
