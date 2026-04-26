import type { ContactMessage, ContactStatus } from "@/backend.d";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTypedActor } from "@/hooks/useTypedActor";
import { useLanguage } from "@/i18n/LanguageContext";
import {
  Ban,
  CheckCircle2,
  Eye,
  Loader2,
  MoreHorizontal,
  RefreshCw,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

function formatDate(nanos: bigint): string {
  return new Date(Number(nanos / BigInt(1_000_000))).toLocaleString();
}

function isActive(status: ContactStatus): boolean {
  // Handle both enum string and Candid variant at runtime
  if (typeof status === "string") return (status as string) === "active";
  return "active" in (status as object);
}

function getContactStatusToggled(status: ContactStatus): ContactStatus {
  // Returns toggled status — works with enum string
  if (isActive(status)) return "notactive" as ContactStatus;
  return "active" as ContactStatus;
}

function getOptionValue(
  opt:
    | string
    | { __kind__: "Some"; value: string }
    | { __kind__: "None" }
    | undefined
    | null,
): string | null {
  if (opt === undefined || opt === null) return null;
  if (typeof opt === "string") return opt;
  const o = opt as { __kind__: string; value?: string };
  if (o.__kind__ === "Some") return o.value ?? null;
  return null;
}

export default function MyPagesContacts() {
  const { t } = useLanguage();
  const { actor, isFetching } = useTypedActor();

  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Dialog state
  const [detailMsg, setDetailMsg] = useState<ContactMessage | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ContactMessage | null>(
    null,
  );
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [confirmBlock, setConfirmBlock] = useState<{
    msg: ContactMessage;
    block: boolean;
  } | null>(null);

  // Action loading
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchMessages = useCallback(async () => {
    if (!actor || isFetching) return;
    setLoading(true);
    try {
      const result = await actor.listContactMessages();
      if ("ok" in result) {
        const sorted = [...result.ok].sort((a, b) =>
          Number(b.submittedAt - a.submittedAt),
        );
        setMessages(sorted);
      } else {
        toast.error(result.err);
      }
    } catch (err: any) {
      toast.error(err?.message ?? String(err));
    } finally {
      setLoading(false);
    }
  }, [actor, isFetching]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Selection helpers
  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === messages.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(messages.map((m) => m.id)));
    }
  };

  // Actions
  const handleStatusToggle = async (msg: ContactMessage) => {
    if (!actor) return;
    setActionLoading(`${msg.id}:status`);
    const newStatus: ContactStatus = getContactStatusToggled(msg.status);
    try {
      const result = await actor.updateContactStatus(msg.id, newStatus);
      if ("ok" in result) {
        toast.success(t.adminContacts.statusUpdated);
        setMessages((prev) =>
          prev.map((m) => (m.id === msg.id ? { ...m, status: newStatus } : m)),
        );
        if (detailMsg?.id === msg.id) {
          setDetailMsg((d) => (d ? { ...d, status: newStatus } : d));
        }
      } else {
        toast.error(`${t.adminContacts.statusUpdateError}: ${result.err}`);
      }
    } catch (_err: any) {
      toast.error(t.adminContacts.statusUpdateError);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (msg: ContactMessage) => {
    if (!actor) return;
    setActionLoading(`${msg.id}:delete`);
    try {
      const result = await actor.deleteContactMessage(msg.id);
      if ("ok" in result) {
        toast.success(t.adminContacts.deleted);
        setMessages((prev) => prev.filter((m) => m.id !== msg.id));
        setSelected((prev) => {
          const next = new Set(prev);
          next.delete(msg.id);
          return next;
        });
        if (detailMsg?.id === msg.id) setDetailMsg(null);
      } else {
        toast.error(`${t.adminContacts.deleteError}: ${result.err}`);
      }
    } catch (_err: any) {
      toast.error(t.adminContacts.deleteError);
    } finally {
      setActionLoading(null);
      setConfirmDelete(null);
    }
  };

  const handleBulkDelete = async () => {
    if (!actor || selected.size === 0) return;
    setActionLoading("bulk:delete");
    try {
      const ids = Array.from(selected);
      const result = await actor.deleteContactMessages(ids);
      if ("ok" in result) {
        toast.success(t.adminContacts.deleted);
        setMessages((prev) => prev.filter((m) => !selected.has(m.id)));
        setSelected(new Set());
        if (detailMsg && selected.has(detailMsg.id)) setDetailMsg(null);
      } else {
        toast.error(`${t.adminContacts.deleteError}: ${result.err}`);
      }
    } catch (_err: any) {
      toast.error(t.adminContacts.deleteError);
    } finally {
      setActionLoading(null);
      setConfirmBulkDelete(false);
    }
  };

  const handleBlockToggle = async (msg: ContactMessage, block: boolean) => {
    if (!actor) return;
    const principal = getOptionValue(msg.senderPrincipal as string | undefined);
    if (!principal) return;
    setActionLoading(`${msg.id}:block`);
    try {
      const result = block
        ? await actor.blockContactSender(principal)
        : await actor.unblockContactSender(principal);
      if ("ok" in result) {
        const successMsg = block
          ? t.adminContacts.blockedSender
          : t.adminContacts.unblockedSender;
        toast.success(successMsg);
        const updated = { ...msg, senderBlocked: block };
        setMessages((prev) => prev.map((m) => (m.id === msg.id ? updated : m)));
        if (detailMsg?.id === msg.id) setDetailMsg(updated);
      } else {
        const errorMsg = block
          ? t.adminContacts.blockError
          : t.adminContacts.unblockError;
        toast.error(`${errorMsg}: ${result.err}`);
      }
    } catch (_err: any) {
      toast.error(
        block ? t.adminContacts.blockError : t.adminContacts.unblockError,
      );
    } finally {
      setActionLoading(null);
      setConfirmBlock(null);
    }
  };

  const hasPrincipal = (msg: ContactMessage) =>
    getOptionValue(msg.senderPrincipal as string | undefined) !== null;

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-serif text-xl font-semibold text-foreground">
              {t.adminContacts.title}
            </h2>
            <p className="font-sans text-sm text-muted-foreground mt-0.5">
              {t.adminContacts.subtitle}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchMessages}
            disabled={loading}
            className="shrink-0"
            data-ocid="contacts.refresh.button"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span className="ml-1.5 hidden sm:inline">
              {t.adminContacts.refresh}
            </span>
          </Button>
        </div>

        {/* Bulk actions */}
        {selected.size > 0 && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
            <span className="font-sans text-sm text-amber-800 font-medium">
              {selected.size} selected
            </span>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setConfirmBulkDelete(true)}
              disabled={actionLoading === "bulk:delete"}
              data-ocid="contacts.delete_button"
            >
              {actionLoading === "bulk:delete" ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              )}
              {t.adminContacts.deleteSelected.replace(
                "{n}",
                String(selected.size),
              )}
            </Button>
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="space-y-3" data-ocid="contacts.loading_state">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div
            className="text-center py-16 text-muted-foreground font-sans text-sm"
            data-ocid="contacts.empty_state"
          >
            {t.adminContacts.noMessages}
          </div>
        ) : (
          <>
            {/* ── Mobile card layout (below md) ── */}
            <ul className="divide-y divide-border md:hidden rounded-lg border border-border overflow-hidden">
              {messages.map((msg, idx) => (
                <li
                  key={msg.id}
                  className={`p-4 space-y-2.5 hover:bg-muted/20 transition-colors ${selected.has(msg.id) ? "bg-muted/30" : ""}`}
                  data-ocid={`contacts.item.${idx + 1}`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    {/* Checkbox with large touch target */}
                    <div className="min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0 -ml-1">
                      <Checkbox
                        checked={selected.has(msg.id)}
                        onCheckedChange={() => toggleSelect(msg.id)}
                        data-ocid={`contacts.checkbox.${idx + 1}`}
                        aria-label={`Select message from ${msg.name}`}
                      />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {msg.senderBlocked && (
                          <Ban className="h-3.5 w-3.5 text-destructive shrink-0" />
                        )}
                        <span className="font-sans text-sm font-semibold text-foreground truncate">
                          {msg.name}
                        </span>
                      </div>
                      <p className="font-sans text-xs text-muted-foreground truncate">
                        {msg.email}
                      </p>
                      <p className="font-sans text-xs text-muted-foreground line-clamp-2">
                        {msg.message}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-sans text-xs text-muted-foreground">
                          {formatDate(msg.submittedAt)}
                        </span>
                        <Badge
                          variant={
                            isActive(msg.status) ? "default" : "secondary"
                          }
                          className={
                            isActive(msg.status)
                              ? "bg-gold/20 text-amber-800 border-gold/40 font-sans text-xs"
                              : "font-sans text-xs"
                          }
                        >
                          {isActive(msg.status)
                            ? t.adminContacts.active
                            : t.adminContacts.notactive}
                        </Badge>
                      </div>
                    </div>
                    {/* Actions dropdown */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="min-w-[44px] min-h-[44px] shrink-0"
                          data-ocid={`contacts.dropdown_menu.${idx + 1}`}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => setDetailMsg(msg)}
                          data-ocid={`contacts.open_modal_button.${idx + 1}`}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          {t.adminContacts.viewDetails}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleStatusToggle(msg)}
                          disabled={actionLoading === `${msg.id}:status`}
                          data-ocid={`contacts.toggle.${idx + 1}`}
                        >
                          {actionLoading === `${msg.id}:status` ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : isActive(msg.status) ? (
                            <ToggleLeft className="mr-2 h-4 w-4" />
                          ) : (
                            <ToggleRight className="mr-2 h-4 w-4" />
                          )}
                          {isActive(msg.status)
                            ? t.adminContacts.setNotactive
                            : t.adminContacts.setActive}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {hasPrincipal(msg) && (
                          <DropdownMenuItem
                            onClick={() =>
                              setConfirmBlock({
                                msg,
                                block: !msg.senderBlocked,
                              })
                            }
                            className={
                              msg.senderBlocked
                                ? "text-green-700"
                                : "text-orange-700"
                            }
                            data-ocid={`contacts.toggle.${idx + 1}`}
                          >
                            {msg.senderBlocked ? (
                              <ShieldCheck className="mr-2 h-4 w-4" />
                            ) : (
                              <Ban className="mr-2 h-4 w-4" />
                            )}
                            {msg.senderBlocked
                              ? t.adminContacts.unblock
                              : t.adminContacts.block}
                          </DropdownMenuItem>
                        )}
                        {hasPrincipal(msg) && <DropdownMenuSeparator />}
                        <DropdownMenuItem
                          onClick={() => setConfirmDelete(msg)}
                          className="text-destructive focus:text-destructive"
                          data-ocid={`contacts.delete_button.${idx + 1}`}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {t.adminContacts.delete}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </li>
              ))}
            </ul>

            {/* ── Desktop table layout (md and above) ── */}
            <div className="hidden md:block rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="w-10 pl-4">
                      <Checkbox
                        checked={
                          selected.size === messages.length &&
                          messages.length > 0
                        }
                        onCheckedChange={toggleSelectAll}
                        aria-label={t.adminContacts.selectAll}
                        data-ocid="contacts.checkbox"
                      />
                    </TableHead>
                    <TableHead className="font-sans text-xs uppercase tracking-wide">
                      {t.adminContacts.name}
                    </TableHead>
                    <TableHead className="font-sans text-xs uppercase tracking-wide hidden md:table-cell">
                      {t.adminContacts.email}
                    </TableHead>
                    <TableHead className="font-sans text-xs uppercase tracking-wide hidden lg:table-cell">
                      {t.adminContacts.message}
                    </TableHead>
                    <TableHead className="font-sans text-xs uppercase tracking-wide">
                      {t.adminContacts.status}
                    </TableHead>
                    <TableHead className="font-sans text-xs uppercase tracking-wide hidden sm:table-cell">
                      {t.adminContacts.submitted}
                    </TableHead>
                    <TableHead className="text-right font-sans text-xs uppercase tracking-wide">
                      {t.adminContacts.actions}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {messages.map((msg, idx) => (
                    <TableRow
                      key={msg.id}
                      className={
                        selected.has(msg.id) ? "bg-muted/30" : undefined
                      }
                      data-ocid={`contacts.item.${idx + 1}`}
                    >
                      <TableCell className="pl-4">
                        <Checkbox
                          checked={selected.has(msg.id)}
                          onCheckedChange={() => toggleSelect(msg.id)}
                          data-ocid={`contacts.checkbox.${idx + 1}`}
                        />
                      </TableCell>
                      <TableCell className="font-sans text-sm font-medium">
                        <div className="flex items-center gap-1.5">
                          {msg.senderBlocked && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Ban className="h-3.5 w-3.5 text-destructive shrink-0" />
                              </TooltipTrigger>
                              <TooltipContent>
                                {t.adminContacts.senderBlocked}
                              </TooltipContent>
                            </Tooltip>
                          )}
                          {msg.name}
                        </div>
                      </TableCell>
                      <TableCell className="font-sans text-sm text-muted-foreground hidden md:table-cell">
                        {msg.email}
                      </TableCell>
                      <TableCell className="font-sans text-sm text-muted-foreground hidden lg:table-cell max-w-[220px]">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="block truncate cursor-default">
                              {msg.message}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs whitespace-pre-wrap">
                            {msg.message}
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            isActive(msg.status) ? "default" : "secondary"
                          }
                          className={
                            isActive(msg.status)
                              ? "bg-gold/20 text-amber-800 border-gold/40 font-sans text-xs"
                              : "font-sans text-xs"
                          }
                        >
                          {isActive(msg.status)
                            ? t.adminContacts.active
                            : t.adminContacts.notactive}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-sans text-xs text-muted-foreground hidden sm:table-cell whitespace-nowrap">
                        {formatDate(msg.submittedAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              data-ocid={`contacts.dropdown_menu.${idx + 1}`}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => setDetailMsg(msg)}
                              data-ocid={`contacts.open_modal_button.${idx + 1}`}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              {t.adminContacts.viewDetails}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleStatusToggle(msg)}
                              disabled={actionLoading === `${msg.id}:status`}
                              data-ocid={`contacts.toggle.${idx + 1}`}
                            >
                              {actionLoading === `${msg.id}:status` ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : isActive(msg.status) ? (
                                <ToggleLeft className="mr-2 h-4 w-4" />
                              ) : (
                                <ToggleRight className="mr-2 h-4 w-4" />
                              )}
                              {isActive(msg.status)
                                ? t.adminContacts.setNotactive
                                : t.adminContacts.setActive}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {hasPrincipal(msg) && (
                              <DropdownMenuItem
                                onClick={() =>
                                  setConfirmBlock({
                                    msg,
                                    block: !msg.senderBlocked,
                                  })
                                }
                                className={
                                  msg.senderBlocked
                                    ? "text-green-700"
                                    : "text-orange-700"
                                }
                                data-ocid={`contacts.toggle.${idx + 1}`}
                              >
                                {msg.senderBlocked ? (
                                  <ShieldCheck className="mr-2 h-4 w-4" />
                                ) : (
                                  <Ban className="mr-2 h-4 w-4" />
                                )}
                                {msg.senderBlocked
                                  ? t.adminContacts.unblock
                                  : t.adminContacts.block}
                              </DropdownMenuItem>
                            )}
                            {hasPrincipal(msg) && <DropdownMenuSeparator />}
                            <DropdownMenuItem
                              onClick={() => setConfirmDelete(msg)}
                              className="text-destructive focus:text-destructive"
                              data-ocid={`contacts.delete_button.${idx + 1}`}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              {t.adminContacts.delete}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}

        {/* ---- Detail Dialog ---- */}
        <Dialog
          open={!!detailMsg}
          onOpenChange={(open) => !open && setDetailMsg(null)}
        >
          <DialogContent className="max-w-lg" data-ocid="contacts.dialog">
            <DialogHeader>
              <DialogTitle className="font-serif">
                {detailMsg?.name}
              </DialogTitle>
              <DialogDescription>{detailMsg?.email}</DialogDescription>
            </DialogHeader>
            {detailMsg && (
              <div className="space-y-5">
                {/* Message */}
                <div className="rounded-lg bg-muted/50 p-4">
                  <p className="font-sans text-sm leading-relaxed whitespace-pre-wrap">
                    {detailMsg.message}
                  </p>
                </div>

                {/* Status + date */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground font-sans">
                    {t.adminContacts.submitted}:{" "}
                    <span className="text-foreground">
                      {formatDate(detailMsg.submittedAt)}
                    </span>
                  </span>
                  <Badge
                    variant={
                      isActive(detailMsg.status) ? "default" : "secondary"
                    }
                    className={
                      isActive(detailMsg.status)
                        ? "bg-gold/20 text-amber-800 border-gold/40 font-sans text-xs"
                        : "font-sans text-xs"
                    }
                  >
                    {isActive(detailMsg.status)
                      ? t.adminContacts.active
                      : t.adminContacts.notactive}
                  </Badge>
                </div>

                {/* Sender info */}
                <div className="rounded-lg border border-border p-4 space-y-3">
                  <p className="font-sans text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t.adminContacts.senderInfo}
                  </p>

                  <div className="space-y-2">
                    <div>
                      <span className="font-sans text-xs text-muted-foreground">
                        {t.adminContacts.principalId}:{" "}
                      </span>
                      <span className="font-mono text-xs break-all">
                        {getOptionValue(
                          detailMsg.senderPrincipal as string | undefined,
                        ) ?? t.adminContacts.noPrincipal}
                      </span>
                    </div>
                    <div>
                      <span className="font-sans text-xs text-muted-foreground">
                        {t.adminContacts.deviceId}:{" "}
                      </span>
                      <span className="font-mono text-xs break-all">
                        {getOptionValue(
                          detailMsg.deviceId as string | undefined,
                        ) ?? t.adminContacts.noDeviceId}
                      </span>
                    </div>
                    {detailMsg.senderBlocked && (
                      <Badge
                        variant="destructive"
                        className="font-sans text-xs"
                        data-ocid="contacts.error_state"
                      >
                        {t.adminContacts.senderBlocked}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Quick actions */}
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleStatusToggle(detailMsg)}
                    disabled={actionLoading === `${detailMsg.id}:status`}
                    data-ocid="contacts.toggle"
                  >
                    {actionLoading === `${detailMsg.id}:status` ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : isActive(detailMsg.status) ? (
                      <ToggleLeft className="mr-1.5 h-3.5 w-3.5" />
                    ) : (
                      <ToggleRight className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    {isActive(detailMsg.status)
                      ? t.adminContacts.setNotactive
                      : t.adminContacts.setActive}
                  </Button>

                  {hasPrincipal(detailMsg) && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setConfirmBlock({
                          msg: detailMsg,
                          block: !detailMsg.senderBlocked,
                        })
                      }
                      disabled={actionLoading === `${detailMsg.id}:block`}
                      className={
                        detailMsg.senderBlocked
                          ? "border-green-400 text-green-700 hover:bg-green-50"
                          : "border-orange-400 text-orange-700 hover:bg-orange-50"
                      }
                      data-ocid="contacts.toggle"
                    >
                      {detailMsg.senderBlocked ? (
                        <>
                          <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
                          {t.adminContacts.unblock}
                        </>
                      ) : (
                        <>
                          <Ban className="mr-1.5 h-3.5 w-3.5" />
                          {t.adminContacts.block}
                        </>
                      )}
                    </Button>
                  )}

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setDetailMsg(null);
                      setConfirmDelete(detailMsg);
                    }}
                    className="border-destructive text-destructive hover:bg-destructive/10"
                    data-ocid="contacts.delete_button"
                  >
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                    {t.adminContacts.delete}
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setDetailMsg(null)}
                    className="ml-auto"
                    data-ocid="contacts.close_button"
                  >
                    {t.adminContacts.cancel}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* ---- Confirm Single Delete ---- */}
        <AlertDialog
          open={!!confirmDelete}
          onOpenChange={(open) => !open && setConfirmDelete(null)}
        >
          <AlertDialogContent data-ocid="contacts.dialog">
            <AlertDialogHeader>
              <AlertDialogTitle>
                {t.adminContacts.deleteConfirmTitle}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {t.adminContacts.deleteConfirmMsg}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                onClick={() => setConfirmDelete(null)}
                data-ocid="contacts.cancel_button"
              >
                {t.adminContacts.cancel}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => confirmDelete && handleDelete(confirmDelete)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={!!actionLoading}
                data-ocid="contacts.confirm_button"
              >
                {actionLoading ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : null}
                {t.adminContacts.confirm}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* ---- Confirm Bulk Delete ---- */}
        <AlertDialog
          open={confirmBulkDelete}
          onOpenChange={(open) => !open && setConfirmBulkDelete(false)}
        >
          <AlertDialogContent data-ocid="contacts.dialog">
            <AlertDialogHeader>
              <AlertDialogTitle>
                {t.adminContacts.deleteConfirmTitle}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {t.adminContacts.bulkDeleteConfirmMsg.replace(
                  "{n}",
                  String(selected.size),
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                onClick={() => setConfirmBulkDelete(false)}
                data-ocid="contacts.cancel_button"
              >
                {t.adminContacts.cancel}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleBulkDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={actionLoading === "bulk:delete"}
                data-ocid="contacts.confirm_button"
              >
                {actionLoading === "bulk:delete" ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : null}
                {t.adminContacts.confirm}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* ---- Confirm Block / Unblock ---- */}
        <AlertDialog
          open={!!confirmBlock}
          onOpenChange={(open) => !open && setConfirmBlock(null)}
        >
          <AlertDialogContent data-ocid="contacts.dialog">
            <AlertDialogHeader>
              <AlertDialogTitle>
                {confirmBlock?.block
                  ? t.adminContacts.blockConfirmTitle
                  : t.adminContacts.unblock}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {confirmBlock?.block
                  ? t.adminContacts.blockConfirmMsg
                  : t.adminContacts.unblockConfirmMsg}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                onClick={() => setConfirmBlock(null)}
                data-ocid="contacts.cancel_button"
              >
                {t.adminContacts.cancel}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() =>
                  confirmBlock &&
                  handleBlockToggle(confirmBlock.msg, confirmBlock.block)
                }
                disabled={!!actionLoading}
                className={
                  confirmBlock?.block
                    ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    : undefined
                }
                data-ocid="contacts.confirm_button"
              >
                {actionLoading ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : null}
                {t.adminContacts.confirm}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}
