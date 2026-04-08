import { useCallback, useEffect, useRef, useState } from "react";
import type { Holiday } from "../backend.d";
import { useLanguage } from "../i18n/LanguageContext";

interface HolidaySplashProps {
  holiday: Holiday;
  onDismiss: () => void;
}

type HolidayVisualKey = "easter" | "christmas" | "newyear" | "midsommar";

interface Particle {
  x: number;
  y: number;
  size: number;
  speed: number;
  drift: number;
  rotation: number;
  rotationSpeed: number;
  emoji: string;
  opacity: number;
}

const HOLIDAY_VISUALS: Record<
  HolidayVisualKey,
  {
    emojis: string[];
    background: string;
    textColor: string;
    rise: boolean;
  }
> = {
  easter: {
    emojis: [
      "\ud83e\udd5a",
      "\ud83d\udc23",
      "\ud83c\udf37",
      "\ud83d\udc25",
      "\ud83e\udd5a",
      "\ud83d\udc23",
    ],
    background: "rgba(255, 245, 200, 0.88)",
    textColor: "#7a5c00",
    rise: false,
  },
  christmas: {
    emojis: [
      "\u2744\ufe0f",
      "\ud83c\udf84",
      "\u2b50",
      "\u2744\ufe0f",
      "\ud83c\udf84",
      "\ud83c\udf81",
    ],
    background: "rgba(10, 60, 20, 0.90)",
    textColor: "#f5e6c8",
    rise: false,
  },
  newyear: {
    emojis: [
      "\u2728",
      "\ud83c\udf89",
      "\ud83c\udf86",
      "\u2b50",
      "\ud83c\udf87",
      "\u2728",
    ],
    background: "rgba(5, 5, 40, 0.92)",
    textColor: "#ffd700",
    rise: true,
  },
  midsommar: {
    emojis: [
      "\ud83c\udf38",
      "\u2600\ufe0f",
      "\ud83c\udf3c",
      "\ud83c\udf3f",
      "\ud83c\udf38",
      "\u2600\ufe0f",
    ],
    background: "rgba(200, 240, 180, 0.88)",
    textColor: "#2d5a00",
    rise: false,
  },
};

export default function HolidaySplash({
  holiday,
  onDismiss,
}: HolidaySplashProps) {
  const { t } = useLanguage();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const [visible, setVisible] = useState(false);
  const [dismissing, setDismissing] = useState(false);

  const visuals = HOLIDAY_VISUALS[holiday as HolidayVisualKey];

  const greetingMap: Record<HolidayVisualKey, string> = {
    easter: t.calendar.easterGreeting,
    christmas: t.calendar.christmasGreeting,
    newyear: t.calendar.newyearGreeting,
    midsommar: t.calendar.midsommarGreeting,
  };

  const greeting = greetingMap[holiday as HolidayVisualKey];

  const handleDismiss = useCallback(() => {
    if (dismissing) return;
    setDismissing(true);
    setTimeout(() => {
      onDismiss();
    }, 500);
  }, [dismissing, onDismiss]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " " || e.key === "Escape") {
        handleDismiss();
      }
    },
    [handleDismiss],
  );

  // Fade in on mount, auto-dismiss after 4.5s
  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), 50);
    const t2 = setTimeout(() => handleDismiss(), 4500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [handleDismiss]);

  // Canvas animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !visuals) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const count = 70;
    particlesRef.current = Array.from({ length: count }, () => ({
      x: Math.random() * window.innerWidth,
      y: visuals.rise
        ? window.innerHeight + Math.random() * window.innerHeight
        : -Math.random() * window.innerHeight,
      size: 16 + Math.random() * 24,
      speed: 1 + Math.random() * 2,
      drift: (Math.random() - 0.5) * 1.5,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.05,
      emoji: visuals.emojis[Math.floor(Math.random() * visuals.emojis.length)],
      opacity: 0.6 + Math.random() * 0.4,
    }));

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const p of particlesRef.current) {
        ctx.save();
        ctx.globalAlpha = p.opacity;
        ctx.font = `${p.size}px serif`;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillText(p.emoji, -p.size / 2, p.size / 2);
        ctx.restore();

        if (visuals.rise) {
          p.y -= p.speed;
          p.x += p.drift;
          p.opacity = Math.max(0, p.opacity - 0.002);
          if (p.y < -p.size || p.opacity <= 0) {
            p.y = canvas.height + p.size;
            p.x = Math.random() * canvas.width;
            p.opacity = 0.6 + Math.random() * 0.4;
          }
        } else {
          p.y += p.speed;
          p.x += p.drift;
          p.rotation += p.rotationSpeed;
          if (p.y > canvas.height + p.size) {
            p.y = -p.size;
            p.x = Math.random() * canvas.width;
          }
          if (p.x < -p.size) p.x = canvas.width + p.size;
          if (p.x > canvas.width + p.size) p.x = -p.size;
        }
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [visuals]);

  if (!visuals) return null;

  return (
    // biome-ignore lint/a11y/useSemanticElements: full-viewport overlay needs div positioning
    // biome-ignore lint/a11y/noNoninteractiveTabindex: role="dialog" makes this interactive
    <div
      role="dialog"
      aria-modal="true"
      aria-label={greeting}
      data-ocid="holiday.splash"
      onClick={handleDismiss}
      onKeyDown={handleKeyDown}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: visuals.background,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        opacity: dismissing ? 0 : visible ? 1 : 0,
        transition: "opacity 0.5s ease",
        outline: "none",
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "relative",
          zIndex: 1,
          textAlign: "center",
          padding: "2rem",
        }}
      >
        <p
          style={{
            fontSize: "clamp(2rem, 8vw, 4.5rem)",
            fontWeight: 700,
            color: visuals.textColor,
            textShadow: "0 2px 12px rgba(0,0,0,0.25)",
            margin: 0,
            fontFamily: "Georgia, serif",
            letterSpacing: "0.02em",
          }}
        >
          {greeting}
        </p>
      </div>
      <p
        style={{
          position: "absolute",
          bottom: "2rem",
          color: visuals.textColor,
          opacity: 0.7,
          fontSize: "0.9rem",
          fontFamily: "sans-serif",
          letterSpacing: "0.05em",
          margin: 0,
        }}
      >
        {t.calendar.clickToClose}
      </p>
    </div>
  );
}
