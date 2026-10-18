import React, { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Layers,
  DoorOpen,
  Users,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Plus,
  Minus,
  Settings2,
  X,
} from "lucide-react";
import { bulkGenerateFloorsRooms, type BulkGenerateFloorsRoomsInput } from "@/api/gamification";
import { QUERY_KEYS } from "@/lib/queryKeys";

interface QuickLayoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyId: string;
  propertyName?: string;
  startFloorNumber?: number;
  onSuccess?: () => void;
}

const PRESETS = [
  { label: "3 Floors · 12 Rooms", floors: 3, rooms: 12 },
  { label: "2 Floors · 8 Rooms", floors: 2, rooms: 8 },
  { label: "4 Floors · 16 Rooms", floors: 4, rooms: 16 },
  { label: "5 Floors · 20 Rooms", floors: 5, rooms: 20 },
];

export const QuickLayoutModal: React.FC<QuickLayoutModalProps> = ({
  isOpen,
  onClose,
  propertyId,
  propertyName,
  startFloorNumber = 1,
  onSuccess,
}) => {
  const queryClient = useQueryClient();

  const [floorsCount, setFloorsCount] = useState<number>(3);
  const [roomsCount, setRoomsCount] = useState<number>(12);
  const [capacityPerRoom, setCapacityPerRoom] = useState<number>(2);
  const [startFloor, setStartFloor] = useState<number>(startFloorNumber);
  const [customEditing, setCustomEditing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Compute layout preview
  const generatedLayout = useMemo(() => {
    if (floorsCount <= 0 || roomsCount <= 0) return [];
    const safeFloors = Math.min(Math.max(1, floorsCount), 20);
    const safeRooms = Math.min(Math.max(1, roomsCount), 200);
    const basePerFloor = Math.floor(safeRooms / safeFloors);
    const remainder = safeRooms % safeFloors;

    const floors = [];
    for (let i = 0; i < safeFloors; i++) {
      const flNum = startFloor + i;
      const flName = flNum === 0 ? "Ground Floor" : `Floor ${flNum}`;
      const roomsOnThisFloor = basePerFloor + (i < remainder ? 1 : 0);
      const rooms: string[] = [];

      for (let r = 1; r <= roomsOnThisFloor; r++) {
        if (flNum === 0) {
          rooms.push(`G${String(r).padStart(2, "0")}`);
        } else {
          rooms.push(`${flNum}${String(r).padStart(2, "0")}`);
        }
      }

      floors.push({
        floor_number: flNum,
        name: flName,
        rooms,
        capacity: capacityPerRoom,
      });
    }
    return floors;
  }, [floorsCount, roomsCount, capacityPerRoom, startFloor]);

  const [customFloors, setCustomFloors] = useState(generatedLayout);

  React.useEffect(() => {
    if (isOpen) {
      setStartFloor(startFloorNumber);
      setErrorMsg(null);
      setCustomEditing(false);
    }
  }, [isOpen, startFloorNumber]);

  React.useEffect(() => {
    if (!customEditing) {
      setCustomFloors(generatedLayout);
    }
  }, [generatedLayout, customEditing]);

  const activeFloors = customEditing ? customFloors : generatedLayout;
  const totalBedCapacity = activeFloors.reduce(
    (acc, fl) => acc + fl.rooms.length * (fl.capacity || capacityPerRoom),
    0
  );

  const generateMutation = useMutation({
    mutationFn: async () => {
      const payload: BulkGenerateFloorsRoomsInput = {
        property_id: propertyId,
      };

      if (customEditing) {
        payload.custom_floors = activeFloors;
        payload.room_capacity = capacityPerRoom;
      } else {
        payload.floors_count = floorsCount;
        payload.total_rooms_count = roomsCount;
        payload.room_capacity = capacityPerRoom;
        payload.start_floor = startFloor;
      }

      return bulkGenerateFloorsRooms(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ownerFloors(propertyId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ownerRooms(propertyId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ownerOccupancy });
      if (onSuccess) onSuccess();
      onClose();
    },
    onError: (err: Error) => {
      setErrorMsg(err.message || "Failed to generate layout.");
    },
  });

  const handleRoomChange = (floorIdx: number, roomIdx: number, val: string) => {
    setCustomEditing(true);
    setCustomFloors((prev) => {
      const next = [...prev];
      const fl = { ...next[floorIdx] };
      const rooms = [...fl.rooms];
      rooms[roomIdx] = val;
      fl.rooms = rooms;
      next[floorIdx] = fl;
      return next;
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-surface border border-hairline rounded-2xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-hairline flex items-center justify-between bg-surface/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-accent-tint text-accent">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-ink">Quick Setup: Floors & Rooms</h2>
              <p className="text-xs text-ink-muted">
                {propertyName ? `Generate layout for ${propertyName}` : "Generate layout conveniently"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-surface-elevated transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-danger-tint border border-danger/20 text-danger text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Quick Presets */}
          <div>
            <label className="block text-[11px] font-medium text-ink-muted mb-2">
              Quick Presets:
            </label>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => {
                const isActive = floorsCount === p.floors && roomsCount === p.rooms;
                return (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => {
                      setFloorsCount(p.floors);
                      setRoomsCount(p.rooms);
                      setCustomEditing(false);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                      isActive
                        ? "bg-accent text-white shadow-sm"
                        : "bg-surface border border-hairline text-ink hover:border-accent/40"
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Steppers */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-surface border border-hairline rounded-xl p-3">
              <span className="block text-[11px] text-ink-muted mb-1 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-accent" /> Floors
              </span>
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setFloorsCount((prev) => Math.max(1, prev - 1));
                    setCustomEditing(false);
                  }}
                  className="p-1 rounded-lg hover:bg-surface-elevated text-ink"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="font-bold text-sm text-ink">{floorsCount}</span>
                <button
                  type="button"
                  onClick={() => {
                    setFloorsCount((prev) => Math.min(20, prev + 1));
                    setCustomEditing(false);
                  }}
                  className="p-1 rounded-lg hover:bg-surface-elevated text-ink"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="bg-surface border border-hairline rounded-xl p-3">
              <span className="block text-[11px] text-ink-muted mb-1 flex items-center gap-1">
                <DoorOpen className="w-3.5 h-3.5 text-accent" /> Rooms
              </span>
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setRoomsCount((prev) => Math.max(floorsCount, prev - 1));
                    setCustomEditing(false);
                  }}
                  className="p-1 rounded-lg hover:bg-surface-elevated text-ink"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="font-bold text-sm text-ink">{roomsCount}</span>
                <button
                  type="button"
                  onClick={() => {
                    setRoomsCount((prev) => Math.min(200, prev + 1));
                    setCustomEditing(false);
                  }}
                  className="p-1 rounded-lg hover:bg-surface-elevated text-ink"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="bg-surface border border-hairline rounded-xl p-3">
              <span className="block text-[11px] text-ink-muted mb-1 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-accent" /> Beds / Room
              </span>
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setCapacityPerRoom((prev) => Math.max(1, prev - 1))}
                  className="p-1 rounded-lg hover:bg-surface-elevated text-ink"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="font-bold text-sm text-ink">{capacityPerRoom}</span>
                <button
                  type="button"
                  onClick={() => setCapacityPerRoom((prev) => Math.min(6, prev + 1))}
                  className="p-1 rounded-lg hover:bg-surface-elevated text-ink"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="bg-surface border border-hairline rounded-xl p-3">
              <span className="block text-[11px] text-ink-muted mb-1">Start Floor</span>
              <select
                value={startFloor}
                onChange={(e) => {
                  setStartFloor(parseInt(e.target.value, 10));
                  setCustomEditing(false);
                }}
                className="w-full bg-transparent text-xs font-bold text-ink focus:outline-none"
              >
                {startFloorNumber > 1 && (
                  <option value={startFloorNumber} className="bg-surface text-ink">
                    Floor {startFloorNumber} ({startFloorNumber}01..)
                  </option>
                )}
                <option value={1} className="bg-surface text-ink">
                  1st Floor (101..)
                </option>
                <option value={0} className="bg-surface text-ink">
                  Ground (G01..)
                </option>
              </select>
            </div>
          </div>

          {/* Summary Pill */}
          <div className="flex items-center justify-between text-xs py-2 px-3 rounded-xl bg-accent-tint/40 border border-accent/20 text-ink">
            <div className="flex items-center gap-3">
              <span className="font-bold text-accent">{floorsCount} Floors</span>
              <span>·</span>
              <span className="font-bold text-accent">{roomsCount} Rooms</span>
              <span>·</span>
              <span className="text-ink-muted">{totalBedCapacity} Total Beds</span>
            </div>
            <button
              type="button"
              onClick={() => setCustomEditing(!customEditing)}
              className="flex items-center gap-1 text-[11px] text-accent hover:underline"
            >
              <Settings2 className="w-3 h-3" />
              <span>{customEditing ? "Revert to auto" : "Customize rooms"}</span>
            </button>
          </div>

          {/* Live Preview */}
          <div className="space-y-2.5 max-h-52 overflow-y-auto pr-1">
            {activeFloors.map((fl, fIdx) => (
              <div
                key={fl.floor_number}
                className="p-2.5 bg-surface rounded-xl border border-hairline space-y-1.5"
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-ink">{fl.name}</span>
                  <span className="text-ink-muted">
                    {fl.rooms.length} rooms · {fl.rooms.length * (fl.capacity || capacityPerRoom)} beds
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {fl.rooms.map((rm, rIdx) =>
                    customEditing ? (
                      <input
                        key={rIdx}
                        type="text"
                        value={rm}
                        onChange={(e) => handleRoomChange(fIdx, rIdx, e.target.value)}
                        className="w-14 px-1.5 py-0.5 text-center text-[11px] font-medium bg-surface-elevated border border-hairline rounded-md text-ink"
                      />
                    ) : (
                      <span
                        key={rIdx}
                        className="px-2 py-0.5 text-[11px] font-medium bg-surface-elevated border border-hairline rounded-md text-ink"
                      >
                        {rm}
                      </span>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-hairline flex items-center justify-end gap-3 bg-surface/50">
          <button
            type="button"
            onClick={onClose}
            disabled={generateMutation.isPending}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-ink-muted hover:text-ink hover:bg-surface-elevated transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-white font-bold text-xs hover:bg-accent/90 disabled:opacity-50 transition shadow-sm"
          >
            {generateMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Generating Layout...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  Generate Layout ({floorsCount} Floors, {roomsCount} Rooms)
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
