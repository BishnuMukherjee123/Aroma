"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { useAuthSession } from "@/hooks/use-auth-session";
import { 
  getPortalLoginPath, 
  getWorkspacePath, 
  getActiveManagerMemberships, 
  hasOwnerMembership, 
  getPortalHomePath,
  getPortalTitle,
  getPortalSubtitle
} from "@/lib/portal";
import { clearStoredToken } from "@/lib/auth-storage";

export default function ManagerPage() {
  const router = useRouter();
  const session = useAuthSession({
    portalVariant: "manager",
    loginPath: getPortalLoginPath("manager"),
  });

  useEffect(() => {
    if (session.status !== "authenticated") {
      return;
    }

    if (hasOwnerMembership(session.user.memberships)) {
      router.replace(getPortalHomePath("owner"));
      return;
    }

    const managerMemberships = getActiveManagerMemberships(session.user.memberships);
    
    // Auto-redirect if exactly 1 workspace is assigned
    if (managerMemberships.length === 1) {
      router.replace(getWorkspacePath("manager", managerMemberships[0].restaurant.id));
    }
  }, [router, session]);

  if (session.status === "loading" || session.status === "unauthenticated") {
    return <LoadingScreen message="Loading manager portal..." />;
  }

  const managerMemberships = getActiveManagerMemberships(session.user.memberships);

  // If 1 workspace, we are currently redirecting in the useEffect.
  // Show loading screen in the meantime.
  if (managerMemberships.length === 1) {
    return <LoadingScreen message="Redirecting to your workspace..." />;
  }

  return (
    <div className="min-h-screen bg-[#f7f7f7] p-8 flex flex-col items-center justify-center">
      <div className="w-full max-w-lg bg-white rounded-[1.5rem] shadow-sm p-8">
        <div className="text-center mb-8">
          <div className="inline-flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#176939] to-[#1d7a3a] text-white shadow-sm mb-4">
            <span className="material-symbols-outlined text-xl">restaurant</span>
          </div>
          <h1 className="text-2xl font-bold text-[#14201a]">{getPortalTitle("manager")}</h1>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#5a6660] mt-1">
            {getPortalSubtitle("manager")}
          </p>
        </div>

        {managerMemberships.length === 0 ? (
          <div className="text-center py-6">
            <h2 className="text-lg font-semibold text-[#14201a]">No Workspace Assigned</h2>
            <p className="mt-2 text-sm text-[#5a6660]">
              You do not have any active restaurant workspaces assigned to your account.
              Please contact the owner or administrator to grant you access.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#5a6660] mb-4">Select a Workspace</h2>
            {managerMemberships.map((membership) => (
              <Link
                key={membership.id}
                href={getWorkspacePath("manager", membership.restaurant.id)}
                className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-[#176939]/30 hover:bg-[#e6f1ea] transition-colors group"
              >
                <div>
                  <h3 className="font-bold text-[#14201a] group-hover:text-[#176939] transition-colors">
                    {membership.restaurant.name}
                  </h3>
                  <p className="text-xs text-[#5a6660] mt-1">{membership.restaurant.publicId}</p>
                </div>
                <span className="material-symbols-outlined text-[#5a6660] group-hover:text-[#176939]">
                  chevron_right
                </span>
              </Link>
            ))}
          </div>
        )}

        <div className="mt-10 pt-6 border-t border-gray-100 flex justify-center">
          <button
            onClick={() => {
              clearStoredToken();
              router.push(getPortalLoginPath("manager"));
            }}
            className="text-sm font-semibold text-[#5a6660] hover:text-[#14201a] transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
