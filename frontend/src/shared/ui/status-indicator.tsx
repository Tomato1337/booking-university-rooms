import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/shared/lib/utils"

const statusIndicatorVariants = cva(
  "shrink-0 rounded-sm",
  {
    variants: {
      status: {
        available: "bg-primary",
        booked: "bg-secondary",
        pending: "bg-tertiary",
        error: "bg-destructive",
      },
      orientation: {
        vertical: "w-1 self-stretch",
        horizontal: "h-1 w-full",
      },
    },
    defaultVariants: {
      status: "available",
      orientation: "vertical",
    },
  }
)

type StatusIndicatorProps = React.ComponentProps<"div"> &
  VariantProps<typeof statusIndicatorVariants>

function StatusIndicator({
  className,
  status,
  orientation,
  ...props
}: StatusIndicatorProps) {
  return (
    <div
      data-slot="status-indicator"
      data-status={status}
      role="presentation"
      aria-hidden="true"
      className={cn(statusIndicatorVariants({ status, orientation }), className)}
      {...props}
    />
  )
}

export { StatusIndicator, statusIndicatorVariants }
export type { StatusIndicatorProps }
