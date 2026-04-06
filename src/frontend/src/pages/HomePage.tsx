import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useTypedActor } from "@/hooks/useTypedActor";
import { useLanguage } from "@/i18n/LanguageContext";
import {
  CheckCircle,
  ChevronDown,
  Globe,
  Layers,
  Loader2,
  MapPin,
  Network,
  Search,
  SendHorizonal,
  Shield,
  Star,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";

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

  const customers = [
    {
      name: "RFV",
      description: "Sweden Pensioners Gov",
      logo: "/assets/generated/logo-rfv-transparent.dim_300x200.png",
    },
    {
      name: "Personal Id",
      description: "",
      logo: "/assets/generated/logo-personalid-transparent.dim_300x200.png",
    },
    {
      name: "Guldbrev.se",
      description: "",
      logo: "/assets/generated/logo-guldbrev-transparent.dim_300x200.png",
    },
    {
      name: "Uprgight Technology",
      description: "IT Consultant",
      logo: "/assets/generated/logo-upright-transparent.dim_300x200.png",
    },
    {
      name: "Furniture Design Company",
      description: "",
      logo: "/assets/generated/logo-furniture-transparent.dim_300x200.png",
    },
    {
      name: "H&M",
      description: "Hennes & Mauritz",
      logo: "/assets/generated/logo-hm-transparent.dim_300x200.png",
    },
    {
      name: "TDC",
      description: "",
      logo: "/assets/generated/logo-tdc-transparent.dim_300x200.png",
    },
    {
      name: "Scania",
      description: "",
      logo: "/assets/generated/logo-scania-transparent.dim_300x200.png",
    },
    {
      name: "Swedish Employment Office",
      description: "",
      logo: "/assets/generated/logo-arbetsformedlingen-transparent.dim_300x200.png",
    },
    {
      name: "Courlux",
      description: "",
      logo: "/assets/generated/logo-courlux-transparent.dim_300x200.png",
    },
  ];

  const services = [
    {
      icon: <Layers className="w-7 h-7 text-gold" />,
      title: t.services.systemDesign.title,
      description: t.services.systemDesign.description,
    },
    {
      icon: <Search className="w-7 h-7 text-gold" />,
      title: t.services.systemAnalysis.title,
      description: t.services.systemAnalysis.description,
    },
    {
      icon: <CheckCircle className="w-7 h-7 text-gold" />,
      title: t.services.systemImpl.title,
      description: t.services.systemImpl.description,
    },
  ];

  const features = [
    {
      icon: <Shield className="w-6 h-6 text-gold" />,
      title: t.whyChoose.expertTeam.title,
      description: t.whyChoose.expertTeam.description,
    },
    {
      icon: <Network className="w-6 h-6 text-gold" />,
      title: t.whyChoose.trustedNetwork.title,
      description: t.whyChoose.trustedNetwork.description,
    },
    {
      icon: <MapPin className="w-6 h-6 text-gold" />,
      title: t.whyChoose.localKnowledge.title,
      description: t.whyChoose.localKnowledge.description,
    },
    {
      icon: <Globe className="w-6 h-6 text-gold" />,
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
        <div className="absolute bottom-1/4 left-0 w-64 h-64 rounded-full bg-gold/10 -translate-x-1/3 blur-2xl" />

        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            <p className="font-sans text-xs tracking-[0.25em] uppercase text-white/70 mb-4">
              Est. 1998 &nbsp;·&nbsp; Madrid, España
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
                className="bg-gold hover:bg-gold/90 text-black font-sans rounded-full px-8 text-base shadow-lg"
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
                <div className="absolute -inset-4 border-2 border-gold/30 rounded-2xl" />
                <div className="relative bg-card rounded-xl overflow-hidden shadow-card">
                  <div className="h-2 bg-gold" />
                  <div className="p-10 lg:p-12 space-y-6">
                    <div className="w-16 h-16 bg-gold/15 rounded-full flex items-center justify-center">
                      <Globe className="w-8 h-8 text-gold" />
                    </div>
                    <div className="space-y-3">
                      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold font-semibold">
                        Madrid, España
                      </p>
                      <h3 className="font-serif text-2xl font-semibold text-foreground">
                        Solete Vida Group S.L.
                      </h3>
                      <p className="font-sans text-sm text-muted-foreground leading-relaxed">
                        Bridging markets with international IT expertise since
                        1998.
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div className="text-center p-3 bg-beige rounded-lg">
                        <p className="font-serif text-2xl font-bold text-gold">
                          25+
                        </p>
                        <p className="font-sans text-xs text-muted-foreground mt-0.5">
                          Years Experience
                        </p>
                      </div>
                      <div className="text-center p-3 bg-beige rounded-lg">
                        <p className="font-serif text-2xl font-bold text-gold">
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
                <p className="font-sans text-xs font-semibold uppercase tracking-[0.25em] text-gold">
                  {t.about.eyebrow}
                </p>
                <h2
                  id="about-heading"
                  className="font-serif text-3xl lg:text-4xl font-semibold text-foreground leading-tight"
                >
                  {t.about.title}
                </h2>
              </div>
              <p className="font-sans text-base text-muted-foreground leading-relaxed">
                {t.about.body}
              </p>
              <Button
                className="bg-gold hover:bg-gold/90 text-black font-sans rounded-full px-7"
                onClick={() => scrollToSection("contact")}
                data-ocid="about.primary_button"
              >
                {t.about.cta}
              </Button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ============ CUSTOMERS SECTION ============ */}
      <section
        id="customers"
        className="bg-card py-20 lg:py-28"
        aria-labelledby="customers-heading"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-14"
          >
            <p className="font-sans text-xs font-semibold uppercase tracking-[0.25em] text-gold mb-3">
              {t.customers.eyebrow}
            </p>
            <h2
              id="customers-heading"
              className="font-serif text-3xl lg:text-4xl font-semibold text-foreground"
            >
              {t.customers.title}
            </h2>
            <div className="mt-3 w-12 h-0.5 bg-gold mx-auto" />
            <p className="mt-6 font-sans text-base text-muted-foreground max-w-2xl mx-auto">
              {t.customers.subtitle}
            </p>
          </motion.div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {customers.map((customer, i) => (
              <motion.div
                key={customer.name}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.07 }}
                data-ocid={`customers.item.${i + 1}`}
              >
                <Card className="h-full bg-white border border-divider shadow-card hover:shadow-lg hover:-translate-y-1 transition-all duration-200 group">
                  <CardContent className="p-5 flex flex-col items-center text-center space-y-3">
                    <div className="w-full h-20 flex items-center justify-center">
                      <img
                        src={customer.logo}
                        alt={customer.name}
                        className="h-20 w-full object-contain group-hover:scale-105 transition-transform duration-200"
                      />
                    </div>
                    <p className="font-sans text-sm font-semibold text-foreground leading-tight">
                      {customer.name}
                    </p>
                    {customer.description && (
                      <p className="font-sans text-xs text-muted-foreground">
                        {customer.description}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ SERVICES SECTION ============ */}
      <section
        id="services"
        className="bg-beige py-20 lg:py-28"
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
              className="font-serif text-3xl lg:text-4xl font-semibold text-foreground"
            >
              {t.services.title}
            </h2>
            <div className="mt-3 w-12 h-0.5 bg-gold mx-auto" />
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
                <Card className="h-full bg-card border border-divider shadow-card hover:shadow-lg transition-shadow group">
                  <CardContent className="p-8 flex flex-col items-center text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-gold/15 flex items-center justify-center group-hover:bg-gold/20 transition-colors">
                      {service.icon}
                    </div>
                    <h3 className="font-serif text-xl font-semibold text-foreground">
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
        className="bg-card py-20 lg:py-28"
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
              className="font-serif text-3xl lg:text-4xl font-semibold text-foreground"
            >
              {t.whyChoose.title}
            </h2>
            <div className="mt-3 w-12 h-0.5 bg-gold mx-auto" />
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
                  <Card className="h-full bg-beige border border-divider shadow-card">
                    <CardContent className="p-6 space-y-3">
                      <div className="w-10 h-10 rounded-lg bg-gold/15 flex items-center justify-center">
                        {feature.icon}
                      </div>
                      <h3 className="font-serif text-base font-semibold text-foreground">
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
              <p className="font-sans text-xs font-semibold uppercase tracking-[0.2em] text-gold mb-6">
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
                  <Card className="bg-card border border-divider shadow-card">
                    <CardContent className="p-6 space-y-4">
                      <div className="flex gap-0.5">
                        {["1", "2", "3", "4", "5"].map((n) => (
                          <Star
                            key={n}
                            className="w-3.5 h-3.5 fill-gold text-gold"
                          />
                        ))}
                      </div>
                      <blockquote className="font-sans text-sm text-muted-foreground leading-relaxed italic">
                        &ldquo;{testimonial.quote}&rdquo;
                      </blockquote>
                      <div>
                        <p className="font-sans text-sm font-semibold text-foreground">
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
      <ContactSection isLoggedIn={isLoggedIn} onLogin={onLogin} />
    </main>
  );
}

// ---- Contact Form Sub-component ----
function ContactSection({
  isLoggedIn,
  onLogin,
}: {
  isLoggedIn: boolean;
  onLogin: () => void;
}) {
  const { t } = useLanguage();
  const { actor } = useTypedActor();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const MAX_CHARS = 500;
  const charsLeft = MAX_CHARS - message.length;
  const hasUnsafe =
    name.includes("<") ||
    name.includes(">") ||
    email.includes("<") ||
    email.includes(">") ||
    message.includes("<") ||
    message.includes(">");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (hasUnsafe || !actor) return;
    setSubmitting(true);
    try {
      const result = await actor.submitContact(
        name.trim(),
        email.trim(),
        message.trim(),
      );
      if ("ok" in result) {
        setSubmitted(true);
      } else {
        toast.error(`${t.contactForm.errorTitle}: ${result.err}`);
      }
    } catch (err: any) {
      toast.error(
        `${t.contactForm.errorTitle}: ${err?.message ?? String(err)}`,
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setName("");
    setEmail("");
    setMessage("");
    setSubmitted(false);
  };

  return (
    <section
      id="contact"
      className="bg-black py-20 lg:py-28"
      aria-labelledby="contact-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-10"
          >
            <p className="font-sans text-xs font-semibold uppercase tracking-[0.25em] text-gold">
              {t.nav.contact}
            </p>
            <h2
              id="contact-heading"
              className="font-serif text-3xl lg:text-4xl font-semibold text-white mt-3"
            >
              {t.contactForm.title}
            </h2>
            <p className="font-sans text-base text-white/70 leading-relaxed mt-3">
              {t.contactForm.subtitle}
            </p>
          </motion.div>

          <AnimatePresence mode="wait">
            {submitted ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.35 }}
                className="text-center py-14 px-8 rounded-2xl border border-gold/30 bg-white/5"
                data-ocid="contact.success_state"
              >
                <div className="flex justify-center mb-5">
                  <div className="w-16 h-16 rounded-full bg-gold/20 flex items-center justify-center">
                    <CheckCircle className="w-8 h-8 text-gold" />
                  </div>
                </div>
                <h3 className="font-serif text-2xl font-semibold text-white mb-2">
                  {t.contactForm.successTitle}
                </h3>
                <p className="font-sans text-white/70 mb-8">
                  {t.contactForm.successMsg}
                </p>
                <Button
                  onClick={handleReset}
                  variant="outline"
                  className="border-gold/50 bg-transparent text-gold hover:bg-gold/10 font-sans rounded-full px-8"
                  data-ocid="contact.secondary_button"
                >
                  {t.contactForm.sendAnother}
                </Button>
              </motion.div>
            ) : (
              <motion.form
                key="form"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.35 }}
                onSubmit={handleSubmit}
                className="space-y-6 rounded-2xl border border-white/10 bg-white/5 p-8"
                data-ocid="contact.panel"
              >
                {/* Name */}
                <div className="space-y-2">
                  <Label
                    htmlFor="contact-name"
                    className="font-sans text-sm text-white/80"
                  >
                    {t.contactForm.name}
                  </Label>
                  <Input
                    id="contact-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    maxLength={120}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-gold focus:ring-gold/30"
                    placeholder="Jane Smith"
                    data-ocid="contact.input"
                  />
                  {(name.includes("<") || name.includes(">")) && (
                    <p
                      className="text-xs text-red-400 mt-1"
                      data-ocid="contact.error_state"
                    >
                      {t.contactForm.unsafeWarning}
                    </p>
                  )}
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label
                    htmlFor="contact-email"
                    className="font-sans text-sm text-white/80"
                  >
                    {t.contactForm.email}
                  </Label>
                  <Input
                    id="contact-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    maxLength={200}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-gold focus:ring-gold/30"
                    placeholder="jane@example.com"
                    data-ocid="contact.input"
                  />
                  {(email.includes("<") || email.includes(">")) && (
                    <p
                      className="text-xs text-red-400 mt-1"
                      data-ocid="contact.error_state"
                    >
                      {t.contactForm.unsafeWarning}
                    </p>
                  )}
                </div>

                {/* Message */}
                <div className="space-y-2">
                  <Label
                    htmlFor="contact-message"
                    className="font-sans text-sm text-white/80"
                  >
                    {t.contactForm.message}
                  </Label>
                  <Textarea
                    id="contact-message"
                    value={message}
                    onChange={(e) => {
                      if (e.target.value.length <= MAX_CHARS) {
                        setMessage(e.target.value);
                      }
                    }}
                    required
                    rows={5}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-gold focus:ring-gold/30 resize-none"
                    placeholder={t.contactForm.messagePlaceholder}
                    data-ocid="contact.textarea"
                  />
                  <div className="flex items-center justify-between">
                    <div>
                      {message.includes("<") || message.includes(">") ? (
                        <p
                          className="text-xs text-red-400"
                          data-ocid="contact.error_state"
                        >
                          {t.contactForm.unsafeWarning}
                        </p>
                      ) : null}
                    </div>
                    <span
                      className={`font-sans text-xs tabular-nums ${
                        charsLeft < 50
                          ? charsLeft < 20
                            ? "text-red-400 font-semibold"
                            : "text-amber-400"
                          : "text-white/50"
                      }`}
                    >
                      {t.contactForm.charsRemaining.replace(
                        "{n}",
                        String(charsLeft),
                      )}
                    </span>
                  </div>
                </div>

                {/* Submit */}
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <Button
                    type="submit"
                    disabled={
                      submitting ||
                      hasUnsafe ||
                      !message.trim() ||
                      !name.trim() ||
                      !email.trim()
                    }
                    className="flex-1 bg-gold hover:bg-gold/90 text-black font-sans font-medium rounded-full px-8 disabled:opacity-50"
                    data-ocid="contact.submit_button"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t.contactForm.submitting}
                      </>
                    ) : (
                      <>
                        <SendHorizonal className="mr-2 h-4 w-4" />
                        {t.contactForm.submit}
                      </>
                    )}
                  </Button>
                  {!isLoggedIn && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onLogin}
                      className="border-white/30 bg-transparent text-white hover:bg-white/10 font-sans rounded-full px-8"
                      data-ocid="contact.secondary_button"
                    >
                      {t.nav.clientLogin}
                    </Button>
                  )}
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
