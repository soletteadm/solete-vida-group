import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useTypedActor } from "@/hooks/useTypedActor";
import { useLanguage } from "@/i18n/LanguageContext";
import {
  Check,
  Clipboard,
  Download,
  FileText,
  Loader2,
  Settings2,
  Trash2,
  Upload,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { DocumentRecord } from "../backend.d";

async function downloadFile(
  filePath: string,
  fileName: string,
  mimeType: string,
): Promise<void> {
  try {
    const response = await fetch(filePath);
    const arrayBuffer = await response.arrayBuffer();
    // Always use the passed-in mimeType — never trust response content-type headers
    // This ensures .docx/.doc are treated as Word docs, not HTML
    const forcedMime =
      mimeType && mimeType !== "application/octet-stream"
        ? mimeType
        : "application/octet-stream";
    const objectUrl = URL.createObjectURL(
      new Blob([arrayBuffer], { type: forcedMime }),
    );
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(objectUrl);
  } catch {
    // fallback: open in new tab
    window.open(filePath, "_blank", "noopener,noreferrer");
  }
}

interface MyPagesDocumentsProps {
  principalText: string | null;
  userName: string;
  userRole: "admin" | "user" | "guest";
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB per file
const MAX_TOTAL_STORAGE = 100 * 1024 * 1024; // 100 MB total
const ALLOWED_EXTENSIONS = [".pdf", ".docx", ".doc"];
const ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
];

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function formatDate(ts: bigint): string {
  const ms = Number(ts) / 1_000_000;
  return new Date(ms).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatMB(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(1);
}

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

// Extended actor type for methods not yet in generated bindings
interface ExtendedActor {
  getMyStorageUsed(): Promise<bigint>;
  setGuestDocumentUploadPermission(
    allowed: boolean,
  ): Promise<{ __kind__: "ok"; ok: null } | { __kind__: "err"; err: string }>;
  getGuestDocumentUploadPermission(): Promise<boolean>;
  uploadDocument(
    fileName: string,
    filePath: string,
    mimeType: string,
    isPublic: boolean,
    fileSize: bigint,
  ): Promise<{ __kind__: "ok"; ok: string } | { __kind__: "err"; err: string }>;
  listMyDocuments(): Promise<DocumentRecord[]>;
  setDocumentPublic(
    documentId: string,
    isPublic: boolean,
  ): Promise<{ __kind__: "ok"; ok: null } | { __kind__: "err"; err: string }>;
  deleteDocument(
    documentId: string,
  ): Promise<{ __kind__: "ok"; ok: null } | { __kind__: "err"; err: string }>;
}

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
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Storage tracking
  const [storageUsed, setStorageUsed] = useState<number>(0);

  // Guest upload permission (admin can toggle)
  const [guestUploadAllowed, setGuestUploadAllowed] = useState<boolean>(false);
  const [togglingGuestPerm, setTogglingGuestPerm] = useState(false);

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
    // Storage limit check
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

  const handleUpload = async () => {
    if (!extActor || !selectedFile) return;
    setUploading(true);
    setFileError(null);

    // Re-validate at upload time in case storage changed
    const err = validateFile(selectedFile);
    if (err) {
      setFileError(err);
      setUploading(false);
      return;
    }

    try {
      const ownerName = userName || principalText || "unknown";
      const sanitized = sanitizeFileName(selectedFile.name);
      const filePath = `documents/public/${ownerName}/${sanitized}`;
      const mimeType = selectedFile.type || "application/octet-stream";

      const result = await extActor.uploadDocument(
        selectedFile.name,
        filePath,
        mimeType,
        false, // default to private
        BigInt(selectedFile.size),
      );

      if ("ok" in result) {
        toast.success(t.documents.uploadSuccess);
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        await Promise.all([fetchDocuments(), refreshStorage()]);
      } else {
        toast.error(`${t.documents.uploadError}: ${result.err}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`${t.documents.uploadError}: ${msg}`);
    } finally {
      setUploading(false);
    }
  };

  const handleTogglePublic = async (doc: DocumentRecord) => {
    if (!extActor) return;
    setTogglingId(doc.id);
    try {
      const result = await extActor.setDocumentPublic(doc.id, !doc.isPublic);
      if ("ok" in result) {
        setDocuments((prev) =>
          prev.map((d) =>
            d.id === doc.id ? { ...d, isPublic: !doc.isPublic } : d,
          ),
        );
      } else {
        toast.error(result.err);
      }
    } catch {
      toast.error(t.common.error);
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (docId: string) => {
    if (!extActor) return;
    setDeletingId(docId);
    try {
      const result = await extActor.deleteDocument(docId);
      if ("ok" in result) {
        toast.success(t.documents.deleteSuccess);
        setDocuments((prev) => prev.filter((d) => d.id !== docId));
        await refreshStorage();
      } else {
        toast.error(`${t.documents.deleteError}: ${result.err}`);
      }
    } catch {
      toast.error(t.documents.deleteError);
    } finally {
      setDeletingId(null);
    }
  };

  const handleShare = async (doc: DocumentRecord) => {
    try {
      // Build the shareable URL: use the filePath as the storage gateway URL
      // If it's a relative path, prepend the origin
      const shareUrl = doc.filePath.startsWith("http")
        ? doc.filePath
        : `${window.location.origin}/${doc.filePath.replace(/^\//, "")}`;
      await navigator.clipboard.writeText(shareUrl);
      setCopiedId(doc.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error(t.common.error);
    }
  };

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

  return (
    <div className="space-y-6" data-ocid="documents.section">
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
          {/* Storage bar */}
          {!loading && <StorageBar usedBytes={storageUsed} />}

          {/* Guest blocked message */}
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
                  accept=".pdf,.docx,.doc"
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
                    <th className="text-left py-3 pr-4 font-semibold text-muted-foreground text-xs uppercase tracking-wide hidden sm:table-cell">
                      {t.documents.uploadDate}
                    </th>
                    <th className="text-left py-3 pr-4 font-semibold text-muted-foreground text-xs uppercase tracking-wide hidden sm:table-cell">
                      {t.documents.fileSize}
                    </th>
                    <th className="text-left py-3 pr-4 font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                      {t.documents.public}
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
                    return (
                      <tr
                        key={doc.id}
                        className="border-b border-divider/50 hover:bg-muted/20 transition-colors"
                        data-ocid="documents.row"
                      >
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="w-4 h-4 text-gold shrink-0" />
                            <span
                              className="truncate max-w-[160px]"
                              title={doc.fileName}
                            >
                              {doc.fileName}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground whitespace-nowrap hidden sm:table-cell">
                          {formatDate(doc.uploadedAt)}
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground whitespace-nowrap hidden sm:table-cell">
                          {docWithSize.fileSize != null
                            ? `${(Number(docWithSize.fileSize) / 1024).toFixed(0)} KB`
                            : "—"}
                        </td>
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={doc.isPublic}
                              onCheckedChange={() => handleTogglePublic(doc)}
                              disabled={togglingId === doc.id}
                              aria-label={
                                doc.isPublic
                                  ? t.documents.public
                                  : t.documents.private
                              }
                              data-ocid="documents.public_toggle"
                            />
                            <Badge
                              variant="outline"
                              className={
                                doc.isPublic
                                  ? "border-gold text-gold text-xs"
                                  : "border-muted-foreground/40 text-muted-foreground text-xs"
                              }
                            >
                              {doc.isPublic
                                ? t.documents.public
                                : t.documents.private}
                            </Badge>
                          </div>
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleShare(doc)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-muted/50 hover:bg-muted transition-colors text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold"
                              data-ocid="documents.share_button"
                              aria-label={`${t.documents.share} ${doc.fileName}`}
                              title={
                                copiedId === doc.id
                                  ? t.documents.copied
                                  : t.documents.share
                              }
                            >
                              {copiedId === doc.id ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                                  <span className="text-emerald-600">
                                    {t.documents.copied}
                                  </span>
                                </>
                              ) : (
                                <>
                                  <Clipboard className="w-3.5 h-3.5" />
                                  {t.documents.share}
                                </>
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                downloadFile(
                                  doc.filePath,
                                  doc.fileName,
                                  doc.mimeType,
                                )
                              }
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-muted/50 hover:bg-muted transition-colors text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold"
                              data-ocid="documents.download_link"
                              aria-label={`${t.documents.download} ${doc.fileName}`}
                            >
                              <Download className="w-3.5 h-3.5" />
                              {t.documents.download}
                            </button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(doc.id)}
                              disabled={deletingId === doc.id}
                              className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-50"
                              aria-label={`${t.documents.delete} ${doc.fileName}`}
                              data-ocid="documents.delete_button"
                            >
                              {deletingId === doc.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                            </Button>
                          </div>
                        </td>
                      </tr>
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
