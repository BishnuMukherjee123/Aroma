"use client";

import Link from "next/link";

import { clearStoredToken } from "@/lib/auth-storage";
import {
  getPortalLoginPath,
  getPortalSubtitle,
  getPortalTitle,
  type PortalVariant,
} from "@/lib/portal";
import { cn } from "@/lib/utils";

type WorkspaceTab = "dishes" | "menus" | "team" | "settings" | "share";

const ownerWorkspaceNav: Array<{ id: WorkspaceTab; label: string; icon: string }> = [
  { id: "dishes", label: "Manage Dishes", icon: "restaurant_menu" },
  { id: "team", label: "Manager Access", icon: "group" },
  { id: "settings", label: "Settings", icon: "settings" },
];

const managerWorkspaceNav: Array<{ id: WorkspaceTab; label: string; icon: string }> = [
  { id: "dishes", label: "Manage Dishes", icon: "restaurant_menu" },
  { id: "share", label: "Share & QR", icon: "qr_code_2" },
  { id: "settings", label: "Settings", icon: "settings" },
];

export function WorkspaceSidebar({
  profileLabel,
  profileCaption,
  homePath,
  portalVariant = "owner",
  activeTab = "dishes",
  onTabChange,
  profilePicUrl,
}: {
  profileLabel: string;
  profileCaption: string;
  homePath: string;
  portalVariant?: PortalVariant;
  activeTab?: WorkspaceTab;
  onTabChange?: (tab: WorkspaceTab) => void;
  profilePicUrl?: string | null;
}) {
  const workspaceNav =
    portalVariant === "owner" ? ownerWorkspaceNav : managerWorkspaceNav;

  return (
    <aside className="hidden w-64 flex-col border-none bg-[#f7f7f7] p-4 rounded-[1.25rem] md:fixed md:left-[16px] md:top-[16px] md:flex" style={{ height: 'calc(100vh - 32px)' }}>
      <div className="p-2">
        <h1 className="text-xl font-bold tracking-[-0.04em] text-on-surface">
          {getPortalTitle(portalVariant)}
        </h1>
        <p className="mt-1 text-[11px] font-medium text-on-surface-variant">
          {getPortalSubtitle(portalVariant)}
        </p>
      </div>

      <nav className="mt-8 flex-1 space-y-2">
        <Link
          href={homePath}
          className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-on-surface/72 transition-colors hover:bg-white hover:text-primary"
        >
          <span className="material-symbols-outlined text-[1.05rem]">
            arrow_back
          </span>
          {portalVariant === "owner"
            ? "Back to Portfolio"
            : "Back to Manager Home"}
        </Link>

        <div className="px-4 pt-4 pb-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-on-surface-variant/55">
            Restaurant Workspace
          </p>
        </div>

        {workspaceNav.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onTabChange?.(item.id)}
            className={cn(
              "flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold transition-all",
              activeTab === item.id
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
          {profilePicUrl ? (
            <img
              src={profilePicUrl}
              alt={profileLabel}
              className="size-11 rounded-full object-cover"
            />
          ) : (
            <div className="flex size-11 items-center justify-center rounded-full bg-gradient-to-br from-primary/12 to-surface-container-high text-sm font-bold text-primary">
              {profileLabel.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-on-surface">
              {profileLabel}
            </p>
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-on-surface-variant">
              {profileCaption}
            </p>
          </div>
        </div>

        <Link
          href={getPortalLoginPath(portalVariant)}
          onClick={() => clearStoredToken()}
          className="flex items-center justify-center rounded-xl border border-outline-variant/25 px-4 py-3 text-sm font-semibold text-on-surface/70 transition-colors hover:bg-white"
        >
          Logout
        </Link>
      </div>
    </aside>
  );
}
