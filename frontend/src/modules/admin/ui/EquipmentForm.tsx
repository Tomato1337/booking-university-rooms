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
import { bindField, reatomComponent, useWrap, useAtom } from "@reatom/react"
import type * as React from "react"
import { tAtom } from "@/modules/i18n"

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
  key: keyof typeof ICON_MAP
  Icon: React.ComponentType<{ className?: string; size?: number }>
}

const ICON_MAP = {
  video: IconVideo,
  presentation: IconPresentation,
  broadcast: IconBroadcast,
  desktop: IconDeviceDesktop,
  microphone: IconMicrophone,
  wifi: IconWifi,
  volume: IconVolume,
  terminal: IconTerminal2,
  chalkboard: IconChalkboard,
} as const

const ICON_OPTIONS: IconOption[] = [
  { value: "IconVideo", key: "video", Icon: IconVideo },
  { value: "IconPresentation", key: "presentation", Icon: IconPresentation },
  { value: "IconBroadcast", key: "broadcast", Icon: IconBroadcast },
  { value: "IconDeviceDesktop", key: "desktop", Icon: IconDeviceDesktop },
  { value: "IconMicrophone", key: "microphone", Icon: IconMicrophone },
  { value: "IconWifi", key: "wifi", Icon: IconWifi },
  { value: "IconVolume", key: "volume", Icon: IconVolume },
  { value: "IconTerminal2", key: "terminal", Icon: IconTerminal2 },
  { value: "IconChalkboard", key: "chalkboard", Icon: IconChalkboard },
]

export interface EquipmentFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "create" | "edit"
}

export const EquipmentForm = reatomComponent<EquipmentFormProps>(({ open, onOpenChange, mode }) => {
  const [t] = useAtom(tAtom)
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
          <SheetTitle>{mode === "edit" ? t.admin.equipment.form.editTitle : t.admin.equipment.form.createTitle}</SheetTitle>
          <SheetDescription>
            {t.admin.equipment.form.description}
          </SheetDescription>
        </SheetHeader>

        <div data-slot="equipment-form" className="flex flex-col gap-5 p-4">
          <label className="flex flex-col gap-2">
            <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">{t.admin.equipment.form.name}</span>
            <Input {...nameBind} aria-invalid={!!nameError} placeholder={t.admin.equipment.form.namePlaceholder} />
            {nameError && (
              <p className="text-xs font-bold uppercase tracking-widest text-secondary">
                {(t.validation as Record<string, string>)[nameError] ?? nameError}
              </p>
            )}
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">{t.admin.equipment.form.icon}</span>
            <select
              value={fields.icon()}
              onChange={(e) => wrapChangeIcon(e.target.value)}
              aria-invalid={!!iconError}
              className="h-9 w-full bg-surface-container-lowest px-3 text-sm font-bold uppercase tracking-wide text-on-surface outline-none"
            >
              {ICON_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {(t.admin.equipment.icons as Record<string, string>)[option.key]}
                </option>
              ))}
            </select>
            {iconError && (
              <p className="text-xs font-bold uppercase tracking-widest text-secondary">
                {(t.validation as Record<string, string>)[iconError] ?? iconError}
              </p>
            )}
          </label>

          <div className="bg-surface-container p-3">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-on-surface-variant">
              {t.admin.equipment.form.preview}
            </p>
            <div className="flex items-center gap-3 text-on-surface">
              {SelectedIcon && (
                <span className="inline-flex size-8 items-center justify-center bg-surface-container-high">
                  <SelectedIcon size={18} />
                </span>
              )}
              <span className="text-sm font-bold uppercase tracking-wider">{fields.name() || t.admin.equipment.form.defaultName}</span>
            </div>
          </div>
        </div>

        <SheetFooter>
          <Button type="button" variant="outline" onClick={wrapCloseSheet}>
            {t.admin.equipment.form.cancel}
          </Button>
          <Button type="button" disabled={submitting} onClick={wrapSubmit}>
            {submitting ? t.admin.equipment.form.saving : mode === "edit" ? t.admin.equipment.form.saveChanges : t.admin.equipment.form.create}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}, "EquipmentForm")
