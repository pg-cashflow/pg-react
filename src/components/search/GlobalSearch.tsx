import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search, Loader2, CornerDownLeft } from "lucide-react";
import type { UserRole } from "@pg/types";
import { searchGlobal, type SearchResult } from "@/api/search";
import { filterNavItems, navItemsForRole, type NavIndexItem } from "@/lib/navIndex";

const DEBOUNCE_MS = 200;

interface GlobalSearchProps {
  role: UserRole;
}

type PaletteRow =
  | { kind: "nav"; item: NavIndexItem }
  | { kind: "api"; item: SearchResult };

export const GlobalSearch: React.FC<GlobalSearchProps> = ({ role }) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [debounced, setDebounced] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(input.trim()), DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [input]);

  const canQueryApi = debounced.length >= 2 || /^[A-Za-z0-9-]{6,}$/.test(debounced);

  const searchQuery = useQuery({
    queryKey: ["search", debounced, role],
    queryFn: () => searchGlobal(debounced),
    enabled: open && canQueryApi,
    staleTime: 30_000,
  });

  const navHits = useMemo(() => filterNavItems(navItemsForRole(role), debounced), [role, debounced]);

  const rows: PaletteRow[] = useMemo(() => {
    const apiRows: PaletteRow[] = (searchQuery.data?.results ?? []).map((item) => ({ kind: "api", item }));
    const navRows: PaletteRow[] = navHits.map((item) => ({ kind: "nav", item }));
    return [...apiRows, ...navRows];
  }, [searchQuery.data?.results, navHits]);

  useEffect(() => {
    setActiveIndex(0);
  }, [debounced, rows.length]);

  const openPalette = useCallback(() => {
    setOpen(true);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  const closePalette = useCallback(() => {
    setOpen(false);
    setInput("");
    setDebounced("");
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (open) closePalette();
        else openPalette();
      }
      if (e.key === "Escape" && open) {
        e.preventDefault();
        closePalette();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, openPalette, closePalette]);

  const go = (row: PaletteRow) => {
    const path = row.kind === "nav" ? row.item.path : row.item.path;
    closePalette();
    const u = new URL(path, window.location.origin);
    const search: Record<string, string> = {};
    u.searchParams.forEach((v, k) => {
      search[k] = v;
    });
    navigate({ to: u.pathname, search });
  };

  const onInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, Math.max(0, rows.length - 1)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && rows[activeIndex]) {
      e.preventDefault();
      go(rows[activeIndex]);
    }
  };

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${activeIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  return (
    <>
      <button
        type="button"
        onClick={openPalette}
        className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-hairline bg-surface/80 text-ink-muted hover:text-ink hover:border-accent/30 text-xs min-h-[36px]"
        aria-label="Open search"
      >
        <Search className="w-3.5 h-3.5" />
        <span>Search</span>
        <kbd className="hidden lg:inline text-[10px] px-1.5 py-0.5 rounded bg-bg border border-hairline">Ctrl K</kbd>
      </button>
      <button
        type="button"
        onClick={openPalette}
        className="sm:hidden p-2 rounded-xl text-ink-muted hover:text-ink hover:bg-accent-tint min-h-[44px] min-w-[44px] flex items-center justify-center"
        aria-label="Open search"
      >
        <Search className="w-5 h-5" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[max(1rem,env(safe-area-inset-top))] bg-ink/40 backdrop-blur-sm"
          onClick={closePalette}
        >
          <div
            className="w-full max-w-xl rounded-2xl border border-hairline bg-surface shadow-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Global search"
          >
            <div className="flex items-center gap-2 px-4 border-b border-hairline">
              <Search className="w-4 h-4 text-ink-muted shrink-0" />
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onInputKeyDown}
                placeholder="Search tenants, dues, navigation…"
                className="flex-1 py-3.5 text-sm bg-transparent outline-none text-ink placeholder:text-ink-muted"
                aria-activedescendant={rows.length ? `search-option-${activeIndex}` : undefined}
                aria-controls="global-search-list"
                autoComplete="off"
              />
              {searchQuery.isFetching && <Loader2 className="w-4 h-4 animate-spin text-ink-muted" />}
            </div>
            <ul id="global-search-list" ref={listRef} className="max-h-[min(60vh,420px)] overflow-y-auto py-2">
              {rows.length === 0 && (
                <li className="px-4 py-6 text-sm text-ink-muted text-center">
                  {canQueryApi ? "No results" : "Type at least 2 characters, or a due code / UTR"}
                </li>
              )}
              {rows.map((row, idx) => {
                const title = row.kind === "nav" ? row.item.title : row.item.title;
                const subtitle =
                  row.kind === "nav"
                    ? row.item.subtitle ?? "Go to page"
                    : row.item.subtitle || row.item.type.replace("_", " ");
                const badge = row.kind === "nav" ? "Navigation" : row.item.type.replace("_", " ");
                return (
                  <li key={`${row.kind}-${row.kind === "nav" ? row.item.id : row.item.id}`}>
                    <button
                      type="button"
                      data-idx={idx}
                      id={idx === activeIndex ? `search-option-${idx}` : undefined}
                      onClick={() => go(row)}
                      className={`w-full text-left px-4 py-2.5 flex items-center gap-3 ${
                        idx === activeIndex ? "bg-accent-tint" : "hover:bg-accent-tint/60"
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-ink truncate">{title}</p>
                        <p className="text-xs text-ink-muted truncate">{subtitle}</p>
                      </div>
                      <span className="text-[10px] uppercase tracking-wide text-ink-muted shrink-0">{badge}</span>
                      {idx === activeIndex && <CornerDownLeft className="w-3.5 h-3.5 text-ink-muted" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </>
  );
};
