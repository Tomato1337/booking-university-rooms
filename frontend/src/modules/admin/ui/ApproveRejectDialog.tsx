import { reatomComponent, useWrap } from "@reatom/react"
import { useState } from "react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog"

import { rejectBookingMutation } from "../application/booking-management-atoms"

export interface ApproveRejectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  bookingId: string
  bookingLabel: string
  mode?: "reject" | "approve"
  onApproveConfirm?: () => void | Promise<void>
}

export const ApproveRejectDialog = reatomComponent<ApproveRejectDialogProps>(
  ({
    open,
    onOpenChange,
    bookingId,
    bookingLabel,
    mode = "reject",
    onApproveConfirm,
  }) => {
    const [reason, setReason] = useState("")
    const rejectStatus = rejectBookingMutation.status()

    const wrapReject = useWrap(async () => {
      await rejectBookingMutation({
        bookingId,
        reason: reason.trim() || undefined,
      })

      setReason("")
      onOpenChange(false)
    })

    const wrapApprove = useWrap(async () => {
      if (onApproveConfirm) {
        await onApproveConfirm()
      }

      onOpenChange(false)
    })

    const rejectPending = rejectStatus.isPending
    const isRejectMode = mode === "reject"

    return (
      <AlertDialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setReason("")
          }
          onOpenChange(nextOpen)
        }}
      >
        <AlertDialogContent size="sm" data-slot="approve-reject-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isRejectMode ? "Reject Booking" : "Approve Booking"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isRejectMode
                ? `Reject ${bookingLabel}? You can provide an optional reason.`
                : `Approve ${bookingLabel}? Conflicting pending requests may be auto-rejected.`}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {isRejectMode && (
            <label className="flex flex-col gap-2">
              <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                Rejection reason (optional)
              </span>
              <textarea
                value={reason}
                onChange={useWrap((e) => setReason(e.target.value))}
                maxLength={500}
                placeholder="Reason for rejecting this request..."
                className="min-h-28 w-full resize-y rounded-none border border-outline-variant/20 bg-surface-container-low px-3 py-2 text-xs text-on-surface outline-none transition-colors duration-150 ease-linear placeholder:text-on-surface-variant/60 focus-visible:border-primary/20 focus-visible:ring-1 focus-visible:ring-primary/20"
              />
            </label>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant={isRejectMode ? "destructive" : "default"}
              onClick={(e) => {
                e.preventDefault()
                if (isRejectMode) {
                  wrapReject()
                } else {
                  wrapApprove()
                }
              }}
            >
              {isRejectMode
                ? rejectPending
                  ? "Rejecting..."
                  : "Reject Booking"
                : "Approve Booking"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    )
  },
  "ApproveRejectDialog",
)
