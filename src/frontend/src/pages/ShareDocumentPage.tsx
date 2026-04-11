import { ExternalBlob, createActor } from "@/backend";
import { loadConfig } from "@caffeineai/core-infrastructure";
import { Download, FileText, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

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

  // PRIMARY: call getDocumentData(docId) — access control is built in.
  // If it returns { __kind__: "ok" }, the doc is accessible.
  // SECONDARY: call listPublicDocuments() to get ownerName for display only.
  useEffect(() => {
    if (!actor) return;
    let cancelled = false;

    const fetchInfo = async () => {
      try {
        const result = await actor.getDocumentData(docId);

        if (result.__kind__ !== "ok") {
          if (!cancelled) setState("notFound");
          return;
        }

        const docData = result.ok;

        if (!cancelled) {
          setFileName(docData.fileName);
          setCachedDocData(docData);
          setState("ready");
        }

        // Secondary: get ownerName from listPublicDocuments — best effort only
        try {
          const publicDocs = await actor.listPublicDocuments();
          const match = publicDocs.find((d) => d.id === docId);
          if (!cancelled && match?.ownerName) {
            setOwnerName(match.ownerName);
          }
        } catch {
          // ownerName fallback "Someone" is fine — doc is still accessible
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

  // Download — identical logic to handleDownload in MyPagesDocuments.tsx.
  // Uses cached data; re-fetches only if cache is empty (shouldn't happen).
  const handleDownload = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      let docData = cachedDocData;

      if (!docData && actor) {
        const result = await actor.getDocumentData(docId);
        if (result.__kind__ !== "ok") {
          setState("error");
          return;
        }
        docData = result.ok;
        setCachedDocData(docData);
      }

      if (!docData) {
        setState("error");
        return;
      }

      // Exact same byte→Blob→anchor pattern as MyPagesDocuments handleDownload
      const { data, mimeType, fileName: name } = docData;
      const bytes = new Uint8Array(data);
      const blob = new Blob([bytes], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
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
