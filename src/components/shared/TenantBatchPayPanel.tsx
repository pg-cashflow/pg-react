import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, CreditCard, Loader2, RefreshCw } from "lucide-react";
import type { PayIntent, PaymentOption, PaymentOptionType } from "@pg/types";
import { getTenantDueOptions } from "@/api/tenant";
import { createTenantDuePayBatch, verifyTenantOrderPay } from "@/api/pay";
import { QUERY_KEYS } from "@/lib/queryKeys";
import { preloadCashfreeSdk, startCashfreeCheckout } from "@/lib/cashfree";
import { formatPaise } from "@/lib/utils";
import { formatApiError, useLocale } from "@/i18n";

type BatchState = "READY" | "OPENING" | "CHECKOUT_OPEN" | "CHECKING" | "PAID" | "STILL_PENDING";

function sameDueSet(a: readonly string[] | undefined, b: readonly string[]): boolean {
  if (!a || a.length !== b.length) return false;
  const setA = new Set(a);
  if (setA.size !== b.length) return false;
  for (const id of b) {
    if (!setA.has(id)) return false;
  }
  return true;
}

function defaultOptionType(options: PaymentOption[]): PaymentOptionType | null {
  if (options.length === 0) return null;
  // Default to oldest_2 when 3+ open dues exist so the primary CTA never defaults to paying all.
  const oldest2 = options.find((o) => o.option_type === "oldest_2");
  if (oldest2) return oldest2.option_type;
  return options[0].option_type;
}

export const TenantBatchPayPanel: React.FC<{ onPaid?: () => void }> = ({ onPaid }) => {
  const { t } = useLocale();
  const queryClient = useQueryClient();

  const optionsQuery = useQuery({
    queryKey: QUERY_KEYS.tenantDueOptions,
    queryFn: getTenantDueOptions,
  });

  const options = useMemo(() => optionsQuery.data ?? [], [optionsQuery.data]);
  const [selectedType, setSelectedType] = useState<PaymentOptionType | null>(null);
  const [state, setState] = useState<BatchState>("READY");
  const [error, setError] = useState<string | null>(null);
  const [lastOrderId, setLastOrderId] = useState<string | null>(null);
  const [lastDueIds, setLastDueIds] = useState<string[]>([]);
  const inFlightRef = useRef(false);

  const activeType = useMemo<PaymentOptionType | null>(() => {
    if (selectedType && options.some((o) => o.option_type === selectedType)) {
      return selectedType;
    }
    return defaultOptionType(options);
  }, [options, selectedType]);

  const selectedOption = useMemo(
    () => options.find((o) => o.option_type === activeType) ?? null,
    [options, activeType]
  );

  useEffect(() => {
    if (options.length > 1) {
      preloadCashfreeSdk().catch(() => {});
    }
  }, [options.length]);

  const verifyOrder = useCallback(
    async (orderId: string, expectedDueIds: string[]) => {
      setState("CHECKING");
      try {
        const res = await verifyTenantOrderPay(orderId);
        if (res.paid && sameDueSet(res.due_ids, expectedDueIds)) {
          setState("PAID");
          setError(null);
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tenantDues });
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tenantDueOptions });
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tenantPayments });
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tenantProfile });
          onPaid?.();
          return;
        }
        setState("STILL_PENDING");
      } catch (err) {
        setError(formatApiError(err, t));
        setState("STILL_PENDING");
      }
    },
    [onPaid, queryClient, t]
  );

  const handlePayBatch = async () => {
    if (!selectedOption || inFlightRef.current || state === "STILL_PENDING") return;
    inFlightRef.current = true;
    setError(null);
    setState("OPENING");

    try {
      const idempKey = `batch_${selectedOption.option_type}_${selectedOption.due_ids.join("_")}`;
      const intent: PayIntent = await createTenantDuePayBatch(
        {
          option_type: selectedOption.option_type,
          due_ids: selectedOption.due_ids,
        },
        idempKey
      );

      if (
        intent.mode !== "cashfree" ||
        !intent.payable ||
        !intent.order_id ||
        !intent.payment_session_id ||
        !sameDueSet(intent.due_ids, selectedOption.due_ids) ||
        (intent.due_count !== undefined && intent.due_count !== selectedOption.due_ids.length)
      ) {
        setError(t("tenant.dues.batchUnavailable"));
        setState("READY");
        return;
      }

      const orderId = intent.order_id;
      setLastOrderId(orderId);
      setLastDueIds(selectedOption.due_ids);
      setState("CHECKOUT_OPEN");

      await startCashfreeCheckout(intent.payment_session_id);
      if (orderId) {
        await verifyOrder(orderId, selectedOption.due_ids);
      } else {
        setState("STILL_PENDING");
      }
    } catch (err) {
      setError(formatApiError(err, t));
      setState(lastOrderId ? "STILL_PENDING" : "READY");
    } finally {
      inFlightRef.current = false;
    }
  };

  if (optionsQuery.isLoading && options.length === 0) {
    return null;
  }

  if (optionsQuery.isError && options.length === 0) {
    return (
      <section
        aria-label={t("tenant.dues.batchTitle")}
        role="alert"
        className="rounded-[14px] border border-danger/20 bg-danger-tint p-4 flex items-center justify-between gap-3"
      >
        <div className="flex items-center gap-2 text-xs text-danger">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{formatApiError(optionsQuery.error, t)}</span>
        </div>
        <button
          type="button"
          onClick={() => void optionsQuery.refetch()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-danger/30 bg-surface text-xs font-medium text-ink hover:bg-bg shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          {t("common.retry")}
        </button>
      </section>
    );
  }

  if (options.length < 2 || !selectedOption) {
    return null;
  }

  return (
    <section
      aria-label={t("tenant.dues.batchTitle")}
      className="rounded-[14px] border border-hairline bg-surface p-4 space-y-3"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="t-body font-semibold text-ink">{t("tenant.dues.batchTitle")}</h2>
          <p className="t-caption text-ink-muted mt-0.5">{t("tenant.dues.batchSubtitle")}</p>
        </div>
        <CreditCard className="w-5 h-5 text-accent shrink-0" />
      </div>

      {optionsQuery.isError && (
        <div
          role="alert"
          className="flex items-center justify-between gap-2 rounded-[10px] bg-warning-tint/40 border border-warning/30 p-2.5 text-xs text-warning"
        >
          <span>{formatApiError(optionsQuery.error, t)}</span>
          <button
            type="button"
            onClick={() => void optionsQuery.refetch()}
            className="inline-flex items-center gap-1 px-2 py-1 rounded border border-warning/40 font-medium hover:bg-warning-tint/60 shrink-0"
          >
            <RefreshCw className="w-3 h-3" />
            {t("common.retry")}
          </button>
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label={t("tenant.dues.batchTitle")}>
        {options.map((opt) => {
          const isSelected = opt.option_type === selectedOption.option_type;
          return (
            <button
              key={opt.option_type}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={state === "OPENING" || state === "CHECKOUT_OPEN" || state === "CHECKING" || state === "STILL_PENDING"}
              onClick={() => {
                setSelectedType(opt.option_type);
                setError(null);
              }}
              className={`text-left rounded-[10px] border p-3 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                isSelected
                  ? "border-accent bg-accent-tint/50"
                  : "border-hairline bg-bg hover:border-accent/40"
              } disabled:opacity-60`}
            >
              <div className="t-body-sm font-medium text-ink">{opt.label}</div>
              <div className="t-caption text-ink-muted mt-0.5">
                {t("tenant.dues.batchDuesCount", { count: opt.due_count })}
              </div>
              <div className="t-body font-semibold text-ink mt-1">
                {formatPaise(opt.amount_paise)}
              </div>
            </button>
          );
        })}
      </div>

      {error && (
        <div role="alert" className="flex items-center gap-2 rounded-[10px] bg-danger-tint border border-danger/20 p-3 text-xs text-danger">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {state === "PAID" && (
        <div role="status" className="flex items-center gap-2 rounded-[10px] bg-success-tint border border-success/20 p-3 text-xs text-success">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{t("tenant.dues.batchPaid")}</span>
        </div>
      )}

      {state === "STILL_PENDING" && (
        <div role="status" className="flex items-center justify-between gap-3 rounded-[10px] bg-warning-tint/40 border border-warning/30 p-3 text-xs text-warning">
          <span>{t("tenant.dues.batchPending")}</span>
          {lastOrderId && (
            <button
              type="button"
              onClick={() => void verifyOrder(lastOrderId, lastDueIds)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-warning/40 font-medium hover:bg-warning-tint/60 shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              {t("tenant.dues.batchCheckAgain")}
            </button>
          )}
        </div>
      )}

      {state !== "PAID" && state !== "STILL_PENDING" && (
        <button
          type="button"
          onClick={() => void handlePayBatch()}
          disabled={state === "OPENING" || state === "CHECKOUT_OPEN" || state === "CHECKING"}
          className="w-full py-2.5 px-4 rounded-[10px] bg-accent text-white t-body-sm font-semibold hover:bg-accent/90 disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {(state === "OPENING" || state === "CHECKOUT_OPEN" || state === "CHECKING") && (
            <Loader2 className="w-4 h-4 animate-spin" />
          )}
          {state === "OPENING" || state === "CHECKOUT_OPEN"
            ? t("tenant.dues.batchOpening")
            : state === "CHECKING"
              ? t("tenant.dues.batchChecking")
              : t("tenant.dues.batchPayCta", { amount: formatPaise(selectedOption.amount_paise) })}
        </button>
      )}
    </section>
  );
};
