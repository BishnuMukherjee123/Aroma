"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { fetchCurrentUser, type MeResponse } from "@/lib/api";
import { clearStoredToken, getStoredToken } from "@/lib/auth-storage";

type SessionState =
  | { status: "loading" }
  | { status: "authenticated"; token: string; user: MeResponse }
  | { status: "unauthenticated"; message: string };

export function useAuthSession() {
  const router = useRouter();
  const [state, setState] = useState<SessionState>({ status: "loading" });

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setState({
        status: "unauthenticated",
        message: "No login token was found. Please sign in again.",
      });
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        const user = await fetchCurrentUser(token);
        if (!cancelled) {
          setState({
            status: "authenticated",
            token,
            user,
          });
        }
      } catch (error) {
        clearStoredToken();
        if (!cancelled) {
          setState({
            status: "unauthenticated",
            message:
              error instanceof Error
                ? error.message
                : "Session verification failed.",
          });
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (state.status === "unauthenticated") {
      const timeout = window.setTimeout(() => {
        router.replace("/");
      }, 1200);

      return () => window.clearTimeout(timeout);
    }

    return undefined;
  }, [router, state]);

  return state;
}
