import { ExternalBlob, createActor } from "@/backend";
import { loadConfig } from "@caffeineai/core-infrastructure";
import { Download, FileText, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

// ─── Byte conversion helper (mirrors MyPagesDocuments.tsx) ───────────────────
//
// ICP Candid returns vec nat8 as a plain JavaScript number[], NOT Uint8Array.
// Passing number[] to new Blob() creates a text blob — that is why files open
// as HTML. This helper handles number[], Uint8Array, and Uint8Array with a
// non-zero byteOffset (chunked reassembly) correctly.
function toCleanUint8Array(data: unknown): Uint8Array<ArrayBuffer> {
  if (data instanceof Uint8Array) {
    if (data.byteOffset !== 0) {
      return new Uint8Array(
        (data.buffer as ArrayBuffer).slice(
          data.byteOffset,
          data.byteOffset + data.byteLength,
        ),
      ) as Uint8Array<ArrayBuffer>;
    }
    return new Uint8Array(data) as Uint8Array<ArrayBuffer>;
  }
  return new Uint8Array(data as ArrayLike<number>) as Uint8Array<ArrayBuffer>;
}

// Normalise audio MIME: "audio/mp3" → "audio/mpeg", infer from extension, etc.
function normalizeAudioMime(mimeType: string, fileName: string): string {
  if (!mimeType || mimeType === "application/octet-stream") {
    const ext = fileName.split(".").pop()?.toLowerCase();
    if (ext === "mp3") return "audio/mpeg";
    if (ext === "wav") return "audio/wav";
    if (ext === "ogg") return "audio/ogg";
    if (ext === "flac") return "audio/flac";
    if (ext === "aac") return "audio/aac";
    if (ext === "m4a") return "audio/x-m4a";
    return "audio/mpeg";
  }
  if (mimeType === "audio/mp3" || mimeType === "audio/x-mp3")
    return "audio/mpeg";
  return mimeType;
}

// ─── Language detection ───────────────────────────────────────────────────────

const STORAGE_KEY = "solete_language";
type Lang = "en" | "es" | "sv";

function detectLang(): Lang {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "es" || stored === "sv" || stored === "en") return stored;
  const browserLangs = navigator.languages ?? [navigator.language];
  for (const l of browserLangs) {
    const code = l.slice(0, 2).toLowerCase();
    if (code === "es" || code === "sv") return code as Lang;
  }
  return "en";
}

const labels = {
  en: {
    loading: "Loading document…",
    notFound: "Document not found",
    notFoundMsg: "This link is invalid or the document is no longer available.",
    sharingIntro: (name: string) => `${name} is sharing this document with you`,
    open: "Download",
    downloading: "Downloading…",
    error: "Failed to load document. Please try again.",
  },
  es: {
    loading: "Cargando documento…",
    notFound: "Documento no encontrado",
    notFoundMsg:
      "Este enlace no es válido o el documento ya no está disponible.",
    sharingIntro: (name: string) =>
      `${name} está compartiendo este documento contigo`,
    open: "Descargar",
    downloading: "Descargando…",
    error: "Error al cargar el documento. Por favor, inténtelo de nuevo.",
  },
  sv: {
    loading: "Laddar dokument…",
    notFound: "Dokumentet hittades inte",
    notFoundMsg:
      "Den här länken är ogiltig eller dokumentet är inte längre tillgängligt.",
    sharingIntro: (name: string) => `${name} delar det här dokumentet med dig`,
    open: "Ladda ner",
    downloading: "Laddar ner…",
    error: "Kunde inte ladda dokumentet. Försök igen.",
  },
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface DocData {
  data: Uint8Array;
  mimeType: string;
  fileName: string;
}

interface PublicDocRecord {
  id: string;
  ownerName: string;
  fileName: string;
  mimeType: string;
  isPublic: boolean;
  uploadedAt: bigint;
  fileSize: bigint;
}

// Exact same shape as backend.d.ts — always { __kind__: "ok"|"err" }
interface AnonActor {
  listPublicDocuments(): Promise<PublicDocRecord[]>;
  getDocumentData(
    docId: string,
  ): Promise<
    { __kind__: "ok"; ok: DocData } | { __kind__: "err"; err: string }
  >;
  getDocumentChunk(
    docId: string,
    offset: bigint,
    chunkSize: bigint,
  ): Promise<
    | {
        __kind__: "ok";
        ok: { chunk: number[]; totalSize: bigint; hasMore: boolean };
      }
    | { __kind__: "err"; err: string }
  >;
}

// ─── Chunked download helper ──────────────────────────────────────────────────
//
// Fetches document bytes in 1MB chunks to avoid IC0504 (payload > 3MB).
// Assembles all chunks into a single Uint8Array before creating the Blob.

const SHARE_DOWNLOAD_CHUNK_SIZE = 1 * 1024 * 1024; // 1MB

async function fetchDocumentBytes(
  actor: AnonActor,
  docId: string,
): Promise<Uint8Array<ArrayBuffer>> {
  const chunks: Uint8Array[] = [];
  let offset = BigInt(0);
  let hasMore = true;
  while (hasMore) {
    const result = await actor.getDocumentChunk(
      docId,
      offset,
      BigInt(SHARE_DOWNLOAD_CHUNK_SIZE),
    );
    if ("err" in result) throw new Error(result.err);
    const { chunk, hasMore: more } = result.ok;
    const bytes = toCleanUint8Array(chunk);
    chunks.push(bytes);
    offset += BigInt(bytes.length);
    hasMore = more;
  }
  const totalLen = chunks.reduce((sum, c) => sum + c.length, 0);
  const assembled = new Uint8Array(new ArrayBuffer(totalLen));
  let pos = 0;
  for (const c of chunks) {
    assembled.set(c, pos);
    pos += c.length;
  }
  return assembled as Uint8Array<ArrayBuffer>;
}

type PageState = "loading" | "ready" | "notFound" | "error";

// ─── Component ────────────────────────────────────────────────────────────────

interface ShareDocumentPageProps {
  docId: string;
}

export default function ShareDocumentPage({ docId }: ShareDocumentPageProps) {
  const lang = detectLang();
  const L = labels[lang];

  const [state, setState] = useState<PageState>("loading");
  const [ownerName, setOwnerName] = useState("Someone");
  const [fileName, setFileName] = useState("");
  const [cachedDocData, setCachedDocData] = useState<DocData | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [actor, setActor] = useState<AnonActor | null>(null);

  // Build anonymous actor once
  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      try {
        const config = await loadConfig();
        const noopUpload = async (_blob: ExternalBlob): Promise<Uint8Array> =>
          new Uint8Array();
        const noopDownload = async (
          _bytes: Uint8Array,
        ): Promise<ExternalBlob> =>
          ExternalBlob.fromBytes(new Uint8Array() as Uint8Array<ArrayBuffer>);
        const anon = createActor(
          config.backend_canister_id,
          noopUpload,
          noopDownload,
        ) as unknown as AnonActor;
        if (!cancelled) setActor(anon);
      } catch {
        if (!cancelled) setState("error");
      }
    };
    init();
    return () => {
      cancelled = true;
    };
  }, []);

  // PRIMARY: fetch document info via listPublicDocuments (for ownerName, fileName, mimeType).
  // SECONDARY: pre-fetch bytes using chunked getDocumentChunk so download is instant.
  useEffect(() => {
    if (!actor) return;
    let cancelled = false;

    const fetchInfo = async () => {
      try {
        // Get ownerName, fileName, mimeType from public listing
        const publicDocs = await actor.listPublicDocuments();
        const match = publicDocs.find((d) => d.id === docId);

        if (!match) {
          if (!cancelled) setState("notFound");
          return;
        }

        if (!cancelled) {
          setOwnerName(match.ownerName || "Someone");
          setFileName(match.fileName);
        }

        // Pre-fetch all bytes using chunked download (avoids IC0504 for large files)
        const bytes = await fetchDocumentBytes(actor, docId);
        const resolvedMime = match.mimeType.startsWith("audio/")
          ? normalizeAudioMime(match.mimeType, match.fileName)
          : match.mimeType || "application/octet-stream";

        if (!cancelled) {
          // Store as synthetic DocData for handleDownload to consume
          setCachedDocData({
            data: bytes,
            mimeType: resolvedMime,
            fileName: match.fileName,
          });
          setState("ready");
        }
      } catch {
        if (!cancelled) setState("error");
      }
    };

    fetchInfo();
    return () => {
      cancelled = true;
    };
  }, [actor, docId]);

  // Download — uses cached bytes; re-fetches via chunked download only if cache is empty.
  const handleDownload = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      let docData = cachedDocData;

      if (!docData && actor) {
        // Re-fetch using chunked download to avoid IC0504 for large files
        const publicDocs = await actor.listPublicDocuments();
        const match = publicDocs.find((d) => d.id === docId);
        if (!match) {
          setState("error");
          return;
        }
        const bytes = await fetchDocumentBytes(actor, docId);
        const resolvedMime = match.mimeType.startsWith("audio/")
          ? normalizeAudioMime(match.mimeType, match.fileName)
          : match.mimeType || "application/octet-stream";
        docData = {
          data: bytes,
          mimeType: resolvedMime,
          fileName: match.fileName,
        };
        setCachedDocData(docData);
      }

      if (!docData) {
        setState("error");
        return;
      }

      // Exact same byte→Blob→anchor pattern as MyPagesDocuments handleDownload
      const { data, mimeType, fileName: name } = docData;
      const bytes = toCleanUint8Array(data);
      // Normalize audio MIME so MP3s download/play correctly
      const resolvedMime = mimeType.startsWith("audio/")
        ? normalizeAudioMime(mimeType, name)
        : mimeType || "application/octet-stream";
      const blob = new Blob([bytes], { type: resolvedMime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("[SharePage] handleDownload error:", err);
      setState("error");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4 flex items-center gap-3">
        <svg
          width="32"
          height="32"
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <circle cx="20" cy="20" r="20" fill="#1a1a1a" />
          <circle cx="20" cy="20" r="8" fill="#C9A84C" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
            <line
              key={deg}
              x1="20"
              y1="20"
              x2={20 + 14 * Math.cos((deg * Math.PI) / 180)}
              y2={20 + 14 * Math.sin((deg * Math.PI) / 180)}
              stroke="#C9A84C"
              strokeWidth="2"
              strokeLinecap="round"
            />
          ))}
        </svg>
        <span className="font-serif text-sm font-semibold text-foreground tracking-wide">
          Solete Vida Group S.L.
        </span>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        {state === "loading" && (
          <div
            className="flex flex-col items-center gap-4 text-muted-foreground"
            data-ocid="share.loading"
          >
            <Loader2 className="w-8 h-8 animate-spin text-gold" />
            <p className="font-sans text-sm">{L.loading}</p>
          </div>
        )}

        {state === "error" && (
          <div
            className="text-center space-y-3 max-w-sm"
            data-ocid="share.error"
          >
            <FileText className="w-12 h-12 text-muted-foreground/40 mx-auto" />
            <p className="font-sans text-sm text-muted-foreground">{L.error}</p>
          </div>
        )}

        {state === "notFound" && (
          <div
            className="text-center space-y-3 max-w-sm"
            data-ocid="share.not_found"
          >
            <FileText className="w-12 h-12 text-muted-foreground/40 mx-auto" />
            <h1 className="font-serif text-xl font-semibold text-foreground">
              {L.notFound}
            </h1>
            <p className="font-sans text-sm text-muted-foreground">
              {L.notFoundMsg}
            </p>
          </div>
        )}

        {state === "ready" && (
          <div
            className="w-full max-w-md bg-card border border-border rounded-2xl shadow-lg overflow-hidden"
            data-ocid="share.card"
          >
            {/* Gold accent bar */}
            <div className="h-1 bg-gold w-full" />

            <div className="p-8 flex flex-col items-center gap-6 text-center">
              {/* File icon */}
              <div className="w-16 h-16 rounded-full bg-gold/10 flex items-center justify-center">
                <FileText className="w-8 h-8 text-gold" />
              </div>

              {/* Sharing intro */}
              <div className="space-y-1">
                <p className="font-sans text-base text-foreground font-medium">
                  {L.sharingIntro(ownerName)}
                </p>
                <p
                  className="font-sans text-sm text-muted-foreground truncate max-w-[280px] mx-auto"
                  title={fileName}
                >
                  {fileName}
                </p>
              </div>

              {/* Download button — identical logic to Ladda ner in MyPagesDocuments */}
              <button
                type="button"
                onClick={handleDownload}
                disabled={downloading}
                data-ocid="share.download_button"
                className="inline-flex items-center gap-2 px-8 py-3 rounded-full font-sans font-semibold text-sm bg-gold hover:bg-gold/90 text-black transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2"
              >
                {downloading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {L.downloading}
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    {L.open}
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-card border-t border-border px-6 py-4 text-center">
        <p className="font-sans text-xs text-muted-foreground">
          © {new Date().getFullYear()}.{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            Built with love using caffeine.ai
          </a>
        </p>
      </footer>
    </div>
  );
}
