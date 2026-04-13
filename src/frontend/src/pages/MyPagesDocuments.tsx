import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useTypedActor } from "@/hooks/useTypedActor";
import { useLanguage } from "@/i18n/LanguageContext";
import {
  ArrowLeft,
  CheckSquare,
  ChevronRight,
  Download,
  Eye,
  FileText,
  FolderInput,
  FolderOpen,
  FolderPlus,
  Globe,
  Link,
  Loader2,
  Lock,
  Music,
  Settings2,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { DocumentRecord, FolderRecord } from "../backend.d";

// ─── MIME helpers ─────────────────────────────────────────────────────────────

function mimeForFile(file: File): string {
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "application/pdf";
  if (ext === "docx")
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (ext === "doc") return "application/msword";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "png") return "image/png";
  if (ext === "gif") return "image/gif";
  if (ext === "webp") return "image/webp";
  if (ext === "svg") return "image/svg+xml";
  if (ext === "mp3") return "audio/mpeg";
  if (ext === "wav") return "audio/wav";
  if (ext === "ogg") return "audio/ogg";
  if (ext === "flac") return "audio/flac";
  if (ext === "aac") return "audio/aac";
  if (ext === "m4a") return "audio/x-m4a";
  if (ext === "mp4") return "video/mp4";
  if (ext === "mov") return "video/quicktime";
  if (ext === "avi") return "video/x-msvideo";
  if (ext === "webm") return "video/webm";
  if (ext === "mkv") return "video/x-matroska";
  if (ext === "mpeg" || ext === "mpg") return "video/mpeg";
  if (file.type && file.type !== "application/octet-stream") return file.type;
  return "application/octet-stream";
}

// ─── Types & constants ────────────────────────────────────────────────────────

interface MyPagesDocumentsProps {
  principalText: string | null;
  userName: string;
  userRole: "admin" | "user" | "guest";
}

interface Breadcrumb {
  id: string | null;
  name: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_TOTAL_STORAGE = 100 * 1024 * 1024;
const ALLOWED_EXTENSIONS = [
  ".pdf",
  ".docx",
  ".doc",
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".svg",
  ".mp3",
  ".wav",
  ".ogg",
  ".flac",
  ".aac",
  ".m4a",
  ".mp4",
  ".mov",
  ".avi",
  ".webm",
  ".mkv",
  ".mpeg",
  ".mpg",
];
const ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "audio/mpeg",
  "audio/wav",
  "audio/ogg",
  "audio/flac",
  "audio/aac",
  "audio/x-m4a",
  "video/mp4",
  "video/quicktime",
  "video/x-msvideo",
  "video/webm",
  "video/x-matroska",
  "video/mpeg",
];

function formatMB(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(1);
}

// ─── Storage bar ──────────────────────────────────────────────────────────────

function StorageBar({ usedBytes }: { usedBytes: number }) {
  const { t } = useLanguage();
  const pct = Math.min((usedBytes / MAX_TOTAL_STORAGE) * 100, 100);
  const usedMB = formatMB(usedBytes);
  const totalMB = "100";

  let barColor = "bg-emerald-500";
  if (pct >= 90) barColor = "bg-red-500";
  else if (pct >= 70) barColor = "bg-amber-500";

  const label = t.documents.storageUsed
    .replace("{used}", usedMB)
    .replace("{total}", totalMB);

  return (
    <div className="space-y-1.5" data-ocid="documents.storage_bar">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span>{pct.toFixed(0)}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted/40 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Move Modal (files and folders) ──────────────────────────────────────────

interface DialogFolder {
  id: string | null; // null = root sentinel
  name: string;
}

interface MoveModalProps {
  itemName: string;
  itemType: "file" | "folder";
  excludeFolderId: string | null; // folder being moved (excluded from picker)
  initialFolderId: string | null; // starting level (null = root)
  loadFolders: (parentId: string | null) => Promise<FolderRecord[]>;
  onConfirm: (targetFolderId: string | null) => void;
  onCancel: () => void;
  isMoving: boolean;
}

function MoveModal({
  itemName,
  itemType,
  excludeFolderId,
  initialFolderId,
  loadFolders,
  onConfirm,
  onCancel,
  isMoving,
}: MoveModalProps) {
  const { t } = useLanguage();

  // Which folder level is displayed in the dialog (null = root)
  const [dialogFolderId, setDialogFolderId] = useState<string | null>(null);
  // Stack of parent levels for Back navigation: each entry is { id, name } of the level we came FROM
  const [dialogStack, setDialogStack] = useState<DialogFolder[]>([]);
  // Name of the folder currently being browsed (shown next to Back button)
  const [currentFolderName, setCurrentFolderName] = useState<string>("");
  // Folders visible at the current dialog level
  const [dialogFolders, setDialogFolders] = useState<FolderRecord[]>([]);
  const [dialogLoading, setDialogLoading] = useState(true);
  // Which folder is selected as the move destination
  const [selected, setSelected] = useState<string | null>(
    initialFolderId === null ? "__root__" : initialFolderId,
  );

  // Reload whenever the dialog level changes
  useEffect(() => {
    let cancelled = false;
    setDialogLoading(true);
    loadFolders(dialogFolderId)
      .then((folders) => {
        if (!cancelled) setDialogFolders(folders);
      })
      .catch(() => {
        if (!cancelled) setDialogFolders([]);
      })
      .finally(() => {
        if (!cancelled) setDialogLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [dialogFolderId, loadFolders]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onCancel]);

  const handleConfirm = () => {
    onConfirm(selected === "__root__" ? null : (selected ?? null));
  };

  // Click folder name → navigate into it
  const navigateInto = (folder: FolderRecord) => {
    // Push the current level onto the stack
    setDialogStack((prev) => [
      ...prev,
      { id: dialogFolderId, name: currentFolderName || t.documents.moveRoot },
    ]);
    setCurrentFolderName(folder.name);
    setDialogFolderId(folder.id);
  };

  // Back button → pop stack and go up one level
  const navigateBack = () => {
    setDialogStack((prev) => {
      const newStack = [...prev];
      const parent = newStack.pop();
      setCurrentFolderName(parent?.name ?? "");
      setDialogFolderId(parent?.id ?? null);
      return newStack;
    });
  };

  // Never show the folder being moved (can't move into itself)
  const visibleFolders = dialogFolders.filter((f) => f.id !== excludeFolderId);
  const isInsideSubfolder = dialogStack.length > 0;
  const title =
    itemType === "folder" ? t.documents.moveFolderTitle : t.documents.moveTitle;

  return (
    <dialog
      open
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 m-0 w-full h-full max-w-none max-h-none border-0 bg-transparent"
      data-ocid="documents.move_modal"
      aria-label={title}
      onClick={onCancel}
      onKeyDown={(e) => e.key === "Escape" && onCancel()}
    >
      <div
        className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {/* Title */}
        <div className="flex items-center gap-2">
          <FolderInput className="w-5 h-5 text-gold shrink-0" />
          <h3 className="font-serif text-base font-semibold text-foreground">
            {title}
          </h3>
        </div>
        <p className="text-xs text-muted-foreground truncate" title={itemName}>
          {itemName}
        </p>

        {/* Back button + current folder name */}
        {isInsideSubfolder && (
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={navigateBack}
              className="inline-flex items-center gap-1.5 shrink-0 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold rounded px-2 py-1 bg-muted/30 hover:bg-muted/60"
              data-ocid="documents.move_back"
              aria-label={t.documents.back}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              {t.documents.back}
            </button>
            {currentFolderName && (
              <span className="flex items-center gap-1 min-w-0 text-xs text-foreground font-medium truncate">
                <FolderOpen className="w-3.5 h-3.5 text-gold shrink-0" />
                <span className="truncate">{currentFolderName}</span>
              </span>
            )}
          </div>
        )}

        {/* Folder list */}
        <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
          {/* Root option — only at root level */}
          {!isInsideSubfolder && (
            <label
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                selected === "__root__"
                  ? "bg-gold/20 border border-gold/40"
                  : "hover:bg-muted/40 border border-transparent"
              }`}
            >
              <input
                type="radio"
                name="move-target"
                value="__root__"
                checked={selected === "__root__"}
                onChange={() => setSelected("__root__")}
                className="accent-gold"
                data-ocid="documents.move_root_option"
              />
              <span className="text-sm text-foreground font-medium">
                {t.documents.moveRoot}
              </span>
            </label>
          )}

          {/* Loading spinner */}
          {dialogLoading && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Folder rows — radio to select, name to navigate in */}
          {!dialogLoading &&
            visibleFolders.map((folder) => (
              <div
                key={folder.id}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg transition-colors ${
                  selected === folder.id
                    ? "bg-gold/20 border border-gold/40"
                    : "hover:bg-muted/40 border border-transparent"
                }`}
                data-ocid="documents.move_folder_row"
              >
                <input
                  type="radio"
                  name="move-target"
                  value={folder.id}
                  checked={selected === folder.id}
                  onChange={() => setSelected(folder.id)}
                  className="accent-gold shrink-0"
                  data-ocid="documents.move_folder_option"
                />
                <FolderOpen className="w-4 h-4 text-gold shrink-0" />
                {/* Clicking the folder name navigates into it */}
                <button
                  type="button"
                  onClick={() => navigateInto(folder)}
                  className="flex-1 text-left text-sm text-foreground truncate min-w-0 hover:text-gold transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold rounded"
                  data-ocid="documents.move_folder_navigate"
                  title={folder.name}
                >
                  {folder.name}
                </button>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
              </div>
            ))}

          {/* Empty message inside a subfolder */}
          {!dialogLoading &&
            isInsideSubfolder &&
            visibleFolders.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-3">
                {t.documents.noDocuments}
              </p>
            )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 justify-end pt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={isMoving}
            className="rounded-full"
            data-ocid="documents.move_cancel"
          >
            {t.documents.cancel}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleConfirm}
            disabled={isMoving}
            className="bg-gold hover:bg-gold/90 text-black font-sans rounded-full"
            data-ocid="documents.move_confirm"
          >
            {isMoving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                {t.documents.moveConfirm}
              </>
            ) : (
              t.documents.moveConfirm
            )}
          </Button>
        </div>
      </div>
    </dialog>
  );
}

// ─── Bulk Move Modal ──────────────────────────────────────────────────────────

interface BulkMoveModalProps {
  selectedCount: number;
  excludeFolderIds: string[]; // folders being moved (excluded from picker)
  loadFolders: (parentId: string | null) => Promise<FolderRecord[]>;
  onConfirm: (targetFolderId: string | null) => void;
  onCancel: () => void;
  isMoving: boolean;
}

function BulkMoveModal({
  selectedCount,
  excludeFolderIds,
  loadFolders,
  onConfirm,
  onCancel,
  isMoving,
}: BulkMoveModalProps) {
  const { t } = useLanguage();

  const [dialogFolderId, setDialogFolderId] = useState<string | null>(null);
  const [dialogStack, setDialogStack] = useState<DialogFolder[]>([]);
  const [currentFolderName, setCurrentFolderName] = useState<string>("");
  const [dialogFolders, setDialogFolders] = useState<FolderRecord[]>([]);
  const [dialogLoading, setDialogLoading] = useState(true);
  const [selected, setSelected] = useState<string>("__root__");

  useEffect(() => {
    let cancelled = false;
    setDialogLoading(true);
    loadFolders(dialogFolderId)
      .then((folders) => {
        if (!cancelled) setDialogFolders(folders);
      })
      .catch(() => {
        if (!cancelled) setDialogFolders([]);
      })
      .finally(() => {
        if (!cancelled) setDialogLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [dialogFolderId, loadFolders]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onCancel]);

  const handleConfirm = () => {
    onConfirm(selected === "__root__" ? null : (selected ?? null));
  };

  const navigateInto = (folder: FolderRecord) => {
    setDialogStack((prev) => [
      ...prev,
      { id: dialogFolderId, name: currentFolderName || t.documents.moveRoot },
    ]);
    setCurrentFolderName(folder.name);
    setDialogFolderId(folder.id);
  };

  const navigateBack = () => {
    setDialogStack((prev) => {
      const newStack = [...prev];
      const parent = newStack.pop();
      setCurrentFolderName(parent?.name ?? "");
      setDialogFolderId(parent?.id ?? null);
      return newStack;
    });
  };

  // Exclude all selected folders from picker (prevent circular moves)
  const visibleFolders = dialogFolders.filter(
    (f) => !excludeFolderIds.includes(f.id),
  );
  const isInsideSubfolder = dialogStack.length > 0;
  const title = t.documents.bulkMoveTitle.replace("{n}", String(selectedCount));

  return (
    <dialog
      open
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 m-0 w-full h-full max-w-none max-h-none border-0 bg-transparent"
      data-ocid="documents.bulk_move_modal"
      aria-label={title}
      onClick={onCancel}
      onKeyDown={(e) => e.key === "Escape" && onCancel()}
    >
      <div
        className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {/* Title */}
        <div className="flex items-center gap-2">
          <CheckSquare className="w-5 h-5 text-gold shrink-0" />
          <h3 className="font-serif text-base font-semibold text-foreground">
            {title}
          </h3>
        </div>

        {/* Back button + current folder name */}
        {isInsideSubfolder && (
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={navigateBack}
              className="inline-flex items-center gap-1.5 shrink-0 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold rounded px-2 py-1 bg-muted/30 hover:bg-muted/60"
              data-ocid="documents.bulk_move_back"
              aria-label={t.documents.back}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              {t.documents.back}
            </button>
            {currentFolderName && (
              <span className="flex items-center gap-1 min-w-0 text-xs text-foreground font-medium truncate">
                <FolderOpen className="w-3.5 h-3.5 text-gold shrink-0" />
                <span className="truncate">{currentFolderName}</span>
              </span>
            )}
          </div>
        )}

        {/* Folder list */}
        <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
          {/* Root option — only at root level */}
          {!isInsideSubfolder && (
            <label
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                selected === "__root__"
                  ? "bg-gold/20 border border-gold/40"
                  : "hover:bg-muted/40 border border-transparent"
              }`}
            >
              <input
                type="radio"
                name="bulk-move-target"
                value="__root__"
                checked={selected === "__root__"}
                onChange={() => setSelected("__root__")}
                className="accent-gold"
                data-ocid="documents.bulk_move_root_option"
              />
              <span className="text-sm text-foreground font-medium">
                {t.documents.moveRoot}
              </span>
            </label>
          )}

          {dialogLoading && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          )}

          {!dialogLoading &&
            visibleFolders.map((folder) => (
              <div
                key={folder.id}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg transition-colors ${
                  selected === folder.id
                    ? "bg-gold/20 border border-gold/40"
                    : "hover:bg-muted/40 border border-transparent"
                }`}
                data-ocid="documents.bulk_move_folder_row"
              >
                <input
                  type="radio"
                  name="bulk-move-target"
                  value={folder.id}
                  checked={selected === folder.id}
                  onChange={() => setSelected(folder.id)}
                  className="accent-gold shrink-0"
                  data-ocid="documents.bulk_move_folder_option"
                />
                <FolderOpen className="w-4 h-4 text-gold shrink-0" />
                <button
                  type="button"
                  onClick={() => navigateInto(folder)}
                  className="flex-1 text-left text-sm text-foreground truncate min-w-0 hover:text-gold transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold rounded"
                  data-ocid="documents.bulk_move_folder_navigate"
                  title={folder.name}
                >
                  {folder.name}
                </button>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
              </div>
            ))}

          {!dialogLoading &&
            isInsideSubfolder &&
            visibleFolders.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-3">
                {t.documents.noDocuments}
              </p>
            )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 justify-end pt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={isMoving}
            className="rounded-full"
            data-ocid="documents.bulk_move_cancel"
          >
            {t.documents.cancel}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleConfirm}
            disabled={isMoving}
            className="bg-gold hover:bg-gold/90 text-black font-sans rounded-full"
            data-ocid="documents.bulk_move_confirm"
          >
            {isMoving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                {t.documents.moveConfirm}
              </>
            ) : (
              t.documents.moveConfirm
            )}
          </Button>
        </div>
      </div>
    </dialog>
  );
}

// ─── Image preview modal ──────────────────────────────────────────────────────

interface ImageModalProps {
  url: string;
  fileName: string;
  onClose: () => void;
}

function ImageModal({ url, fileName, onClose }: ImageModalProps) {
  const { t } = useLanguage();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <dialog
      open
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 m-0 w-full h-full max-w-none max-h-none border-0 bg-transparent"
      aria-label={fileName}
      data-ocid="documents.image_modal"
      onClick={onClose}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <div
        className="relative max-w-4xl max-h-[90vh] w-full flex flex-col items-center gap-3"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute -top-2 -right-2 z-10 w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          aria-label={t.documents.close}
          data-ocid="documents.image_modal_close"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="rounded-xl overflow-hidden border border-border shadow-xl bg-card max-h-[80vh]">
          <img
            src={url}
            alt={fileName}
            className="max-w-full max-h-[80vh] object-contain block"
          />
        </div>
        <p className="text-xs text-white/70 truncate max-w-full px-4 font-sans">
          {fileName}
        </p>
      </div>
    </dialog>
  );
}

// ─── Audio player row ─────────────────────────────────────────────────────────

interface AudioPlayerRowProps {
  url: string;
  fileName: string;
  onClose: () => void;
}

function AudioPlayerRow({ url, fileName, onClose }: AudioPlayerRowProps) {
  const { t } = useLanguage();
  return (
    <tr data-ocid="documents.audio_player_row">
      <td colSpan={4} className="px-3 pb-3 pt-1">
        <div className="flex items-center gap-3 bg-muted/30 border border-gold/20 rounded-xl px-4 py-3">
          <Music className="w-4 h-4 text-gold shrink-0" />
          <span className="text-xs text-muted-foreground truncate min-w-0 flex-1 font-sans">
            {fileName}
          </span>
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <audio
            src={url}
            controls
            autoPlay={false}
            className="h-8 flex-1 min-w-0 max-w-xs"
            style={{ accentColor: "var(--color-gold, #c9a84c)" }}
          >
            <track kind="captions" />
          </audio>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 w-7 h-7 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold"
            aria-label={t.documents.close}
            data-ocid="documents.audio_player_close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─── Create Folder Modal ──────────────────────────────────────────────────────

interface CreateFolderModalProps {
  onConfirm: (name: string) => void;
  onCancel: () => void;
  isCreating: boolean;
}

function CreateFolderModal({
  onConfirm,
  onCancel,
  isCreating,
}: CreateFolderModalProps) {
  const { t } = useLanguage();
  const [name, setName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onCancel]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed) onConfirm(trimmed);
  };

  return (
    <dialog
      open
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 m-0 w-full h-full max-w-none max-h-none border-0 bg-transparent"
      data-ocid="documents.create_folder_modal"
      aria-label={t.documents.newFolder}
      onClick={onCancel}
      onKeyDown={(e) => e.key === "Escape" && onCancel()}
    >
      <div
        className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          <FolderPlus className="w-5 h-5 text-gold" />
          <h3 className="font-serif text-base font-semibold text-foreground">
            {t.documents.newFolder}
          </h3>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="folder-name-input"
              className="block text-xs font-medium text-muted-foreground mb-1.5"
            >
              {t.documents.folderName}
            </label>
            <input
              id="folder-name-input"
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.documents.folderName}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold/60 transition"
              maxLength={100}
              data-ocid="documents.folder_name_input"
              disabled={isCreating}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onCancel}
              disabled={isCreating}
              className="rounded-full"
              data-ocid="documents.create_folder_cancel"
            >
              {t.documents.cancel}
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!name.trim() || isCreating}
              className="bg-gold hover:bg-gold/90 text-black font-sans rounded-full"
              data-ocid="documents.create_folder_confirm"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  {t.documents.creating}
                </>
              ) : (
                t.documents.createFolder
              )}
            </Button>
          </div>
        </form>
      </div>
    </dialog>
  );
}

// ─── Extended actor type ───────────────────────────────────────────────────────

interface ExtendedActor {
  getMyStorageUsed(): Promise<bigint>;
  setGuestDocumentUploadPermission(
    allowed: boolean,
  ): Promise<{ __kind__: "ok"; ok: null } | { __kind__: "err"; err: string }>;
  getGuestDocumentUploadPermission(): Promise<boolean>;
  uploadDocumentWithData(
    fileName: string,
    fileData: Uint8Array,
    mimeType: string,
    isPublic: boolean,
    parentFolderId: string | null,
  ): Promise<
    { __kind__: "ok"; ok: DocumentRecord } | { __kind__: "err"; err: string }
  >;
  getDocumentData(docId: string): Promise<
    | {
        __kind__: "ok";
        ok: { data: Uint8Array; mimeType: string; fileName: string };
      }
    | { __kind__: "err"; err: string }
  >;
  listMyDocuments(parentFolderId: string | null): Promise<DocumentRecord[]>;
  listMyFolders(parentFolderId: string | null): Promise<FolderRecord[]>;
  setDocumentPublic(
    documentId: string,
    isPublic: boolean,
  ): Promise<{ __kind__: "ok"; ok: null } | { __kind__: "err"; err: string }>;
  deleteDocument(
    documentId: string,
  ): Promise<{ __kind__: "ok"; ok: null } | { __kind__: "err"; err: string }>;
  createFolder(
    name: string,
    parentFolderId: string | null,
  ): Promise<{ __kind__: "ok"; ok: string } | { __kind__: "err"; err: string }>;
  deleteFolder(
    folderId: string,
  ): Promise<{ __kind__: "ok"; ok: string } | { __kind__: "err"; err: string }>;
  moveDocument(
    docId: string,
    targetFolderId: string | null,
  ): Promise<{ __kind__: "ok"; ok: null } | { __kind__: "err"; err: string }>;
  moveFolder(
    folderId: string,
    targetFolderId: string | null,
  ): Promise<{ __kind__: "ok"; ok: null } | { __kind__: "err"; err: string }>;
  bulkMove(
    docIds: string[],
    folderIds: string[],
    targetFolderId: string | null,
  ): Promise<{ __kind__: "ok"; ok: null } | { __kind__: "err"; err: string }>;
}

// ─── Preview state types ──────────────────────────────────────────────────────

interface ImagePreviewState {
  url: string;
  fileName: string;
}

interface AudioPlayerState {
  docId: string;
  url: string;
  fileName: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function MyPagesDocuments({
  principalText,
  userName,
  userRole,
}: MyPagesDocumentsProps) {
  const { t } = useLanguage();
  const { actor, isFetching } = useTypedActor();
  const extActor = actor as unknown as ExtendedActor | null;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = userRole === "admin";
  const isGuest = userRole === "guest";

  // ─── Document / folder state ───────────────────────────────────────────────
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [folders, setFolders] = useState<FolderRecord[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([
    { id: null, name: t.documents.tab },
  ]);

  // ─── UI state ─────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [storageUsed, setStorageUsed] = useState<number>(0);
  const [guestUploadAllowed, setGuestUploadAllowed] = useState<boolean>(false);
  const [togglingGuestPerm, setTogglingGuestPerm] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [togglingPublicId, setTogglingPublicId] = useState<string | null>(null);
  const [deletingFolderId, setDeletingFolderId] = useState<string | null>(null);

  // ─── Folder create modal state ────────────────────────────────────────────
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  // ─── Preview state ────────────────────────────────────────────────────────
  const [imagePreview, setImagePreview] = useState<ImagePreviewState | null>(
    null,
  );
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [audioPlayer, setAudioPlayer] = useState<AudioPlayerState | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);

  // ─── Move file state ──────────────────────────────────────────────────────
  const [moveDoc, setMoveDoc] = useState<DocumentRecord | null>(null);
  const [isMoving, setIsMoving] = useState(false);

  // ─── Move folder state ────────────────────────────────────────────────────
  const [movingFolder, setMovingFolder] = useState<FolderRecord | null>(null);
  const [isMovingFolder, setIsMovingFolder] = useState(false);

  // ─── Multi-select state ────────────────────────────────────────────────────
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());
  const [selectedFolderIds, setSelectedFolderIds] = useState<Set<string>>(
    new Set(),
  );
  const [showBulkMoveModal, setShowBulkMoveModal] = useState(false);
  const [isBulkMoving, setIsBulkMoving] = useState(false);

  void principalText;
  void userName;

  // Revoke blob URLs on unmount
  const imageUrlRef = useRef<string | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (imageUrlRef.current) URL.revokeObjectURL(imageUrlRef.current);
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    };
  }, []);

  // ─── Load data (re-runs whenever currentFolderId changes) ─────────────────

  useEffect(() => {
    if (!extActor || isFetching) return;
    let cancelled = false;

    const loadAll = async () => {
      setLoading(true);
      try {
        const [docs, folderList, storageBytes, guestPerm] = await Promise.all([
          extActor.listMyDocuments(currentFolderId),
          extActor.listMyFolders(currentFolderId),
          extActor.getMyStorageUsed().catch(() => BigInt(0)),
          extActor.getGuestDocumentUploadPermission().catch(() => false),
        ]);
        if (!cancelled) {
          setDocuments(docs);
          setFolders(folderList);
          setStorageUsed(Number(storageBytes));
          setGuestUploadAllowed(guestPerm);
        }
      } catch {
        // silently ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadAll();
    return () => {
      cancelled = true;
    };
  }, [extActor, isFetching, currentFolderId]);

  const refreshStorage = async () => {
    if (!extActor) return;
    try {
      const bytes = await extActor.getMyStorageUsed();
      setStorageUsed(Number(bytes));
    } catch {
      // ignore
    }
  };

  const refreshContents = useCallback(async () => {
    if (!extActor) return;
    try {
      const [docs, folderList] = await Promise.all([
        extActor.listMyDocuments(currentFolderId),
        extActor.listMyFolders(currentFolderId),
      ]);
      setDocuments(docs);
      setFolders(folderList);
    } catch {
      // ignore
    }
  }, [extActor, currentFolderId]);

  // ─── Navigation ───────────────────────────────────────────────────────────

  const navigateIntoFolder = useCallback((folder: FolderRecord) => {
    setCurrentFolderId(folder.id);
    setBreadcrumbs((prev) => [...prev, { id: folder.id, name: folder.name }]);
    setAudioPlayer(null);
    setImagePreview(null);
  }, []);

  const navigateToBreadcrumb = useCallback((crumb: Breadcrumb) => {
    setCurrentFolderId(crumb.id);
    setBreadcrumbs((prev) => {
      const idx = prev.findIndex((b) => b.id === crumb.id);
      return idx >= 0 ? prev.slice(0, idx + 1) : prev;
    });
    setAudioPlayer(null);
    setImagePreview(null);
  }, []);

  // ─── Create folder ────────────────────────────────────────────────────────

  const handleCreateFolder = async (name: string) => {
    if (!extActor) return;
    setIsCreatingFolder(true);
    try {
      const result = await extActor.createFolder(name, currentFolderId);
      if ("ok" in result) {
        toast.success(t.documents.folderCreated);
        setShowCreateFolderModal(false);
        await refreshContents();
      } else {
        toast.error(`${t.common.error}: ${result.err}`);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(`${t.common.error}: ${msg}`);
    } finally {
      setIsCreatingFolder(false);
    }
  };

  // ─── Delete folder ────────────────────────────────────────────────────────

  const handleDeleteFolder = async (folder: FolderRecord) => {
    if (!extActor) return;
    if (!window.confirm(t.documents.deleteFolderConfirm)) return;
    setDeletingFolderId(folder.id);
    try {
      const result = await extActor.deleteFolder(folder.id);
      if ("ok" in result) {
        toast.success(t.documents.folderDeleted);
        await refreshContents();
      } else {
        toast.error(`${t.common.error}: ${result.err}`);
      }
    } catch {
      toast.error(t.common.error);
    } finally {
      setDeletingFolderId(null);
    }
  };

  // ─── Validation ───────────────────────────────────────────────────────────

  const validateFile = (file: File): string | null => {
    const ext = `.${file.name.split(".").pop()?.toLowerCase()}`;
    if (
      !ALLOWED_EXTENSIONS.includes(ext) &&
      !ALLOWED_TYPES.includes(file.type)
    ) {
      return t.documents.fileTypeError;
    }
    if (file.size > MAX_FILE_SIZE) {
      return t.documents.fileSizeError;
    }
    if (storageUsed + file.size > MAX_TOTAL_STORAGE) {
      const remainingMB = formatMB(
        Math.max(0, MAX_TOTAL_STORAGE - storageUsed),
      );
      return t.documents.storageLimitError.replace("{remaining}", remainingMB);
    }
    return null;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setFileError(null);
    setSelectedFile(null);
    if (!file) return;
    const err = validateFile(file);
    if (err) {
      setFileError(err);
      return;
    }
    setSelectedFile(file);
  };

  // ─── Upload ───────────────────────────────────────────────────────────────

  const handleUpload = async () => {
    if (!extActor || !selectedFile) return;
    setUploading(true);
    setFileError(null);

    const err = validateFile(selectedFile);
    if (err) {
      setFileError(err);
      setUploading(false);
      return;
    }

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const byteArray = new Uint8Array(arrayBuffer);
      const mime = mimeForFile(selectedFile);

      const result = await extActor.uploadDocumentWithData(
        selectedFile.name,
        byteArray,
        mime,
        false,
        currentFolderId,
      );

      if ("ok" in result) {
        toast.success(t.documents.uploadSuccess);
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        await Promise.all([refreshContents(), refreshStorage()]);
      } else {
        toast.error(`${t.documents.uploadError}: ${result.err}`);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(`${t.documents.uploadError}: ${msg}`);
    } finally {
      setUploading(false);
    }
  };

  // ─── Download ─────────────────────────────────────────────────────────────

  const handleDownload = useCallback(
    async (doc: DocumentRecord) => {
      if (!extActor) return;
      setDownloadingId(doc.id);
      try {
        const result = await extActor.getDocumentData(doc.id);
        if ("ok" in result) {
          const { data, mimeType, fileName } = result.ok;
          const bytes = new Uint8Array(data);
          const blob = new Blob([bytes], { type: mimeType });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        } else {
          toast.error(`${t.common.error}: ${result.err}`);
        }
      } catch {
        toast.error(t.common.error);
      } finally {
        setDownloadingId(null);
      }
    },
    [extActor, t],
  );

  // ─── Share ────────────────────────────────────────────────────────────────

  const handleShare = useCallback((doc: DocumentRecord) => {
    const link = `${window.location.origin}/#/documents/${doc.id}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopiedId(doc.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }, []);

  // ─── Toggle public/private ────────────────────────────────────────────────

  const handleTogglePublic = useCallback(
    async (doc: DocumentRecord) => {
      if (!extActor) return;
      setTogglingPublicId(doc.id);
      try {
        const newIsPublic = !doc.isPublic;
        const result = await extActor.setDocumentPublic(doc.id, newIsPublic);
        if ("ok" in result) {
          setDocuments((prev) =>
            prev.map((d) =>
              d.id === doc.id ? { ...d, isPublic: newIsPublic } : d,
            ),
          );
        } else {
          toast.error(`${t.common.error}: ${result.err}`);
        }
      } catch {
        toast.error(t.common.error);
      } finally {
        setTogglingPublicId(null);
      }
    },
    [extActor, t],
  );

  // ─── Image preview ────────────────────────────────────────────────────────

  const handleImagePreview = useCallback(
    async (doc: DocumentRecord) => {
      if (!extActor) return;
      setPreviewingId(doc.id);
      try {
        const result = await extActor.getDocumentData(doc.id);
        if ("ok" in result) {
          const { data, mimeType, fileName } = result.ok;
          const bytes = new Uint8Array(data);
          const blob = new Blob([bytes], { type: mimeType });
          if (imageUrlRef.current) URL.revokeObjectURL(imageUrlRef.current);
          const url = URL.createObjectURL(blob);
          imageUrlRef.current = url;
          setImagePreview({ url, fileName });
        } else {
          toast.error(`${t.common.error}: ${result.err}`);
        }
      } catch {
        toast.error(t.common.error);
      } finally {
        setPreviewingId(null);
      }
    },
    [extActor, t],
  );

  const handleCloseImagePreview = useCallback(() => {
    if (imageUrlRef.current) {
      URL.revokeObjectURL(imageUrlRef.current);
      imageUrlRef.current = null;
    }
    setImagePreview(null);
  }, []);

  // ─── Audio player ─────────────────────────────────────────────────────────

  const handleAudioPlay = useCallback(
    async (doc: DocumentRecord) => {
      if (!extActor) return;

      if (audioPlayer?.docId === doc.id) {
        if (audioUrlRef.current) {
          URL.revokeObjectURL(audioUrlRef.current);
          audioUrlRef.current = null;
        }
        setAudioPlayer(null);
        return;
      }

      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = null;
      }
      setAudioPlayer(null);

      setPlayingId(doc.id);
      try {
        const result = await extActor.getDocumentData(doc.id);
        if ("ok" in result) {
          const { data, mimeType, fileName } = result.ok;
          const bytes = new Uint8Array(data);
          const blob = new Blob([bytes], { type: mimeType });
          const url = URL.createObjectURL(blob);
          audioUrlRef.current = url;
          setAudioPlayer({ docId: doc.id, url, fileName });
        } else {
          toast.error(`${t.common.error}: ${result.err}`);
        }
      } catch {
        toast.error(t.common.error);
      } finally {
        setPlayingId(null);
      }
    },
    [extActor, t, audioPlayer],
  );

  const handleCloseAudioPlayer = useCallback(() => {
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    setAudioPlayer(null);
  }, []);

  // ─── Open file in new tab ─────────────────────────────────────────────────

  const handleOpenFile = useCallback(
    async (doc: DocumentRecord) => {
      if (!extActor) return;
      setDownloadingId(doc.id);
      try {
        const result = await extActor.getDocumentData(doc.id);
        if ("ok" in result) {
          const { data, mimeType } = result.ok;
          const bytes = new Uint8Array(data);
          const blob = new Blob([bytes], {
            type: mimeType || "application/octet-stream",
          });
          const url = URL.createObjectURL(blob);
          const tab = window.open(url, "_blank");
          // Revoke after a short delay to allow the new tab to load
          setTimeout(() => URL.revokeObjectURL(url), 10000);
          if (!tab) {
            // Pop-ups blocked — fall back to download
            await handleDownload(doc);
          }
        } else {
          toast.error(`${t.common.error}: ${result.err}`);
        }
      } catch {
        toast.error(t.common.error);
      } finally {
        setDownloadingId(null);
      }
    },
    [extActor, t, handleDownload],
  );

  // ─── Move file ────────────────────────────────────────────────────────────

  const loadFoldersForDialog = useCallback(
    async (parentId: string | null): Promise<FolderRecord[]> => {
      if (!extActor) return [];
      try {
        return await extActor.listMyFolders(parentId);
      } catch {
        return [];
      }
    },
    [extActor],
  );

  const handleOpenMove = useCallback((doc: DocumentRecord) => {
    setMoveDoc(doc);
  }, []);

  const handleMoveConfirm = useCallback(
    async (targetFolderId: string | null) => {
      if (!extActor || !moveDoc) return;
      setIsMoving(true);
      try {
        const result = await extActor.moveDocument(moveDoc.id, targetFolderId);
        if ("ok" in result) {
          toast.success(t.documents.moveSuccess);
          setMoveDoc(null);
          await refreshContents();
        } else {
          toast.error(`${t.documents.moveError}: ${result.err}`);
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        toast.error(`${t.documents.moveError}: ${msg}`);
      } finally {
        setIsMoving(false);
      }
    },
    [extActor, moveDoc, t, refreshContents],
  );

  // ─── Move folder ──────────────────────────────────────────────────────────

  const handleOpenMoveFolder = useCallback((folder: FolderRecord) => {
    setMovingFolder(folder);
  }, []);

  const handleMoveFolderConfirm = useCallback(
    async (targetFolderId: string | null) => {
      if (!extActor || !movingFolder) return;
      setIsMovingFolder(true);
      try {
        const result = await extActor.moveFolder(
          movingFolder.id,
          targetFolderId,
        );
        if ("ok" in result) {
          toast.success(t.documents.moveFolderSuccess);
          setMovingFolder(null);
          await refreshContents();
        } else {
          toast.error(`${t.documents.moveFolderError}: ${result.err}`);
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        toast.error(`${t.documents.moveFolderError}: ${msg}`);
      } finally {
        setIsMovingFolder(false);
      }
    },
    [extActor, movingFolder, t, refreshContents],
  );

  // ─── Multi-select helpers ─────────────────────────────────────────────────

  const totalSelected = selectedDocIds.size + selectedFolderIds.size;

  const handleToggleDocSelect = useCallback((docId: string) => {
    setSelectedDocIds((prev) => {
      const next = new Set(prev);
      if (next.has(docId)) next.delete(docId);
      else next.add(docId);
      return next;
    });
  }, []);

  const handleToggleFolderSelect = useCallback((folderId: string) => {
    setSelectedFolderIds((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(
    (checked: boolean) => {
      if (checked) {
        setSelectedDocIds(new Set(documents.map((d) => d.id)));
        setSelectedFolderIds(new Set(folders.map((f) => f.id)));
      } else {
        setSelectedDocIds(new Set());
        setSelectedFolderIds(new Set());
      }
    },
    [documents, folders],
  );

  const clearSelection = useCallback(() => {
    setSelectedDocIds(new Set());
    setSelectedFolderIds(new Set());
  }, []);

  // Clear selection on folder navigation
  const navigateIntoFolderWithClear = useCallback(
    (folder: FolderRecord) => {
      clearSelection();
      navigateIntoFolder(folder);
    },
    [clearSelection, navigateIntoFolder],
  );

  const navigateToBreadcrumbWithClear = useCallback(
    (crumb: Breadcrumb) => {
      clearSelection();
      navigateToBreadcrumb(crumb);
    },
    [clearSelection, navigateToBreadcrumb],
  );

  // ─── Bulk move ────────────────────────────────────────────────────────────

  const handleBulkMoveConfirm = useCallback(
    async (targetFolderId: string | null) => {
      if (!extActor) return;
      setIsBulkMoving(true);
      try {
        const docIds = Array.from(selectedDocIds);
        const folderIds = Array.from(selectedFolderIds);
        const result = await extActor.bulkMove(
          docIds,
          folderIds,
          targetFolderId,
        );
        if ("ok" in result) {
          const n = docIds.length + folderIds.length;
          toast.success(t.documents.bulkMoveSuccess.replace("{n}", String(n)));
          setShowBulkMoveModal(false);
          clearSelection();
          await refreshContents();
        } else {
          toast.error(`${t.documents.bulkMoveError}: ${result.err}`);
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        toast.error(`${t.documents.bulkMoveError}: ${msg}`);
      } finally {
        setIsBulkMoving(false);
      }
    },
    [
      extActor,
      selectedDocIds,
      selectedFolderIds,
      t,
      clearSelection,
      refreshContents,
    ],
  );

  // ─── Guest upload permission ──────────────────────────────────────────────
  const handleToggleGuestPermission = async () => {
    if (!extActor) return;
    setTogglingGuestPerm(true);
    try {
      const newVal = !guestUploadAllowed;
      const result = await extActor.setGuestDocumentUploadPermission(newVal);
      if ("ok" in result) {
        setGuestUploadAllowed(newVal);
        toast.success(
          newVal
            ? t.documents.guestUploadEnabled
            : t.documents.guestUploadDisabledMsg,
        );
      } else {
        toast.error(result.err);
      }
    } catch {
      toast.error(t.common.error);
    } finally {
      setTogglingGuestPerm(false);
    }
  };

  // ─── Derived: is the list empty? ──────────────────────────────────────────
  const isEmpty = documents.length === 0 && folders.length === 0;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6" data-ocid="documents.section">
      {/* Image preview modal */}
      {imagePreview && (
        <ImageModal
          url={imagePreview.url}
          fileName={imagePreview.fileName}
          onClose={handleCloseImagePreview}
        />
      )}

      {/* Create folder modal */}
      {showCreateFolderModal && (
        <CreateFolderModal
          onConfirm={handleCreateFolder}
          onCancel={() => setShowCreateFolderModal(false)}
          isCreating={isCreatingFolder}
        />
      )}

      {/* Move file modal */}
      {moveDoc && (
        <MoveModal
          itemName={moveDoc.fileName}
          itemType="file"
          excludeFolderId={null}
          initialFolderId={moveDoc.parentFolderId ?? null}
          loadFolders={loadFoldersForDialog}
          onConfirm={handleMoveConfirm}
          onCancel={() => setMoveDoc(null)}
          isMoving={isMoving}
        />
      )}

      {/* Move folder modal */}
      {movingFolder && (
        <MoveModal
          itemName={movingFolder.name}
          itemType="folder"
          excludeFolderId={movingFolder.id}
          initialFolderId={movingFolder.parentFolderId ?? null}
          loadFolders={loadFoldersForDialog}
          onConfirm={handleMoveFolderConfirm}
          onCancel={() => setMovingFolder(null)}
          isMoving={isMovingFolder}
        />
      )}

      {/* Bulk move modal */}
      {showBulkMoveModal && (
        <BulkMoveModal
          selectedCount={totalSelected}
          excludeFolderIds={Array.from(selectedFolderIds)}
          loadFolders={loadFoldersForDialog}
          onConfirm={handleBulkMoveConfirm}
          onCancel={() => setShowBulkMoveModal(false)}
          isMoving={isBulkMoving}
        />
      )}

      {/* Admin: guest upload permission toggle */}
      {isAdmin && (
        <Card className="border border-divider shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="font-serif text-base text-foreground flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-gold" />
              {t.documents.guestUploadToggleLabel}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Switch
                id="guest-upload-toggle"
                checked={guestUploadAllowed}
                onCheckedChange={handleToggleGuestPermission}
                disabled={togglingGuestPerm || loading}
                data-ocid="documents.guest_upload_toggle"
              />
              <Label
                htmlFor="guest-upload-toggle"
                className="text-sm text-muted-foreground cursor-pointer select-none"
              >
                {guestUploadAllowed ? (
                  <span className="text-emerald-600 font-medium">
                    {t.documents.guestUploadEnabled}
                  </span>
                ) : (
                  <span>{t.documents.guestUploadDisabledMsg}</span>
                )}
              </Label>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload section */}
      <Card className="border border-divider shadow-card">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="font-serif text-lg text-foreground flex items-center gap-2">
              <Upload className="w-5 h-5 text-gold" />
              {t.documents.uploadTitle}
            </CardTitle>
            {/* New Folder button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCreateFolderModal(true)}
              className="rounded-full border-gold/40 text-foreground hover:bg-gold/10 gap-1.5"
              data-ocid="documents.new_folder_button"
            >
              <FolderPlus className="w-4 h-4 text-gold" />
              {t.documents.newFolder}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!loading && <StorageBar usedBytes={storageUsed} />}

          {isGuest && !guestUploadAllowed ? (
            <div
              className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800/30 dark:bg-amber-900/20 dark:text-amber-300"
              data-ocid="documents.guest_blocked"
              role="alert"
            >
              {t.documents.guestUploadDisabled}
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-start gap-3">
              <div className="flex-1 w-full">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.doc,.jpg,.jpeg,.png,.gif,.webp,.svg,.mp3,.wav,.ogg,.flac,.aac,.m4a,.mp4,.mov,.avi,.webm,.mkv,.mpeg,.mpg"
                  onChange={handleFileChange}
                  className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gold/15 file:text-foreground hover:file:bg-gold/25 cursor-pointer"
                  data-ocid="documents.file_input"
                  aria-label={t.documents.uploadTitle}
                />
                {selectedFile && !fileError && (
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {selectedFile.name} ({(selectedFile.size / 1024).toFixed(0)}{" "}
                    KB)
                  </p>
                )}
                {fileError && (
                  <p
                    className="mt-1.5 text-xs text-red-500 font-medium"
                    role="alert"
                  >
                    {fileError}
                  </p>
                )}
              </div>
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || uploading || isFetching}
                className="bg-gold hover:bg-gold/90 text-black font-sans rounded-full px-5 shrink-0"
                data-ocid="documents.upload_button"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t.common.loading}
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    {t.documents.uploadButton}
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Documents & folders table */}
      <Card className="border border-divider shadow-card">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="font-serif text-lg text-foreground flex items-center gap-2">
              <FileText className="w-5 h-5 text-gold" />
              {t.documents.tab}
            </CardTitle>
            {/* Bulk move button — shown when items are selected */}
            {totalSelected > 0 && (
              <Button
                size="sm"
                onClick={() => setShowBulkMoveModal(true)}
                className="bg-gold hover:bg-gold/90 text-black font-sans rounded-full gap-1.5"
                data-ocid="documents.bulk_move_button"
              >
                <FolderInput className="w-4 h-4" />
                {t.documents.bulkMoveButton.replace(
                  "{n}",
                  String(totalSelected),
                )}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Breadcrumb navigation */}
          {breadcrumbs.length > 1 && (
            <nav
              className="flex items-center gap-1 mb-4 flex-wrap"
              aria-label="breadcrumb"
              data-ocid="documents.breadcrumbs"
            >
              {breadcrumbs.map((crumb, idx) => {
                const isLast = idx === breadcrumbs.length - 1;
                return (
                  <span
                    key={crumb.id ?? "root"}
                    className="flex items-center gap-1"
                  >
                    {idx > 0 && (
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
                    )}
                    {isLast ? (
                      <span className="text-xs font-semibold text-foreground truncate max-w-[160px]">
                        {crumb.name}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => navigateToBreadcrumbWithClear(crumb)}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors truncate max-w-[120px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold rounded"
                        data-ocid="documents.breadcrumb_link"
                      >
                        {crumb.name}
                      </button>
                    )}
                  </span>
                );
              })}
            </nav>
          )}

          {loading ? (
            <div className="space-y-3" data-ocid="documents.loading_state">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : isEmpty ? (
            <div
              className="flex flex-col items-center justify-center py-12 gap-3 text-center"
              data-ocid="documents.empty_state"
            >
              <FileText className="w-10 h-10 text-muted-foreground/40" />
              <p className="font-sans text-sm text-muted-foreground">
                {t.documents.noDocuments}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm font-sans">
                <thead>
                  <tr className="border-b border-divider">
                    {/* Select-all checkbox */}
                    <th
                      className="py-3 pr-2 w-8 text-left"
                      aria-label="Select all"
                    >
                      <input
                        type="checkbox"
                        checked={
                          totalSelected > 0 &&
                          totalSelected === documents.length + folders.length
                        }
                        ref={(el) => {
                          if (el) {
                            el.indeterminate =
                              totalSelected > 0 &&
                              totalSelected < documents.length + folders.length;
                          }
                        }}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="w-4 h-4 accent-gold cursor-pointer rounded"
                        data-ocid="documents.select_all"
                        aria-label="Select all items"
                      />
                    </th>
                    <th className="text-left py-3 pr-4 font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                      {t.documents.fileName}
                    </th>
                    <th className="text-left py-3 pr-4 font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                      {t.documents.fileSize}
                    </th>
                    <th className="text-right py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                      {t.documents.actions}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {/* ── Folder rows (shown before files) ── */}
                  {folders.map((folder) => (
                    <tr
                      key={`folder-${folder.id}`}
                      className={`border-b border-divider/50 hover:bg-gold/5 transition-colors ${
                        selectedFolderIds.has(folder.id)
                          ? "bg-gold/10"
                          : "bg-muted/10"
                      }`}
                      data-ocid="documents.folder_row"
                    >
                      {/* Folder checkbox */}
                      <td className="py-3 pr-2 w-8">
                        <input
                          type="checkbox"
                          checked={selectedFolderIds.has(folder.id)}
                          onChange={() => handleToggleFolderSelect(folder.id)}
                          className="w-4 h-4 accent-gold cursor-pointer rounded"
                          data-ocid="documents.folder_checkbox"
                          aria-label={`Select folder ${folder.name}`}
                        />
                      </td>

                      {/* Folder name */}
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2 min-w-0">
                          <FolderOpen className="w-4 h-4 text-gold shrink-0" />
                          <button
                            type="button"
                            className="truncate max-w-[200px] font-medium text-foreground cursor-pointer hover:underline hover:text-gold transition-colors text-left bg-transparent border-0 p-0"
                            title={folder.name}
                            onClick={() => navigateIntoFolderWithClear(folder)}
                            data-ocid="documents.folder_name_link"
                            aria-label={`${t.documents.openFolder} ${folder.name}`}
                          >
                            {folder.name}
                          </button>
                        </div>
                      </td>

                      {/* No size for folders */}
                      <td className="py-3 pr-4 text-muted-foreground">—</td>

                      {/* Folder actions */}
                      <td className="py-3 text-right">
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          {/* Open button */}
                          <button
                            type="button"
                            onClick={() => navigateIntoFolderWithClear(folder)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-gold/15 hover:bg-gold/25 text-foreground transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold"
                            data-ocid="documents.folder_open"
                            aria-label={`${t.documents.openFolder} ${folder.name}`}
                          >
                            <FolderOpen className="w-3.5 h-3.5" />
                            {t.documents.openFolder}
                          </button>

                          {/* Delete folder button */}
                          <button
                            type="button"
                            onClick={() => handleDeleteFolder(folder)}
                            disabled={deletingFolderId === folder.id}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900/20 dark:hover:bg-red-900/40 dark:text-red-400 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-400 disabled:opacity-50"
                            data-ocid="documents.folder_delete"
                            aria-label={`${t.documents.deleteFolder} ${folder.name}`}
                          >
                            {deletingFolderId === folder.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                            {t.documents.deleteFolder}
                          </button>

                          {/* Move folder button */}
                          <button
                            type="button"
                            onClick={() => handleOpenMoveFolder(folder)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-muted/50 hover:bg-muted transition-colors text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold"
                            data-ocid="documents.folder_move"
                            aria-label={`${t.documents.moveFolder} ${folder.name}`}
                          >
                            <FolderInput className="w-3.5 h-3.5" />
                            {t.documents.moveFolder}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {/* ── File rows ── */}
                  {documents.map((doc) => {
                    const docWithSize = doc as DocumentRecord & {
                      fileSize?: bigint;
                    };
                    const isImage = doc.mimeType?.startsWith("image/");
                    const isAudio = doc.mimeType?.startsWith("audio/");
                    const isAudioActive = audioPlayer?.docId === doc.id;

                    return (
                      <React.Fragment key={doc.id}>
                        <tr
                          className={`border-b border-divider/50 hover:bg-muted/20 transition-colors ${
                            selectedDocIds.has(doc.id) ? "bg-gold/5" : ""
                          }`}
                          data-ocid="documents.row"
                        >
                          {/* File checkbox */}
                          <td className="py-3 pr-2 w-8">
                            <input
                              type="checkbox"
                              checked={selectedDocIds.has(doc.id)}
                              onChange={() => handleToggleDocSelect(doc.id)}
                              className="w-4 h-4 accent-gold cursor-pointer rounded"
                              data-ocid="documents.file_checkbox"
                              aria-label={`Select file ${doc.fileName}`}
                            />
                          </td>

                          {/* Filename */}
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-2 min-w-0">
                              <FileText className="w-4 h-4 text-gold shrink-0" />
                              <button
                                type="button"
                                className="truncate max-w-[200px] text-left cursor-pointer hover:underline hover:text-gold transition-colors bg-transparent border-0 p-0"
                                title={doc.fileName}
                                onClick={() => {
                                  if (isImage) {
                                    handleImagePreview(doc);
                                  } else if (isAudio) {
                                    handleAudioPlay(doc);
                                  } else {
                                    handleOpenFile(doc);
                                  }
                                }}
                                data-ocid="documents.filename_link"
                                aria-label={`${doc.fileName}`}
                              >
                                {doc.fileName}
                              </button>
                            </div>
                          </td>

                          {/* Size */}
                          <td className="py-3 pr-4 text-muted-foreground whitespace-nowrap">
                            {docWithSize.fileSize != null
                              ? `${(Number(docWithSize.fileSize) / 1024).toFixed(0)} KB`
                              : "—"}
                          </td>

                          {/* Actions */}
                          <td className="py-3 text-right">
                            <div className="inline-flex items-center gap-1.5 justify-end flex-wrap">
                              {/* Image preview button */}
                              {isImage && (
                                <button
                                  type="button"
                                  onClick={() => handleImagePreview(doc)}
                                  disabled={previewingId === doc.id}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-gold/15 hover:bg-gold/25 text-foreground transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold disabled:opacity-50"
                                  data-ocid="documents.preview_button"
                                  aria-label={`${t.documents.preview} ${doc.fileName}`}
                                >
                                  {previewingId === doc.id ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Eye className="w-3.5 h-3.5" />
                                  )}
                                  {t.documents.preview}
                                </button>
                              )}

                              {/* Audio play button */}
                              {isAudio && (
                                <button
                                  type="button"
                                  onClick={() => handleAudioPlay(doc)}
                                  disabled={playingId === doc.id}
                                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold disabled:opacity-50 ${
                                    isAudioActive
                                      ? "bg-gold/30 text-foreground"
                                      : "bg-gold/15 hover:bg-gold/25 text-foreground"
                                  }`}
                                  data-ocid="documents.play_button"
                                  aria-label={`${t.documents.play} ${doc.fileName}`}
                                  aria-pressed={isAudioActive}
                                >
                                  {playingId === doc.id ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Music className="w-3.5 h-3.5" />
                                  )}
                                  {isAudioActive
                                    ? t.documents.close
                                    : t.documents.play}
                                </button>
                              )}

                              {/* Download button */}
                              <button
                                type="button"
                                onClick={() => handleDownload(doc)}
                                disabled={downloadingId === doc.id}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-muted/50 hover:bg-muted transition-colors text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold disabled:opacity-50"
                                data-ocid="documents.download_link"
                                aria-label={`${t.documents.download} ${doc.fileName}`}
                              >
                                {downloadingId === doc.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Download className="w-3.5 h-3.5" />
                                )}
                                {t.documents.download}
                              </button>

                              {/* Share button */}
                              <button
                                type="button"
                                onClick={() => handleShare(doc)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-muted/50 hover:bg-muted transition-colors text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold"
                                data-ocid="documents.share_button"
                                aria-label={`${t.documents.share} ${doc.fileName}`}
                              >
                                <Link className="w-3.5 h-3.5" />
                                {copiedId === doc.id
                                  ? t.documents.copied
                                  : t.documents.share}
                              </button>

                              {/* Public/Private toggle */}
                              <button
                                type="button"
                                onClick={() => handleTogglePublic(doc)}
                                disabled={togglingPublicId === doc.id}
                                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold disabled:opacity-50 ${
                                  doc.isPublic
                                    ? "bg-emerald-100 hover:bg-emerald-200 text-emerald-800 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/50 dark:text-emerald-300"
                                    : "bg-muted/50 hover:bg-muted text-foreground"
                                }`}
                                data-ocid="documents.public_toggle"
                                aria-label={`${doc.isPublic ? t.documents.public : t.documents.private} — ${doc.fileName}`}
                                aria-pressed={doc.isPublic}
                              >
                                {togglingPublicId === doc.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : doc.isPublic ? (
                                  <Globe className="w-3.5 h-3.5" />
                                ) : (
                                  <Lock className="w-3.5 h-3.5" />
                                )}
                                {doc.isPublic
                                  ? t.documents.public
                                  : t.documents.private}
                              </button>

                              {/* Move file button */}
                              <button
                                type="button"
                                onClick={() => handleOpenMove(doc)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-muted/50 hover:bg-muted transition-colors text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold"
                                data-ocid="documents.move_button"
                                aria-label={`${t.documents.moveFile} ${doc.fileName}`}
                              >
                                <FolderInput className="w-3.5 h-3.5" />
                                {t.documents.moveFile}
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Inline audio player row */}
                        {isAudioActive && audioPlayer && (
                          <AudioPlayerRow
                            key={`audio-${doc.id}`}
                            url={audioPlayer.url}
                            fileName={audioPlayer.fileName}
                            onClose={handleCloseAudioPlayer}
                          />
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
