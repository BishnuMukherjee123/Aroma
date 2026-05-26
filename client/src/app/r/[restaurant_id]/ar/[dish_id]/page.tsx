import { redirect, notFound, unstable_rethrow } from "next/navigation";
import { fetchPublicRestaurantServer } from "@/lib/api";

type PublicArDishPageProps = {
  params: Promise<{
    restaurant_id: string;
    dish_id: string;
  }>;
};

/**
 * AR Dish Page
 *
 * Redirects to the standalone /ar-viewer HTML page which loads 8th Wall
 * scripts synchronously in <head> — the only reliable way to open the
 * rear camera on iOS Safari.
 *
 * The EighthWallArViewer React component is intentionally not used here
 * because Next.js bundles prevent synchronous script loading order.
 */
export default async function PublicArDishPage({
  params,
}: PublicArDishPageProps) {
  const { restaurant_id, dish_id } = await params;

  // Use .catch() so that notFound() is never called inside a try-catch block.
  // unstable_rethrow re-throws Next.js internal signals (NEXT_REDIRECT,
  // NEXT_NOT_FOUND, etc.) so they propagate correctly through the framework.
  //
  // We DON'T put redirect() inside a try/catch: Next.js implements redirect()
  // by throwing a NEXT_REDIRECT signal, and a generic catch block would
  // intercept that signal and trigger notFound().
  const restaurant = await fetchPublicRestaurantServer(restaurant_id).catch(
    (error: unknown) => {
      unstable_rethrow(error);
      return null;
    },
  );

  if (!restaurant) {
    notFound();
  }

  const dish = restaurant.menus
    .flatMap((menu) => menu.categories)
    .flatMap((category) => category.dishes)
    .find((item) => item.id === dish_id);

  const modelUrl = dish?.modelUrl ?? null;

  if (!modelUrl) {
    notFound();
  }

  const backUrl = `/r/${restaurant_id}`;
  // _cb busts any aggressive intermediary cache (CDN, service worker, etc.)
  // so the browser always fetches a fresh copy of the HTML shell.
  // The 8th Wall engine state is initialised inside that fresh page.
  const arUrl = `/ar-viewer/index.html?model=${encodeURIComponent(modelUrl)}&back=${encodeURIComponent(backUrl)}&_cb=${Date.now()}`;

  redirect(arUrl);
}
