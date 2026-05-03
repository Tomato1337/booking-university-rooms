import { useState } from 'react'

import { tAtom } from '@/modules/i18n'
import { Button } from '@/shared/ui/button'
import { StatusBadge } from '@/shared/ui/status-badge'
import { StatusIndicator } from '@/shared/ui/status-indicator'
import { reatomComponent, useAtom, useWrap } from '@reatom/react'
import { IconCheck, IconX } from '@tabler/icons-react'

import { approveBookingMutation } from '../application/booking-management-atoms'
import type { AdminPendingBooking } from '../domain/types'
import { ApproveRejectDialog } from './ApproveRejectDialog'

export interface AdminBookingRowProps {
	booking: AdminPendingBooking
	isHistory?: boolean
	onOpen: () => void
}

function formatBookingDate(value: string): string {
	const date = new Date(`${value}T00:00:00Z`)
	if (Number.isNaN(date.getTime())) return value

	return new Intl.DateTimeFormat('en-US', {
		month: 'short',
		day: '2-digit',
		year: 'numeric',
		timeZone: 'UTC',
	}).format(date)
}

export const AdminBookingRow = reatomComponent<AdminBookingRowProps>(
	({ booking, isHistory = false, onOpen }) => {
		const [t] = useAtom(tAtom)
		const [rejectOpen, setRejectOpen] = useState(false)

		const approveStatus = approveBookingMutation.status()
		const approvePending = approveStatus.isPending

		const userName = `${booking.user.firstName} ${booking.user.lastName}`
		const department = booking.user.department ?? t.admin.bookings.noDepartment
		const timeRange = `${booking.startTime} — ${booking.endTime}`
		const bookingDate = formatBookingDate(booking.bookingDate).toUpperCase()
		const bookingLabel = `${booking.title} (${booking.room.name})`

		const wrapApprove = useWrap(async () => {
			await approveBookingMutation(booking.id)
		})

		const indicatorStatus =
			booking.status === 'pending'
				? 'pending'
				: booking.status === 'confirmed'
					? 'available'
					: 'booked'

		const statusLabel =
			booking.status === 'pending'
				? t.bookings.status.pending
				: booking.status === 'confirmed'
					? t.bookings.status.confirmed
					: booking.status === 'rejected'
						? t.bookings.status.rejected
						: t.bookings.status.cancelled

		const formatPurpose = (purpose: string) => {
			return purpose.replace(/_/g, ' ')
		}

		return (
			<>
				<div
					data-slot="admin-booking-row"
					className="relative grid grid-cols-1 items-center gap-4 bg-surface-container-low px-8 py-6 pl-10 transition-colors duration-150 ease-linear hover:bg-surface-container md:grid-cols-5"
				>
					<StatusIndicator
						className="absolute top-0 bottom-0 left-0 rounded-none"
						orientation="vertical"
						status={indicatorStatus}
					/>

					<div className="flex items-center gap-4">
						<span className="mb-1 text-[0.65rem] uppercase text-on-surface-variant md:hidden">
							{t.admin.bookings.columns.user}
						</span>
						<div className="flex size-8 shrink-0 items-center justify-center bg-surface-container-highest text-xs font-bold text-primary">
							{booking.user.initials}
						</div>
						<div className="flex flex-col">
							<p className="text-sm font-bold text-on-surface">{userName}</p>
							<p className="text-xs text-on-surface-variant/50">{department}</p>
						</div>
					</div>

					<div className="flex flex-col gap-0.5">
						<span className="mb-1 text-[0.65rem] uppercase text-on-surface-variant md:hidden">
							{t.admin.bookings.columns.details}
						</span>
						<Button
							onClick={onOpen}
							variant={'link'}
							className="text-lg font-bold uppercase tracking-tighter text-on-surface w-max m-0 p-0 text-primary"
						>
							{booking.room.name}
						</Button>
						<p className="text-xs tracking-wider text-on-surface-variant">{booking.title}</p>
						<p className="text-xs tracking-wider uppercase text-on-surface-variant/50">
							{formatPurpose(booking.purpose)}
						</p>
					</div>

					<div className="flex flex-col gap-0.5">
						<span className="mb-1 text-[0.65rem] uppercase text-on-surface-variant md:hidden">
							{t.admin.bookings.columns.datetime}
						</span>
						<p className="text-sm font-bold uppercase text-on-surface">{bookingDate}</p>
						<p className="text-sm text-on-surface-variant">{timeRange}</p>
					</div>

					<div className="flex md:justify-start">
						<span className="mb-1 text-[0.65rem] uppercase text-on-surface-variant md:hidden">
							{t.admin.bookings.columns.status}
						</span>
						<StatusBadge status={booking.status} label={statusLabel} />
					</div>

					<div className="flex gap-2 md:justify-end">
						{!isHistory && (
							<>
								<Button
									aria-label="Approve booking"
									size="icon-sm"
									type="button"
									variant="default"
									disabled={approvePending}
									onClick={wrapApprove}
								>
									<IconCheck className="size-4" />
								</Button>
								<Button
									aria-label="Reject booking"
									size="icon-sm"
									type="button"
									variant="destructive"
									onClick={() => setRejectOpen(true)}
								>
									<IconX className="size-4" />
								</Button>
							</>
						)}
					</div>
				</div>

				{!isHistory && (
					<ApproveRejectDialog
						open={rejectOpen}
						onOpenChange={setRejectOpen}
						bookingId={booking.id}
						bookingLabel={bookingLabel}
						mode="reject"
					/>
				)}
			</>
		)
	},
	'AdminBookingRow',
)
