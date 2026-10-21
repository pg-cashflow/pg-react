import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CreditCard,
  QrCode,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Sparkles,
  Info,
} from "lucide-react";
import {
  getCashfreeReadiness,
  getProperties,
  updatePropertyPaymentMode,
  switchProperty,
} from "@/api/properties";
import { QUERY_KEYS } from "@/lib/queryKeys";
import type { PaymentMode } from "@pg/types";

export const PaymentGatewaySettingsCard: React.FC<{ className?: string; propertyId?: string }> = ({
  className = "",
  propertyId: propIdProp,
}) => {
  const queryClient = useQueryClient();
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(propIdProp || "");
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; message: string } | null>(null);

  // Queries
  const propertiesQuery = useQuery({
    queryKey: QUERY_KEYS.properties,
    queryFn: getProperties,
  });

  const readinessQuery = useQuery({
    queryKey: QUERY_KEYS.cashfreeReadiness,
    queryFn: getCashfreeReadiness,
    refetchInterval: 60000,
  });

  const properties = propertiesQuery.data ?? [];
  const activePropertyId = selectedPropertyId || propIdProp || properties[0]?.id || "";
  const activeProperty = properties.find((p) => p.id === activePropertyId) ?? properties[0];
  const readiness = readinessQuery.data;

  const currentMode: PaymentMode = (activeProperty?.payment_mode as PaymentMode) || readiness?.payment_mode || "manual";

  // Mutation
  const updateMutation = useMutation({
    mutationFn: (newMode: PaymentMode) => updatePropertyPaymentMode(activePropertyId, newMode),
    onSuccess: (_, newMode) => {
      setFeedback({
        type: "ok",
        message:
          newMode === "cashfree"
            ? "Cashfree Web Checkout activated! Tenants will now pay online via instant checkout modal."
            : "Switched to Manual UPI QR mode. Tenants will scan the property QR and submit UTR receipts.",
      });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.properties });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.cashfreeReadiness });
    },
    onError: (err: Error) => {
      setFeedback({
        type: "err",
        message: err.message || "Failed to update payment collection mode",
      });
    },
  });

  const handleToggle = (targetMode: PaymentMode) => {
    if (targetMode === currentMode) return;
    if (targetMode === "cashfree" && !readiness?.ready) {
      setFeedback({
        type: "err",
        message: readiness?.reason || "Cashfree payment gateway credentials are not configured on the server.",
      });
      return;
    }
    setFeedback(null);
    updateMutation.mutate(targetMode);
  };

  return (
    <section className={`bg-surface border border-hairline rounded-2xl p-5 space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-accent shrink-0" />
            <h3 className="font-semibold text-ink text-base">Rent Collection & Gateway Platform</h3>
          </div>
          <p className="text-xs text-ink-muted mt-1">
            Choose how tenants pay rent. Cashfree provides instant online checkout and automated ledger settlement.
          </p>
        </div>

        {properties.length > 1 && !propIdProp && (
          <select
            value={activePropertyId}
            onChange={async (e) => {
              const newId = e.target.value;
              setSelectedPropertyId(newId);
              setFeedback(null);
              try {
                await switchProperty(newId);
                queryClient.invalidateQueries({ queryKey: QUERY_KEYS.properties });
                queryClient.invalidateQueries({ queryKey: QUERY_KEYS.cashfreeReadiness });
              } catch {
                // non-fatal
              }
            }}
            className="px-3 py-1.5 bg-bg border border-hairline rounded-xl text-xs text-ink font-medium self-start sm:self-auto"
          >
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Readiness Badge */}
      <div className="flex items-center gap-2 pt-1">
        {readinessQuery.isLoading ? (
          <div className="flex items-center gap-2 text-xs text-ink-muted">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Checking gateway health...</span>
          </div>
        ) : readiness?.ready ? (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-success-tint border border-success/20 text-success">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>
              Cashfree Online ({readiness.env === "production" ? "Production Live" : "Sandbox Active"})
            </span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Gateway Inactive ({readiness?.reason || "Credentials Required"})</span>
          </div>
        )}
      </div>

      {/* Mode Selection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
        {/* Cashfree Primary */}
        <button
          type="button"
          onClick={() => handleToggle("cashfree")}
          disabled={updateMutation.isPending || (!readiness?.ready && currentMode !== "cashfree")}
          className={`p-4 rounded-xl border text-left transition relative flex flex-col justify-between ${
            currentMode === "cashfree"
              ? "bg-accent/5 border-accent shadow-sm ring-1 ring-accent"
              : "bg-bg border-hairline hover:border-ink/20 opacity-90"
          } ${!readiness?.ready && currentMode !== "cashfree" ? "cursor-not-allowed opacity-60" : ""}`}
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 font-semibold text-sm text-ink">
                <ShieldCheck className="w-4 h-4 text-accent" />
                Cashfree Checkout
              </span>
              <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-accent text-white">
                Primary
              </span>
            </div>
            <p className="text-xs text-ink-muted mt-2">
              Automated modal checkout supporting UPI apps, credit/debit cards, and netbanking. Webhooks settle dues immediately with zero manual UTR verification.
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-hairline/60 flex items-center justify-between text-xs">
            <span className={currentMode === "cashfree" ? "text-accent font-semibold flex items-center gap-1" : "text-ink-muted"}>
              {currentMode === "cashfree" ? "● Currently Active" : "Click to activate"}
            </span>
            <Sparkles className={`w-3.5 h-3.5 ${currentMode === "cashfree" ? "text-accent" : "text-ink-muted"}`} />
          </div>
        </button>

        {/* Manual QR Fallback */}
        <button
          type="button"
          onClick={() => handleToggle("manual")}
          disabled={updateMutation.isPending}
          className={`p-4 rounded-xl border text-left transition relative flex flex-col justify-between ${
            currentMode === "manual"
              ? "bg-accent/5 border-accent shadow-sm ring-1 ring-accent"
              : "bg-bg border-hairline hover:border-ink/20 opacity-90"
          }`}
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 font-semibold text-sm text-ink">
                <QrCode className="w-4 h-4 text-ink-muted" />
                Manual UPI QR Code
              </span>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-bg-muted border border-hairline text-ink-muted">
                Offline Fallback
              </span>
            </div>
            <p className="text-xs text-ink-muted mt-2">
              Tenants scan the property UPI QR code and submit a 12-digit UTR reference number. You manually inspect bank statements to approve payments.
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-hairline/60 flex items-center justify-between text-xs">
            <span className={currentMode === "manual" ? "text-accent font-semibold flex items-center gap-1" : "text-ink-muted"}>
              {currentMode === "manual" ? "● Currently Active" : "Click to activate"}
            </span>
            <Info className={`w-3.5 h-3.5 ${currentMode === "manual" ? "text-accent" : "text-ink-muted"}`} />
          </div>
        </button>
      </div>

      {/* Feedback Messages */}
      {feedback && (
        <div
          className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
            feedback.type === "ok"
              ? "bg-success-tint border border-success/20 text-success"
              : "bg-danger-tint border border-danger/20 text-danger"
          }`}
        >
          {feedback.type === "ok" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {updateMutation.isPending && (
        <div className="flex items-center gap-2 text-xs text-accent">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Updating collection mode on ledger...</span>
        </div>
      )}
    </section>
  );
};
