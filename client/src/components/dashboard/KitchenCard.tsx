"use client";

import Link from "next/link";
import { getWorkspacePath, type PortalVariant } from "@/lib/portal";
import type { RestaurantCardData, RestaurantDetails } from "@/lib/api";
import { cn } from "@/lib/utils";
import "./KitchenCard.css";

type RestaurantBundle = {
  summary: RestaurantCardData;
  details?: RestaurantDetails;
};

interface KitchenCardProps {
  restaurant: RestaurantBundle;
  portalVariant: PortalVariant;
  publishedMenus: number;
  allDishesCount: number;
  ready3dAssets: number;
  coverInputRef: (el: HTMLInputElement | null) => void;
  onCoverImageUpload: (file: File) => void;
  onToggleActive: () => void;
  onDeleteRequest: () => void;
  uploadingCover: boolean;
  lifecyclePending: boolean;
  getCoverTheme: (publicId: string) => string;
}

export function KitchenCard({
  restaurant,
  portalVariant,
  publishedMenus,
  allDishesCount,
  ready3dAssets,
  coverInputRef,
  onCoverImageUpload,
  onToggleActive,
  onDeleteRequest,
  uploadingCover,
  lifecyclePending,
  getCoverTheme,
}: KitchenCardProps) {
  const { summary } = restaurant;
  const isPublished = summary.isPublished;
  const isActive = summary.isActive;

  const handleInputClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const parent = e.currentTarget.parentElement;
    const input = parent?.querySelector('input[type="file"]') as HTMLInputElement;
    if (input) {
      input.click();
    }
  };

  return (
    <div className="kitchen-card">
      <div className="kitchen-image">
        <div className="status-badge">
          {!isActive
            ? "● Deactivated"
            : isPublished
              ? "● Published"
              : "● Draft"}
        </div>
        {summary.coverImageUrl ? (
          <img src={summary.coverImageUrl} alt={summary.name} />
        ) : (
          <div
            className={cn("w-full h-full bg-gradient-to-br", getCoverTheme(summary.publicId))}
          />
        )}
      </div>

      <div className="kitchen-content">
        <div className="top-section">
          <div className="title-area">
            <h1>{summary.name}</h1>
            <div className="meta">
              <div className="kitchen-id">{summary.publicId}</div>
              <div className="live">
                {!isActive
                  ? "Deactivated"
                  : isPublished
                    ? "Published"
                    : "Draft"}
              </div>
            </div>
          </div>

          <div className="actions">
            <Link
              href={getWorkspacePath(portalVariant, summary.id)}
              className="kitchen-btn btn-primary"
            >
              <span className="material-symbols-outlined text-[1.1rem]">
                open_in_new
              </span>
              Open Workspace
            </Link>

            {portalVariant === "owner" && (
              <>
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      onCoverImageUpload(file);
                    }
                    e.target.value = "";
                  }}
                />
                <button
                  type="button"
                  className="kitchen-btn btn-outline"
                  onClick={handleInputClick}
                  disabled={uploadingCover}
                >
                  {uploadingCover ? (
                    <span className="spinner-sm" />
                  ) : (
                    <span className="material-symbols-outlined text-[1.1rem]">
                      add_photo_alternate
                    </span>
                  )}
                  {summary.coverImageUrl ? "Change Photo" : "Upload Photo"}
                </button>

                <button
                  type="button"
                  onClick={onToggleActive}
                  disabled={lifecyclePending}
                  className="kitchen-btn btn-outline"
                >
                  {lifecyclePending ? (
                    <span className="spinner-sm" />
                  ) : (
                    <span className="material-symbols-outlined text-[1.1rem]">
                      {isActive ? "pause_circle" : "play_circle"}
                    </span>
                  )}
                  {isActive ? "Deactivate Kitchen" : "Activate Kitchen"}
                </button>

                <button
                  type="button"
                  onClick={onDeleteRequest}
                  disabled={lifecyclePending}
                  className="kitchen-btn btn-danger"
                >
                  <span className="material-symbols-outlined text-[1.1rem]">
                    delete
                  </span>
                  Delete Kitchen
                </button>
              </>
            )}
          </div>
        </div>

        <div className="stats">
          <div className="stat-card">
            <div className="stat-icon">
              <span className="material-symbols-outlined" style={{ fontSize: "inherit" }}>
                restaurant_menu
              </span>
            </div>
            <div className="stat-label">Menus</div>
            <div className="stat-number">{publishedMenus}</div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              <span className="material-symbols-outlined" style={{ fontSize: "inherit" }}>
                set_meal
              </span>
            </div>
            <div className="stat-label">Dishes</div>
            <div className="stat-number">{allDishesCount}</div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              <span className="material-symbols-outlined" style={{ fontSize: "inherit" }}>
                view_in_ar
              </span>
            </div>
            <div className="stat-label">3D Ready</div>
            <div className="stat-number">{ready3dAssets}</div>
          </div>
        </div>

        <div className={cn("bottom-banner", !isActive && "inactive")}>
          <div>
            <h3>{isActive ? "Kitchen is Live" : "Kitchen is Inactive"}</h3>
            <p>
              {isActive
                ? isPublished
                  ? "Your kitchen is published and visible to customers."
                  : "Your kitchen is active but has no published menus yet."
                : "Your kitchen is currently deactivated and not visible to customers."}
            </p>
          </div>
          <div className={cn("active-pill", !isActive && "inactive")}>
            {isActive ? "Active" : "Inactive"}
          </div>
        </div>
      </div>
    </div>
  );
}
