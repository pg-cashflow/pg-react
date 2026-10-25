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
import { useVirtualizer } from "@tanstack/react-virtual";
import { QUERY_KEYS } from "@/lib/queryKeys";
import { QueryState } from "@/components/shared/QueryState";
import { formatPaise, rupeesToPaise, paiseToRupeeInput, localDateInputValue, formatDate } from "@/lib/utils";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Search, Loader2, Phone, ShieldCheck, Clock, AlertTriangle } from "lucide-react";
import { getOwnerTenantKYC } from "@/api/kyc";
import type { Tenant } from "@pg/types";
import { useLocale } from "@/i18n";

const IdPhotoPreview: React.FC<{ tenantId: string }> = ({ tenantId }) => {
  const { t } = useLocale();
  const [url, setUrl] = useState<string | null>(null);
  React.useEffect(() => {
    let active = true;
    let createdUrl: string | null = null;
    getTenantIdPhotoBlob(tenantId)
      .then((blob) => {
        if (!active) return;
        createdUrl = URL.createObjectURL(blob);
        setUrl(createdUrl);
      })
      .catch(() => {
        if (active) setUrl(null);
      });
    return () => {
      active = false;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [tenantId]);
  if (!url) return <p className="text-ink-muted">{t("owner.tenants.idPhotoOnFile")}</p>;
  return <img src={url} alt="ID photo" className="mt-2 max-h-40 rounded-lg object-contain bg-surface" />;
};

const TenantKYCStatusBadge: React.FC<{ tenantId: string }> = ({ tenantId }) => {
  const { t } = useLocale();
  const { data: kyc, isLoading } = useQuery({
    queryKey: QUERY_KEYS.ownerTenantKYC(tenantId),
    queryFn: () => getOwnerTenantKYC(tenantId),
    staleTime: 60000,
  });

  if (isLoading) return <span className="text-ink-faint text-xs">{t("owner.tenants.checkingKYC")}</span>;
  if (!kyc || !kyc.status) return <span className="text-ink-faint text-xs">{t("owner.tenants.unverified")}</span>;

  if (kyc.status === "verified") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-success">
        <ShieldCheck className="w-3.5 h-3.5" />
        {t("owner.tenants.verified", { details: kyc.masked_uid ? `(**** ${kyc.masked_uid})` : "" })}
      </span>
    );
  }
  if (kyc.status === "pending_manual_review") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-warning">
        <Clock className="w-3.5 h-3.5" />
        {t("owner.tenants.pendingReview")}
      </span>
    );
  }
  if (kyc.status === "rejected") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-danger">
        <AlertTriangle className="w-3.5 h-3.5" />
        {t("owner.tenants.rejected")}
      </span>
    );
  }
  return <span className="text-ink-faint text-xs capitalize">{kyc.status}</span>;
};

export const TenantsView: React.FC = () => {
  const { t } = useLocale();
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

  const parentRef = React.useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: filteredTenants.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 57,
    overscan: 5,
  });
  const virtualItems = rowVirtualizer.getVirtualItems();
  const paddingTop = virtualItems.length > 0 ? virtualItems[0]?.start || 0 : 0;
  const paddingBottom = virtualItems.length > 0
    ? rowVirtualizer.getTotalSize() - (virtualItems[virtualItems.length - 1]?.end || 0)
    : 0;

  return (
    <div className="space-y-6">
      <p className="text-xs text-ink-muted">{t("owner.tenants.subtitle")}</p>
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" />
        <input
          type="text"
          placeholder={t("owner.tenants.searchPlaceholder")}
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
          <div ref={parentRef} className="overflow-x-auto max-h-[70vh] overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-bg text-ink-muted text-xs font-semibold uppercase border-b border-hairline sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-3.5">{t("owner.tenants.colName")}</th>
                  <th className="px-6 py-3.5">{t("owner.tenants.colPhone")}</th>
                  <th className="px-6 py-3.5">{t("owner.tenants.colRoom")}</th>
                  <th className="px-6 py-3.5">{t("owner.tenants.colRent")}</th>
                  <th className="px-6 py-3.5">{t("owner.tenants.colDueDay")}</th>
                  <th className="px-6 py-3.5">{t("owner.tenants.colStatus")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline text-ink">
                {paddingTop > 0 && (
                  <tr>
                    <td style={{ height: `${paddingTop}px` }} colSpan={6} />
                  </tr>
                )}
                {virtualItems.map((virtualRow) => {
                  const tItem = filteredTenants[virtualRow.index];
                  if (!tItem) return null;
                  return (
                    <tr
                      key={tItem.id}
                      ref={rowVirtualizer.measureElement}
                      data-index={virtualRow.index}
                      className="hover:bg-accent-tint cursor-pointer"
                      onClick={() => open(tItem)}
                    >
                      <td className="px-6 py-4 font-medium">{tItem.name}</td>
                      <td className="px-6 py-4 font-mono text-xs">{tItem.phone || t("owner.tenants.cashOnly")}</td>
                      <td className="px-6 py-4">{tItem.room_number || "—"}</td>
                      <td className="px-6 py-4">{formatPaise(tItem.rent_amount)}</td>
                      <td className="px-6 py-4">{tItem.due_day != null ? t("owner.tenants.dayPrefix", { day: tItem.due_day }) : "—"}</td>
                      <td className="px-6 py-4 text-xs">
                        {tItem.status === "active" ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-success-tint text-success border border-success/20">
                            {t("common.active")}
                          </span>
                        ) : tItem.status === "pending_allocation" ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-warning-tint text-warning border border-warning/20">
                            {t("owner.tenants.awaitingRoom")}
                          </span>
                        ) : tItem.status === "vacated" ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-hairline/30 text-ink-muted border border-hairline">
                            {t("common.vacated")}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-bg text-ink border border-hairline capitalize">
                            {tItem.status}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {paddingBottom > 0 && (
                  <tr>
                    <td style={{ height: `${paddingBottom}px` }} colSpan={6} />
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </QueryState>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 overflow-y-auto">
          <div className="bg-surface border border-hairline rounded-2xl w-full max-w-lg p-6 my-8 space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-ink">{selected.name}</h3>
                {selected.status === "active" ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-success-tint text-success border border-success/20">
                    Active
                  </span>
                ) : selected.status === "pending_allocation" ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-warning-tint text-warning border border-warning/20">
                    Awaiting Room
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-hairline/30 text-ink-muted border border-hairline capitalize">
                    {selected.status}
                  </span>
                )}
              </div>
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
              <div className="flex items-center gap-2 pt-1 border-t border-hairline/60">
                <span className="text-ink-faint">KYC Status:</span>
                <TenantKYCStatusBadge tenantId={selected.id} />
              </div>
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
