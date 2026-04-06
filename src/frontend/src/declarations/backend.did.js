/* eslint-disable */

// @ts-nocheck

import { IDL } from '@icp-sdk/core/candid';

const UserRole = IDL.Variant({
  admin: IDL.Null,
  user: IDL.Null,
  guest: IDL.Null,
});

const Holiday = IDL.Variant({
  none: IDL.Null,
  easter: IDL.Null,
  christmas: IDL.Null,
  newyear: IDL.Null,
  midsommar: IDL.Null,
});

const ContactStatus = IDL.Variant({
  active: IDL.Null,
  notactive: IDL.Null,
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

const ContactMessage = IDL.Record({
  id: IDL.Text,
  name: IDL.Text,
  email: IDL.Text,
  message: IDL.Text,
  submittedAt: IDL.Int,
  status: ContactStatus,
  senderPrincipal: IDL.Opt(IDL.Text),
  deviceId: IDL.Opt(IDL.Text),
  senderBlocked: IDL.Bool,
});

const CallResult = IDL.Variant({
  ok: IDL.Null,
  err: IDL.Text,
});

const SubmitContactResult = IDL.Variant({
  ok: IDL.Text,
  err: IDL.Text,
});

const ListUsersResult = IDL.Variant({
  ok: IDL.Vec(UserListEntry),
  err: IDL.Text,
});

const ListContactResult = IDL.Variant({
  ok: IDL.Vec(ContactMessage),
  err: IDL.Text,
});

const ListBlockedResult = IDL.Variant({
  ok: IDL.Vec(IDL.Text),
  err: IDL.Text,
});

export const idlService = IDL.Service({
  getMyRole: IDL.Func([], [UserRole], ['query']),
  getMyProfile: IDL.Func([], [IDL.Opt(UserProfile)], ['query']),
  updateMyProfile: IDL.Func([IDL.Text, IDL.Text, IDL.Text], [CallResult], []),
  listUsers: IDL.Func([], [ListUsersResult], []),
  addUser: IDL.Func([IDL.Text, UserRole], [CallResult], []),
  updateUserRole: IDL.Func([IDL.Text, UserRole], [CallResult], []),
  removeUser: IDL.Func([IDL.Text], [CallResult], []),
  blockUser: IDL.Func([IDL.Text], [CallResult], []),
  updateUserProfile: IDL.Func([IDL.Text, IDL.Text, IDL.Text, IDL.Text], [CallResult], []),
  getActiveHoliday: IDL.Func([], [Holiday], ['query']),
  setActiveHoliday: IDL.Func([Holiday], [CallResult], []),
  submitContact: IDL.Func([IDL.Text, IDL.Text, IDL.Text], [SubmitContactResult], []),
  listContactMessages: IDL.Func([], [ListContactResult], []),
  updateContactStatus: IDL.Func([IDL.Text, ContactStatus], [CallResult], []),
  deleteContactMessage: IDL.Func([IDL.Text], [CallResult], []),
  deleteContactMessages: IDL.Func([IDL.Vec(IDL.Text)], [CallResult], []),
  blockContactSender: IDL.Func([IDL.Text], [CallResult], []),
  unblockContactSender: IDL.Func([IDL.Text], [CallResult], []),
  getBlockedSenders: IDL.Func([], [ListBlockedResult], []),
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

  const Holiday = IDL.Variant({
    none: IDL.Null,
    easter: IDL.Null,
    christmas: IDL.Null,
    newyear: IDL.Null,
    midsommar: IDL.Null,
  });

  const ContactStatus = IDL.Variant({
    active: IDL.Null,
    notactive: IDL.Null,
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

  const ContactMessage = IDL.Record({
    id: IDL.Text,
    name: IDL.Text,
    email: IDL.Text,
    message: IDL.Text,
    submittedAt: IDL.Int,
    status: ContactStatus,
    senderPrincipal: IDL.Opt(IDL.Text),
    deviceId: IDL.Opt(IDL.Text),
    senderBlocked: IDL.Bool,
  });

  const CallResult = IDL.Variant({
    ok: IDL.Null,
    err: IDL.Text,
  });

  const SubmitContactResult = IDL.Variant({
    ok: IDL.Text,
    err: IDL.Text,
  });

  const ListUsersResult = IDL.Variant({
    ok: IDL.Vec(UserListEntry),
    err: IDL.Text,
  });

  const ListContactResult = IDL.Variant({
    ok: IDL.Vec(ContactMessage),
    err: IDL.Text,
  });

  const ListBlockedResult = IDL.Variant({
    ok: IDL.Vec(IDL.Text),
    err: IDL.Text,
  });

  return IDL.Service({
    getMyRole: IDL.Func([], [UserRole], ['query']),
    getMyProfile: IDL.Func([], [IDL.Opt(UserProfile)], ['query']),
    updateMyProfile: IDL.Func([IDL.Text, IDL.Text, IDL.Text], [CallResult], []),
    listUsers: IDL.Func([], [ListUsersResult], []),
    addUser: IDL.Func([IDL.Text, UserRole], [CallResult], []),
    updateUserRole: IDL.Func([IDL.Text, UserRole], [CallResult], []),
    removeUser: IDL.Func([IDL.Text], [CallResult], []),
    blockUser: IDL.Func([IDL.Text], [CallResult], []),
    updateUserProfile: IDL.Func([IDL.Text, IDL.Text, IDL.Text, IDL.Text], [CallResult], []),
    getActiveHoliday: IDL.Func([], [Holiday], ['query']),
    setActiveHoliday: IDL.Func([Holiday], [CallResult], []),
    submitContact: IDL.Func([IDL.Text, IDL.Text, IDL.Text], [SubmitContactResult], []),
    listContactMessages: IDL.Func([], [ListContactResult], []),
    updateContactStatus: IDL.Func([IDL.Text, ContactStatus], [CallResult], []),
    deleteContactMessage: IDL.Func([IDL.Text], [CallResult], []),
    deleteContactMessages: IDL.Func([IDL.Vec(IDL.Text)], [CallResult], []),
    blockContactSender: IDL.Func([IDL.Text], [CallResult], []),
    unblockContactSender: IDL.Func([IDL.Text], [CallResult], []),
    getBlockedSenders: IDL.Func([], [ListBlockedResult], []),
    admin_addUserAccess: IDL.Func([IDL.Text, UserRole], [], []),
    admin_updateUserAccess: IDL.Func([IDL.Text, UserRole], [], []),
    admin_getUserAccess: IDL.Func([], [IDL.Vec(UserAccessEntry)], ['query']),
  });
};

export const init = ({ IDL }) => { return []; };
