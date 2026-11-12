"use client"

import * as React from "react"
import { cn } from "cn"
import { Progress as ProgressPrimitive } from "radix-ui"

function Progress({
  className,
  value,
  ...props
}) {
  // Radix rejects values outside 0–100 (an overbooked allowance can exceed 100%).
  const clamped = typeof value === "number" ? Math.min(100, Math.max(0, value)) : value
  return (
    // value goes to the root too, so Radix sets aria-valuenow (the generated component
    // only used it for the bar's width, leaving screen readers without a value).
    <ProgressPrimitive.Root
      data-slot="progress"
      value={clamped}
      className={cn(
        "relative flex h-1.5 w-full items-center overflow-x-hidden rounded-full bg-muted",
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className="size-full flex-1 bg-primary transition-all"
        style={{ transform: `translateX(-${100 - (clamped || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  )
}

export { Progress }
