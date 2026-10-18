import React, { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  X,
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
} from "lucide-react";
import { createProperty, switchProperty, type CreatePropertyInput, type CustomFloorInput } from "@/api/properties";
import { QUERY_KEYS } from "@/lib/queryKeys";
import type { Property } from "@pg/types";

interface AddPropertyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPropertyCreated?: (property: Property) => void;
}

const PRESETS = [
  { label: "3 Floors · 12 Rooms", floors: 3, rooms: 12 },
  { label: "2 Floors · 8 Rooms", floors: 2, rooms: 8 },
  { label: "4 Floors · 16 Rooms", floors: 4, rooms: 16 },
  { label: "5 Floors · 20 Rooms", floors: 5, rooms: 20 },
];

export const AddPropertyModal: React.FC<AddPropertyModalProps> = ({
  isOpen,
  onClose,
  onPropertyCreated,
}) => {
  const queryClient = useQueryClient();

  // Basic Details
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");

  // Quick Layout Generator state
  const [enableQuickLayout, setEnableQuickLayout] = useState(true);
  const [floorsCount, setFloorsCount] = useState<number>(3);
  const [roomsCount, setRoomsCount] = useState<number>(12);
  const [capacityPerRoom, setCapacityPerRoom] = useState<number>(2);
  const [startFloor, setStartFloor] = useState<number>(1); // 1 = 1st Floor, 0 = Ground Floor
  const [customEditing, setCustomEditing] = useState(false);

  // Error & Status
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Compute generated layout for live preview
  const generatedLayout = useMemo<CustomFloorInput[]>(() => {
    if (!enableQuickLayout || floorsCount <= 0 || roomsCount <= 0) {
      return [];
    }
    const safeFloors = Math.min(Math.max(1, floorsCount), 20);
    const safeRooms = Math.min(Math.max(1, roomsCount), 200);
    const basePerFloor = Math.floor(safeRooms / safeFloors);
    const remainder = safeRooms % safeFloors;

    const floors: CustomFloorInput[] = [];
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
  }, [enableQuickLayout, floorsCount, roomsCount, capacityPerRoom, startFloor]);

  // Optional customized floors if user manually edits room numbers
  const [customFloors, setCustomFloors] = useState<CustomFloorInput[]>([]);

  // Keep customFloors in sync with generated unless customEditing is on
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

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!name.trim()) {
        throw new Error("Property name is required.");
      }

      const payload: CreatePropertyInput = {
        name: name.trim(),
        address: address.trim() || undefined,
      };

      if (enableQuickLayout && activeFloors.length > 0) {
        if (customEditing) {
          payload.custom_floors = activeFloors;
          payload.room_capacity = capacityPerRoom;
        } else {
          payload.floors_count = floorsCount;
          payload.total_rooms_count = roomsCount;
          payload.room_capacity = capacityPerRoom;
          payload.start_floor = startFloor;
        }
      }

      const res = await createProperty(payload);
      // Auto-switch to newly created property
      if (res?.property?.id) {
        try {
          await switchProperty(res.property.id);
        } catch {
          // non-fatal if switch endpoint fails
        }
      }
      return res;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.properties });
      if (data?.property?.id) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ownerFloors(data.property.id) });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ownerRooms(data.property.id) });
      }
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ownerOccupancy });
      if (onPropertyCreated && data.property) {
        onPropertyCreated(data.property);
      }
      handleReset();
      onClose();
    },
    onError: (err: Error) => {
      setErrorMsg(err.message || "Failed to create property.");
    },
  });

  const handleReset = () => {
    setName("");
    setAddress("");
    setFloorsCount(3);
    setRoomsCount(12);
    setCapacityPerRoom(2);
    setStartFloor(1);
    setCustomEditing(false);
    setErrorMsg(null);
  };

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
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-ink">Add New Property</h2>
              <p className="text-xs text-ink-muted">Quick & convenient setup with floors and rooms</p>
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
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-danger-tint border border-danger/20 text-danger text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. Property Info */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
              1. Property Information
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-ink mb-1">
                  Property Name <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Sunrise PG, Green View Residency"
                  className="w-full px-3.5 py-2.5 bg-surface border border-hairline rounded-xl text-xs text-ink placeholder:text-ink-muted focus:outline-none focus:border-accent"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-ink mb-1">
                  Address / Landmark (Optional)
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. 12th Cross, Electronic City Phase 1, Bangalore"
                  className="w-full px-3.5 py-2.5 bg-surface border border-hairline rounded-xl text-xs text-ink placeholder:text-ink-muted focus:outline-none focus:border-accent"
                />
              </div>
            </div>
          </div>

          {/* 2. Quick Floor & Room Generator */}
          <div className="space-y-4 pt-2 border-t border-hairline">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-accent" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-ink">
                  2. Quick Floor & Room Setup
                </h3>
              </div>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-ink">
                <input
                  type="checkbox"
                  checked={enableQuickLayout}
                  onChange={(e) => setEnableQuickLayout(e.target.checked)}
                  className="rounded border-hairline text-accent focus:ring-accent"
                />
                <span>Auto-generate layout</span>
              </label>
            </div>

            {enableQuickLayout && (
              <div className="space-y-4 bg-accent-tint/30 border border-accent/20 rounded-2xl p-4">
                {/* Presets */}
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

                {/* Steppers: Floors, Rooms, Capacity, Start Floor */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {/* Floors Count */}
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

                  {/* Rooms Count */}
                  <div className="bg-surface border border-hairline rounded-xl p-3">
                    <span className="block text-[11px] text-ink-muted mb-1 flex items-center gap-1">
                      <DoorOpen className="w-3.5 h-3.5 text-accent" /> Total Rooms
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

                  {/* Beds per Room */}
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

                  {/* Start Floor */}
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
                <div className="flex items-center justify-between text-xs py-2 px-3 rounded-xl bg-surface border border-hairline text-ink">
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

                {/* Live Floor & Room Preview */}
                <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
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
                        {fl.rooms.map((rm, rIdx) => (
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
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-hairline flex items-center justify-end gap-3 bg-surface/50">
          <button
            type="button"
            onClick={onClose}
            disabled={createMutation.isPending}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-ink-muted hover:text-ink hover:bg-surface-elevated transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending || !name.trim()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-white font-bold text-xs hover:bg-accent/90 disabled:opacity-50 transition shadow-sm"
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Creating Property...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  Create Property {enableQuickLayout ? `(${floorsCount}F, ${roomsCount}R)` : ""}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
