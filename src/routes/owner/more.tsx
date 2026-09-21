import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Check, Loader2 } from "lucide-react";
import { getOwnerInvite, rotateInvite } from "@/api/join";
import { createTenant } from "@/api/tenants";
import { importStatements } from "@/api/payments";
import { QUERY_KEYS } from "@/lib/queryKeys";
import { rupeesToPaise } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import { ThemeSegmentedControl } from "@/components/common/ThemeToggle";
import { LanguageSegmentedControl } from "@/components/common/LanguageSelector";

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

  const copyInvite = () => {
    if (!inviteQuery.data?.invite_code) return;
    navigator.clipboard.writeText(inviteQuery.data.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-2xl text-ink">
      {/* Appearance / Theme Settings */}
      <section className="bg-surface border border-hairline rounded-2xl p-5 space-y-3">
        <div>
          <h3 className="font-semibold text-ink">Appearance</h3>
          <p className="text-xs text-ink-muted mt-0.5">Customize your preferred display theme</p>
        </div>
        <ThemeSegmentedControl />
      </section>

      {/* Language Preferences */}
      <section className="bg-surface border border-hairline rounded-2xl p-5 space-y-3">
        <div>
          <h3 className="font-semibold text-ink">Language / భాష / மொழி / ಭಾಷೆ</h3>
          <p className="text-xs text-ink-muted mt-0.5">Select your preferred display language</p>
        </div>
        <LanguageSegmentedControl />
      </section>

      <section className="bg-surface border border-hairline rounded-2xl p-5 space-y-3">
        <h3 className="font-semibold text-ink">Notifications</h3>
        <p className="text-xs text-ink-muted">
          Rent reminders go out on WhatsApp three days before each due date. Automatic send needs pg-go cron.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link to="/owner/reminders" className="inline-flex h-10 items-center px-4 rounded-[10px] bg-accent text-white t-caption font-semibold">
            Open reminders
          </Link>
          <Link to="/owner/facility" className="inline-flex h-10 items-center px-4 rounded-[10px] border border-hairline t-caption font-semibold">
            Wardens, UPI & due day
          </Link>
        </div>
      </section>

      {/* Invite code */}
      <section className="bg-surface border border-hairline rounded-2xl p-5 space-y-3">
        <h3 className="font-semibold text-ink">Active invite code</h3>
        <p className="text-xs text-ink-muted">
          Tenants use this code to request to join your property.
        </p>
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-xl bg-bg border border-hairline font-mono text-lg font-bold tracking-widest text-ink">
            {inviteQuery.data?.invite_code || "—"}
          </div>
          <button
            onClick={copyInvite}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-accent-tint text-accent text-xs font-semibold hover:bg-accent-tint/80 transition"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copied" : "Copy"}
          </button>
          <button
            onClick={() => rotateMutation.mutate()}
            disabled={rotateMutation.isPending}
            className="text-xs text-ink-muted hover:text-ink underline disabled:opacity-50"
          >
            Rotate code
          </button>
        </div>
      </section>

      {/* Walk-in tenant */}
      <section className="bg-surface border border-hairline rounded-2xl p-5 space-y-3">
        <h3 className="font-semibold text-ink">Add walk-in tenant</h3>
        <p className="text-xs text-ink-muted">
          Creates an active tenant directly without a join request.
        </p>
        {formError && <p className="text-xs text-danger">{formError}</p>}
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
          <input
            value={walkName}
            onChange={(e) => setWalkName(e.target.value)}
            placeholder="Name *"
            className="w-full px-3 py-2 bg-bg border border-hairline rounded-xl text-sm text-ink placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <input
            value={walkPhone}
            onChange={(e) => setWalkPhone(e.target.value)}
            placeholder="Phone (optional)"
            className="w-full px-3 py-2 bg-bg border border-hairline rounded-xl text-sm text-ink placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <input
            value={walkRoom}
            onChange={(e) => setWalkRoom(e.target.value)}
            placeholder="Room"
            className="w-full px-3 py-2 bg-bg border border-hairline rounded-xl text-sm text-ink placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <input
            value={walkRent}
            onChange={(e) => setWalkRent(e.target.value)}
            placeholder="Rent ₹ *"
            type="number"
            className="w-full px-3 py-2 bg-bg border border-hairline rounded-xl text-sm text-ink placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <input
            value={walkDue}
            onChange={(e) => setWalkDue(Number(e.target.value))}
            type="number"
            min={1}
            max={28}
            className="w-full px-3 py-2 bg-bg border border-hairline rounded-xl text-sm text-ink placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <input
            value={walkDeposit}
            onChange={(e) => setWalkDeposit(e.target.value)}
            placeholder="Deposit ₹ (optional)"
            type="number"
            className="w-full px-3 py-2 bg-bg border border-hairline rounded-xl text-sm text-ink placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <button
            type="submit"
            disabled={walkMutation.isPending}
            className="px-4 py-2 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent-pressed transition active:scale-95 disabled:opacity-50"
          >
            {walkMutation.isPending && <Loader2 className="w-4 h-4 animate-spin inline mr-1" />}
            Create walk-in
          </button>
        </form>
      </section>

      {/* CSV import */}
      <section className="bg-surface border border-hairline rounded-2xl p-5 space-y-3">
        <h3 className="font-semibold text-ink">Bank statement CSV</h3>
        {importMsg && <p className="text-xs text-ink-muted">{importMsg}</p>}
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) importMutation.mutate(f);
          }}
          className="text-sm text-ink-muted"
        />
      </section>
    </div>
  );
};
