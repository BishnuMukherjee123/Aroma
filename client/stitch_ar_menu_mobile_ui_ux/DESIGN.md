```markdown
# Design System: The Culinary Editorial

## 1. Overview & Creative North Star
**Creative North Star: "The Digital Maître d'"**
This design system is not a utility; it is a high-end editorial experience. It seeks to bridge the gap between a physical Michelin-star menu and a digital interface. We move beyond the "template" look by embracing **The Culinary Editorial**—a style defined by expansive negative space, high-contrast typography, and a "No-Line" philosophy. 

The goal is to treat food photography as fine art. The UI must never compete with the imagery; it should act as the gallery wall—quiet, sophisticated, and structurally impeccable. We break the rigid, boxy nature of standard web grids by using intentional asymmetry and tonal layering to guide the guest's eye.

---

## 2. Colors & Surface Philosophy
The palette is rooted in deep obsidians and a singular, high-energy "Signature Red" (#EF4444) that acts as a visual spice.

### The "No-Line" Rule
**Explicit Instruction:** Prohibit the use of 1px solid borders for sectioning or containment. 
Boundaries must be defined solely through background color shifts or negative space. To separate a category from a list, transition from `surface` (#131313) to `surface_container_low` (#1c1b1b). This creates a seamless, premium feel that avoids the "bootstrap" aesthetic.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers. We use the Tonal Scale to define importance:
- **Base:** `background` (#131313) – The foundation.
- **Sectioning:** `surface_container_low` (#1c1b1b) – Used for large content blocks.
- **Interactive/Cards:** `surface_container_high` (#2a2a2a) – For food items and interactive elements.
- **Floating/Highlights:** `surface_bright` (#3a3939) – For temporary states or high-visibility overlays.

### The "Glass & Gradient" Rule
To add "soul" to the dark theme, use Glassmorphism for floating elements (like a navigation bar or a "View Cart" button). 
- **Recipe:** Apply `surface_container_highest` at 60% opacity with a `24px` backdrop-blur. 
- **Signature Textures:** For primary CTAs, use a subtle radial gradient from `primary` (#ffb3ad) to `primary_container` (#ff5451) to prevent the red from appearing "flat" on high-brightness displays.

---

## 3. Typography: The Editorial Voice
Our typography pairing is a dialogue between modern precision and human touch.

*   **The Signature (Great Vibes):** Used exclusively for `display-lg` and decorative accents. It represents the "Chef’s Signature." Use it sparingly—no more than 1% of the total text on screen.
*   **The Foundation (Outfit):** Used for all functional data. It is a geometric sans-serif that feels clean and expensive.

### Typography Scale
- **Display (Great Vibes):** Fluid, script-based. Used for hero welcomes or section "flourishes."
- **Headline (Outfit):** Bold, uppercase, with 0.05em letter spacing for a cinematic feel.
- **Body (Outfit):** Highly legible, tracking set to "Normal."
- **Label (Outfit):** Small caps or bold weights to denote price points or dietary markers (e.g., Vegan, Spicy).

---

## 4. Elevation & Depth
Depth is achieved through **Tonal Layering**, not structural shadows.

### The Layering Principle
Instead of a shadow, place a `surface_container_lowest` card on a `surface_container_low` section. This creates a "recessed" or "carved" look that feels integrated into the interface rather than stuck on top of it.

### Ambient Shadows
If a component *must* float (e.g., a modal or a floating action button):
- **Blur:** 40px - 60px.
- **Opacity:** 8% - 12%.
- **Color:** Use a tinted version of `on_surface` (a very dark red-tinted grey) to mimic the way light behaves in a dimly lit restaurant.

### The Ghost Border Fallback
If accessibility requirements demand a border, use a **Ghost Border**: 
- Token: `outline_variant` (#5b403e).
- Opacity: 15%.
- This ensures the boundary is visible to those who need it without breaking the "No-Line" editorial aesthetic.

---

## 5. Components

### Buttons
- **Primary:** No borders. Gradient fill (Primary to Primary Container). Text is `on_primary_container`. 0.25rem (sm) roundedness for a sharp, tailored look.
- **Secondary:** `surface_container_high` fill with a `ghost border`. 
- **Tertiary:** Text-only in `primary`. Use for low-emphasis actions like "View More Details."

### Culinary Cards (The Grid)
- **Rule:** Forbid divider lines within cards.
- **Structure:** High-quality imagery takes up the top 70% of the card. Text content sits on a `surface_container_high` base. 
- **Interaction:** On hover, the image should subtly scale (1.05x) while the card background shifts to `surface_bright`.

### Lists & Menus
- **Separation:** Use 32px or 48px of vertical white space (from the Spacing Scale) instead of horizontal rules.
- **Price Points:** Use `title-md` in `primary` color to make the price a design element rather than just a number.

### Selection Chips
- **Style:** Pill-shaped (`rounded-full`). 
- **Inactive:** `surface_container_low` background with `on_surface_variant` text.
- **Active:** `primary_container` background with `on_primary` text.

---

## 6. Do's and Don'ts

### Do:
- **Embrace Asymmetry:** Let a food image bleed off the edge of the grid to create a sense of scale.
- **Use High-Contrast Textures:** Pair the matte `background` with the "glass" navigation for a premium material feel.
- **Prioritize Breathing Room:** If you think a section needs more space, double the padding. Premium design "breathes."

### Don't:
- **Don't use 100% white text:** Use `on_surface` (#e5e2e1) to avoid harsh eye strain on dark backgrounds.
- **Don't use standard drop shadows:** They look "cheap" and "SaaS-like." Stick to tonal shifts.
- **Don't over-use the Script Font:** If everything is a "signature," nothing is a signature. Keep Great Vibes for moments of delight only.
- **Don't use dividers:** Never use a `<hr>` or a 1px line to separate menu items. Use space.```