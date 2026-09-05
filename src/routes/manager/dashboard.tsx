import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/auth/context";
import {
  getManagerKitchenHeadcount,
  submitManagerInspection,
  listManagerInspections,
  recordManagerMeterReading,
  listManagerHazards,
  resolveManagerHazard,
  listOwnerRooms,
  listOwnerFloors,
  resolveInspectionItem,
} from "@/api/gamification";
import { QUERY_KEYS } from "@/lib/queryKeys";
import { formatPaise } from "@/lib/utils";
import {
  UtensilsCrossed,
  ClipboardCheck,
  Gauge,
  AlertTriangle,
  Camera,
  CheckCircle2,
  XCircle,
  Loader2,
  Calendar,
  AlertCircle,
} from "lucide-react";

export const ManagerDashboardView: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const propertyId = user?.property_id || "";

  // Tabs: headcount | inspect | meter | hazards
  const [activeTab, setActiveTab] = useState<"headcount" | "inspect" | "meter" | "hazards">("headcount");

  // Headcount Date state
  const [targetDate, setTargetDate] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });

  // Inspection form state
  const [insType, setInsType] = useState<"room" | "floor">("room");
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [selectedFloorId, setSelectedFloorId] = useState("");
  const [checklist, setChecklist] = useState([
    { key: "bed_clear", desc: "Bed / Desk clear and tidy", passed: true },
    { key: "no_food_waste", desc: "No uncleaned food waste / plates", passed: true },
    { key: "dustbin_segregated", desc: "Dustbin used and segregated", passed: true },
    { key: "shoes_on_rack", desc: "Footwear placed on rack", passed: true },
    { key: "no_appliances", desc: "No prohibited high-draw appliances", passed: true },
  ]);
  const [insPhoto, setInsPhoto] = useState<File | null>(null);
  const [insNotes, setInsNotes] = useState("");
  const [insMsg, setInsMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Meter form state
  const [meterKind, setMeterKind] = useState<"electricity" | "water">("electricity");
  const [meterRoomId, setMeterRoomId] = useState("");
  const [meterFloorId, setMeterFloorId] = useState("");
  const [meterReadingVal, setMeterReadingVal] = useState("");
  const [meterReplaced, setMeterReplaced] = useState(false);
  const [meterMsg, setMeterMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Queries
  const headcountQuery = useQuery({
    queryKey: QUERY_KEYS.managerHeadcount(propertyId, targetDate),
    queryFn: () => getManagerKitchenHeadcount(propertyId, targetDate),
    enabled: !!propertyId,
  });

  const roomsQuery = useQuery({
    queryKey: QUERY_KEYS.ownerRooms(propertyId),
    queryFn: () => listOwnerRooms(propertyId),
    enabled: !!propertyId,
  });

  const floorsQuery = useQuery({
    queryKey: QUERY_KEYS.ownerFloors(propertyId),
    queryFn: () => listOwnerFloors(propertyId),
    enabled: !!propertyId,
  });

  const inspectionsQuery = useQuery({
    queryKey: QUERY_KEYS.managerInspections(propertyId),
    queryFn: () => listManagerInspections(propertyId),
    enabled: !!propertyId,
  });

  const hazardsQuery = useQuery({
    queryKey: QUERY_KEYS.managerHazards(propertyId),
    queryFn: () => listManagerHazards(propertyId),
    enabled: !!propertyId,
  });

  // Mutations
  const inspectionMutation = useMutation({
    mutationFn: async () => {
      let b64 = "";
      if (insPhoto) {
        b64 = await new Promise((res, rej) => {
          const r = new FileReader();
          r.onload = () => res((r.result as string).split(",")[1]);
          r.onerror = rej;
          r.readAsDataURL(insPhoto);
        });
      }
      return submitManagerInspection({
        property_id: propertyId,
        inspection_type: insType,
        room_id: insType === "room" ? selectedRoomId || null : null,
        floor_id: insType === "floor" ? selectedFloorId || null : null,
        notes: insNotes,
        items: checklist.map((c) => ({
          item_key: c.key,
          description: c.desc,
          passed: c.passed,
          photo_base64: !c.passed ? b64 : "",
        })),
      });
    },
    onSuccess: (data) => {
      setInsMsg({
        type: "ok",
        text: `Inspection recorded! Score: ${data.inspection.score_percent}% (${data.inspection.passed ? "PASSED" : "FAILED"}). Points updated.`,
      });
      setInsPhoto(null);
      setInsNotes("");
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.managerInspections(propertyId) });
    },
    onError: (err: Error) => {
      setInsMsg({ type: "err", text: err.message || "Failed to submit inspection" });
    },
  });

  const meterMutation = useMutation({
    mutationFn: async () => {
      const val = parseFloat(meterReadingVal);
      if (isNaN(val)) throw new Error("Please enter a valid numeric reading");
      return recordManagerMeterReading({
        property_id: propertyId,
        kind: meterKind,
        room_id: meterKind === "electricity" ? meterRoomId || null : null,
        floor_id: meterKind === "water" ? meterFloorId || null : null,
        reading_value: val,
        meter_replaced: meterReplaced,
      });
    },
    onSuccess: (data) => {
      const res = data.result;
      setMeterMsg({
        type: "ok",
        text: `Reading recorded! Delta: ${res.delta_units} units. Billable: ${formatPaise(res.billable_paise)} (${res.excess_units} excess units over quota).`,
      });
      setMeterReadingVal("");
    },
    onError: (err: Error) => {
      setMeterMsg({ type: "err", text: err.message || "Failed to record reading" });
    },
  });

  const resolveHazardMutation = useMutation({
    mutationFn: (hazardId: string) => resolveManagerHazard(hazardId, "resolved"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.managerHazards(propertyId) });
    },
  });

  const resolveDisputeMutation = useMutation({
    mutationFn: ({ itemId, status }: { itemId: string; status: "upheld" | "overturned" }) =>
      resolveInspectionItem(itemId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.managerInspections(propertyId) });
    },
  });

  const rooms = roomsQuery.data ?? [];
  const floors = floorsQuery.data ?? [];
  const headcount = headcountQuery.data?.headcount;
  const anyChecklistFailed = checklist.some((c) => !c.passed);

  return (
    <div className="space-y-6">
      {/* Tab bar */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-900 border border-slate-800 rounded-2xl overflow-x-auto">
        <button
          onClick={() => setActiveTab("headcount")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === "headcount" ? "bg-amber-500 text-slate-950 shadow-md" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <UtensilsCrossed className="w-4 h-4" />
          <span>Kitchen Headcount</span>
        </button>
        <button
          onClick={() => setActiveTab("inspect")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === "inspect" ? "bg-amber-500 text-slate-950 shadow-md" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <ClipboardCheck className="w-4 h-4" />
          <span>Inspections</span>
        </button>
        <button
          onClick={() => setActiveTab("meter")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === "meter" ? "bg-amber-500 text-slate-950 shadow-md" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Gauge className="w-4 h-4" />
          <span>Sub-metering</span>
        </button>
        <button
          onClick={() => setActiveTab("hazards")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === "hazards" ? "bg-amber-500 text-slate-950 shadow-md" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Safety Hazards ({hazardsQuery.data?.filter((h) => h.status === "open").length ?? 0})</span>
        </button>
      </div>

      {/* 1. Kitchen Headcount */}
      {activeTab === "headcount" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <UtensilsCrossed className="w-5 h-5 text-amber-400" />
                Kitchen Headcount Forecast
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Aggregated daily RSVPs for mess staff preparation. Cutoff at 20:00 every evening.
              </p>
            </div>
            <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700 text-xs">
              <Calendar className="w-4 h-4 text-slate-400" />
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="bg-transparent text-slate-200 font-mono focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
              <span className="text-xs uppercase font-medium text-slate-400 tracking-wider">Breakfast</span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-amber-400">{headcount?.breakfast ?? 0}</span>
                <span className="text-xs text-slate-500">meals</span>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
              <span className="text-xs uppercase font-medium text-slate-400 tracking-wider">Lunch</span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-amber-400">{headcount?.lunch ?? 0}</span>
                <span className="text-xs text-slate-500">meals</span>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
              <span className="text-xs uppercase font-medium text-slate-400 tracking-wider">Dinner</span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-amber-400">{headcount?.dinner ?? 0}</span>
                <span className="text-xs text-slate-500">meals</span>
              </div>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 flex flex-col justify-between">
              <span className="text-xs uppercase font-bold text-amber-300 tracking-wider">Total Headcount</span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-amber-300">{headcount?.total ?? 0}</span>
                <span className="text-xs text-amber-400/80">servings</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Inspections Tab */}
      {activeTab === "inspect" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Inspection Form */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
            <div className="border-b border-slate-800 pb-4">
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-amber-400" />
                Conduct Cleanliness Inspection
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Evaluate room or common floor hygiene. Any failed item requires photo proof before submission.
              </p>
            </div>

            {insMsg && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  insMsg.type === "ok"
                    ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                    : "bg-rose-500/10 border border-rose-500/20 text-rose-400"
                }`}
              >
                {insMsg.type === "ok" ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
                <span>{insMsg.text}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5 uppercase">Scope</label>
                <select
                  value={insType}
                  onChange={(e) => setInsType(e.target.value as "room" | "floor")}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 focus:ring-2 focus:ring-amber-500/50"
                >
                  <option value="room">Individual Room</option>
                  <option value="floor">Floor / Common Area</option>
                </select>
              </div>

              {insType === "room" ? (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5 uppercase">Room</label>
                  <select
                    value={selectedRoomId}
                    onChange={(e) => setSelectedRoomId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 focus:ring-2 focus:ring-amber-500/50"
                  >
                    <option value="">Select Room...</option>
                    {rooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        Room {r.room_number}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5 uppercase">Floor</label>
                  <select
                    value={selectedFloorId}
                    onChange={(e) => setSelectedFloorId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 focus:ring-2 focus:ring-amber-500/50"
                  >
                    <option value="">Select Floor...</option>
                    {floors.map((f) => (
                      <option key={f.id} value={f.id}>
                        Floor {f.floor_number} — {f.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-300 uppercase">Checklist Criteria</label>
              <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl overflow-hidden">
                {checklist.map((item, idx) => (
                  <div
                    key={item.key}
                    onClick={() => {
                      const updated = [...checklist];
                      updated[idx].passed = !updated[idx].passed;
                      setChecklist(updated);
                    }}
                    className="p-3 flex items-center justify-between hover:bg-slate-800/40 cursor-pointer transition text-xs"
                  >
                    <span className="text-slate-200">{item.desc}</span>
                    <span
                      className={`px-2 py-0.5 rounded-md font-semibold text-[11px] flex items-center gap-1 ${
                        item.passed ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"
                      }`}
                    >
                      {item.passed ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                      {item.passed ? "PASS" : "FAIL"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {anyChecklistFailed && (
              <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/30 space-y-2">
                <label className="block text-xs font-bold text-rose-300 uppercase flex items-center gap-1.5">
                  <Camera className="w-4 h-4" /> Photo Evidence Required (Mandatory on Failure)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setInsPhoto(e.target.files?.[0] || null)}
                  className="block w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-rose-600 file:text-white hover:file:bg-rose-500"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5 uppercase">Notes / Observations</label>
              <textarea
                rows={2}
                value={insNotes}
                onChange={(e) => setInsNotes(e.target.value)}
                placeholder="Optional warden remarks..."
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
            </div>

            <button
              onClick={() => inspectionMutation.mutate()}
              disabled={inspectionMutation.isPending || (anyChecklistFailed && !insPhoto)}
              className="w-full py-3 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition shadow-lg shadow-amber-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {inspectionMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ClipboardCheck className="w-4 h-4" />}
              <span>Submit Inspection & Compute Points</span>
            </button>
          </div>

          {/* Past Inspections List */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-200">Recent Inspections</h3>
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {(inspectionsQuery.data ?? []).length === 0 ? (
                <p className="text-xs text-slate-500">No inspections logged yet.</p>
              ) : (
                inspectionsQuery.data?.map((ins) => (
                  <div key={ins.id} className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-200 capitalize">
                        {ins.inspection_type}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          ins.passed ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"
                        }`}
                      >
                        {ins.score_percent}% ({ins.passed ? "PASS" : "FAIL"})
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-mono">
                      {new Date(ins.inspected_at).toLocaleDateString()}
                    </p>
                    {/* Disputed item actions */}
                    {ins.items?.filter((it) => it.resolution_status === "disputed").map((it) => (
                      <div key={it.id} className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg space-y-1">
                        <p className="text-[10px] text-amber-300 font-medium">
                          Dispute: {it.dispute_note || "Tenant disputed this item"}
                        </p>
                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={() => resolveDisputeMutation.mutate({ itemId: it.id, status: "upheld" })}
                            className="px-2 py-0.5 bg-slate-700 hover:bg-slate-600 rounded text-[10px] text-slate-200"
                          >
                            Uphold (Fail)
                          </button>
                          <button
                            onClick={() => resolveDisputeMutation.mutate({ itemId: it.id, status: "overturned" })}
                            className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 rounded text-[10px] text-white"
                          >
                            Overturn (Pass)
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. Sub-metering Tab */}
      {activeTab === "meter" && (
        <div className="max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
          <div className="border-b border-slate-800 pb-4">
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Gauge className="w-5 h-5 text-amber-400" />
              Record Utility Meter Reading
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Supports individual room electricity sub-meters (kWh) and floor water meters (Litres).
            </p>
          </div>

          {meterMsg && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                meterMsg.type === "ok"
                  ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                  : "bg-rose-500/10 border border-rose-500/20 text-rose-400"
              }`}
            >
              {meterMsg.type === "ok" ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
              <span>{meterMsg.text}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5 uppercase">Kind</label>
              <select
                value={meterKind}
                onChange={(e) => setMeterKind(e.target.value as "electricity" | "water")}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100"
              >
                <option value="electricity">Electricity (kWh)</option>
                <option value="water">Water (Litres)</option>
              </select>
            </div>

            {meterKind === "electricity" ? (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5 uppercase">Room</label>
                <select
                  value={meterRoomId}
                  onChange={(e) => setMeterRoomId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100"
                >
                  <option value="">Select Room...</option>
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      Room {r.room_number}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5 uppercase">Floor</label>
                <select
                  value={meterFloorId}
                  onChange={(e) => setMeterFloorId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100"
                >
                  <option value="">Select Floor...</option>
                  {floors.map((f) => (
                    <option key={f.id} value={f.id}>
                      Floor {f.floor_number}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5 uppercase">
              Current Meter Display Reading
            </label>
            <input
              type="number"
              step="0.1"
              value={meterReadingVal}
              onChange={(e) => setMeterReadingVal(e.target.value)}
              placeholder="e.g. 1540.2"
              className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={meterReplaced}
              onChange={(e) => setMeterReplaced(e.target.checked)}
              className="rounded border-slate-700"
            />
            <span>Meter was replaced this cycle (disables non-decreasing floor check)</span>
          </label>

          <button
            onClick={() => meterMutation.mutate()}
            disabled={meterMutation.isPending || !meterReadingVal.trim()}
            className="w-full py-3 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition shadow-lg shadow-amber-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {meterMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Gauge className="w-4 h-4" />}
            <span>Record Meter Reading & Calculate Units</span>
          </button>
        </div>
      )}

      {/* 4. Safety Hazards Tab */}
      {activeTab === "hazards" && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                Reported Safety Hazards & Maintenance
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Anonymous tenant reports. Resolving a hazard awards 25 gamification points to the reporter.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(hazardsQuery.data ?? []).length === 0 ? (
              <div className="col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-xs text-slate-500">
                No safety hazards reported.
              </div>
            ) : (
              hazardsQuery.data?.map((hz) => (
                <div key={hz.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                        {hz.category}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          hz.status === "open"
                            ? "bg-rose-500/20 text-rose-300"
                            : "bg-emerald-500/20 text-emerald-300"
                        }`}
                      >
                        {hz.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-200 leading-relaxed">{hz.description}</p>
                    <p className="text-[11px] text-slate-500 font-mono">
                      {new Date(hz.created_at).toLocaleString()}
                    </p>
                  </div>

                  {hz.status === "open" && (
                    <button
                      onClick={() => resolveHazardMutation.mutate(hz.id)}
                      disabled={resolveHazardMutation.isPending}
                      className="w-full py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-semibold transition flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Mark Resolved & Credit 25 Pts</span>
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
