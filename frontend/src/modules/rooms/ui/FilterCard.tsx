import type { ComponentType } from "react"

import { cn } from "@/shared/lib/utils"

interface FilterCardProps {
  /** Filter label, e.g. "Date", "Time Window" */
  label: string
  /** Display value, e.g. "OCT 24, 2024" */
  value: string
  /** Tabler icon component */
  icon: ComponentType<{ className?: string; size?: number }>
  /** Additional className */
  className?: string
}

function FilterCard({ label, value, icon: Icon, className }: FilterCardProps) {
  return (
    <div
      data-slot="filter-card"
      className={cn(
        "flex flex-col gap-2 bg-surface-container-high p-4",
        className,
      )}
    >
      <span className="text-xs font-bold uppercase tracking-[0.1em] text-on-surface-variant">
        {label}
      </span>
      <div className="flex items-center justify-between text-on-surface">
        <span className="text-lg font-bold">{value}</span>
        <Icon size={20} className="text-primary" />
      </div>
    </div>
  )
}

export { FilterCard }
export type { FilterCardProps }
