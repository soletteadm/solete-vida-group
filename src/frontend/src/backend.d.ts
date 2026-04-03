import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;

export type UserRole = { admin: null } | { user: null } | { guest: null };

export interface UserProfile {
    name: string;
    email: string;
    phone: string;
    registeredAt: bigint;
}

export interface UserAccessEntry {
    principal: Principal;
    role: UserRole;
}

export interface UserListEntry {
    principal: Principal;
    role: UserRole;
    profile: Option<UserProfile>;
}

export type CallResult = { ok: null } | { err: string };

export interface backendInterface {
    getMyRole(): Promise<UserRole>;
    getMyProfile(): Promise<Option<UserProfile>>;
    updateMyProfile(name: string, email: string, phone: string): Promise<CallResult>;
    listUsers(): Promise<UserListEntry[]>;
    addUser(principalText: string, role: UserRole): Promise<CallResult>;
    updateUserRole(principalText: string, newRole: UserRole): Promise<CallResult>;
    removeUser(principalText: string): Promise<CallResult>;
    blockUser(principalText: string): Promise<CallResult>;
    admin_addUserAccess(principalText: string, role: UserRole): Promise<void>;
    admin_updateUserAccess(principalText: string, role: UserRole): Promise<void>;
    admin_getUserAccess(): Promise<UserAccessEntry[]>;
}
