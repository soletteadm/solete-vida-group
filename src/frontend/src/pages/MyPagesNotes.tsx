import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTypedActor } from "@/hooks/useTypedActor";
import { useLanguage } from "@/i18n/LanguageContext";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { Principal } from "@dfinity/principal";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  NotebookPen,
  Plus,
  Search,
  Share2,
  Trash2,
  UserCheck,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { NoteRecord } from "../backend.d";

// ─── Actor type ───────────────────────────────────────────────────────────────

interface NotesActor {
  createNote(
    rubrik: string,
    content: string,
  ): Promise<{ __kind__: "ok"; ok: string } | { __kind__: "err"; err: string }>;
  updateNote(
    noteId: string,
    rubrik: string,
    content: string,
  ): Promise<{ __kind__: "ok"; ok: null } | { __kind__: "err"; err: string }>;
  deleteNote(
    noteId: string,
  ): Promise<{ __kind__: "ok"; ok: null } | { __kind__: "err"; err: string }>;
  listNotes(
    limit: bigint,
    offset: bigint,
    search: string | null,
  ): Promise<
    { __kind__: "ok"; ok: NoteRecord[] } | { __kind__: "err"; err: string }
  >;
  getNotesCount(
    search: string | null,
  ): Promise<{ __kind__: "ok"; ok: bigint } | { __kind__: "err"; err: string }>;
  shareNote(
    noteId: string,
    targetPrincipal: Principal,
  ): Promise<{ __kind__: "ok"; ok: null } | { __kind__: "err"; err: string }>;
  unshareNote(
    noteId: string,
    targetPrincipal: Principal,
  ): Promise<{ __kind__: "ok"; ok: null } | { __kind__: "err"; err: string }>;
  getNoteShares(
    noteId: string,
  ): Promise<
    { __kind__: "ok"; ok: Principal[] } | { __kind__: "err"; err: string }
  >;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

function formatDate(ts: bigint): string {
  const ms = Number(ts / BigInt(1_000_000));
  return new Date(ms).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function principalToText(p: Principal): string {
  return typeof p === "object" && p !== null && "toText" in p
    ? (p as { toText(): string }).toText()
    : String(p);
}

// ─── Note Dialog ──────────────────────────────────────────────────────────────

interface NoteDialogProps {
  note: NoteRecord | null; // null = create new
  onSave: (rubrik: string, content: string) => Promise<void>;
  onClose: () => void;
  isSaving: boolean;
}

function NoteDialog({ note, onSave, onClose, isSaving }: NoteDialogProps) {
  const { t } = useLanguage();
  const [rubrik, setRubrik] = useState(note?.rubrik ?? "");
  const [content, setContent] = useState(note?.content ?? "");
  const rubrikRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    rubrikRef.current?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const r = rubrik.trim();
    const c = content.trim();
    if (r) onSave(r, c);
  };

  const isEdit = note !== null;
  const title = isEdit ? t.notes.editNote : t.notes.newNote;

  return (
    <dialog
      open
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 m-0 w-full h-full max-w-none max-h-none border-0 bg-transparent"
      data-ocid="notes.dialog"
      aria-label={title}
      onClick={onClose}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <div
        className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] sm:max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 flex-shrink-0 px-4 pt-4 sm:px-6 sm:pt-6 pb-3">
          <NotebookPen className="w-5 h-5 text-gold shrink-0" />
          <h3 className="font-serif text-base font-semibold text-foreground flex-1">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold"
            aria-label={t.notes.abort}
            data-ocid="notes.dialog_close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto px-4 sm:px-6 space-y-4"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          <div>
            <label
              htmlFor="note-rubrik"
              className="block text-xs font-medium text-muted-foreground mb-1.5"
            >
              {t.notes.rubrik}
            </label>
            <input
              id="note-rubrik"
              ref={rubrikRef}
              type="text"
              value={rubrik}
              onChange={(e) => setRubrik(e.target.value)}
              placeholder={t.notes.rubrik}
              className="w-full rounded-lg border border-input bg-background px-3 py-3 text-base sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold/60 transition min-h-[48px]"
              maxLength={200}
              disabled={isSaving}
              data-ocid="notes.rubrik_input"
            />
          </div>
          <div>
            <label
              htmlFor="note-content"
              className="block text-xs font-medium text-muted-foreground mb-1.5"
            >
              {t.notes.content}
            </label>
            <textarea
              id="note-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={t.notes.content}
              rows={6}
              className="w-full rounded-lg border border-input bg-background px-3 py-3 text-base sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold/60 transition resize-y min-h-[120px]"
              disabled={isSaving}
              data-ocid="notes.content_textarea"
            />
          </div>
        </form>

        {/* Action buttons — always visible, pinned at bottom */}
        <div className="flex-shrink-0 flex gap-2 justify-end px-4 sm:px-6 py-3 sm:py-4 border-t border-border/50 bg-card">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-full min-h-[44px] px-5"
            data-ocid="notes.abort_button"
          >
            {t.notes.abort}
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={!rubrik.trim() || isSaving}
            onClick={() => {
              const r = rubrik.trim();
              const c = content.trim();
              if (r) onSave(r, c);
            }}
            className="bg-gold hover:bg-gold/90 text-black font-sans rounded-full min-h-[44px] px-5"
            data-ocid="notes.save_button"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                {t.notes.save}
              </>
            ) : (
              t.notes.save
            )}
          </Button>
        </div>
      </div>
    </dialog>
  );
}

// ─── Share Dialog ─────────────────────────────────────────────────────────────

interface ShareDialogProps {
  note: NoteRecord;
  onClose: () => void;
  actor: NotesActor;
}

function ShareDialog({ note, onClose, actor }: ShareDialogProps) {
  const { t } = useLanguage();
  const [shares, setShares] = useState<Principal[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPrincipal, setNewPrincipal] = useState("");
  const [sharing, setSharing] = useState(false);
  const [removingIdx, setRemovingIdx] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadShares = useCallback(async () => {
    setLoading(true);
    try {
      const result = await actor.getNoteShares(note.id);
      if ("ok" in result) setShares(result.ok);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [actor, note.id]);

  useEffect(() => {
    loadShares();
    inputRef.current?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [loadShares, onClose]);

  const handleShare = async () => {
    const txt = newPrincipal.trim();
    if (!txt) return;
    setSharing(true);
    try {
      // Parse the principal text using the IC SDK — this validates the checksum
      // and supports all valid formats (Ed25519 11-group, secp256k1 5-group, etc.)
      let principal: Principal;
      try {
        principal = Principal.fromText(txt);
      } catch {
        toast.error(t.notes.invalidPrincipal ?? "Invalid principal ID");
        setSharing(false);
        return;
      }
      const result = await actor.shareNote(note.id, principal);
      if ("ok" in result) {
        toast.success(t.notes.shareAdded);
        setNewPrincipal("");
        await loadShares();
      } else {
        toast.error(`${t.common.error}: ${result.err}`);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(`${t.common.error}: ${msg}`);
    } finally {
      setSharing(false);
    }
  };

  const handleRemove = async (p: Principal, idx: number) => {
    setRemovingIdx(idx);
    try {
      const result = await actor.unshareNote(note.id, p);
      if ("ok" in result) {
        toast.success(t.notes.shareRemoved);
        await loadShares();
      } else {
        toast.error(`${t.common.error}: ${result.err}`);
      }
    } catch {
      toast.error(t.common.error);
    } finally {
      setRemovingIdx(null);
    }
  };

  return (
    <dialog
      open
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 m-0 w-full h-full max-w-none max-h-none border-0 bg-transparent"
      data-ocid="notes.share_dialog"
      aria-label={t.notes.shareDialogTitle}
      onClick={onClose}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <div
        className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] sm:max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-2 flex-shrink-0 px-4 pt-4 sm:px-6 sm:pt-6 pb-3">
          <Share2 className="w-5 h-5 text-gold shrink-0" />
          <div className="flex-1 min-w-0">
            <h3 className="font-serif text-base font-semibold text-foreground">
              {t.notes.shareDialogTitle}
            </h3>
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {note.rubrik}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold"
            aria-label={t.notes.close}
            data-ocid="notes.share_dialog_close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div
          className="flex-1 overflow-y-auto px-4 sm:px-6 space-y-5 pb-2"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {/* Current shares list */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              {t.notes.shareWith}
            </p>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-full rounded-lg" />
                <Skeleton className="h-8 w-3/4 rounded-lg" />
              </div>
            ) : shares.length === 0 ? (
              <p
                className="text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-3 text-center"
                data-ocid="notes.shares_empty"
              >
                {t.notes.noShares}
              </p>
            ) : (
              <ul className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {shares.map((p, idx) => (
                  <li
                    key={principalToText(p)}
                    className="flex items-center gap-2 px-3 py-2 bg-muted/30 border border-border/50 rounded-lg"
                    data-ocid={`notes.share_entry.${idx + 1}`}
                  >
                    <UserCheck className="w-3.5 h-3.5 text-gold shrink-0" />
                    <span className="flex-1 text-xs text-foreground font-mono truncate min-w-0">
                      {principalToText(p)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemove(p, idx)}
                      disabled={removingIdx === idx}
                      className="shrink-0 inline-flex items-center gap-1 text-xs text-destructive hover:text-destructive/80 transition-colors focus-visible:outline-none disabled:opacity-50"
                      aria-label={t.notes.removeShare}
                      data-ocid={`notes.remove_share_button.${idx + 1}`}
                    >
                      {removingIdx === idx ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <X className="w-3 h-3" />
                      )}
                      {t.notes.removeShare}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Add new share */}
          <div className="space-y-2">
            <label
              htmlFor="share-principal-input"
              className="block text-xs font-medium text-muted-foreground"
            >
              {t.notes.addShare}
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                id="share-principal-input"
                ref={inputRef}
                type="text"
                value={newPrincipal}
                onChange={(e) => setNewPrincipal(e.target.value)}
                placeholder={t.notes.principalPlaceholder}
                className="flex-1 min-w-0 rounded-lg border border-input bg-background px-3 py-3 text-base sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold/60 transition font-mono min-h-[48px]"
                disabled={sharing}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleShare();
                  }
                }}
                data-ocid="notes.share_principal_input"
              />
              <Button
                type="button"
                size="sm"
                onClick={handleShare}
                disabled={!newPrincipal.trim() || sharing}
                className="bg-gold hover:bg-gold/90 text-black font-sans rounded-full w-full sm:w-auto min-h-[48px] shrink-0"
                data-ocid="notes.share_add_button"
              >
                {sharing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  t.notes.shareButton
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Footer — pinned at bottom */}
        <div className="flex-shrink-0 flex justify-end px-4 sm:px-6 py-3 border-t border-border/50 bg-card">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="rounded-full"
            data-ocid="notes.share_dialog_close_button"
          >
            {t.notes.close}
          </Button>
        </div>
      </div>
    </dialog>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function MyPagesNotes() {
  const { t } = useLanguage();
  const { actor, isFetching } = useTypedActor();
  const notesActor = actor as unknown as NotesActor | null;

  // ─── Data state ────────────────────────────────────────────────────────────
  const [notes, setNotes] = useState<NoteRecord[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // ─── Pagination & search ────────────────────────────────────────────────────
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");

  // ─── Note dialog state ──────────────────────────────────────────────────────
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<NoteRecord | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // ─── Delete state ───────────────────────────────────────────────────────────
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ─── Share dialog state ──────────────────────────────────────────────────────
  const [shareNote, setShareNote] = useState<NoteRecord | null>(null);

  // ─── Load notes ────────────────────────────────────────────────────────────

  const loadNotes = useCallback(async () => {
    if (!notesActor || isFetching) return;
    setLoading(true);
    try {
      const offset = BigInt((page - 1) * PAGE_SIZE);
      const search = searchQuery.trim() || null;

      const [notesResult, countResult] = await Promise.all([
        notesActor.listNotes(BigInt(PAGE_SIZE), offset, search),
        notesActor.getNotesCount(search),
      ]);

      if ("ok" in notesResult) setNotes(notesResult.ok);
      if ("ok" in countResult) setTotalCount(Number(countResult.ok));
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  }, [notesActor, isFetching, page, searchQuery]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  // ─── Search handling ───────────────────────────────────────────────────────

  const handleSearch = () => {
    setPage(1);
    setSearchQuery(searchInput);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSearch();
  };

  const handleClearSearch = () => {
    setSearchInput("");
    setSearchQuery("");
    setPage(1);
  };

  // ─── Create / Edit ─────────────────────────────────────────────────────────

  const handleOpenCreate = () => {
    setEditingNote(null);
    setNoteDialogOpen(true);
  };

  const handleOpenEdit = (note: NoteRecord) => {
    setEditingNote(note);
    setNoteDialogOpen(true);
  };

  const handleSaveNote = async (rubrik: string, content: string) => {
    if (!notesActor) return;
    setIsSaving(true);
    try {
      if (editingNote) {
        const result = await notesActor.updateNote(
          editingNote.id,
          rubrik,
          content,
        );
        if ("ok" in result) {
          toast.success(t.notes.noteSaved);
          setNoteDialogOpen(false);
          await loadNotes();
        } else {
          toast.error(`${t.common.error}: ${result.err}`);
        }
      } else {
        const result = await notesActor.createNote(rubrik, content);
        if ("ok" in result) {
          toast.success(t.notes.noteCreated);
          setNoteDialogOpen(false);
          await loadNotes();
        } else {
          toast.error(`${t.common.error}: ${result.err}`);
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(`${t.common.error}: ${msg}`);
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Delete ────────────────────────────────────────────────────────────────

  const handleDelete = async (note: NoteRecord) => {
    if (!notesActor) return;
    if (!window.confirm(t.notes.confirmDelete)) return;
    setDeletingId(note.id);
    try {
      const result = await notesActor.deleteNote(note.id);
      if ("ok" in result) {
        toast.success(t.notes.noteDeleted);
        // If we deleted the last item on a page > 1, go back
        if (notes.length === 1 && page > 1) setPage((p) => p - 1);
        else await loadNotes();
      } else {
        toast.error(`${t.common.error}: ${result.err}`);
      }
    } catch {
      toast.error(t.common.error);
    } finally {
      setDeletingId(null);
    }
  };

  // ─── Pagination ────────────────────────────────────────────────────────────

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6" data-ocid="notes.section">
      {/* Header row */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <NotebookPen className="w-5 h-5 text-gold shrink-0" />
          <h2 className="font-serif text-xl font-semibold text-foreground">
            {t.myPages.notesTab}
          </h2>
        </div>
        <Button
          size="sm"
          onClick={handleOpenCreate}
          className="bg-gold hover:bg-gold/90 text-black font-sans rounded-full shrink-0"
          data-ocid="notes.new_note_button"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          {t.notes.newNote}
        </Button>
      </div>

      {/* Search bar */}
      <div className="flex flex-col gap-2">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder={t.notes.searchPlaceholder}
            className="w-full rounded-lg border border-input bg-background pl-9 pr-9 py-3 text-base sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold/60 transition min-h-[48px]"
            data-ocid="notes.search_input"
          />
          {searchInput && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none"
              aria-label={t.notes.close}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={handleSearch}
          className="rounded-full w-full min-h-[48px] text-base sm:text-sm"
          data-ocid="notes.search_button"
        >
          {t.notes.search}
        </Button>
      </div>

      {/* Notes list */}
      <div className="rounded-xl border border-border overflow-hidden bg-card">
        {loading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 w-full rounded-lg" />
            ))}
          </div>
        ) : notes.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-14 text-center px-4"
            data-ocid="notes.empty_state"
          >
            <NotebookPen className="w-10 h-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground font-sans">
              {searchQuery ? t.notes.noResults : t.notes.noNotes}
            </p>
            {!searchQuery && (
              <Button
                size="sm"
                onClick={handleOpenCreate}
                className="mt-4 bg-gold hover:bg-gold/90 text-black font-sans rounded-full"
                data-ocid="notes.empty_create_button"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                {t.notes.newNote}
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* ── Mobile card layout (below md) ── */}
            <ul className="divide-y divide-border/50 md:hidden">
              {notes.map((note, idx) => (
                <li
                  key={note.id}
                  className="px-4 py-4 hover:bg-muted/20 transition-colors"
                  data-ocid={`notes.item.${idx + 1}`}
                >
                  <div className="flex items-start justify-between gap-2 min-w-0">
                    <div className="flex-1 min-w-0 space-y-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(note)}
                        className="text-sm font-semibold text-foreground hover:text-gold transition-colors text-left block w-full truncate focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold rounded"
                        title={note.rubrik}
                        data-ocid={`notes.rubrik_link.${idx + 1}`}
                      >
                        {note.rubrik}
                      </button>
                      <p className="text-xs text-muted-foreground font-mono truncate">
                        {note.content.slice(0, 10)}
                        {note.content.length > 10 ? "…" : ""}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-muted-foreground">
                          {formatDate(note.createdAt)}
                        </span>
                        <Badge
                          variant="secondary"
                          className="text-xs bg-muted/60 text-muted-foreground font-mono"
                          data-ocid={`notes.shares_badge.${idx + 1}`}
                        >
                          {note.sharedWith.length} {t.notes.sharesCol}
                        </Badge>
                      </div>
                    </div>
                    {/* Touch-friendly action buttons (min 44x44) */}
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setShareNote(note)}
                        title={t.notes.share}
                        className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-md text-muted-foreground hover:text-gold hover:bg-gold/10 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold"
                        aria-label={t.notes.share}
                        data-ocid={`notes.share_button.${idx + 1}`}
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(note)}
                        disabled={deletingId === note.id}
                        title={t.notes.delete}
                        className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-destructive disabled:opacity-50"
                        aria-label={t.notes.delete}
                        data-ocid={`notes.delete_button.${idx + 1}`}
                      >
                        {deletingId === note.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            {/* ── Desktop table layout (md and above) ── */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {t.notes.rubrikCol}
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {t.notes.previewCol}
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {t.notes.dateCol}
                    </th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {t.notes.sharesCol}
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {t.notes.actionsCol}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {notes.map((note, idx) => (
                    <tr
                      key={note.id}
                      className="hover:bg-muted/20 transition-colors"
                      data-ocid={`notes.item.${idx + 1}`}
                    >
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(note)}
                          className="text-sm font-medium text-foreground hover:text-gold transition-colors text-left max-w-[160px] truncate block focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold rounded"
                          title={note.rubrik}
                          data-ocid={`notes.rubrik_link.${idx + 1}`}
                        >
                          {note.rubrik}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-muted-foreground font-mono">
                          {note.content.slice(0, 10)}
                          {note.content.length > 10 ? "…" : ""}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-muted-foreground">
                          {formatDate(note.createdAt)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge
                          variant="secondary"
                          className="text-xs bg-muted/60 text-muted-foreground font-mono"
                          data-ocid={`notes.shares_badge.${idx + 1}`}
                        >
                          {note.sharedWith.length}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setShareNote(note)}
                            title={t.notes.share}
                            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-md text-muted-foreground hover:text-gold hover:bg-gold/10 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold"
                            aria-label={t.notes.share}
                            data-ocid={`notes.share_button.${idx + 1}`}
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(note)}
                            disabled={deletingId === note.id}
                            title={t.notes.delete}
                            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-destructive disabled:opacity-50"
                            aria-label={t.notes.delete}
                            data-ocid={`notes.delete_button.${idx + 1}`}
                          >
                            {deletingId === note.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Pagination */}
      {!loading && totalCount > PAGE_SIZE && (
        <div className="flex flex-col gap-3" data-ocid="notes.pagination">
          <span className="text-sm text-muted-foreground text-center">
            {t.notes.pageOf
              .replace("{page}", String(page))
              .replace("{total}", String(totalPages))}
          </span>
          <div className="flex items-center justify-center gap-2 w-full">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-full min-h-[48px] min-w-[48px] p-0 flex-1 sm:flex-none"
              data-ocid="notes.pagination_prev"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="sr-only">{t.notes.prev}</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="rounded-full min-h-[48px] min-w-[48px] p-0 flex-1 sm:flex-none"
              data-ocid="notes.pagination_next"
            >
              <ChevronRight className="w-4 h-4" />
              <span className="sr-only">{t.notes.next}</span>
            </Button>
          </div>
        </div>
      )}

      {/* Note dialog */}
      {noteDialogOpen && (
        <NoteDialog
          note={editingNote}
          onSave={handleSaveNote}
          onClose={() => setNoteDialogOpen(false)}
          isSaving={isSaving}
        />
      )}

      {/* Share dialog */}
      {shareNote && notesActor && (
        <ShareDialog
          note={shareNote}
          onClose={() => setShareNote(null)}
          actor={notesActor}
        />
      )}
    </div>
  );
}
