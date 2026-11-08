import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getTenantMealRSVP,
  submitTenantMealRSVP,
  getTenantMenuPoll,
  voteMenuPoll,
  reportTenantHazard,
  getTenantLeaderboard,
  getTenantInspections,
  disputeInspectionItem,
  getTenantViolations,
  getTenantReferrals,
} from "@/api/gamification";
import { QUERY_KEYS } from "@/lib/queryKeys";
import {
  Utensils,
  Vote,
  AlertTriangle,
  Trophy,
  CheckCircle2,
  XCircle,
  Sparkles,
  Loader2,
  ShieldCheck,
  Flame,
} from "lucide-react";
import { useLocale } from "@/i18n";

export const TenantCommunityView: React.FC = () => {
  const { t } = useLocale();
  const queryClient = useQueryClient();

  // Active section tab: meals | poll | hazards | inspections | leaderboard
  const [tab, setTab] = useState<
    "meals" | "poll" | "hazards" | "inspections" | "leaderboard" | "referrals" | "violations"
  >("meals");

  // Meal RSVP state
  const [rsvpB, setRsvpB] = useState(true);
  const [rsvpL, setRsvpL] = useState(true);
  const [rsvpD, setRsvpD] = useState(true);
  const [rsvpMsg, setRsvpMsg] = useState<string | null>(null);

  // Hazard report state
  const [hzCat, setHzCat] = useState("Water leakage / Plumbing");
  const [hzDesc, setHzDesc] = useState("");
  const [hzPhoto, setHzPhoto] = useState<File | null>(null);
  const [hzMsg, setHzMsg] = useState<string | null>(null);

  // Dispute modal state
  const [disputingItemId, setDisputingItemId] = useState<string | null>(null);
  const [disputeNote, setDisputeNote] = useState("");

  // Queries
  const rsvpQuery = useQuery({
    queryKey: QUERY_KEYS.tenantMealRSVP,
    queryFn: getTenantMealRSVP,
  });

  const pollQuery = useQuery({
    queryKey: QUERY_KEYS.tenantMenuPoll,
    queryFn: getTenantMenuPoll,
  });

  const inspectionsQuery = useQuery({
    queryKey: QUERY_KEYS.tenantInspections,
    queryFn: getTenantInspections,
  });

  const leaderboardQuery = useQuery({
    queryKey: QUERY_KEYS.tenantLeaderboard,
    queryFn: getTenantLeaderboard,
  });
  const referralsQuery = useQuery({
    queryKey: QUERY_KEYS.tenantReferrals,
    queryFn: getTenantReferrals,
  });
  const violationsQuery = useQuery({
    queryKey: QUERY_KEYS.tenantViolations,
    queryFn: getTenantViolations,
  });

  // Mutations
  const saveRsvpMutation = useMutation({
    mutationFn: async () => {
      const date = rsvpQuery.data?.date || new Date(Date.now() + 86400000).toISOString().slice(0, 10);
      await submitTenantMealRSVP({ date, slot: "breakfast", attending: rsvpB });
      await submitTenantMealRSVP({ date, slot: "lunch", attending: rsvpL });
      await submitTenantMealRSVP({ date, slot: "dinner", attending: rsvpD });
    },
    onSuccess: () => {
      setRsvpMsg("RSVPs saved! Kitchen attendance updated.");
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tenantMealRSVP });
    },
    onError: (err: Error) => setRsvpMsg(`Failed: ${err.message}`),
  });

  const voteMutation = useMutation({
    mutationFn: ({ pollId, optionId }: { pollId: string; optionId: string }) =>
      voteMenuPoll({ poll_id: pollId, option_id: optionId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tenantMenuPoll });
    },
  });

  const reportHazardMutation = useMutation({
    mutationFn: async () => {
      if (!hzDesc.trim()) throw new Error("Please enter a description");
      return reportTenantHazard({
        category: hzCat,
        description: hzDesc,
        photo: hzPhoto,
      });
    },
    onSuccess: () => {
      setHzMsg("Hazard submitted anonymously! 25 points will be credited when resolved.");
      setHzDesc("");
      setHzPhoto(null);
    },
    onError: (err: Error) => setHzMsg(err.message),
  });

  const disputeMutation = useMutation({
    mutationFn: async () => {
      if (!disputingItemId || !disputeNote.trim()) throw new Error("Please provide a dispute note");
      return disputeInspectionItem(disputingItemId, disputeNote);
    },
    onSuccess: () => {
      setDisputingItemId(null);
      setDisputeNote("");
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tenantInspections });
    },
  });

  return (
    <div className="space-y-6">
      {/* Header Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-surface border border-hairline rounded-2xl overflow-x-auto">
        <button
          onClick={() => setTab("meals")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            tab === "meals" ? "bg-accent text-accent-contrast shadow-md" : "text-ink-muted hover:text-ink"
          }`}
        >
          <Utensils className="w-4 h-4" />
          <span>{t("tenant.community.tabMealRsvp")}</span>
        </button>
        <button
          onClick={() => setTab("poll")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            tab === "poll" ? "bg-accent text-accent-contrast shadow-md" : "text-ink-muted hover:text-ink"
          }`}
        >
          <Vote className="w-4 h-4" />
          <span>{t("tenant.community.tabMenuPoll")}</span>
        </button>
        <button
          onClick={() => setTab("inspections")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            tab === "inspections" ? "bg-accent text-accent-contrast shadow-md" : "text-ink-muted hover:text-ink"
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>{t("tenant.community.tabCleanliness")}</span>
        </button>
        <button
          onClick={() => setTab("hazards")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            tab === "hazards" ? "bg-accent text-accent-contrast shadow-md" : "text-ink-muted hover:text-ink"
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>{t("tenant.community.tabReportHazard")}</span>
        </button>
        <button
          onClick={() => setTab("leaderboard")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            tab === "leaderboard" ? "bg-accent text-accent-contrast shadow-md" : "text-ink-muted hover:text-ink"
          }`}
        >
          <Trophy className="w-4 h-4" />
          <span>{t("tenant.community.tabLeaderboard")}</span>
        </button>
        <button
          onClick={() => setTab("referrals")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            tab === "referrals" ? "bg-accent text-accent-contrast shadow-md" : "text-ink-muted hover:text-ink"
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>{t("tenant.community.tabReferrals")}</span>
        </button>
        <button
          onClick={() => setTab("violations")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            tab === "violations" ? "bg-accent text-accent-contrast shadow-md" : "text-ink-muted hover:text-ink"
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>{t("tenant.community.tabViolations")}</span>
        </button>
      </div>

      {/* 1. Meal RSVP Tab */}
      {tab === "meals" && (
        <div className="max-w-xl bg-surface border border-hairline rounded-2xl p-6 space-y-5">
          <div className="border-b border-hairline pb-4">
            <h2 className="text-base font-bold text-ink flex items-center gap-2">
              <Utensils className="w-5 h-5 text-accent" />
              Tomorrow's Meal RSVP
            </h2>
            <p className="text-xs text-ink-muted mt-1">
              Help reduce food waste in the PG mess. Daily dinner cutoff is strictly at 20:00.
            </p>
          </div>

          {rsvpMsg && (
            <div className="p-3 rounded-xl bg-success-tint border border-success/20 text-success text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{rsvpMsg}</span>
            </div>
          )}

          <div className="space-y-3">
            <label className="p-3.5 rounded-xl bg-bg border border-hairline/60 flex items-center justify-between cursor-pointer hover:bg-accent-tint transition">
              <div>
                <span className="font-semibold text-xs text-ink block">{t("tenant.community.mealBreakfast")}</span>
                <span className="t-micro text-ink-muted">{t("tenant.community.mealBreakfastTime")}</span>
              </div>
              <input
                type="checkbox"
                checked={rsvpB}
                onChange={(e) => setRsvpB(e.target.checked)}
                className="w-4 h-4 rounded border-hairline text-accent focus:ring-accent"
              />
            </label>

            <label className="p-3.5 rounded-xl bg-bg border border-hairline/60 flex items-center justify-between cursor-pointer hover:bg-accent-tint transition">
              <div>
                <span className="font-semibold text-xs text-ink block">{t("tenant.community.mealLunch")}</span>
                <span className="t-micro text-ink-muted">{t("tenant.community.mealLunchTime")}</span>
              </div>
              <input
                type="checkbox"
                checked={rsvpL}
                onChange={(e) => setRsvpL(e.target.checked)}
                className="w-4 h-4 rounded border-hairline text-accent focus:ring-accent"
              />
            </label>

            <label className="p-3.5 rounded-xl bg-bg border border-hairline/60 flex items-center justify-between cursor-pointer hover:bg-accent-tint transition">
              <div>
                <span className="font-semibold text-xs text-ink block">{t("tenant.community.mealDinner")}</span>
                <span className="t-micro text-ink-muted">{t("tenant.community.mealDinnerTime")}</span>
              </div>
              <input
                type="checkbox"
                checked={rsvpD}
                onChange={(e) => setRsvpD(e.target.checked)}
                className="w-4 h-4 rounded border-hairline text-accent focus:ring-accent"
              />
            </label>
          </div>

          <button
            onClick={() => saveRsvpMutation.mutate()}
            disabled={saveRsvpMutation.isPending}
            className="w-full py-3 rounded-xl bg-accent text-accent-contrast font-bold text-xs hover:bg-accent/90 transition shadow-lg shadow-accent/20 flex items-center justify-center gap-2"
          >
            {saveRsvpMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            <span>{t("tenant.community.saveTomorrowAttendance")}</span>
          </button>
        </div>
      )}

      {/* 2. Menu Poll Tab */}
      {tab === "poll" && (
        <div className="max-w-xl bg-surface border border-hairline rounded-2xl p-6 space-y-5">
          <div className="border-b border-hairline pb-4">
            <h2 className="text-base font-bold text-ink flex items-center gap-2">
              <Vote className="w-5 h-5 text-accent" />
              Monthly Menu Choice Poll
            </h2>
            <p className="text-xs text-ink-muted mt-1">
              Vote on your preferred weekend specials for the upcoming month.
            </p>
          </div>

          {!pollQuery.data?.poll ? (
            <p className="text-xs text-ink-muted">{t("tenant.community.noActiveMenuPoll")}</p>
          ) : (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-ink uppercase tracking-wider">
                {pollQuery.data.poll.title}
              </h3>
              {pollQuery.data.poll.options?.map((opt) => (
                <div
                  key={opt.id}
                  className="p-4 rounded-xl bg-bg border border-hairline/60 flex items-center justify-between hover:border-hairline transition"
                >
                  <div>
                    <h4 className="text-xs font-bold text-ink">{opt.title}</h4>
                    {opt.description && <p className="t-micro text-ink-muted mt-0.5">{opt.description}</p>}
                  </div>
                  <button
                    onClick={() => voteMutation.mutate({ pollId: pollQuery.data!.poll!.id, optionId: opt.id })}
                    disabled={voteMutation.isPending}
                    className="px-3 py-1.5 rounded-lg bg-accent/20 hover:bg-accent/30 border border-accent/40 text-accent text-xs font-semibold transition"
                  >
                    Vote
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 3. Cleanliness Inspections Tab */}
      {tab === "inspections" && (
        <div className="space-y-4">
          <div className="bg-surface border border-hairline rounded-2xl p-5">
            <h2 className="text-base font-bold text-ink flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-success" />
              Room & Floor Cleanliness Reviews
            </h2>
            <p className="text-xs text-ink-muted mt-1">
              Pass room inspections to unlock points and qualify for the 1.5× Floor Clean Bonus. You have 48 hours to dispute any failed item.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(inspectionsQuery.data ?? []).length === 0 ? (
              <div className="col-span-2 bg-surface border border-hairline rounded-2xl p-8 text-center text-xs text-ink-muted">
                No inspections recorded for your room yet.
              </div>
            ) : (
              inspectionsQuery.data?.map((ins) => (
                <div key={ins.id} className="bg-surface border border-hairline rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-hairline pb-3">
                    <div>
                      <span className="text-xs font-bold text-ink capitalize block">
                        {ins.inspection_type} Inspection
                      </span>
                      <span className="t-micro text-ink-muted font-mono">
                        {new Date(ins.inspected_at).toLocaleDateString()}
                      </span>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        ins.passed ? "bg-success/20 text-emerald-300" : "bg-danger-tint text-danger"
                      }`}
                    >
                      {ins.score_percent}% ({ins.passed ? "PASSED" : "FAILED"})
                    </span>
                  </div>

                  <div className="space-y-2">
                    {ins.items?.map((it) => (
                      <div key={it.id} className="p-2.5 bg-surface/40 rounded-xl text-xs flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {it.passed ? (
                            <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
                          ) : (
                            <XCircle className="w-4 h-4 text-danger flex-shrink-0" />
                          )}
                          <span className={it.passed ? "text-ink" : "text-rose-200"}>{it.description}</span>
                        </div>

                        {!it.passed && it.resolution_status === "none" && (
                          <button
                            onClick={() => {
                              setDisputingItemId(it.id);
                              setDisputeNote("");
                            }}
                            className="px-2.5 py-1 rounded-lg bg-surface hover:bg-surface border border-hairline t-micro text-ink"
                          >
                            Dispute (48h)
                          </button>
                        )}
                        {it.resolution_status === "disputed" && (
                          <span className="t-micro text-accent font-medium">{t("tenant.community.underReview")}</span>
                        )}
                        {it.resolution_status === "overturned" && (
                          <span className="t-micro text-success font-medium">{t("tenant.community.disputeUpheld")}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 4. Report Hazard Tab */}
      {tab === "hazards" && (
        <div className="max-w-xl bg-surface border border-hairline rounded-2xl p-6 space-y-5">
          <div className="border-b border-hairline pb-4">
            <h2 className="text-base font-bold text-ink flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-accent" />
              Anonymous Safety & Hazard Report
            </h2>
            <p className="text-xs text-ink-muted mt-1">
              Report water leaks, wiring faults, or broken fixtures. Your identity is hidden from peers, and you earn 25 points when warden resolves it.
            </p>
          </div>

          {hzMsg && (
            <div className="p-3 rounded-xl bg-success-tint border border-success/20 text-success text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{hzMsg}</span>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-ink mb-1.5 uppercase">{t("tenant.community.category")}</label>
              <select
                value={hzCat}
                onChange={(e) => setHzCat(e.target.value)}
                className="w-full px-3 py-2 bg-surface border border-hairline rounded-xl text-xs text-ink"
              >
                <option value="Water leakage / Plumbing">{t("tenant.community.catPlumbing")}</option>
                <option value="Electrical / Wiring hazard">{t("tenant.community.catElectrical")}</option>
                <option value="Pest / Deep Cleanliness">{t("tenant.community.catCleanliness")}</option>
                <option value="Door lock / Security">{t("tenant.community.catSecurity")}</option>
                <option value="Other">{t("tenant.community.catOther")}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-ink mb-1.5 uppercase">{t("tenant.community.description")}</label>
              <textarea
                rows={3}
                value={hzDesc}
                onChange={(e) => setHzDesc(e.target.value)}
                placeholder="Describe the issue, exact floor/room location..."
                className="w-full px-3 py-2 bg-surface border border-hairline rounded-xl text-xs text-ink placeholder:text-ink-muted focus:ring-2 focus:ring-accent/50"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-ink mb-1.5 uppercase">{t("tenant.community.photoEvidenceOptional")}</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setHzPhoto(e.target.files?.[0] || null)}
                className="block w-full text-xs text-ink-muted file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-surface file:text-ink hover:file:bg-surface"
              />
            </div>

            <button
              onClick={() => reportHazardMutation.mutate()}
              disabled={reportHazardMutation.isPending || !hzDesc.trim()}
              className="w-full py-3 rounded-xl bg-accent text-accent-contrast font-bold text-xs hover:bg-accent transition shadow-lg shadow-accent/20 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {reportHazardMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
              <span>{t("tenant.community.submitReportEarnPts")}</span>
            </button>
          </div>
        </div>
      )}

      {/* 5. Leaderboard Tab */}
      {tab === "leaderboard" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-surface border border-hairline rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-ink flex items-center gap-2">
              <Flame className="w-4 h-4 text-accent fill-accent" />
              Top Resident Streaks
            </h3>
            <div className="divide-y divide-hairline border border-hairline rounded-xl overflow-hidden">
              {leaderboardQuery.data?.streaks?.map((s, idx) => (
                <div key={s.tenant_id} className="p-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 font-bold text-ink-muted">#{idx + 1}</span>
                    <span className="font-mono text-ink">Resident ...{s.tenant_id.slice(-4)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-accent">{s.on_time_months} mo streak</span>
                    <span className="font-mono text-success">{s.cached_balance} pts</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-surface border border-hairline rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-ink flex items-center gap-2">
              <Trophy className="w-4 h-4 text-success" />
              Floor Cleanliness Scores
            </h3>
            <div className="divide-y divide-hairline border border-hairline rounded-xl overflow-hidden">
              {(leaderboardQuery.data?.floor_scores ?? []).length === 0 ? (
                <div className="p-4 text-center text-xs text-ink-muted">{t("tenant.community.noFloorAudits")}</div>
              ) : (
                leaderboardQuery.data?.floor_scores?.map((fl) => (
                  <div key={fl.floor_number} className="p-3 flex items-center justify-between text-xs">
                    <span className="font-semibold text-ink">Floor {fl.floor_number} — {fl.name}</span>
                    <span
                      className={`font-bold ${
                        fl.score_percent >= 85 ? "text-success" : "text-accent"
                      }`}
                    >
                      {fl.score_percent}% {fl.score_percent >= 85 ? "(1.5× Bonus Active)" : ""}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {tab === "referrals" && (
        <div className="max-w-xl rounded-[14px] border border-hairline bg-surface p-5 space-y-3">
          <h2 className="t-h3">{t("tenant.community.referralsTitle")}</h2>
          <p className="t-body-sm text-ink-muted">{t("tenant.community.referralsDesc")}</p>
          {(referralsQuery.data ?? []).length === 0 ? (
            <p className="t-caption text-ink-muted">{t("tenant.community.noReferrals")}</p>
          ) : (
            <ul className="divide-y divide-hairline">
              {(referralsQuery.data ?? []).map((r) => (
                <li key={r.id} className="py-3 flex justify-between t-body">
                  <span>
                    {r.name} · {r.phone}
                  </span>
                  <span className="t-caption text-ink-muted">{r.status}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === "violations" && (
        <div className="max-w-xl rounded-[14px] border border-hairline bg-surface p-5 space-y-3">
          <h2 className="t-h3">{t("tenant.community.violationsTitle")}</h2>
          {(violationsQuery.data ?? []).length === 0 ? (
            <p className="t-caption text-ink-muted">{t("tenant.community.noViolations")}</p>
          ) : (
            <ul className="divide-y divide-hairline">
              {(violationsQuery.data ?? []).map((v) => (
                <li key={v.id} className="py-3">
                  <div className="t-body font-semibold capitalize">{v.severity} · {v.rule_code}</div>
                  <p className="t-caption text-ink-muted mt-1">{v.description}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Dispute Dialog Modal */}
      {disputingItemId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="bg-surface border border-hairline rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-ink">{t("tenant.community.disputeInspectionItem")}</h3>
            <p className="text-xs text-ink-muted">
              Explain why this item should pass (e.g. maintenance was scheduled, photo misinterpretation). Warden will review within 48 hours.
            </p>
            <textarea
              rows={3}
              value={disputeNote}
              onChange={(e) => setDisputeNote(e.target.value)}
              placeholder="Reason for dispute..."
              className="w-full px-3 py-2 bg-surface border border-hairline rounded-xl text-xs text-ink focus:ring-2 focus:ring-accent/50"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDisputingItemId(null)}
                className="px-3 py-2 rounded-xl text-xs text-ink-muted hover:text-ink"
              >
                Cancel
              </button>
              <button
                onClick={() => disputeMutation.mutate()}
                disabled={disputeMutation.isPending || !disputeNote.trim()}
                className="px-4 py-2 rounded-xl bg-accent text-accent-contrast font-bold text-xs hover:bg-accent/90 disabled:opacity-50"
              >
                {disputeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit Dispute"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
