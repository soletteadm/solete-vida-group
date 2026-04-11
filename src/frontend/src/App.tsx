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
import MyPagesProfile from "@/pages/MyPagesProfile";
import ShareDocumentPage from "@/pages/ShareDocumentPage";
import {
  CalendarDays,
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
type MyPagesTab = "profile" | "admin" | "calendar" | "contacts" | "documents";

function AppContent() {
  const [currentPage, setCurrentPage] = useState<Page>("home");
  const [myPagesTab, setMyPagesTab] = useState<MyPagesTab>("profile");
  const [activeHoliday, setActiveHoliday] = useState<string>("none");
  const [showSplash, setShowSplash] = useState(false);
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
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
              {/* Page title */}
              <div className="mb-8">
                <h1 className="font-serif text-3xl font-semibold text-foreground">
                  {t.myPages.title}
                </h1>
                <div className="mt-1.5 w-10 h-0.5 bg-gold" />
              </div>

              <Tabs
                value={myPagesTab}
                onValueChange={(v) => setMyPagesTab(v as MyPagesTab)}
                className="space-y-6"
              >
                <TabsList
                  className="bg-card border border-divider shadow-card h-auto p-1 rounded-lg"
                  data-ocid="mypages.tab"
                >
                  <TabsTrigger
                    value="profile"
                    className="font-sans text-sm flex items-center gap-1.5 rounded-md data-[state=active]:bg-gold data-[state=active]:text-black"
                    data-ocid="mypages.tab"
                  >
                    <User className="w-4 h-4" />
                    {t.myPages.profile}
                  </TabsTrigger>
                  {auth.isAdmin && (
                    <TabsTrigger
                      value="admin"
                      className="font-sans text-sm flex items-center gap-1.5 rounded-md data-[state=active]:bg-gold data-[state=active]:text-black"
                      data-ocid="mypages.tab"
                    >
                      <Users className="w-4 h-4" />
                      {t.myPages.users}
                    </TabsTrigger>
                  )}
                  {auth.isAdmin && (
                    <TabsTrigger
                      value="calendar"
                      className="font-sans text-sm flex items-center gap-1.5 rounded-md data-[state=active]:bg-gold data-[state=active]:text-black"
                      data-ocid="mypages.calendar.tab"
                    >
                      <CalendarDays className="w-4 h-4" />
                      {t.myPages.calendar}
                    </TabsTrigger>
                  )}
                  {auth.isAdmin && (
                    <TabsTrigger
                      value="contacts"
                      className="font-sans text-sm flex items-center gap-1.5 rounded-md data-[state=active]:bg-gold data-[state=active]:text-black"
                      data-ocid="mypages.contacts.tab"
                    >
                      <MessageSquare className="w-4 h-4" />
                      {t.myPages.contacts}
                    </TabsTrigger>
                  )}
                  {auth.isLoggedIn && (
                    <TabsTrigger
                      value="documents"
                      className="font-sans text-sm flex items-center gap-1.5 rounded-md data-[state=active]:bg-gold data-[state=active]:text-black"
                      data-ocid="mypages.documents.tab"
                    >
                      <FileText className="w-4 h-4" />
                      {t.documents.tab}
                    </TabsTrigger>
                  )}
                </TabsList>

                <TabsContent value="profile">
                  <MyPagesProfile
                    principalText={auth.principalText}
                    roleLabel={auth.roleLabel}
                  />
                </TabsContent>

                {auth.isAdmin && (
                  <TabsContent value="admin">
                    <MyPagesAdmin />
                  </TabsContent>
                )}

                {auth.isAdmin && (
                  <TabsContent value="calendar">
                    <MyPagesCalendar />
                  </TabsContent>
                )}

                {auth.isAdmin && (
                  <TabsContent value="contacts">
                    <MyPagesContacts />
                  </TabsContent>
                )}

                {auth.isLoggedIn && (
                  <TabsContent value="documents">
                    <MyPagesDocuments
                      principalText={auth.principalText}
                      userName={auth.principalText ?? ""}
                      userRole={auth.roleLabel as "admin" | "user" | "guest"}
                    />
                  </TabsContent>
                )}
              </Tabs>
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
