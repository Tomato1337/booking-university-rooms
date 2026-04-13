import {
  IconBroadcast,
  IconChalkboard,
  IconDeviceDesktop,
  IconMicrophone,
  IconPresentation,
  IconTerminal2,
  IconVideo,
  IconVolume,
  IconWifi,
} from "@tabler/icons-react"

import { wrap } from "@reatom/core"
import { bindField, reatomComponent, useWrap } from "@reatom/react"
import type * as React from "react"

import {
  equipmentForm,
  equipmentFormEditingItemAtom,
} from "../application/admin-equipment-form-state"
import {
  createEquipmentMutation,
  updateEquipmentMutation,
} from "../application/equipment-atoms"
import { createEquipmentSchema } from "../domain/schemas"
import { Button } from "@/shared/ui/button"
import { Input } from "@/shared/ui/input"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/shared/ui/sheet"

interface IconOption {
  value: string
  label: string
  Icon: React.ComponentType<{ className?: string; size?: number }>
}

const ICON_OPTIONS: IconOption[] = [
  { value: "IconVideo", label: "Video", Icon: IconVideo },
  { value: "IconPresentation", label: "Presentation", Icon: IconPresentation },
  { value: "IconBroadcast", label: "Broadcast", Icon: IconBroadcast },
  { value: "IconDeviceDesktop", label: "Desktop", Icon: IconDeviceDesktop },
  { value: "IconMicrophone", label: "Microphone", Icon: IconMicrophone },
  { value: "IconWifi", label: "Wi-Fi", Icon: IconWifi },
  { value: "IconVolume", label: "Audio", Icon: IconVolume },
  { value: "IconTerminal2", label: "Terminal", Icon: IconTerminal2 },
  { value: "IconChalkboard", label: "Chalkboard", Icon: IconChalkboard },
]

export interface EquipmentFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "create" | "edit"
}

export const EquipmentForm = reatomComponent<EquipmentFormProps>(({ open, onOpenChange, mode }) => {
  const fields = equipmentForm.fields

  const createStatus = createEquipmentMutation.status()
  const updateStatus = updateEquipmentMutation.status()
  const submitting = createStatus.isPending || updateStatus.isPending

  const { error: nameError, ...nameBind } = bindField(fields.name)
  const { error: iconError } = bindField(fields.icon)

  const wrapChangeIcon = useWrap((next: string) => {
    fields.icon.set(next)
  })

  const selectedIconOption = ICON_OPTIONS.find((item) => item.value === fields.icon())
  const SelectedIcon = selectedIconOption?.Icon

  const wrapSubmit = useWrap(async () => {
    const values = {
      name: fields.name(),
      icon: fields.icon(),
    }

    const parsed = createEquipmentSchema.safeParse(values)
    if (!parsed.success) return

    if (mode === "edit") {
      const equipmentId = equipmentFormEditingItemAtom()?.id
      if (!equipmentId) return

      await wrap(updateEquipmentMutation({ equipmentId, body: parsed.data }))
    } else {
      await wrap(createEquipmentMutation(parsed.data))
    }

    onOpenChange(false)
  })

  const wrapCloseSheet = useWrap(() => {
    onOpenChange(false)
  })

  return (
    <Sheet
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          wrapCloseSheet()
          return
        }

        onOpenChange(true)
      }}
    >
      <SheetContent side="right" className="w-full max-w-xl bg-surface-container-low">
        <SheetHeader>
          <SheetTitle>{mode === "edit" ? "Edit Equipment" : "Create Equipment"}</SheetTitle>
          <SheetDescription>
            Define a reusable equipment entry and choose its Tabler icon.
          </SheetDescription>
        </SheetHeader>

        <div data-slot="equipment-form" className="flex flex-col gap-5 p-4">
          <label className="flex flex-col gap-2">
            <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Name</span>
            <Input {...nameBind} aria-invalid={!!nameError} placeholder="e.g. Projector" />
            {nameError && (
              <p className="text-xs font-bold uppercase tracking-widest text-secondary">{nameError}</p>
            )}
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Icon</span>
            <select
              value={fields.icon()}
              onChange={(e) => wrapChangeIcon(e.target.value)}
              aria-invalid={!!iconError}
              className="h-9 w-full bg-surface-container-lowest px-3 text-sm font-bold uppercase tracking-wide text-on-surface outline-none"
            >
              {ICON_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {iconError && (
              <p className="text-xs font-bold uppercase tracking-widest text-secondary">{iconError}</p>
            )}
          </label>

          <div className="bg-surface-container p-3">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-on-surface-variant">
              Preview
            </p>
            <div className="flex items-center gap-3 text-on-surface">
              {SelectedIcon && (
                <span className="inline-flex size-8 items-center justify-center bg-surface-container-high">
                  <SelectedIcon size={18} />
                </span>
              )}
              <span className="text-sm font-bold uppercase tracking-wider">{fields.name() || "Equipment"}</span>
            </div>
          </div>
        </div>

        <SheetFooter>
          <Button type="button" variant="outline" onClick={wrapCloseSheet}>
            Cancel
          </Button>
          <Button type="button" disabled={submitting} onClick={wrapSubmit}>
            {submitting ? "Saving..." : mode === "edit" ? "Save Changes" : "Create Equipment"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}, "EquipmentForm")
