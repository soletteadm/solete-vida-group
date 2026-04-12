import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useTypedActor } from "@/hooks/useTypedActor";
import { useLanguage } from "@/i18n/LanguageContext";
import {
  Download,
  Eye,
  FileText,
  Globe,
  Link,
  Loader2,
  Lock,
  Music,
  Settings2,
  Upload,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { DocumentRecord } from "../backend.d";

// ─── MIME helpers ─────────────────────────────────────────────────────────────

function mimeForFile(file: File): string {
  const ext = file.name.split(".").pop()?.toLowerCase();
  // Documents
  if (ext === "pdf") return "application/pdf";
  if (ext === "docx")
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (ext === "doc") return "application/msword";
  // Images
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "png") return "image/png";
  if (ext === "gif") return "image/gif";
  if (ext === "webp") return "image/webp";
  if (ext === "svg") return "image/svg+xml";
  // Audio
  if (ext === "mp3") return "audio/mpeg";
  if (ext === "wav") return "audio/wav";
  if (ext === "ogg") return "audio/ogg";
  if (ext === "flac") return "audio/flac";
  if (ext === "aac") return "audio/aac";
  if (ext === "m4a") return "audio/x-m4a";
  // Video
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

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB per file
const MAX_TOTAL_STORAGE = 100 * 1024 * 1024; // 100 MB total
const ALLOWED_EXTENSIONS = [
  // Documents
  ".pdf",
  ".docx",
  ".doc",
  // Images
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".svg",
  // Audio
  ".mp3",
  ".wav",
  ".ogg",
  ".flac",
  ".aac",
  ".m4a",
  // Video
  ".mp4",
  ".mov",
  ".avi",
  ".webm",
  ".mkv",
  ".mpeg",
  ".mpg",
];
const ALLOWED_TYPES = [
  // Documents
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  // Images
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  // Audio
  "audio/mpeg",
  "audio/wav",
  "audio/ogg",
  "audio/flac",
  "audio/aac",
  "audio/x-m4a",
  // Video
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

// ─── Image preview modal ──────────────────────────────────────────────────────

interface ImageModalProps {
  url: string;
  fileName: string;
  onClose: () => void;
}

function ImageModal({ url, fileName, onClose }: ImageModalProps) {
  const { t } = useLanguage();

  // Close on Escape key
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
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute -top-2 -right-2 z-10 w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          aria-label={t.documents.close}
          data-ocid="documents.image_modal_close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Image */}
        <div className="rounded-xl overflow-hidden border border-border shadow-xl bg-card max-h-[80vh]">
          <img
            src={url}
            alt={fileName}
            className="max-w-full max-h-[80vh] object-contain block"
          />
        </div>

        {/* Caption */}
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
      <td colSpan={3} className="px-3 pb-3 pt-1">
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
  listMyDocuments(): Promise<DocumentRecord[]>;
  setDocumentPublic(
    documentId: string,
    isPublic: boolean,
  ): Promise<{ __kind__: "ok"; ok: null } | { __kind__: "err"; err: string }>;
  deleteDocument(
    documentId: string,
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

  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
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

  // Preview state
  const [imagePreview, setImagePreview] = useState<ImagePreviewState | null>(
    null,
  );
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [audioPlayer, setAudioPlayer] = useState<AudioPlayerState | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);

  // Silence unused warnings
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

  // ─── Load data ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!extActor || isFetching) return;
    let cancelled = false;

    const loadAll = async () => {
      setLoading(true);
      try {
        const [docs, storageBytes, guestPerm] = await Promise.all([
          extActor.listMyDocuments(),
          extActor.getMyStorageUsed().catch(() => BigInt(0)),
          extActor.getGuestDocumentUploadPermission().catch(() => false),
        ]);
        if (!cancelled) {
          setDocuments(docs);
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
  }, [extActor, isFetching]);

  const refreshStorage = async () => {
    if (!extActor) return;
    try {
      const bytes = await extActor.getMyStorageUsed();
      setStorageUsed(Number(bytes));
    } catch {
      // ignore
    }
  };

  const fetchDocuments = async () => {
    if (!extActor) return;
    try {
      const docs = await extActor.listMyDocuments();
      setDocuments(docs);
    } catch {
      // ignore
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

  // ─── Upload — reads raw bytes and stores directly in canister ─────────────

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
      // 1. Read file as raw bytes
      const arrayBuffer = await selectedFile.arrayBuffer();
      const byteArray = new Uint8Array(arrayBuffer);

      // 2. Determine correct MIME type
      const mime = mimeForFile(selectedFile);

      // 3. Upload directly to canister — no external blob storage
      const result = await extActor.uploadDocumentWithData(
        selectedFile.name,
        byteArray,
        mime,
        false, // default to private
      );

      if ("ok" in result) {
        toast.success(t.documents.uploadSuccess);
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        await Promise.all([fetchDocuments(), refreshStorage()]);
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

  // ─── Download — fetches raw bytes from canister and triggers browser dl ───

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

  // ─── Share — copies share link to clipboard ───────────────────────────────

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

  // ─── Image preview — lazy fetch on click ──────────────────────────────────

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
          // Revoke previous image URL if any
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

  // ─── Audio player — lazy fetch on click ───────────────────────────────────

  const handleAudioPlay = useCallback(
    async (doc: DocumentRecord) => {
      if (!extActor) return;

      // If already playing this doc, close it
      if (audioPlayer?.docId === doc.id) {
        if (audioUrlRef.current) {
          URL.revokeObjectURL(audioUrlRef.current);
          audioUrlRef.current = null;
        }
        setAudioPlayer(null);
        return;
      }

      // Revoke previous audio URL
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
          <CardTitle className="font-serif text-lg text-foreground flex items-center gap-2">
            <Upload className="w-5 h-5 text-gold" />
            {t.documents.uploadTitle}
          </CardTitle>
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

      {/* Documents table */}
      <Card className="border border-divider shadow-card">
        <CardHeader>
          <CardTitle className="font-serif text-lg text-foreground flex items-center gap-2">
            <FileText className="w-5 h-5 text-gold" />
            {t.documents.tab}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3" data-ocid="documents.loading_state">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : documents.length === 0 ? (
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
                  {documents.map((doc) => {
                    const docWithSize = doc as DocumentRecord & {
                      fileSize?: bigint;
                    };
                    const isImage = doc.mimeType?.startsWith("image/");
                    const isAudio = doc.mimeType?.startsWith("audio/");
                    const isAudioActive = audioPlayer?.docId === doc.id;

                    return (
                      <>
                        <tr
                          key={doc.id}
                          className="border-b border-divider/50 hover:bg-muted/20 transition-colors"
                          data-ocid="documents.row"
                        >
                          {/* Filnamn */}
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-2 min-w-0">
                              <FileText className="w-4 h-4 text-gold shrink-0" />
                              <span
                                className="truncate max-w-[200px]"
                                title={doc.fileName}
                              >
                                {doc.fileName}
                              </span>
                            </div>
                          </td>

                          {/* Storlek */}
                          <td className="py-3 pr-4 text-muted-foreground whitespace-nowrap">
                            {docWithSize.fileSize != null
                              ? `${(Number(docWithSize.fileSize) / 1024).toFixed(0)} KB`
                              : "—"}
                          </td>

                          {/* Åtgärder */}
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

                              {/* Public/Private toggle button */}
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
                            </div>
                          </td>
                        </tr>

                        {/* Inline audio player row — shown below the doc row when active */}
                        {isAudioActive && audioPlayer && (
                          <AudioPlayerRow
                            key={`audio-${doc.id}`}
                            url={audioPlayer.url}
                            fileName={audioPlayer.fileName}
                            onClose={handleCloseAudioPlayer}
                          />
                        )}
                      </>
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
