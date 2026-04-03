import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/i18n/LanguageContext";
import {
  BarChart3,
  Briefcase,
  ChevronDown,
  Globe,
  MapPin,
  Network,
  Shield,
  Star,
  TrendingUp,
} from "lucide-react";
import { motion } from "motion/react";

interface HomePageProps {
  onLogin: () => void;
  isLoggedIn: boolean;
}

export default function HomePage({ onLogin, isLoggedIn }: HomePageProps) {
  const { t } = useLanguage();

  const scrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const services = [
    {
      icon: <Briefcase className="w-7 h-7 text-coral" />,
      title: t.services.advisory.title,
      description: t.services.advisory.description,
    },
    {
      icon: <TrendingUp className="w-7 h-7 text-coral" />,
      title: t.services.investment.title,
      description: t.services.investment.description,
    },
    {
      icon: <BarChart3 className="w-7 h-7 text-coral" />,
      title: t.services.management.title,
      description: t.services.management.description,
    },
  ];

  const features = [
    {
      icon: <Shield className="w-6 h-6 text-coral" />,
      title: t.whyChoose.expertTeam.title,
      description: t.whyChoose.expertTeam.description,
    },
    {
      icon: <Network className="w-6 h-6 text-coral" />,
      title: t.whyChoose.trustedNetwork.title,
      description: t.whyChoose.trustedNetwork.description,
    },
    {
      icon: <MapPin className="w-6 h-6 text-coral" />,
      title: t.whyChoose.localKnowledge.title,
      description: t.whyChoose.localKnowledge.description,
    },
    {
      icon: <Globe className="w-6 h-6 text-coral" />,
      title: t.whyChoose.globalReach.title,
      description: t.whyChoose.globalReach.description,
    },
  ];

  return (
    <main>
      {/* ============ HERO SECTION ============ */}
      <section
        id="home"
        className="relative min-h-screen flex items-center justify-center overflow-hidden"
        aria-label="Hero"
      >
        {/* Background gradient */}
        <div className="absolute inset-0 hero-gradient" />
        {/* Overlay */}
        <div className="absolute inset-0 hero-overlay" />
        {/* Decorative circles */}
        <div className="absolute top-1/4 right-0 w-96 h-96 rounded-full bg-white/5 translate-x-1/2 blur-3xl" />
        <div className="absolute bottom-1/4 left-0 w-64 h-64 rounded-full bg-coral/10 -translate-x-1/3 blur-2xl" />

        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            <p className="font-sans text-xs tracking-[0.25em] uppercase text-white/70 mb-4">
              Est. 2010 &nbsp;·&nbsp; Madrid, España
            </p>
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-white uppercase tracking-wide leading-tight mb-6">
              {t.hero.title}
            </h1>
            <p className="font-sans text-lg sm:text-xl text-white/85 mb-10 leading-relaxed max-w-2xl mx-auto">
              {t.hero.subtitle}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                size="lg"
                onClick={() => scrollToSection("services")}
                className="bg-coral hover:bg-coral/90 text-white font-sans rounded-full px-8 text-base shadow-lg"
                data-ocid="hero.primary_button"
              >
                {t.hero.exploreCta}
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => scrollToSection("about")}
                className="border-white/40 bg-white/10 text-white hover:bg-white/20 font-sans rounded-full px-8 text-base backdrop-blur-sm"
                data-ocid="hero.secondary_button"
              >
                {t.hero.learnMore}
              </Button>
            </div>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-white/50 cursor-pointer"
          onClick={() => scrollToSection("about")}
          animate={{ y: [0, 6, 0] }}
          transition={{
            repeat: Number.POSITIVE_INFINITY,
            duration: 1.8,
            ease: "easeInOut",
          }}
          aria-hidden="true"
        >
          <span className="font-sans text-[10px] tracking-widest uppercase">
            Scroll
          </span>
          <ChevronDown className="w-4 h-4" />
        </motion.div>
      </section>

      {/* ============ ABOUT SECTION ============ */}
      <section
        id="about"
        className="bg-beige py-20 lg:py-28"
        aria-labelledby="about-heading"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Decorative box */}
            <motion.div
              initial={{ opacity: 0, x: -32 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="relative"
            >
              <div className="relative mx-auto max-w-sm lg:max-w-none">
                <div className="absolute -inset-4 border-2 border-coral/20 rounded-2xl" />
                <div className="relative bg-white rounded-xl overflow-hidden shadow-card">
                  <div className="h-2 bg-coral" />
                  <div className="p-10 lg:p-12 space-y-6">
                    <div className="w-16 h-16 bg-coral/10 rounded-full flex items-center justify-center">
                      <Globe className="w-8 h-8 text-coral" />
                    </div>
                    <div className="space-y-3">
                      <p className="font-sans text-xs uppercase tracking-[0.2em] text-coral font-semibold">
                        Madrid, España
                      </p>
                      <h3 className="font-serif text-2xl font-semibold text-navy">
                        Solete Vida Group S.L.
                      </h3>
                      <p className="font-sans text-sm text-muted-foreground leading-relaxed">
                        Bridging Mediterranean markets with international
                        expertise since 2010.
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div className="text-center p-3 bg-beige rounded-lg">
                        <p className="font-serif text-2xl font-bold text-coral">
                          15+
                        </p>
                        <p className="font-sans text-xs text-muted-foreground mt-0.5">
                          Years Experience
                        </p>
                      </div>
                      <div className="text-center p-3 bg-beige rounded-lg">
                        <p className="font-serif text-2xl font-bold text-coral">
                          200+
                        </p>
                        <p className="font-sans text-xs text-muted-foreground mt-0.5">
                          Clients Served
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Text content */}
            <motion.div
              initial={{ opacity: 0, x: 32 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
              className="space-y-6"
            >
              <div className="space-y-3">
                <p className="font-sans text-xs font-semibold uppercase tracking-[0.25em] text-coral">
                  {t.about.eyebrow}
                </p>
                <h2
                  id="about-heading"
                  className="font-serif text-3xl lg:text-4xl font-semibold text-navy leading-tight"
                >
                  {t.about.title}
                </h2>
              </div>
              <p className="font-sans text-base text-muted-foreground leading-relaxed">
                {t.about.body}
              </p>
              <Button
                className="bg-coral hover:bg-coral/90 text-white font-sans rounded-full px-7"
                onClick={() => scrollToSection("contact")}
                data-ocid="about.primary_button"
              >
                {t.about.cta}
              </Button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ============ SERVICES SECTION ============ */}
      <section
        id="services"
        className="bg-white py-20 lg:py-28"
        aria-labelledby="services-heading"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-14"
          >
            <h2
              id="services-heading"
              className="font-serif text-3xl lg:text-4xl font-semibold text-navy"
            >
              {t.services.title}
            </h2>
            <div className="mt-3 w-12 h-0.5 bg-coral mx-auto" />
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {services.map((service, i) => (
              <motion.div
                key={service.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <Card className="h-full bg-white border border-divider shadow-card hover:shadow-lg transition-shadow group">
                  <CardContent className="p-8 flex flex-col items-center text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-coral/10 flex items-center justify-center group-hover:bg-coral/15 transition-colors">
                      {service.icon}
                    </div>
                    <h3 className="font-serif text-xl font-semibold text-navy">
                      {service.title}
                    </h3>
                    <p className="font-sans text-sm text-muted-foreground leading-relaxed">
                      {service.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ WHY CHOOSE SECTION ============ */}
      <section
        id="why"
        className="bg-beige py-20 lg:py-28"
        aria-labelledby="why-heading"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-14"
          >
            <h2
              id="why-heading"
              className="font-serif text-3xl lg:text-4xl font-semibold text-navy"
            >
              {t.whyChoose.title}
            </h2>
            <div className="mt-3 w-12 h-0.5 bg-coral mx-auto" />
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Feature grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {features.map((feature, i) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.08 }}
                >
                  <Card className="h-full bg-white border border-divider shadow-card">
                    <CardContent className="p-6 space-y-3">
                      <div className="w-10 h-10 rounded-lg bg-coral/10 flex items-center justify-center">
                        {feature.icon}
                      </div>
                      <h3 className="font-serif text-base font-semibold text-navy">
                        {feature.title}
                      </h3>
                      <p className="font-sans text-sm text-muted-foreground leading-relaxed">
                        {feature.description}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Testimonials */}
            <div className="space-y-4">
              <p className="font-sans text-xs font-semibold uppercase tracking-[0.2em] text-coral mb-6">
                {t.testimonials.title}
              </p>
              {t.testimonials.items.map((testimonial, i) => (
                <motion.div
                  key={testimonial.author}
                  initial={{ opacity: 0, x: 24 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                >
                  <Card className="bg-white border border-divider shadow-card">
                    <CardContent className="p-6 space-y-4">
                      <div className="flex gap-0.5">
                        {["1", "2", "3", "4", "5"].map((n) => (
                          <Star
                            key={n}
                            className="w-3.5 h-3.5 fill-coral text-coral"
                          />
                        ))}
                      </div>
                      <blockquote className="font-sans text-sm text-muted-foreground leading-relaxed italic">
                        &ldquo;{testimonial.quote}&rdquo;
                      </blockquote>
                      <div>
                        <p className="font-sans text-sm font-semibold text-navy">
                          {testimonial.author}
                        </p>
                        <p className="font-sans text-xs text-muted-foreground">
                          {testimonial.position}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============ CONTACT SECTION ============ */}
      <section
        id="contact"
        className="bg-navy py-20 lg:py-28"
        aria-labelledby="contact-heading"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="space-y-6 max-w-2xl mx-auto"
          >
            <p className="font-sans text-xs font-semibold uppercase tracking-[0.25em] text-coral">
              {t.nav.contact}
            </p>
            <h2
              id="contact-heading"
              className="font-serif text-3xl lg:text-4xl font-semibold text-white"
            >
              Ready to Start Your Journey?
            </h2>
            <p className="font-sans text-base text-white/70 leading-relaxed">
              Connect with our team to explore how Solete Vida Group can help
              you achieve your Mediterranean business goals.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <a
                href="mailto:info@soletvida.com"
                className="inline-flex items-center justify-center px-8 py-3 bg-coral hover:bg-coral/90 text-white font-sans text-sm font-medium rounded-full transition-colors"
                data-ocid="contact.primary_button"
              >
                {t.about.cta}
              </a>
              {!isLoggedIn && (
                <Button
                  variant="outline"
                  onClick={onLogin}
                  className="border-white/30 bg-transparent text-white hover:bg-white/10 font-sans rounded-full px-8"
                  data-ocid="contact.secondary_button"
                >
                  {t.nav.clientLogin}
                </Button>
              )}
            </div>
          </motion.div>
        </div>
      </section>
    </main>
  );
}
