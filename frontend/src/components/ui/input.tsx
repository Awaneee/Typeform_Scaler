import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      className={cn(
        "border-line bg-surface text-ink placeholder:text-muted h-10 w-full rounded-lg border px-3 text-sm",
        "focus:border-plum focus:ring-plum outline-none focus:ring-1",
        className,
      )}
      {...props}
    />
  );
});
