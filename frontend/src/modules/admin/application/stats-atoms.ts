import { atom, computed, withAsyncData, wrap } from "@reatom/core"

import type { AdminStats } from "../domain/types"
import * as adminApi from "../infrastructure/admin-api"

type StatsPeriod = "today" | "week" | "month" | "all"

const DEFAULT_STATS: AdminStats = {
  pendingCount: 0,
  occupancyRate: 0,
  todayBookingsCount: 0,
  totalRooms: 0,
  totalActiveRooms: 0,
}

export const statsPeriodAtom = atom<StatsPeriod>("today", "statsPeriodAtom")

export const adminStatsQuery = computed(async () => {
  const period = statsPeriodAtom()
  const { data, error } = await wrap(adminApi.getStats({ period }))

  if (error || !data) {
    throw new Error("Failed to load admin stats")
  }

  return data.data
}, "adminStatsQuery").extend(
  withAsyncData({
    initState: DEFAULT_STATS,
    status: true,
    parseError: (error) => (error instanceof Error ? error : new Error(String(error))),
  }),
)
