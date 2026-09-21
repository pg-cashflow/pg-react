import React, { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  CreditCard,
  Receipt,
  UserPlus,
  UserCheck,
  Flame,
  ShieldAlert,
  Sparkles,
  Gift,
  ExternalLink,
  X,
  Loader2,
} from "lucide-react";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  type NotificationItem,
} from "@/api/notifications";

function formatRelativeTime(dateStr: string): string {
  try {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffSec = Math.max(0, Math.floor(diffMs / 1000));
    if (diffSec < 60) return "just now";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 7) return `${diffDay}d ago`;
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

function getNotificationIcon(type: string) {
  switch (type) {
    case "payment_review":
      return {
        icon: CreditCard,
        bgClass: "bg-accent-tint text-accent",
      };
    case "due_paid":
      return {
        icon: Receipt,
        bgClass: "bg-success-tint text-success",
      };
    case "payment_rejected":
      return {
        icon: AlertCircle,
        bgClass: "bg-danger-tint text-danger",
      };
    case "join_requested":
      return {
        icon: UserPlus,
        bgClass: "bg-teal-500/10 text-teal-500",
      };
    case "join_approved":
    case "tenant_created":
      return {
        icon: UserCheck,
        bgClass: "bg-success-tint text-success",
      };
    case "inspection_completed":
      return {
        icon: CheckCircle2,
        bgClass: "bg-blue-500/10 text-blue-500",
      };
    case "inspection_disputed":
      return {
        icon: AlertTriangle,
        bgClass: "bg-accent-tint text-accent",
      };
    case "hazard_reported":
      return {
        icon: Flame,
        bgClass: "bg-danger-tint text-danger",
      };
    case "hazard_resolved":
      return {
        icon: CheckCircle2,
        bgClass: "bg-success-tint text-success",
      };
    case "violation_issued":
      return {
        icon: ShieldAlert,
        bgClass: "bg-danger-tint text-danger",
      };
    case "points_awarded":
      return {
        icon: Sparkles,
        bgClass: "bg-accent-tint text-accent",
      };
    case "reward_redeemed":
      return {
        icon: Gift,
        bgClass: "bg-purple-500/10 text-purple-500",
      };
    default:
      return {
        icon: Bell,
        bgClass: "bg-accent-tint text-accent",
      };
  }
}

export const NotificationCenter: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => getNotifications(),
    refetchInterval: 20000,
    staleTime: 10000,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markAllMutation = useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const notifications = data?.notifications || [];
  const unreadCount = data?.unread_count || 0;

  const handleItemClick = async (notif: NotificationItem) => {
    if (!notif.read_at) {
      markReadMutation.mutate(notif.id);
    }
    setIsOpen(false);
    if (notif.deep_link) {
      try {
        await navigate({ to: notif.deep_link as any });
      } catch {
        window.location.href = notif.deep_link;
      }
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* Bell Trigger Button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative p-2 rounded-xl text-ink-muted hover:text-ink hover:bg-accent-tint transition min-h-[40px] min-w-[40px] flex items-center justify-center active:scale-95 border border-hairline/60 bg-surface/80"
        aria-label="Notifications"
        aria-expanded={isOpen}
      >
        <Bell className="w-4 h-4 text-ink transition-transform duration-200 hover:rotate-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-accent text-white text-[10px] font-bold flex items-center justify-center shadow-md animate-in zoom-in-50 duration-200">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-[340px] sm:w-[400px] max-h-[80vh] flex flex-col bg-surface/95 backdrop-blur-xl border border-hairline rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Panel Header */}
          <div className="px-4 py-3 border-b border-hairline flex items-center justify-between bg-surface/80">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-ink">Notifications</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-accent-tint text-accent">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllMutation.mutate()}
                  disabled={markAllMutation.isPending}
                  className="px-2 py-1 text-xs font-medium text-accent hover:text-accent-pressed hover:bg-accent-tint rounded-lg transition flex items-center gap-1 disabled:opacity-50"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Mark read</span>
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-ink-muted hover:text-ink hover:bg-hairline/60 transition"
                aria-label="Close panel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Panel Body */}
          <div className="flex-1 overflow-y-auto divide-y divide-hairline/60 max-h-[460px]">
            {isLoading ? (
              <div className="py-12 flex flex-col items-center justify-center text-ink-muted gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-accent" />
                <span className="text-xs">Loading notifications...</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-12 px-4 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 rounded-2xl bg-accent-tint flex items-center justify-center text-accent mb-3">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <p className="text-sm font-medium text-ink">All caught up!</p>
                <p className="text-xs text-ink-muted mt-1">
                  No new notifications right now.
                </p>
              </div>
            ) : (
              notifications.map((notif) => {
                const { icon: Icon, bgClass } = getNotificationIcon(notif.type);
                const isUnread = !notif.read_at;

                return (
                  <div
                    key={notif.id}
                    onClick={() => handleItemClick(notif)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        handleItemClick(notif);
                      }
                    }}
                    className={`px-4 py-3 flex items-start gap-3 text-left transition cursor-pointer hover:bg-accent-tint/40 relative group ${
                      isUnread
                        ? "bg-accent-tint/20 font-medium"
                        : "opacity-85 hover:opacity-100"
                    }`}
                  >
                    {/* Icon */}
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${bgClass}`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                        <p className="text-xs font-semibold text-ink leading-snug break-words">
                          {notif.title}
                        </p>
                        {notif.is_action_required && (
                          <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold tracking-wide uppercase bg-danger-tint text-rose-600 dark:text-danger border border-danger/20">
                            Action
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-ink-muted">
                        <span>{formatRelativeTime(notif.created_at)}</span>
                        {notif.deep_link && (
                          <span className="opacity-0 group-hover:opacity-100 transition inline-flex items-center gap-0.5 text-accent font-normal">
                            Open <ExternalLink className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Unread dot indicator */}
                    {isUnread && (
                      <div className="w-2 h-2 rounded-full bg-accent flex-shrink-0 self-center" />
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Panel Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2 border-t border-hairline bg-surface/60 text-center">
              <span className="text-[11px] text-ink-faint">
                Showing latest notifications
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
