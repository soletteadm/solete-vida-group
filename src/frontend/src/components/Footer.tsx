import { useLanguage } from "@/i18n/LanguageContext";
import { Mail, MapPin, Phone, Sun } from "lucide-react";

interface FooterProps {
  onNavigate: (section: string) => void;
}

export default function Footer({ onNavigate }: FooterProps) {
  const { t } = useLanguage();
  const year = new Date().getFullYear();
  const copyrightText = t.footer.copyright.replace("{year}", String(year));
  const hostname = encodeURIComponent(window.location.hostname);

  return (
    <footer className="bg-black text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {/* Column 1: Company Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-gold rounded-full flex items-center justify-center flex-shrink-0">
                <Sun className="w-5 h-5 text-black" />
              </div>
              <div className="leading-tight">
                <span className="block font-serif font-semibold text-white text-base">
                  Solete Vida Group
                </span>
                <span className="block font-sans text-xs text-white/60 tracking-wide uppercase">
                  S.L.
                </span>
              </div>
            </div>
            <p className="font-sans text-sm text-white/70 leading-relaxed max-w-xs">
              {t.footer.description}
            </p>
          </div>

          {/* Column 2: Navigation Menu */}
          <div className="space-y-4">
            <h3 className="font-serif text-base font-semibold text-white">
              {t.footer.menu}
            </h3>
            <nav aria-label="Footer navigation">
              <ul className="space-y-2">
                {[
                  { label: t.nav.home, section: "home" },
                  { label: t.nav.about, section: "about" },
                  { label: t.nav.services, section: "services" },
                  { label: t.nav.contact, section: "contact" },
                ].map((link) => (
                  <li key={link.section}>
                    <button
                      type="button"
                      onClick={() => onNavigate(link.section)}
                      className="font-sans text-sm text-white/70 hover:text-gold transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold rounded"
                      data-ocid="nav.link"
                    >
                      {link.label}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          {/* Column 3: Contact */}
          <div className="space-y-4">
            <h3 className="font-serif text-base font-semibold text-white">
              {t.footer.contactTitle}
            </h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-gold mt-0.5 flex-shrink-0" />
                <span className="font-sans text-sm text-white/70 leading-snug">
                  {t.footer.address}
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-gold flex-shrink-0" />
                <a
                  href={`mailto:${t.footer.email}`}
                  className="font-sans text-sm text-white/70 hover:text-gold transition-colors"
                >
                  {t.footer.email}
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-gold flex-shrink-0" />
                <a
                  href={`tel:${t.footer.phone}`}
                  className="font-sans text-sm text-white/70 hover:text-gold transition-colors"
                >
                  {t.footer.phone}
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-12 pt-6 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p className="font-sans text-xs text-white/50">{copyrightText}</p>
          <p className="font-sans text-xs text-white/40">
            Built with love using{" "}
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${hostname}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/60 hover:text-gold transition-colors"
            >
              caffeine.ai
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
