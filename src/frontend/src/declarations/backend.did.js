/* eslint-disable */

// @ts-nocheck

import { IDL } from '@icp-sdk/core/candid';

const UserRole = IDL.Variant({
  admin: IDL.Null,
  user: IDL.Null,
  guest: IDL.Null,
});

const UserProfile = IDL.Record({
  name: IDL.Text,
  email: IDL.Text,
  phone: IDL.Text,
  registeredAt: IDL.Int,
});

const UserAccessEntry = IDL.Record({
  principal: IDL.Principal,
  role: UserRole,
});

const UserListEntry = IDL.Record({
  principal: IDL.Principal,
  role: UserRole,
  profile: IDL.Opt(UserProfile),
});

const CallResult = IDL.Variant({
  ok: IDL.Null,
  err: IDL.Text,
});

export const idlService = IDL.Service({
  getMyRole: IDL.Func([], [UserRole], ['query']),
  getMyProfile: IDL.Func([], [IDL.Opt(UserProfile)], ['query']),
  updateMyProfile: IDL.Func([IDL.Text, IDL.Text, IDL.Text], [CallResult], []),
  listUsers: IDL.Func([], [IDL.Vec(UserListEntry)], ['query']),
  addUser: IDL.Func([IDL.Text, UserRole], [CallResult], []),
  updateUserRole: IDL.Func([IDL.Text, UserRole], [CallResult], []),
  removeUser: IDL.Func([IDL.Text], [CallResult], []),
  admin_addUserAccess: IDL.Func([IDL.Text, UserRole], [], []),
  admin_updateUserAccess: IDL.Func([IDL.Text, UserRole], [], []),
  admin_getUserAccess: IDL.Func([], [IDL.Vec(UserAccessEntry)], ['query']),
});

export const idlInitArgs = [];

export const idlFactory = ({ IDL }) => {
  const UserRole = IDL.Variant({
    admin: IDL.Null,
    user: IDL.Null,
    guest: IDL.Null,
  });

  const UserProfile = IDL.Record({
    name: IDL.Text,
    email: IDL.Text,
    phone: IDL.Text,
    registeredAt: IDL.Int,
  });

  const UserAccessEntry = IDL.Record({
    principal: IDL.Principal,
    role: UserRole,
  });

  const UserListEntry = IDL.Record({
    principal: IDL.Principal,
    role: UserRole,
    profile: IDL.Opt(UserProfile),
  });

  const CallResult = IDL.Variant({
    ok: IDL.Null,
    err: IDL.Text,
  });

  return IDL.Service({
    getMyRole: IDL.Func([], [UserRole], ['query']),
    getMyProfile: IDL.Func([], [IDL.Opt(UserProfile)], ['query']),
    updateMyProfile: IDL.Func([IDL.Text, IDL.Text, IDL.Text], [CallResult], []),
    listUsers: IDL.Func([], [IDL.Vec(UserListEntry)], ['query']),
    addUser: IDL.Func([IDL.Text, UserRole], [CallResult], []),
    updateUserRole: IDL.Func([IDL.Text, UserRole], [CallResult], []),
    removeUser: IDL.Func([IDL.Text], [CallResult], []),
    admin_addUserAccess: IDL.Func([IDL.Text, UserRole], [], []),
    admin_updateUserAccess: IDL.Func([IDL.Text, UserRole], [], []),
    admin_getUserAccess: IDL.Func([], [IDL.Vec(UserAccessEntry)], ['query']),
  });
};

export const init = ({ IDL }) => { return []; };
