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

export const TenantCommunityView: React.FC = () => {
  const queryClient = useQueryClient();

  // Active section tab: meals | poll | hazards | inspections | leaderboard
  const [tab, setTab] = useState<"meals" | "poll" | "hazards" | "inspections" | "leaderboard">("meals");

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
      <div className="flex items-center gap-2 p-1.5 bg-slate-900 border border-slate-800 rounded-2xl overflow-x-auto">
        <button
          onClick={() => setTab("meals")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            tab === "meals" ? "bg-primary text-slate-950 shadow-md" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Utensils className="w-4 h-4" />
          <span>Meal RSVP</span>
        </button>
        <button
          onClick={() => setTab("poll")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            tab === "poll" ? "bg-primary text-slate-950 shadow-md" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Vote className="w-4 h-4" />
          <span>Menu Poll</span>
        </button>
        <button
          onClick={() => setTab("inspections")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            tab === "inspections" ? "bg-primary text-slate-950 shadow-md" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Cleanliness</span>
        </button>
        <button
          onClick={() => setTab("hazards")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            tab === "hazards" ? "bg-primary text-slate-950 shadow-md" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Report Hazard</span>
        </button>
        <button
          onClick={() => setTab("leaderboard")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            tab === "leaderboard" ? "bg-primary text-slate-950 shadow-md" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Trophy className="w-4 h-4" />
          <span>Leaderboard</span>
        </button>
      </div>

      {/* 1. Meal RSVP Tab */}
      {tab === "meals" && (
        <div className="max-w-xl bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
          <div className="border-b border-slate-800 pb-4">
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Utensils className="w-5 h-5 text-amber-400" />
              Tomorrow's Meal RSVP
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Help reduce food waste in the PG mess. Daily dinner cutoff is strictly at 20:00.
            </p>
          </div>

          {rsvpMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{rsvpMsg}</span>
            </div>
          )}

          <div className="space-y-3">
            <label className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between cursor-pointer hover:bg-slate-800 transition">
              <div>
                <span className="font-semibold text-xs text-slate-100 block">Breakfast</span>
                <span className="text-[11px] text-slate-400">07:30 AM — 09:30 AM</span>
              </div>
              <input
                type="checkbox"
                checked={rsvpB}
                onChange={(e) => setRsvpB(e.target.checked)}
                className="w-4 h-4 rounded border-slate-600 text-primary focus:ring-primary"
              />
            </label>

            <label className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between cursor-pointer hover:bg-slate-800 transition">
              <div>
                <span className="font-semibold text-xs text-slate-100 block">Lunch</span>
                <span className="text-[11px] text-slate-400">12:30 PM — 02:30 PM</span>
              </div>
              <input
                type="checkbox"
                checked={rsvpL}
                onChange={(e) => setRsvpL(e.target.checked)}
                className="w-4 h-4 rounded border-slate-600 text-primary focus:ring-primary"
              />
            </label>

            <label className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between cursor-pointer hover:bg-slate-800 transition">
              <div>
                <span className="font-semibold text-xs text-slate-100 block">Dinner</span>
                <span className="text-[11px] text-slate-400">07:30 PM — 09:30 PM (20:00 cutoff)</span>
              </div>
              <input
                type="checkbox"
                checked={rsvpD}
                onChange={(e) => setRsvpD(e.target.checked)}
                className="w-4 h-4 rounded border-slate-600 text-primary focus:ring-primary"
              />
            </label>
          </div>

          <button
            onClick={() => saveRsvpMutation.mutate()}
            disabled={saveRsvpMutation.isPending}
            className="w-full py-3 rounded-xl bg-primary text-slate-950 font-bold text-xs hover:bg-primary/90 transition shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
          >
            {saveRsvpMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            <span>Save Tomorrow's Attendance</span>
          </button>
        </div>
      )}

      {/* 2. Menu Poll Tab */}
      {tab === "poll" && (
        <div className="max-w-xl bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
          <div className="border-b border-slate-800 pb-4">
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Vote className="w-5 h-5 text-primary" />
              Monthly Menu Choice Poll
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Vote on your preferred weekend specials for the upcoming month.
            </p>
          </div>

          {!pollQuery.data?.poll ? (
            <p className="text-xs text-slate-500">No active menu poll for this month.</p>
          ) : (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                {pollQuery.data.poll.title}
              </h3>
              {pollQuery.data.poll.options?.map((opt) => (
                <div
                  key={opt.id}
                  className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between hover:border-slate-600 transition"
                >
                  <div>
                    <h4 className="text-xs font-bold text-slate-100">{opt.title}</h4>
                    {opt.description && <p className="text-[11px] text-slate-400 mt-0.5">{opt.description}</p>}
                  </div>
                  <button
                    onClick={() => voteMutation.mutate({ pollId: pollQuery.data!.poll!.id, optionId: opt.id })}
                    disabled={voteMutation.isPending}
                    className="px-3 py-1.5 rounded-lg bg-primary/20 hover:bg-primary/30 border border-primary/40 text-primary text-xs font-semibold transition"
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
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              Room & Floor Cleanliness Reviews
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Pass room inspections to unlock points and qualify for the 1.5× Floor Clean Bonus. You have 48 hours to dispute any failed item.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(inspectionsQuery.data ?? []).length === 0 ? (
              <div className="col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-xs text-slate-500">
                No inspections recorded for your room yet.
              </div>
            ) : (
              inspectionsQuery.data?.map((ins) => (
                <div key={ins.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div>
                      <span className="text-xs font-bold text-slate-200 capitalize block">
                        {ins.inspection_type} Inspection
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {new Date(ins.inspected_at).toLocaleDateString()}
                      </span>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        ins.passed ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"
                      }`}
                    >
                      {ins.score_percent}% ({ins.passed ? "PASSED" : "FAILED"})
                    </span>
                  </div>

                  <div className="space-y-2">
                    {ins.items?.map((it) => (
                      <div key={it.id} className="p-2.5 bg-slate-800/40 rounded-xl text-xs flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {it.passed ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                          ) : (
                            <XCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                          )}
                          <span className={it.passed ? "text-slate-200" : "text-rose-200"}>{it.description}</span>
                        </div>

                        {!it.passed && it.resolution_status === "none" && (
                          <button
                            onClick={() => {
                              setDisputingItemId(it.id);
                              setDisputeNote("");
                            }}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[10px] text-slate-300"
                          >
                            Dispute (48h)
                          </button>
                        )}
                        {it.resolution_status === "disputed" && (
                          <span className="text-[10px] text-amber-400 font-medium">Under Review</span>
                        )}
                        {it.resolution_status === "overturned" && (
                          <span className="text-[10px] text-emerald-400 font-medium">Dispute Upheld (Passed)</span>
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
        <div className="max-w-xl bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
          <div className="border-b border-slate-800 pb-4">
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              Anonymous Safety & Hazard Report
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Report water leaks, wiring faults, or broken fixtures. Your identity is hidden from peers, and you earn 25 points when warden resolves it.
            </p>
          </div>

          {hzMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{hzMsg}</span>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5 uppercase">Category</label>
              <select
                value={hzCat}
                onChange={(e) => setHzCat(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100"
              >
                <option value="Water leakage / Plumbing">Water leakage / Plumbing</option>
                <option value="Electrical / Wiring hazard">Electrical / Wiring hazard</option>
                <option value="Pest / Deep Cleanliness">Pest / Deep Cleanliness</option>
                <option value="Door lock / Security">Door lock / Security</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5 uppercase">Description</label>
              <textarea
                rows={3}
                value={hzDesc}
                onChange={(e) => setHzDesc(e.target.value)}
                placeholder="Describe the issue, exact floor/room location..."
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-primary/50"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5 uppercase">Photo Evidence (Optional)</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setHzPhoto(e.target.files?.[0] || null)}
                className="block w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700"
              />
            </div>

            <button
              onClick={() => reportHazardMutation.mutate()}
              disabled={reportHazardMutation.isPending || !hzDesc.trim()}
              className="w-full py-3 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition shadow-lg shadow-amber-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {reportHazardMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
              <span>Submit Report & Earn 25 Pts on Fix</span>
            </button>
          </div>
        </div>
      )}

      {/* 5. Leaderboard Tab */}
      {tab === "leaderboard" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
              Top Resident Streaks
            </h3>
            <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl overflow-hidden">
              {leaderboardQuery.data?.streaks?.map((s, idx) => (
                <div key={s.tenant_id} className="p-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 font-bold text-slate-500">#{idx + 1}</span>
                    <span className="font-mono text-slate-300">Resident ...{s.tenant_id.slice(-4)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-amber-400">{s.on_time_months} mo streak</span>
                    <span className="font-mono text-emerald-400">{s.cached_balance} pts</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-emerald-400" />
              Floor Cleanliness Scores
            </h3>
            <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl overflow-hidden">
              {(leaderboardQuery.data?.floor_scores ?? []).length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500">No floor audits logged this month.</div>
              ) : (
                leaderboardQuery.data?.floor_scores?.map((fl) => (
                  <div key={fl.floor_number} className="p-3 flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-200">Floor {fl.floor_number} — {fl.name}</span>
                    <span
                      className={`font-bold ${
                        fl.score_percent >= 85 ? "text-emerald-400" : "text-amber-400"
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

      {/* Dispute Dialog Modal */}
      {disputingItemId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-slate-100">Dispute Inspection Item</h3>
            <p className="text-xs text-slate-400">
              Explain why this item should pass (e.g. maintenance was scheduled, photo misinterpretation). Warden will review within 48 hours.
            </p>
            <textarea
              rows={3}
              value={disputeNote}
              onChange={(e) => setDisputeNote(e.target.value)}
              placeholder="Reason for dispute..."
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 focus:ring-2 focus:ring-primary/50"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDisputingItemId(null)}
                className="px-3 py-2 rounded-xl text-xs text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={() => disputeMutation.mutate()}
                disabled={disputeMutation.isPending || !disputeNote.trim()}
                className="px-4 py-2 rounded-xl bg-primary text-slate-950 font-bold text-xs hover:bg-primary/90 disabled:opacity-50"
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
