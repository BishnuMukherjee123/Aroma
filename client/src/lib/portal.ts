import type { MeResponse } from "@/lib/api";

export type MembershipRole = "OWNER" | "ADMIN" | "MANAGER";
export type PortalVariant = "owner" | "manager";

// Role hierarchy (stored in DB):
//   OWNER  = full access — the restaurant owner
//   ADMIN  = full access — same as owner, highest authority
//   MANAGER = limited access — assigned to a particular kitchen
const roleLabels: Record<MembershipRole, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  MANAGER: "Manager",
};

export const isMembershipRole = (value: string): value is MembershipRole =>
  value === "OWNER" || value === "ADMIN" || value === "MANAGER";

export const getRoleLabel = (role: string) =>
  isMembershipRole(role) ? roleLabels[role] : role;

export const hasOwnerMembership = (
  memberships: MeResponse["memberships"],
) => memberships.some((membership) => membership.role === "OWNER");

export const hasManagerMembership = (
  memberships: MeResponse["memberships"],
) => memberships.some((membership) => membership.role !== "OWNER");

export const getActiveManagerMemberships = (
  memberships: MeResponse["memberships"],
) =>
  memberships.filter(
    (membership) => membership.role !== "OWNER" && membership.restaurant.isActive,
  );

export const getDefaultPortalVariant = (
  user: Pick<MeResponse, "memberships">,
): PortalVariant =>
  hasOwnerMembership(user.memberships) ? "owner" : "manager";

export const filterMembershipsForPortal = (
  memberships: MeResponse["memberships"],
  variant: PortalVariant,
) =>
  variant === "manager"
    ? getActiveManagerMemberships(memberships)
    : memberships;

export const getPortalHomePath = (variant: PortalVariant) =>
  variant === "owner" ? "/dashboard" : "/manager";

export const getPortalLoginPath = (variant: PortalVariant) =>
  variant === "owner" ? "/" : "/manager/login";

export const getWorkspacePath = (
  variant: PortalVariant,
  restaurantId: string,
) => `${getPortalHomePath(variant)}/restaurants/${restaurantId}`;

export const getPortalDestinationForUser = (
  user: Pick<MeResponse, "memberships">,
) => {
  const variant = getDefaultPortalVariant(user);
  if (variant === "owner") {
    return getPortalHomePath(variant);
  }

  const memberships = getActiveManagerMemberships(user.memberships);
  if (memberships.length === 1) {
    return getWorkspacePath("manager", memberships[0].restaurant.id);
  }

  return getPortalHomePath("manager");
};

export const getPortalDestinationForVariant = (
  user: Pick<MeResponse, "memberships">,
  variant: PortalVariant,
) => {
  if (variant === "owner") {
    return hasOwnerMembership(user.memberships)
      ? getPortalHomePath("owner")
      : null;
  }

  const memberships = getActiveManagerMemberships(user.memberships);
  if (memberships.length === 0) {
    return null;
  }

  if (memberships.length === 1) {
    return getWorkspacePath("manager", memberships[0].restaurant.id);
  }

  return getPortalHomePath("manager");
};

export const getPortalTitle = (variant: PortalVariant) =>
  variant === "owner" ? "Aroma Admin" : "Aroma Manager";

export const getPortalSubtitle = (variant: PortalVariant) =>
  variant === "owner" ? "Management Portal" : "Manager Workspace";

export const getAccountLabel = (variant: PortalVariant) =>
  variant === "owner" ? "Account Owner" : "Restaurant Manager";
