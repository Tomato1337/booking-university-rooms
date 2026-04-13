import {
  IconBuilding,
  IconCalendarTime,
  IconCategory,
  IconDeviceDesktop,
  IconHash,
  IconUsers,
} from "@tabler/icons-react";

import { wrap } from "@reatom/core";
import { bindField, reatomComponent, useWrap } from "@reatom/react";

import { roomForm, roomFormEditingRoomAtom } from "../application/admin-room-form-state";
import { createRoomMutation, updateRoomMutation } from "../application/room-management-atoms";
import { equipmentListQuery } from "../application/equipment-atoms";
import { createRoomSchema } from "../domain/schemas";
import type { EquipmentItem } from "../domain/types";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/shared/ui/sheet";

import { RoomPhotosUpload } from "./room-photos-upload";

type RoomType = "lab" | "auditorium" | "seminar" | "conference" | "studio" | "lecture_hall";

const ROOM_TYPE_OPTIONS: Array<{ value: RoomType; label: string }> = [
  { value: "lab", label: "Lab" },
  { value: "auditorium", label: "Auditorium" },
  { value: "seminar", label: "Seminar" },
  { value: "conference", label: "Conference" },
  { value: "studio", label: "Studio" },
  { value: "lecture_hall", label: "Lecture Hall" },
];

type StringFieldArray = Pick<typeof roomForm.fields.equipmentIds, "array" | "clear" | "create">;

export interface RoomFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
}

function readStringFieldArray(fieldArray: StringFieldArray): string[] {
  return fieldArray.array().map((item) => item());
}

function writeStringFieldArray(fieldArray: StringFieldArray, next: string[]) {
  fieldArray.clear();
  next.forEach((value) => {
    fieldArray.create(value);
  });
}

function EquipmentMultiSelect({
  value,
  options,
  onChange,
}: {
  value: string[];
  options: EquipmentItem[];
  onChange: (next: string[]) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {options.map((item) => {
        const selected = value.includes(item.id);
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              if (selected) {
                onChange(value.filter((id) => id !== item.id));
              } else {
                onChange([...value, item.id]);
              }
            }}
            className={
              selected
                ? "bg-primary/15 px-3 py-2 text-left text-xs font-bold uppercase tracking-wider text-primary"
                : "bg-surface-container px-3 py-2 text-left text-xs font-bold uppercase tracking-wider text-on-surface-variant hover:bg-surface-container-high"
            }
          >
            {item.name}
          </button>
        );
      })}
    </div>
  );
}

export const RoomForm = reatomComponent<RoomFormProps>(({ open, onOpenChange, mode }) => {
  const fields = roomForm.fields;
  const equipment = equipmentListQuery.data();

  const createStatus = createRoomMutation.status();
  const updateStatus = updateRoomMutation.status();
  const submitting = createStatus.isPending || updateStatus.isPending;

  const { error: nameError, ...nameBind } = bindField(fields.name);
  const { error: buildingError, ...buildingBind } = bindField(fields.building);
  const { error: capacityError, ...capacityBind } = bindField(fields.capacity);
  const { error: floorError, ...floorBind } = bindField(fields.floor);
  const { error: openTimeError, ...openTimeBind } = bindField(fields.openTime);
  const { error: closeTimeError, ...closeTimeBind } = bindField(fields.closeTime);

  console.log(fields.equipmentIds());

  const wrapChangeRoomType = useWrap((next: RoomType) => {
    fields.roomType.set(next);
  });

  const wrapChangeCapacity = useWrap((next: number) => {
    fields.capacity.set(next);
  });

  const wrapChangeFloor = useWrap((next: number) => {
    fields.floor.set(next);
  });

  const wrapChangeDescription = useWrap((next: string) => {
    fields.description.set(next);
  });

  const wrapWriteEquipmentIds = useWrap((next: string[]) => {
    writeStringFieldArray(fields.equipmentIds, next);
  });

  const wrapWritePhotos = useWrap((next: string[]) => {
    writeStringFieldArray(fields.photos, next);
  });

  const wrapCloseSheet = useWrap(() => {
    onOpenChange(false);
  });

  const wrapSubmit = useWrap(async () => {
    console.log("Submit - ", fields.equipmentIds);
    const values = {
      name: fields.name(),
      building: fields.building(),
      roomType: fields.roomType(),
      capacity: Number(fields.capacity()),
      floor: Number(fields.floor()),
      openTime: fields.openTime(),
      closeTime: fields.closeTime(),
      equipmentIds: readStringFieldArray(fields.equipmentIds),
      description: fields.description() || undefined,
      photos: readStringFieldArray(fields.photos),
    };

    console.log("After : ", values);

    const parsed = createRoomSchema.safeParse(values);
    if (!parsed.success) return;

    if (mode === "edit") {
      const roomId = roomFormEditingRoomAtom()?.id;
      if (!roomId) return;

      await wrap(updateRoomMutation({ roomId, body: parsed.data }));
    } else {
      await wrap(createRoomMutation(parsed.data));
    }

    wrapCloseSheet();
  });

  return (
    <Sheet
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          wrapCloseSheet();
          return;
        }

        onOpenChange(true);
      }}
    >
      <SheetContent
        side="right"
        className="w-full max-w-3xl overflow-y-auto bg-surface-container-low"
      >
        <SheetHeader>
          <SheetTitle>{mode === "edit" ? "Edit Room" : "Create Room"}</SheetTitle>
          <SheetDescription>
            Configure room details, operating hours, equipment, and media.
          </SheetDescription>
        </SheetHeader>

        <div data-slot="room-form" className="flex flex-col gap-5 p-4">
          <label className="flex flex-col gap-2">
            <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-on-surface-variant">
              <IconHash className="size-4" /> Name
            </span>
            <Input {...nameBind} aria-invalid={!!nameError} placeholder="e.g. LAB_402B" />
            {nameError && (
              <p className="text-xs uppercase tracking-wider text-secondary">{nameError}</p>
            )}
          </label>

          <label className="flex flex-col gap-2">
            <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-on-surface-variant">
              <IconBuilding className="size-4" /> Building
            </span>
            <Input {...buildingBind} aria-invalid={!!buildingError} placeholder="e.g. Building A" />
            {buildingError && (
              <p className="text-xs uppercase tracking-wider text-secondary">{buildingError}</p>
            )}
          </label>

          <label className="flex flex-col gap-2">
            <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-on-surface-variant">
              <IconCategory className="size-4" /> Room Type
            </span>
            <select
              value={fields.roomType()}
              onChange={(e) => wrapChangeRoomType(e.target.value as RoomType)}
              className="h-9 w-full bg-surface-container-lowest px-3 text-sm font-bold uppercase tracking-wide text-on-surface outline-none"
            >
              {ROOM_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-2">
              <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                <IconUsers className="size-4" /> Capacity
              </span>
              <Input
                {...capacityBind}
                type="number"
                min={1}
                aria-invalid={!!capacityError}
                onChange={(e) => wrapChangeCapacity(Number(e.target.value))}
              />
              {capacityError && (
                <p className="text-xs uppercase tracking-wider text-secondary">{capacityError}</p>
              )}
            </label>

            <label className="flex flex-col gap-2">
              <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                <IconHash className="size-4" /> Floor
              </span>
              <Input
                {...floorBind}
                type="number"
                min={0}
                aria-invalid={!!floorError}
                onChange={(e) => wrapChangeFloor(Number(e.target.value))}
              />
              {floorError && (
                <p className="text-xs uppercase tracking-wider text-secondary">{floorError}</p>
              )}
            </label>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-2">
              <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                <IconCalendarTime className="size-4" /> Open Time
              </span>
              <Input {...openTimeBind} type="time" aria-invalid={!!openTimeError} />
              {openTimeError && (
                <p className="text-xs uppercase tracking-wider text-secondary">{openTimeError}</p>
              )}
            </label>

            <label className="flex flex-col gap-2">
              <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                <IconCalendarTime className="size-4" /> Close Time
              </span>
              <Input {...closeTimeBind} type="time" aria-invalid={!!closeTimeError} />
              {closeTimeError && (
                <p className="text-xs uppercase tracking-wider text-secondary">{closeTimeError}</p>
              )}
            </label>
          </div>

          <label className="flex flex-col gap-2">
            <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-on-surface-variant">
              <IconDeviceDesktop className="size-4" /> Equipment
            </span>
            <EquipmentMultiSelect
              value={readStringFieldArray(fields.equipmentIds)}
              options={equipment}
              onChange={wrapWriteEquipmentIds}
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
              Description
            </span>
            <textarea
              value={fields.description() ?? ""}
              onChange={(e) => wrapChangeDescription(e.target.value)}
              placeholder="Optional room notes"
              className="min-h-24 w-full resize-y bg-surface-container-lowest px-3 py-2 text-sm text-on-surface outline-none"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
              Photos
            </span>
            <RoomPhotosUpload
              value={readStringFieldArray(fields.photos)}
              onChange={wrapWritePhotos}
            />
          </label>
        </div>

        <SheetFooter>
          <Button type="button" variant="outline" onClick={wrapCloseSheet}>
            Cancel
          </Button>
          <Button type="button" disabled={submitting} onClick={wrapSubmit}>
            {submitting ? "Saving..." : mode === "edit" ? "Save Changes" : "Create Room"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}, "RoomForm");
