import { ru, enUS } from 'date-fns/locale'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createElement } from 'react'
import { z } from 'zod/v4'

import {
	cancelBookingErrorAtom,
	cancelBookingStatusAtom,
	CreateBookingForm,
	setCreateBookingTimeRangeAction,
} from '@/modules/bookings'
import { tAtom, localeAtom } from '@/modules/i18n'
import {
	cancelMyBookingFromRoomDetailAction,
	invalidateRoomDetailCacheAction,
	refreshRoomDetailAction,
	TimeGrid,
	type TimeSlot,
	buildRoomDetailTimeGridSlots,
	getEquipmentIcon,
	loadRoomDetailAction,
	roomDetailAtom,
	roomDetailErrorAtom,
	roomDetailLoadingAtom,
} from '@/modules/rooms'
import { cn, parseDateStr, todayUtcStr, toUtcDateStr } from '@/shared/lib/utils'
import { rootRoute } from '@/shared/router'
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/shared/ui/alert-dialog'
import { Button } from '@/shared/ui/button'
import { Calendar } from '@/shared/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover'
import { wrap } from '@reatom/core'
import { reatomComponent, useWrap, useAtom } from '@reatom/react'
import { IconPhoto } from '@tabler/icons-react'

function EquipmentIcon({ icon }: { icon: string }) {
	const Icon = getEquipmentIcon(icon)
	return createElement(Icon, { className: 'size-5 text-primary' })
}

const YourBookingsPanel = reatomComponent(() => {
	const [t] = useAtom(tAtom)
	const detail = roomDetailAtom()
	const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
	const [bookingToCancel, setBookingToCancel] = useState<{
		id: string
		title: string
	} | null>(null)
	const cancelStatus = cancelBookingStatusAtom()
	const cancelError = cancelBookingErrorAtom()

	const wrapOpenCancel = useWrap((booking: { id: string; title: string }) => {
		setBookingToCancel(booking)
		setCancelDialogOpen(true)
	})

	const wrapCancel = useWrap(async () => {
		if (!bookingToCancel) return

		const ok = await wrap(cancelMyBookingFromRoomDetailAction(bookingToCancel.id))
		if (!ok) return

		setCancelDialogOpen(false)
		setBookingToCancel(null)
	})

	if (!detail || detail.userBookingsToday.length === 0) {
		return null
	}

	return (
		<section
			data-slot="your-bookings-panel"
			className="flex flex-col gap-4 bg-surface-container p-8"
		>
			<header className="flex items-center justify-between gap-3">
				<h3 className="text-[1.4rem] font-black uppercase tracking-tight text-on-surface">
					{t.roomDetail.yourBookings}
				</h3>
				<span className="text-[1.4rem] font-bold uppercase tracking-[0.2em] text-on-surface-variant">
					{detail.userBookingsToday.length}
				</span>
			</header>

			<div className="flex flex-col gap-3">
				{detail.userBookingsToday.map((booking) => {
					const statusLabel = t.bookings.status[booking.status] ?? booking.status

					return (
					<article
						key={booking.id}
						className={cn('border-l-2 border-primary bg-surface-container-low p-4', {
							'border-tertiary': booking.status === 'pending',
						})}
					>
						<h4 className="text-sm font-bold uppercase tracking-wide text-on-surface">
							{booking.title}
						</h4>
						<p className="mt-1 text-xs font-bold uppercase tracking-widest text-on-surface-variant">
							{booking.startTime} - {booking.endTime}
						</p>
						<p
							className={cn(
								'mt-2 text-[0.65rem] font-bold uppercase tracking-widest text-primary',
								{
									'text-tertiary': booking.status === 'pending',
								},
							)}
						>
							{statusLabel}
						</p>
						<Button
							className="mt-3 w-full uppercase tracking-widest"
							size="sm"
							type="button"
							variant="outline"
							onClick={() => wrapOpenCancel({ id: booking.id, title: booking.title })}
						>
							{t.roomDetail.actions.cancel}
						</Button>
					</article>
					)
				})}
			</div>

			<AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
				<AlertDialogContent size="sm">
					<AlertDialogHeader>
						<AlertDialogTitle>{t.roomDetail.alerts.cancelTitle}</AlertDialogTitle>
						<AlertDialogDescription>
							{bookingToCancel
								? t.roomDetail.alerts.cancelDescNamed.replace('{title}', bookingToCancel.title)
								: t.roomDetail.alerts.cancelDesc}
						</AlertDialogDescription>
					</AlertDialogHeader>
					{cancelError && (
						<p className="text-xs font-bold uppercase tracking-widest text-secondary">
							{cancelError}
						</p>
					)}
					<AlertDialogFooter>
						<AlertDialogCancel>{t.roomDetail.alerts.keepBooking}</AlertDialogCancel>
						<AlertDialogAction
							variant="destructive"
							onClick={(e) => {
								e.preventDefault()
								wrapCancel()
							}}
						>
							{cancelStatus === 'submitting'
								? t.roomDetail.alerts.cancelling
								: t.roomDetail.alerts.confirmCancel}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</section>
	)
}, 'YourBookingsPanel')

export const roomDetailRoute = rootRoute.reatomRoute(
	{
		path: 'rooms/:roomId',
		params: z.object({ roomId: z.string() }),
		search: z.object({
			date: z
				.string()
				.regex(/^\d{4}-\d{2}-\d{2}$/)
				.optional(),
		}),
		render: () => <RoomDetailPage />,
	},
	'roomDetail',
)

const RoomDetailPage = reatomComponent(() => {
	const [t] = useAtom(tAtom)
	const [locale] = useAtom(localeAtom)
	const dfLocale = locale === 'ru' ? ru : enUS
	const params = roomDetailRoute()
	const detail = roomDetailAtom()
	const loading = roomDetailLoadingAtom()
	const loadError = roomDetailErrorAtom()
	const refCreateBookingTimeRange = useRef<HTMLInputElement | null>(null)

	const roomId = params?.roomId ?? ''
	const date = params?.date ?? todayUtcStr()
	const today = new Date()
	const [calendarOpen, setCalendarOpen] = useState(false)

	const wrapLoad = useWrap((nextRoomId: string, nextDate: string) => {
		const today = todayUtcStr()
		const safeDate = new Date(nextDate) < new Date(today) ? today : nextDate
		if (safeDate !== nextDate) {
			roomDetailRoute.go({ roomId: nextRoomId, date: safeDate }, true)
			return null
		}
		return loadRoomDetailAction({ roomId: nextRoomId, date: safeDate })
	})

	const wrapRefresh = useWrap(() => refreshRoomDetailAction())

	useLayoutEffect(() => {
		document.documentElement.scrollTo({ top: 0 })
	}, [])

	useEffect(() => {
		wrapLoad(roomId, date)
	}, [date, roomId, wrapLoad])

	const wrapChangeDate = useWrap((next: Date | undefined) => {
		if (!next) return
		setCalendarOpen(false)
		if (roomId) {
			invalidateRoomDetailCacheAction({ roomId, date })
		}
		roomDetailRoute.go({ roomId, date: toUtcDateStr(next) })
	})

	const wrapSelectSlot = useWrap((slot: TimeSlot) => {
		if (slot.status !== 'available' && slot.status !== 'pending' && slot.status !== 'yours_pending')
			return
		if (!slot.startTime || !slot.endTime) return

		setCreateBookingTimeRangeAction({
			startTime: slot.startTime,
			endTime: slot.endTime,
		})
		if (refCreateBookingTimeRange.current) {
			refCreateBookingTimeRange.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
			refCreateBookingTimeRange.current?.focus({
				preventScroll: true,
			})
		}
	})

	const slots = useMemo(
		() => (detail ? buildRoomDetailTimeGridSlots(detail.timeSlots) : []),
		[detail],
	)
	const hasOwnBookingsToday = Boolean(detail && detail.userBookingsToday.length > 0)

	return (
		<div
			data-slot="room-detail-page"
			className="flex min-h-full flex-col gap-10 px-6 py-8 md:px-10 relative"
		>
			<section className="flex flex-col gap-4 z-10">
				<div className="flex items-center justify-between gap-6">
					<div>
						<span className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-primary">
							{detail
								? `${detail.buildingLabel ?? detail.building} / Level ${String(detail.floor).padStart(2, '0')}`
								: ''}
						</span>
						<h1 className="text-[3.5rem] font-black uppercase leading-[1.1] tracking-tighter">
							{detail ? detail.name : loading ? t.roomDetail.loadingTitle : ''}
						</h1>
					</div>

					<Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
						<PopoverTrigger asChild>
							<Button
								variant="ghost"
								className="h-auto px-6 py-4 -mr-6 text-xs font-black uppercase tracking-widest"
							>
								{date}
							</Button>
						</PopoverTrigger>
						<PopoverContent className="w-auto p-3" align="end">
							<Calendar
								mode="single"
								selected={parseDateStr(date)}
								onSelect={wrapChangeDate}
								disabled={{ before: today }}
								startMonth={parseDateStr(date) ?? today}
								defaultMonth={parseDateStr(date) ?? today}
								locale={dfLocale}
							/>
						</PopoverContent>
					</Popover>
				</div>

				{loadError && (
					<div className="border-l-2 border-secondary bg-surface-container-low p-4">
						<p className="text-xs font-bold uppercase tracking-widest text-secondary">
							{loadError}
						</p>
					</div>
				)}
			</section>

			<div className="grid grid-cols-1 gap-10 lg:grid-cols-12 z-10">
				<div className="flex flex-col gap-10 lg:col-span-8">
					<div className="grid grid-cols-1 gap-px bg-surface-container-low p-px md:grid-cols-3">
						<div className="flex flex-col gap-2 bg-surface-container p-6">
							<span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
								{t.roomDetail.capacity}
							</span>
							<div className="flex items-end gap-2">
								<span className="text-2xl font-bold">{detail?.capacity ?? '--'}</span>
								<span className="pb-1 text-on-surface-variant">{t.roomDetail.persons}</span>
							</div>
						</div>
						<div className="flex flex-col gap-2 bg-surface-container p-6">
							<span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
								{t.roomDetail.type}
							</span>
							<span className="text-2xl font-bold">{detail?.roomTypeLabel ?? detail?.roomType ?? '--'}</span>
						</div>
						<div className="flex flex-col gap-2 bg-surface-container p-6">
							<span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
								{t.roomDetail.condition}
							</span>
							<div className="flex items-center gap-2">
								<div className="h-2 w-2 rounded-full bg-primary" />
								<span className="text-2xl font-bold">{t.roomDetail.pristine}</span>
							</div>
						</div>
					</div>

					{detail && (
						<section className="grid grid-cols-1 gap-6 bg-surface-container-low p-6 md:grid-cols-[minmax(220px,360px)_1fr]">
							<div className="min-h-56 bg-surface-container-high">
								{detail.photos?.[0] ? (
									<img
										src={detail.photos[0]}
										alt={detail.name}
										className="h-full min-h-56 w-full object-cover"
									/>
								) : (
									<div className="flex min-h-56 items-center justify-center">
										<IconPhoto className="size-10 text-on-surface-variant/40" />
									</div>
								)}
							</div>
							<div className="flex flex-col justify-center gap-3">
								<h2 className="text-[1.4rem] font-black uppercase tracking-tight text-on-surface">
									{t.admin.rooms.form.descriptionLabel}
								</h2>
								<p className="text-sm leading-6 text-on-surface-variant">
									{detail.description ? detail.description : t.admin.rooms.form.descriptionLabel}
								</p>
							</div>
						</section>
					)}

					<section className="flex flex-col gap-6">
						<h2 className="text-[1.75rem] font-bold tracking-tight">{t.roomDetail.equipment}</h2>
						<div className="grid grid-cols-2 gap-4 md:grid-cols-4">
							{(detail?.equipment ?? []).map((item) => (
								<div
									key={item.id}
									className="flex items-center gap-3 border-l-4 border-primary bg-surface-container-high p-4"
								>
									<EquipmentIcon icon={item.icon} />
									<span className="text-xs font-bold uppercase tracking-wider">{item.name}</span>
								</div>
							))}
						</div>
					</section>

					<TimeGrid
						title={t.roomDetail.occupancy}
						subtitle={`${detail?.openTime ?? '08:00'} — ${detail?.closeTime ?? '20:00'} / ${date}`}
						slots={slots}
						onSlotSelect={wrapSelectSlot}
					/>

					{detail && hasOwnBookingsToday && (
						<CreateBookingForm
							roomId={roomId}
							date={date}
							roomCapacity={detail.capacity}
							timeSlots={detail.timeSlots}
							userBookingsToday={detail.userBookingsToday}
							onBooked={wrapRefresh}
							ref={refCreateBookingTimeRange}
						/>
					)}
				</div>

				<div className="lg:col-span-4">
					<div className="sticky top-0">
						{detail && hasOwnBookingsToday && <YourBookingsPanel />}

						{detail && !hasOwnBookingsToday && (
							<CreateBookingForm
								roomId={roomId}
								date={date}
								roomCapacity={detail.capacity}
								timeSlots={detail.timeSlots}
								userBookingsToday={detail.userBookingsToday}
								onBooked={wrapRefresh}
								ref={refCreateBookingTimeRange}
							/>
						)}
					</div>
				</div>
			</div>
			<div className="fixed hidden md:block bottom-2 right-8 text-[20vh] text-accent/50 font-bold pointer-events-none select-none">
				{detail ? detail.name : ''}
			</div>
		</div>
	)
}, 'RoomDetailPage')
