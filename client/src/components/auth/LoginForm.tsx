"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { fetchCurrentUser, loginRequest } from "@/lib/api";
import { clearStoredToken, getStoredToken, storeToken } from "@/lib/auth-storage";
import {
  getActiveManagerMemberships,
  getPortalDestinationForUser,
  getPortalDestinationForVariant,
  getPortalLoginPath,
  hasManagerMembership,
  hasOwnerMembership,
  type PortalVariant,
} from "@/lib/portal";
import { cn } from "@/lib/utils";

export function LoginForm({
  portalVariant = "owner",
}: {
  portalVariant?: PortalVariant;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const alternatePortalVariant =
    portalVariant === "owner" ? "manager" : "owner";
  const alternatePortalHref = getPortalLoginPath(alternatePortalVariant);
  const alternatePortalLabel =
    portalVariant === "owner"
      ? "Restaurant manager sign in"
      : "Company admin sign in";
  const portalHeading =
    portalVariant === "owner" ? "Company Sign In" : "Manager Sign In";
  const portalDescription =
    portalVariant === "owner"
      ? "Sign in to the company portal to manage every restaurant, assign managers, and oversee the full Aroma network."
      : "Sign in to the restaurant portal to manage your assigned restaurant menu, dishes, public link, and QR access.";

  const resolvePortalDestinationForVariant = (
    user: Awaited<ReturnType<typeof fetchCurrentUser>>,
  ) => {
    const destination = getPortalDestinationForVariant(user, portalVariant);

    if (destination) {
      return destination;
    }

    if (portalVariant === "owner") {
      if (hasManagerMembership(user.memberships)) {
        throw new Error(
          "This account belongs to a restaurant manager. Please use the manager login page.",
        );
      }

      throw new Error(
        "This account does not have company admin access yet.",
      );
    }

    if (hasOwnerMembership(user.memberships)) {
      throw new Error(
        "This account belongs to the company admin portal. Please use the admin login page.",
      );
    }

    if (
      hasManagerMembership(user.memberships) &&
      getActiveManagerMemberships(user.memberships).length === 0
    ) {
      throw new Error(
        "Your restaurant access has been deactivated. Contact the owner or admin.",
      );
    }

    throw new Error(
      "This manager account has not been assigned to any restaurant yet.",
    );
  };

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      return;
    }

    let cancelled = false;

    const redirectToPortal = async () => {
      try {
        const user = await fetchCurrentUser(token);
        if (!cancelled) {
          router.replace(getPortalDestinationForUser(user));
        }
      } catch {
        clearStoredToken();
        if (!cancelled) {
          router.replace(getPortalLoginPath(portalVariant));
        }
      }
    };

    void redirectToPortal();

    return () => {
      cancelled = true;
    };
  }, [portalVariant, router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const payload = await loginRequest({
        email,
        password,
      });

      const user = await fetchCurrentUser(payload.token);
      const destination = resolvePortalDestinationForVariant(user);
      storeToken(payload.token, rememberMe);
      router.push(destination);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to sign in right now.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <header>
        <h2 className="text-[2.2rem] font-bold tracking-[-0.03em] text-gray-900">
          Welcome Back!
        </h2>
        <p className="mt-2 text-sm font-medium text-gray-500">
          Sign in to your admin portal
        </p>
      </header>

      <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
        <div className="space-y-1.5">
          <label
            className="text-sm font-semibold text-gray-700"
            htmlFor="email"
          >
            Email
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
              <span className="material-symbols-outlined text-[1.1rem]">mail</span>
            </span>
            <input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Type your email address"
              className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
              required
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label
            className="text-sm font-semibold text-gray-700"
            htmlFor="password"
          >
            Password
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
              <span className="material-symbols-outlined text-[1.1rem]">lock</span>
            </span>
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Type your password"
              className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-11 pr-12 text-sm text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-gray-400 transition-colors hover:text-gray-600"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              <span className="material-symbols-outlined text-[1.1rem]">
                {showPassword ? "visibility_off" : "visibility"}
              </span>
            </button>
          </div>
        </div>

        {errorMessage ? (
          <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
            {errorMessage}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex w-full items-center justify-center gap-3 rounded-xl bg-gray-200 px-5 py-3.5 text-sm font-semibold text-gray-500 transition-all hover:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? <span className="spinner-sm" /> : null}
          {isSubmitting ? "Signing In..." : "Sign In"}
        </button>
      </form>

      {portalVariant === "manager" ? (
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Need admin access?{" "}
            <Link
              href={alternatePortalHref}
              className="font-semibold text-orange-500 hover:text-orange-600"
            >
              Admin Sign In
            </Link>
          </p>
        </div>
      ) : (
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Restaurant manager?{" "}
            <Link
              href={alternatePortalHref}
              className="font-semibold text-orange-500 hover:text-orange-600"
            >
              Manager Sign In
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
