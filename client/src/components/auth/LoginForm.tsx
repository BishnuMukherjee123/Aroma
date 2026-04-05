"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { loginRequest } from "@/lib/api";
import { getStoredToken, storeToken } from "@/lib/auth-storage";
import { cn } from "@/lib/utils";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (getStoredToken()) {
      router.replace("/dashboard");
    }
  }, [router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const payload = await loginRequest({
        email,
        password,
      });

      storeToken(payload.token, rememberMe);
      router.push("/dashboard");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to sign in right now.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-[1.5rem] bg-surface-container-lowest px-8 py-8 shadow-[0_16px_48px_rgba(18,28,42,0.08)] ring-1 ring-outline-variant/12 md:px-9 md:py-9">
      <header>
        <h2 className="text-[2rem] font-bold tracking-[-0.03em] text-on-surface">
          Sign In
        </h2>
        <p className="mt-2 text-sm font-medium text-on-surface-variant">
          Enter your credentials to manage your restaurant.
        </p>
      </header>

      <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label
            className="flex items-center gap-2 text-[0.72rem] font-semibold uppercase tracking-[0.17em] text-on-surface-variant"
            htmlFor="email"
          >
            <span className="material-symbols-outlined text-[1rem]">mail</span>
            Email Address
          </label>
          <input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="manager@aroma.com"
            className="w-full rounded-[0.95rem] bg-surface-container-low px-4 py-3.5 text-[0.98rem] text-on-surface outline-none transition-all placeholder:text-outline focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20"
            required
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <label
              className="flex items-center gap-2 text-[0.72rem] font-semibold uppercase tracking-[0.17em] text-on-surface-variant"
              htmlFor="password"
            >
              <span className="material-symbols-outlined text-[1rem]">lock</span>
              Password
            </label>
            <Link
              href="mailto:support@aromaar.com"
              className="text-xs font-bold text-primary transition-colors hover:text-primary-container"
            >
              Forgot Password?
            </Link>
          </div>

          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              className="w-full rounded-[0.95rem] bg-surface-container-low px-4 py-3.5 pr-12 text-[0.98rem] text-on-surface outline-none transition-all placeholder:text-outline focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-outline transition-colors hover:bg-white/70 hover:text-on-surface"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              <span className="material-symbols-outlined text-[1.1rem]">
                {showPassword ? "visibility_off" : "visibility"}
              </span>
            </button>
          </div>
        </div>

        <label className="flex items-center gap-3 text-sm font-medium text-on-surface-variant">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(event) => setRememberMe(event.target.checked)}
            className="h-4 w-4 rounded border border-outline-variant/70 text-primary accent-primary"
          />
          Keep me signed in for 30 days
        </label>

        {errorMessage ? (
          <div className="rounded-[0.95rem] bg-error-container px-4 py-3 text-sm font-semibold text-error">
            {errorMessage}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className={cn(
            "flex w-full items-center justify-center gap-3 rounded-[0.95rem] bg-gradient-to-br from-primary to-primary-container px-5 py-3.5 text-[1rem] font-bold text-on-primary shadow-[0_12px_24px_rgba(182,23,34,0.22)] transition-all",
            "hover:-translate-y-0.5 hover:shadow-[0_18px_28px_rgba(182,23,34,0.24)] active:translate-y-0 active:scale-[0.99]",
            "disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-80 disabled:shadow-[0_8px_16px_rgba(182,23,34,0.16)]",
          )}
        >
          {isSubmitting ? <span className="spinner-sm" /> : null}
          {isSubmitting ? "Signing In..." : "Sign In"}
        </button>
      </form>

      <div className="mt-8 border-t border-outline-variant/16 pt-7 text-center">
        <p className="text-sm font-medium text-on-surface-variant">
          New restaurant?
          <Link
            href="mailto:sales@aromaar.com"
            className="ml-1.5 font-bold text-primary transition-colors hover:text-primary-container"
          >
            Contact Sales
          </Link>
        </p>
      </div>
    </div>
  );
}
