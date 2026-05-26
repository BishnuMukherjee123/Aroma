"use client";

import Link from "next/link";

import { type MeResponse } from "@/lib/api";
import { clearStoredToken } from "@/lib/auth-storage";
import {
  getAccountLabel,
  getPortalLoginPath,
  type PortalVariant,
} from "@/lib/portal";

export function DashboardTopbar({
  user,
  portalVariant = "owner",
}: {
  user: MeResponse;
  portalVariant?: PortalVariant;
}) {
  return (
    <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-4 border-b border-white/80 bg-surface/88 px-6 py-3 backdrop-blur md:px-8">
      <div className="relative w-full max-w-sm">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/70">
          search
        </span>
        <input
          type="text"
          placeholder="Search control room..."
          aria-label="Search control room"
          className="w-full rounded-full bg-surface-container-low px-11 py-2.5 text-sm font-medium text-on-surface outline-none transition-all placeholder:text-on-surface-variant/65 focus:bg-white focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        {["notifications", "help"].map((icon) => (
          <button
            key={icon}
            type="button"
            aria-label={icon}
            className="flex size-10 items-center justify-center rounded-full text-on-surface-variant/80 transition-colors hover:bg-surface-container-low hover:text-on-surface"
          >
            <span className="material-symbols-outlined text-[1.1rem]">{icon}</span>
          </button>
        ))}

        <div className="mx-1 hidden h-8 w-px bg-outline-variant/30 md:block" />

        <div className="hidden text-right md:block">
          <p className="text-xs font-bold text-on-surface">
            {getAccountLabel(portalVariant)}
          </p>
          <p className="text-[11px] font-medium text-on-surface-variant">
            {user.email}
          </p>
        </div>

        <div className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-surface-container-high to-surface-container-low text-sm font-bold text-primary shadow-[0_8px_20px_rgba(18,28,42,0.06)]">
          {user.email.charAt(0).toUpperCase()}
        </div>

        <Link
          href={getPortalLoginPath(portalVariant)}
          onClick={() => clearStoredToken()}
          className="ml-2 text-sm font-semibold text-on-surface-variant transition-colors hover:text-primary"
        >
          Logout
        </Link>
      </div>
    </header>
  );
}
