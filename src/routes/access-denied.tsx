import React from "react";
import { ShieldAlert, LogOut } from "lucide-react";
import { useAuth } from "@/auth/context";

export const AccessDeniedView: React.FC = () => {
  const { logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-8 text-center">
        <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold text-slate-100 mb-2">Access Denied</h1>
        <p className="text-sm text-slate-400 mb-6">
          Your account does not have a valid role assigned. Please contact your PG administrator.
        </p>
        <button
          onClick={logout}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 text-slate-200 font-semibold text-sm hover:bg-slate-700 transition"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
};
