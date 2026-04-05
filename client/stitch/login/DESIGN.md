# Design System Specification: The Sensory Professional

This document defines the visual language and structural logic for the digital ecosystem. It is designed to bridge the tactile, high-end experience of a mobile-first AR menu with the rigorous, data-heavy demands of a professional hospitality dashboard.

## 1. Overview & Creative North Star: "The Digital Maître D’"

The Creative North Star for this system is **The Digital Maître D’**. Like a world-class concierge, the interface must be authoritative yet welcoming, sophisticated but never distracting. We achieve this through a "High-End Editorial" lens—moving away from generic SaaS "boxes" toward a layout that feels curated and intentional.

To break the "template" look, we utilize:
*   **Intentional Asymmetry:** Utilizing generous white space on one side of a layout to draw the eye toward critical actions.
*   **Tonal Depth:** Replacing harsh lines with shifts in surface temperature.
*   **The Bridge:** Using Manrope’s geometric elegance for high-level branding and Inter’s precision for dense administrative data.

---

## 2. Color Philosophy: Depth Over Definition

This system rejects the "grid-of-boxes" aesthetic. We define space through color transitions rather than structural lines.

### Palette Strategy
*   **The Primary Accent (`#b61722` / `#EF4444`):** This is our "Sensory Red." It should be used sparingly—only for primary calls to action, critical status updates, or brand-specific moments.
*   **The Neutral Core:** We use a cool-toned neutral foundation (`#f8f9ff` to `#121c2a`) to ensure the red accent feels intentional and premium, not overwhelming.

### The "No-Line" Rule
**Explicit Instruction:** Do not use 1px solid borders to section content. Boundaries must be defined through background color shifts. 
*   *Example:* A `surface-container-low` (`#eff4ff`) card sitting on a `surface` (`#f8f9ff`) background.

### Surface Hierarchy & Nesting
Treat the UI as a series of stacked, physical layers.
1.  **Base Layer:** `surface` (`#f8f9ff`)
2.  **Sectioning:** `surface-container-low` (`#eff4ff`)
3.  **Interactive Cards:** `surface-container-lowest` (`#ffffff`) - This creates a natural "pop" against the background.
4.  **Floating Elements:** `surface-bright` with 80% opacity and a 16px backdrop blur.

### The Glass & Gradient Rule
To provide "visual soul," use subtle gradients for Hero areas or large Buttons. 
*   **Signature Gradient:** Linear 135° from `primary` (`#b61722`) to `primary_container` (`#da3437`). This prevents the red from looking "flat" or "cheap."

---

## 3. Typography: The Editorial Voice

We use a dual-font system to balance hospitality charm with SaaS utility.

| Role | Font Family | Usage | Tone |
| :--- | :--- | :--- | :--- |
| **Display / Headline** | **Manrope** | Large headers, Menu titles, Hero sections. | Sophisticated, Modern, Bold. |
| **Title / Body / Label** | **Inter** | Data tables, descriptions, input labels, UI controls. | Precise, Technical, Legible. |

**Hierarchy Note:** 
Use `display-lg` (3.5rem) sparingly to create editorial "moments" in the mobile menu. In the admin dashboard, rely on `headline-sm` (1.5rem) and `title-md` (1.125rem) to maintain professional density without losing the premium feel.

---

## 4. Elevation & Depth: Tonal Layering

Traditional shadows and borders are often a "crutch" for poor spacing. In this system, we use **Tonal Layering**.

*   **The Layering Principle:** Place `surface-container-lowest` (#ffffff) elements on top of `surface-container` (#e6eeff) backgrounds. The contrast provides all the "lift" required.
*   **Ambient Shadows:** When an element must float (e.g., a Modal or Popover), use an ultra-diffused shadow: `box-shadow: 0 12px 40px rgba(18, 28, 42, 0.06);`. The shadow color is a tint of `on-surface`—never pure black.
*   **The "Ghost Border" Fallback:** If accessibility requires a border (e.g., in high-density tables), use `outline-variant` at 20% opacity. 
*   **Glassmorphism:** For mobile navigation bars or floating action buttons, use the `surface` color at 70% opacity with a `backdrop-filter: blur(12px)`. This integrates the UI into the photography/AR content behind it.

---

## 5. Components: Refined Utility

### Buttons
*   **Primary:** High-contrast `primary` background with `on_primary` text. Use `md` (0.75rem) corner radius. For flagship actions, use the Signature Gradient.
*   **Secondary:** No background. Use `outline` (`#8f6f6d`) at 20% opacity for the container, or simply a text-link style with `title-sm` weight.
*   **Padding:** Desktop (12px 24px) / Mobile (16px 32px) to ensure touch-targets are generous.

### Cards & Containers
*   **Rule:** Forbid divider lines. 
*   **Structure:** Use `spacing-6` (1.5rem) to separate internal content. Use a background shift (`surface-container-low`) to differentiate the header of a card from the body.

### Data Tables (Admin Focus)
*   **Header:** Use `surface-container-high` (`#dee9fc`) for the header row with `label-md` uppercase typography.
*   **Rows:** Alternate between `surface` and `surface-container-lowest` for striped effects. Avoid 1px horizontal lines.
*   **Interactive Row:** On hover, shift background to `surface-container-highest` (`#d9e3f6`).

### Input Fields
*   **Style:** Minimalist. Use `surface-container-lowest` with a "Ghost Border."
*   **Focus State:** Shift the border to `primary` (`#b61722`) and add a 2px outer glow using `primary_fixed` at 30% opacity.

---

## 6. Do's and Don'ts

### Do
*   **Do** use `display-lg` typography to create "empty space" that feels like a deliberate design choice.
*   **Do** nest containers using the surface scale (e.g., a `lowest` card on a `low` section).
*   **Do** use `spacing-8` or `spacing-10` between major sections to let the design breathe.

### Don't
*   **Don't** use pure black (`#000000`) for text; use `on_surface` (`#121c2a`) to maintain softness.
*   **Don't** use 1px borders to separate list items; use vertical white space (8px–12px) instead.
*   **Don't** use the `primary` red for non-interactive elements or small "success" icons; use `tertiary` (teal/green) for success to avoid "red-fatigue."
*   **Don't** mix corner radii. Stick to `md` (0.75rem) for UI components and `lg` (1rem) for large image containers or cards.

---

## 7. Spacing Tokens

| Scale | Value | Usage |
| :--- | :--- | :--- |
| **2** | 0.5rem | Tight internal grouping (label to input). |
| **4** | 1rem | Standard component padding. |
| **8** | 2rem | Gutter between columns. |
| **12** | 3rem | Vertical section spacing (Mobile). |
| **20** | 5rem | Vertical section spacing (Desktop Editorial). |