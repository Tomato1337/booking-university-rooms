import { type ChangeEvent, useState } from "react";

import { IconCalendar, IconClock, IconUsers } from "@tabler/icons-react";
import { reatomComponent, useWrap } from "@reatom/react";

import {
  equipmentListAtom,
  roomsDateAtom,
  roomsEquipmentAtom,
  roomsMinCapacityAtom,
  roomsTimeFromAtom,
  roomsTimeToAtom,
} from "../application/rooms-atoms";
import { getEquipmentIcon } from "../infrastructure/icon-map";
import { cn } from "@/shared/lib/utils";
import { Calendar } from "@/shared/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";

interface RoomsFiltersProps {
  className?: string;
}

const filterInputClass =
  "h-9 w-full rounded-sm bg-surface-container-lowest px-3 py-2 text-sm font-bold text-on-surface outline-none transition-colors duration-150 ease-linear placeholder:text-on-surface-variant/50 focus:ring-1 focus:ring-primary/20";

function formatDateLabel(dateStr: string): string {
  if (!dateStr) return "Pick a date";
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function parseDateAtom(dateStr: string): Date | undefined {
  if (!dateStr) return undefined;
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const RoomsFilters = reatomComponent(({ className }: RoomsFiltersProps) => {
  const date = roomsDateAtom();
  const timeFrom = roomsTimeFromAtom();
  const timeTo = roomsTimeToAtom();
  const equipmentCsv = roomsEquipmentAtom();
  const minCapacity = roomsMinCapacityAtom();
  const equipmentList = equipmentListAtom();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [calendarOpen, setCalendarOpen] = useState(false);

  const selectedIds = new Set(equipmentCsv ? equipmentCsv.split(",").filter(Boolean) : []);

  const toggleEquipment = useWrap((id: string) => {
    const ids = new Set(roomsEquipmentAtom().split(",").filter(Boolean));
    if (ids.has(id)) ids.delete(id);
    else ids.add(id);
    roomsEquipmentAtom.set([...ids].join(","));
  });

  const onDateSelect = useWrap((selected: Date | undefined) => {
    if (selected) {
      roomsDateAtom.set(toDateString(selected));
    }
    setCalendarOpen(false);
  });

  return (
    <div
      data-slot="rooms-filters"
      className={cn("flex flex-col gap-4 bg-surface-container p-4", className)}
    >
      {/* Filters grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Date */}
        <div className="flex flex-col gap-2 bg-surface-container-high p-4">
          <div className="flex items-center gap-2">
            <IconCalendar size={14} className="text-primary" />
            <span className="text-xs font-bold uppercase tracking-[0.1em] text-on-surface-variant">
              Date
            </span>
          </div>
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  filterInputClass,
                  "flex items-center justify-between text-left",
                  !date && "text-on-surface-variant/50",
                )}
              >
                {formatDateLabel(date)}
                <IconCalendar size={14} className="text-on-surface-variant/50" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="start">
              <Calendar
                mode="single"
                selected={parseDateAtom(date)}
                onSelect={onDateSelect}
                disabled={{ before: today }}
                startMonth={parseDateAtom(date) ?? today}
                defaultMonth={parseDateAtom(date) ?? today}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Time From */}
        <div className="flex flex-col gap-2 bg-surface-container-high p-4">
          <div className="flex items-center gap-2">
            <IconClock size={14} className="text-primary" />
            <span className="text-xs font-bold uppercase tracking-[0.1em] text-on-surface-variant">
              From
            </span>
          </div>
          <input
            type="time"
            value={timeFrom}
            onChange={useWrap((e: ChangeEvent<HTMLInputElement>) =>
              roomsTimeFromAtom.set(e.target.value),
            )}
            className={filterInputClass}
          />
        </div>

        {/* Time To */}
        <div className="flex flex-col gap-2 bg-surface-container-high p-4">
          <div className="flex items-center gap-2">
            <IconClock size={14} className="text-primary" />
            <span className="text-xs font-bold uppercase tracking-[0.1em] text-on-surface-variant">
              To
            </span>
          </div>
          <input
            type="time"
            value={timeTo}
            onChange={useWrap((e: ChangeEvent<HTMLInputElement>) =>
              roomsTimeToAtom.set(e.target.value),
            )}
            className={filterInputClass}
          />
        </div>

        {/* Min Capacity */}
        <div className="flex flex-col gap-2 bg-surface-container-high p-4">
          <div className="flex items-center gap-2">
            <IconUsers size={14} className="text-primary" />
            <span className="text-xs font-bold uppercase tracking-[0.1em] text-on-surface-variant">
              Min Capacity
            </span>
          </div>
          <input
            type="number"
            min={0}
            value={minCapacity || ""}
            onChange={useWrap((e: ChangeEvent<HTMLInputElement>) => {
              const val = e.target.value ? Number(e.target.value) : 0;
              roomsMinCapacityAtom.set(val);
            })}
            placeholder="Any"
            className={filterInputClass}
          />
        </div>
      </div>

      {/* Equipment toggles */}
      {equipmentList.length > 0 && (
        <div className="flex flex-col gap-3 bg-surface-container-high p-4">
          <span className="text-xs font-bold uppercase tracking-[0.1em] text-on-surface-variant">
            Equipment
          </span>
          <div className="flex flex-wrap gap-2">
            {equipmentList.map((item) => {
              const Icon = getEquipmentIcon(item.icon);
              const isSelected = selectedIds.has(item.id);

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggleEquipment(item.id)}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-sm px-3 py-1.5 text-xs font-bold uppercase tracking-widest transition-colors duration-150 ease-linear",
                    isSelected
                      ? "bg-primary/15 text-primary"
                      : "bg-surface-container text-on-surface-variant hover:text-on-surface",
                  )}
                >
                  <Icon size={14} />
                  {item.name}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}, "RoomsFilters");

export { RoomsFilters };
export type { RoomsFiltersProps };
