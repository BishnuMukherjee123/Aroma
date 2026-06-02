"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import useSWR from "swr";

import { fetchCurrentUser, type MeResponse } from "@/lib/api";
import { clearStoredToken, getStoredToken } from "@/lib/auth-storage";
import {
  getPortalLoginPath,
  type PortalVariant,
} from "@/lib/portal";

type SessionState =
  | { status: "loading" }
  | { status: "authenticated"; token: string; user: MeResponse }
  | { status: "unauthenticated"; message: string };

export function useAuthSession(options?: {
  portalVariant?: PortalVariant;
  loginPath?: string;
}) {
  const router = useRouter();
  const loginPath =
    options?.loginPath ??
    getPortalLoginPath(options?.portalVariant ?? "owner");
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    setToken(getStoredToken());
  }, []);

  const { data: user, error, isLoading } = useSWR<MeResponse, Error>(
    token ? ["fetchCurrentUser", token] : null,
    async ([, t]: [string, string]) => {
      try {
        return await fetchCurrentUser(t);
      } catch (err) {
        clearStoredToken();
        throw err;
      }
    },
    {
      revalidateOnFocus: true,
      shouldRetryOnError: false,
    }
  );

  let state: SessionState = { status: "loading" };
  
  // Wait until we have run the first useEffect to read the token
  if (token === null) {
    state = { status: "loading" };
  } else if (!token || error) {
    state = {
      status: "unauthenticated",
      message: error?.message || "No login token was found. Please sign in again.",
    };
  } else if (user) {
    state = { status: "authenticated", token, user };
  }

  useEffect(() => {
    if (state.status === "unauthenticated") {
      const timeout = window.setTimeout(() => {
        router.replace(loginPath);
      }, 1200);

      return () => window.clearTimeout(timeout);
    }

    return undefined;
  }, [loginPath, router, state]);

  return state;
}
