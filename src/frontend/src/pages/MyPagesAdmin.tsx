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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Plus,
  RefreshCw,
  Trash2,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { UserListEntry, UserRole } from "../backend.d";

function roleToObj(roleStr: string): UserRole {
  if (roleStr === "admin") return { admin: null };
  if (roleStr === "user") return { user: null };
  return { guest: null };
}

function objToRoleStr(role: UserRole): string {
  if ("admin" in role) return "admin";
  if ("user" in role) return "user";
  return "guest";
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

  // Add user form
  const [addPrincipal, setAddPrincipal] = useState("");
  const [addRole, setAddRole] = useState<string>("user");
  const [adding, setAdding] = useState(false);

  // Remove confirm
  const [removeTarget, setRemoveTarget] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);

  // Block confirm
  const [blockTarget, setBlockTarget] = useState<string | null>(null);
  const [blocking, setBlocking] = useState(false);

  // Role update
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    if (!actor || isFetching) return;
    setLoading(true);
    try {
      const list = await actor.listUsers();
      setUsers(list);
    } catch {
      toast.error(t.common.error);
    } finally {
      setLoading(false);
    }
  }, [actor, isFetching, t.common.error]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleAddUser = async () => {
    if (!actor || !addPrincipal.trim()) return;
    setAdding(true);
    try {
      const result = await actor.addUser(
        addPrincipal.trim(),
        roleToObj(addRole),
      );
      if ("ok" in result) {
        toast.success(t.admin.userAdded);
        setAddPrincipal("");
        setAddRole("user");
        await fetchUsers();
      } else {
        toast.error(result.err);
      }
    } catch {
      toast.error(t.admin.userAddError);
    } finally {
      setAdding(false);
    }
  };

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
            u.principal.toString() === principalText
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
          prev.filter((u) => u.principal.toString() !== removeTarget),
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
            u.principal.toString() === blockTarget
              ? { ...u, role: { guest: null } }
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

  const getRoleBadgeClass = (roleStr: string) => {
    if (roleStr === "admin") return "border-coral text-coral";
    if (roleStr === "user") return "border-blue-400 text-blue-600";
    return "border-amber-400 text-amber-600";
  };

  return (
    <div className="space-y-6" data-ocid="admin.section">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-coral/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-coral" />
          </div>
          <h2 className="font-serif text-xl text-navy">{t.admin.title}</h2>
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

      {/* Add User Form */}
      <Card className="border border-divider shadow-card">
        <CardHeader className="pb-3">
          <CardTitle className="font-serif text-base text-navy flex items-center gap-2">
            <Plus className="w-4 h-4 text-coral" />
            {t.admin.addUser}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 space-y-1.5">
              <Label
                htmlFor="add-principal"
                className="font-sans text-xs font-medium text-muted-foreground"
              >
                {t.admin.principal}
              </Label>
              <Input
                id="add-principal"
                value={addPrincipal}
                onChange={(e) => setAddPrincipal(e.target.value)}
                placeholder={t.admin.enterPrincipal}
                className="font-sans text-sm font-mono"
                data-ocid="admin.input"
              />
            </div>
            <div className="sm:w-40 space-y-1.5">
              <Label className="font-sans text-xs font-medium text-muted-foreground">
                {t.admin.role}
              </Label>
              <Select value={addRole} onValueChange={setAddRole}>
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
            <div className="sm:self-end">
              <Button
                onClick={handleAddUser}
                disabled={adding || !addPrincipal.trim()}
                className="w-full sm:w-auto bg-coral hover:bg-coral/90 text-white font-sans rounded-full"
                data-ocid="admin.primary_button"
              >
                {adding ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                    {t.admin.adding}
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-1.5" />
                    {t.admin.addUserBtn}
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

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
                    const principalStr = user.principal.toString();
                    const roleStr = objToRoleStr(user.role);
                    const profileName =
                      user.profile.__kind__ === "Some"
                        ? user.profile.value.name
                        : "\u2014";
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

      {/* Block User Dialog */}
      <AlertDialog
        open={!!blockTarget}
        onOpenChange={(open) => !open && setBlockTarget(null)}
      >
        <AlertDialogContent data-ocid="admin.dialog">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif text-navy flex items-center gap-2">
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
            <AlertDialogTitle className="font-serif text-navy flex items-center gap-2">
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
