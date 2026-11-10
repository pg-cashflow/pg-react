import React, { useState } from "react";
import { X, UserPlus, Building, Smartphone, Loader2, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useCreatePayee } from "@/lib/usePayouts";
import { getTenants } from "@/api/tenants";
import { QUERY_KEYS } from "@/lib/queryKeys";
import type { PayeeType } from "@pg/types";
import { useLocale } from "@/i18n";

interface CreatePayeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

export const CreatePayeeModal: React.FC<CreatePayeeModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const { t } = useLocale();
  const [name, setName] = useState("");
  const [payeeType, setPayeeType] = useState<PayeeType>("staff");
  const [phone, setPhone] = useState("");
  const [transferType, setTransferType] = useState<"bank" | "upi">("bank");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [bankName, setBankName] = useState("");
  const [upiVpa, setUpiVpa] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: tenants = [], isLoading: isTenantsLoading } = useQuery({
    queryKey: QUERY_KEYS.tenants,
    queryFn: getTenants,
    enabled: isOpen && payeeType === "tenant_deposit",
  });

  const createPayeeMutation = useCreatePayee();

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (payeeType === "tenant_deposit" && !tenantId) {
      setErrorMessage("Please select a tenant for deposit refunds.");
      return;
    }

    if (!name.trim()) {
      setErrorMessage("Please enter payee name.");
      return;
    }

    if (transferType === "bank") {
      if (!accountNumber.trim() || !ifsc.trim()) {
        setErrorMessage("Account number and IFSC code are required for bank transfers.");
        return;
      }
    } else {
      if (!upiVpa.trim()) {
        setErrorMessage("UPI VPA is required.");
        return;
      }
    }

    let cleanPhone = phone.trim();
    if (cleanPhone) {
      const digits = cleanPhone.replace(/\D/g, "");
      if (digits.length === 10) {
        cleanPhone = digits;
      } else if (digits.length === 11 && digits.startsWith("0")) {
        cleanPhone = digits.slice(1);
      } else if (digits.length === 12 && digits.startsWith("91")) {
        cleanPhone = digits.slice(2);
      }
    }

    createPayeeMutation.mutate(
      {
        tenant_id: payeeType === "tenant_deposit" ? tenantId : undefined,
        name: name.trim(),
        payee_type: payeeType,
        phone: cleanPhone || undefined,
        account_number: transferType === "bank" ? accountNumber.trim() : undefined,
        ifsc: transferType === "bank" ? ifsc.trim().toUpperCase() : undefined,
        bank_name: transferType === "bank" ? bankName.trim() || undefined : undefined,
        upi_vpa: transferType === "upi" ? upiVpa.trim().toLowerCase() : undefined,
      },
      {
        onSuccess: () => {
          onCreated?.();
          onClose();
        },
        onError: (err: any) => {
          setErrorMessage(err.message || "Failed to create payee.");
        },
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-surface border border-hairline rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-hairline flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-accent-tint text-accent">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-ink">{t("owner.payees.addTitle")}</h2>
              <p className="text-xs text-ink-muted">{t("owner.payees.addSubtitle")}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-bg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-danger/10 border border-danger/25 text-danger text-sm font-medium">
              {errorMessage}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1">
              {t("owner.payees.payeeType")}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["staff", "vendor", "tenant_deposit"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setPayeeType(type)}
                  className={`py-2 px-3 text-xs font-medium rounded-xl border transition capitalize ${
                    payeeType === type
                      ? "bg-accent-tint text-accent border-accent/40 font-semibold shadow-sm"
                      : "bg-bg text-ink-muted border-hairline hover:text-ink"
                  }`}
                >
                  {type.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          {payeeType === "tenant_deposit" && (
            <div>
              <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1">
                Select Tenant * {/* lint-allow-i18n */}
              </label>
              {isTenantsLoading ? (
                <div className="flex items-center gap-2 px-3.5 py-2.5 bg-bg border border-hairline rounded-xl text-ink-muted text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Loading tenants...</span> {/* lint-allow-i18n */}
                </div>
              ) : (
                <select
                  required
                  value={tenantId}
                  onChange={(e) => {
                    const tid = e.target.value;
                    setTenantId(tid);
                    const selected = tenants.find((t) => t.id === tid);
                    if (selected) {
                      if (!name.trim()) setName(selected.name);
                      if (!phone.trim() && selected.phone) setPhone(selected.phone);
                    }
                  }}
                  className="w-full px-3.5 py-2.5 bg-bg border border-hairline rounded-xl text-ink text-sm focus:outline-none focus:border-accent"
                >
                  <option value="">-- Choose Tenant --</option> {/* lint-allow-i18n */}
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} {t.room_number ? `(Room ${t.room_number})` : ""} {t.status === "vacated" ? "[Vacated]" : ""}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1">
              {t("owner.payees.fullLegalName")}
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Ramesh Kumar"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-bg border border-hairline rounded-xl text-ink text-sm focus:outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1">
              {t("owner.payees.phoneOptional")}
            </label>
            <input
              type="tel"
              placeholder="+91 98765 43210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-bg border border-hairline rounded-xl text-ink text-sm focus:outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1">
              {t("owner.payees.paymentDestination")}
            </label>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                type="button"
                onClick={() => setTransferType("bank")}
                className={`py-2.5 px-3 text-xs font-medium rounded-xl border flex items-center justify-center gap-2 transition ${
                  transferType === "bank"
                    ? "bg-accent-tint text-accent border-accent/40 font-semibold"
                    : "bg-bg text-ink-muted border-hairline hover:text-ink"
                }`}
              >
                <Building className="w-4 h-4" />
                {t("owner.payees.bankAccount")}
              </button>
              <button
                type="button"
                onClick={() => setTransferType("upi")}
                className={`py-2.5 px-3 text-xs font-medium rounded-xl border flex items-center justify-center gap-2 transition ${
                  transferType === "upi"
                    ? "bg-accent-tint text-accent border-accent/40 font-semibold"
                    : "bg-bg text-ink-muted border-hairline hover:text-ink"
                }`}
              >
                <Smartphone className="w-4 h-4" />
                {t("owner.payees.upiVpa")}
              </button>
            </div>

            {transferType === "bank" ? (
              <div className="space-y-3">
                <div>
                  <input
                    type="text"
                    required
                    placeholder={t("owner.payees.bankAccountNumber")}
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-bg border border-hairline rounded-xl text-ink text-sm focus:outline-none focus:border-accent"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    required
                    placeholder={t("owner.payees.ifscCode")}
                    value={ifsc}
                    onChange={(e) => setIfsc(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-bg border border-hairline rounded-xl text-ink text-sm uppercase focus:outline-none focus:border-accent"
                  />
                  <input
                    type="text"
                    placeholder={t("owner.payees.bankNameOptional")}
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-bg border border-hairline rounded-xl text-ink text-sm focus:outline-none focus:border-accent"
                  />
                </div>
              </div>
            ) : (
              <div>
                <input
                  type="text"
                  required
                  placeholder="name@okaxis or 9876543210@upi"
                  value={upiVpa}
                  onChange={(e) => setUpiVpa(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-bg border border-hairline rounded-xl text-ink text-sm focus:outline-none focus:border-accent"
                />
              </div>
            )}
          </div>

          <div className="p-3 bg-bg border border-hairline rounded-xl text-ink-muted text-xs flex items-start gap-2">
            <Clock className="w-4 h-4 text-warning shrink-0 mt-0.5" />
            <span>
              <strong>{t("owner.payee.coolingOffNoticeTitle")}</strong> {t("owner.payee.coolingOffNoticeDesc")}
            </span>
          </div>

          <div className="pt-4 border-t border-hairline flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={createPayeeMutation.isPending}
              className="px-4 py-2.5 rounded-xl border border-hairline text-ink text-sm font-medium hover:bg-bg transition"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={createPayeeMutation.isPending}
              className="px-5 py-2.5 rounded-xl bg-accent text-accent-contrast text-sm font-semibold hover:opacity-90 transition disabled:opacity-50 flex items-center gap-2 shadow-sm"
            >
              {createPayeeMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t("owner.payees.saving")}
                </>
              ) : (
                t("owner.payees.savePayee")
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
