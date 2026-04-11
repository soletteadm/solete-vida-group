import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useTypedActor } from "@/hooks/useTypedActor";
import { useLanguage } from "@/i18n/LanguageContext";
import { Download, FileText, Loader2, Settings2, Upload } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { DocumentRecord } from "../backend.d";

// ─── MIME helpers ─────────────────────────────────────────────────────────────

function mimeForFile(file: File): string {
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "application/pdf";
  if (ext === "docx")
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (ext === "doc") return "application/msword";
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
const ALLOWED_EXTENSIONS = [".pdf", ".docx", ".doc"];
const ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
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

  // Silence unused warnings
  void principalText;
  void userName;

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
                    return (
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

                        {/* Åtgärder — Download only */}
                        <td className="py-3 text-right">
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
