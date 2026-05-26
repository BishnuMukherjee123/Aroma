"use client";

import Link from "next/link";
import { RefObject, useEffect, useRef, useState } from "react";

import { clearStoredToken } from "@/lib/auth-storage";
import {
  getPortalHomePath,
  getPortalLoginPath,
  getPortalSubtitle,
  getPortalTitle,
  getWorkspacePath,
  type PortalVariant,
} from "@/lib/portal";
import { cn } from "@/lib/utils";

type SidebarRestaurant = {
  id: string;
  name: string;
  isActive: boolean;
};

const ownerNav = [
  { label: "Overview", icon: "dashboard", key: "overview" },
  { label: "Restaurants", icon: "restaurant", key: "restaurants" },
  { label: "Assets", icon: "inventory_2", key: "assets" },
  { label: "Team", icon: "groups", key: "team" },
  { label: "Settings", icon: "settings", key: "settings" },
] as const;

const managerNav = [
  { label: "Overview", icon: "dashboard", key: "overview" },
  { label: "Restaurant", icon: "restaurant", key: "restaurants" },
  { label: "Share & QR", icon: "qr_code_2", key: "share" },
] as const;

export function DashboardSidebar({
  createPanelRef,
  portalVariant = "owner",
  activeKey = "overview",
  onNavChange,
}: {
  createPanelRef?: RefObject<HTMLElement | null>;
  portalVariant?: PortalVariant;
  activeKey?: string;
  onNavChange?: (key: string) => void;
}) {
  const primaryNav = portalVariant === "owner" ? ownerNav : managerNav;

  // Sliding pill position tracking
  const navRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const pillRef = useRef<HTMLDivElement>(null);
  const navContainerRef = useRef<HTMLElement>(null);
  const [pillTop, setPillTop] = useState(-100);
  const [pillHeight, setPillHeight] = useState(0);

  useEffect(() => {
    const activeIdx = primaryNav.findIndex((item) => item.key === activeKey);
    const activeEl = navRefs.current[activeIdx];
    if (activeEl) {
      const parentRect = activeEl.parentElement?.getBoundingClientRect();
      const elRect = activeEl.getBoundingClientRect();
      if (parentRect) {
        const top = elRect.top - parentRect.top;
        // Pill is 60% of the button height, centered vertically
        const h = elRect.height * 0.6;
        const offset = (elRect.height - h) / 2;
        setPillTop(top + offset);
        setPillHeight(h);
      }
    }
  }, [activeKey, primaryNav]);

  return (
    <aside className="hidden h-screen w-64 shrink-0 flex-col border-r border-white/70 bg-white/86 p-4 shadow-[0_8px_34px_rgba(18,28,42,0.05)] backdrop-blur md:fixed md:left-0 md:top-0 md:flex">
      <div className="mb-8 flex items-center gap-3 px-2">
        <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-container text-white shadow-[0_10px_22px_rgba(182,23,34,0.18)]">
          <span
            className="material-symbols-outlined"
            style={{ fontVariationSettings: '"FILL" 1' }}
          >
            restaurant
          </span>
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-[-0.03em] text-primary">
            {getPortalTitle(portalVariant)}
          </h1>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-on-surface-variant/60">
            {getPortalSubtitle(portalVariant)}
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto relative">
        {/* Sliding green pill indicator */}
        <div
          ref={pillRef}
          className="dash-nav-pill absolute left-0 w-[5px] rounded-full bg-[var(--dash-green-700,#176939)] transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
          style={{ top: pillTop, height: pillHeight, opacity: pillTop >= 0 ? 1 : 0 }}
        />

        {primaryNav.map((item, idx) => {
          const isActive = activeKey === item.key;

          return (
            <button
              key={item.key}
              ref={(el) => { navRefs.current[idx] = el; }}
              type="button"
              onClick={() => onNavChange?.(item.key)}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold transition-all",
                isActive
                  ? "translate-x-1 bg-primary/8 text-primary"
                  : "text-on-surface/70 hover:bg-surface-container-low hover:text-on-surface",
              )}
            >
              <span className="material-symbols-outlined text-[1.05rem]">
                {item.icon}
              </span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="mt-auto space-y-3 border-t border-outline-variant/20 pt-4">
        {portalVariant === "owner" ? (
          <button
            type="button"
            onClick={() => onNavChange?.("create")}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-primary to-primary-container px-4 py-3 text-sm font-bold text-white shadow-[0_14px_30px_rgba(182,23,34,0.18)] transition-transform hover:-translate-y-0.5"
          >
            <span className="material-symbols-outlined text-[1rem]">
              add_circle
            </span>
            New Location
          </button>
        ) : (
          <Link
            href={getPortalHomePath(portalVariant)}
            className="flex items-center justify-center rounded-xl bg-surface-container-low px-4 py-3 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container-high"
          >
            Assigned Workspace
          </Link>
        )}

        <Link
          href={getPortalLoginPath(portalVariant)}
          onClick={() => clearStoredToken()}
          className="flex items-center justify-center rounded-xl border border-outline-variant/25 px-4 py-3 text-sm font-semibold text-on-surface/70 transition-colors hover:bg-surface-container-low"
        >
          Logout
        </Link>
      </div>
    </aside>
  );
}
