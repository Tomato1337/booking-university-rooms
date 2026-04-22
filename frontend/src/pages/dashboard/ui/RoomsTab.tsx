import { IconPencil, IconPlus, IconTrash, IconTrashX, IconRefresh } from "@tabler/icons-react";
import { reatomComponent, useWrap, useAtom } from "@reatom/react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

import {
  adminRoomSearchAtom,
  adminRoomStatusTabAtom,
  adminRoomsHasMoreAtom,
  adminRoomsListAtom,
  adminRoomsQuery,
  closeRoomFormAction,
  deleteRoomMutation,
  hardDeleteRoomMutation,
  loadMoreAdminRoomsAction,
  openCreateRoomFormAction,
  openEditRoomFormAction,
  reactivateRoomMutation,
  searchAdminRoomsAction,
  RoomForm,
  roomFormModeAtom,
  roomFormOpenAtom,
  setAdminRoomStatusTabAction,
  updateAdminRoomSearchAction,
} from "@/modules/admin";
import { getEquipmentIcon } from "@/modules/rooms";
import { tAtom } from "@/modules/i18n";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import Search from "@/shared/ui/search";
import { cn } from "@/shared/lib/utils";
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

export const RoomsTab = reatomComponent(() => {
  const [t] = useAtom(tAtom);
  const rooms = adminRoomsListAtom();
  const hasMore = adminRoomsHasMoreAtom();
  const status = adminRoomsQuery.status();
  const deleteStatus = deleteRoomMutation.status();
  const hardDeleteStatus = hardDeleteRoomMutation.status();
  const reactivateStatus = reactivateRoomMutation.status();
  
  const roomFormOpen = roomFormOpenAtom();
  const roomFormMode = roomFormModeAtom();

  const search = adminRoomSearchAtom();
  const activeTab = adminRoomStatusTabAtom();

  const [deactivateRoomId, setDeactivateRoomId] = useState<string | null>(null);
  const [hardDeleteRoomId, setHardDeleteRoomId] = useState<string | null>(null);

  const wrapDeactivate = useWrap(async () => {
    if (!deactivateRoomId) return;
    await deleteRoomMutation(deactivateRoomId);
    toast.success(t.admin.rooms.toasts.deactivated);
    setDeactivateRoomId(null);
  });

  const wrapHardDelete = useWrap(async () => {
    if (!hardDeleteRoomId) return;
    try {
      await hardDeleteRoomMutation(hardDeleteRoomId);
      toast.success(t.admin.rooms.toasts.hardDeleted);
      setHardDeleteRoomId(null);
    } catch (e: any) {
      toast.error(e.message || t.admin.rooms.toasts.hardDeleteFailed);
      setHardDeleteRoomId(null);
    }
  });

  const wrapReactivate = useWrap(async (roomId: string) => {
    await reactivateRoomMutation(roomId);
    toast.success(t.admin.rooms.toasts.reactivated);
  });

  const wrapOpenCreateForm = useWrap(() => {
    openCreateRoomFormAction();
  });

  const wrapOpenEditForm = useWrap((room: (typeof rooms)[number]) => {
    openEditRoomFormAction(room);
  });

  const wrapCloseForm = useWrap(() => {
    closeRoomFormAction();
  });

  const wrapSearch = useWrap((value: string) => {
    updateAdminRoomSearchAction(value);
  });

  const wrapChangeTab = useWrap((tab: "active" | "inactive") => {
    setAdminRoomStatusTabAction(tab);
  });

  const wrapLoadMore = useWrap(() => {
    loadMoreAdminRoomsAction();
  });

  const wrapActivate = useWrap(() => {
    searchAdminRoomsAction();
  });

  useEffect(() => {
    wrapActivate();
  }, [wrapActivate]);

  return (
    <section data-slot="dashboard-rooms-tab" className="flex flex-1 flex-col">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
        <h3 className="text-[1.75rem] font-black uppercase tracking-tighter">{t.admin.rooms.title}</h3>

        <Button type="button" onClick={wrapOpenCreateForm}>
          <IconPlus className="size-4" />
          {t.admin.rooms.createRoom}
        </Button>
      </div>

      <div className="mb-4 flex items-center gap-6 border-b border-border pb-4">
        <Button
          variant="tab"
          className={cn("-ml-2", {
            "text-primary font-black": activeTab === "active",
          })}
          onClick={() => wrapChangeTab("active")}
        >
          {t.admin.rooms.tabs.active}
        </Button>
        <Button
          variant="tab"
          className={cn({
            "text-primary font-black": activeTab === "inactive",
          })}
          onClick={() => wrapChangeTab("inactive")}
        >
          {t.admin.rooms.tabs.inactive}
        </Button>
      </div>

      <Search
        className="bg-surface-container-high mb-4"
        query={search}
        wrapSearch={wrapSearch}
        placeholder={t.admin.rooms.searchPlaceholder}
      />

      <div className="bg-surface-container-low mb-4 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t.admin.rooms.columns.room}</TableHead>
              <TableHead>{t.admin.rooms.columns.type}</TableHead>
              <TableHead>{t.admin.rooms.columns.capacity}</TableHead>
              <TableHead>{t.admin.rooms.columns.location}</TableHead>
              <TableHead>{t.admin.rooms.columns.equipment}</TableHead>
              <TableHead>{t.admin.rooms.columns.status}</TableHead>
              <TableHead className="text-right">{t.admin.rooms.columns.actions}</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {status.isFirstPending ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-on-surface-variant">
                  {t.admin.rooms.loading}
                </TableCell>
              </TableRow>
            ) : rooms.length > 0 ? (
              rooms.filter(Boolean).map((room) => {
                const roomEquipment = room.equipment ?? [];
                const isInactive = !room.availability || room.availability.label.toLowerCase().includes("inactive") || !room.availability.isAvailable;

                return (
                  <TableRow key={room.id} data-slot="admin-room-row">
                    <TableCell className="font-bold uppercase text-primary">{room.name}</TableCell>
                    <TableCell className="uppercase">{room.roomType.replace("_", " ")}</TableCell>
                    <TableCell>{room.capacity}</TableCell>
                    <TableCell>
                      {room.building} / {t.rooms.card.floor.replace("{floor}", String(room.floor))}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1.5">
                        {roomEquipment.length > 0 ? (
                          roomEquipment.map((equipment) => {
                            const EquipmentIcon = getEquipmentIcon(equipment.icon);
                            return (
                              <Badge key={equipment.id} variant="outline" className="gap-1">
                                <EquipmentIcon size={12} />
                                {equipment.name}
                              </Badge>
                            );
                          })
                        ) : (
                          <span className="text-xs text-on-surface-variant">{t.admin.rooms.noEquipment}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={isInactive ? "booked" : "available"}>
                        {isInactive ? t.admin.rooms.statuses.inactive.toLowerCase() : t.admin.rooms.statuses.active.toLowerCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {isInactive ? (
                          <>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => wrapReactivate(room.id)}
                              disabled={reactivateStatus.isPending}
                            >
                              <IconRefresh className="size-4" />
                              {t.admin.rooms.actions.restore}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="destructive"
                              onClick={() => setHardDeleteRoomId(room.id)}
                            >
                              <IconTrashX className="size-4" />
                              {t.admin.rooms.actions.delete}
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => wrapOpenEditForm(room)}
                            >
                              <IconPencil className="size-4" />
                              {t.admin.rooms.actions.edit}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="destructive"
                              onClick={() => setDeactivateRoomId(room.id)}
                            >
                              <IconTrash className="size-4" />
                              {t.admin.rooms.actions.deactivate}
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-on-surface-variant">
                  {t.admin.rooms.noRooms}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {hasMore && (
        <div className="flex justify-center pb-8">
          <Button
            variant="outline"
            onClick={wrapLoadMore}
            disabled={status.isPending}
          >
            {status.isPending ? t.admin.rooms.loadingMore : t.admin.rooms.loadMore}
          </Button>
        </div>
      )}

      <RoomForm
        open={roomFormOpen}
        onOpenChange={(open) => !open && wrapCloseForm()}
        mode={roomFormMode}
      />

      <AlertDialog
        open={!!deactivateRoomId}
        onOpenChange={(open) => !open && setDeactivateRoomId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.admin.rooms.alerts.deactivateTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.admin.rooms.alerts.deactivateDesc}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteStatus.isPending}>{t.admin.rooms.alerts.deactivateCancel}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleteStatus.isPending}
              onClick={wrapDeactivate}
            >
              {deleteStatus.isPending ? t.admin.rooms.alerts.deactivating : t.admin.rooms.alerts.deactivateConfirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!hardDeleteRoomId}
        onOpenChange={(open) => !open && setHardDeleteRoomId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.admin.rooms.alerts.deleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.admin.rooms.alerts.deleteDesc}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={hardDeleteStatus.isPending}>{t.admin.rooms.alerts.deleteCancel}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={hardDeleteStatus.isPending}
              onClick={wrapHardDelete}
            >
              {hardDeleteStatus.isPending ? t.admin.rooms.alerts.deleting : t.admin.rooms.alerts.deleteConfirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}, "RoomsTab");
