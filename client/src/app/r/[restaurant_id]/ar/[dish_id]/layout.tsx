/**
 * AR Dish Layout — 8th Wall Bootstrap
 *
 * WHY THIS EXISTS:
 * The 8th Wall engine (`xr.js`) is an ES Module. Inside ES Modules,
 * `document.currentScript` is always null (per spec). The engine reads that
 * property during its first evaluation to locate its WASM files. If it gets
 * null, it cannot find xr-slam.js / xr-face.js → camera never initialises →
 * black screen on iOS.
 *
 * The ONLY reliable fix is:
 *   1. Patch `document.currentScript` with an inline synchronous `<script>`
 *   2. Then load xr.js as `type="module"` AFTER the patch
 *
 * In Next.js App Router, `next/script` with strategy="beforeInteractive" is
 * the correct mechanism. Scripts with this strategy are server-rendered into
 * the HTML <head> and are guaranteed to execute before any JavaScript bundle.
 *
 * Script load order (mirrors 8thWallAr/index.html exactly):
 *   1. 8frame-1.5.0.min.js   — sync, crossorigin (sets window.AFRAME)
 *   2. xrextras.js            — sync (extends AFRAME)
 *   3. landing-page.js        — sync (LandingPage global)
 *   4. currentScript shim     — inline beforeInteractive (MUST precede xr.js)
 *   5. xr.js                  — type=module async
 */

import Script from "next/script";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "View in AR — Aroma",
  description: "See this dish in augmented reality on your table.",
};

const ENGINE_PATH = "/8thwall/vendor/engine-binary/xr.js";

/**
 * Inline shim source.
 * Wrapped in IIFE so it doesn't leak variables into global scope.
 * Must be kept as a plain string — Next.js serialises it into the HTML as-is.
 */
const currentScriptShim = `
(function(){
  try {
    Object.defineProperty(document,'currentScript',{
      configurable:true,
      get:function(){
        var s=document.createElement('script');
        s.src=window.location.origin+'${ENGINE_PATH}';
        s.setAttribute('data-preload-chunks','slam');
        return s;
      }
    });
  } catch(e){}
})();
`.trim();

export default function ArDishLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/*
       * strategy="beforeInteractive" — Next.js injects these into the HTML
       * <head> on the server and guarantees they execute before the React
       * bundle. This is the only way to make synchronous globals (AFRAME, XR8)
       * available before client-side JS runs.
       */}

      {/* ① A-Frame — must be first; xrextras expects window.AFRAME */}
      <Script
        src="/8thwall/external/scripts/8frame-1.5.0.min.js"
        strategy="beforeInteractive"
        crossOrigin="anonymous"
      />

      {/* ② XRExtras — extends A-Frame with pinch/rotate/hold gestures */}
      <Script
        src="/8thwall/vendor/xrextras/xrextras.js"
        strategy="beforeInteractive"
      />

      {/* ③ Landing page — handles browser support checks */}
      <Script
        src="/8thwall/vendor/landing-page/landing-page.js"
        strategy="beforeInteractive"
      />

      {/*
       * ④ currentScript shim — CRITICAL, must run BEFORE xr.js.
       *    strategy="beforeInteractive" + dangerouslySetInnerHTML gives us a
       *    synchronous inline script in <head>.
       */}
      <Script
        id="8thwall-currentscript-shim"
        strategy="beforeInteractive"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: required 8th Wall polyfill
        dangerouslySetInnerHTML={{ __html: currentScriptShim }}
      />

      {/*
       * ⑤ 8th Wall engine — type="module" async.
       *    The engine self-locates its WASM by reading document.currentScript
       *    (patched above) and downloading sibling files relative to xr.js.
       *    strategy="lazyOnload" is fine here: the engine fires the "xrloaded"
       *    event when ready and our component listens for it.
       *
       *    We use an afterInteractive strategy so Next.js doesn't block
       *    the page render waiting for this large file. The AR scene only
       *    mounts after AFRAME is confirmed ready anyway.
       */}
      <Script
        src={ENGINE_PATH}
        strategy="afterInteractive"
        id="8thwall-engine"
      />

      {children}
    </>
  );
}
