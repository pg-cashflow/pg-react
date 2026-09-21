import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listOwnerFloors,
  createOwnerFloor,
  listOwnerRooms,
  createOwnerRoom,
  createOwnerManager,
  getOwnerGamificationSettings,
  updateOwnerGamificationSettings,
} from "@/api/gamification";
import { getProperties } from "@/api/properties";
import { QUERY_KEYS } from "@/lib/queryKeys";
import {
  Building2,
  Layers,
  DoorOpen,
  UserCheck,
  Sliders,
  Plus,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Award,
} from "lucide-react";
import type { PropertyGamificationSettings } from "@pg/types";

export const OwnerFacilityView: React.FC = () => {
  const queryClient = useQueryClient();

  // Selected property
  const propertiesQuery = useQuery({
    queryKey: QUERY_KEYS.properties,
    queryFn: getProperties,
  });
  const properties = propertiesQuery.data;
  const [propertyId, setPropertyId] = useState<string>("");

  React.useEffect(() => {
    if (!propertyId && properties && properties.length > 0 && properties[0]?.id) {
      setPropertyId(properties[0].id);
    }
  }, [properties, propertyId]);

  const propertyList = properties ?? [];

  // Tab: floors | rooms | wardens | gamification
  const [tab, setTab] = useState<"floors" | "rooms" | "wardens" | "gamification">("floors");

  // Add Floor state
  const [floorNumber, setFloorNumber] = useState("");
  const [floorName, setFloorName] = useState("");

  // Add Room state
  const [roomNumber, setRoomNumber] = useState("");
  const [roomFloorId, setRoomFloorId] = useState("");
  const [roomCapacity, setRoomCapacity] = useState("2");
  const [includedUnits, setIncludedUnits] = useState("100");

  // Add Manager state
  const [managerPhone, setManagerPhone] = useState("");

  // Feedback messages
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Queries
  const floorsQuery = useQuery({
    queryKey: QUERY_KEYS.ownerFloors(propertyId),
    queryFn: () => listOwnerFloors(propertyId),
    enabled: !!propertyId,
  });

  const roomsQuery = useQuery({
    queryKey: QUERY_KEYS.ownerRooms(propertyId),
    queryFn: () => listOwnerRooms(propertyId),
    enabled: !!propertyId,
  });

  const settingsQuery = useQuery({
    queryKey: QUERY_KEYS.ownerGamificationSettings(propertyId),
    queryFn: () => getOwnerGamificationSettings(propertyId),
    enabled: !!propertyId,
  });

  // Settings local state
  const [settings, setSettings] = useState<PropertyGamificationSettings | null>(null);

  React.useEffect(() => {
    if (settingsQuery.data?.settings) {
      setSettings(settingsQuery.data.settings);
    }
  }, [settingsQuery.data]);

  // Mutations
  const addFloorMutation = useMutation({
    mutationFn: () =>
      createOwnerFloor({
        property_id: propertyId,
        floor_number: parseInt(floorNumber, 10),
        name: floorName.trim(),
      }),
    onSuccess: () => {
      setMsg({ type: "ok", text: "Floor added successfully." });
      setFloorNumber("");
      setFloorName("");
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ownerFloors(propertyId) });
    },
    onError: (err: Error) => setMsg({ type: "err", text: err.message }),
  });

  const addRoomMutation = useMutation({
    mutationFn: () =>
      createOwnerRoom({
        property_id: propertyId,
        floor_id: roomFloorId,
        room_number: roomNumber.trim(),
        capacity: parseInt(roomCapacity, 10),
        included_units: parseInt(includedUnits, 10),
      }),
    onSuccess: () => {
      setMsg({ type: "ok", text: "Room created successfully." });
      setRoomNumber("");
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ownerRooms(propertyId) });
    },
    onError: (err: Error) => setMsg({ type: "err", text: err.message }),
  });

  const addManagerMutation = useMutation({
    mutationFn: () => createOwnerManager({ property_id: propertyId, phone: managerPhone.trim() }),
    onSuccess: () => {
      setMsg({ type: "ok", text: "Warden / Manager provisioned! They can now log in via OTP." });
      setManagerPhone("");
    },
    onError: (err: Error) => setMsg({ type: "err", text: err.message }),
  });

  const updateSettingsMutation = useMutation({
    mutationFn: () => {
      if (!settings) throw new Error("No settings to save");
      return updateOwnerGamificationSettings(settings);
    },
    onSuccess: () => {
      setMsg({ type: "ok", text: "Gamification & utility settings saved!" });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ownerGamificationSettings(propertyId) });
    },
    onError: (err: Error) => setMsg({ type: "err", text: err.message }),
  });

  const floors = floorsQuery.data ?? [];
  const rooms = roomsQuery.data ?? [];

  return (
    <div className="space-y-6">
      {/* Property Selector & Subnav */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface border border-hairline rounded-2xl p-5">
        <div>
          <h2 className="text-base font-bold text-ink flex items-center gap-2">
            <Building2 className="w-5 h-5 text-accent" />
            Facility & Operations Management
          </h2>
          <p className="text-xs text-ink-muted mt-0.5">
            Configure physical building floors, rooms, warden accounts, and gamification rules.
          </p>
        </div>

        {propertyList.length > 1 && (
          <select
            value={propertyId}
            onChange={(e) => setPropertyId(e.target.value)}
            className="px-3 py-1.5 bg-surface border border-hairline rounded-xl text-xs text-ink"
          >
            {propertyList.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {msg && (
        <div
          className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
            msg.type === "ok"
              ? "bg-success-tint border border-success/20 text-success"
              : "bg-danger-tint border border-danger/20 text-danger"
          }`}
        >
          {msg.type === "ok" ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
          <span>{msg.text}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-surface border border-hairline rounded-2xl overflow-x-auto">
        <button
          onClick={() => setTab("floors")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            tab === "floors" ? "bg-accent text-white" : "text-ink-muted hover:text-ink"
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Floors ({floors.length})</span>
        </button>
        <button
          onClick={() => setTab("rooms")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            tab === "rooms" ? "bg-accent text-white" : "text-ink-muted hover:text-ink"
          }`}
        >
          <DoorOpen className="w-4 h-4" />
          <span>Rooms ({rooms.length})</span>
        </button>
        <button
          onClick={() => setTab("wardens")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            tab === "wardens" ? "bg-accent text-white" : "text-ink-muted hover:text-ink"
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Wardens / Managers</span>
        </button>
        <button
          onClick={() => setTab("gamification")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            tab === "gamification" ? "bg-accent text-white" : "text-ink-muted hover:text-ink"
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Gamification Rules</span>
        </button>
      </div>

      {/* 1. Floors */}
      {tab === "floors" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-surface border border-hairline rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-ink flex items-center gap-2">
              <Plus className="w-4 h-4 text-accent" /> Add Floor
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-ink mb-1">Floor Number</label>
                <input
                  type="number"
                  value={floorNumber}
                  onChange={(e) => setFloorNumber(e.target.value)}
                  placeholder="e.g. 1"
                  className="w-full px-3 py-2 bg-surface border border-hairline rounded-xl text-xs text-ink"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink mb-1">Floor Name / Description</label>
                <input
                  value={floorName}
                  onChange={(e) => setFloorName(e.target.value)}
                  placeholder="e.g. First Floor - North"
                  className="w-full px-3 py-2 bg-surface border border-hairline rounded-xl text-xs text-ink"
                />
              </div>
              <button
                onClick={() => addFloorMutation.mutate()}
                disabled={addFloorMutation.isPending || !floorNumber || !floorName}
                className="w-full py-2.5 rounded-xl bg-accent text-white font-bold text-xs hover:bg-accent/90 disabled:opacity-50"
              >
                {addFloorMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Create Floor"}
              </button>
            </div>
          </div>

          <div className="md:col-span-2 bg-surface border border-hairline rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-ink">Floors in Property</h3>
            <div className="divide-y divide-hairline border border-hairline rounded-xl overflow-hidden">
              {floors.length === 0 ? (
                <div className="p-4 text-xs text-ink-muted">No floors added yet.</div>
              ) : (
                floors.map((f) => (
                  <div key={f.id} className="p-3 flex items-center justify-between text-xs">
                    <span className="font-bold text-ink">Floor {f.floor_number}</span>
                    <span className="text-ink-muted">{f.name}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. Rooms */}
      {tab === "rooms" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-surface border border-hairline rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-ink flex items-center gap-2">
              <Plus className="w-4 h-4 text-accent" /> Add Room
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-ink mb-1">Floor</label>
                <select
                  value={roomFloorId}
                  onChange={(e) => setRoomFloorId(e.target.value)}
                  className="w-full px-3 py-2 bg-surface border border-hairline rounded-xl text-xs text-ink"
                >
                  <option value="">Select Floor...</option>
                  {floors.map((f) => (
                    <option key={f.id} value={f.id}>
                      Floor {f.floor_number} — {f.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-ink mb-1">Room Number / Name</label>
                <input
                  value={roomNumber}
                  onChange={(e) => setRoomNumber(e.target.value)}
                  placeholder="e.g. 101"
                  className="w-full px-3 py-2 bg-surface border border-hairline rounded-xl text-xs text-ink"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-ink mb-1">Capacity</label>
                  <input
                    type="number"
                    value={roomCapacity}
                    onChange={(e) => setRoomCapacity(e.target.value)}
                    className="w-full px-3 py-2 bg-surface border border-hairline rounded-xl text-xs text-ink"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink mb-1">Included Units (kWh)</label>
                  <input
                    type="number"
                    value={includedUnits}
                    onChange={(e) => setIncludedUnits(e.target.value)}
                    className="w-full px-3 py-2 bg-surface border border-hairline rounded-xl text-xs text-ink"
                  />
                </div>
              </div>
              <button
                onClick={() => addRoomMutation.mutate()}
                disabled={addRoomMutation.isPending || !roomNumber || !roomFloorId}
                className="w-full py-2.5 rounded-xl bg-accent text-white font-bold text-xs hover:bg-accent/90 disabled:opacity-50"
              >
                {addRoomMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Create Room"}
              </button>
            </div>
          </div>

          <div className="md:col-span-2 bg-surface border border-hairline rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-ink">Rooms in Property</h3>
            <div className="divide-y divide-hairline border border-hairline rounded-xl overflow-hidden">
              {rooms.length === 0 ? (
                <div className="p-4 text-xs text-ink-muted">No rooms added yet.</div>
              ) : (
                rooms.map((r) => (
                  <div key={r.id} className="p-3 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-ink">Room {r.room_number}</span>
                      <span className="text-ink-muted text-[11px] block">Capacity: {r.capacity} beds</span>
                    </div>
                    <span className="font-mono text-ink-muted">{r.included_units} kWh included</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. Wardens / Managers */}
      {tab === "wardens" && (
        <div className="max-w-md bg-surface border border-hairline rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-ink flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-accent" /> Provision Warden Account
          </h3>
          <p className="text-xs text-ink-muted">
            Grant warden privileges scoped strictly to this property. They will sign in using Phone OTP.
          </p>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-ink mb-1">Phone Number (E.164)</label>
              <input
                value={managerPhone}
                onChange={(e) => setManagerPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full px-3 py-2 bg-surface border border-hairline rounded-xl text-xs text-ink font-mono"
              />
            </div>
            <button
              onClick={() => addManagerMutation.mutate()}
              disabled={addManagerMutation.isPending || !managerPhone.trim()}
              className="w-full py-2.5 rounded-xl bg-accent text-white font-bold text-xs hover:bg-accent/90 disabled:opacity-50"
            >
              {addManagerMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Assign Warden"}
            </button>
          </div>
        </div>
      )}

      {/* 4. Gamification Settings */}
      {tab === "gamification" && settings && (
        <div className="max-w-2xl bg-surface border border-hairline rounded-2xl p-6 space-y-5">
          <div className="border-b border-hairline pb-3">
            <h3 className="text-sm font-bold text-ink flex items-center gap-2">
              <Award className="w-4 h-4 text-accent" /> Gamification & Operational Budget Settings
            </h3>
            <p className="text-xs text-ink-muted mt-1">
              Configure points economics, monthly spend ceilings, and tariff parameters.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-ink mb-1">Point Value (Paise)</label>
              <input
                type="number"
                value={settings.point_value_paise}
                onChange={(e) => setSettings({ ...settings, point_value_paise: parseInt(e.target.value, 10) || 0 })}
                className="w-full px-3 py-2 bg-surface border border-hairline rounded-xl text-xs text-ink"
              />
              <span className="text-[10px] text-ink-muted">100 paise = ₹1.00</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-ink mb-1">Monthly Budget (Paise)</label>
              <input
                type="number"
                value={settings.monthly_budget_paise}
                onChange={(e) => setSettings({ ...settings, monthly_budget_paise: parseInt(e.target.value, 10) || 0 })}
                className="w-full px-3 py-2 bg-surface border border-hairline rounded-xl text-xs text-ink"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-ink mb-1">Max Earn Cap Per Resident (Pts)</label>
              <input
                type="number"
                value={settings.earn_cap_per_tenant}
                onChange={(e) => setSettings({ ...settings, earn_cap_per_tenant: parseInt(e.target.value, 10) || 0 })}
                className="w-full px-3 py-2 bg-surface border border-hairline rounded-xl text-xs text-ink"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-ink mb-1">Meal RSVP Monthly Sub-cap (Pts)</label>
              <input
                type="number"
                value={settings.rsvp_sub_cap}
                onChange={(e) => setSettings({ ...settings, rsvp_sub_cap: parseInt(e.target.value, 10) || 0 })}
                className="w-full px-3 py-2 bg-surface border border-hairline rounded-xl text-xs text-ink"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-ink mb-1">Floor Cleanliness Threshold (%)</label>
              <input
                type="number"
                value={settings.floor_bonus_threshold}
                onChange={(e) => setSettings({ ...settings, floor_bonus_threshold: parseInt(e.target.value, 10) || 0 })}
                className="w-full px-3 py-2 bg-surface border border-hairline rounded-xl text-xs text-ink"
              />
              <span className="text-[10px] text-ink-muted">Unlocks 1.5× clean points multiplier</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-ink mb-1">Electricity Tariff (Paise / kWh)</label>
              <input
                type="number"
                value={settings.electricity_tariff_paise}
                onChange={(e) => setSettings({ ...settings, electricity_tariff_paise: parseInt(e.target.value, 10) || 0 })}
                className="w-full px-3 py-2 bg-surface border border-hairline rounded-xl text-xs text-ink"
              />
            </div>
          </div>

          <button
            onClick={() => updateSettingsMutation.mutate()}
            disabled={updateSettingsMutation.isPending}
            className="w-full py-2.5 rounded-xl bg-accent text-white font-bold text-xs hover:bg-accent/90 disabled:opacity-50"
          >
            {updateSettingsMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Save Gamification Rules"}
          </button>
        </div>
      )}
    </div>
  );
};
