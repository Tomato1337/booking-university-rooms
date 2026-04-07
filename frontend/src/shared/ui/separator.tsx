import * as React from "react"
import { Separator as SeparatorPrimitive } from "radix-ui"

import { cn } from "@/shared/lib/utils"

function Separator({
  className,
  orientation = "horizontal",
  decorative = true,
  ...props
}: React.ComponentProps<typeof SeparatorPrimitive.Root>) {
  return (
    <SeparatorPrimitive.Root
      data-slot="separator"
      decorative={decorative}
      orientation={orientation}
      className={cn(
        "shrink-0 bg-surface-container data-horizontal:h-1.5 data-horizontal:w-full data-vertical:w-1.5 data-vertical:self-stretch",
        className
      )}
      {...props}
    />
  )
}

export { Separator }
