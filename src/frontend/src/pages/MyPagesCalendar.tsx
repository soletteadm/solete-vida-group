import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useTypedActor } from "@/hooks/useTypedActor";
import { useLanguage } from "@/i18n/LanguageContext";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Holiday } from "../backend.d";

// Actor returns Candid variant at runtime { easter: null } but TS type is enum string.
function resolveHolidayKey(h: Holiday): string {
  if (typeof h === "string") return h as string;
  const obj = h as Record<string, unknown>;
  if ("easter" in obj) return "easter";
  if ("christmas" in obj) return "christmas";
  if ("newyear" in obj) return "newyear";
  if ("midsommar" in obj) return "midsommar";
  return "none";
}

const HOLIDAY_DOTS: Record<string, string> = {
  easter: "#f0c040",
  christmas: "#c0392b",
  newyear: "#1a1a6e",
  midsommar: "#3a9e3a",
};

export default function MyPagesCalendar() {
  const { t } = useLanguage();
  const { actor, isFetching } = useTypedActor();
  const [activeHoliday, setActiveHoliday] = useState<string>("none");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!actor || isFetching) return;
    const fetch = async () => {
      try {
        const h = await actor.getActiveHoliday();
        const key = resolveHolidayKey(h);
        setActiveHoliday(key);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [actor, isFetching]);

  const handleToggle = async (key: string, checked: boolean) => {
    if (!actor) return;
    setSaving(true);
    try {
      const newHoliday = checked ? key : "none";
      const result = await actor.setActiveHoliday(newHoliday as Holiday);
      if ("ok" in result) {
        setActiveHoliday(newHoliday);
        toast.success(t.calendar.saved);
      } else {
        toast.error("err" in result ? result.err : t.calendar.saveError);
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t.calendar.saveError);
    } finally {
      setSaving(false);
    }
  };

  const holidays: { key: string; label: string }[] = [
    { key: "easter", label: t.calendar.easter },
    { key: "christmas", label: t.calendar.christmas },
    { key: "newyear", label: t.calendar.newyear },
    { key: "midsommar", label: t.calendar.midsommar },
  ];

  return (
    <div className="space-y-6">
      <Card className="border border-divider shadow-card">
        <CardHeader>
          <CardTitle className="font-serif text-xl text-foreground">
            {t.calendar.highHolidays}
          </CardTitle>
          <CardDescription className="font-sans text-sm text-muted-foreground">
            {t.calendar.subtitle}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="space-y-4" data-ocid="calendar.loading_state">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-12 w-full rounded-md" />
              ))}
            </div>
          ) : (
            holidays.map(({ key, label }) => {
              const isActive = activeHoliday === key;
              return (
                <label
                  key={key}
                  htmlFor={`switch-${key}`}
                  data-ocid={`calendar.${key}.row`}
                  className={`flex items-center justify-between rounded-xl border px-5 min-h-[64px] py-3 transition-all cursor-pointer ${
                    isActive
                      ? "border-gold bg-gold/10 shadow-sm"
                      : "border-divider bg-card active:bg-gold/5"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="inline-block w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: HOLIDAY_DOTS[key] }}
                    />
                    <span className="font-sans text-base font-medium text-foreground">
                      {label}
                    </span>
                    {isActive && (
                      <span className="text-xs font-medium text-gold bg-gold/20 px-2 py-0.5 rounded-full">
                        {t.calendar.active}
                      </span>
                    )}
                  </div>
                  <div className="p-3 -mr-3">
                    <Switch
                      id={`switch-${key}`}
                      data-ocid={`calendar.${key}.switch`}
                      checked={isActive}
                      disabled={saving}
                      onCheckedChange={(checked) => handleToggle(key, checked)}
                    />
                  </div>
                </label>
              );
            })
          )}
        </CardContent>
      </Card>

      <div
        className="text-sm text-muted-foreground font-sans"
        data-ocid="calendar.active.panel"
      >
        {activeHoliday === "none" ? (
          <p className="italic">{t.calendar.noHoliday}</p>
        ) : (
          <p>\u2705 {holidays.find((h) => h.key === activeHoliday)?.label}</p>
        )}
      </div>
    </div>
  );
}
