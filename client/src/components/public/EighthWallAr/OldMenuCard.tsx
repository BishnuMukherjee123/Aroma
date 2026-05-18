"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import "./MenuCard.css";
import { ArPreviewModelViewer } from "../ArPreviewModelViewer";
import { ensureModelViewerScript } from "@/lib/model-viewer";
import { modelPrefetchQueue } from "@/lib/model-prefetch";

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

// ─── Global AR Viewer ─────────────────────────────────────────────────────────
// We use a single shared <model-viewer> for inline AR launches to ensure the
// custom element is fully upgraded and ready before the user clicks the button.
// Creating it dynamically in the click handler causes activateAR() to silently
// fail due to loss of user gesture context while waiting for element upgrade.
let sharedArViewer:
  | (HTMLElement & { activateAR?: () => Promise<void> | void })
  | null = null;

function initSharedArViewer() {
  if (typeof window === "undefined" || sharedArViewer) return;
  sharedArViewer = document.createElement("model-viewer") as any;
  sharedArViewer!.setAttribute("ar", "");
  // Prefer Android Scene Viewer for a reliable native AR launch, then fall
  // back to WebXR and iOS Quick Look where supported.
  sharedArViewer!.setAttribute("ar-modes", "scene-viewer webxr quick-look");
  sharedArViewer!.setAttribute("ar-placement", "floor");
  sharedArViewer!.setAttribute("ar-scale", "fixed");
  sharedArViewer!.setAttribute("scale", "2.5 2.5 2.5");
  sharedArViewer!.setAttribute("shadow-intensity", "0");
  sharedArViewer!.setAttribute("touch-action", "none");
  sharedArViewer!.setAttribute("loading", "eager");
  sharedArViewer!.style.cssText =
    "position:fixed;inset:0;width:100%;height:100%;z-index:-1;opacity:0;pointer-events:none;";
  document.body.appendChild(sharedArViewer!);
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type MenuCardDish = {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  currency?: string;
  badgeLabel?: string | null;
  servingSize?: number | null;
  detailsPanelEnabled?: boolean | null;
  crossSellItems?: Array<{
    id: string;
    name: string;
    price: number;
    imageUrl?: string | null;
    imageStorageKey?: string | null;
  }> | null;
  dietaryType?: "VEG" | "NON_VEG" | "BOTH" | null;
  posterUrl?: string | null;
  modelUrl?: string | null;
  /** Low-poly LOD-0 variant — loads in ~200ms, displayed first while full model loads */
  lodUrl?: string | null;
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
  // Hidden pre-warm model-viewer mounted as soon as card is visible (before tap).
  // Lets model-viewer start decoding GLB to GPU memory before user interaction.
  const prewarmContainerRef = useRef<HTMLDivElement>(null);
  const prewarmMvRef = useRef<Element | null>(null);
  // rAF handle so we can cancel a pending mount if the card is deactivated before
  // the next frame fires (e.g. user taps a different card in rapid succession).
  const pendingRafRef = useRef<number>(0);
  const cardRef = useRef<HTMLDivElement>(null);
  // Track touch start position to distinguish intentional tap from accidental scroll-touch
  const touchStartY = useRef<number>(0);

  // Warm the <model-viewer> script singleton on mount so the CDN script is
  // already loaded by the time the user taps a card. Safe to call many times.
  useEffect(() => {
    void ensureModelViewerScript().then(() => {
      // Pre-initialize the shared AR viewer so it's fully upgraded and ready
      // for synchronous activateAR() calls.
      initSharedArViewer();
    });
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


  // Predictive prefetch observer (triggers before card is fully visible).
  // Safely queues the GLB download via fetch() to warm the browser cache.
  // Stops flooding the network by limiting concurrency in the global queue.
  // Also mounts a hidden <model-viewer> on intersection so GPU decode starts
  // before the user taps — this is the primary fix for slow first-tap delays.
  useEffect(() => {
    if (!dish.modelUrl || !cardRef.current) return;

    const prefetchObserver = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          modelPrefetchQueue.add(dish.modelUrl!);
          // Prefetch the LOD first — it's much smaller and will arrive sooner
          if (dish.lodUrl) modelPrefetchQueue.add(dish.lodUrl);

          // Mount a hidden pre-warm <model-viewer> so GLB decoding starts now.
          // It's invisible (opacity:0, pointer-events:none, size 1x1px) so it
          // has no visual impact but occupies a GPU context slot and begins
          // geometry/texture decode immediately.
          if (!prewarmMvRef.current && prewarmContainerRef.current) {
            const mv = document.createElement("model-viewer");
            mv.setAttribute("src", dish.modelUrl!);
            mv.setAttribute("alt", "");
            mv.setAttribute("environment-image", "neutral");
            mv.setAttribute("exposure", "1");
            mv.setAttribute("interaction-prompt", "none");
            mv.style.cssText = "position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;";
            prewarmContainerRef.current.appendChild(mv);
            prewarmMvRef.current = mv;
          }
        } else {
          // Abort the prefetch if the user scrolls past quickly before it finishes
          modelPrefetchQueue.cancel(dish.modelUrl!);

          // Destroy the pre-warm viewer to free the WebGL context.
          if (prewarmMvRef.current && prewarmContainerRef.current) {
            prewarmContainerRef.current.removeChild(prewarmMvRef.current);
            prewarmMvRef.current = null;
          }
        }
      },
      {
        rootMargin: "600px", // Preload early — larger margin = more time for big GLBs
      }
    );

    prefetchObserver.observe(cardRef.current);
    return () => {
      prefetchObserver.disconnect();
      // Cleanup pre-warm viewer on unmount
      if (prewarmMvRef.current && prewarmContainerRef.current) {
        try { prewarmContainerRef.current.removeChild(prewarmMvRef.current); } catch {}
        prewarmMvRef.current = null;
      }
    };
  }, [dish.modelUrl]);

  // Activate 3D preview with rAF deferral.
  // Phase 1 (synchronous): show loading spinner immediately — React paints this first.
  // Phase 2 (next frame):   mount <model-viewer> — heavy work starts after the paint.
  // Global singleton: cancels any other card's pending activation so only ONE GLB
  // decodes at a time, preventing memory spikes on low-end devices.
  const activatePreview = useCallback(() => {
    if (!dish.modelUrl || isPreviewActivated) return;

    // ① Immediately tell the fetch queue this URL is urgently needed.
    //    This aborts any slow background download and restarts it at "high"
    //    priority so the browser network stack frontloads this GLB instantly.
    modelPrefetchQueue.prioritize(dish.modelUrl);

    // Register with the global store. If another card was active, its supersede
    // callback runs and cancels its pending rAF + resets its state.
    activeModelStore.activate(dish.id, () => {
      cancelAnimationFrame(pendingRafRef.current);
      setIsPreviewActivated(false);
      setIsModelLoaded(false);
    });

    // Mount <model-viewer> on the NEXT frame so React flushes any pending paint first.
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

  // "See it on your table" — launches WebXR AR directly from the menu page.
  // No navigation to a separate AR gate screen.
  // Back gesture ends the AR session → user is already on the menu page. ✅
  const handleViewInAr = useCallback(() => {
    if (!dish.modelUrl) return;
    
    // If the shared viewer isn't ready yet, we can't launch synchronously.
    if (!sharedArViewer) {
      setIsArLaunching(false);
      return;
    }

    setIsArLaunching(true);

    const mv = sharedArViewer;
    mv.setAttribute("src", dish.modelUrl);
    mv.setAttribute("alt", dish.name);
    // Reset scale in case a previous dish drifted
    mv.setAttribute("scale", "2.5 2.5 2.5");

    let driftGuard: ReturnType<typeof setInterval> | null = null;
    let fallbackTimer: ReturnType<typeof setTimeout> | null = null;

    const cleanup = () => {
      if (driftGuard !== null) { clearInterval(driftGuard); driftGuard = null; }
      if (fallbackTimer !== null) { clearTimeout(fallbackTimer); fallbackTimer = null; }
      setIsArLaunching(false);
      mv.removeEventListener("ar-status", handleStatus);
    };

    const handleStatus = (e: Event) => {
      const status =
        (e as CustomEvent<{ status?: string }>).detail?.status ??
        mv.getAttribute("ar-status");

      if (status === "session-started" || status === "object-placed") {
        setIsArLaunching(false);
        if (fallbackTimer !== null) { clearTimeout(fallbackTimer); fallbackTimer = null; }
      }

      if (status === "object-placed") {
        // Clear fallback since AR successfully started
        if (fallbackTimer !== null) { clearTimeout(fallbackTimer); fallbackTimer = null; }
        
        // Scale drift guard — ARCore refines floor estimation over time and
        // silently rescales the model. We enforce our target every 1s.
        const TARGET = "2.5 2.5 2.5";
        requestAnimationFrame(() => mv.setAttribute("scale", TARGET));
        driftGuard = setInterval(() => {
          if (mv.getAttribute("scale") !== TARGET) mv.setAttribute("scale", TARGET);
        }, 1000);
      }

      if (status === "not-presenting" || status === "failed") {
        cleanup();
      }
    };

    mv.addEventListener("ar-status", handleStatus);

    // activateAR() MUST be called synchronously inside the click handler.
    const tryActivate = () => {
      if (typeof mv.activateAR === "function") {
        try {
          const activation = mv.activateAR();
          if (activation && typeof activation.catch === "function") {
            void activation.catch(() => cleanup());
          }
        } catch {
          cleanup();
        }
      } else {
        // Fallback: if script is still parsing
        setTimeout(() => {
          try {
            const activation = mv.activateAR?.();
            if (activation && typeof activation.catch === "function") {
              void activation.catch(() => cleanup());
            }
          } catch {
            cleanup();
          }
        }, 100);
      }
    };
    
    tryActivate();

    // Safety fallback: if AR never starts within 8s, clean up
    fallbackTimer = setTimeout(() => {
      const status = mv.getAttribute("ar-status");
      if (status !== "session-started" && status !== "object-placed") {
        cleanup();
      }
    }, 8000);
  }, [dish.modelUrl, dish.name]);


  // ── Derived ───────────────────────────────────────────────────────────────
  const show3D = dish.modelUrl && isPreviewActivated && isIntersecting;
  // Poster fades out once the model has fully loaded (fires on "load" event).
  const posterVisible = !(isPreviewActivated && isModelLoaded);
  const servingSize =
    Number.isFinite(dish.servingSize) && dish.servingSize
      ? Math.max(1, Math.round(dish.servingSize))
      : 2;
  const detailsPanelEnabled = dish.detailsPanelEnabled !== false;
  const crossSellItems = Array.isArray(dish.crossSellItems)
    ? dish.crossSellItems
    : [];
  const primaryCrossSellItem = crossSellItems[0] ?? null;

  useEffect(() => {
    if (!detailsPanelEnabled && isOpen) {
      setIsOpen(false);
    }
  }, [detailsPanelEnabled, isOpen]);

  return (
    <div >
      {/* Hidden pre-warm container — mounts a 1×1px model-viewer on card
          intersection so GLB decoding is already in-flight before user taps */}
      <div ref={prewarmContainerRef} style={{ position: "absolute", width: 0, height: 0, overflow: "hidden", pointerEvents: "none" }} aria-hidden="true" />
      <div
        ref={cardRef}
        className="menu-card"
        onPointerEnter={() => {
          // Desktop intent: hover over card → start download at normal priority.
          // On mobile this fires too — but touchstart (below) fires first and
          // already uses "high" priority, so this is a no-op on mobile.
          if (dish.modelUrl && !isPreviewActivated) {
            modelPrefetchQueue.add(dish.modelUrl);
            if (dish.lodUrl) modelPrefetchQueue.add(dish.lodUrl);
          }
        }}
        onTouchStart={(e) => {
          // Record the starting Y so we can detect scroll vs intentional tap.
          touchStartY.current = e.touches[0].clientY;

          // ─── Pointer intent ────────────────────────────────────────────────
          // The finger just landed on this card. Even if the user is scrolling,
          // this is the strongest possible signal of proximity interest.
          // Escalate the GLB fetch to "high" priority NOW — ~100-200ms before
          // the tap is confirmed on touchend. Every millisecond matters here.
          if (dish.modelUrl && !isPreviewActivated) {
            modelPrefetchQueue.prioritize(dish.modelUrl);
            if (dish.lodUrl) modelPrefetchQueue.prioritize(dish.lodUrl);
            // Activate immediately on first touch — don't wait for touchend.
            // If the user was scrolling, the intersection observer deactivates
            // the model cleanly once the card scrolls off-screen.
            activatePreview();
          }
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
              lodUrl={dish.lodUrl}
              alt={dish.name}
              interactive={false}
              onLoaded={() => {
                setIsModelLoaded(true);
              }}
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

          {dish.badgeLabel ? (
            <div className="badge-hot">
              <span>&#128293;</span> {dish.badgeLabel}
            </div>
          ) : null}

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

            {/* Dietary indicator — only rendered when a type is set */}
            {dish.dietaryType && (
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
              </div>
            )}
          </div>

          <p className="description">
            {dish.description || "Soft, smoky & rich – experience it in AR before you order."}
          </p>

          <div className="price-row">
            <span className="price">{formatPrice(dish.price, dish.currency)}</span>
            <span className="dot"></span>
            <span>
              <span role="img" aria-label={`${servingSize} people`}>👥</span> Good for{" "}
              <strong style={{ color: "var(--text-primary)" }}>{servingSize}</strong>
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
              if (!dish.modelUrl) return;
              setIsArLaunching(true);
              window.sessionStorage.setItem("aroma-returning-from-ar", "1");
              window.location.assign(`/r/${publicId}/ar/${dish.id}`);
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

          {detailsPanelEnabled ? (
            <>
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

              {crossSellItems.length > 0 ? (
                <div className="cross-sell-grid">
                  {crossSellItems.map((item) => (
                    <div className="item-card" key={item.id}>
                      <div className="item-img">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.name} loading="lazy" />
                        ) : (
                          <span className="item-img-placeholder">+</span>
                        )}
                        <button className="add-item-btn" aria-label={`Add ${item.name}`}></button>
                      </div>
                      <div className="item-info">
                        <span className="item-name">{item.name}</span>
                        <span className="item-price">
                          {formatPrice(item.price, dish.currency)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

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
                    <strong>{primaryCrossSellItem?.name ?? "Chef's pairing"}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
            </>
          ) : null}
        </div>
      </div>

    </div>
  );
});
