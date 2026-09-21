import React from "react";
import { ShieldAlert, LogOut } from "lucide-react";
import { useAuth } from "@/auth/context";

export const AccessDeniedView: React.FC = () => {
  const { logout } = useAuth();

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-surface border border-hairline rounded-[14px] p-8 text-center">
        <div className="w-12 h-12 rounded-[14px] bg-danger-tint text-danger flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h1 className="t-h1 mb-2">Access denied</h1>
        <p className="t-body-sm text-ink-muted mb-6">
          Your account does not have a valid role assigned. Please contact your PG owner.
        </p>
        <button
          onClick={logout}
          className="inline-flex items-center justify-center gap-2 px-5 h-11 rounded-[10px] bg-accent text-white font-semibold"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </div>
  );
};
