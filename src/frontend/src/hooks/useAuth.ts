import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import { useCallback, useEffect, useState } from "react";
import type { UserRole } from "../backend.d";
import { useTypedActor } from "./useTypedActor";

export type AuthRole = UserRole | null;

// Mirror of admin_controllers in main.mo — principals that always have admin access
const ADMIN_CONTROLLERS: string[] = [
  "atewe-etgil-mre73-twlmx-z2o2f-goui6-glmiq-qulqx-osud5-xdxsn-aqe",
  "gfd5w-iksaw-xr3aq-jij26-nwcfb-rvpze-rdxzq-sucdq-pm543-eg6jp-jqe",
  "4vcqd-odjhq-5ufar-22ohg-mkxwk-gclrs-sdxvy-wfela-a6nax-xi3ol-bae",
  "wr56f-togr5-jngaa-pssu5-64x54-cglpb-47kpa-swrr4-wayex-nfunu-xae",
];

function isAdminController(principalText: string | null): boolean {
  if (!principalText) return false;
  const trimmed = principalText.trim();
  return ADMIN_CONTROLLERS.some((p) => p.trim() === trimmed);
}

export interface AuthState {
  isLoggedIn: boolean;
  isLoading: boolean;
  identity: ReturnType<typeof useInternetIdentity>["identity"];
  role: AuthRole;
  principalText: string | null;
  login: () => void;
  logout: () => void;
  isAdmin: boolean;
  isUser: boolean;
  isGuest: boolean;
  roleLabel: string;
}

// UserRole is an enum string at the TS level ("admin" | "user" | "guest")
// but the actor returns Candid variants { admin: null } at runtime.
// These helpers handle both representations safely.
function getRoleStr(role: UserRole | null): string {
  if (role === null) return "guest";
  // Candid variant object (runtime): { admin: null }
  if (typeof role === "object") {
    if ("admin" in (role as object)) return "admin";
    if ("user" in (role as object)) return "user";
    return "guest";
  }
  // Enum string (bindgen type): "admin" | "user" | "guest"
  return String(role);
}

export function isAdminRole(role: UserRole | null): boolean {
  return getRoleStr(role) === "admin";
}

export function isUserRole(role: UserRole | null): boolean {
  return getRoleStr(role) === "user";
}

export function isGuestRole(role: UserRole | null): boolean {
  return getRoleStr(role) === "guest";
}

export function getRoleLabel(role: UserRole | null): string {
  return getRoleStr(role);
}

export function useAuth(): AuthState {
  const { identity, login, clear, isInitializing } = useInternetIdentity();
  const { actor, isFetching } = useTypedActor();
  const [role, setRole] = useState<AuthRole>(null);
  const [roleFetching, setRoleFetching] = useState(false);

  const isLoggedIn = !!identity && !identity.getPrincipal().isAnonymous();

  const principalText = isLoggedIn
    ? (identity?.getPrincipal().toString() ?? null)
    : null;

  useEffect(() => {
    if (!actor || !isLoggedIn || isFetching) {
      if (!isLoggedIn) setRole(null);
      return;
    }
    let cancelled = false;
    setRoleFetching(true);
    actor
      .getMyRole()
      .then((r) => {
        if (!cancelled) setRole(r);
      })
      .catch(() => {
        if (!cancelled) setRole("guest" as UserRole);
      })
      .finally(() => {
        if (!cancelled) setRoleFetching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [actor, isLoggedIn, isFetching]);

  const logout = useCallback(() => {
    setRole(null);
    clear();
  }, [clear]);

  // isAdmin: true if the backend role is admin OR if the principal is in admin_controllers
  const isAdminByRole = isAdminRole(role);
  const isAdminByController = isAdminController(principalText);
  const isAdmin = isAdminByRole || isAdminByController;

  return {
    isLoggedIn,
    isLoading: isInitializing || isFetching || roleFetching,
    identity,
    role,
    principalText,
    login,
    logout,
    isAdmin,
    isUser: isUserRole(role),
    isGuest: isGuestRole(role),
    roleLabel: isAdmin ? "admin" : getRoleLabel(role),
  };
}
