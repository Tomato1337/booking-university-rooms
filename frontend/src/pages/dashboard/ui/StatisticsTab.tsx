import { reatomComponent, useWrap, useAtom } from "@reatom/react"
import { tAtom } from "@/modules/i18n"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { adminStatsQuery, statsPeriodAtom, type AdminStats } from "@/modules/admin"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card"
import { MetricCard, MetricLabel, MetricValue } from "@/shared/ui/metric-card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select"

type StatsPeriod = "today" | "week" | "month" | "all"

interface BookingStatusCount {
  status: string
  count: number
}

interface PopularRoom {
  id: string
  name: string
  building: string
  count: number
}

interface DayOfWeekCount {
  day: string
  count: number
}

interface BuildingOccupancy {
  building: string
  occupancyRate: number
}

type StatsWithCharts = AdminStats & {
  bookingsByStatus?: BookingStatusCount[]
  popularRooms?: PopularRoom[]
  bookingsByDayOfWeek?: DayOfWeekCount[]
  occupancyByBuilding?: BuildingOccupancy[]
}



const STATUS_COLORS: Record<string, string> = {
  pending: "var(--chart-3)",
  confirmed: "var(--chart-1)",
  rejected: "var(--chart-2)",
  cancelled: "var(--chart-4)",
}

const DEFAULT_STATUS_COLOR = "var(--chart-5)"

function toStatusChartData(data: BookingStatusCount[]) {
  return data.map((item) => ({
    ...item,
    fill: STATUS_COLORS[item.status] ?? DEFAULT_STATUS_COLOR,
  }))
}

export const StatisticsTab = reatomComponent(() => {
  const [t] = useAtom(tAtom);
  const status = adminStatsQuery.status()
  const period = statsPeriodAtom()

  const PERIOD_OPTIONS: Array<{ label: string; value: StatsPeriod }> = [
    { label: t.admin.statistics.periods.today, value: "today" },
    { label: t.admin.statistics.periods.week, value: "week" },
    { label: t.admin.statistics.periods.month, value: "month" },
    { label: t.admin.statistics.periods.all, value: "all" },
  ]

  const wrapSetPeriod = useWrap((nextPeriod: StatsPeriod) => {
    statsPeriodAtom.set(nextPeriod)
  })

  const stats = adminStatsQuery.data() as StatsWithCharts
  const bookingsByStatus = toStatusChartData(stats.bookingsByStatus ?? [])
  const popularRooms = stats.popularRooms ?? []
  const bookingsByDayOfWeek = stats.bookingsByDayOfWeek ?? []
  const occupancyByBuilding = stats.occupancyByBuilding ?? []

  if (status.isFirstPending) {
    return (
      <section
        data-slot="dashboard-statistics-tab"
        className="flex min-h-80 items-center justify-center bg-surface-container-low px-8 py-12"
      >
        <p className="text-sm font-bold uppercase tracking-widest text-on-surface-variant">
          {t.admin.statistics.loading}
        </p>
      </section>
    )
  }

  return (
    <section data-slot="dashboard-statistics-tab" className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h3 className="text-[1.75rem] font-black uppercase tracking-tighter">{t.admin.statistics.title}</h3>
          <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
            {t.admin.statistics.subtitle}
          </p>
        </div>

        <div className="w-full md:w-52">
          <Select
            value={period}
            onValueChange={(value) => wrapSetPeriod(value as StatsPeriod)}
          >
            <SelectTrigger>
              <SelectValue placeholder={t.admin.statistics.selectPeriod} />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <section className="grid grid-cols-1 gap-6 md:grid-cols-4">
        <MetricCard stripe="pending">
          <MetricLabel>{t.admin.bookings.metrics.pendingRequests}</MetricLabel>
          <MetricValue>{stats.pendingCount}</MetricValue>
        </MetricCard>

        <MetricCard stripe="booked">
          <MetricLabel>{t.admin.bookings.metrics.occupancyRate}</MetricLabel>
          <MetricValue>{stats.occupancyRate}%</MetricValue>
        </MetricCard>

        <MetricCard stripe="available">
          <MetricLabel>{t.admin.bookings.metrics.todayBookings}</MetricLabel>
          <MetricValue>{stats.todayBookingsCount}</MetricValue>
        </MetricCard>

        <MetricCard stripe="available">
          <MetricLabel>{t.admin.bookings.metrics.activeRooms}</MetricLabel>
          <MetricValue>{stats.totalActiveRooms}</MetricValue>
        </MetricCard>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t.admin.statistics.charts.statusTitle}</CardTitle>
            <CardDescription>{t.admin.statistics.charts.statusDesc}</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={bookingsByStatus}
                  dataKey="count"
                  nameKey="status"
                  innerRadius={70}
                  outerRadius={105}
                  paddingAngle={2}
                  labelLine={false}
                />
                <Tooltip
                  formatter={(value: number, name: string) => [value, name.toUpperCase()]}
                />
                <Legend formatter={(value) => value.toUpperCase()} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.admin.statistics.charts.popularTitle}</CardTitle>
            <CardDescription>{t.admin.statistics.charts.popularDesc}</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={popularRooms} margin={{ top: 8, right: 16, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--outline-variant)" />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "var(--on-surface-variant)", fontSize: 11 }}
                  angle={-20}
                  textAnchor="end"
                  height={60}
                />
                <YAxis tick={{ fill: "var(--on-surface-variant)", fontSize: 11 }} />
                <Tooltip
                  formatter={(value: number) => [value, "BOOKINGS"]}
                  labelFormatter={(label: string) => `ROOM: ${label}`}
                />
                <Bar dataKey="count" fill="var(--chart-1)" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.admin.statistics.charts.dayOfWeekTitle}</CardTitle>
            <CardDescription>{t.admin.statistics.charts.dayOfWeekDesc}</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bookingsByDayOfWeek} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--outline-variant)" />
                <XAxis
                  dataKey="day"
                  tick={{ fill: "var(--on-surface-variant)", fontSize: 11 }}
                />
                <YAxis tick={{ fill: "var(--on-surface-variant)", fontSize: 11 }} />
                <Tooltip
                  formatter={(value: number) => [value, "BOOKINGS"]}
                  labelFormatter={(label: string) => label.toUpperCase()}
                />
                <Bar dataKey="count" fill="var(--chart-3)" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.admin.statistics.charts.occupancyTitle}</CardTitle>
            <CardDescription>{t.admin.statistics.charts.occupancyDesc}</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={occupancyByBuilding}
                layout="vertical"
                margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--outline-variant)" />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  tick={{ fill: "var(--on-surface-variant)", fontSize: 11 }}
                />
                <YAxis
                  type="category"
                  dataKey="building"
                  tick={{ fill: "var(--on-surface-variant)", fontSize: 11 }}
                  width={90}
                />
                <Tooltip
                  formatter={(value: number) => [`${value}%`, "OCCUPANCY"]}
                  labelFormatter={(label: string) => label.toUpperCase()}
                />
                <Bar dataKey="occupancyRate" fill="var(--chart-2)" radius={[0, 2, 2, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </section>
    </section>
  )
}, "StatisticsTab")
