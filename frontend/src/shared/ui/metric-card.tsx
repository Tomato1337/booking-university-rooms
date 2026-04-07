import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/shared/lib/utils"

const metricCardVariants = cva(
  "relative flex flex-col gap-1 overflow-hidden rounded-sm bg-surface-container-low p-6 text-on-surface",
  {
    variants: {
      stripe: {
        none: "",
        available: "border-l-4 border-l-primary",
        booked: "border-l-4 border-l-secondary",
        pending: "border-l-4 border-l-tertiary",
        error: "border-l-4 border-l-destructive",
      },
    },
    defaultVariants: {
      stripe: "none",
    },
  }
)

function MetricCard({
  className,
  stripe,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof metricCardVariants>) {
  return (
    <div
      data-slot="metric-card"
      className={cn(metricCardVariants({ stripe }), className)}
      {...props}
    />
  )
}

function MetricLabel({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="metric-label"
      className={cn(
        "text-xs font-medium uppercase tracking-widest text-on-surface-variant",
        className
      )}
      {...props}
    />
  )
}

function MetricValue({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="metric-value"
      className={cn(
        "text-4xl font-black tracking-tighter text-on-surface",
        className
      )}
      {...props}
    />
  )
}

export { MetricCard, metricCardVariants, MetricLabel, MetricValue }
