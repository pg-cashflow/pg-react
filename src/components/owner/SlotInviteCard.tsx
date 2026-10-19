import React, { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Copy,
  Check,
  Loader2,
  Users,
  DoorOpen,
  PlusCircle,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Share2,
} from "lucide-react";
import {
  createSlotInvite,
  getOwnerOccupancy,
  getSlotInvites,
  revokeSlotInvite,
} from "@/api/slotInvites";
import { QUERY_KEYS } from "@/lib/queryKeys";
import { formatPaise, formatVacantRoomsCount, rupeesToPaise } from "@/lib/utils";
import { useLocale } from "@/i18n";
import type { FloorOccupancy, RoomOccupancy, SlotInvite } from "@pg/types";

export const SlotInviteCard: React.FC<{ className?: string }> = ({ className }) => {
  const { t } = useLocale();
  const queryClient = useQueryClient();

  const [selectedFloorId, setSelectedFloorId] = useState<string>("");
  const [selectedRoom, setSelectedRoom] = useState<RoomOccupancy | null>(null);
  const [rentRupees, setRentRupees] = useState<string>("6500");
  const [depositRupees, setDepositRupees] = useState<string>("10000");
  const [dueDay, setDueDay] = useState<number>(5);
  const [allowOverCapacity, setAllowOverCapacity] = useState<boolean>(false);
  const [overCapacityReason, setOverCapacityReason] = useState<string>("");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successInvite, setSuccessInvite] = useState<SlotInvite | null>(null);
  const [showActiveInvites, setShowActiveInvites] = useState<boolean>(true);

  // Queries
  const occupancyQuery = useQuery({
    queryKey: QUERY_KEYS.ownerOccupancy,
    queryFn: getOwnerOccupancy,
  });

  const slotInvitesQuery = useQuery({
    queryKey: QUERY_KEYS.slotInvites("open"),
    queryFn: () => getSlotInvites("open"),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: () => {
      if (!selectedRoom || !selectedFloorId) {
        throw new Error("Select a floor and room to generate an invite.");
      }
      const rentPaise = rupeesToPaise(rentRupees);
      if (rentPaise <= 0) {
        throw new Error("Rent amount must be greater than zero.");
      }
      const depositPaise = rupeesToPaise(depositRupees);
      if (dueDay < 1 || dueDay > 28) {
        throw new Error("Due day must be between 1 and 28.");
      }
      if (allowOverCapacity && !overCapacityReason.trim()) {
        throw new Error("Provide a reason for over-capacity assignment.");
      }

      return createSlotInvite({
        floor_id: selectedFloorId,
        room_id: selectedRoom.id,
        rent_paise: rentPaise,
        deposit_paise: depositPaise,
        due_day: dueDay,
        allow_over_capacity: allowOverCapacity,
        reason: allowOverCapacity ? overCapacityReason.trim() : undefined,
      });
    },
    onSuccess: (res) => {
      setSuccessInvite(res.invite);
      setErrorMsg(null);
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.slotInvites() });
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ownerOccupancy });
    },
    onError: (err: unknown) => {
      setErrorMsg(err instanceof Error ? err.message : "Failed to create slot invite");
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => revokeSlotInvite(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.slotInvites() });
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ownerOccupancy });
    },
    onError: (err: unknown) => {
      setErrorMsg(err instanceof Error ? err.message : "Failed to revoke invite");
    },
  });

  const floors: FloorOccupancy[] = occupancyQuery.data?.floors ?? [];
  const activeFloor = floors.find((f) => f.floor_id === selectedFloorId) ?? floors[0];
  const activeRooms = activeFloor?.rooms ?? [];

  const roomMap = useMemo(() => {
    const map = new Map<string, RoomOccupancy>();
    for (const fl of occupancyQuery.data?.floors ?? []) {
      for (const rm of fl.rooms) {
        map.set(rm.id, rm);
      }
    }
    return map;
  }, [occupancyQuery.data?.floors]);

  const vacantRoomsCount = useMemo(() => {
    return (occupancyQuery.data?.floors ?? [])
      .flatMap((f) => f.rooms)
      .filter((r) => r.vacant_beds > 0).length;
  }, [occupancyQuery.data?.floors]);

  const handleCopy = (code: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const joinUrl = `${origin}/join?code=${encodeURIComponent(code)}`;
    void navigator.clipboard.writeText(joinUrl);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const getWhatsAppShareUrl = (code: string, roomNum: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const joinUrl = `${origin}/join?code=${encodeURIComponent(code)}`;
    const text = `Join our PG! Room ${roomNum} invite code: ${code}. Complete your onboarding here: ${joinUrl}`;
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  };

  return (
    <section className={`bg-surface border border-hairline rounded-2xl p-5 space-y-5 text-ink ${className ?? ""}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-hairline pb-4">
        <div>
          <h3 className="font-semibold text-base text-ink flex items-center gap-2">
            <DoorOpen className="w-5 h-5 text-accent" />
            Room-Bound Slot Invites
          </h3>
          <p className="text-xs text-ink-muted mt-0.5">
            Create tenant invite links bound to specific property rooms with verified bed capacity.
          </p>
        </div>

        {occupancyQuery.data && (
          <div className="flex items-center gap-2 text-xs bg-bg border border-hairline rounded-xl px-3 py-1.5 self-start sm:self-auto">
            <Users className="w-3.5 h-3.5 text-accent" />
            <span>
              <strong>{occupancyQuery.data.occupied_beds}</strong> / {occupancyQuery.data.capacity_beds} beds occupied
            </span>
            <span className="text-hairline">|</span>
            <span className="text-success font-medium">
              {formatVacantRoomsCount(vacantRoomsCount, t)}
            </span>
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="p-3 rounded-xl bg-danger/10 border border-danger/30 text-xs text-danger flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Step 1: Select Floor & Room */}
      <div className="space-y-3">
        <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider block">
          1. Select Floor & Room
        </label>

        {occupancyQuery.isLoading ? (
          <div className="flex items-center gap-2 text-xs text-ink-muted py-4">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading floor and room occupancy...
          </div>
        ) : floors.length === 0 ? (
          <p className="text-xs text-ink-muted py-2">
            No rooms registered for this property yet. Add rooms in Property Settings first.
          </p>
        ) : (
          <div className="space-y-3">
            {/* Floor tabs */}
            <div className="flex flex-wrap gap-1.5">
              {floors.map((fl) => {
                const isSelected = (selectedFloorId || floors[0]?.floor_id) === fl.floor_id;
                return (
                  <button
                    key={fl.floor_id}
                    type="button"
                    onClick={() => {
                      setSelectedFloorId(fl.floor_id);
                      setSelectedRoom(null);
                    }}
                    className={`px-3 py-1.5 text-xs font-medium rounded-xl border transition ${
                      isSelected
                        ? "bg-accent text-white border-accent shadow-sm"
                        : "bg-bg text-ink border-hairline hover:bg-hairline/20"
                    }`}
                  >
                    {fl.floor_name || `Floor ${fl.floor_number}`} ({fl.vacant_beds} vacant)
                  </button>
                );
              })}
            </div>

            {/* Room cards grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
              {activeRooms.map((rm) => {
                const isRoomSelected = selectedRoom?.id === rm.id;
                const isFull = rm.vacant_beds <= 0;
                return (
                  <div
                    key={rm.id}
                    onClick={() => {
                      setSelectedRoom(rm);
                      setAllowOverCapacity(false);
                      setOverCapacityReason("");
                    }}
                    className={`p-3 rounded-xl border cursor-pointer transition text-left relative ${
                      isRoomSelected
                        ? "border-accent bg-accent-tint/30 ring-2 ring-accent/20"
                        : "border-hairline bg-bg hover:border-hairline/80 hover:bg-surface"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <span className="font-semibold text-sm text-ink">
                        Room {rm.room_number}
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          isFull
                            ? "bg-danger/10 text-danger border border-danger/20"
                            : "bg-success/10 text-success border border-success/20"
                        }`}
                      >
                        {isFull ? "Full" : `${rm.vacant_beds} bed free`}
                      </span>
                    </div>

                    <div className="text-xs text-ink-muted mt-1.5 flex items-center justify-between">
                      <span>Capacity: {rm.capacity} beds</span>
                      <span>Occupied: {rm.occupied_beds}</span>
                    </div>

                    {rm.tenant_names && rm.tenant_names.length > 0 && (
                      <div className="text-[11px] text-ink-muted mt-2 border-t border-hairline/50 pt-1.5 truncate">
                        <span className="font-medium">Tenants:</span> {rm.tenant_names.join(", ")}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Step 2: Configure Rent & Generate */}
      {selectedRoom && (
        <div className="p-4 rounded-xl bg-bg border border-hairline space-y-4">
          <div className="flex items-center justify-between border-b border-hairline pb-2.5">
            <span className="text-xs font-semibold text-ink">
              Invite Settings for Room {selectedRoom.room_number}
            </span>
            <span className="text-[11px] text-ink-muted">
              Capacity: {selectedRoom.capacity} beds ({selectedRoom.occupied_beds} occupied)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-ink-muted block mb-1">
                Monthly Rent (₹)
              </label>
              <input
                type="number"
                min="0"
                value={rentRupees}
                onChange={(e) => setRentRupees(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-hairline bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-ink-muted block mb-1">
                Security Deposit (₹)
              </label>
              <input
                type="number"
                min="0"
                value={depositRupees}
                onChange={(e) => setDepositRupees(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-hairline bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-ink-muted block mb-1">
                Due Day of Month (1–28)
              </label>
              <input
                type="number"
                min="1"
                max="28"
                value={dueDay}
                onChange={(e) => setDueDay(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm rounded-xl border border-hairline bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </div>
          </div>

          {selectedRoom.vacant_beds <= 0 && (
            <div className="space-y-2 p-3 rounded-xl bg-danger/10 border border-danger/20 text-xs text-danger">
              <div className="flex items-center gap-2 font-medium">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                This room is currently at maximum capacity ({selectedRoom.capacity} beds).
              </div>
              <label className="flex items-center gap-2 cursor-pointer mt-1">
                <input
                  type="checkbox"
                  checked={allowOverCapacity}
                  onChange={(e) => setAllowOverCapacity(e.target.checked)}
                  className="rounded border-hairline text-accent focus:ring-accent"
                />
                <span className="font-semibold text-ink">
                  Allow over-capacity assignment for this invite
                </span>
              </label>
              {allowOverCapacity && (
                <input
                  type="text"
                  placeholder="Reason for extra bed / over-capacity..."
                  value={overCapacityReason}
                  onChange={(e) => setOverCapacityReason(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-hairline bg-surface text-ink focus:outline-none"
                />
              )}
            </div>
          )}

          {(() => {
            const isFull = selectedRoom.vacant_beds <= 0;
            const requiresReason = isFull && allowOverCapacity;
            const isReasonMissing = requiresReason && !overCapacityReason.trim();
            const isDisabled = createMutation.isPending || (isFull && !allowOverCapacity) || isReasonMissing;

            let buttonLabel = `Generate Room ${selectedRoom.room_number} Invite Link`;
            if (isFull && !allowOverCapacity) {
              buttonLabel = `Room ${selectedRoom.room_number} is Full`;
            } else if (isReasonMissing) {
              buttonLabel = `Reason Required for Over-Capacity`;
            }

            return (
              <button
                type="button"
                disabled={isDisabled}
                onClick={() => createMutation.mutate()}
                className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-accent text-white text-xs font-semibold hover:bg-accent/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <PlusCircle className="w-4 h-4" />
                )}
                {buttonLabel}
              </button>
            );
          })()}
        </div>
      )}

      {/* Generated Invite Card */}
      {successInvite && (
        <div className="p-4 rounded-xl bg-accent-tint/40 border border-accent/40 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-accent uppercase tracking-wider flex items-center gap-1.5">
              <Check className="w-4 h-4" /> New Invite Link Created
            </span>
            <span className="text-[11px] text-ink-muted font-mono">
              Valid until: {new Date(successInvite.expires_at).toLocaleDateString()}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="px-4 py-2.5 rounded-xl bg-surface border border-hairline font-mono text-base font-bold tracking-widest text-ink flex-1 text-center sm:text-left">
              {successInvite.code}
            </div>

            <button
              onClick={() => handleCopy(successInvite.code)}
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-accent text-white text-xs font-semibold hover:bg-accent/90 transition"
            >
              {copiedCode === successInvite.code ? (
                <Check className="w-4 h-4" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              {copiedCode === successInvite.code ? "Link Copied!" : "Copy Join Link"}
            </button>

            <a
              href={getWhatsAppShareUrl(successInvite.code, selectedRoom?.room_number ?? "")}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-surface border border-hairline text-ink text-xs font-semibold hover:bg-hairline/20 transition"
            >
              <Share2 className="w-4 h-4" />
              WhatsApp
            </a>
          </div>
        </div>
      )}

      {/* Active Slot Invites Section */}
      <div className="border-t border-hairline pt-4 space-y-3">
        <button
          type="button"
          onClick={() => setShowActiveInvites(!showActiveInvites)}
          className="w-full flex items-center justify-between text-xs font-semibold text-ink-muted uppercase tracking-wider hover:text-ink transition"
        >
          <span>Active Open Invites ({slotInvitesQuery.data?.length ?? 0})</span>
          {showActiveInvites ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showActiveInvites && (
          <div className="space-y-2">
            {slotInvitesQuery.isLoading ? (
              <div className="text-xs text-ink-muted py-2 flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading open invites...
              </div>
            ) : (slotInvitesQuery.data?.length ?? 0) === 0 ? (
              <p className="text-xs text-ink-muted py-1 italic">
                No active open slot invites. Select a room above to create one.
              </p>
            ) : (
              <div className="divide-y divide-hairline border border-hairline rounded-xl overflow-hidden bg-bg">
                {slotInvitesQuery.data?.map((inv) => {
                  const room = roomMap.get(inv.room_id);
                  return (
                    <div
                      key={inv.id}
                      className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold tracking-wider text-ink bg-surface px-2 py-0.5 rounded border border-hairline">
                            {inv.code}
                          </span>
                          <span className="text-ink-muted">·</span>
                          <span className="font-medium text-ink">
                            {formatPaise(inv.rent_paise)}/mo
                          </span>
                          <span className="text-ink-muted">·</span>
                          <span className="text-[11px] text-ink-muted">
                            Due: {inv.due_day}th
                          </span>
                        </div>
                        {room && (
                          <div className="flex items-center gap-1.5 text-[11px] text-ink font-medium">
                            <span>Room {room.room_number}</span>
                            <span className="text-ink-muted">·</span>
                            <span className="text-ink-muted">
                              {room.occupied_beds}/{room.capacity} beds
                            </span>
                            {room.tenant_names && room.tenant_names.length > 0 && (
                              <>
                                <span className="text-ink-muted">·</span>
                                <span
                                  className="text-ink-muted truncate max-w-[220px]"
                                  title={room.tenant_names.join(", ")}
                                >
                                  ({room.tenant_names.join(", ")})
                                </span>
                              </>
                            )}
                          </div>
                        )}
                        <div className="text-[11px] text-ink-muted">
                          Expires: {new Date(inv.expires_at).toLocaleDateString()} {new Date(inv.expires_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          {inv.allow_over_capacity && " · (Over-capacity allowed)"}
                        </div>
                      </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={() => handleCopy(inv.code)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface border border-hairline text-ink hover:bg-hairline/20 transition text-[11px] font-medium"
                      >
                        {copiedCode === inv.code ? (
                          <Check className="w-3.5 h-3.5 text-success" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        {copiedCode === inv.code ? "Copied" : "Copy"}
                      </button>

                      <button
                        type="button"
                        disabled={revokeMutation.isPending}
                        onClick={() => {
                          if (window.confirm(`Revoke invite code ${inv.code}?`)) {
                            revokeMutation.mutate(inv.id);
                          }
                        }}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-danger/10 text-danger hover:bg-danger/20 transition text-[11px] font-medium disabled:opacity-50"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Revoke
                      </button>
                    </div>
                  </div>
                );
              })}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};
