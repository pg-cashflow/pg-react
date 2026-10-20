import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/auth/context";
import { listOwnerFloors, listOwnerRooms, submitManagerInspection } from "@/api/gamification";
import { QUERY_KEYS } from "@/lib/queryKeys";
import { useManagerAction } from "@/components/layout/ManagerShell";
import { Check, Camera, AlertCircle, Trash2, Loader2 } from "lucide-react";
import { validateAndProcessImage } from "@/lib/imageValidation";

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
  photoError?: string | null;
  photoPreview?: string | null;
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

  const [isValidatingPhoto, setIsValidatingPhoto] = useState(false);

  const scopeReady =
    insType === "common_bathroom" ||
    (insType === "room" && !!selectedRoomId) ||
    (insType === "floor" && !!selectedFloorId);
  const itemReady = current
    ? current.passed === true ||
      (current.passed === false &&
        !current.photoError &&
        !isValidatingPhoto &&
        (!!current.photo || !!current.notes.trim()))
    : false;
  const stepReady = isScope ? scopeReady : isReview ? true : itemReady;

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFile = e.target.files?.[0];
    if (!rawFile) return;

    // Reset input value so re-selecting the same file fires onChange
    e.target.value = "";

    setIsValidatingPhoto(true);
    setErr(null);

    try {
      const processed = await validateAndProcessImage(rawFile);
      const preview = URL.createObjectURL(processed);
      setItems((prev) =>
        prev.map((it, i) =>
          i === itemIndex
            ? { ...it, photo: processed, photoError: null, photoPreview: preview }
            : it
        )
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Invalid image format";
      setItems((prev) =>
        prev.map((it, i) =>
          i === itemIndex
            ? { ...it, photo: null, photoError: message, photoPreview: null }
            : it
        )
      );
    } finally {
      setIsValidatingPhoto(false);
    }
  };

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
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">
                  Photo Evidence (JPEG, PNG, WebP · Max 500 KB)
                </label>
                {current.photoPreview ? (
                  <div className="rounded-[12px] border border-hairline bg-surface p-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={current.photoPreview}
                        alt="Evidence preview"
                        className="w-12 h-12 rounded-[8px] object-cover border border-hairline flex-shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-ink truncate">{current.photo?.name}</p>
                        <p className="text-[11px] text-success font-medium">
                          ✓ Validated ({(Number(current.photo?.size || 0) / 1024).toFixed(0)} KB)
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setItems((prev) =>
                          prev.map((it, i) =>
                            i === itemIndex
                              ? { ...it, photo: null, photoError: null, photoPreview: null }
                              : it
                          )
                        )
                      }
                      className="p-2 text-danger hover:bg-danger-tint rounded-lg transition"
                      title="Remove photo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label
                    className={`flex items-center justify-center gap-2 h-14 rounded-[12px] border-2 border-dashed px-4 cursor-pointer transition ${
                      current.photoError
                        ? "border-danger bg-danger-tint/20 text-danger"
                        : "border-hairline bg-surface hover:bg-hairline/20 text-ink"
                    }`}
                  >
                    {isValidatingPhoto ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-accent" />
                        <span className="text-xs font-medium">Checking file...</span>
                      </>
                    ) : (
                      <>
                        <Camera className="h-4 w-4 text-ink-muted" />
                        <span className="text-xs font-semibold">Attach photo evidence</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      capture="environment"
                      className="sr-only"
                      disabled={isValidatingPhoto}
                      onChange={handlePhotoUpload}
                    />
                  </label>
                )}

                {current.photoError && (
                  <div className="p-2.5 rounded-xl bg-danger-tint border border-danger/20 text-danger text-xs font-medium mt-1.5 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{current.photoError}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">
                  Failure Notes {current.photo ? "(Optional)" : "(Required if no photo)"}
                </label>
                <textarea
                  value={current.notes}
                  onChange={(e) =>
                    setItems((prev) =>
                      prev.map((it, i) => (i === itemIndex ? { ...it, notes: e.target.value } : it))
                    )
                  }
                  placeholder="Explain why this item failed..."
                  className="w-full min-h-[88px] rounded-[10px] border border-hairline bg-surface px-3 py-2 text-xs text-ink placeholder:text-ink-muted focus:outline-none focus:border-accent"
                />
              </div>
            </div>
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
