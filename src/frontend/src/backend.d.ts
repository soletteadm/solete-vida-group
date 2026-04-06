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
export type Holiday = { none: null } | { easter: null } | { christmas: null } | { newyear: null } | { midsommar: null };
export type HolidayKey = "none" | "easter" | "christmas" | "newyear" | "midsommar";
export type ContactStatus = { active: null } | { notactive: null };

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

export interface ContactMessage {
    id: string;
    name: string;
    email: string;
    message: string;
    submittedAt: bigint;
    status: ContactStatus;
    senderPrincipal: Option<string>;
    deviceId: Option<string>;
    senderBlocked: boolean;
}

export type CallResult = { ok: null } | { err: string };
export type SubmitContactResult = { ok: string } | { err: string };
export type ListUsersResult = { ok: UserListEntry[] } | { err: string };
export type ListContactResult = { ok: ContactMessage[] } | { err: string };
export type ListBlockedResult = { ok: string[] } | { err: string };

export interface backendInterface {
    getMyRole(): Promise<UserRole>;
    getMyProfile(): Promise<Option<UserProfile>>;
    updateMyProfile(name: string, email: string, phone: string): Promise<CallResult>;
    listUsers(): Promise<ListUsersResult>;
    addUser(principalText: string, role: UserRole): Promise<CallResult>;
    updateUserRole(principalText: string, newRole: UserRole): Promise<CallResult>;
    removeUser(principalText: string): Promise<CallResult>;
    blockUser(principalText: string): Promise<CallResult>;
    updateUserProfile(principalText: string, name: string, email: string, phone: string): Promise<CallResult>;
    getActiveHoliday(): Promise<Holiday>;
    setActiveHoliday(holiday: Holiday): Promise<CallResult>;
    submitContact(name: string, email: string, message: string): Promise<SubmitContactResult>;
    listContactMessages(): Promise<ListContactResult>;
    updateContactStatus(id: string, status: ContactStatus): Promise<CallResult>;
    deleteContactMessage(id: string): Promise<CallResult>;
    deleteContactMessages(ids: string[]): Promise<CallResult>;
    blockContactSender(principalText: string): Promise<CallResult>;
    unblockContactSender(principalText: string): Promise<CallResult>;
    getBlockedSenders(): Promise<ListBlockedResult>;
    admin_addUserAccess(principalText: string, role: UserRole): Promise<void>;
    admin_updateUserAccess(principalText: string, role: UserRole): Promise<void>;
    admin_getUserAccess(): Promise<UserAccessEntry[]>;
}
