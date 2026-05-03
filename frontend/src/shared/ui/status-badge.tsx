import type { ComponentProps } from "react"

import { Badge } from "@/shared/ui/badge"

type BadgeVariant = ComponentProps<typeof Badge>["variant"]

export type StatusBadgeStatus =
  | "active"
  | "inactive"
  | "available"
  | "unavailable"
  | "pending"
  | "confirmed"
  | "rejected"
  | "cancelled"

const STATUS_VARIANTS: Record<StatusBadgeStatus, BadgeVariant> = {
  active: "confirmed",
  inactive: "booked",
  available: "available",
  unavailable: "booked",
  pending: "pending",
  confirmed: "confirmed",
  rejected: "booked",
  cancelled: "booked",
}

interface StatusBadgeProps extends Omit<ComponentProps<typeof Badge>, "variant" | "children"> {
  status: StatusBadgeStatus
  label: string
}

export function StatusBadge({ status, label, ...props }: StatusBadgeProps) {
  return (
    <Badge dot variant={STATUS_VARIANTS[status]} {...props}>
      {label}
    </Badge>
  )
}
