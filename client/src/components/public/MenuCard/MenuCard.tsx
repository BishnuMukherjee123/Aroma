"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import { useGLTF } from "@react-three/drei";
import "./MenuCard.css";
import { ArPreviewModelViewer } from "../ArPreviewModelViewer";

// ─── Types ────────────────────────────────────────────────────────────────────

export type MenuCardDish = {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  currency?: string;
  dietaryType?: "VEG" | "NON_VEG" | "BOTH" | null;
  posterUrl?: string | null;
  modelUrl?: string | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const VALID_CURRENCIES = new Set(["USD", "INR", "EUR", "GBP", "AED"]);

const formatPrice = (value: number, currency?: string | null) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency && VALID_CURRENCIES.has(currency) ? currency : "USD",
    minimumFractionDigits: 2,
  })
    .format(value)
    .replace(".00", "");

// ─── MenuCard ─────────────────────────────────────────────────────────────────

export const MenuCard = memo(function MenuCard({
  dish,
  publicId,
}: {
  dish: MenuCardDish;
  publicId: string;
}) {
  // ── Toggle state ──────────────────────────────────────────────────────────
  const [isOpen, setIsOpen] = useState(false);
  const toggleDetails = () => setIsOpen((prev) => !prev);

  // ── 3D model state ────────────────────────────────────────────────────────
  const [isPreviewActivated, setIsPreviewActivated] = useState(false);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isArLaunching, setIsArLaunching] = useState(false);
  const [isIntersecting, setIsIntersecting] = useState(false);
  const prefetchedRef = useRef(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Intersection Observer to completely deactivate WebGL when off-screen
  useEffect(() => {
    if (!cardRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);

        // If the card is completely off-screen, reset the 3D preview.
        // This forces it to show the poster picture again, requiring another tap to load 3D.
        if (!entry.isIntersecting) {
          setIsPreviewActivated(false);
          setIsModelLoaded(false);
        }
      },
      { rootMargin: "0px" }, // Trigger the exact moment it leaves the screen
    );
    observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, []);

  // Highly optimized WebWorker-based prefetching
  // Bypasses main thread entirely and uses Draco/ThreeJS native caching
  const prefetchModel = useCallback(() => {
    if (prefetchedRef.current || !dish.modelUrl) return;
    prefetchedRef.current = true;
    useGLTF.preload(
      dish.modelUrl,
      "https://www.gstatic.com/draco/versioned/decoders/1.5.7/",
    );
  }, [dish.modelUrl]);

  // Reset launching state when returning to this page via the browser back button (BFCache)
  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      // event.persisted is true if the page was restored from the back/forward cache
      if (event.persisted) {
        setIsArLaunching(false);
      }
    };
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  // "View in AR" — navigates to the dedicated AR setup page.
  const handleViewInAr = useCallback(() => {
    if (!dish.modelUrl) return;
    setIsArLaunching(true);
    window.location.href = `/r/${publicId}/ar?dish=${dish.id}`;
    // Fallback reset in case navigation is blocked or delayed
    setTimeout(() => setIsArLaunching(false), 1500);
  }, [dish.modelUrl, dish.id, publicId]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const show3D = dish.modelUrl && isPreviewActivated && isIntersecting;
  const posterVisible = !(isPreviewActivated && isModelLoaded);

  return (
    <div >
      <div
        ref={cardRef}
        className="menu-card"
        onPointerEnter={prefetchModel}
        onTouchStart={() => {
          prefetchModel();
          if (!isPreviewActivated) setIsPreviewActivated(true);
        }}
        onClick={() => {
          if (!isPreviewActivated) setIsPreviewActivated(true);
        }}
      >
        {/* ── Hero / 3D Preview Area ────────────────────────────────────── */}
        <div className="hero-area" style={{ position: "relative", overflow: "hidden" }}>

          {/* Live 3D model — only mounts if tapped AND visible on screen */}
          {show3D && (
            <ArPreviewModelViewer
              modelUrl={dish.modelUrl!}
              alt={dish.name}
              interactive={false}
              onLoaded={() => setIsModelLoaded(true)}
            />
          )}

          {/* Poster overlay — fades out once GLB finishes loading */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              transition: "opacity 0.5s",
              opacity: posterVisible ? 1 : 0,
              pointerEvents: posterVisible ? "auto" : "none",
            }}
          >
            {dish.posterUrl ? (
              <img
                src={dish.posterUrl}
                alt={dish.name}
                loading="lazy"
                decoding="async"
                style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.9 }}
              />
            ) : null}
          </div>

          {/* "Most Ordered" badge — top left */}
          <div className="badge-hot">
            <span>🔥</span> Most Ordered This Week
          </div>

          {/* AR launch button — bottom right */}
          <div
            className="preview-btn"
            onClick={(e) => {
              e.stopPropagation();
              void handleViewInAr();
            }}
            style={{ 
              cursor: "pointer",
              transition: "opacity 0.5s",
              opacity: posterVisible ? 1 : 0,
              pointerEvents: posterVisible ? "auto" : "none",
            }}
          >
            {isArLaunching ? (
              <>
                <span
                  style={{
                    display: "inline-block",
                    width: 14,
                    height: 14,
                    border: "2px solid rgba(255,255,255,0.3)",
                    borderTopColor: "#fff",
                    borderRadius: "50%",
                    animation: "spin 0.7s linear infinite",
                  }}
                />
                Wait...
              </>
            ) : (
              <>
                <span>📦</span> AR View
              </>
            )}
          </div>
        </div>

        {/* ── Content Area ──────────────────────────────────────────────── */}
        <div className="content-area">
          <div className="title-row">
            <h1>{dish.name}</h1>

            {/* Dietary indicator */}
            <div className="diet-indicators">
              {dish.dietaryType === "VEG" && (
                <><span className="veg-text">●</span> VEG</>
              )}
              {dish.dietaryType === "NON_VEG" && (
                <><span className="nonveg-text">▲</span> NON-VEG</>
              )}
              {dish.dietaryType === "BOTH" && (
                <>
                  <span className="veg-text">●</span>
                  <span className="nonveg-text">▲</span>
                  VEG &amp; NON-VEG
                </>
              )}
              {(!dish.dietaryType || dish.dietaryType === null) && (
                <><span className="veg-text">●</span><span className="nonveg-text">▲</span> VEG &amp; NON-VEG</>
              )}
            </div>
          </div>

          <p className="description">
            {dish.description || "Soft, smoky & rich – experience it in AR before you order."}
          </p>

          <div className="price-row">
            <span className="price">{formatPrice(dish.price, dish.currency)}</span>
            <span className="dot"></span>
            <span>
              <span role="img" aria-label="2 people">👥</span> Good for{" "}
              <strong style={{ color: "var(--text-primary)" }}>2</strong>
            </span>
            <span className="dot"></span>
            <span className="satisfaction">
              <span style={{ color: "var(--text-accent-gold)", fontSize: "16px" }}>🏅</span>{" "}
              High satisfaction dish
            </span>
          </div>

          {/* CTA button — triggers AR navigation */}
          <button
            type="button"
            className="cta-button"
            disabled={isArLaunching}
            onClick={(e) => {
              e.stopPropagation();
              void handleViewInAr();
            }}
          >
            {isArLaunching ? (
              <>
                <span
                  style={{
                    display: "inline-block",
                    width: 16,
                    height: 16,
                    border: "2px solid rgba(255,255,255,0.3)",
                    borderTopColor: "#fff",
                    borderRadius: "50%",
                    animation: "spin 0.7s linear infinite",
                  }}
                />
                Wait...
              </>
            ) : (
              <>
                <span style={{ fontSize: "18px" }}>⛶</span> See it on your table before ordering{" "}
                <span style={{ fontSize: "18px", marginLeft: "5px" }}>›</span>
              </>
            )}
          </button>

          <hr />

          {/* ── Toggle ──────────────────────────────────────────────────── */}
          <div
            className={`toggle-container${isOpen ? " active" : ""}`}
            onClick={toggleDetails}
            id="toggleBtn"
          >
            <span className="icon-chevron" id="toggleIcon" aria-hidden="true">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="lucide lucide-chevrons-down-icon lucide-chevrons-down"
              >
                <path d="m7 6 5 5 5-5" />
                <path d="m7 13 5 5 5-5" />
              </svg>
            </span>
          </div>

          {/* ── Expandable Bottom Section ────────────────────────────────── */}
          <div
            className={`bottom-section-wrapper${isOpen ? " open" : ""}`}
            id="bottomSection"
          >
            <div className="bottom-section-inner">
              <div className="section-header">
                <div className="section-title">
                  <span>✦</span> Complete your meal
                </div>
                <div className="add-all">
                  Add all <span className="add-all-icon">⊕</span>
                </div>
              </div>

              <div className="cross-sell-grid">
                <div className="item-card">
                  <div className="item-img">
                    🫓
                    <button className="add-item-btn"></button>
                  </div>
                  <div className="item-info">
                    <span className="item-name">
                      Butter
                      <br />
                      Naan
                    </span>
                    <span className="item-price">₹40</span>
                  </div>
                </div>

                <div className="item-card">
                  <div className="item-img">
                    🥣
                    <button className="add-item-btn"></button>
                  </div>
                  <div className="item-info">
                    <span className="item-name">
                      Mint
                      <br />
                      Chutney
                    </span>
                    <span className="item-price">₹20</span>
                  </div>
                </div>

                <div className="item-card">
                  <div className="item-img">
                    🍹
                    <button className="add-item-btn"></button>
                  </div>
                  <div className="item-info">
                    <span className="item-name">
                      Fresh
                      <br />
                      Lime Soda
                    </span>
                    <span className="item-price">₹60</span>
                  </div>
                </div>
              </div>

              <div className="highlights-row">
                <div className="highlight-item">
                  <span className="hl-icon">👍</span>
                  <div className="hl-text">
                    <strong>78% people</strong>
                    <span>reorder this</span>
                  </div>
                </div>
                <div className="highlight-item">
                  <span className="hl-icon">🕒</span>
                  <div className="hl-text">
                    <span>Avg. preparation time</span>
                    <strong>12 mins</strong>
                  </div>
                </div>
                <div className="highlight-item">
                  <span className="hl-icon">🔥</span>
                  <div className="hl-text">
                    <span>Prefect with</span>
                    <strong>Butter Naan</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Spinner keyframes — scoped inline so no global CSS needed */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
});
