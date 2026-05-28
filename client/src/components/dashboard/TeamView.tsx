"use client";

import { useEffect, useState, useTransition } from "react";
import { fetchTeamMembers, type TeamMember } from "@/lib/api";
import { cn } from "@/lib/utils";

export function TeamView({
  token,
}: {
  token: string;
}) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<"ALL" | "OWNER" | "ADMIN" | "MANAGER">("ALL");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, startFetchTransition] = useTransition();

  useEffect(() => {
    startFetchTransition(async () => {
      try {
        setError(null);
        const data = await fetchTeamMembers(token);
        setMembers(data);
      } catch (err: any) {
        setError(err.message || "Failed to load team members.");
      }
    });
  }, [token]);

  // Filter logic
  const filteredMembers = members.filter((member) => {
    const query = search.toLowerCase().trim();
    const matchesSearch =
      (member.name || "").toLowerCase().includes(query) ||
      member.email.toLowerCase().includes(query) ||
      member.restaurants.some((r) => r.toLowerCase().includes(query));

    const matchesRole = filterRole === "ALL" || member.role === filterRole;

    return matchesSearch && matchesRole;
  });

  const ownersList = filteredMembers.filter((m) => m.role === "OWNER");
  const otherList = filteredMembers.filter((m) => m.role !== "OWNER");

  return (
    <section className="dash-fade-up max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-6">
        <div className="space-y-2">
          <h1 className="dash-title text-[2.6rem] font-extrabold leading-none tracking-[-0.04em] text-on-surface">
            Team Directory
          </h1>
          <p className="text-sm font-medium leading-6 text-on-surface-variant">
            Manage and view the access levels, profiles, and associated locations of your team.
          </p>
        </div>
      </div>

      {/* Filters Panel */}
      <div className="dash-panel p-4 md:p-6 flex flex-wrap items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full max-w-sm">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/70">
            search
          </span>
          <input
            type="text"
            placeholder="Search by name, email, or restaurant..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-full bg-surface-container-low px-11 py-2.5 text-sm font-medium text-on-surface outline-none transition-all placeholder:text-on-surface-variant/65 focus:bg-white focus:ring-2 focus:ring-primary/20 ring-1 ring-outline-variant/10"
          />
        </div>

        {/* Role Filters */}
        <div className="flex items-center gap-2">
          {(["ALL", "OWNER", "ADMIN", "MANAGER"] as const).map((role) => (
            <button
              key={role}
              type="button"
              onClick={() => setFilterRole(role)}
              className={cn(
                "rounded-full px-4 py-2 text-xs font-bold transition-all border",
                filterRole === role
                  ? "bg-primary text-white border-primary shadow-[0_4px_12px_rgba(182,23,34,0.15)]"
                  : "bg-surface text-on-surface border-outline-variant/20 hover:bg-surface-container-low"
              )}
            >
              {role === "ALL" ? "All Staff" : role === "OWNER" ? "Owners" : role === "ADMIN" ? "Managers" : "Editors"}
            </button>
          ))}
        </div>
      </div>

      {/* Error Feedback */}
      {error && (
        <div className="rounded-[0.95rem] bg-error-container px-4 py-3 text-sm font-semibold text-error border border-red-100">
          {error}
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="dash-panel p-6 space-y-4 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="size-16 rounded-full bg-surface-container-high" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-surface-container-high rounded w-3/4" />
                  <div className="h-3 bg-surface-container-high rounded w-1/2" />
                </div>
              </div>
              <div className="h-10 bg-surface-container-high rounded-[0.95rem] w-full" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          {/* Owners Section */}
          {ownersList.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-700">shield_person</span>
                <h2 className="text-lg font-bold text-on-surface tracking-[-0.02em]">
                  Account Owners
                </h2>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-100">
                  {ownersList.length}
                </span>
              </div>

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {ownersList.map((member) => (
                  <div
                    key={member.id}
                    className="dash-panel p-6 flex flex-col justify-between gap-4 transition-all hover:-translate-y-1 hover:shadow-[0_18px_38px_rgba(18,28,42,0.06)] border border-outline-variant/10 group"
                  >
                    <div className="flex items-center gap-4">
                      {member.profilePicUrl ? (
                        <img
                          src={member.profilePicUrl}
                          alt={member.name || "Owner"}
                          className="size-16 rounded-full object-cover border border-white/80 shadow-[0_8px_20px_rgba(18,28,42,0.08)] group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="flex size-16 items-center justify-center rounded-full bg-gradient-to-br from-surface-container-high to-surface-container-low text-xl font-bold text-primary shadow-[0_8px_20px_rgba(18,28,42,0.08)] group-hover:scale-105 transition-transform">
                          {(member.name || member.email).charAt(0).toUpperCase()}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-on-surface truncate">
                          {member.name || "Aroma Team Member"}
                        </h3>
                        <p className="text-xs text-on-surface-variant truncate font-medium">
                          {member.email}
                        </p>
                        <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-700 border border-emerald-100">
                          Owner
                        </span>
                      </div>
                    </div>

                    <div className="border-t border-outline-variant/15 pt-3">
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-on-surface-variant/60">
                        Assigned Locations
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {member.restaurants.map((rest) => (
                          <span
                            key={rest}
                            className="rounded-lg bg-surface-container-low px-2.5 py-1 text-xs font-semibold text-on-surface"
                          >
                            {rest}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Other Members Section */}
          {otherList.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">badge</span>
                <h2 className="text-lg font-bold text-on-surface tracking-[-0.02em]">
                  Workspace Managers & Staff
                </h2>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary border border-primary/10">
                  {otherList.length}
                </span>
              </div>

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {otherList.map((member) => (
                  <div
                    key={member.id}
                    className="dash-panel p-6 flex flex-col justify-between gap-4 transition-all hover:-translate-y-1 hover:shadow-[0_18px_38px_rgba(18,28,42,0.06)] border border-outline-variant/10 group"
                  >
                    <div className="flex items-center gap-4">
                      {member.profilePicUrl ? (
                        <img
                          src={member.profilePicUrl}
                          alt={member.name || "Staff"}
                          className="size-16 rounded-full object-cover border border-white/80 shadow-[0_8px_20px_rgba(18,28,42,0.08)] group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="flex size-16 items-center justify-center rounded-full bg-gradient-to-br from-surface-container-high to-surface-container-low text-xl font-bold text-primary shadow-[0_8px_20px_rgba(18,28,42,0.08)] group-hover:scale-105 transition-transform">
                          {(member.name || member.email).charAt(0).toUpperCase()}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-on-surface truncate">
                          {member.name || "Aroma Team Member"}
                        </h3>
                        <p className="text-xs text-on-surface-variant truncate font-medium">
                          {member.email}
                        </p>
                        <span className={cn(
                          "mt-1.5 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider border",
                          member.role === "ADMIN"
                            ? "bg-blue-50 text-blue-700 border-blue-100"
                            : "bg-purple-50 text-purple-700 border-purple-100"
                        )}>
                          {member.role === "ADMIN" ? "Manager" : "MANAGER"}
                        </span>
                      </div>
                    </div>

                    <div className="border-t border-outline-variant/15 pt-3">
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-on-surface-variant/60">
                        Assigned Locations
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {member.restaurants.map((rest) => (
                          <span
                            key={rest}
                            className="rounded-lg bg-surface-container-low px-2.5 py-1 text-xs font-semibold text-on-surface"
                          >
                            {rest}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {filteredMembers.length === 0 && (
            <div className="dash-panel p-12 text-center flex flex-col items-center justify-center space-y-4">
              <span className="material-symbols-outlined text-[3.5rem] text-on-surface-variant/30">
                group_off
              </span>
              <h3 className="text-xl font-bold text-on-surface tracking-[-0.02em]">
                No members found
              </h3>
              <p className="text-sm font-medium text-on-surface-variant max-w-sm">
                No staff members matched your search query or role filter. Try resetting your query or select "All Staff".
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
