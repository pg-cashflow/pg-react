import React, { useEffect } from "react";
import { useAuth } from "@/auth/context";
import { useManagerAction } from "@/components/layout/ManagerShell";

export const ManagerProfileView: React.FC = () => {
  const { user, logout } = useAuth();
  const setAction = useManagerAction();

  useEffect(() => {
    setAction(null);
    return () => setAction(null);
  }, [setAction]);

  return (
    <div className="space-y-4">
      <h1 className="t-h1">Warden profile</h1>
      <section className="rounded-[14px] border border-hairline bg-surface divide-y divide-hairline">
        <div className="flex justify-between px-4 py-3">
          <span className="t-caption text-ink-faint">Phone</span>
          <span className="t-body font-medium">{user?.phone || "—"}</span>
        </div>
        <div className="flex justify-between px-4 py-3">
          <span className="t-caption text-ink-faint">Role</span>
          <span className="t-body font-medium">Warden</span>
        </div>
      </section>
      <button
        type="button"
        onClick={logout}
        className="w-full h-12 rounded-[10px] border border-hairline text-danger font-semibold"
      >
        Log out
      </button>
    </div>
  );
};
