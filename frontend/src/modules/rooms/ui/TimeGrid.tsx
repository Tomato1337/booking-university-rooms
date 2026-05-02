import { useEffect, useMemo, useRef, useState, type ComponentProps } from "react";
import { useAtom } from "@reatom/react";
import { tAtom } from "@/modules/i18n";

import { cn } from "@/shared/lib/utils";

export type TimeSlotStatus = "available" | "booked" | "pending" | "yours" | "yours_pending";

export interface TimeSlot {
  /** Slot status determines color */
  status: TimeSlotStatus;
  /** Legacy relative value; current grid width is derived from startTime/endTime */
  flex?: string | number;
  /** Time label to show below the left edge of this slot */
  startLabel?: string;
  /** Time label to show below the right edge of this slot (typically only for the last slot) */
  endLabel?: string;
  /** Text label to display centered inside the slot bar */
  label?: string;
  /** Raw slot start in HH:mm */
  startTime?: string;
  /** Raw slot end in HH:mm */
  endTime?: string;
}

export interface TimeGridProps extends ComponentProps<"div"> {
  /** Array of time slots to render */
  slots: TimeSlot[];
  /** Title text, e.g. "Daily Occupancy" */
  title?: string;
  /** Subtitle text, e.g. "Today: Oct 24, 2024" */
  subtitle?: string;
  /** Whether to show the legend (defaults to true) */
  showLegend?: boolean;
  /** Called when user clicks a slot */
  onSlotSelect?: (slot: TimeSlot) => void;
}

const statusColorMap: Record<TimeSlotStatus, string> = {
  available: "bg-primary",
  booked: "bg-secondary",
  pending: "bg-tertiary",
  yours: "bg-primary border-dashed border-4 border-accent-foreground",
  yours_pending: "bg-tertiary border-dashed border-4 border-accent-foreground",
};

const LEGEND_ORDER: TimeSlotStatus[] = ["available", "booked", "pending", "yours", "yours_pending"];
const SLOT_GAP_PX = 2;
const IMPORTANT_SLOT_MIN_WIDTH_PX = 112;
const AVAILABLE_SLOT_MIN_WIDTH_PX = 36;
const FALLBACK_TIMELINE_WIDTH_PX = 640;
const TIME_LABEL_FONT = "700 10.4px Inter, sans-serif";
const TIME_LABEL_HORIZONTAL_PADDING_PX = 16;
const TIME_LABEL_CELL_PADDING_PX = 8;
const TIME_LABEL_WIDTH_BUFFER_PX = 10;
let textMeasureCanvas: HTMLCanvasElement | null = null;

function parseHmToMinutes(value?: string): number | null {
  if (!value) return null;
  const m = value.match(/^(\d{2}):(\d{2})$/);
  if (!m) return null;

  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;

  return hh * 60 + mm;
}

function isImportantSlot(status: TimeSlotStatus): boolean {
  return status !== "available";
}

function getSlotRangeLabel(slot: TimeSlot): string {
  const start = slot.startTime ?? slot.startLabel;
  const end = slot.endTime ?? slot.endLabel;

  if (start && end) return `${start} — ${end}`;
  return start ?? end ?? "";
}

function measureTextWidth(text: string, font: string): number {
  if (typeof document === "undefined") {
    return text.length * 7;
  }

  textMeasureCanvas ??= document.createElement("canvas");
  const context = textMeasureCanvas.getContext("2d");
  if (!context) return text.length * 7;

  context.font = font;
  return context.measureText(text).width;
}

function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const updateWidth = () => setWidth(element.clientWidth);
    updateWidth();

    const resizeObserver = new ResizeObserver(updateWidth);
    resizeObserver.observe(element);

    return () => resizeObserver.disconnect();
  }, []);

  return [ref, width] as const;
}

function buildTimelineColumns(slots: TimeSlot[], containerWidth: number) {
  const measuredSlots = slots.map((slot) => {
    const start = parseHmToMinutes(slot.startTime ?? slot.startLabel);
    const end = parseHmToMinutes(slot.endTime ?? slot.endLabel);
    const durationMinutes = start !== null && end !== null && end > start ? end - start : 30;
    const rangeLabel = getSlotRangeLabel(slot);
    const statusMinWidth = isImportantSlot(slot.status)
      ? IMPORTANT_SLOT_MIN_WIDTH_PX
      : AVAILABLE_SLOT_MIN_WIDTH_PX;
    const labelMinWidth =
      measureTextWidth(rangeLabel, TIME_LABEL_FONT) +
      TIME_LABEL_HORIZONTAL_PADDING_PX +
      TIME_LABEL_CELL_PADDING_PX +
      TIME_LABEL_WIDTH_BUFFER_PX;
    const minWidth = Math.max(statusMinWidth, Math.ceil(labelMinWidth));

    return { slot, durationMinutes, minWidth, rangeLabel };
  });
  const safeContainerWidth = containerWidth > 0 ? containerWidth : FALLBACK_TIMELINE_WIDTH_PX;
  const gapWidth = Math.max(0, measuredSlots.length - 1) * SLOT_GAP_PX;
  const minContentWidth = measuredSlots.reduce((sum, item) => sum + item.minWidth, 0) + gapWidth;
  const timelineWidth = Math.max(safeContainerWidth, minContentWidth);
  const distributableWidth = Math.max(
    0,
    timelineWidth - gapWidth - measuredSlots.reduce((sum, item) => sum + item.minWidth, 0),
  );
  const totalDuration = Math.max(1, measuredSlots.reduce((sum, item) => sum + item.durationMinutes, 0));
  const columns = measuredSlots.map(
    (item) => item.minWidth + (distributableWidth * item.durationMinutes) / totalDuration,
  );
  const gridTemplateColumns = columns.map((width) => `${width.toFixed(2)}px`).join(" ");

  return {
    measuredSlots,
    gridTemplateColumns,
    timelineWidth,
  };
}

function TimeGrid({
  slots,
  title,
  subtitle,
  showLegend = true,
  onSlotSelect,
  className,
  ...props
}: TimeGridProps) {
  const [t] = useAtom(tAtom);
  const [timelineViewportRef, timelineViewportWidth] = useElementWidth<HTMLDivElement>();
  const presentStatuses = new Set(slots.map((s) => s.status));
  const legendItems = LEGEND_ORDER.filter((status) => presentStatuses.has(status)).map(
    (status) => ({ status, label: t.timeGrid[status] }),
  );
  const { measuredSlots, gridTemplateColumns, timelineWidth } = useMemo(
    () => buildTimelineColumns(slots, timelineViewportWidth),
    [slots, timelineViewportWidth],
  );
  const firstMeasuredSlot = measuredSlots[0]?.slot;
  const lastMeasuredSlot = measuredSlots[measuredSlots.length - 1]?.slot;
  const gridStyle = {
    gridTemplateColumns,
    gap: `${SLOT_GAP_PX}px`,
  };

  return (
    <div data-slot="time-grid" className={cn("bg-surface-container-low p-8", className)} {...props}>
      {(title || subtitle) && (
        <div className="mb-6 flex items-end justify-between gap-4">
          {title ? (
            <h3 className="text-[1.75rem] font-bold tracking-tight text-on-surface">{title}</h3>
          ) : (
            <span />
          )}
          {subtitle && (
            <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
              {subtitle}
            </p>
          )}
        </div>
      )}

      <div className="overflow-hidden">
        <div ref={timelineViewportRef} className="overflow-x-auto pb-2">
          <div className="relative" style={{ width: `${timelineWidth}px` }}>
            <div className="grid h-16 w-full" style={gridStyle}>
              {measuredSlots.map(({ slot }, index) => (
                <div
                  key={`${index}-${slot.status}`}
                  className={cn("group relative min-w-0 cursor-pointer", statusColorMap[slot.status])}
                  onClick={() => onSlotSelect?.(slot)}
                >
                  <div className="absolute inset-0 bg-white/20 opacity-0 transition-opacity duration-150 ease-linear group-hover:opacity-100" />
                  {slot.label && (
                    <span
                      className="absolute inset-0 flex min-w-0 items-center justify-center px-2 text-[0.6rem] font-black uppercase tracking-wider text-primary-foreground"
                      title={slot.label}
                    >
                      <span className="max-w-full truncate">{slot.label}</span>
                    </span>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-3 grid w-full" style={gridStyle}>
              {measuredSlots.map(({ slot, rangeLabel }, index) => {
                return (
                  <div
                    key={`label-${index}-${slot.status}`}
                    className="flex min-w-0 items-start justify-center"
                  >
                    <div className="flex min-w-0 max-w-full flex-col items-center gap-1 px-1">
                      <span className="h-2 w-px shrink-0 bg-on-surface-variant/50" />
                      <span
                        className="rounded border border-on-surface-variant/30 bg-surface-container px-2 py-1 text-[0.65rem] font-bold whitespace-nowrap text-on-surface-variant"
                        title={rangeLabel}
                      >
                        {rangeLabel}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            {!!firstMeasuredSlot?.startTime && !!lastMeasuredSlot?.endTime && (
              <div className="mt-3 flex items-center justify-between text-[0.65rem] font-bold text-on-surface-variant/80">
                <span>{firstMeasuredSlot.startTime}</span>
                <span>{lastMeasuredSlot.endTime}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {showLegend && (
        <div className="mt-8 flex flex-wrap gap-6">
          {legendItems.map((item) => (
            <div key={item.status} className="flex items-center gap-2">
              <div className={cn("h-3 w-3 rounded-sm", statusColorMap[item.status])} />
              <span className="text-[0.7rem] font-bold uppercase tracking-widest text-on-surface-variant">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export { TimeGrid };
