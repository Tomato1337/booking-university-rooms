import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import {
	adminBuildingsAtom,
	createBuildingMutation,
	deactivateBuildingMutation,
	fetchAdminBuildingsAction,
	hardDeleteBuildingMutation,
	reactivateBuildingMutation,
	updateBuildingMutation,
	type AdminBuilding,
} from '@/modules/catalogs'
import { tAtom } from '@/modules/i18n'
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/shared/ui/alert-dialog'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/shared/ui/sheet'
import { StatusBadge } from '@/shared/ui/status-badge'
import { StatusTabs } from '@/shared/ui/status-tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'
import { reatomComponent, useAtom, useWrap } from '@reatom/react'
import { IconPencil, IconPlus, IconRefresh, IconTrash, IconTrashX } from '@tabler/icons-react'

type BuildingFormState = {
	code: string
	labelRu: string
	labelEn: string
	sortOrder: number
	isActive: boolean
}

type BuildingStatusTab = 'active' | 'inactive'

const emptyForm: BuildingFormState = {
	code: '',
	labelRu: '',
	labelEn: '',
	sortOrder: 0,
	isActive: true,
}

function toForm(item: AdminBuilding): BuildingFormState {
	return {
		code: item.code,
		labelRu: item.labelRu,
		labelEn: item.labelEn,
		sortOrder: item.sortOrder,
		isActive: item.isActive,
	}
}

export const BuildingsTab = reatomComponent(() => {
	const [t] = useAtom(tAtom)
	const buildings = adminBuildingsAtom()
	const loadStatus = fetchAdminBuildingsAction.status()
	const createStatus = createBuildingMutation.status()
	const updateStatus = updateBuildingMutation.status()
	const deactivateStatus = deactivateBuildingMutation.status()
	const reactivateStatus = reactivateBuildingMutation.status()
	const hardDeleteStatus = hardDeleteBuildingMutation.status()

	const [statusTab, setStatusTab] = useState<BuildingStatusTab>('active')
	const [formOpen, setFormOpen] = useState(false)
	const [editingBuilding, setEditingBuilding] = useState<AdminBuilding | null>(null)
	const [deleteBuilding, setDeleteBuilding] = useState<AdminBuilding | null>(null)
	const [form, setForm] = useState<BuildingFormState>(emptyForm)
	const submitting = createStatus.isPending || updateStatus.isPending

	const filteredBuildings = useMemo(
		() => buildings.filter((item) => (statusTab === 'active' ? item.isActive : !item.isActive)),
		[buildings, statusTab],
	)

	const wrapLoad = useWrap(() => {
		fetchAdminBuildingsAction()
	})

	useEffect(() => {
		wrapLoad()
	}, [wrapLoad])

	const wrapOpenCreate = useWrap(() => {
		setEditingBuilding(null)
		setForm(emptyForm)
		setFormOpen(true)
	})

	const wrapOpenEdit = useWrap((item: AdminBuilding) => {
		setEditingBuilding(item)
		setForm(toForm(item))
		setFormOpen(true)
	})

	const wrapCloseForm = useWrap(() => {
		setFormOpen(false)
		setEditingBuilding(null)
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
		if (!body.labelRu || !body.labelEn || (!editingBuilding && !body.code)) return

		if (editingBuilding) {
			await updateBuildingMutation({ code: editingBuilding.code, body })
		} else {
			await createBuildingMutation(body)
		}
		wrapCloseForm()
	})

	const wrapDeactivate = useWrap(async (code: string) => {
		await deactivateBuildingMutation(code)
		toast.success(t.admin.buildings.toasts.deactivated)
	})

	const wrapReactivate = useWrap(async (code: string) => {
		await reactivateBuildingMutation(code)
		toast.success(t.admin.buildings.toasts.reactivated)
	})

	const wrapHardDelete = useWrap(async () => {
		if (!deleteBuilding) return
		try {
			await hardDeleteBuildingMutation(deleteBuilding.code)
			toast.success(t.admin.buildings.toasts.deleted)
		} catch (e: unknown) {
			toast.error(e instanceof Error ? e.message : t.admin.buildings.toasts.deleteFailed)
		} finally {
			setDeleteBuilding(null)
		}
	})

	return (
		<section className="flex flex-col gap-6">
			<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
				<div className="flex flex-col gap-2">
					<h3 className="text-[1.75rem] font-black uppercase tracking-tighter">
						{t.admin.buildings.title}
					</h3>
					<p className="text-sm text-on-surface-variant">{t.admin.buildings.subtitle}</p>
				</div>
				<Button type="button" onClick={wrapOpenCreate}>
					<IconPlus className="size-4" />
					{t.admin.buildings.form.create}
				</Button>
			</div>

			<StatusTabs
				value={statusTab}
				onChange={setStatusTab}
				options={[
					{ value: 'active', label: t.admin.buildings.tabs.active },
					{ value: 'inactive', label: t.admin.buildings.tabs.inactive },
				]}
			/>

			<div className="overflow-x-auto bg-surface-container-low">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>{t.admin.buildings.columns.code}</TableHead>
							<TableHead>{t.admin.buildings.columns.labelRu}</TableHead>
							<TableHead>{t.admin.buildings.columns.labelEn}</TableHead>
							<TableHead>{t.admin.buildings.columns.sortOrder}</TableHead>
							<TableHead>{t.admin.buildings.columns.status}</TableHead>
							<TableHead className="text-right">{t.admin.buildings.columns.actions}</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{loadStatus.isFirstPending ? (
							<TableRow>
								<TableCell colSpan={6} className="py-12 text-center text-on-surface-variant">
									{t.admin.buildings.loading}
								</TableCell>
							</TableRow>
						) : filteredBuildings.length > 0 ? (
							filteredBuildings.map((item) => (
								<TableRow key={item.code}>
									<TableCell className="font-mono text-xs">{item.code}</TableCell>
									<TableCell>{item.labelRu}</TableCell>
									<TableCell>{item.labelEn}</TableCell>
									<TableCell>{item.sortOrder}</TableCell>
									<TableCell>
										<StatusBadge
											status={item.isActive ? 'active' : 'inactive'}
											label={item.isActive ? t.admin.buildings.active : t.admin.buildings.inactive}
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
														{t.admin.buildings.actions.edit}
													</Button>
													<Button
														type="button"
														size="sm"
														variant="destructive"
														disabled={deactivateStatus.isPending}
														onClick={() => wrapDeactivate(item.code)}
													>
														<IconTrash className="size-4" />
														{t.admin.buildings.actions.deactivate}
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
														{t.admin.buildings.actions.edit}
													</Button>
													<Button
														type="button"
														size="sm"
														variant="outline"
														disabled={reactivateStatus.isPending}
														onClick={() => wrapReactivate(item.code)}
													>
														<IconRefresh className="size-4" />
														{t.admin.buildings.actions.reactivate}
													</Button>
													<Button
														type="button"
														size="sm"
														variant="destructive"
														onClick={() => setDeleteBuilding(item)}
													>
														<IconTrashX className="size-4" />
														{t.admin.buildings.actions.delete}
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
									{statusTab === 'active'
										? t.admin.buildings.emptyActive
										: t.admin.buildings.emptyInactive}
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
							{editingBuilding
								? t.admin.buildings.form.editTitle
								: t.admin.buildings.form.createTitle}
						</SheetTitle>
					</SheetHeader>

					<div className="grid gap-4 p-4">
						<label className="flex flex-col gap-2">
							<span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
								{t.admin.buildings.form.code}
							</span>
							<Input
								value={form.code}
								disabled={Boolean(editingBuilding)}
								onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))}
								placeholder="exam_review"
							/>
						</label>
						<label className="flex flex-col gap-2">
							<span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
								{t.admin.buildings.form.labelRu}
							</span>
							<Input
								value={form.labelRu}
								onChange={(e) => setForm((prev) => ({ ...prev, labelRu: e.target.value }))}
							/>
						</label>
						<label className="flex flex-col gap-2">
							<span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
								{t.admin.buildings.form.labelEn}
							</span>
							<Input
								value={form.labelEn}
								onChange={(e) => setForm((prev) => ({ ...prev, labelEn: e.target.value }))}
							/>
						</label>
						<label className="flex flex-col gap-2">
							<span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
								{t.admin.buildings.form.sortOrder}
							</span>
							<Input
								type="number"
								value={form.sortOrder}
								onChange={(e) =>
									setForm((prev) => ({ ...prev, sortOrder: Number(e.target.value) }))
								}
							/>
						</label>
					</div>

					<SheetFooter>
						<Button type="button" variant="outline" onClick={wrapCloseForm}>
							{t.admin.buildings.form.cancel}
						</Button>
						<Button type="button" disabled={submitting} onClick={wrapSubmit}>
							{submitting
								? t.admin.buildings.form.saving
								: editingBuilding
									? t.admin.buildings.form.save
									: t.admin.buildings.form.create}
						</Button>
					</SheetFooter>
				</SheetContent>
			</Sheet>

			<AlertDialog
				open={Boolean(deleteBuilding)}
				onOpenChange={(open) => !open && setDeleteBuilding(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>{t.admin.buildings.alerts.deleteTitle}</AlertDialogTitle>
						<AlertDialogDescription>
							{t.admin.buildings.alerts.deleteDesc.replace('{code}', deleteBuilding?.code ?? '')}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={hardDeleteStatus.isPending}>
							{t.admin.buildings.alerts.deleteCancel}
						</AlertDialogCancel>
						<AlertDialogAction
							variant="destructive"
							disabled={hardDeleteStatus.isPending}
							onClick={wrapHardDelete}
						>
							{hardDeleteStatus.isPending
								? t.admin.buildings.alerts.deleting
								: t.admin.buildings.alerts.deleteConfirm}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</section>
	)
}, 'BuildingsTab')
