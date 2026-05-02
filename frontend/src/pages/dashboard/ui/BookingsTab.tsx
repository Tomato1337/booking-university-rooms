import { useEffect, useRef, useState } from 'react'

import {
	AdminBookingRow,
	adminStatsQuery,
	loadMorePendingBookingsAction,
	pendingBookingsListAtom,
	pendingBookingsQuery,
	pendingHasMoreAtom,
	pendingSearchAtom,
	searchPendingBookingsAction,
	updatePendingSearchAction,
	loadMoreHistoryBookingsAction,
	historyBookingsListAtom,
	historyBookingsQuery,
	historyHasMoreAtom,
	historySearchAtom,
	searchHistoryBookingsAction,
	updateHistorySearchAction,
} from '@/modules/admin'
import { tAtom } from '@/modules/i18n'
import { roomDetailRoute } from '@/pages/room-detail'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import { MetricCard, MetricLabel, MetricValue } from '@/shared/ui/metric-card'
import Search from '@/shared/ui/search'
import { reatomComponent, useWrap } from '@reatom/react'

type BookingsTabType = 'active' | 'history'

export const BookingsTab = reatomComponent(() => {
	const [activeTab, setActiveTab] = useState<BookingsTabType>('active')
	const t = tAtom()

	const stats = adminStatsQuery.data()

	const pendingBookings = pendingBookingsListAtom()
	const pendingQuery = pendingSearchAtom()
	const hasMorePending = pendingHasMoreAtom()
	const pendingStatus = pendingBookingsQuery.status()

	const historyBookings = historyBookingsListAtom()
	const historyQuery = historySearchAtom()
	const hasMoreHistory = historyHasMoreAtom()
	const historyStatus = historyBookingsQuery.status()

	const sentinelRef = useRef<HTMLDivElement>(null)

	const currentBookings = activeTab === 'active' ? pendingBookings : historyBookings
	const currentQuery = activeTab === 'active' ? pendingQuery : historyQuery
	const hasMore = activeTab === 'active' ? hasMorePending : hasMoreHistory
	const isFirstPending =
		activeTab === 'active' ? pendingStatus.isFirstPending : historyStatus.isFirstPending
	const isPending = activeTab === 'active' ? pendingStatus.isPending : historyStatus.isPending

	const wrapSearch = useWrap((value: string) => {
		if (activeTab === 'active') {
			updatePendingSearchAction(value)
		} else {
			updateHistorySearchAction(value)
		}
	})

	const wrapLoadMore = useWrap(() => {
		if (activeTab === 'active') {
			loadMorePendingBookingsAction()
		} else {
			loadMoreHistoryBookingsAction()
		}
	})

	const wrapActivate = useWrap(() => {
		searchPendingBookingsAction()
		searchHistoryBookingsAction()
	})

	const wrapOpenBookingRoom = useWrap((booking: (typeof currentBookings)[number]) => {
		roomDetailRoute.go({ roomId: booking.room.id, date: booking.bookingDate })
	})

	useEffect(() => {
		wrapActivate()
	}, [wrapActivate])

	useEffect(() => {
		const sentinel = sentinelRef.current
		if (!sentinel) return

		const observer = new IntersectionObserver(
			(entries) => {
				const entry = entries[0]
				if (!entry) return

				if (entry.isIntersecting && hasMore && !isPending) {
					wrapLoadMore()
				}
			},
			{ rootMargin: '200px' },
		)

		observer.observe(sentinel)
		return () => observer.disconnect()
	}, [hasMore, isPending, wrapLoadMore])

	return (
		<section data-slot="dashboard-bookings-tab" className="flex flex-1 flex-col gap-6">
			<section className="grid grid-cols-1 gap-6 md:grid-cols-4">
				<MetricCard stripe="pending">
					<MetricLabel>{t.admin.bookings.metrics.pendingRequests}</MetricLabel>
					<MetricValue>{stats.pendingCount}</MetricValue>
				</MetricCard>
				<MetricCard stripe="available">
					<MetricLabel>{t.admin.bookings.metrics.todayBookings}</MetricLabel>
					<MetricValue>{stats.todayBookingsCount}</MetricValue>
				</MetricCard>
				<MetricCard stripe="booked">
					<MetricLabel>{t.admin.bookings.metrics.occupancyRate}</MetricLabel>
					<MetricValue>{stats.occupancyRate}%</MetricValue>
				</MetricCard>
				<MetricCard stripe="available">
					<MetricLabel>{t.admin.bookings.metrics.activeRooms}</MetricLabel>
					<MetricValue>{stats.totalActiveRooms}</MetricValue>
				</MetricCard>
			</section>

			<section className="flex flex-1 flex-col gap-6">
				<div className="flex items-center justify-between">
					<h3 className="text-[1.75rem] font-black uppercase tracking-tighter">
						{t.admin.bookings.title}
					</h3>
					<div className="flex items-center gap-6">
						<Button
							type="button"
							variant={'tab'}
							className={cn('-mr-2', {
								'text-primary font-black': activeTab === 'active',
							})}
							onClick={() => setActiveTab('active')}
						>
							{t.admin.bookings.tabs.active}
						</Button>

						<Button
							type="button"
							variant={'tab'}
							className={cn('-mr-2', {
								'text-primary font-black': activeTab === 'history',
							})}
							onClick={() => setActiveTab('history')}
						>
							{t.admin.bookings.tabs.history}
						</Button>
					</div>
				</div>

				<div className="flex flex-col">
					<Search
						query={currentQuery}
						wrapSearch={wrapSearch}
						placeholder={t.admin.bookings.searchPlaceholder}
					/>

					<div className="hidden bg-surface-container-high px-8 pl-10 py-4 md:grid md:grid-cols-5 gap-4">
						<span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
							{t.admin.bookings.columns.user}
						</span>
						<span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
							{t.admin.bookings.columns.details}
						</span>
						<span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
							{t.admin.bookings.columns.datetime}
						</span>
						<span className="text-left text-xs font-bold uppercase tracking-widest text-on-surface-variant">
							{t.admin.bookings.columns.status}
						</span>
						<span className="text-right text-xs font-bold uppercase tracking-widest text-on-surface-variant">
							{t.admin.bookings.columns.actions}
						</span>
					</div>

					<div className="flex flex-col gap-1 bg-surface-container-lowest">
						{isFirstPending ? (
							<div className="flex items-center justify-center bg-surface-container-low py-20">
								<p className="text-sm font-bold uppercase tracking-widest text-on-surface-variant">
									{t.admin.bookings.loading}
								</p>
							</div>
						) : currentBookings.length > 0 ? (
							currentBookings.map((booking) => (
								<AdminBookingRow
									key={booking.id}
									booking={booking}
									isHistory={activeTab === 'history'}
									onOpen={() => wrapOpenBookingRoom(booking)}
								/>
							))
						) : (
							<div className="flex items-center justify-center bg-surface-container-low py-20">
								<p className="text-sm font-bold uppercase tracking-widest text-on-surface-variant">
									{activeTab === 'active'
										? t.admin.bookings.noPendingRequests
										: t.admin.bookings.noHistory}
								</p>
							</div>
						)}
					</div>

					{hasMore && <div ref={sentinelRef} className="h-1" />}
				</div>
			</section>
		</section>
	)
}, 'BookingsTab')
