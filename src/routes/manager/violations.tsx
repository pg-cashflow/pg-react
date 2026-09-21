import React, { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { logManagerViolation } from "@/api/gamification";
import { useManagerAction } from "@/components/layout/ManagerShell";

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
  const [msg, setMsg] = useState<string | null>(null);

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
    },
    onError: (e: Error) => setMsg(e.message),
  });

  useEffect(() => {
    setAction({
      label: "Log violation",
      onClick: () => mut.mutate(),
      busy: mut.isPending,
      disabled: !tenantId.trim() || !ruleCode.trim() || !description.trim(),
    });
    return () => setAction(null);
  }, [setAction, mut.isPending, tenantId, ruleCode, description]);

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
      <input type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files?.[0] || null)} />
      {msg && <p className="t-body-sm text-ink-muted">{msg}</p>}
    </div>
  );
};
