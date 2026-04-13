import type { ComponentProps } from "react";
import { useMemo } from "react";

import { IconArrowRight } from "@tabler/icons-react";
import { bindField, reatomComponent, useWrap } from "@reatom/react";

import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";

import {
  createBookingAction,
  createBookingErrorAtom,
  createBookingForm,
  createBookingStatusAtom,
} from "../application/create-booking-form";
import type { BookingPurpose, TimeSlotFromApi, UserBookingSummary } from "../domain/types";
import { wrap } from "@reatom/core";

interface CreateBookingFormProps extends ComponentProps<"div"> {
  roomId: string;
  date: string;
  roomCapacity?: number;
  timeSlots: TimeSlotFromApi[];
  userBookingsToday: UserBookingSummary[];
  onBooked(): void;
}

const PURPOSE_LABELS: Record<BookingPurpose, string> = {
  academic_lecture: "Academic Lecture",
  research_workshop: "Research Workshop",
  collaborative_study: "Collaborative Study",
  technical_assessment: "Technical Assessment",
};

function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart < bEnd && aEnd > bStart;
}

const CreateBookingForm = reatomComponent(
  ({
    roomId,
    date,
    roomCapacity,
    timeSlots,
    userBookingsToday,
    onBooked,
    className,
    ...props
  }: CreateBookingFormProps) => {
    const status = createBookingStatusAtom();
    const error = createBookingErrorAtom();

    const fields = createBookingForm.fields;
    const { error: titleError, ...titleBind } = bindField(fields.title);
    const { error: startError, ...startBind } = bindField(fields.startTime);
    const { error: endError, ...endBind } = bindField(fields.endTime);

    const attendee = fields.attendeeCount();
    const purpose = fields.purpose();
    const start = fields.startTime();
    const end = fields.endTime();
    const hasRange = Boolean(start && end);
    const attendeeExceedsCapacity =
      typeof attendee === "number" && typeof roomCapacity === "number" && attendee > roomCapacity;

    const conflictOccupied = useMemo(() => {
      if (!hasRange) return false;
      return timeSlots.some(
        (s) => s.status === "occupied" && overlaps(start, end, s.startTime, s.endTime),
      );
    }, [end, hasRange, start, timeSlots]);

    const conflictYours = useMemo(() => {
      if (!hasRange) return false;
      return userBookingsToday.some((b) => overlaps(start, end, b.startTime, b.endTime));
    }, [end, hasRange, start, userBookingsToday]);

    const overlapPending = useMemo(() => {
      if (!hasRange) return false;
      return timeSlots.some(
        (s) => s.status === "pending" && overlaps(start, end, s.startTime, s.endTime),
      );
    }, [end, hasRange, start, timeSlots]);

    const canSubmit =
      status !== "submitting" &&
      Boolean(fields.title() && fields.startTime() && fields.endTime()) &&
      !conflictOccupied &&
      !conflictYours &&
      !attendeeExceedsCapacity;

    const wrapSubmit = useWrap(async () => {
      createBookingErrorAtom.set(null);

      const success = await wrap(
        createBookingAction({
          roomId,
          bookingDate: date,
          title: fields.title(),
          purpose: fields.purpose(),
          startTime: fields.startTime(),
          endTime: fields.endTime(),
          attendeeCount: fields.attendeeCount(),
        }),
      );

      if (success) {
        onBooked();
        createBookingForm.reset();
      }
    });

    return (
      <div
        data-slot="create-booking-form"
        className={cn(
          "flex flex-col gap-8 border-t-4 border-primary bg-surface-container p-8",
          className,
        )}
        {...props}
      >
        <div>
          <h3 className="mb-2 text-[1.75rem] font-black uppercase leading-tight tracking-tight">
            Request Access
          </h3>
          <p className="text-sm text-on-surface-variant">Fill in the session parameters below.</p>
        </div>

        <form
          className="flex flex-col gap-6"
          onSubmit={useWrap((e) => {
            e.preventDefault();
            void wrapSubmit();
          })}
        >
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
              Session Title
            </label>
            <Input
              className="h-auto border-0 p-4 text-lg font-bold placeholder:text-outline/40"
              placeholder="e.g. Advanced AI Seminar"
              aria-invalid={!!titleError}
              {...titleBind}
            />
            {titleError && (
              <p className="text-xs font-bold uppercase tracking-widest text-secondary">
                {titleError}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
              Purpose
            </label>
            <Select
              value={purpose}
              onValueChange={useWrap((val) => fields.purpose.set(val as BookingPurpose))}
            >
              <SelectTrigger className="h-auto border-0 p-4 text-lg font-bold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(PURPOSE_LABELS) as BookingPurpose[]).map((key) => (
                  <SelectItem key={key} value={key}>
                    {PURPOSE_LABELS[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                Start Time
              </label>
              <Input
                type="time"
                step={1800}
                lang="en-GB"
                className={cn(
                  "h-auto border-0 p-4 text-lg font-bold",
                  conflictOccupied && "outline outline-2 outline-secondary",
                )}
                aria-invalid={!!startError || conflictOccupied || conflictYours}
                {...startBind}
              />
              {startError && (
                <p className="text-xs font-bold uppercase tracking-widest text-secondary">
                  {startError}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                End Time
              </label>
              <Input
                type="time"
                step={1800}
                lang="en-GB"
                className={cn(
                  "h-auto border-0 p-4 text-lg font-bold",
                  conflictOccupied && "outline outline-2 outline-secondary",
                )}
                aria-invalid={!!endError || conflictOccupied || conflictYours}
                {...endBind}
              />
              {endError && (
                <p className="text-xs font-bold uppercase tracking-widest text-secondary">
                  {endError}
                </p>
              )}
            </div>
          </div>

          {overlapPending && !conflictOccupied && !conflictYours && (
            <div className="border-l-2 border-tertiary bg-surface-container-low p-4">
              <p className="text-[0.7rem] font-bold uppercase tracking-widest text-tertiary">
                WARNING: overlaps pending. Request may be rejected later.
              </p>
            </div>
          )}

          {conflictYours && (
            <div className="border-l-2 border-secondary bg-surface-container-low p-4">
              <p className="text-[0.7rem] font-bold uppercase tracking-widest text-secondary">
                ERROR: overlaps your booking. Choose another time.
              </p>
            </div>
          )}

          {conflictOccupied && (
            <div className="border-l-2 border-secondary bg-surface-container-low p-4">
              <p className="text-[0.7rem] font-bold uppercase tracking-widest text-secondary">
                ERROR: overlaps occupied slot. Choose another time.
              </p>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
              Attendee Count
            </label>
            <Input
              type="number"
              min={1}
              className="h-auto border-0 p-4 text-lg font-bold placeholder:text-outline/40"
              placeholder="e.g. 35"
              value={attendee ?? ""}
              onChange={useWrap((e) => {
                const next = e.target.value;
                fields.attendeeCount.set(next ? Number(next) : undefined);
              })}
            />
            {attendeeExceedsCapacity && (
              <p className="text-xs font-bold uppercase tracking-widest text-secondary">
                Attendee count exceeds room capacity ({roomCapacity})
              </p>
            )}
          </div>

          {error && (
            <div className="border-l-2 border-secondary bg-surface-container-low p-4">
              <p className="text-[0.7rem] font-bold uppercase tracking-widest text-secondary">
                {error}
              </p>
            </div>
          )}

          <Button
            type="submit"
            disabled={!canSubmit}
            className="mt-4 h-auto w-full py-5 text-lg font-black uppercase tracking-widest"
          >
            Confirm Booking
            <IconArrowRight className="size-5" />
          </Button>
        </form>

        <div className="border-l-2 border-primary bg-surface-container-low p-4">
          <p className="text-[0.7rem] leading-relaxed text-on-surface-variant">
            <span className="font-bold text-primary">NOTE:</span> Booking is subject to faculty
            approval. A response will be issued within 24 hours of submission.
          </p>
        </div>
      </div>
    );
  },
  "CreateBookingForm",
);

export { CreateBookingForm };
export type { CreateBookingFormProps };
