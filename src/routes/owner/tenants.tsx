import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getTenants,
  updateTenant,
  giveNotice,
  vacateTenant,
  attachPhone,
  prorateTenant,
  settleDeposit,
  getTenantIdPhotoBlob,
  type UpdateTenantPayload,
} from "@/api/tenants";
import { QUERY_KEYS } from "@/lib/queryKeys";
import { QueryState } from "@/components/shared/QueryState";
import { formatPaise, rupeesToPaise, paiseToRupeeInput, localDateInputValue, formatDate } from "@/lib/utils";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Search, Loader2, Phone } from "lucide-react";
import type { Tenant } from "@pg/types";

const IdPhotoPreview: React.FC<{ tenantId: string }> = ({ tenantId }) => {
  const [url, setUrl] = useState<string | null>(null);
  React.useEffect(() => {
    let revoked: string | null = null;
    getTenantIdPhotoBlob(tenantId)
      .then((blob) => {
        revoked = URL.createObjectURL(blob);
        setUrl(revoked);
      })
      .catch(() => setUrl(null));
    return () => {
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [tenantId]);
  if (!url) return <p className="text-ink-muted">ID photo on file</p>;
  return <img src={url} alt="ID photo" className="mt-2 max-h-40 rounded-lg object-contain bg-surface" />;
};

export const TenantsView: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState(() => new URLSearchParams(window.location.search).get("q") ?? "");
  const [selected, setSelected] = useState<Tenant | null>(null);
  const [editName, setEditName] = useState("");
  const [editRoom, setEditRoom] = useState("");
  const [editRent, setEditRent] = useState("");
  const [editDue, setEditDue] = useState(1);
  const [phone, setPhone] = useState("");
  const [vacateDate, setVacateDate] = useState(localDateInputValue());
  const [refund, setRefund] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ title: string; description: string; run: () => void } | null>(null);

  const { data: tenants = [], isLoading, isError, error: qErr, refetch } = useQuery({
    queryKey: QUERY_KEYS.tenants,
    queryFn: getTenants,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tenants });

  const open = (t: Tenant) => {
    setSelected(t);
    setEditName(t.name);
    setEditRoom(t.room_number || "");
    setEditRent(paiseToRupeeInput(t.rent_amount));
    setEditDue(t.due_day ?? 5);
    setPhone("");
    setRefund("");
    setReason("");
    setError(null);
  };

  const patchMutation = useMutation({
    mutationFn: (payload: UpdateTenantPayload) => updateTenant(selected!.id, payload),
    onSuccess: invalidate,
    onError: (err: Error) => setError(err.message),
  });

  const filteredTenants = tenants.filter(
    (t) =>
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.room_number && t.room_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (t.phone && t.phone.includes(searchTerm))
  );

  return (
    <div className="space-y-6">
      <p className="text-xs text-ink-muted">Walk-in create is under More. This list is for occupancy changes.</p>
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" />
        <input
          type="text"
          placeholder="Search by name, room, or phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-surface border border-hairline rounded-xl text-ink placeholder:text-ink-muted text-sm"
        />
      </div>

      <div className="bg-surface border border-hairline rounded-2xl overflow-hidden">
        <QueryState
          isLoading={isLoading}
          isError={isError}
          error={qErr as Error | null}
          isEmpty={!isLoading && filteredTenants.length === 0}
          onRetry={() => refetch()}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-bg text-ink-muted text-xs font-semibold uppercase border-b border-hairline">
                <tr>
                  <th className="px-6 py-3.5">Name</th>
                  <th className="px-6 py-3.5">Phone</th>
                  <th className="px-6 py-3.5">Room</th>
                  <th className="px-6 py-3.5">Rent</th>
                  <th className="px-6 py-3.5">Due Day</th>
                  <th className="px-6 py-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline text-ink">
                {filteredTenants.map((t) => (
                  <tr
                    key={t.id}
                    className="hover:bg-accent-tint cursor-pointer"
                    onClick={() => open(t)}
                  >
                    <td className="px-6 py-4 font-medium">{t.name}</td>
                    <td className="px-6 py-4 font-mono text-xs">{t.phone || "cash only"}</td>
                    <td className="px-6 py-4">{t.room_number || "—"}</td>
                    <td className="px-6 py-4">{formatPaise(t.rent_amount)}</td>
                    <td className="px-6 py-4">{t.due_day != null ? `Day ${t.due_day}` : "—"}</td>
                    <td className="px-6 py-4 capitalize text-xs">
                      {t.status === "pending_allocation" ? "awaiting room/rent" : t.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </QueryState>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 overflow-y-auto">
          <div className="bg-surface border border-hairline rounded-2xl w-full max-w-lg p-6 my-8 space-y-4">
            <div className="flex justify-between">
              <h3 className="text-lg font-bold text-ink">{selected.name}</h3>
              <button onClick={() => setSelected(null)} className="text-ink-muted">Close</button>
            </div>
            {error && <p className="text-xs text-danger">{error}</p>}
            <div className="text-xs text-ink-muted space-y-1 rounded-xl bg-bg p-3">
              {selected.parent_name && <p>Parent: {selected.parent_name}</p>}
              {selected.emergency_phone && (
                <p className="font-mono">Emergency: {selected.emergency_phone}</p>
              )}
              {selected.permanent_address && <p>Home: {selected.permanent_address}</p>}
              {selected.current_address && <p>Current: {selected.current_address}</p>}
              {selected.joined_on && <p>Joined: {formatDate(selected.joined_on)}</p>}
              {selected.has_id_photo && (
                <IdPhotoPreview tenantId={selected.id} />
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input value={editName} onChange={(e) => setEditName(e.target.value)} className="px-3 py-2 bg-surface rounded-xl text-sm text-ink" />
              <input value={editRoom} onChange={(e) => setEditRoom(e.target.value)} placeholder="Room" className="px-3 py-2 bg-surface rounded-xl text-sm text-ink" />
              <input value={editRent} onChange={(e) => setEditRent(e.target.value)} type="number" className="px-3 py-2 bg-surface rounded-xl text-sm text-ink" />
              <input value={editDue} onChange={(e) => setEditDue(Number(e.target.value))} type="number" min={1} max={28} className="px-3 py-2 bg-surface rounded-xl text-sm text-ink" />
            </div>
            <button
              disabled={patchMutation.isPending}
              onClick={() =>
                patchMutation.mutate({
                  name: editName.trim(),
                  room_number: editRoom.trim() || undefined,
                  rent_amount: rupeesToPaise(editRent),
                  due_day: editDue,
                })
              }
              className="px-4 py-2 rounded-xl bg-accent text-white text-sm font-semibold"
            >
              {patchMutation.isPending && <Loader2 className="w-4 h-4 animate-spin inline mr-1" />}
              Save changes
            </button>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() =>
                  setConfirm({
                    title: "Record notice?",
                    description: "Notice given today will start the notice period for this tenant.",
                    run: () => giveNotice(selected.id).then(invalidate).catch((e: Error) => setError(e.message)),
                  })
                }
                className="px-3 py-2 rounded-xl bg-surface text-sm text-ink"
              >
                Give notice
              </button>
              <button
                onClick={() =>
                  setConfirm({
                    title: "Vacate this tenant?",
                    description: "Access is revoked. This cannot be undone from the app.",
                    run: () =>
                      vacateTenant(selected.id)
                        .then(() => {
                          invalidate();
                          setSelected(null);
                        })
                        .catch((e: Error) => setError(e.message)),
                  })
                }
                className="px-3 py-2 rounded-xl bg-danger-tint text-danger text-sm"
              >
                Vacate
              </button>
            </div>

            {!selected.phone && (
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91…" className="w-full pl-9 px-3 py-2 bg-surface rounded-xl text-sm text-ink" />
                </div>
                <button
                  onClick={() =>
                    attachPhone(selected.id, phone.trim())
                      .then(invalidate)
                      .catch((e: Error) => setError(e.message))
                  }
                  className="px-3 py-2 rounded-xl bg-surface text-sm"
                >
                  Attach phone
                </button>
              </div>
            )}

            <div className="flex gap-2 items-center">
              <input type="date" value={vacateDate} onChange={(e) => setVacateDate(e.target.value)} className="px-3 py-2 bg-surface rounded-xl text-sm text-ink" />
              <button
                onClick={() =>
                  prorateTenant(selected.id, new Date(vacateDate).toISOString())
                    .then(invalidate)
                    .catch((e: Error) => setError(e.message))
                }
                className="px-3 py-2 rounded-xl bg-surface text-sm"
              >
                Prorate
              </button>
            </div>

            <div className="flex gap-2">
              <input value={refund} onChange={(e) => setRefund(e.target.value)} placeholder="Refund ₹" type="number" className="flex-1 px-3 py-2 bg-surface rounded-xl text-sm text-ink" />
              <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason" className="flex-1 px-3 py-2 bg-surface rounded-xl text-sm text-ink" />
              <button
                onClick={() =>
                  settleDeposit(selected.id, rupeesToPaise(refund), reason || undefined)
                    .then(invalidate)
                    .catch((e: Error) => setError(e.message))
                }
                className="px-3 py-2 rounded-xl bg-surface text-sm"
              >
                Settle deposit
              </button>
            </div>
            <p className="text-xs text-ink-muted">Deposit settle is a ledger event — money moves outside the app.</p>
          </div>
        </div>
      )}
      <ConfirmDialog
        open={!!confirm}
        title={confirm?.title ?? ""}
        description={confirm?.description ?? ""}
        danger
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          confirm?.run();
          setConfirm(null);
        }}
      />
    </div>
  );
};
