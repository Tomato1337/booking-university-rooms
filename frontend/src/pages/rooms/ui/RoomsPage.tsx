import {
  IconAdjustmentsHorizontal,
  IconBroadcast,
  IconCalendar,
  IconClock,
  IconDeviceDesktop,
  IconMicrophone,
  IconPresentation,
  IconSearch,
  IconUsers,
  IconVideo,
} from "@tabler/icons-react"

import { FilterCard, RoomCard } from "@/modules/rooms"
import type { RoomCardEquipment } from "@/modules/rooms"
import { Button } from "@/shared/ui/button"
import { rootRoute } from "@/shared/router"
import { reatomComponent, useWrap } from "@reatom/react"
import { atom } from "@reatom/core"

interface MockRoom {
  roomName: string
  available: boolean
  availabilityLabel: string
  capacity: number
  equipment: RoomCardEquipment[]
  timeRange?: string
}

const MOCK_ROOMS: MockRoom[] = [
  {
    roomName: "LAB_402B",
    available: true,
    availabilityLabel: "AVAILABLE NOW",
    capacity: 45,
    equipment: [{ icon: IconDeviceDesktop, label: "Multi-Media" }],
    timeRange: "09:00 — 18:00",
  },
  {
    roomName: "AUD_01",
    available: true,
    availabilityLabel: "AVAILABLE NOW",
    capacity: 150,
    equipment: [{ icon: IconBroadcast, label: "Full Broadcast" }],
    timeRange: "10:30 — 12:00",
  },
  {
    roomName: "SEM_12",
    available: false,
    availabilityLabel: "BOOKED UNTIL 16:00",
    capacity: 20,
    equipment: [{ icon: IconPresentation, label: "Whiteboard" }],
  },
  {
    roomName: "STUDIO_04",
    available: true,
    availabilityLabel: "AVAILABLE NOW",
    capacity: 12,
    equipment: [{ icon: IconMicrophone, label: "Acoustic Panel" }],
    timeRange: "08:00 — 22:00",
  },
  {
    roomName: "CONF_301",
    available: true,
    availabilityLabel: "AVAILABLE NOW",
    capacity: 30,
    equipment: [{ icon: IconVideo, label: "Projector" }],
    timeRange: "13:00 — 17:00",
  },
  {
    roomName: "LECTURE_05",
    available: false,
    availabilityLabel: "BOOKED UNTIL 18:00",
    capacity: 200,
    equipment: [{ icon: IconBroadcast, label: "Live Stream" }],
  },
]

const searchQuery = atom("", "roomsPage-searchQuery")
const RoomsPage = reatomComponent(() => {
  const filteredRooms = MOCK_ROOMS.filter((room) =>
    room.roomName.toLowerCase().includes(searchQuery().toLowerCase()),
  )

  return (
    <div
      data-slot="rooms-page"
      className="flex min-h-full flex-col gap-10 px-6 py-8 md:px-10"
    >
      {/* Hero search section */}
      <section className="flex flex-col gap-8">
        <div>
          <h2 className="mb-2 text-[3.5rem] font-black uppercase leading-[0.9] tracking-tighter">
              Room Search
          </h2>
          <div className="h-2 w-16 bg-primary" />
        </div>

        <div className="grid grid-cols-1 gap-4 bg-surface-container p-4 md:grid-cols-4">
          <FilterCard label="Date" value="OCT 24, 2024" icon={IconCalendar} />
          <FilterCard
            label="Time Window"
            value="09:00 — 14:00"
            icon={IconClock}
          />
          <FilterCard label="Capacity" value="30+ SEATS" icon={IconUsers} />
          <FilterCard
            label="Equipment"
            value="PROJECTOR, MULTI..."
            icon={IconAdjustmentsHorizontal}
          />
        </div>

        <Button className="h-auto w-full py-8 text-[1.75rem] font-black uppercase tracking-tighter">
          Find Available Rooms
        </Button>
      </section>

      {/* Results section */}
      <section className="flex flex-1 flex-col gap-6">
        <div className="flex items-end justify-between border-b border-outline-variant/10 pb-4">
          <h3 className="text-[1.75rem] font-black uppercase tracking-tighter">
            Availability Results
          </h3>
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-on-surface-variant">
            {filteredRooms.length} Matches Found
          </span>
        </div>

        {/* Search by room name */}
        <div className="flex items-center gap-3 bg-surface-container-high px-4 py-3">
          <IconSearch size={18} className="shrink-0 text-on-surface-variant" />
          <input
            type="text"
            value={searchQuery()}
            onChange={useWrap((e) => searchQuery.set(e.target.value))}
            placeholder="SEARCH ROOM BY NAME..."
            className="w-full bg-transparent text-xs font-bold uppercase tracking-widest text-on-surface outline-none placeholder:text-on-surface-variant/50"
          />
        </div>

        {/* Room cards list */}
        <div className="flex flex-1 flex-col gap-4">
          {filteredRooms.length > 0 ? (
            filteredRooms.map((room) => (
              <RoomCard key={room.roomName} {...room} />
            ))
          ) : (
            <div className="flex flex-1 items-center justify-center py-20">
              <p className="text-sm font-bold uppercase tracking-widest text-on-surface-variant">
                No rooms match your search
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  )
})

export const roomsRoute = rootRoute.reatomRoute(
  {
    path: "rooms",
    render: () => <RoomsPage />,
  },
  "rooms",
)
