import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useLanguage } from "@/i18n/LanguageContext";
import type { Language } from "@/i18n/translations";
import { Loader2, LogIn, LogOut, Menu, Sun, User } from "lucide-react";
import { useState } from "react";

interface NavbarProps {
  isLoggedIn: boolean;
  isLoading: boolean;
  roleLabel: string;
  onLogin: () => void;
  onLogout: () => void;
  onNavigate: (section: string) => void;
  onMyPages: () => void;
  currentPage: string;
}

export default function Navbar({
  isLoggedIn,
  isLoading,
  roleLabel,
  onLogin,
  onLogout,
  onNavigate,
  onMyPages,
  currentPage,
}: NavbarProps) {
  const { t, lang, setLang } = useLanguage();
  const [mobileOpen, setMobileOpen] = useState(false);

  const languages: Language[] = ["en", "es", "sv"];

  const navLinks = [
    { key: "home", label: t.nav.home, section: "home" },
    { key: "about", label: t.nav.about, section: "about" },
    { key: "services", label: t.nav.services, section: "services" },
    { key: "contact", label: t.nav.contact, section: "contact" },
  ];

  const handleNavClick = (section: string) => {
    setMobileOpen(false);
    onNavigate(section);
  };

  const handleMyPages = () => {
    setMobileOpen(false);
    onMyPages();
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white shadow-nav">
      <nav
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-[72px] flex items-center justify-between"
        aria-label="Main navigation"
      >
        {/* Logo */}
        <button
          type="button"
          className="flex items-center gap-2.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold rounded-md"
          onClick={() => onNavigate("home")}
          aria-label="Solete Vida Group - Go to homepage"
          data-ocid="nav.link"
        >
          <div className="w-9 h-9 bg-black rounded-full flex items-center justify-center flex-shrink-0">
            <Sun className="w-5 h-5 text-gold" />
          </div>
          <div className="leading-tight">
            <span className="block font-serif font-semibold text-foreground text-base tracking-tight">
              Solete Vida
            </span>
            <span className="block font-sans text-xs text-muted-foreground tracking-wide uppercase">
              Group S.L.
            </span>
          </div>
        </button>

        {/* Desktop nav links */}
        <ul className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <li key={link.key}>
              <button
                type="button"
                onClick={() => handleNavClick(link.section)}
                className="px-4 py-2 text-base font-sans font-medium text-foreground hover:text-gold transition-colors rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                data-ocid="nav.link"
              >
                {link.label}
              </button>
            </li>
          ))}
          {isLoggedIn && (
            <li>
              <button
                type="button"
                onClick={handleMyPages}
                className={`px-4 py-2 text-base font-sans font-medium transition-colors rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold ${
                  currentPage === "myPages"
                    ? "text-gold"
                    : "text-foreground hover:text-gold"
                }`}
                data-ocid="nav.link"
              >
                {t.nav.myPages}
              </button>
            </li>
          )}
        </ul>

        {/* Right: Language + Login */}
        <div className="hidden md:flex items-center gap-4">
          {/* Language switcher */}
          <div
            className="flex items-center gap-1"
            aria-label="Language selector"
          >
            {languages.map((l, idx) => (
              <span key={l} className="flex items-center">
                <button
                  type="button"
                  onClick={() => setLang(l)}
                  className={`text-sm font-sans font-semibold uppercase tracking-wide px-1 py-0.5 rounded transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold ${
                    lang === l
                      ? "text-gold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  aria-pressed={lang === l}
                  data-ocid="nav.toggle"
                >
                  {l.toUpperCase()}
                </button>
                {idx < languages.length - 1 && (
                  <span className="text-muted-foreground mx-0.5 text-sm">
                    |
                  </span>
                )}
              </span>
            ))}
          </div>

          {/* Login / Logout */}
          {isLoggedIn ? (
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="border-gold text-gold text-xs capitalize font-sans"
              >
                {roleLabel}
              </Badge>
              <Button
                size="sm"
                variant="ghost"
                onClick={onLogout}
                className="font-sans text-base"
                data-ocid="nav.button"
              >
                <LogOut className="w-4 h-4 mr-1" />
                {t.nav.logout}
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              onClick={onLogin}
              disabled={isLoading}
              className="bg-gold hover:bg-gold/90 text-black font-sans rounded-full px-5 text-base"
              data-ocid="nav.primary_button"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : (
                <LogIn className="w-4 h-4 mr-1.5" />
              )}
              {t.nav.clientLogin}
            </Button>
          )}
        </div>

        {/* Mobile: hamburger */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              aria-label="Open navigation menu"
              data-ocid="nav.button"
            >
              <Menu className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent
            side="right"
            className="w-72 bg-white p-0"
            data-ocid="nav.sheet"
          >
            <div className="flex flex-col h-full">
              {/* Mobile header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-divider">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center">
                    <Sun className="w-4 h-4 text-gold" />
                  </div>
                  <span className="font-serif font-semibold text-foreground text-sm">
                    Solete Vida
                  </span>
                </div>
              </div>

              {/* Mobile nav links */}
              <nav className="flex-1 px-4 py-6 space-y-1">
                {navLinks.map((link) => (
                  <button
                    key={link.key}
                    type="button"
                    onClick={() => handleNavClick(link.section)}
                    className="w-full text-left px-4 py-3 text-base font-sans font-medium text-foreground hover:text-gold hover:bg-beige rounded-lg transition-colors"
                    data-ocid="nav.link"
                  >
                    {link.label}
                  </button>
                ))}
                {isLoggedIn && (
                  <button
                    type="button"
                    onClick={handleMyPages}
                    className="w-full text-left px-4 py-3 text-base font-sans font-medium text-gold hover:bg-beige rounded-lg transition-colors flex items-center gap-2"
                    data-ocid="nav.link"
                  >
                    <User className="w-4 h-4" />
                    {t.nav.myPages}
                  </button>
                )}
              </nav>

              {/* Mobile language + login */}
              <div className="px-6 py-5 border-t border-divider space-y-4">
                <div className="flex items-center gap-2">
                  {languages.map((l, idx) => (
                    <span key={l} className="flex items-center">
                      <button
                        type="button"
                        onClick={() => setLang(l)}
                        className={`text-sm font-sans font-semibold uppercase tracking-wide px-1.5 py-1 rounded transition-colors ${
                          lang === l
                            ? "text-gold bg-gold/15"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                        aria-pressed={lang === l}
                        data-ocid="nav.toggle"
                      >
                        {l.toUpperCase()}
                      </button>
                      {idx < languages.length - 1 && (
                        <span className="text-muted-foreground mx-0.5 text-sm">
                          |
                        </span>
                      )}
                    </span>
                  ))}
                </div>
                {isLoggedIn ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="border-gold text-gold text-xs capitalize"
                      >
                        {roleLabel}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onLogout}
                      className="w-full justify-start font-sans text-base"
                      data-ocid="nav.button"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      {t.nav.logout}
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={() => {
                      setMobileOpen(false);
                      onLogin();
                    }}
                    disabled={isLoading}
                    className="w-full bg-gold hover:bg-gold/90 text-black font-sans rounded-full text-base"
                    data-ocid="nav.primary_button"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <LogIn className="w-4 h-4 mr-2" />
                    )}
                    {t.nav.clientLogin}
                  </Button>
                )}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </nav>
    </header>
  );
}
