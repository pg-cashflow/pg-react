import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Loader2,
  AlertCircle,
  Building,
  User,
  Phone,
  Home,
  HeartHandshake,
  Upload,
  ArrowRight,
  LogOut,
  FileCheck,
  MapPin,
  Calendar,
} from "lucide-react";
import { getJoinMe, submitJoinProfile, lookupInvite } from "@/api/join";
import { QUERY_KEYS } from "@/lib/queryKeys";
import { useAuth } from "@/auth/context";
import { getInviteCode } from "@/auth/storage";

import { ThemeToggle } from "@/components/common/ThemeToggle";

export const JoinWaitingPage: React.FC = () => {
  const { logout, user } = useAuth();
  const inviteCode = getInviteCode();

  const [name, setName] = useState("");
  const [permanentAddress, setPermanentAddress] = useState("");
  const [currentAddress, setCurrentAddress] = useState("");
  const [parentName, setParentName] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [idPhoto, setIdPhoto] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const joinDateLabel = new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const meQuery = useQuery({
    queryKey: QUERY_KEYS.joinMe,
    queryFn: getJoinMe,
  });

  const inviteQuery = useQuery({
    queryKey: ["invite-info", inviteCode],
    queryFn: () => (inviteCode ? lookupInvite(inviteCode) : null),
    enabled: !!inviteCode,
  });

  useEffect(() => {
    if (meQuery.data?.join?.name) {
      setName(meQuery.data.join.name);
    }
  }, [meQuery.data?.join?.name]);

  const handleIdUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError("ID photo must be 2MB or smaller.");
      return;
    }
    setIdPhoto(file);
    setError(null);
  };

  const handleSubmitProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    const permanent = permanentAddress.trim();
    const current = currentAddress.trim();
    const parent = parentName.trim();
    const emergency = emergencyPhone.trim();

    if (!trimmedName || !permanent || !current || !parent || !emergency) {
      setError("Please fill all required fields.");
      return;
    }
    if (!/^\+?[0-9\s-]{10,15}$/.test(emergency)) {
      setError("Please enter a valid emergency / parent phone number.");
      return;
    }
    if (!idPhoto) {
      setError("Please upload your Aadhaar / government ID photo.");
      return;
    }
    if (!consent) {
      setError("Consent is required to store your ID photo for PG records.");
      return;
    }

    setSaving(true);
    try {
      await submitJoinProfile({
        name: trimmedName,
        permanent_address: permanent,
        current_address: current,
        parent_name: parent,
        emergency_phone: emergency,
        consent: true,
        image: idPhoto,
      });
      await meQuery.refetch();
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
              Upload your ID and fill your details. You will enter the tenant portal right after — the owner
              assigns room and rent separately.
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
                Personal Mobile Number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-ink-muted">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  disabled
                  value={user?.phone || meQuery.data?.user?.phone || "+91 Logged In Mobile"}
                  className="w-full pl-10 pr-4 py-2.5 bg-surface/40 border border-hairline/50 rounded-xl text-ink-muted text-sm font-mono cursor-not-allowed"
                />
              </div>
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
                  onChange={(e) => setPermanentAddress(e.target.value)}
                  placeholder="Home address, hometown, city & state"
                  className="w-full pl-10 pr-4 py-2 bg-surface/80 border border-hairline/80 rounded-xl text-ink placeholder:text-ink-muted text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-ink mb-1.5 uppercase tracking-wider">
                Current Staying Address *
              </label>
              <div className="relative">
                <div className="absolute top-3 left-0 pl-3.5 flex items-center pointer-events-none text-ink-muted">
                  <MapPin className="w-4 h-4" />
                </div>
                <textarea
                  required
                  rows={2}
                  value={currentAddress}
                  onChange={(e) => setCurrentAddress(e.target.value)}
                  placeholder="Where you are staying now"
                  className="w-full pl-10 pr-4 py-2 bg-surface/80 border border-hairline/80 rounded-xl text-ink placeholder:text-ink-muted text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-ink mb-1.5 uppercase tracking-wider">
                Parent Name *
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

            <div>
              <label className="block text-xs font-medium text-ink mb-1.5 uppercase tracking-wider flex items-center justify-between">
                <span>Aadhaar / Govt ID Photo *</span>
                <span className="text-[10px] text-ink-muted font-normal">No OCR — upload only</span>
              </label>
              <div className="relative border border-dashed border-hairline hover:border-hairline bg-surface/30 rounded-xl p-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-ink truncate">
                  {idPhoto ? (
                    <>
                      <FileCheck className="w-4 h-4 text-success flex-shrink-0" />
                      <span className="truncate">{idPhoto.name}</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 text-ink-muted flex-shrink-0" />
                      <span className="text-ink-muted">Attach photo (max 2MB)</span>
                    </>
                  )}
                </div>
                <label className="px-3 py-1.5 rounded-lg bg-surface hover:bg-surface border border-hairline text-ink text-xs font-medium cursor-pointer transition">
                  {idPhoto ? "Change" : "Browse"}
                  <input type="file" accept="image/*" onChange={handleIdUpload} className="hidden" />
                </label>
              </div>
            </div>

            <label className="flex items-start gap-2.5 text-xs text-ink cursor-pointer">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 rounded border-hairline"
              />
              <span>
                I consent to storing this ID photo with the PG for occupancy records. It is not used for automated
                extraction.
              </span>
            </label>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-3.5 rounded-2xl bg-accent text-white font-bold text-sm hover:bg-accent/90 transition shadow-lg shadow-accent/20 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Submit & Enter Portal
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="flex items-center justify-center pt-1">
            <button
              type="button"
              onClick={logout}
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
