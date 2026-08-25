import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * One field. Label above, hairline under, red rule drawing left → right on
 * focus — the same signal grammar as the nav underline and the ActionLink
 * wipe, so a focused input reads as part of the same machine.
 *
 * No floating label. A label that moves is a label you have to wait for; this
 * one is always legible and always in the same place, and the placeholder is
 * free to do its real job of showing an example of the answer.
 */
export default function FormField({
  id,
  label,
  hint,
  error,
  as = "input",
  className,
  onRegister,
  ...props
}) {
  const ref = useRef(null);
  const Tag = as;

  // Hand the node up so the form can focus the first invalid field on submit
  // without reaching through the DOM by id.
  useEffect(() => {
    onRegister?.(id, ref.current);
    return () => onRegister?.(id, null);
  }, [id, onRegister]);

  /**
   * Textarea grows with its content instead of introducing a scrollbar inside
   * a 4-line box. Height is a layout property, but this runs on input — a
   * keystroke, not a pointer frame — and only ever on this one element.
   */
  const autoGrow = (event) => {
    if (as !== "textarea") return;
    const el = event.currentTarget;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 420)}px`;
  };

  const invalid = Boolean(error);

  return (
    <div className="ts-field" data-invalid={invalid ? "" : undefined}>
      <div className="flex items-baseline justify-between gap-4">
        <label htmlFor={id} className="ts-label ts-field-label">
          {label}
        </label>
        {/* One slot, two messages: the quiet hint is replaced by the error
            rather than the error being stacked underneath it, so the field
            never changes height when validation fails. */}
        <span
          id={`${id}-msg`}
          className={cn("ts-label ts-field-msg", invalid && "ts-field-msg-error")}
          // Announced when it changes, not read as part of the field's name.
          aria-live="polite"
        >
          {error || hint}
        </span>
      </div>

      <div className="ts-field-box">
        <Tag
          ref={ref}
          id={id}
          aria-invalid={invalid || undefined}
          aria-describedby={`${id}-msg`}
          onInput={autoGrow}
          className={cn("ts-field-input", as === "textarea" && "ts-field-area", className)}
          {...props}
        />
        <span className="ts-field-rule" aria-hidden="true">
          <span className="ts-field-rule-live" />
        </span>
      </div>
    </div>
  );
}
