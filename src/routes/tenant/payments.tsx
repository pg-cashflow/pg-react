import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Copy, Check } from "lucide-react";
import { getMyPayments } from "@/api/tenant";
import { QUERY_KEYS } from "@/lib/queryKeys";
import { AmountBadge } from "@/components/shared/AmountBadge";
import { QueryState } from "@/components/shared/QueryState";
import { formatDate, formatMatchedBy } from "@/lib/utils";
import { useLocale } from "@/i18n";

export const TenantPaymentsView: React.FC = () => {
  const { t } = useLocale();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { data: payments = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: QUERY_KEYS.tenantPayments,
    queryFn: getMyPayments,
    refetchInterval: 30000,
  });

  const handleCopy = (text: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const sorted = [...payments].sort(
    (a, b) => new Date(b.matched_at).getTime() - new Date(a.matched_at).getTime()
  );

  return (
    <div className="bg-surface border border-hairline rounded-2xl overflow-hidden shadow-sm">
      <QueryState
        isLoading={isLoading}
        isError={isError}
        error={error as Error | null}
        isEmpty={!isLoading && !isError && sorted.length === 0}
        loadingMessage={t("tenant.loadingPayments")}
        emptyMessage={t("tenant.noPayments")}
        onRetry={() => refetch()}
      >
        <div className="divide-y divide-hairline">
          {sorted.map((p) => {
            const refId = p.upi_txn_id || p.cf_payment_id || p.provider_payment_id;
            return (
              <div key={p.id} className="px-6 py-4 flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-sm text-ink">{formatMatchedBy(p.matched_by, t)}</p>
                  <p className="text-xs text-ink-muted">{formatDate(p.matched_at)}</p>
                  {refId && (
                    <div className="flex items-center gap-1.5 pt-0.5">
                      <span className="text-[11px] font-mono text-ink-muted select-all">
                        Ref: {refId}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(refId)}
                        title="Copy reference ID"
                        className="p-1 rounded hover:bg-hairline/20 text-ink-muted hover:text-ink transition"
                      >
                        {copiedId === refId ? (
                          <Check className="w-3 h-3 text-success" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  )}
                </div>
                <AmountBadge amount={p.amount} variant="success" />
              </div>
            );
          })}
        </div>
      </QueryState>
    </div>
  );
};
