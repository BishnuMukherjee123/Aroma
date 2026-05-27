"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getStoredToken } from "@/lib/auth-storage";
import { fetchCurrentUser } from "@/lib/api";
import { getPortalDestinationForUser } from "@/lib/portal";

/**
 * Wraps the login page. If a valid token is stored in localStorage/sessionStorage,
 * redirects to the correct dashboard BEFORE showing the login UI — no flash.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  // null = still checking, false = no token (show login), true = has token (redirecting)
  const [status, setStatus] = useState<"checking" | "redirecting" | "show">("checking");

  useEffect(() => {
    const token = getStoredToken();

    if (!token) {
      // No token at all — show login immediately
      setStatus("show");
      return;
    }

    // Token exists — redirect immediately (optimistic), dashboard will handle invalid tokens
    setStatus("redirecting");

    let cancelled = false;

    const go = async () => {
      try {
        const user = await fetchCurrentUser(token);
        if (!cancelled) {
          router.replace(getPortalDestinationForUser(user));
        }
      } catch {
        // Token invalid/expired — show login
        if (!cancelled) {
          setStatus("show");
        }
      }
    };

    void go();

    return () => {
      cancelled = true;
    };
  }, [router]);

  // While checking or redirecting, show nothing (blank screen is instant — no flash of login)
  if (status === "checking" || status === "redirecting") {
    return null;
  }

  return <>{children}</>;
}
