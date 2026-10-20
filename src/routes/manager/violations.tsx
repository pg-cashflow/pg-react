import React, { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { logManagerViolation } from "@/api/gamification";
import { useManagerAction } from "@/components/layout/ManagerShell";
import { validateAndProcessImage } from "@/lib/imageValidation";
import { Camera, X, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

function fileToB64(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res((r.result as string).split(",")[1] || "");
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

export const ViolationsView: React.FC = () => {
  const setAction = useManagerAction();
  const [tenantId, setTenantId] = useState("");
  const [ruleCode, setRuleCode] = useState("");
  const [severity, setSeverity] = useState<"safety" | "lifestyle">("lifestyle");
  const [description, setDescription] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [isValidatingPhoto, setIsValidatingPhoto] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFile = e.target.files?.[0];
    e.target.value = "";
    if (!rawFile) return;

    setIsValidatingPhoto(true);
    setPhotoError(null);

    try {
      const processed = await validateAndProcessImage(rawFile);
      setPhoto(processed);
      setPhotoPreview(URL.createObjectURL(processed));
      setPhotoError(null);
    } catch (err: unknown) {
      setPhoto(null);
      setPhotoPreview(null);
      setPhotoError(err instanceof Error ? err.message : "Invalid image file");
    } finally {
      setIsValidatingPhoto(false);
    }
  };

  const clearPhoto = () => {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhoto(null);
    setPhotoPreview(null);
    setPhotoError(null);
  };

  const mut = useMutation({
    mutationFn: async () =>
      logManagerViolation({
        tenant_id: tenantId.trim(),
        rule_code: ruleCode.trim(),
        severity,
        description: description.trim(),
        evidence_base64: photo ? await fileToB64(photo) : undefined,
      }),
    onSuccess: () => {
      setMsg("Violation logged.");
      setDescription("");
      setRuleCode("");
      clearPhoto();
    },
    onError: (e: Error) => setMsg(e.message),
  });

  const { mutate: logMutate, isPending: logBusy } = mut;
  useEffect(() => {
    setAction({
      label: "Log violation",
      onClick: () => logMutate(),
      busy: logBusy,
      disabled: !tenantId.trim() || !ruleCode.trim() || !description.trim() || !!photoError || isValidatingPhoto,
    });
    return () => setAction(null);
  }, [setAction, logMutate, logBusy, tenantId, ruleCode, description, photoError, isValidatingPhoto]);

  return (
    <div className="space-y-3">
      <h1 className="t-h1">Log a violation</h1>
      <input
        value={tenantId}
        onChange={(e) => setTenantId(e.target.value)}
        placeholder="Tenant ID"
        className="w-full h-12 rounded-[10px] border border-hairline bg-surface px-3"
      />
      <input
        value={ruleCode}
        onChange={(e) => setRuleCode(e.target.value)}
        placeholder="Rule code"
        className="w-full h-12 rounded-[10px] border border-hairline bg-surface px-3"
      />
      <div className="grid grid-cols-2 gap-2">
        {(["lifestyle", "safety"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSeverity(s)}
            className={`h-11 rounded-[10px] border capitalize ${
              severity === s ? "bg-accent-tint border-accent" : "border-hairline bg-surface"
            }`}
          >
            {s}
          </button>
        ))}
      </div>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="What happened"
        className="w-full min-h-[88px] rounded-[10px] border border-hairline bg-surface px-3 py-2"
      />

      <div>
        <label className="block text-xs font-semibold text-ink mb-1.5">Evidence Photo (Optional)</label>
        {photoPreview ? (
          <div className="relative rounded-[12px] border border-hairline p-2 bg-surface flex items-center gap-3">
            <img src={photoPreview} alt="Preview" className="w-14 h-14 rounded-lg object-cover border border-hairline" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-ink truncate">{photo?.name}</p>
              <p className="text-[11px] text-accent flex items-center gap-1 mt-0.5">
                <CheckCircle2 className="w-3.5 h-3.5 inline" />
                Validated ({(Number(photo?.size || 0) / 1024).toFixed(0)} KB)
              </p>
            </div>
            <button
              type="button"
              onClick={clearPhoto}
              className="p-1.5 rounded-full hover:bg-hairline/40 text-ink-muted hover:text-danger"
              title="Remove photo"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <label
            className={`flex items-center justify-center gap-2 h-12 rounded-[10px] border-2 border-dashed px-4 cursor-pointer transition ${
              photoError ? "border-danger bg-danger-tint/20 text-danger" : "border-hairline bg-surface hover:bg-hairline/20 text-ink"
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
              className="sr-only"
              disabled={isValidatingPhoto}
              onChange={handlePhotoSelect}
            />
          </label>
        )}

        {photoError && (
          <div className="p-2.5 rounded-xl bg-danger-tint border border-danger/20 text-danger text-xs font-medium mt-1.5 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{photoError}</span>
          </div>
        )}
      </div>

      {msg && <p className="t-body-sm text-ink-muted">{msg}</p>}
    </div>
  );
};
