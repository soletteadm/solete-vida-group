import { useCallback, useEffect, useState } from "react";
import type { Option, UserProfile, UserRole } from "../backend.d";
import { useInternetIdentity } from "./useInternetIdentity";
import { useTypedActor } from "./useTypedActor";

export type AuthRole = UserRole | null;

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

export function isAdminRole(role: UserRole | null): boolean {
  return role !== null && "admin" in role;
}

export function isUserRole(role: UserRole | null): boolean {
  return role !== null && "user" in role;
}

export function isGuestRole(role: UserRole | null): boolean {
  return role === null || "guest" in role;
}

export function getRoleLabel(role: UserRole | null): string {
  if (role === null) return "guest";
  if ("admin" in role) return "admin";
  if ("user" in role) return "user";
  return "guest";
}

export function useAuth(): AuthState {
  const { identity, login, clear, isInitializing } = useInternetIdentity();
  const { actor, isFetching } = useTypedActor();
  const [role, setRole] = useState<AuthRole>(null);
  const [roleFetching, setRoleFetching] = useState(false);

  const isLoggedIn = !!identity && !identity.getPrincipal().isAnonymous();

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
        if (!cancelled) setRole({ guest: null });
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

  const principalText = isLoggedIn
    ? (identity?.getPrincipal().toString() ?? null)
    : null;

  return {
    isLoggedIn,
    isLoading: isInitializing || isFetching || roleFetching,
    identity,
    role,
    principalText,
    login,
    logout,
    isAdmin: isAdminRole(role),
    isUser: isUserRole(role),
    isGuest: isGuestRole(role),
    roleLabel: getRoleLabel(role),
  };
}
