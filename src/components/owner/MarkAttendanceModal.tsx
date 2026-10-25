import React, { useState, useEffect } from "react";
import { X, CalendarCheck2, Check, AlertCircle, Loader2 } from "lucide-react";
import { useMarkDailyAttendance } from "@/lib/useAttendance";
import type { StaffProfile, AttendanceStatus, DailyAttendanceEntryInput } from "@pg/types";

interface MarkAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffList: StaffProfile[];
  initialDate?: string;
  onRecorded?: () => void;
}

const STATUS_OPTIONS: Array<{ value: AttendanceStatus; label: string; badgeClass: string }> = [
  { value: "present", label: "Present", badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
  { value: "absent", label: "Absent", badgeClass: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20" },
  { value: "half_day", label: "Half Day", badgeClass: "bg-warning-tint text-warning border-warning/20" },
  { value: "paid_leave", label: "Paid Leave", badgeClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" },
  { value: "holiday", label: "Holiday", badgeClass: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20" },
];

export const MarkAttendanceModal: React.FC<MarkAttendanceModalProps> = ({
  isOpen,
  onClose,
  staffList,
  initialDate,
  onRecorded,
}) => {
  const [workDate, setWorkDate] = useState<string>(
    () => initialDate || new Date().toISOString().split("T")[0]
  );
  const [entries, setEntries] = useState<Record<string, { status: AttendanceStatus; notes: string }>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const markMutation = useMarkDailyAttendance();

  useEffect(() => {
    if (staffList.length > 0) {
      const initial: Record<string, { status: AttendanceStatus; notes: string }> = {};
      staffList.forEach((s) => {
        initial[s.id] = { status: "present", notes: "" };
      });
      setEntries(initial);
    }
  }, [staffList, isOpen]);

  if (!isOpen) return null;

  const handleStatusChange = (staffId: string, status: AttendanceStatus) => {
    setEntries((prev) => ({
      ...prev,
      [staffId]: {
        ...(prev[staffId] || { notes: "" }),
        status,
      },
    }));
  };

  const handleNotesChange = (staffId: string, notes: string) => {
    setEntries((prev) => ({
      ...prev,
      [staffId]: {
        ...(prev[staffId] || { status: "present" }),
        notes,
      },
    }));
  };

  const handleMarkAll = (status: AttendanceStatus) => {
    setEntries((prev) => {
      const updated = { ...prev };
      staffList.forEach((s) => {
        updated[s.id] = {
          ...(updated[s.id] || { notes: "" }),
          status,
        };
      });
      return updated;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!workDate) {
      setErrorMessage("Please pick an attendance date.");
      return;
    }

    const payloadEntries: DailyAttendanceEntryInput[] = staffList.map((s) => {
      const current = entries[s.id] || { status: "present", notes: "" };
      return {
        staff_id: s.id,
        status: current.status,
        notes: current.notes.trim() || undefined,
      };
    });

    if (payloadEntries.length === 0) {
      setErrorMessage("No staff members available to mark attendance.");
      return;
    }

    markMutation.mutate(
      {
        work_date: workDate,
        entries: payloadEntries,
      },
      {
        onSuccess: () => {
          onRecorded?.();
          onClose();
        },
        onError: (err: any) => {
          setErrorMessage(err.message || "Failed to save attendance.");
        },
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-surface border border-border rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <CalendarCheck2 className="w-5 h-5 text-accent" />
            <h3 className="font-semibold text-text text-base">Record Daily Attendance</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-text-muted hover:text-text hover:bg-surface-elevated transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {errorMessage && (
            <div className="flex items-center gap-2 p-3 text-sm text-danger-text bg-danger-bg border border-danger-border rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-border">
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-text-muted">Work Date:</label>
              <input
                type="date"
                required
                value={workDate}
                onChange={(e) => setWorkDate(e.target.value)}
                className="px-3 py-1.5 text-sm bg-surface-elevated border border-border rounded-xl text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-muted">Quick Set:</span>
              <button
                type="button"
                onClick={() => handleMarkAll("present")}
                className="px-2.5 py-1 text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/20 transition-colors"
              >
                All Present
              </button>
              <button
                type="button"
                onClick={() => handleMarkAll("holiday")}
                className="px-2.5 py-1 text-xs font-medium bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 rounded-lg hover:bg-purple-500/20 transition-colors"
              >
                All Holiday
              </button>
            </div>
          </div>

          {staffList.length === 0 ? (
            <div className="p-8 text-center text-text-muted text-sm">
              No active staff found. Please add staff profiles first.
            </div>
          ) : (
            <div className="space-y-3">
              {staffList.map((staff) => {
                const current = entries[staff.id] || { status: "present", notes: "" };
                return (
                  <div
                    key={staff.id}
                    className="p-3 bg-surface-elevated/40 border border-border rounded-xl space-y-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="font-medium text-text text-sm">{staff.name}</div>
                        <div className="text-xs text-text-muted">{staff.role}</div>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        {STATUS_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => handleStatusChange(staff.id, opt.value)}
                            className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-all ${
                              current.status === opt.value
                                ? `${opt.badgeClass} ring-2 ring-primary/30 font-semibold shadow-xs`
                                : "bg-surface border-border text-text-muted hover:text-text hover:bg-surface-elevated"
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <input
                      type="text"
                      placeholder="Optional notes / reason..."
                      value={current.notes}
                      onChange={(e) => handleNotesChange(staff.id, e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-surface border border-border rounded-lg text-text placeholder:text-text-muted/70 focus:outline-none focus:ring-1 focus:ring-primary/30"
                    />
                  </div>
                );
              })}
            </div>
          )}

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
              disabled={markMutation.isPending || staffList.length === 0}
              className="px-4 py-2 text-sm font-medium bg-accent text-white rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
            >
              {markMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Recording...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Save Daily Attendance
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
