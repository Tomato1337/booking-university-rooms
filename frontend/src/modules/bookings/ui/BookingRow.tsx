import type { ComponentProps } from 'react'

import { tAtom } from '@/modules/i18n'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import { StatusBadge } from '@/shared/ui/status-badge'
import { StatusIndicator } from '@/shared/ui/status-indicator'
import { useAtom } from '@reatom/react'

export type BookingRowStatus = 'pending' | 'confirmed' | 'rejected' | 'cancelled'

export interface BookingRowProps extends ComponentProps<'article'> {
	/** Room display name, e.g. "RM_402 QUANTUM LAB" */
	roomName: string
	/** Booking identifier, e.g. "#BK-88291-Q" */
	title: string
	/** Formatted date string, e.g. "OCT 24, 2023" */
	date: string
	/** Localized booking purpose */
	purposeLabel: string
	/** Formatted time range, e.g. "14:00 — 16:30" */
	timeRange: string
	/** Building/location, e.g. "SCIENCE BLOCK B" */
	location: string
	/** Booking status */
	status: BookingRowStatus
	/** Called when cancel button is clicked */
	onCancel?: () => void
	/** Called when row is clicked */
	onOpen?: () => void
	/** Disable cancel action button */
	cancelDisabled?: boolean
}

function BookingRow({
	roomName,
	title,
	date,
	purposeLabel,
	timeRange,
	location,
	status,
	onCancel,
	onOpen,
	cancelDisabled = false,
	className,
	...props
}: BookingRowProps) {
	const [t] = useAtom(tAtom)
	const indicatorStatus =
		status === 'pending' ? 'pending' : status === 'confirmed' ? 'available' : 'booked'

	const statusLabel =
		status === 'pending'
			? t.bookings.status.pending
			: status === 'confirmed'
				? t.bookings.status.confirmed
				: status === 'rejected'
					? t.bookings.status.rejected
					: t.bookings.status.cancelled

	return (
		<article
			data-slot="booking-row"
			className={cn(
				'relative grid grid-cols-1 items-center gap-4 bg-surface-container-low px-8 py-8 pl-10 transition-all duration-100 ease-linear md:grid-cols-5',
				className,
			)}
			{...props}
		>
			<StatusIndicator
				className="absolute top-0 bottom-0 left-0 rounded-none"
				orientation="vertical"
				status={indicatorStatus}
			/>

			{/* Booking Details */}
			<div className="flex flex-col gap-0.5">
				<span className="mb-1 text-[0.65rem] uppercase text-on-surface-variant md:hidden">
					{t.bookings.columns.details}
				</span>
				<Button
					className={cn(
						'text-lg font-bold uppercase tracking-tighter text-on-surface m-0 p-0 w-max',
						{
							'text-primary': onOpen,
						},
					)}
					onClick={onOpen}
					variant={'link'}
				>
					{roomName}
				</Button>
				<p className="text-xs tracking-wider text-on-surface-variant">{title}</p>
				<p className="text-xs tracking-wider uppercase text-on-surface-variant/50">
					{purposeLabel}
				</p>
			</div>

			{/* Date & Time */}
			<div className="flex flex-col gap-0.5">
				<span className="mb-1 text-[0.65rem] uppercase text-on-surface-variant md:hidden">
					{t.bookings.columns.datetime}
				</span>
				<p className="text-sm font-bold uppercase text-on-surface">{date}</p>
				<p className="text-sm text-on-surface-variant">{timeRange}</p>
			</div>

			{/* Location */}
			<div>
				<span className="mb-1 text-[0.65rem] uppercase text-on-surface-variant md:hidden">
					{t.bookings.columns.location}
				</span>
				<p className="text-sm font-bold uppercase text-on-surface">{location}</p>
			</div>

			{/* Status */}
			<div>
				<span className="mb-1 text-[0.65rem] uppercase text-on-surface-variant md:hidden">
					{t.bookings.columns.status}
				</span>
				<StatusBadge status={status} label={statusLabel} />
			</div>

			{/* Action */}
			<div className="flex md:justify-end">
				<Button
					className="uppercase tracking-widest"
					size="sm"
					type="button"
					variant="outline"
					disabled={cancelDisabled}
					onClick={(e) => {
						e.stopPropagation()
						onCancel?.()
					}}
				>
					{t.bookings.actions.cancel}
				</Button>
			</div>
		</article>
	)
}

export { BookingRow }
