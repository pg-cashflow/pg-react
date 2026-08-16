import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Check, Loader2 } from "lucide-react";
import { getOwnerInvite, rotateInvite } from "@/api/join";
import { createTenant } from "@/api/tenants";
import { importStatements } from "@/api/payments";
import { QUERY_KEYS } from "@/lib/queryKeys";
import { rupeesToPaise } from "@/lib/utils";

export const MoreView: React.FC = () => {
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [walkName, setWalkName] = useState("");
  const [walkPhone, setWalkPhone] = useState("");
  const [walkRoom, setWalkRoom] = useState("");
  const [walkRent, setWalkRent] = useState("");
  const [walkDue, setWalkDue] = useState(5);
  const [walkDeposit, setWalkDeposit] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [importMsg, setImportMsg] = useState<string | null>(null);

  const inviteQuery = useQuery({ queryKey: QUERY_KEYS.ownerInvite, queryFn: getOwnerInvite });

  const rotateMutation = useMutation({
    mutationFn: rotateInvite,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ownerInvite }),
  });

  const walkMutation = useMutation({
    mutationFn: () =>
      createTenant({
        name: walkName.trim(),
        phone: walkPhone.trim() || undefined,
        room_number: walkRoom.trim() || undefined,
        rent_amount: rupeesToPaise(walkRent),
        due_day: walkDue,
        deposit_amount: walkDeposit.trim() ? rupeesToPaise(walkDeposit) : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tenants });
      setWalkName("");
      setWalkPhone("");
      setWalkRoom("");
      setWalkRent("");
      setWalkDeposit("");
      setFormError(null);
    },
    onError: (err: Error) => setFormError(err.message),
  });

  const importMutation = useMutation({
    mutationFn: (file: File) => importStatements(file),
    onSuccess: (out) => {
      setImportMsg(`Imported ${out.row_count} rows · matched ${out.matched} · failed ${out.failed}`);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dues() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.payments() });
    },
    onError: (err: Error) => setImportMsg(err.message),
  });

  const invite = inviteQuery.data;

  return (
    <div className="space-y-8 max-w-xl">
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
        <h3 className="font-semibold text-slate-100">Invite code</h3>
        <p className="text-xs text-slate-400">
          Share this with new tenants. Payment mode: {invite?.payment_mode ?? "—"}.
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 px-3 py-2 rounded-xl bg-slate-800 font-mono text-slate-100">
            {invite?.invite_code ?? "…"}
          </code>
          <button
            onClick={async () => {
              if (!invite?.invite_code) return;
              await navigator.clipboard.writeText(invite.invite_code);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            className="p-2 rounded-xl bg-slate-800 text-slate-200"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
        <button
          onClick={() => {
            if (window.confirm("Rotate invite? The old code stops working.")) rotateMutation.mutate();
          }}
          className="text-sm text-amber-300"
        >
          Rotate code
        </button>
      </section>

      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
        <h3 className="font-semibold text-slate-100">Walk-in tenant</h3>
        <p className="text-xs text-slate-400">Phone-less / cash-only people only. Default onboarding is the invite queue.</p>
        {formError && <p className="text-xs text-rose-400">{formError}</p>}
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!walkName.trim() || rupeesToPaise(walkRent) <= 0) {
              setFormError("Name and rent are required");
              return;
            }
            walkMutation.mutate();
          }}
        >
          <input value={walkName} onChange={(e) => setWalkName(e.target.value)} placeholder="Name *" className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-100" />
          <input value={walkPhone} onChange={(e) => setWalkPhone(e.target.value)} placeholder="Phone (optional)" className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-100" />
          <input value={walkRoom} onChange={(e) => setWalkRoom(e.target.value)} placeholder="Room" className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-100" />
          <input value={walkRent} onChange={(e) => setWalkRent(e.target.value)} placeholder="Rent ₹ *" type="number" className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-100" />
          <input value={walkDue} onChange={(e) => setWalkDue(Number(e.target.value))} type="number" min={1} max={28} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-100" />
          <input value={walkDeposit} onChange={(e) => setWalkDeposit(e.target.value)} placeholder="Deposit ₹ (optional)" type="number" className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-100" />
          <button type="submit" disabled={walkMutation.isPending} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-100 text-sm font-semibold disabled:opacity-50">
            {walkMutation.isPending && <Loader2 className="w-4 h-4 animate-spin inline mr-1" />}
            Create walk-in
          </button>
        </form>
      </section>

      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
        <h3 className="font-semibold text-slate-100">Bank statement CSV</h3>
        {importMsg && <p className="text-xs text-slate-300">{importMsg}</p>}
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) importMutation.mutate(f);
          }}
          className="text-sm text-slate-300"
        />
      </section>
    </div>
  );
};
