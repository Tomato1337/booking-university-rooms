import { IconPencil, IconPlus, IconTrash, IconTrashX, IconRefresh } from "@tabler/icons-react";
import { reatomComponent, useWrap } from "@reatom/react";
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
    toast.success("Room successfully deactivated.");
    setDeactivateRoomId(null);
  });

  const wrapHardDelete = useWrap(async () => {
    if (!hardDeleteRoomId) return;
    try {
      await hardDeleteRoomMutation(hardDeleteRoomId);
      toast.success("Room permanently deleted.");
      setHardDeleteRoomId(null);
    } catch (e: any) {
      toast.error(e.message || "Failed to delete room. It might have bookings.");
      setHardDeleteRoomId(null);
    }
  });

  const wrapReactivate = useWrap(async (roomId: string) => {
    await reactivateRoomMutation(roomId);
    toast.success("Room successfully reactivated.");
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
  }, []);

  return (
    <section data-slot="dashboard-rooms-tab" className="flex flex-1 flex-col">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
        <h3 className="text-[1.75rem] font-black uppercase tracking-tighter">Rooms</h3>

        <Button type="button" onClick={wrapOpenCreateForm}>
          <IconPlus className="size-4" />
          Create Room
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
          Active Rooms
        </Button>
        <Button
          variant="tab"
          className={cn({
            "text-primary font-black": activeTab === "inactive",
          })}
          onClick={() => wrapChangeTab("inactive")}
        >
          Inactive Rooms
        </Button>
      </div>

      <Search
        className="bg-surface-container-high mb-4"
        query={search}
        wrapSearch={wrapSearch}
        placeholder={"SEARCH BY ROOM OR BUILDING..."}
      />

      <div className="bg-surface-container-low mb-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Room</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Capacity</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Equipment</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {status.isFirstPending ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-on-surface-variant">
                  Loading rooms...
                </TableCell>
              </TableRow>
            ) : rooms.length > 0 ? (
              rooms.map((room) => {
                const roomEquipment = room.equipment ?? [];
                const isInactive = room.availability.label.toLowerCase().includes("inactive");

                return (
                  <TableRow key={room.id} data-slot="admin-room-row">
                    <TableCell className="font-bold uppercase text-primary">{room.name}</TableCell>
                    <TableCell className="uppercase">{room.roomType.replace("_", " ")}</TableCell>
                    <TableCell>{room.capacity}</TableCell>
                    <TableCell>
                      {room.building} / Floor {room.floor}
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
                          <span className="text-xs text-on-surface-variant">No equipment</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={isInactive ? "booked" : "available"}>
                        {isInactive ? "inactive" : "active"}
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
                              Restore
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="destructive"
                              onClick={() => setHardDeleteRoomId(room.id)}
                            >
                              <IconTrashX className="size-4" />
                              Delete
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
                              Edit
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="destructive"
                              onClick={() => setDeactivateRoomId(room.id)}
                            >
                              <IconTrash className="size-4" />
                              Deactivate
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
                  No rooms found
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
            {status.isPending ? "Loading..." : "Load More"}
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
            <AlertDialogTitle>Deactivate Room?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate this room? It will be moved to the inactive list.
              Existing bookings will not be cancelled.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteStatus.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleteStatus.isPending}
              onClick={wrapDeactivate}
            >
              {deleteStatus.isPending ? "Deactivating..." : "Deactivate"}
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
            <AlertDialogTitle>Permanently Delete Room?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently remove the room from the database.
              Rooms with existing bookings cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={hardDeleteStatus.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={hardDeleteStatus.isPending}
              onClick={wrapHardDelete}
            >
              {hardDeleteStatus.isPending ? "Deleting..." : "Delete Permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}, "RoomsTab");
