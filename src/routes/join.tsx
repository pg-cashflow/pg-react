import React, { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Loader2,
  AlertCircle,
  Building,
  User,
  Phone,
  Home,
  HeartHandshake,
  ArrowRight,
  LogOut,
  MapPin,
  Calendar,
  ChevronDown,
} from "lucide-react";
import { getJoinMe, submitJoinProfile, lookupInvite } from "@/api/join";
import { QUERY_KEYS } from "@/lib/queryKeys";
import { useAuth } from "@/auth/context";
import { getAccessToken } from "@/auth/tokenStore";
import { getInviteCode } from "@/auth/storage";
import { ThemeToggle } from "@/components/common/ThemeToggle";

const DRAFT_KEY = "pg_join_draft";

interface JoinDraft {
  name?: string;
  personalPhone?: string;
  permanentAddress?: string;
  currentAddress?: string;
  sameAsPermanent?: boolean;
  parentName?: string;
  parentRelation?: string;
  emergencyPhone?: string;
  consent?: boolean;
}

function getStoredDraft(): JoinDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export const JoinWaitingPage: React.FC = () => {
  const navigate = useNavigate();
  const { logout, user, triggerActivation, applySession } = useAuth();
  const inviteCode = getInviteCode();
  const draft = getStoredDraft();

  const meQuery = useQuery({
    queryKey: QUERY_KEYS.joinMe,
    queryFn: getJoinMe,
  });

  const inviteQuery = useQuery({
    queryKey: ["invite-info", inviteCode],
    queryFn: () => (inviteCode ? lookupInvite(inviteCode) : null),
    enabled: !!inviteCode,
  });

  const isPhoneFixed = Boolean(
    (user?.phone && !user.phone.startsWith("+G")) ||
    (meQuery.data?.user?.phone && !meQuery.data.user.phone.startsWith("+G"))
  );
  const fixedPhone =
    (user?.phone && !user.phone.startsWith("+G") ? user.phone : null) ||
    (meQuery.data?.user?.phone && !meQuery.data.user.phone.startsWith("+G") ? meQuery.data.user.phone : "");

  const [name, setName] = useState(() => draft?.name || "");
  const [permanentAddress, setPermanentAddress] = useState(() => draft?.permanentAddress || "");
  const [currentAddress, setCurrentAddress] = useState(() => draft?.currentAddress || "");
  const [parentName, setParentName] = useState(() => draft?.parentName || "");
  const [emergencyPhone, setEmergencyPhone] = useState(() => draft?.emergencyPhone || "");
  const [personalPhone, setPersonalPhone] = useState(() => draft?.personalPhone || fixedPhone || "");
  const [sameAsPermanent, setSameAsPermanent] = useState(() => draft?.sameAsPermanent ?? false);
  const [parentRelation, setParentRelation] = useState(() => draft?.parentRelation || "Father");
  const [consent, setConsent] = useState(() => draft?.consent ?? false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const joinDateLabel = new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  // Save draft on every change
  useEffect(() => {
    try {
      const data: JoinDraft = {
        name,
        personalPhone,
        permanentAddress,
        currentAddress,
        sameAsPermanent,
        parentName,
        parentRelation,
        emergencyPhone,
        consent,
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
    } catch {
      // Storage unavailable or quota exceeded
    }
  }, [
    name,
    personalPhone,
    permanentAddress,
    currentAddress,
    sameAsPermanent,
    parentName,
    parentRelation,
    emergencyPhone,
    consent,
  ]);

  useEffect(() => {
    const j = meQuery.data?.join;
    if (j) {
      if (j.name && !name) setName(j.name);
      if (j.permanent_address && !permanentAddress) setPermanentAddress(j.permanent_address);
      if (j.current_address && !currentAddress) setCurrentAddress(j.current_address);
      if (j.parent_name && !parentName) setParentName(j.parent_name);
      if (j.emergency_phone && !emergencyPhone) setEmergencyPhone(j.emergency_phone);
    }
    if (fixedPhone && !personalPhone) {
      setPersonalPhone(fixedPhone);
    }
  }, [meQuery.data?.join, fixedPhone, personalPhone, name, permanentAddress, currentAddress, parentName, emergencyPhone]);

  const handleSubmitProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    const trimmedPhone = (personalPhone.trim() || fixedPhone).trim();
    const permanent = permanentAddress.trim();
    const current = (sameAsPermanent ? permanent : currentAddress).trim();
    const parent = parentName.trim();
    const emergency = emergencyPhone.trim();

    if (!trimmedName || !trimmedPhone || !permanent || !current || !parent || !emergency) {
      setError("Please fill all required fields.");
      return;
    }
    if (!/^\+?[0-9\s-]{10,15}$/.test(trimmedPhone)) {
      setError("Please enter a valid personal mobile number.");
      return;
    }
    if (!/^\+?[0-9\s-]{10,15}$/.test(emergency)) {
      setError("Please enter a valid emergency / parent phone number.");
      return;
    }
    if (!consent) {
      setError("Consent is required to store your details for PG records.");
      return;
    }

    setSaving(true);
    try {
      const formattedParent = parentRelation ? `${parent} (${parentRelation})` : parent;

      const res = await submitJoinProfile({
        name: trimmedName,
        phone: trimmedPhone,
        permanent_address: permanent,
        current_address: current,
        parent_name: formattedParent,
        guardian_relation: parentRelation,
        emergency_phone: emergency,
        consent: true,
      });

      if (res.token) {
        const sessionUser = res.user ?? {
          id: user?.id ?? "",
          phone: user?.phone ?? "",
          role: "tenant",
          tenant_id: res.tenant?.id,
          property_id: res.tenant?.property_id,
        };
        applySession(res.token, sessionUser);
      } else if (res.tenant?.id && user) {
        const currentToken = getAccessToken();
        if (currentToken) {
          applySession(
            currentToken,
            {
              ...user,
              tenant_id: res.tenant.id,
              property_id: res.tenant.property_id ?? user.property_id,
            }
          );
        }
      }

      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {}
      await meQuery.refetch();
      triggerActivation();
      navigate({ to: "/tenant" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "w-full pl-10 pr-4 py-2.5 bg-bg border border-hairline rounded-xl text-ink placeholder-ink-faint text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition";

  return (
    <div className="min-h-screen bg-bg text-ink flex flex-col items-center justify-center p-4 sm:p-6 relative transition-colors">
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-lg bg-surface border border-hairline rounded-3xl shadow-xl p-6 sm:p-8 relative z-10 space-y-6 transition-colors">
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-ink-muted">
            <span className="flex items-center gap-1.5 font-medium text-accent">
              <Building className="w-3.5 h-3.5" />
              {inviteQuery.data?.property_name || "PG / Hostel Onboarding"}
            </span>
            {inviteQuery.data?.owner_name && (
              <span className="text-[11px] text-ink-muted">Owner: {inviteQuery.data.owner_name}</span>
            )}
          </div>
        </div>

        {error && (
          <div className="p-3.5 rounded-2xl bg-danger-tint border border-danger/20 text-danger text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        <div className="space-y-5">
          <div>
            <h1 className="t-h1 flex items-center gap-2">
              <User className="w-5 h-5 text-accent" />
              Tenant Registration
            </h1>
            <p className="text-xs text-ink-muted mt-1 leading-relaxed">
              Fill in your details to register. You will complete KYC verification right after before entering the dashboard.
            </p>
          </div>

          <form onSubmit={handleSubmitProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-ink mb-1.5 uppercase tracking-wider">
                Full Name *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-ink-muted">
                  <User className="w-4 h-4" />
                </div>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-ink mb-1.5 uppercase tracking-wider">
                Personal Mobile Number *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-ink-muted">
                  <Phone className="w-4 h-4" />
                </div>
                {isPhoneFixed ? (
                  <input
                    disabled
                    value={fixedPhone}
                    className="w-full pl-10 pr-4 py-2.5 bg-surface/40 border border-hairline/50 rounded-xl text-ink-muted text-sm font-mono cursor-not-allowed"
                  />
                ) : (
                  <input
                    type="tel"
                    required
                    placeholder="+91 98765 43210"
                    value={personalPhone}
                    onChange={(e) => setPersonalPhone(e.target.value)}
                    className={inputClass}
                  />
                )}
              </div>
              {!isPhoneFixed && (
                <p className="text-[11px] text-ink-faint mt-1">
                  Enter your active mobile number for PG communication and rent receipts
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-ink mb-1.5 uppercase tracking-wider">
                Permanent / Home Address *
              </label>
              <div className="relative">
                <div className="absolute top-3 left-0 pl-3.5 flex items-center pointer-events-none text-ink-muted">
                  <Home className="w-4 h-4" />
                </div>
                <textarea
                  required
                  rows={2}
                  value={permanentAddress}
                  onChange={(e) => {
                    const val = e.target.value;
                    setPermanentAddress(val);
                    if (sameAsPermanent) {
                      setCurrentAddress(val);
                    }
                  }}
                  placeholder="Home address, hometown, city & state"
                  className="w-full pl-10 pr-4 py-2 bg-surface/80 border border-hairline/80 rounded-xl text-ink placeholder:text-ink-muted text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
                <label className="text-xs font-medium text-ink uppercase tracking-wider">
                  Current Staying Address *
                </label>
                <label className="inline-flex items-center gap-1.5 text-xs text-accent cursor-pointer select-none font-medium">
                  <input
                    type="checkbox"
                    checked={sameAsPermanent}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setSameAsPermanent(checked);
                      if (checked) {
                        setCurrentAddress(permanentAddress);
                      }
                    }}
                    className="rounded border-hairline text-accent focus:ring-accent"
                  />
                  <span>Same as permanent address</span>
                </label>
              </div>
              <div className="relative">
                <div className="absolute top-3 left-0 pl-3.5 flex items-center pointer-events-none text-ink-muted">
                  <MapPin className="w-4 h-4" />
                </div>
                <textarea
                  required
                  rows={2}
                  disabled={sameAsPermanent}
                  value={sameAsPermanent ? permanentAddress : currentAddress}
                  onChange={(e) => setCurrentAddress(e.target.value)}
                  placeholder={sameAsPermanent ? "Matches permanent address" : "Where you are staying now"}
                  className={`w-full pl-10 pr-4 py-2 border rounded-xl text-ink text-sm transition ${
                    sameAsPermanent
                      ? "bg-surface/30 border-hairline/40 text-ink-muted cursor-not-allowed"
                      : "bg-surface/80 border-hairline/80 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
                  }`}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-ink mb-1.5 uppercase tracking-wider">
                  Parent / Guardian Name *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-ink-muted">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    required
                    value={parentName}
                    onChange={(e) => setParentName(e.target.value)}
                    placeholder="Parent / guardian full name"
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-ink mb-1.5 uppercase tracking-wider">
                  Relation *
                </label>
                <div className="relative">
                  <select
                    value={parentRelation}
                    onChange={(e) => setParentRelation(e.target.value)}
                    className="w-full pl-3.5 pr-8 py-2.5 bg-bg border border-hairline rounded-xl text-ink text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition appearance-none cursor-pointer"
                  >
                    <option value="Father">Father</option>
                    <option value="Mother">Mother</option>
                    <option value="Guardian">Guardian</option>
                    <option value="Spouse">Spouse</option>
                    <option value="Other">Other</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-ink-muted">
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-ink mb-1.5 uppercase tracking-wider">
                Emergency / Parent Phone *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-ink-muted">
                  <HeartHandshake className="w-4 h-4" />
                </div>
                <input
                  required
                  type="tel"
                  value={emergencyPhone}
                  onChange={(e) => setEmergencyPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-ink mb-1.5 uppercase tracking-wider">
                Join Date
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-ink-muted">
                  <Calendar className="w-4 h-4" />
                </div>
                <input
                  disabled
                  value={joinDateLabel}
                  className="w-full pl-10 pr-4 py-2.5 bg-surface/40 border border-hairline/50 rounded-xl text-ink-muted text-sm cursor-not-allowed"
                />
              </div>
              <p className="text-[11px] text-ink-muted mt-1">Defaults to today (the day you register).</p>
            </div>

            <label className="flex items-start gap-2.5 text-xs text-ink cursor-pointer pt-2">
              <input
                type="checkbox"
                required
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 rounded border-hairline text-accent focus:ring-accent"
              />
              <span>
                I agree to the PG storing my details for occupancy records under DPDP Act compliance.
              </span>
            </label>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-3.5 rounded-2xl bg-accent text-white font-bold text-sm hover:bg-accent-pressed transition shadow-lg shadow-accent/20 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Save Profile & Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="flex items-center justify-center pt-1">
            <button
              type="button"
              onClick={() => {
                try {
                  localStorage.removeItem(DRAFT_KEY);
                } catch {}
                logout();
              }}
              className="text-xs text-danger hover:text-danger flex items-center gap-1"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
