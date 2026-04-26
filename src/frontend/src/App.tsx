import Footer from "@/components/Footer";
import HolidaySplash from "@/components/HolidaySplash";
import Navbar from "@/components/Navbar";
import { Toaster } from "@/components/ui/sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useTypedActor } from "@/hooks/useTypedActor";
import { LanguageProvider } from "@/i18n/LanguageContext";
import { useLanguage } from "@/i18n/LanguageContext";
import HomePage from "@/pages/HomePage";
import MyPagesAdmin from "@/pages/MyPagesAdmin";
import MyPagesCalendar from "@/pages/MyPagesCalendar";
import MyPagesContacts from "@/pages/MyPagesContacts";
import MyPagesDocuments from "@/pages/MyPagesDocuments";
import MyPagesNotes from "@/pages/MyPagesNotes";
import MyPagesProfile from "@/pages/MyPagesProfile";
import ShareDocumentPage from "@/pages/ShareDocumentPage";
import {
  BookOpen,
  CalendarDays,
  ChevronDown,
  FileText,
  MessageSquare,
  User,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { Holiday } from "./backend.d";

// ─── Share route detection ────────────────────────────────────────────────────

function getShareDocId(): string | null {
  const hash = window.location.hash;
  const match = hash.match(/^#\/documents\/(.+)$/);
  return match ? match[1] : null;
}

// HolidayKey is an enum string in TS but the actor returns Candid variants at runtime.
// This helper normalizes either format to the string key.
function resolveHolidayKey(h: Holiday): string {
  if (typeof h === "string") return h;
  const obj = h as Record<string, unknown>;
  if ("easter" in obj) return "easter";
  if ("christmas" in obj) return "christmas";
  if ("newyear" in obj) return "newyear";
  if ("midsommar" in obj) return "midsommar";
  return "none";
}

type Page = "home" | "myPages";
type MyPagesTab =
  | "profile"
  | "admin"
  | "calendar"
  | "contacts"
  | "documents"
  | "notes";

// ─── Tab definitions ──────────────────────────────────────────────────────────

interface TabDef {
  value: MyPagesTab;
  labelKey:
    | "profile"
    | "users"
    | "calendar"
    | "contacts"
    | "documentsTab"
    | "notesTab";
  icon: React.ReactNode;
  ocid: string;
  condition?: boolean;
}

function AppContent() {
  const [currentPage, setCurrentPage] = useState<Page>("home");
  const [myPagesTab, setMyPagesTab] = useState<MyPagesTab>("profile");
  const [activeHoliday, setActiveHoliday] = useState<string>("none");
  const [showSplash, setShowSplash] = useState(false);
  // Mobile accordion: which tab is open (null = none)
  const [mobileOpen, setMobileOpen] = useState<MyPagesTab | null>("profile");
  const { t } = useLanguage();
  const auth = useAuth();
  const { actor, isFetching } = useTypedActor();

  // Fetch active holiday on page load
  useEffect(() => {
    if (!actor || isFetching) return;
    const fetchHoliday = async () => {
      try {
        const h = await actor.getActiveHoliday();
        const key = resolveHolidayKey(h);
        if (key !== "none") {
          setActiveHoliday(key);
          setShowSplash(true);
        }
      } catch {
        // ignore -- holiday splash is non-critical
      }
    };
    fetchHoliday();
  }, [actor, isFetching]);

  const handleNavigate = (section: string) => {
    if (
      section === "home" ||
      section === "about" ||
      section === "services" ||
      section === "why" ||
      section === "contact"
    ) {
      setCurrentPage("home");
      // Scroll to section after page render
      setTimeout(() => {
        const el = document.getElementById(
          section === "home" ? "home" : section,
        );
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 50);
    }
  };

  const handleMyPages = () => {
    if (auth.isLoggedIn) {
      setCurrentPage("myPages");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleLogin = () => {
    auth.login();
  };

  const handleLogout = () => {
    auth.logout();
    setCurrentPage("home");
    setMyPagesTab("profile");
    setMobileOpen("profile");
  };

  // Sync accordion open state when desktop tab changes
  const handleTabChange = (v: string) => {
    const tab = v as MyPagesTab;
    setMyPagesTab(tab);
    setMobileOpen(tab);
  };

  // Toggle accordion section on mobile
  const handleMobileToggle = (tab: MyPagesTab) => {
    setMobileOpen((prev) => {
      const next = prev === tab ? null : tab;
      if (next) setMyPagesTab(next);
      return next;
    });
  };

  // Build the ordered list of visible tabs
  const tabDefs: TabDef[] = [
    {
      value: "profile",
      labelKey: "profile",
      icon: <User className="w-4 h-4" />,
      ocid: "mypages.tab",
      condition: true,
    },
    {
      value: "admin",
      labelKey: "users",
      icon: <Users className="w-4 h-4" />,
      ocid: "mypages.tab",
      condition: auth.isAdmin,
    },
    {
      value: "calendar",
      labelKey: "calendar",
      icon: <CalendarDays className="w-4 h-4" />,
      ocid: "mypages.calendar.tab",
      condition: auth.isAdmin,
    },
    {
      value: "contacts",
      labelKey: "contacts",
      icon: <MessageSquare className="w-4 h-4" />,
      ocid: "mypages.contacts.tab",
      condition: auth.isAdmin,
    },
    {
      value: "documents",
      labelKey: "documentsTab",
      icon: <FileText className="w-4 h-4" />,
      ocid: "mypages.documents.tab",
      condition: auth.isLoggedIn,
    },
    {
      value: "notes",
      labelKey: "notesTab",
      icon: <BookOpen className="w-4 h-4" />,
      ocid: "mypages.notes.tab",
      condition: auth.isLoggedIn,
    },
  ].filter((tab) => tab.condition !== false) as TabDef[];

  // Map labelKey to actual translation string
  const getTabLabel = (key: TabDef["labelKey"]) => {
    if (key === "documentsTab") return t.documents.tab;
    if (key === "notesTab") return t.myPages.notesTab;
    return t.myPages[key as "profile" | "users" | "calendar" | "contacts"];
  };

  // Render the content for a given tab value
  const renderTabContent = (tab: MyPagesTab) => {
    switch (tab) {
      case "profile":
        return (
          <MyPagesProfile
            principalText={auth.principalText}
            roleLabel={auth.roleLabel}
          />
        );
      case "admin":
        return auth.isAdmin ? <MyPagesAdmin /> : null;
      case "calendar":
        return auth.isAdmin ? <MyPagesCalendar /> : null;
      case "contacts":
        return auth.isAdmin ? <MyPagesContacts /> : null;
      case "documents":
        return auth.isLoggedIn ? (
          <MyPagesDocuments
            principalText={auth.principalText}
            userName={auth.principalText ?? ""}
            userRole={auth.roleLabel as "admin" | "user" | "guest"}
          />
        ) : null;
      case "notes":
        return auth.isLoggedIn ? <MyPagesNotes /> : null;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Holiday Splash Screen */}
      {showSplash && activeHoliday !== "none" && (
        <HolidaySplash
          holiday={activeHoliday as Holiday}
          onDismiss={() => setShowSplash(false)}
        />
      )}

      <Navbar
        isLoggedIn={auth.isLoggedIn}
        isLoading={auth.isLoading}
        roleLabel={auth.roleLabel}
        onLogin={handleLogin}
        onLogout={handleLogout}
        onNavigate={handleNavigate}
        onMyPages={handleMyPages}
        currentPage={currentPage}
      />

      {/* Main content with top padding for fixed navbar */}
      <div className="pt-[72px]">
        {currentPage === "home" ? (
          <>
            <HomePage onLogin={handleLogin} isLoggedIn={auth.isLoggedIn} />
            <Footer onNavigate={handleNavigate} />
          </>
        ) : (
          /* My Pages */
          <div className="min-h-[calc(100vh-72px)] bg-beige">
            <div className="max-w-5xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-6 sm:py-10">
              {/* Page title */}
              <div className="mb-8">
                <h1 className="font-serif text-3xl font-semibold text-foreground">
                  {t.myPages.title}
                </h1>
                <div className="mt-1.5 w-10 h-0.5 bg-gold" />
              </div>

              {/* ── Desktop: horizontal Tabs (md and above) ── */}
              <div className="hidden md:block">
                <Tabs
                  value={myPagesTab}
                  onValueChange={handleTabChange}
                  className="space-y-6"
                >
                  <div className="overflow-x-auto -mx-1 px-1 pb-0.5">
                    <TabsList
                      className="bg-card border border-divider shadow-card h-auto p-1 rounded-lg flex flex-nowrap w-max min-w-full"
                      data-ocid="mypages.tab"
                    >
                      {tabDefs.map((tab) => (
                        <TabsTrigger
                          key={tab.value}
                          value={tab.value}
                          className="font-sans text-sm flex items-center gap-1.5 rounded-md shrink-0 data-[state=active]:bg-gold data-[state=active]:text-black"
                          data-ocid={tab.ocid}
                        >
                          {tab.icon}
                          <span>{getTabLabel(tab.labelKey)}</span>
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </div>

                  {tabDefs.map((tab) => (
                    <TabsContent key={tab.value} value={tab.value}>
                      {renderTabContent(tab.value)}
                    </TabsContent>
                  ))}
                </Tabs>
              </div>

              {/* ── Mobile: vertical accordion (below md) ── */}
              <div
                className="md:hidden space-y-2"
                data-ocid="mypages.accordion"
              >
                {tabDefs.map((tab) => {
                  const isOpen = mobileOpen === tab.value;
                  return (
                    <div
                      key={tab.value}
                      className={`rounded-xl border transition-colors overflow-hidden ${
                        isOpen
                          ? "border-gold/60 shadow-md"
                          : "border-divider bg-card"
                      }`}
                      data-ocid={`mypages.accordion.${tab.value}`}
                    >
                      {/* Accordion header button — min 64px touch target */}
                      <button
                        type="button"
                        onClick={() => handleMobileToggle(tab.value)}
                        className={`w-full flex items-center gap-3 px-5 py-4 min-h-[64px] text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:ring-inset ${
                          isOpen
                            ? "bg-gold text-black"
                            : "bg-card text-foreground active:bg-gold/20"
                        }`}
                        aria-expanded={isOpen}
                        aria-controls={`accordion-content-${tab.value}`}
                        data-ocid={`mypages.accordion_trigger.${tab.value}`}
                      >
                        <span
                          className={`shrink-0 ${isOpen ? "text-black" : "text-gold"}`}
                        >
                          {tab.icon}
                        </span>
                        <span className="flex-1 font-sans font-bold text-base">
                          {getTabLabel(tab.labelKey)}
                        </span>
                        <ChevronDown
                          className={`w-5 h-5 shrink-0 transition-transform duration-200 ${
                            isOpen
                              ? "rotate-180 text-black"
                              : "text-muted-foreground"
                          }`}
                        />
                      </button>

                      {/* Accordion content */}
                      {isOpen && (
                        <div
                          id={`accordion-content-${tab.value}`}
                          className="px-3 py-5 sm:px-5 bg-background border-t-2 border-gold/30"
                        >
                          {renderTabContent(tab.value)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <Footer onNavigate={handleNavigate} />
          </div>
        )}
      </div>

      <Toaster richColors position="top-right" />
    </div>
  );
}

export default function App() {
  const [docId, setDocId] = useState<string | null>(getShareDocId());

  useEffect(() => {
    const onHashChange = () => setDocId(getShareDocId());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  if (docId) {
    return (
      <LanguageProvider>
        <ShareDocumentPage docId={docId} />
        <Toaster richColors position="top-right" />
      </LanguageProvider>
    );
  }
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}
