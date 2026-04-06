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
import MyPagesProfile from "@/pages/MyPagesProfile";
import { CalendarDays, MessageSquare, User, Users } from "lucide-react";
import { useEffect, useState } from "react";
import type { HolidayKey } from "./backend.d";

type Page = "home" | "myPages";
type MyPagesTab = "profile" | "admin" | "calendar" | "contacts";

function AppContent() {
  const [currentPage, setCurrentPage] = useState<Page>("home");
  const [myPagesTab, setMyPagesTab] = useState<MyPagesTab>("profile");
  const [activeHoliday, setActiveHoliday] = useState<HolidayKey>("none");
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
        const key: HolidayKey =
          "easter" in h
            ? "easter"
            : "christmas" in h
              ? "christmas"
              : "newyear" in h
                ? "newyear"
                : "midsommar" in h
                  ? "midsommar"
                  : "none";
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
          holiday={activeHoliday}
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
                </TabsList>

                <TabsContent value="profile">
                  <MyPagesProfile
                    principalText={auth.principalText}
                    isAdmin={auth.isAdmin}
                    isUser={auth.isUser}
                    isGuest={auth.isGuest}
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
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}
