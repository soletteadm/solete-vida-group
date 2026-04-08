import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTypedActor } from "@/hooks/useTypedActor";
import { useLanguage } from "@/i18n/LanguageContext";
import {
  AlertTriangle,
  Ban,
  Loader2,
  Pencil,
  RefreshCw,
  Trash2,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { UserListEntry, UserRole } from "../backend.d";

// At runtime the actor accepts/returns Candid variants { admin: null }.
// These helpers bridge between the enum string type (TS) and Candid objects (runtime).
function roleToObj(roleStr: string): UserRole {
  if (roleStr === "admin") return "admin" as UserRole;
  if (roleStr === "user") return "user" as UserRole;
  return "guest" as UserRole;
}

// Convert either enum string or Candid variant to display string
function getRoleStr(role: UserRole | null | undefined): string {
  if (!role) return "guest";
  if (typeof role === "string") return role as string;
  const obj = role as Record<string, unknown>;
  if ("admin" in obj) return "admin";
  if ("user" in obj) return "user";
  return "guest";
}

// Get principal string — new field is userId, but may be principal at runtime
function getPrincipalStr(user: UserListEntry): string {
  // Handle both new (userId) and legacy runtime shape
  const u = user as UserListEntry & { principal?: { toString(): string } };
  if (u.principal) return u.principal.toString();
  return (user as unknown as { userId: string }).userId ?? "";
}

// Get profile name — new shape has profile?: UserProfile, old shape has Option<UserProfile>
function getProfileName(user: UserListEntry): string {
  const u = user as UserListEntry & { profile?: unknown };
  if (!u.profile) return "\u2014";
  // Option-style (runtime legacy): { __kind__: "Some", value: ... }
  const maybeOpt = u.profile as unknown as {
    __kind__?: string;
    value?: { name?: string };
  };
  if (maybeOpt.__kind__ === "Some") return maybeOpt.value?.name ?? "\u2014";
  if (maybeOpt.__kind__ === "None") return "\u2014";
  // Direct object style (new bindgen): UserProfile directly
  const p = u.profile as unknown as { name?: string };
  return p.name ?? "\u2014";
}

// Get profile fields for edit form
function getProfileFields(user: UserListEntry): {
  name: string;
  email: string;
  phone: string;
} {
  const u = user as UserListEntry & { profile?: unknown };
  if (!u.profile) return { name: "", email: "", phone: "" };
  const maybeOpt = u.profile as unknown as {
    __kind__?: string;
    value?: { name?: string; email?: string; phone?: string };
  };
  if (maybeOpt.__kind__ === "Some") {
    return {
      name: maybeOpt.value?.name ?? "",
      email: maybeOpt.value?.email ?? "",
      phone: maybeOpt.value?.phone ?? "",
    };
  }
  if (maybeOpt.__kind__ === "None") return { name: "", email: "", phone: "" };
  // Direct profile object
  const p = u.profile as unknown as {
    name?: string;
    email?: string;
    phone?: string;
  };
  return { name: p.name ?? "", email: p.email ?? "", phone: p.phone ?? "" };
}

function truncatePrincipal(p: string): string {
  if (p.length <= 20) return p;
  return `${p.slice(0, 10)}\u2026${p.slice(-8)}`;
}

export default function MyPagesAdmin() {
  const { t } = useLanguage();
  const { actor, isFetching } = useTypedActor();

  const [users, setUsers] = useState<UserListEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Remove confirm
  const [removeTarget, setRemoveTarget] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);

  // Block confirm
  const [blockTarget, setBlockTarget] = useState<string | null>(null);
  const [blocking, setBlocking] = useState(false);

  // Role update
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);

  // Edit user profile dialog
  const [editTarget, setEditTarget] = useState<UserListEntry | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editRole, setEditRole] = useState("guest");
  const [saving, setSaving] = useState(false);

  const fetchUsers = useCallback(async () => {
    if (!actor || isFetching) return;
    setLoading(true);
    console.log("[fetchUsers] Fetching users, actor available:", !!actor);
    try {
      const result = await actor.listUsers();
      console.log("[fetchUsers] listUsers result:", JSON.stringify(result));
      if ("ok" in result) {
        setUsers(result.ok);
        console.log("[fetchUsers] Users loaded:", result.ok.length);
      } else {
        console.error("[fetchUsers] listUsers returned err:", result.err);
        toast.error(result.err || t.common.error);
        setUsers([]);
      }
    } catch (err) {
      console.error("[fetchUsers] Unexpected error:", err);
      console.error("[fetchUsers] Error details:", {
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      });
      toast.error(t.common.error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [actor, isFetching, t.common.error]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Pre-fill edit form when editTarget changes
  useEffect(() => {
    if (!editTarget) return;
    const fields = getProfileFields(editTarget);
    setEditName(fields.name);
    setEditEmail(fields.email);
    setEditPhone(fields.phone);
    setEditRole(getRoleStr(editTarget.role));
  }, [editTarget]);

  const handleUpdateRole = async (principalText: string, newRole: string) => {
    if (!actor) return;
    setUpdatingRole(principalText);
    try {
      const result = await actor.updateUserRole(
        principalText,
        roleToObj(newRole),
      );
      if ("ok" in result) {
        toast.success(t.admin.roleUpdated);
        setUsers((prev) =>
          prev.map((u) =>
            getPrincipalStr(u) === principalText
              ? { ...u, role: roleToObj(newRole) }
              : u,
          ),
        );
      } else {
        toast.error(result.err);
      }
    } catch {
      toast.error(t.admin.roleUpdateError);
    } finally {
      setUpdatingRole(null);
    }
  };

  const handleRemoveConfirm = async () => {
    if (!actor || !removeTarget) return;
    setRemoving(true);
    try {
      const result = await actor.removeUser(removeTarget);
      if ("ok" in result) {
        toast.success(t.admin.userRemoved);
        setUsers((prev) =>
          prev.filter((u) => getPrincipalStr(u) !== removeTarget),
        );
      } else {
        toast.error(result.err);
      }
    } catch {
      toast.error(t.admin.userRemoveError);
    } finally {
      setRemoving(false);
      setRemoveTarget(null);
    }
  };

  const handleBlockConfirm = async () => {
    if (!actor || !blockTarget) return;
    setBlocking(true);
    try {
      const result = await actor.blockUser(blockTarget);
      if ("ok" in result) {
        toast.success(t.admin.userBlocked);
        setUsers((prev) =>
          prev.map((u) =>
            getPrincipalStr(u) === blockTarget
              ? { ...u, role: roleToObj("guest") }
              : u,
          ),
        );
      } else {
        toast.error(result.err);
      }
    } catch {
      toast.error(t.admin.userBlockError);
    } finally {
      setBlocking(false);
      setBlockTarget(null);
    }
  };

  const handleSaveEdit = async () => {
    if (!actor || !editTarget) return;
    setSaving(true);
    const principalStr = getPrincipalStr(editTarget);
    const originalRole = getRoleStr(editTarget.role);

    console.log("[handleSaveEdit] Starting save for principal:", principalStr);
    console.log("[handleSaveEdit] Payload:", {
      name: editName,
      email: editEmail,
      phone: editPhone,
      role: editRole,
      originalRole,
    });
    console.log("[handleSaveEdit] actor available:", !!actor);
    console.log(
      "[handleSaveEdit] actor.updateUserProfile available:",
      typeof (actor as any).updateUserProfile,
    );

    try {
      console.log("[handleSaveEdit] Calling updateUserProfile...");
      const profileResult = await actor.updateUserProfile(
        principalStr,
        editName,
        editEmail,
        editPhone,
      );
      console.log(
        "[handleSaveEdit] updateUserProfile result:",
        JSON.stringify(profileResult),
      );

      if ("err" in profileResult) {
        console.error(
          "[handleSaveEdit] Profile update failed with err:",
          profileResult.err,
        );
        toast.error(`Failed to update profile: ${profileResult.err}`, {
          description: `Principal: ${principalStr}`,
        });
        setSaving(false);
        return;
      }

      if (editRole !== originalRole) {
        console.log(
          "[handleSaveEdit] Role changed from",
          originalRole,
          "to",
          editRole,
          "- calling updateUserRole...",
        );
        const roleResult = await actor.updateUserRole(
          principalStr,
          roleToObj(editRole),
        );
        console.log(
          "[handleSaveEdit] updateUserRole result:",
          JSON.stringify(roleResult),
        );
        if ("err" in roleResult) {
          console.error(
            "[handleSaveEdit] Role update failed with err:",
            roleResult.err,
          );
          toast.error(`Failed to update role: ${roleResult.err}`, {
            description: `Principal: ${principalStr}`,
          });
          setSaving(false);
          return;
        }
      }

      console.log("[handleSaveEdit] Save successful");
      toast.success(t.admin.profileUpdated);
      setEditTarget(null);
      await fetchUsers();
    } catch (err) {
      console.error("[handleSaveEdit] Unexpected error:", err);
      console.error("[handleSaveEdit] Error details:", {
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
        raw: err,
      });
      toast.error(
        `Failed to update profile: ${err instanceof Error ? err.message : String(err)}`,
        {
          description: `Principal: ${principalStr}`,
        },
      );
    } finally {
      setSaving(false);
    }
  };

  const getRoleBadgeClass = (roleStr: string) => {
    if (roleStr === "admin") return "border-gold text-gold";
    if (roleStr === "user") return "border-blue-400 text-blue-600";
    return "border-amber-400 text-amber-600";
  };

  return (
    <div className="space-y-6" data-ocid="admin.section">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gold/15 flex items-center justify-center">
            <Users className="w-5 h-5 text-gold" />
          </div>
          <h2 className="font-serif text-xl text-foreground">
            {t.admin.title}
          </h2>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchUsers}
          disabled={loading || isFetching}
          className="font-sans text-sm"
          data-ocid="admin.button"
        >
          <RefreshCw
            className={`w-4 h-4 mr-1.5 ${loading ? "animate-spin" : ""}`}
          />
          {t.common.retry}
        </Button>
      </div>

      {/* Users Table */}
      <Card className="border border-divider shadow-card">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3" data-ocid="admin.loading_state">
              {Array.from({ length: 3 }).map((_, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton list
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : users.length === 0 ? (
            <div
              className="p-10 text-center space-y-2"
              data-ocid="admin.empty_state"
            >
              <Users className="w-10 h-10 text-muted-foreground mx-auto" />
              <p className="font-sans text-sm text-muted-foreground">
                {t.admin.noUsers}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table data-ocid="admin.table">
                <TableHeader>
                  <TableRow className="border-divider">
                    <TableHead className="font-sans text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {t.admin.principal}
                    </TableHead>
                    <TableHead className="font-sans text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {t.admin.name}
                    </TableHead>
                    <TableHead className="font-sans text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {t.admin.role}
                    </TableHead>
                    <TableHead className="font-sans text-xs font-semibold text-muted-foreground uppercase tracking-wide text-right">
                      {t.admin.actions}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user, idx) => {
                    const principalStr = getPrincipalStr(user);
                    const roleStr = getRoleStr(user.role);
                    const profileName = getProfileName(user);
                    const isUpdating = updatingRole === principalStr;
                    const isBlocked = roleStr === "guest";

                    return (
                      <TableRow
                        key={principalStr}
                        className="border-divider hover:bg-beige/50"
                        data-ocid={`admin.row.${idx + 1}`}
                      >
                        <TableCell className="font-mono text-xs text-muted-foreground max-w-[180px]">
                          <span title={principalStr}>
                            {truncatePrincipal(principalStr)}
                          </span>
                        </TableCell>
                        <TableCell className="font-sans text-sm text-foreground">
                          {profileName || "\u2014"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className={`text-xs capitalize font-sans ${getRoleBadgeClass(roleStr)}`}
                            >
                              {t.common[roleStr as keyof typeof t.common] ||
                                roleStr}
                            </Badge>
                            <Select
                              value={roleStr}
                              onValueChange={(v) =>
                                handleUpdateRole(principalStr, v)
                              }
                              disabled={isUpdating}
                            >
                              <SelectTrigger
                                className="h-7 w-24 font-sans text-xs"
                                data-ocid={`admin.select.${idx + 1}`}
                              >
                                {isUpdating ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <SelectValue />
                                )}
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="admin">
                                  {t.common.admin}
                                </SelectItem>
                                <SelectItem value="user">
                                  {t.common.user}
                                </SelectItem>
                                <SelectItem value="guest">
                                  {t.common.guest}
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditTarget(user)}
                              className="text-muted-foreground hover:text-foreground hover:bg-muted font-sans text-xs"
                              data-ocid={`admin.edit_button.${idx + 1}`}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setBlockTarget(principalStr)}
                              disabled={isBlocked}
                              className="text-amber-600 hover:text-amber-600 hover:bg-amber-50 font-sans text-xs"
                              data-ocid={`admin.secondary_button.${idx + 1}`}
                            >
                              <Ban className="w-3.5 h-3.5 mr-1" />
                              {t.admin.blockUser}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setRemoveTarget(principalStr)}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10 font-sans text-xs"
                              data-ocid={`admin.delete_button.${idx + 1}`}
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-1" />
                              {t.admin.removeUser}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit User Profile Dialog */}
      <Dialog
        open={!!editTarget}
        onOpenChange={(open) => !open && setEditTarget(null)}
      >
        <DialogContent
          className="sm:max-w-md font-sans"
          data-ocid="admin.dialog"
        >
          <DialogHeader>
            <DialogTitle className="font-serif text-foreground flex items-center gap-2">
              <Pencil className="w-4 h-4 text-gold" />
              {t.admin.editUserProfile}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Principal (read-only) */}
            <div className="space-y-1.5">
              <Label className="font-sans text-xs font-medium text-muted-foreground">
                {t.admin.principal}
              </Label>
              <p className="font-mono text-xs text-muted-foreground bg-muted/40 rounded px-3 py-2 break-all">
                {editTarget ? getPrincipalStr(editTarget) : ""}
              </p>
            </div>

            {/* Name */}
            <div className="space-y-1.5">
              <Label
                htmlFor="edit-name"
                className="font-sans text-xs font-medium text-muted-foreground"
              >
                {t.admin.name}
              </Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="font-sans text-sm"
                data-ocid="admin.input"
              />
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label
                htmlFor="edit-email"
                className="font-sans text-xs font-medium text-muted-foreground"
              >
                {t.admin.email}
              </Label>
              <Input
                id="edit-email"
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className="font-sans text-sm"
                data-ocid="admin.input"
              />
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <Label
                htmlFor="edit-phone"
                className="font-sans text-xs font-medium text-muted-foreground"
              >
                {t.admin.phone}
              </Label>
              <Input
                id="edit-phone"
                type="tel"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                className="font-sans text-sm"
                data-ocid="admin.input"
              />
            </div>

            {/* Role */}
            <div className="space-y-1.5">
              <Label className="font-sans text-xs font-medium text-muted-foreground">
                {t.admin.role}
              </Label>
              <Select value={editRole} onValueChange={setEditRole}>
                <SelectTrigger
                  className="font-sans text-sm"
                  data-ocid="admin.select"
                >
                  <SelectValue placeholder={t.admin.selectRole} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">{t.common.admin}</SelectItem>
                  <SelectItem value="user">{t.common.user}</SelectItem>
                  <SelectItem value="guest">{t.common.guest}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setEditTarget(null)}
              className="font-sans"
              data-ocid="admin.cancel_button"
            >
              {t.admin.cancel}
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={saving}
              className="bg-gold hover:bg-gold/90 text-black font-sans rounded-full"
              data-ocid="admin.save_button"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  {t.myPages.saving}
                </>
              ) : (
                t.myPages.save
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Block User Dialog */}
      <AlertDialog
        open={!!blockTarget}
        onOpenChange={(open) => !open && setBlockTarget(null)}
      >
        <AlertDialogContent data-ocid="admin.dialog">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif text-foreground flex items-center gap-2">
              <Ban className="w-5 h-5 text-amber-600" />
              {t.admin.confirmBlock}
            </AlertDialogTitle>
            <AlertDialogDescription className="font-sans text-sm text-muted-foreground">
              {t.admin.confirmBlockMsg}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="font-sans"
              data-ocid="admin.cancel_button"
            >
              {t.admin.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBlockConfirm}
              disabled={blocking}
              className="bg-amber-600 hover:bg-amber-700 text-white font-sans"
              data-ocid="admin.confirm_button"
            >
              {blocking ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  {t.admin.blocking}
                </>
              ) : (
                t.admin.confirmBlock
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove User Dialog */}
      <AlertDialog
        open={!!removeTarget}
        onOpenChange={(open) => !open && setRemoveTarget(null)}
      >
        <AlertDialogContent data-ocid="admin.dialog">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif text-foreground flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              {t.admin.confirmRemove}
            </AlertDialogTitle>
            <AlertDialogDescription className="font-sans text-sm text-muted-foreground">
              {t.admin.confirmRemoveMsg}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="font-sans"
              data-ocid="admin.cancel_button"
            >
              {t.admin.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveConfirm}
              disabled={removing}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-sans"
              data-ocid="admin.confirm_button"
            >
              {removing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  {t.admin.removing}
                </>
              ) : (
                t.admin.confirm
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
