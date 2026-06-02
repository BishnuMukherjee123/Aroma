"use client";

import { type PortalVariant } from "@/lib/portal";

type WorkspaceHeaderProps = {
  restaurantName: string;
  publicId: string;
  qrState: string | null;
  isCopyingQr: boolean;
  onCopyQr: () => void;
  onCreateDish: () => void;
  portalVariant?: PortalVariant;
  logoUrl?: string | null;
  onLogoUpload?: (file: File) => void;
  isUploadingLogo?: boolean;
};

export function WorkspaceHeader({
  restaurantName,
  publicId,
  qrState,
  isCopyingQr,
  onCopyQr,
  onCreateDish,
  portalVariant = "owner",
  logoUrl,
  onLogoUpload,
  isUploadingLogo,
}: WorkspaceHeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-4 border-b border-white/80 bg-white/88 px-6 py-4 backdrop-blur md:px-8">
      <div className="flex items-center gap-4">
        <div className={`flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl ${
          logoUrl
            ? "bg-transparent shadow-sm border border-outline-variant/30"
            : "bg-primary/10 text-primary"
        }`}>
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={`${restaurantName} logo`}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="material-symbols-outlined text-[1.5rem]">
              restaurant
            </span>
          )}
        </div>

        <div>
          <h1 className="text-[1.7rem] font-extrabold tracking-[-0.04em] text-on-surface">
            {restaurantName}
          </h1>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">
            {portalVariant === "owner" ? "Active Workspace" : "Manager Workspace"}{" "}
            - {publicId}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3">
        <div className="rounded-[1rem] bg-surface-container-low px-4 py-2.5">
          <div className="flex items-center gap-3">
            <div className="min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-on-surface-variant/70">
                Public Link
              </p>
              <p className="truncate text-xs font-medium text-on-surface-variant">
                aroma.app/r/{publicId}
              </p>
            </div>

            <button
              type="button"
              onClick={onCopyQr}
              disabled={isCopyingQr}
              className="flex items-center gap-1 rounded-[0.9rem] bg-white px-3 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-on-surface shadow-[0_10px_24px_rgba(18,28,42,0.05)] transition-colors hover:text-primary disabled:cursor-not-allowed disabled:opacity-70"
            >
              <span className="material-symbols-outlined text-[1rem]">
                qr_code_2
              </span>
              {isCopyingQr ? "Working" : "Copy Link"}
            </button>
          </div>
          {qrState ? (
            <p className="mt-1 text-[11px] font-medium text-primary">{qrState}</p>
          ) : null}
        </div>
      </div>
    </header>
  );
}
