import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/auth/context";
import { listOwnerFloors, listOwnerRooms, submitManagerInspection } from "@/api/gamification";
import { QUERY_KEYS } from "@/lib/queryKeys";
import { useManagerAction } from "@/components/layout/ManagerShell";
import { Check, Camera } from "lucide-react";

const ITEMS = [
  { key: "bed_clear", desc: "Bed / desk clear and tidy" },
  { key: "no_food_waste", desc: "No uncleaned food waste / plates" },
  { key: "dustbin_segregated", desc: "Dustbin used and segregated" },
  { key: "shoes_on_rack", desc: "Footwear placed on rack" },
  { key: "no_appliances", desc: "No prohibited high-draw appliances" },
];

type DraftItem = {
  key: string;
  desc: string;
  passed: boolean | null;
  notes: string;
  photo: File | null;
};

function fileToB64(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res((r.result as string).split(",")[1] || "");
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

export const InspectionNewView: React.FC = () => {
  const { user } = useAuth();
  const setAction = useManagerAction();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const propertyId = user?.property_id || "";

  const [insType, setInsType] = useState<"room" | "floor" | "common_bathroom">("room");
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [selectedFloorId, setSelectedFloorId] = useState("");
  const [step, setStep] = useState(0);
  const [roundNotes, setRoundNotes] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [items, setItems] = useState<DraftItem[]>(() =>
    ITEMS.map((i) => ({ ...i, passed: null, notes: "", photo: null }))
  );

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

  const rooms = roomsQuery.data ?? [];
  const floors = floorsQuery.data ?? [];
  const totalSteps = items.length + 2;
  const isScope = step === 0;
  const isReview = step === totalSteps - 1;
  const itemIndex = step - 1;
  const current = !isScope && !isReview ? items[itemIndex] : null;

  const scopeReady =
    insType === "common_bathroom" ||
    (insType === "room" && !!selectedRoomId) ||
    (insType === "floor" && !!selectedFloorId);
  const itemReady = current
    ? current.passed === true || (current.passed === false && (!!current.photo || !!current.notes.trim()))
    : false;
  const stepReady = isScope ? scopeReady : isReview ? true : itemReady;

  const mutation = useMutation({
    mutationFn: async () => {
      const payloadItems = await Promise.all(
        items.map(async (c) => ({
          item_key: c.key,
          description: c.desc,
          passed: c.passed === true,
          notes: c.notes,
          photo_base64: c.photo && c.passed === false ? await fileToB64(c.photo) : "",
        }))
      );
      return submitManagerInspection({
        property_id: propertyId,
        inspection_type: insType,
        room_id: insType === "room" ? selectedRoomId || null : null,
        floor_id: insType === "floor" ? selectedFloorId || null : null,
        notes: roundNotes,
        items: payloadItems,
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.managerInspections(propertyId) });
      navigate({ to: "/manager/inspections/$id", params: { id: data.inspection.id } });
    },
    onError: (e: Error) => setErr(e.message || "Could not submit inspection"),
  });

  const goNext = useCallback(() => {
    if (!stepReady) return;
    if (isReview) mutation.mutate();
    else setStep((s) => s + 1);
  }, [stepReady, isReview, mutation]);

  useEffect(() => {
    setAction({
      label: isReview ? "Submit inspection" : "Next",
      onClick: goNext,
      disabled: !stepReady,
      busy: mutation.isPending,
      busyLabel: "Submitting…",
    });
    return () => setAction(null);
  }, [setAction, goNext, stepReady, isReview, mutation.isPending]);

  const progress = useMemo(() => `${step + 1} / ${totalSteps}`, [step, totalSteps]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          disabled={step === 0}
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          className="t-body font-semibold text-accent disabled:opacity-30"
        >
          Back
        </button>
        <span className="t-caption text-ink-muted">{progress}</span>
      </div>
      <div className="h-1 rounded-full bg-hairline overflow-hidden">
        <div className="h-full bg-accent" style={{ width: `${((step + 1) / totalSteps) * 100}%` }} />
      </div>

      {isScope && (
        <div className="space-y-3">
          <h1 className="t-h1">What are you inspecting?</h1>
          {(["room", "floor", "common_bathroom"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setInsType(t)}
              className={`w-full text-left rounded-[14px] border px-4 py-3 ${
                insType === t ? "border-accent bg-accent-tint" : "border-hairline bg-surface"
              }`}
            >
              <div className="t-h3 capitalize">{t.replace("_", " ")}</div>
            </button>
          ))}
          {insType === "room" && (
            <select
              value={selectedRoomId}
              onChange={(e) => setSelectedRoomId(e.target.value)}
              className="w-full h-12 rounded-[10px] border border-hairline bg-surface px-3"
            >
              <option value="">Select room</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.room_number}
                </option>
              ))}
            </select>
          )}
          {insType === "floor" && (
            <select
              value={selectedFloorId}
              onChange={(e) => setSelectedFloorId(e.target.value)}
              className="w-full h-12 rounded-[10px] border border-hairline bg-surface px-3"
            >
              <option value="">Select floor</option>
              {floors.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name || `Floor ${f.floor_number}`}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {current && (
        <div className="space-y-4">
          <h1 className="t-h1">{current.desc}</h1>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() =>
                setItems((prev) => prev.map((it, i) => (i === itemIndex ? { ...it, passed: true } : it)))
              }
              className={`h-14 rounded-[14px] border font-semibold ${
                current.passed === true ? "bg-success-tint border-success text-success" : "border-hairline bg-surface"
              }`}
            >
              <Check className="inline h-4 w-4 mr-1" /> Pass
            </button>
            <button
              type="button"
              onClick={() =>
                setItems((prev) => prev.map((it, i) => (i === itemIndex ? { ...it, passed: false } : it)))
              }
              className={`h-14 rounded-[14px] border font-semibold ${
                current.passed === false ? "bg-danger-tint border-danger text-danger" : "border-hairline bg-surface"
              }`}
            >
              Fail
            </button>
          </div>
          {current.passed === false && (
            <>
              <label className="flex items-center gap-2 h-12 rounded-[10px] border border-hairline bg-surface px-3">
                <Camera className="h-4 w-4 text-ink-muted" />
                <span className="t-body-sm">{current.photo ? current.photo.name : "Add photo"}</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setItems((prev) => prev.map((it, i) => (i === itemIndex ? { ...it, photo: file } : it)));
                  }}
                />
              </label>
              <textarea
                value={current.notes}
                onChange={(e) =>
                  setItems((prev) => prev.map((it, i) => (i === itemIndex ? { ...it, notes: e.target.value } : it)))
                }
                placeholder="What failed? Required if no photo."
                className="w-full min-h-[88px] rounded-[10px] border border-hairline bg-surface px-3 py-2 t-body"
              />
            </>
          )}
        </div>
      )}

      {isReview && (
        <div className="space-y-3">
          <h1 className="t-h1">Review round</h1>
          <ul className="rounded-[14px] border border-hairline bg-surface divide-y divide-hairline">
            {items.map((it) => (
              <li key={it.key} className="px-4 py-3 flex justify-between t-body">
                <span>{it.desc}</span>
                <span className={it.passed ? "text-success" : "text-danger"}>{it.passed ? "Pass" : "Fail"}</span>
              </li>
            ))}
          </ul>
          <textarea
            value={roundNotes}
            onChange={(e) => setRoundNotes(e.target.value)}
            placeholder="Round notes (optional)"
            className="w-full min-h-[88px] rounded-[10px] border border-hairline bg-surface px-3 py-2 t-body"
          />
        </div>
      )}
      {err && <p className="t-body-sm text-danger">{err}</p>}
    </div>
  );
};
