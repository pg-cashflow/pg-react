import React, { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/auth/context";
import {
  listOwnerFloors,
  listOwnerRooms,
  recordManagerMeterReading,
  submitManagerVendorInspection,
} from "@/api/gamification";
import { QUERY_KEYS } from "@/lib/queryKeys";
import { useManagerAction } from "@/components/layout/ManagerShell";
import { formatPaise, rupeesToPaise } from "@/lib/utils";

export const MetersView: React.FC = () => {
  const { user } = useAuth();
  const setAction = useManagerAction();
  const propertyId = user?.property_id || "";
  const [kind, setKind] = useState<"electricity" | "water">("electricity");
  const [roomId, setRoomId] = useState("");
  const [floorId, setFloorId] = useState("");
  const [reading, setReading] = useState("");
  const [replaced, setReplaced] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [vendorName, setVendorName] = useState("");
  const [vendorScore, setVendorScore] = useState("80");
  const [vendorNotes, setVendorNotes] = useState("");
  const [vendorPenalty, setVendorPenalty] = useState("");

  const roomsQuery = useQuery({
    queryKey: QUERY_KEYS.ownerRooms(propertyId),
    queryFn: () => listOwnerRooms(propertyId),
    enabled: !!propertyId,
  });
  const floorsQuery = useQuery({
    queryKey: QUERY_KEYS.ownerFloors(propertyId),
    queryFn: () => listOwnerFloors(propertyId),
    enabled: !!propertyId,
  });

  const room = (roomsQuery.data ?? []).find((r) => r.id === roomId);
  const quota = room?.included_units;

  const meterMut = useMutation({
    mutationFn: async () => {
      const val = parseFloat(reading);
      if (Number.isNaN(val)) throw new Error("Enter a numeric reading");
      return recordManagerMeterReading({
        property_id: propertyId,
        kind,
        room_id: kind === "electricity" ? roomId || null : null,
        floor_id: kind === "water" ? floorId || null : null,
        reading_value: val,
        meter_replaced: replaced,
      });
    },
    onSuccess: (data) => {
      const res = data.result;
      setMsg(
        `Delta ${res.delta_units} units. Billable ${formatPaise(res.billable_paise)} (${res.excess_units} over quota).`
      );
      setReading("");
    },
    onError: (e: Error) => setMsg(e.message),
  });

  const vendorMut = useMutation({
    mutationFn: () =>
      submitManagerVendorInspection({
        property_id: propertyId,
        vendor_name: vendorName.trim(),
        score_percent: Number(vendorScore),
        notes: vendorNotes,
        penalty_paise: vendorPenalty.trim() ? rupeesToPaise(vendorPenalty) : 0,
      }),
    onSuccess: () => setMsg("Vendor inspection recorded."),
    onError: (e: Error) => setMsg(e.message),
  });

  useEffect(() => {
    setAction({
      label: "Record reading",
      onClick: () => meterMut.mutate(),
      busy: meterMut.isPending,
      disabled: !reading.trim(),
    });
    return () => setAction(null);
  }, [setAction, meterMut.isPending, reading]);

  return (
    <div className="space-y-4">
      <h1 className="t-h1">Meter reading</h1>
      <div className="grid grid-cols-2 gap-2">
        {(["electricity", "water"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            className={`h-11 rounded-[10px] border capitalize ${
              kind === k ? "bg-accent-tint border-accent" : "border-hairline bg-surface"
            }`}
          >
            {k}
          </button>
        ))}
      </div>
      {kind === "electricity" ? (
        <select
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          className="w-full h-12 rounded-[10px] border border-hairline bg-surface px-3"
        >
          <option value="">Room</option>
          {(roomsQuery.data ?? []).map((r) => (
            <option key={r.id} value={r.id}>
              {r.room_number}
            </option>
          ))}
        </select>
      ) : (
        <select
          value={floorId}
          onChange={(e) => setFloorId(e.target.value)}
          className="w-full h-12 rounded-[10px] border border-hairline bg-surface px-3"
        >
          <option value="">Floor</option>
          {(floorsQuery.data ?? []).map((f) => (
            <option key={f.id} value={f.id}>
              {f.name || `Floor ${f.floor_number}`}
            </option>
          ))}
        </select>
      )}
      {quota != null && (
        <p className="t-caption text-ink-muted">Included quota for this room: {quota} units.</p>
      )}
      <input
        value={reading}
        onChange={(e) => setReading(e.target.value)}
        inputMode="decimal"
        placeholder="Reading"
        className="w-full h-12 rounded-[10px] border border-hairline bg-surface px-3 t-code text-base"
      />
      <label className="flex items-center gap-2 t-body-sm">
        <input type="checkbox" checked={replaced} onChange={(e) => setReplaced(e.target.checked)} />
        Meter was replaced
      </label>

      <section className="rounded-[14px] border border-hairline bg-surface p-4 space-y-3">
        <h2 className="t-h3">Vendor inspection</h2>
        <input
          value={vendorName}
          onChange={(e) => setVendorName(e.target.value)}
          placeholder="Vendor name"
          className="w-full h-11 rounded-[10px] border border-hairline px-3"
        />
        <input
          value={vendorScore}
          onChange={(e) => setVendorScore(e.target.value)}
          placeholder="Score %"
          className="w-full h-11 rounded-[10px] border border-hairline px-3"
        />
        <input
          value={vendorPenalty}
          onChange={(e) => setVendorPenalty(e.target.value)}
          placeholder="Penalty rupees"
          className="w-full h-11 rounded-[10px] border border-hairline px-3"
        />
        <textarea
          value={vendorNotes}
          onChange={(e) => setVendorNotes(e.target.value)}
          placeholder="Notes"
          className="w-full min-h-[72px] rounded-[10px] border border-hairline px-3 py-2"
        />
        <button
          type="button"
          disabled={!vendorName.trim() || vendorMut.isPending}
          onClick={() => vendorMut.mutate()}
          className="h-11 px-4 rounded-[10px] border border-hairline font-semibold"
        >
          Save vendor inspection
        </button>
      </section>
      {msg && <p className="t-body-sm text-ink-muted">{msg}</p>}
    </div>
  );
};
