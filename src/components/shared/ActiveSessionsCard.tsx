import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Smartphone, Laptop, ShieldCheck, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { getActiveSessions, deleteSession, revokeAllSessions, type ActiveSession } from "@/api/auth";
import { QUERY_KEYS } from "@/lib/queryKeys";
import { useLocale } from "@/i18n";

export const ActiveSessionsCard: React.FC<{ className?: string }> = ({ className }) => {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: QUERY_KEYS.sessions,
    queryFn: getActiveSessions,
  });

  const revokeOneMutation = useMutation({
    mutationFn: (id: string) => deleteSession(id),
    onSuccess: () => {
      setNotice(t("sessions.revokeSuccess"));
      setError(null);
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sessions });
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : t("sessions.revokeError"));
    },
  });

  const revokeAllMutation = useMutation({
    mutationFn: revokeAllSessions,
    onSuccess: () => {
      setNotice(t("sessions.revokeAllSuccess"));
      setError(null);
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sessions });
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : t("sessions.revokeAllError"));
    },
  });

  const sessions = data?.sessions ?? [];
  const otherSessions = sessions.filter((s) => !s.is_current);

  const formatLastSeen = (iso: string) => {
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return t("sessions.recently");
      return formatDistanceToNow(d, { addSuffix: true });
    } catch {
      return t("sessions.recently");
    }
  };

  const getDeviceIcon = (label: string) => {
    if (/iPhone|Android|Mobile|iPad/i.test(label)) {
      return <Smartphone className="w-4 h-4" />;
    }
    return <Laptop className="w-4 h-4" />;
  };

  return (
    <section
      data-testid="active-sessions-card"
      className={className ?? "rounded-[14px] border border-hairline bg-surface p-4 space-y-4"}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-accent" />
          <h2 className="t-h3">{t("sessions.title")}</h2>
        </div>
        {otherSessions.length > 0 && (
          <button
            type="button"
            onClick={() => revokeAllMutation.mutate()}
            disabled={revokeAllMutation.isPending}
            className="text-xs text-danger font-medium hover:underline disabled:opacity-50"
          >
            {revokeAllMutation.isPending ? t("sessions.revoking") : t("sessions.signOutOthers")}
          </button>
        )}
      </div>

      <p className="t-caption text-ink-muted">
        {t("sessions.subtitle")}
      </p>

      {notice && (
        <div
          role="status"
          className="p-3 rounded-[10px] bg-success-tint border border-success/20 text-success text-xs animate-step-in"
        >
          {notice}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="p-3 rounded-[10px] bg-danger-tint border border-danger/20 text-danger text-xs animate-step-in"
        >
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-6 text-ink-muted">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : isError ? (
        <div className="text-xs text-ink-muted py-2">
          {t("sessions.loadError")}
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-xs text-ink-muted py-2">
          {t("sessions.empty")}
        </div>
      ) : (
        <div className="divide-y divide-hairline border-t border-b border-hairline">
          {sessions.map((s: ActiveSession) => (
            <div
              key={s.id}
              data-testid={`session-row-${s.id}`}
              className="py-3 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-bg border border-hairline flex items-center justify-center shrink-0 text-ink-muted">
                  {getDeviceIcon(s.device_label)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="t-body font-semibold truncate text-ink">
                      {s.device_label || t("sessions.unknownDevice")}
                    </span>
                    {s.is_current && (
                      <span
                        data-testid="current-device-badge"
                        className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-accent-tint text-accent border border-accent/20 shrink-0"
                      >
                        {t("sessions.thisDevice")}
                      </span>
                    )}
                  </div>
                  <div className="t-caption text-ink-muted truncate">
                    {s.ip_address ? `${s.ip_address} · ` : ""}
                    {formatLastSeen(s.last_seen)}
                  </div>
                </div>
              </div>

              {!s.is_current && (
                <button
                  type="button"
                  data-testid={`revoke-btn-${s.id}`}
                  onClick={() => revokeOneMutation.mutate(s.id)}
                  disabled={revokeOneMutation.isPending}
                  className="px-2.5 py-1 rounded-lg border border-hairline text-xs text-danger hover:bg-danger-tint transition shrink-0 disabled:opacity-50"
                >
                  {t("sessions.revoke")}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
