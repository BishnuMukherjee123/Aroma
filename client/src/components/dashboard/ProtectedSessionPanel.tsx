"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { AuthUser, fetchCurrentUser, MeResponse } from "@/lib/api";
import { clearStoredToken, getStoredToken } from "@/lib/auth-storage";

type DashboardState =
  | { status: "loading" }
  | { status: "ready"; user: MeResponse }
  | { status: "error"; message: string };

const StatCard = ({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) => (
  <div className="rounded-[1.1rem] bg-surface-container-low p-5 ring-1 ring-outline-variant/12">
    <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
      {label}
    </p>
    <p className="mt-3 text-3xl font-bold tracking-[-0.04em] text-on-surface">
      {value}
    </p>
  </div>
);

const UserSummary = ({ user }: { user: AuthUser }) => (
  <div className="rounded-[1.25rem] bg-surface-container-lowest p-6 shadow-[0_16px_40px_rgba(18,28,42,0.08)] ring-1 ring-outline-variant/12">
    <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
      Session Verified
    </p>
    <h2 className="mt-3 text-[2rem] font-bold tracking-[-0.04em] text-on-surface">
      Welcome back
    </h2>
    <p className="mt-2 text-sm font-medium text-on-surface-variant">
      Your separate backend login is working correctly.
    </p>

    <dl className="mt-6 grid gap-4 text-sm text-on-surface-variant">
      <div className="rounded-[0.95rem] bg-surface-container-low px-4 py-3">
        <dt className="text-[0.72rem] font-semibold uppercase tracking-[0.18em]">
          Email
        </dt>
        <dd className="mt-1 text-base font-semibold text-on-surface">{user.email}</dd>
      </div>
      <div className="rounded-[0.95rem] bg-surface-container-low px-4 py-3">
        <dt className="text-[0.72rem] font-semibold uppercase tracking-[0.18em]">
          User Id
        </dt>
        <dd className="mt-1 break-all text-sm font-semibold text-on-surface">
          {user.id}
        </dd>
      </div>
    </dl>
  </div>
);

export function ProtectedSessionPanel() {
  const [state, setState] = useState<DashboardState>({ status: "loading" });

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setState({
        status: "error",
        message: "No saved login token was found. Sign in again from the portal.",
      });
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        const user = await fetchCurrentUser(token);
        if (!cancelled) {
          setState({ status: "ready", user });
        }
      } catch (error) {
        clearStoredToken();
        if (!cancelled) {
          setState({
            status: "error",
            message:
              error instanceof Error
                ? error.message
                : "Unable to verify your session.",
          });
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  if (state.status === "loading") {
    return (
      <div className="rounded-[1.25rem] bg-surface-container-lowest p-8 text-center shadow-[0_16px_40px_rgba(18,28,42,0.08)] ring-1 ring-outline-variant/12">
        <div className="mx-auto spinner-sm border-primary/30 border-t-primary" />
        <h2 className="mt-5 text-2xl font-bold tracking-[-0.03em] text-on-surface">
          Checking your session
        </h2>
        <p className="mt-2 text-sm font-medium text-on-surface-variant">
          We are calling your backend right now to confirm the login token.
        </p>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="rounded-[1.25rem] bg-surface-container-lowest p-8 shadow-[0_16px_40px_rgba(18,28,42,0.08)] ring-1 ring-outline-variant/12">
        <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-error">
          Session Failed
        </p>
        <h2 className="mt-3 text-2xl font-bold tracking-[-0.03em] text-on-surface">
          Login check did not pass
        </h2>
        <p className="mt-3 rounded-[0.95rem] bg-error-container px-4 py-3 text-sm font-semibold text-error">
          {state.message}
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex rounded-[0.9rem] bg-primary px-5 py-3 text-sm font-bold text-on-primary transition-transform hover:-translate-y-0.5"
        >
          Back to login
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Session State" value="Active" />
        <StatCard label="Restaurants" value={state.user.memberships.length} />
        <StatCard label="Backend Check" value="Passed" />
      </div>

      <UserSummary user={state.user} />

      <div className="rounded-[1.25rem] bg-surface-container-lowest p-6 shadow-[0_16px_40px_rgba(18,28,42,0.08)] ring-1 ring-outline-variant/12">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
              Memberships
            </p>
            <h3 className="mt-2 text-xl font-bold tracking-[-0.03em] text-on-surface">
              Available restaurant access
            </h3>
          </div>
          <button
            type="button"
            onClick={() => {
              clearStoredToken();
              window.location.href = "/";
            }}
            className="rounded-[0.9rem] border border-outline-variant/40 px-4 py-2 text-sm font-bold text-on-surface transition-colors hover:bg-surface-container-low"
          >
            Log out
          </button>
        </div>

        <div className="mt-5 grid gap-4">
          {state.user.memberships.length === 0 ? (
            <div className="rounded-[0.95rem] bg-surface-container-low px-4 py-4 text-sm font-medium text-on-surface-variant">
              This user has no restaurant memberships yet, but the login token is valid.
            </div>
          ) : (
            state.user.memberships.map((membership) => (
              <div
                key={membership.id}
                className="rounded-[0.95rem] bg-surface-container-low px-4 py-4 ring-1 ring-outline-variant/10"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-base font-bold text-on-surface">
                      {membership.restaurant.name}
                    </p>
                    <p className="mt-1 text-sm font-medium text-on-surface-variant">
                      Public ID: {membership.restaurant.publicId}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-primary">
                      {membership.role}
                    </span>
                    <span className="rounded-full bg-surface px-3 py-1 text-xs font-semibold text-on-surface-variant">
                      {membership.restaurant.isPublished ? "Published" : "Draft"}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
