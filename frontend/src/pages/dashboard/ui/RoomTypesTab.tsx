import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import {
  adminRoomTypesAtom,
  createRoomTypeMutation,
  deactivateRoomTypeMutation,
  fetchAdminRoomTypesAction,
  hardDeleteRoomTypeMutation,
  reactivateRoomTypeMutation,
  updateRoomTypeMutation,
  type AdminRoomType,
} from "@/modules/catalogs"
import { tAtom } from "@/modules/i18n"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog"
import { Button } from "@/shared/ui/button"
import { Input } from "@/shared/ui/input"
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/shared/ui/sheet"
import { StatusBadge } from "@/shared/ui/status-badge"
import { StatusTabs } from "@/shared/ui/status-tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table"
import { reatomComponent, useAtom, useWrap } from "@reatom/react"
import { IconPencil, IconPlus, IconRefresh, IconTrash, IconTrashX } from "@tabler/icons-react"

type RoomTypeFormState = {
  code: string
  labelRu: string
  labelEn: string
  sortOrder: number
  isActive: boolean
}

type RoomTypeStatusTab = "active" | "inactive"

const emptyForm: RoomTypeFormState = {
  code: "",
  labelRu: "",
  labelEn: "",
  sortOrder: 0,
  isActive: true,
}

function toForm(item: AdminRoomType): RoomTypeFormState {
  return {
    code: item.code,
    labelRu: item.labelRu,
    labelEn: item.labelEn,
    sortOrder: item.sortOrder,
    isActive: item.isActive,
  }
}

export const RoomTypesTab = reatomComponent(() => {
  const [t] = useAtom(tAtom)
  const roomTypes = adminRoomTypesAtom()
  const loadStatus = fetchAdminRoomTypesAction.status()
  const createStatus = createRoomTypeMutation.status()
  const updateStatus = updateRoomTypeMutation.status()
  const deactivateStatus = deactivateRoomTypeMutation.status()
  const reactivateStatus = reactivateRoomTypeMutation.status()
  const hardDeleteStatus = hardDeleteRoomTypeMutation.status()

  const [statusTab, setStatusTab] = useState<RoomTypeStatusTab>("active")
  const [formOpen, setFormOpen] = useState(false)
  const [editingRoomType, setEditingRoomType] = useState<AdminRoomType | null>(null)
  const [deleteRoomType, setDeleteRoomType] = useState<AdminRoomType | null>(null)
  const [form, setForm] = useState<RoomTypeFormState>(emptyForm)
  const submitting = createStatus.isPending || updateStatus.isPending

  const filteredRoomTypes = useMemo(
    () => roomTypes.filter((item) => (statusTab === "active" ? item.isActive : !item.isActive)),
    [roomTypes, statusTab],
  )

  const wrapLoad = useWrap(() => {
    fetchAdminRoomTypesAction()
  })

  useEffect(() => {
    wrapLoad()
  }, [wrapLoad])

  const wrapOpenCreate = useWrap(() => {
    setEditingRoomType(null)
    setForm(emptyForm)
    setFormOpen(true)
  })

  const wrapOpenEdit = useWrap((item: AdminRoomType) => {
    setEditingRoomType(item)
    setForm(toForm(item))
    setFormOpen(true)
  })

  const wrapCloseForm = useWrap(() => {
    setFormOpen(false)
    setEditingRoomType(null)
    setForm(emptyForm)
  })

  const wrapSubmit = useWrap(async () => {
    const body = {
      code: form.code.trim(),
      labelRu: form.labelRu.trim(),
      labelEn: form.labelEn.trim(),
      sortOrder: Number(form.sortOrder) || 0,
      isActive: form.isActive,
    }
    if (!body.labelRu || !body.labelEn || (!editingRoomType && !body.code)) return

    if (editingRoomType) {
      await updateRoomTypeMutation({ code: editingRoomType.code, body })
    } else {
      await createRoomTypeMutation(body)
    }
    wrapCloseForm()
  })

  const wrapDeactivate = useWrap(async (code: string) => {
    await deactivateRoomTypeMutation(code)
    toast.success(t.admin.roomTypes.toasts.deactivated)
  })

  const wrapReactivate = useWrap(async (code: string) => {
    await reactivateRoomTypeMutation(code)
    toast.success(t.admin.roomTypes.toasts.reactivated)
  })

  const wrapHardDelete = useWrap(async () => {
    if (!deleteRoomType) return
    try {
      await hardDeleteRoomTypeMutation(deleteRoomType.code)
      toast.success(t.admin.roomTypes.toasts.deleted)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t.admin.roomTypes.toasts.deleteFailed)
    } finally {
      setDeleteRoomType(null)
    }
  })

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-2">
          <h3 className="text-[1.75rem] font-black uppercase tracking-tighter">
            {t.admin.roomTypes.title}
          </h3>
          <p className="text-sm text-on-surface-variant">{t.admin.roomTypes.subtitle}</p>
        </div>
        <Button type="button" onClick={wrapOpenCreate}>
          <IconPlus className="size-4" />
          {t.admin.roomTypes.form.create}
        </Button>
      </div>

      <StatusTabs
        value={statusTab}
        onChange={setStatusTab}
        options={[
          { value: "active", label: t.admin.roomTypes.tabs.active },
          { value: "inactive", label: t.admin.roomTypes.tabs.inactive },
        ]}
      />

      <div className="overflow-x-auto bg-surface-container-low">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t.admin.roomTypes.columns.code}</TableHead>
              <TableHead>{t.admin.roomTypes.columns.labelRu}</TableHead>
              <TableHead>{t.admin.roomTypes.columns.labelEn}</TableHead>
              <TableHead>{t.admin.roomTypes.columns.sortOrder}</TableHead>
              <TableHead>{t.admin.roomTypes.columns.status}</TableHead>
              <TableHead className="text-right">{t.admin.roomTypes.columns.actions}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loadStatus.isFirstPending ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-on-surface-variant">
                  {t.admin.roomTypes.loading}
                </TableCell>
              </TableRow>
            ) : filteredRoomTypes.length > 0 ? (
              filteredRoomTypes.map((item) => (
                <TableRow key={item.code}>
                  <TableCell className="font-mono text-xs">{item.code}</TableCell>
                  <TableCell>{item.labelRu}</TableCell>
                  <TableCell>{item.labelEn}</TableCell>
                  <TableCell>{item.sortOrder}</TableCell>
                  <TableCell>
                    <StatusBadge
                      status={item.isActive ? "active" : "inactive"}
                      label={item.isActive ? t.admin.roomTypes.active : t.admin.roomTypes.inactive}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {item.isActive ? (
                        <>
                          <Button type="button" size="sm" variant="outline" onClick={() => wrapOpenEdit(item)}>
                            <IconPencil className="size-4" />
                            {t.admin.roomTypes.actions.edit}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={deactivateStatus.isPending}
                            onClick={() => wrapDeactivate(item.code)}
                          >
                            <IconTrash className="size-4" />
                            {t.admin.roomTypes.actions.deactivate}
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button type="button" size="sm" variant="outline" onClick={() => wrapOpenEdit(item)}>
                            <IconPencil className="size-4" />
                            {t.admin.roomTypes.actions.edit}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={reactivateStatus.isPending}
                            onClick={() => wrapReactivate(item.code)}
                          >
                            <IconRefresh className="size-4" />
                            {t.admin.roomTypes.actions.reactivate}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            onClick={() => setDeleteRoomType(item)}
                          >
                            <IconTrashX className="size-4" />
                            {t.admin.roomTypes.actions.delete}
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-on-surface-variant">
                  {statusTab === "active" ? t.admin.roomTypes.emptyActive : t.admin.roomTypes.emptyInactive}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Sheet open={formOpen} onOpenChange={(open) => !open && wrapCloseForm()}>
        <SheetContent side="right" className="w-full max-w-xl bg-surface-container-low">
          <SheetHeader>
            <SheetTitle>
              {editingRoomType ? t.admin.roomTypes.form.editTitle : t.admin.roomTypes.form.createTitle}
            </SheetTitle>
          </SheetHeader>

          <div className="flex flex-col gap-4 p-4">
            <label className="flex flex-col gap-2">
              <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                {t.admin.roomTypes.form.code}
              </span>
              <Input
                value={form.code}
                disabled={Boolean(editingRoomType)}
                onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))}
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                {t.admin.roomTypes.form.labelRu}
              </span>
              <Input value={form.labelRu} onChange={(e) => setForm((prev) => ({ ...prev, labelRu: e.target.value }))} />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                {t.admin.roomTypes.form.labelEn}
              </span>
              <Input value={form.labelEn} onChange={(e) => setForm((prev) => ({ ...prev, labelEn: e.target.value }))} />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                {t.admin.roomTypes.form.sortOrder}
              </span>
              <Input
                type="number"
                value={form.sortOrder}
                onChange={(e) => setForm((prev) => ({ ...prev, sortOrder: Number(e.target.value) }))}
              />
            </label>
          </div>

          <SheetFooter>
            <Button type="button" variant="outline" onClick={wrapCloseForm}>
              {t.admin.roomTypes.form.cancel}
            </Button>
            <Button type="button" disabled={submitting} onClick={wrapSubmit}>
              {submitting
                ? t.admin.roomTypes.form.saving
                : editingRoomType
                  ? t.admin.roomTypes.form.save
                  : t.admin.roomTypes.form.create}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AlertDialog open={Boolean(deleteRoomType)} onOpenChange={(open) => !open && setDeleteRoomType(null)}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>{t.admin.roomTypes.alerts.deleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.admin.roomTypes.alerts.deleteDesc.replace("{code}", deleteRoomType?.code ?? "")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t.admin.roomTypes.alerts.deleteCancel}
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={hardDeleteStatus.isPending}
              onClick={(e) => {
                e.preventDefault()
                void wrapHardDelete()
              }}
            >
              {hardDeleteStatus.isPending
                ? t.admin.roomTypes.alerts.deleting
                : t.admin.roomTypes.alerts.deleteConfirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}, "RoomTypesTab")
