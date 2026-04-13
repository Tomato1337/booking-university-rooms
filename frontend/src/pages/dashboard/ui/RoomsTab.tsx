import { IconPencil, IconPlus, IconSearch, IconTrash } from "@tabler/icons-react";

import { reatomComponent, useWrap } from "@reatom/react";
import { useMemo, useState } from "react";

import {
  adminRoomsQuery,
  closeRoomFormAction,
  deleteRoomMutation,
  openCreateRoomFormAction,
  openEditRoomFormAction,
  RoomForm,
  roomFormModeAtom,
  roomFormOpenAtom,
} from "@/modules/admin";
import { getEquipmentIcon } from "@/modules/rooms";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";

function normalizeSearch(value: string): string {
  return value.trim().toLowerCase();
}

export const RoomsTab = reatomComponent(() => {
  const rooms = adminRoomsQuery.data() ?? [];
  const status = adminRoomsQuery.status();
  const deleteStatus = deleteRoomMutation.status();
  const roomFormOpen = roomFormOpenAtom();
  const roomFormMode = roomFormModeAtom();

  const [search, setSearch] = useState("");

  const normalizedSearch = normalizeSearch(search);

  const filteredRooms = useMemo(() => {
    if (!normalizedSearch) return rooms;

    return rooms.filter((room) => {
      const roomName = room.name.toLowerCase();
      const building = room.building.toLowerCase();
      return roomName.includes(normalizedSearch) || building.includes(normalizedSearch);
    });
  }, [normalizedSearch, rooms]);

  const wrapDeactivate = useWrap(async (roomId: string) => {
    await deleteRoomMutation(roomId);
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

  return (
    <section data-slot="dashboard-rooms-tab" className="flex flex-1 flex-col gap-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h3 className="text-[1.75rem] font-black uppercase tracking-tighter">Rooms</h3>

        <Button type="button" onClick={wrapOpenCreateForm}>
          <IconPlus className="size-4" />
          Create Room
        </Button>
      </div>

      <div className="flex items-center gap-3 bg-surface-container px-6 py-4">
        <IconSearch size={18} className="shrink-0 text-primary" />
        <Input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="SEARCH BY ROOM OR BUILDING..."
          className="border-none bg-transparent text-sm font-bold uppercase tracking-widest"
        />
      </div>

      <div className="bg-surface-container-low">
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
            ) : filteredRooms.length > 0 ? (
              filteredRooms.map((room) => {
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
                          disabled={deleteStatus.isPending}
                          onClick={() => wrapDeactivate(room.id)}
                        >
                          <IconTrash className="size-4" />
                          Deactivate
                        </Button>
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

      <RoomForm
        open={roomFormOpen}
        onOpenChange={(open) => !open && wrapCloseForm()}
        mode={roomFormMode}
      />
    </section>
  );
}, "RoomsTab");
