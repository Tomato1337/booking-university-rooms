import {
  IconPencil,
  IconPlus,
  IconTrash,
  IconAlertTriangle,
  IconExclamationCircle,
} from "@tabler/icons-react";

import { reatomComponent, useWrap } from "@reatom/react";
import { useState, useEffect } from "react";

import {
  adminRoomsListAtom,
  closeEquipmentFormAction,
  deleteEquipmentMutation,
  equipmentFormModeAtom,
  equipmentFormOpenAtom,
  openCreateEquipmentFormAction,
  openEditEquipmentFormAction,
  equipmentListQuery,
  searchAdminRoomsAction,
  type EquipmentDeleteResult,
  type EquipmentItem,
} from "@/modules/admin";
import { EquipmentForm } from "@/modules/admin";
import { getEquipmentIcon } from "@/modules/rooms";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";
import { Button } from "@/shared/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";

interface DeleteDialogState {
  equipment: EquipmentItem;
  usage: EquipmentDeleteResult["usedInRooms"];
  confirmed: boolean;
}

export const EquipmentTab = reatomComponent(() => {
  const equipment = equipmentListQuery.data();
  const status = equipmentListQuery.status();
  const rooms = adminRoomsListAtom();
  const deleteStatus = deleteEquipmentMutation.status();
  const equipmentFormOpen = equipmentFormOpenAtom();
  const equipmentFormMode = equipmentFormModeAtom();

  const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState | null>(null);

  const wrapOpenDeleteDialog = useWrap((item: EquipmentItem) => {
    const usage = rooms
      .filter((room) => room.equipment.some((eq) => eq.id === item.id))
      .map((room) => ({ id: room.id, name: room.name }));

    setDeleteDialog({
      equipment: item,
      usage,
      confirmed: false,
    });
  });

  const wrapConfirmDelete = useWrap(async () => {
    if (!deleteDialog) return;

    await deleteEquipmentMutation(deleteDialog.equipment.id);

    setDeleteDialog({
      equipment: deleteDialog.equipment,
      usage: deleteDialog.usage,
      confirmed: true,
    });
  });

  const wrapOpenCreateForm = useWrap(() => {
    openCreateEquipmentFormAction();
  });

  const wrapOpenEditForm = useWrap((item: EquipmentItem) => {
    openEditEquipmentFormAction(item);
  });

  const wrapCloseForm = useWrap(() => {
    closeEquipmentFormAction();
  });

  const wrapActivate = useWrap(() => {
    if (rooms.length === 0) {
      searchAdminRoomsAction();
    }
  });

  useEffect(() => {
    wrapActivate();
  }, []);

  return (
    <section data-slot="dashboard-equipment-tab" className="flex flex-1 flex-col gap-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h3 className="text-[1.75rem] font-black uppercase tracking-tighter">Equipment</h3>

        <Button type="button" onClick={wrapOpenCreateForm}>
          <IconPlus className="size-4" />
          Create Equipment
        </Button>
      </div>

      <div className="bg-surface-container-low">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Icon</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {status.isFirstPending ? (
              <TableRow>
                <TableCell colSpan={3} className="py-12 text-center text-on-surface-variant">
                  Loading equipment...
                </TableCell>
              </TableRow>
            ) : equipment.length > 0 ? (
              equipment.map((item) => {
                const EquipmentIcon = getEquipmentIcon(item.icon);

                return (
                  <TableRow key={item.id} data-slot="admin-equipment-row">
                    <TableCell>
                      <span className="inline-flex size-8 items-center justify-center bg-surface-container-high">
                        <EquipmentIcon size={16} />
                      </span>
                    </TableCell>
                    <TableCell className="font-bold uppercase tracking-wider">
                      {item.name}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => wrapOpenEditForm(item)}
                        >
                          <IconPencil className="size-4" />
                          Edit
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          disabled={deleteStatus.isPending}
                          onClick={() => wrapOpenDeleteDialog(item)}
                        >
                          <IconTrash className="size-4" />
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="py-12 text-center text-on-surface-variant">
                  No equipment items
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <EquipmentForm
        open={equipmentFormOpen}
        onOpenChange={(open) => !open && wrapCloseForm()}
        mode={equipmentFormMode}
      />

      <AlertDialog
        open={Boolean(deleteDialog)}
        onOpenChange={(open) => {
          if (!open) setDeleteDialog(null);
        }}
      >
        <AlertDialogContent size="sm" data-slot="equipment-delete-warning-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>
              <span className="inline-flex items-center gap-2">
                <IconAlertTriangle className="size-4 text-tertiary" />
                Equipment delete summary
              </span>
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteDialog?.confirmed ? (
                <>
                  <span className="block">
                    {deleteDialog.equipment.name} has been removed from catalogue.
                  </span>
                  <span className="mt-2 block">
                    Cascade behavior applied: equipment relationships were removed from linked
                    rooms.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">
                    Delete {deleteDialog?.equipment.name}? This action updates room-equipment
                    relationships.
                  </span>
                  <span className="mt-2 block">
                    Cascade behavior: linked rooms will no longer include this equipment.
                  </span>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {deleteDialog && deleteDialog.usage.length > 0 ? (
            <div className="bg-surface-container px-3 py-2">
              <p className="mb-2 inline-flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-secondary">
                <IconExclamationCircle className="size-4" />
                {deleteDialog.confirmed ? "Was used in rooms" : "In use by rooms"}
              </p>
              <ul className="space-y-1 text-xs uppercase tracking-wider text-on-surface-variant">
                {deleteDialog.usage.map((room) => (
                  <li key={room.id}>{room.name}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
            {deleteDialog?.confirmed ? (
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  setDeleteDialog(null);
                }}
              >
                Done
              </AlertDialogAction>
            ) : (
              <AlertDialogAction
                variant="destructive"
                disabled={deleteStatus.isPending}
                onClick={(e) => {
                  e.preventDefault();
                  void wrapConfirmDelete();
                }}
              >
                {deleteStatus.isPending ? "Deleting..." : "Confirm Delete"}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}, "EquipmentTab");
