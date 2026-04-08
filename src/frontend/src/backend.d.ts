import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface UserAccessEntry {
    principal: Principal;
    role: UserRole;
}
export interface ContactMessage {
    id: string;
    status: ContactStatus;
    name: string;
    submittedAt: bigint;
    email: string;
    senderBlocked: boolean;
    senderPrincipal?: string;
    message: string;
    deviceId?: string;
}
export interface UserListEntry {
    principal: Principal;
    role: UserRole;
    profile?: UserProfile;
}
export interface UserProfile {
    name: string;
    email: string;
    phone: string;
    registeredAt: bigint;
}
export enum ContactStatus {
    active = "active",
    notactive = "notactive"
}
export enum Holiday {
    newyear = "newyear",
    none = "none",
    easter = "easter",
    midsommar = "midsommar",
    christmas = "christmas"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addUser(principalText: string, role: UserRole): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    admin_addUserAccess(userPrincipalText: string, role: UserRole): Promise<void>;
    admin_getUserAccess(): Promise<Array<UserAccessEntry>>;
    admin_updateUserAccess(userPrincipalText: string, newRole: UserRole): Promise<void>;
    blockContactSender(principalText: string): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    blockUser(principalText: string): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    deleteContactMessage(id: string): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    deleteContactMessages(ids: Array<string>): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    getActiveHoliday(): Promise<Holiday>;
    getBlockedSenders(): Promise<{
        __kind__: "ok";
        ok: Array<string>;
    } | {
        __kind__: "err";
        err: string;
    }>;
    getMyProfile(): Promise<UserProfile | null>;
    getMyRole(): Promise<UserRole>;
    listContactMessages(): Promise<{
        __kind__: "ok";
        ok: Array<ContactMessage>;
    } | {
        __kind__: "err";
        err: string;
    }>;
    listUsers(): Promise<{
        __kind__: "ok";
        ok: Array<UserListEntry>;
    } | {
        __kind__: "err";
        err: string;
    }>;
    removeUser(principalText: string): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    setActiveHoliday(holiday: Holiday): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    submitContact(name: string, email: string, message: string): Promise<{
        __kind__: "ok";
        ok: string;
    } | {
        __kind__: "err";
        err: string;
    }>;
    unblockContactSender(principalText: string): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    updateContactStatus(id: string, status: ContactStatus): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    updateMyProfile(name: string, email: string, phone: string): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    updateUserProfile(principalText: string, name: string, email: string, phone: string): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    updateUserRole(principalText: string, newRole: UserRole): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
}
