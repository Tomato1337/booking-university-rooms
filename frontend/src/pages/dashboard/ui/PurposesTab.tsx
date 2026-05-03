import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import {
  adminBookingPurposesAtom,
  createBookingPurposeMutation,
  deactivateBookingPurposeMutation,
  fetchAdminBookingPurposesAction,
  hardDeleteBookingPurposeMutation,
  reactivateBookingPurposeMutation,
  updateBookingPurposeMutation,
  type AdminBookingPurpose,
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

type PurposeFormState = {
  code: string
  labelRu: string
  labelEn: string
  sortOrder: number
  isActive: boolean
}

type PurposeStatusTab = "active" | "inactive"

const emptyForm: PurposeFormState = {
  code: "",
  labelRu: "",
  labelEn: "",
  sortOrder: 0,
  isActive: true,
}

function toForm(item: AdminBookingPurpose): PurposeFormState {
  return {
    code: item.code,
    labelRu: item.labelRu,
    labelEn: item.labelEn,
    sortOrder: item.sortOrder,
    isActive: item.isActive,
  }
}

export const PurposesTab = reatomComponent(() => {
  const [t] = useAtom(tAtom)
  const purposes = adminBookingPurposesAtom()
  const loadStatus = fetchAdminBookingPurposesAction.status()
  const createStatus = createBookingPurposeMutation.status()
  const updateStatus = updateBookingPurposeMutation.status()
  const deactivateStatus = deactivateBookingPurposeMutation.status()
  const reactivateStatus = reactivateBookingPurposeMutation.status()
  const hardDeleteStatus = hardDeleteBookingPurposeMutation.status()

  const [statusTab, setStatusTab] = useState<PurposeStatusTab>("active")
  const [formOpen, setFormOpen] = useState(false)
  const [editingPurpose, setEditingPurpose] = useState<AdminBookingPurpose | null>(null)
  const [deletePurpose, setDeletePurpose] = useState<AdminBookingPurpose | null>(null)
  const [form, setForm] = useState<PurposeFormState>(emptyForm)
  const submitting = createStatus.isPending || updateStatus.isPending

  const filteredPurposes = useMemo(
    () => purposes.filter((item) => (statusTab === "active" ? item.isActive : !item.isActive)),
    [purposes, statusTab],
  )

  const wrapLoad = useWrap(() => {
    fetchAdminBookingPurposesAction()
  })

  useEffect(() => {
    wrapLoad()
  }, [wrapLoad])

  const wrapOpenCreate = useWrap(() => {
    setEditingPurpose(null)
    setForm(emptyForm)
    setFormOpen(true)
  })

  const wrapOpenEdit = useWrap((item: AdminBookingPurpose) => {
    setEditingPurpose(item)
    setForm(toForm(item))
    setFormOpen(true)
  })

  const wrapCloseForm = useWrap(() => {
    setFormOpen(false)
    setEditingPurpose(null)
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
    if (!body.labelRu || !body.labelEn || (!editingPurpose && !body.code)) return

    if (editingPurpose) {
      await updateBookingPurposeMutation({ code: editingPurpose.code, body })
    } else {
      await createBookingPurposeMutation(body)
    }
    wrapCloseForm()
  })

  const wrapDeactivate = useWrap(async (code: string) => {
    await deactivateBookingPurposeMutation(code)
    toast.success(t.admin.purposes.toasts.deactivated)
  })

  const wrapReactivate = useWrap(async (code: string) => {
    await reactivateBookingPurposeMutation(code)
    toast.success(t.admin.purposes.toasts.reactivated)
  })

  const wrapHardDelete = useWrap(async () => {
    if (!deletePurpose) return
    try {
      await hardDeleteBookingPurposeMutation(deletePurpose.code)
      toast.success(t.admin.purposes.toasts.deleted)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t.admin.purposes.toasts.deleteFailed)
    } finally {
      setDeletePurpose(null)
    }
  })

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-2">
          <h3 className="text-[1.75rem] font-black uppercase tracking-tighter">
            {t.admin.purposes.title}
          </h3>
          <p className="text-sm text-on-surface-variant">{t.admin.purposes.subtitle}</p>
        </div>
        <Button type="button" onClick={wrapOpenCreate}>
          <IconPlus className="size-4" />
          {t.admin.purposes.form.create}
        </Button>
      </div>

      <StatusTabs
        value={statusTab}
        onChange={setStatusTab}
        options={[
          { value: "active", label: t.admin.purposes.tabs.active },
          { value: "inactive", label: t.admin.purposes.tabs.inactive },
        ]}
      />

      <div className="overflow-x-auto bg-surface-container-low">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t.admin.purposes.columns.code}</TableHead>
              <TableHead>{t.admin.purposes.columns.labelRu}</TableHead>
              <TableHead>{t.admin.purposes.columns.labelEn}</TableHead>
              <TableHead>{t.admin.purposes.columns.sortOrder}</TableHead>
              <TableHead>{t.admin.purposes.columns.status}</TableHead>
              <TableHead className="text-right">{t.admin.purposes.columns.actions}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loadStatus.isFirstPending ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-on-surface-variant">
                  {t.admin.purposes.loading}
                </TableCell>
              </TableRow>
            ) : filteredPurposes.length > 0 ? (
              filteredPurposes.map((item) => (
                <TableRow key={item.code}>
                  <TableCell className="font-mono text-xs">{item.code}</TableCell>
                  <TableCell>{item.labelRu}</TableCell>
                  <TableCell>{item.labelEn}</TableCell>
                  <TableCell>{item.sortOrder}</TableCell>
                  <TableCell>
                    <StatusBadge
                      status={item.isActive ? "active" : "inactive"}
                      label={item.isActive ? t.admin.purposes.active : t.admin.purposes.inactive}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {item.isActive ? (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => wrapOpenEdit(item)}
                          >
                            <IconPencil className="size-4" />
                            {t.admin.purposes.actions.edit}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            disabled={deactivateStatus.isPending}
                            onClick={() => wrapDeactivate(item.code)}
                          >
                            <IconTrash className="size-4" />
                            {t.admin.purposes.actions.deactivate}
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => wrapOpenEdit(item)}
                          >
                            <IconPencil className="size-4" />
                            {t.admin.purposes.actions.edit}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={reactivateStatus.isPending}
                            onClick={() => wrapReactivate(item.code)}
                          >
                            <IconRefresh className="size-4" />
                            {t.admin.purposes.actions.reactivate}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            onClick={() => setDeletePurpose(item)}
                          >
                            <IconTrashX className="size-4" />
                            {t.admin.purposes.actions.delete}
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
                  {statusTab === "active" ? t.admin.purposes.emptyActive : t.admin.purposes.emptyInactive}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Sheet
        open={formOpen}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            wrapCloseForm()
            return
          }

          setFormOpen(true)
        }}
      >
        <SheetContent side="right" className="w-full max-w-xl bg-surface-container-low">
          <SheetHeader>
            <SheetTitle>
              {editingPurpose ? t.admin.purposes.form.editTitle : t.admin.purposes.form.createTitle}
            </SheetTitle>
          </SheetHeader>

          <div className="grid gap-4 p-4">
            <label className="flex flex-col gap-2">
              <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                {t.admin.purposes.form.code}
              </span>
              <Input
                value={form.code}
                disabled={Boolean(editingPurpose)}
                onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))}
                placeholder="exam_review"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                {t.admin.purposes.form.labelRu}
              </span>
              <Input
                value={form.labelRu}
                onChange={(e) => setForm((prev) => ({ ...prev, labelRu: e.target.value }))}
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                {t.admin.purposes.form.labelEn}
              </span>
              <Input
                value={form.labelEn}
                onChange={(e) => setForm((prev) => ({ ...prev, labelEn: e.target.value }))}
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                {t.admin.purposes.form.sortOrder}
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
              {t.admin.purposes.form.cancel}
            </Button>
            <Button type="button" disabled={submitting} onClick={wrapSubmit}>
              {submitting
                ? t.admin.purposes.form.saving
                : editingPurpose
                  ? t.admin.purposes.form.save
                  : t.admin.purposes.form.create}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={Boolean(deletePurpose)}
        onOpenChange={(open) => !open && setDeletePurpose(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.admin.purposes.alerts.deleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.admin.purposes.alerts.deleteDesc.replace("{code}", deletePurpose?.code ?? "")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={hardDeleteStatus.isPending}>
              {t.admin.purposes.alerts.deleteCancel}
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={hardDeleteStatus.isPending}
              onClick={wrapHardDelete}
            >
              {hardDeleteStatus.isPending
                ? t.admin.purposes.alerts.deleting
                : t.admin.purposes.alerts.deleteConfirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}, "PurposesTab")
