/* eslint-disable */

// @ts-nocheck

import type { ActorMethod } from '@icp-sdk/core/agent';
import type { IDL } from '@icp-sdk/core/candid';
import type { Principal } from '@icp-sdk/core/principal';

export type UserRole = { 'admin': null } | { 'user': null } | { 'guest': null };

export interface UserProfile {
  'name': string;
  'email': string;
  'phone': string;
  'registeredAt': bigint;
}

export interface UserAccessEntry {
  'principal': Principal;
  'role': UserRole;
}

export interface UserListEntry {
  'principal': Principal;
  'role': UserRole;
  'profile': [] | [UserProfile];
}

export type CallResult = { 'ok': null } | { 'err': string };
export type ListUsersResult = { 'ok': UserListEntry[] } | { 'err': string };

export interface _SERVICE {
  'getMyRole': ActorMethod<[], UserRole>;
  'getMyProfile': ActorMethod<[], [] | [UserProfile]>;
  'updateMyProfile': ActorMethod<[string, string, string], CallResult>;
  'listUsers': ActorMethod<[], ListUsersResult>;
  'addUser': ActorMethod<[string, UserRole], CallResult>;
  'updateUserRole': ActorMethod<[string, UserRole], CallResult>;
  'removeUser': ActorMethod<[string], CallResult>;
  'blockUser': ActorMethod<[string], CallResult>;
  'updateUserProfile': ActorMethod<[string, string, string, string], CallResult>;
  'admin_addUserAccess': ActorMethod<[string, UserRole], undefined>;
  'admin_updateUserAccess': ActorMethod<[string, UserRole], undefined>;
  'admin_getUserAccess': ActorMethod<[], UserAccessEntry[]>;
}

export declare const idlService: IDL.ServiceClass;
export declare const idlInitArgs: IDL.Type[];
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
