"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import "./MenuCard.css";
import { ArPreviewModelViewer } from "../ArPreviewModelViewer";
import { ensureModelViewerScript } from "@/lib/model-viewer";

// ─── Global one-at-a-time model singleton ─────────────────────────────────────
// Ensures only ONE GLB is ever decoding / uploading to GPU at a time.
// When a new card is activated we cancel the previous pending activation so the
// previous <model-viewer> never mounts and its WebGL context is never created.
const activeModelStore = {
  activeId: null as string | null,
  // Notify the currently-active card that it has been superseded.
  listeners: new Map<string, () => void>(),
  activate(id: string, onSupersede: () => void) {
    // Kick the previously-active card out.
    if (this.activeId && this.activeId !== id) {
      this.listeners.get(this.activeId)?.();
      this.listeners.delete(this.activeId);
    }
    this.activeId = id;
    this.listeners.set(id, onSupersede);
  },
  deactivate(id: string) {
    if (this.activeId === id) this.activeId = null;
    this.listeners.delete(id);
  },
};

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
  // isModelLoading: true from the moment user taps until model fires "load".
  // Shows the spinner overlay immediately, before <model-viewer> even mounts.
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isArLaunching, setIsArLaunching] = useState(false);
  const [isIntersecting, setIsIntersecting] = useState(false);
  const prefetchedRef = useRef(false);
  // rAF handle so we can cancel a pending mount if the card is deactivated before
  // the next frame fires (e.g. user taps a different card in rapid succession).
  const pendingRafRef = useRef<number>(0);
  const cardRef = useRef<HTMLDivElement>(null);
  // Track touch start position to distinguish intentional tap from accidental scroll-touch
  const touchStartY = useRef<number>(0);

  // Warm the <model-viewer> script singleton on mount so the CDN script is
  // already loaded by the time the user taps a card. Safe to call many times —
  // ensureModelViewerScript() is itself a singleton promise.
  useEffect(() => {
    void ensureModelViewerScript();
  }, []);

  // Intersection Observer — deactivates the 3D preview when card is scrolled
  // more than half off-screen, requiring a deliberate tap to reactivate.
  useEffect(() => {
    if (!cardRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);

        // Deactivate when less than 50% of the card is visible.
        // This frees the WebGL context and forces the poster to show again.
        // User must intentionally tap the card to re-enable 3D.
        if (!entry.isIntersecting) {
          cancelAnimationFrame(pendingRafRef.current);
          activeModelStore.deactivate(dish.id);
          setIsPreviewActivated(false);
          setIsModelLoading(false);
          setIsModelLoaded(false);
        }
      },
      {
        // 0.5 = fire when card crosses the 50% visibility threshold
        threshold: 0.5,
      },
    );
    observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [dish.id]);


  // Prefetch the GLB at the network level (browser cache only).
  // No JS parsing, no WASM decoding, no GPU upload — those happen
  // inside <model-viewer> only after the user explicitly taps the card.
  // This means only ONE Three.js instance (model-viewer's own) is ever active.
  const prefetchModel = useCallback(() => {
    if (prefetchedRef.current || !dish.modelUrl) return;
    prefetchedRef.current = true;

    const link = document.createElement("link");
    link.rel = "prefetch";
    link.as = "fetch";
    link.href = dish.modelUrl;
    link.crossOrigin = "anonymous";
    document.head.appendChild(link);
  }, [dish.modelUrl]);

  // Activate 3D preview with rAF deferral.
  // Phase 1 (synchronous): show loading spinner immediately — React paints this first.
  // Phase 2 (next frame):   mount <model-viewer> — heavy work starts after the paint.
  // Global singleton: cancels any other card's pending activation so only ONE GLB
  // decodes at a time, preventing memory spikes on low-end devices.
  const activatePreview = useCallback(() => {
    if (!dish.modelUrl || isPreviewActivated) return;

    // Show spinner immediately (no frame delay — this must paint before the freeze).
    setIsModelLoading(true);

    // Register with the global store. If another card was active, its supersede
    // callback runs and cancels its pending rAF + resets its state.
    activeModelStore.activate(dish.id, () => {
      cancelAnimationFrame(pendingRafRef.current);
      setIsPreviewActivated(false);
      setIsModelLoading(false);
      setIsModelLoaded(false);
    });

    // Mount <model-viewer> on the NEXT frame so React flushes the spinner paint first.
    pendingRafRef.current = requestAnimationFrame(() => {
      setIsPreviewActivated(true);
    });
  }, [dish.id, dish.modelUrl, isPreviewActivated]);

  // Cleanup the singleton entry when this card unmounts.
  useEffect(() => {
    return () => {
      cancelAnimationFrame(pendingRafRef.current);
      activeModelStore.deactivate(dish.id);
    };
  }, [dish.id]);

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
  // Poster fades out only once the model has fully loaded (fires on "load" event).
  const posterVisible = !(isPreviewActivated && isModelLoaded);
  // Loading overlay: visible from first tap until model fires "load", then gone.
  const showLoadingOverlay = isModelLoading && !isModelLoaded;

  return (
    <div >
      <div
        ref={cardRef}
        className="menu-card"
        onPointerEnter={prefetchModel}
        onTouchStart={(e) => {
          // Record the starting Y so we can detect scroll vs intentional tap
          touchStartY.current = e.touches[0].clientY;
          prefetchModel();
        }}
        onTouchEnd={(e) => {
          // Only activate if finger moved < 8px — anything more is a scroll, not a tap
          const deltaY = Math.abs(e.changedTouches[0].clientY - touchStartY.current);
          if (deltaY < 8) activatePreview();
        }}
        onClick={activatePreview}
      >
        {/* ── Hero / 3D Preview Area ────────────────────────────────────── */}
        <div className="hero-area" style={{ position: "relative", overflow: "hidden" }}>

          {/* Live 3D model — only mounts if tapped AND visible on screen */}
          {show3D && (
            <ArPreviewModelViewer
              modelUrl={dish.modelUrl!}
              alt={dish.name}
              interactive={false}
              onLoaded={() => {
                setIsModelLoaded(true);
                setIsModelLoading(false);
              }}
            />
          )}

          {/* Loading overlay — visible between tap and model "load" event.
               Sits above the poster so user gets immediate feedback.
               CSS handles the fade-in/out transition. */}
          <div
            className="model-loading-overlay"
            aria-hidden="true"
            style={{ opacity: showLoadingOverlay ? 1 : 0, pointerEvents: "none" }}
          >
            <span className="model-loading-spinner" />
            <span className="model-loading-text">Loading 3D preview…</span>
          </div>

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
          {/* <div
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
          </div> */}
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


    </div>
  );
});
