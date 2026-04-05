# Aroma WebAR: The Future of Interactive Menus 🍕

<div align="center">
  <h3>Bring flavor to life in AR.</h3>
  <p>A frictionless WebAR-based menu platform for restaurants to increase Average Order Value (AOV) and elevate customer decision-making.</p>
</div>

---

## 📖 Overview
Aroma is a seamless WebAR (Augmented Reality) menu platform. By scanning a simple QR code, customers can view high-fidelity 3D models of their food directly on their physical table using **Native WebXR**—without ever downloading an app. 

This project aims to serve two distinct business goals:
1. **In-Restaurant Experience:** Instantly visualizes portion sizes and ingredients to confidently upsell menu items.
2. **At-Home Preview:** A social media mechanism to drive cravings and footfall by previewing dishes straight from a URL.

---

## ✨ Key Features (MVP Scope)

### 1. WebAR Viewer
- **Native WebXR:** Camera-based AR directly in mobile Safari/Chrome.
- **Surface Detection:** Automatically maps the environment to place dishes accurately.
- **Interactions:** Tap-to-place, two-finger scaling, and intuitive single-finger rotating.

### 2. Menu UI Overlay
- **Premium Glassmorphism:** A completely custom, non-intrusive "Aroma Noir" aesthetic that hovers over the camera feed.
- **Real-time Synchronization:** Instantly swaps 3D models when a user browses Dish Name, Price, and Description.

### 3. QR-Based Access System
- **Dynamic Routing:** Unique links configured per restaurant (e.g., `aroma.app/r/{restaurant_id}`).
- **Zero Friction:** Bypass the app store entirely. Scanning the code enters the experience in under 5 seconds.

### 4. Admin Dashboard
- **Digital Asset Management:** Built-in "Upload 3D Models" zone that safely pushes `.glb`/`.gltf` files directly to the cloud.
- **Menu Assignment:** Dropdowns to easily attach uploaded 3D geometry to database entries.
- **Analytics:** Live AR Cloud Storage tracker mapping 3D asset usage limits.

---

## 🛠️ Tech Stack
This project was built using the following technologies to strictly adhere to the MVP constraints (speed, WebXR focus, scalability):
- **Frontend Framework:** Next.js & React (App Router)
- **Language:** TypeScript
- **WebAR Engine:** `@google/model-viewer` (Native WebXR Device API)
- **Backend & Database:** Supabase (PostgreSQL)
- **Cloud Storage:** Supabase Storage Buckets (with RLS policies)
- **Styling:** Tailwind CSS & Custom CSS Glassmorphism

---

## 🏗️ Architecture & Technical Decisions
To fulfill the strict **< 5 seconds load time** and **mid-range device compatibility** constraints, this MVP was engineered as a highly scalable product, not just a script:

*   **Frontend (Next.js & React):** Server-Side Rendering (SSR) ensures ultra-fast initial page loads. The aggressive Next.js Image Optimizer was explicitly bypassed for dynamic Supabase images to prevent SSRF crashes and ensure instantaneous thumbnail delivery.
*   **AR Engine (`@google/model-viewer`):** Rather than importing massive game engines like Three.js/Babylon directly, this project leverages Google's Web Component. This drastically reduces the JavaScript bundle size, allowing the page to initialize the camera feed almost instantly.
*   **Backend (Supabase/PostgreSQL):** A fully relational database linking `restaurants` to `dishes`. Row Level Security (RLS) is strictly enforced on the `aroma-assets` storage bucket, locking down MIME-type uploads strictly to `.glb`, `.gltf`, and images under 20MB.

---

## 🚀 Getting Started (Development)

### Prerequisites
- Node.js 18+
- Supabase Account 

### Quickstart
1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/aroma-webar.git
   cd aroma-webar
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env.local` file in the root directory and add your Supabase keys:
   ```env
   NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY="your-anon-key"
   ```

4. **Initialize the Database (Supabase SQL Editor):**
   Run the included `supabase-setup.sql` to create buckets / RLS rules, and `supabase-schema.sql` to create your initial `restaurants` and `dishes` tables.

5. **Run the Development Server:**
   ```bash
   npm run dev
   ```
   *Navigate to `http://localhost:3000/admin` to begin uploading models and generating your QR codes!*
