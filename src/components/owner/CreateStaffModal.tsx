import React, { useState } from "react";
import { X, UserPlus, Loader2, AlertCircle } from "lucide-react";
import { useCreateStaffProfile } from "@/lib/useAttendance";
import { usePayees } from "@/lib/usePayouts";

interface CreateStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

const COMMON_ROLES = [
  "Cook",
  "Warden",
  "Housekeeping",
  "Security Guard",
  "Maintenance",
  "Manager",
  "Other",
];

export const CreateStaffModal: React.FC<CreateStaffModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const [name, setName] = useState("");
  const [role, setRole] = useState("Cook");
  const [customRole, setCustomRole] = useState("");
  const [phone, setPhone] = useState("");
  const [baseWageRupees, setBaseWageRupees] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState(
    () => new Date().toISOString().split("T")[0]
  );
  const [payeeId, setPayeeId] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: payees = [], isLoading: isPayeesLoading } = usePayees();
  const createStaffMutation = useCreateStaffProfile();

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMessage("Please enter staff member name.");
      return;
    }

    const finalRole = role === "Other" ? customRole.trim() : role;
    if (!finalRole) {
      setErrorMessage("Please specify the staff role.");
      return;
    }

    const wageNum = parseFloat(baseWageRupees);
    if (isNaN(wageNum) || wageNum <= 0) {
      setErrorMessage("Please enter a valid positive base monthly wage.");
      return;
    }

    if (!payeeId) {
      setErrorMessage("Please select a payout payee for salary disbursement.");
      return;
    }

    if (!effectiveFrom) {
      setErrorMessage("Please choose an effective start date.");
      return;
    }

    const baseWagePaise = Math.round(wageNum * 100);

    createStaffMutation.mutate(
      {
        name: trimmedName,
        role: finalRole,
        phone: phone.trim() || undefined,
        base_monthly_wage_paise: baseWagePaise,
        effective_from: effectiveFrom,
        payee_id: payeeId,
      },
      {
        onSuccess: () => {
          onCreated?.();
          onClose();
        },
        onError: (err: any) => {
          setErrorMessage(err.message || "Failed to create staff profile.");
        },
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-surface border border-border rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-accent" />
            <h3 className="font-semibold text-text text-base">Add Staff Member</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-text-muted hover:text-text hover:bg-surface-elevated transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {errorMessage && (
            <div className="flex items-center gap-2 p-3 text-sm text-danger-text bg-danger-bg border border-danger-border rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ramesh Kumar"
              className="w-full px-3 py-2 text-sm bg-surface-elevated border border-border rounded-xl text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">
                Role *
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-surface-elevated border border-border rounded-xl text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                {COMMON_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+919876543210"
                className="w-full px-3 py-2 text-sm bg-surface-elevated border border-border rounded-xl text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>

          {role === "Other" && (
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">
                Custom Role Name *
              </label>
              <input
                type="text"
                required
                value={customRole}
                onChange={(e) => setCustomRole(e.target.value)}
                placeholder="e.g. Electrician"
                className="w-full px-3 py-2 text-sm bg-surface-elevated border border-border rounded-xl text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">
                Monthly Wage (₹) *
              </label>
              <input
                type="number"
                step="1"
                min="1"
                required
                value={baseWageRupees}
                onChange={(e) => setBaseWageRupees(e.target.value)}
                placeholder="e.g. 15000"
                className="w-full px-3 py-2 text-sm bg-surface-elevated border border-border rounded-xl text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">
                Start Date *
              </label>
              <input
                type="date"
                required
                value={effectiveFrom}
                onChange={(e) => setEffectiveFrom(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-surface-elevated border border-border rounded-xl text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">
              Disbursement Payee (Bank or UPI) *
            </label>
            {isPayeesLoading ? (
              <div className="text-xs text-text-muted py-2">Loading payees...</div>
            ) : payees.length === 0 ? (
              <div className="p-3 text-xs text-warning bg-warning-tint rounded-xl border border-warning/20">
                No payees registered. Please register a payee under Money Out &gt; Payees first.
              </div>
            ) : (
              <select
                value={payeeId}
                onChange={(e) => setPayeeId(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm bg-surface-elevated border border-border rounded-xl text-text focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
              >
                <option value="">Select a payee...</option>
                {payees.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.upi_vpa ? `UPI: ${p.upi_vpa}` : `A/C: ****${p.account_number_last4 || ""}`})
                    {p.is_verified ? " ✓ Verified" : " ⚠ Unverified"}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-text hover:bg-surface-elevated rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createStaffMutation.isPending || payees.length === 0}
              className="px-4 py-2 text-sm font-medium bg-accent text-white rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
            >
              {createStaffMutation.isPending && (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}
              Save Staff Profile
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
