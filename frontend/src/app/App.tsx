import './index.css'
import { useEffect } from 'react'
import type { ReactNode } from 'react'

import { authStatusAtom, currentUserAtom } from '@/modules/auth'
import { tAtom } from '@/modules/i18n'
import { roomsBackHrefAtom } from '@/modules/rooms'
import { roomDetailAtom } from '@/modules/rooms'
import { AppSidebar } from '@/modules/sidebar/ui/AppSidebar'
import { SidebarProvider, SidebarTrigger } from '@/shared/ui/sidebar'
import { urlAtom, withChangeHook } from '@reatom/core'
import { reatomComponent, useWrap } from '@reatom/react'
import { useAtom } from '@reatom/react'
import { IconLoader2 } from '@tabler/icons-react'

import {
	authRoute,
	bookingsRoute,
	dashboardRoute,
	roomDetailRoute,
	roomsRoute,
	rootRoute,
} from './routes'

function isRoomsBackHrefValid(href: string | null, roomsHref: string): href is string {
	if (!href) return false

	return href === roomsHref || href.startsWith(`${roomsHref}?`)
}

urlAtom.extend(
	withChangeHook(() => {
		if (rootRoute.exact()) {
			dashboardRoute.go(undefined, true)
		}
	}),
)

interface PageMeta {
	route: { match(): unknown }
	title: string
	parent?: {
		route: { path(): string }
		title: string
	}
}

const App = reatomComponent(() => {
	const status = authStatusAtom()
	const roomsBackHref = roomsBackHrefAtom()
	const user = currentUserAtom()
	const detail = roomDetailAtom()
	const [t] = useAtom(tAtom)

	const isUnauthenticated = status === 'unauthenticated'
	const isAuthRoute = authRoute.match()
	const isDashboardRoute = dashboardRoute.match()
	const role = user?.role

	const wrapRedirectToAuth = useWrap(() => {
		if (isUnauthenticated && !isAuthRoute) {
			authRoute.go(undefined, true)
		}
	})

	const wrapRedirectFromAuth = useWrap(() => {
		if (status !== 'authenticated') return

		if (isAuthRoute) {
			dashboardRoute.go(undefined, true)
		} else if (isDashboardRoute && role !== 'admin') {
			roomsRoute.go(undefined, true)
		}
	})

	useEffect(() => {
		wrapRedirectToAuth()
	}, [isUnauthenticated, isAuthRoute, wrapRedirectToAuth])

	useEffect(() => {
		wrapRedirectFromAuth()
	}, [status, isAuthRoute, isDashboardRoute, role, wrapRedirectFromAuth])

	if (status === 'loading' || status === 'idle') {
		return (
			<div className="w-full h-screen flex items-center justify-center">
				<IconLoader2 className="animate-spin size-24 text-on-surface-variant" />
			</div>
		)
	}

	if (status === 'unauthenticated') {
		return <>{authRoute.render()}</>
	}

	const pageMeta: PageMeta[] = [
		{ route: dashboardRoute, title: t.sidebar.dashboard },
		{
			route: roomDetailRoute,
			title: detail?.name ?? '...',
			parent: { route: roomsRoute, title: t.sidebar.roomSearch },
		},
		{ route: roomsRoute, title: t.sidebar.roomSearch },
		{ route: bookingsRoute, title: t.sidebar.myBookings },
	]

	const currentPage = pageMeta.find(({ route }) => route.match())
	const roomsHref = roomsRoute.path()
	const roomDetailParentHref = isRoomsBackHrefValid(roomsBackHref, roomsHref)
		? roomsBackHref
		: roomsHref

	const parentHref =
		currentPage?.route === roomDetailRoute
			? roomDetailParentHref
			: currentPage?.parent?.route.path()

	return (
		<SidebarProvider>
			<AppSidebar />
			<div className="flex min-w-0 w-full flex-col relative overflow-y-auto overflow-x-hidden h-screen">
				<header className="sticky top-0 z-20 shrink-0 flex min-h-18 items-center gap-4 border-b border-surface-container-high bg-sidebar px-6">
					<SidebarTrigger className="ml-1" />
					{currentPage?.parent && (
						<>
							<a
								href={parentHref}
								className="text-lg font-black uppercase tracking-widest text-on-surface-variant transition-colors duration-150 ease-linear hover:text-on-surface"
							>
								{currentPage.parent.title}
							</a>
							<span className="text-on-surface-variant/50">/</span>
						</>
					)}
					<h1 className="text-lg font-black tracking-widest uppercase text-on-surface">
						{currentPage?.title ?? ''}
					</h1>
				</header>
				<main className="flex-1 overflow-x-hidden">{rootRoute.render() as ReactNode}</main>
			</div>
		</SidebarProvider>
	)
}, 'App')

export default App
