"use client";

import Link from "next/link";

import { clearStoredToken } from "@/lib/auth-storage";
import { cn } from "@/lib/utils";

const workspaceNav = [
  { label: "Menu & Dishes", icon: "restaurant_menu", active: true },
  { label: "Team Members", icon: "group", active: false },
  { label: "Performance", icon: "analytics", active: false },
  { label: "Store Settings", icon: "settings", active: false },
] as const;

export function WorkspaceSidebar({
  ownerLabel,
}: {
  ownerLabel: string;
}) {
  return (
    <aside className="hidden h-screen w-64 flex-col border-r border-white/75 bg-slate-50/94 px-4 py-4 shadow-[0_8px_34px_rgba(18,28,42,0.05)] backdrop-blur md:fixed md:left-0 md:top-0 md:flex">
      <div className="px-2 py-2">
        <h1 className="text-xl font-bold tracking-[-0.04em] text-on-surface">
          Aroma Admin
        </h1>
        <p className="mt-1 text-[11px] font-medium text-on-surface-variant">
          Management Portal
        </p>
      </div>

      <nav className="mt-8 flex-1 space-y-2">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-on-surface/72 transition-colors hover:bg-white hover:text-primary"
        >
          <span className="material-symbols-outlined text-[1.05rem]">
            arrow_back
          </span>
          Back to Portfolio
        </Link>

        <div className="px-4 pt-4 pb-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-on-surface-variant/55">
            Restaurant Workspace
          </p>
        </div>

        {workspaceNav.map((item) => (
          <button
            key={item.label}
            type="button"
            className={cn(
              "flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold transition-all",
              item.active
                ? "border-r-4 border-primary bg-white text-primary shadow-[0_10px_22px_rgba(18,28,42,0.04)]"
                : "text-on-surface/70 hover:bg-white hover:text-on-surface",
            )}
          >
            <span className="material-symbols-outlined text-[1.05rem]">
              {item.icon}
            </span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="mt-auto space-y-3 p-2">
        <div className="flex items-center gap-3 rounded-[1.2rem] bg-white p-3 shadow-[0_10px_24px_rgba(18,28,42,0.05)]">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-primary/12 to-surface-container-high text-sm font-bold text-primary">
            {ownerLabel.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-on-surface">
              {ownerLabel}
            </p>
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-on-surface-variant">
              Workspace Owner
            </p>
          </div>
        </div>

        <Link
          href="/"
          onClick={() => clearStoredToken()}
          className="flex items-center justify-center rounded-xl border border-outline-variant/25 px-4 py-3 text-sm font-semibold text-on-surface/70 transition-colors hover:bg-white"
        >
          Logout
        </Link>
      </div>
    </aside>
  );
}
