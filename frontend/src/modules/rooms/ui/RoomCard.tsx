import { tAtom } from '@/modules/i18n'
import { IconArrowRight, IconPhoto, IconUser } from '@tabler/icons-react'

import type { RoomCard as RoomCardType } from '../domain/types'
import { getEquipmentIcon } from '../infrastructure/icon-map'
import { cn } from '@/shared/lib/utils'
import { StatusIndicator } from '@/shared/ui/status-indicator'
import { useAtom } from '@reatom/react'

interface RoomCardProps {
    /** Room data from the API */
    room: RoomCardType
    /** Called when user clicks "Book Space" */
    onBook?: (roomId: string) => void
    /** Additional className */
    className?: string
}

function RoomCard({ room, onBook, className }: RoomCardProps) {
    const [t] = useAtom(tAtom)
    const { availability } = room
    const available = availability.isAvailable
    const coverPhoto = room.photos?.[0]

    return (
        <div
            data-slot="room-card"
            className={cn(
                'relative cursor-pointer hover:translate-x-1.5 hover:bg-accent/50 transition-all flex items-stretch overflow-hidden bg-surface-container-low duration-100 ease-linear',
                !available && 'grayscale opacity-50',
                className,
            )}
            onClick={() => onBook?.(room.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onBook?.(room.id)
                }
            }}
        >
            <StatusIndicator
                status={available ? 'available' : 'booked'}
                orientation="vertical"
                className="w-1 self-stretch rounded-none"
            />

            <div className="flex w-32 shrink-0 items-stretch bg-surface-container-high md:w-44">
                {coverPhoto ? (
                    <img
                        src={coverPhoto}
                        alt={room.name}
                        className="h-full min-h-40 w-full object-cover"
                    />
                ) : (
                    <div className="flex min-h-40 w-full items-center justify-center">
                        <IconPhoto className="size-8 text-on-surface-variant/40" />
                    </div>
                )}
            </div>

            <div className="flex flex-1 flex-col justify-between gap-6 p-6 md:flex-row md:items-center md:p-8">
                <div className="flex min-w-0 flex-col gap-1">
                    <span
                        className={cn(
                            'mb-1 text-xs font-bold uppercase tracking-[0.15em]',
                            available ? 'text-primary' : 'text-secondary',
                        )}
                    >
                        {(() => {
                           const lbl = availability.label;
                           if (lbl === "AVAILABLE NOW") return (t.rooms.availability as Record<string, string>)["AVAILABLE NOW"];
                           if (lbl === "AVAILABLE") return (t.rooms.availability as Record<string, string>)["AVAILABLE"];
                           if (lbl === "FULLY BOOKED") return (t.rooms.availability as Record<string, string>)["FULLY BOOKED"];
                           if (lbl.startsWith("BOOKED UNTIL ")) {
                               const time = lbl.replace("BOOKED UNTIL ", "");
                               return (t.rooms.availability as Record<string, string>)["BOOKED UNTIL"].replace("{time}", time);
                           }
                           return lbl;
                        })()}
                    </span>

                    <h4 className="text-[2.5rem] leading-none font-black uppercase tracking-tighter text-on-surface">
                        {room.name}
                    </h4>

                    <span className="text-[0.65rem] font-medium uppercase tracking-widest text-on-surface-variant">
                        {room.building} /{' '}
                        {t.rooms.card.floor.replace(
                            '{floor}',
                            String(room.floor),
                        )}
                    </span>

                    {room.description && (
                        <p className="mt-2 line-clamp-2 max-w-2xl text-sm text-on-surface-variant">
                            {room.description}
                        </p>
                    )}

                    <div className="mt-2 flex flex-wrap gap-4">
                        <div className="flex items-center gap-2">
                            <IconUser
                                size={16}
                                className="text-on-surface-variant"
                            />
                            <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                                {t.rooms.card.capacity.replace(
                                    '{capacity}',
                                    String(room.capacity),
                                )}
                            </span>
                        </div>

                        {room.equipment.map((item) => {
                            const EquipmentIcon = getEquipmentIcon(item.icon)

                            return (
                                <div
                                    key={item.id}
                                    className="flex items-center gap-2"
                                >
                                    <EquipmentIcon
                                        size={16}
                                        className="text-on-surface-variant"
                                    />
                                    <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                                        {item.name}
                                    </span>
                                </div>
                            )
                        })}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <span
                        className={cn(
                            'text-[1.75rem] font-black tracking-tighter',
                            available
                                ? 'text-on-surface'
                                : 'text-on-surface-variant',
                        )}
                    >
                        {available
                            ? (availability.availableTimeRange ??
                              '--:-- — --:--')
                            : t.rooms.card.occupied}
                    </span>

                    {/* {available ? (
            <Button
              onClick={() => onBook?.(room.id)}
              className="px-10 py-3 text-xs uppercase tracking-widest transition-colors duration-150 ease-linear"
            >
              Book Space
            </Button>
          ) : (
            <Button
              variant="secondary"
              disabled
              className="cursor-not-allowed px-10 py-3 text-xs uppercase tracking-widest transition-colors duration-150 ease-linear"
            >
              Unavailable
            </Button>
          )} */}
                    <IconArrowRight
                        size={32}
                        className="text-on-surface-variant"
                    />
                </div>
            </div>
        </div>
    )
}

export { RoomCard }
export type { RoomCardProps }
