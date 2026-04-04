import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useTypedActor } from "@/hooks/useTypedActor";
import { useLanguage } from "@/i18n/LanguageContext";
import { Check, Copy, Loader2, Lock, User } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Option, UserProfile } from "../backend.d";

interface MyPagesProfileProps {
  principalText: string | null;
  isAdmin: boolean;
  isUser: boolean;
  isGuest: boolean;
  roleLabel: string;
}

function formatDate(ts: bigint): string {
  const ms = Number(ts) / 1_000_000;
  return new Date(ms).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function MyPagesProfile({
  principalText,
  isAdmin,
  isUser,
  isGuest,
  roleLabel,
}: MyPagesProfileProps) {
  const { t } = useLanguage();
  const { actor, isFetching } = useTypedActor();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const canEdit = isAdmin || isUser;
  const isReadOnly = isGuest;

  useEffect(() => {
    if (!actor || isFetching) return;
    let cancelled = false;
    setLoading(true);
    actor
      .getMyProfile()
      .then((opt: Option<UserProfile>) => {
        if (cancelled) return;
        if (opt.__kind__ === "Some") {
          setProfile(opt.value);
          setName(opt.value.name);
          setEmail(opt.value.email);
          setPhone(opt.value.phone);
        } else {
          setProfile(null);
          setName("");
          setEmail("");
          setPhone("");
        }
      })
      .catch(() => {
        if (!cancelled) setProfile(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [actor, isFetching]);

  const handleSave = async () => {
    if (!actor) {
      toast.error(
        "Cannot save: backend connection not ready. Please refresh the page and try again.",
      );
      return;
    }
    setSaving(true);
    try {
      const result = await actor.updateMyProfile(name, email, phone);
      if ("ok" in result) {
        toast.success(t.myPages.profileSaved);
        setProfile((prev) =>
          prev
            ? { ...prev, name, email, phone }
            : {
                name,
                email,
                phone,
                registeredAt: BigInt(Date.now() * 1_000_000),
              },
        );
      } else {
        // Backend returned an error variant -- show the exact message from the backend
        const errMsg = result.err || "Unknown backend error";
        toast.error(`Failed to save profile: ${errMsg}`, {
          duration: 8000,
          description: `Principal: ${principalText ?? "unknown"} | Role: ${roleLabel}`,
        });
      }
    } catch (err: unknown) {
      // JavaScript/network error -- show full details
      let detail = "Unknown error";
      if (err instanceof Error) {
        detail = err.message;
      } else if (typeof err === "string") {
        detail = err;
      } else {
        try {
          detail = JSON.stringify(err);
        } catch {
          detail = String(err);
        }
      }
      toast.error(`Failed to save profile: ${detail}`, {
        duration: 10000,
        description: `Principal: ${principalText ?? "unknown"} | Role: ${roleLabel}`,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCopyPrincipal = () => {
    if (!principalText) return;
    navigator.clipboard.writeText(principalText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="space-y-6" data-ocid="profile.section">
      {/* Profile header card */}
      <Card className="border border-divider shadow-card">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gold/15 flex items-center justify-center">
              <User className="w-6 h-6 text-gold" />
            </div>
            <div>
              <CardTitle className="font-serif text-xl text-foreground">
                {t.myPages.editProfile}
              </CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge
                  variant="outline"
                  className="border-gold text-gold text-xs capitalize font-sans"
                >
                  {t.common[roleLabel as keyof typeof t.common] || roleLabel}
                </Badge>
                {isReadOnly && (
                  <Badge variant="secondary" className="text-xs font-sans">
                    <Lock className="w-3 h-3 mr-1" />
                    {t.myPages.readonly}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Principal ID */}
          <div className="space-y-1.5">
            <Label className="font-sans text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t.myPages.principalId}
            </Label>
            <div className="flex items-center gap-2">
              <code
                className="flex-1 text-xs font-mono bg-muted/50 px-3 py-2.5 rounded-md text-foreground break-all border border-divider"
                data-ocid="profile.input"
              >
                {principalText ?? "\u2014"}
              </code>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCopyPrincipal}
                className="shrink-0 h-9 w-9"
                aria-label="Copy principal ID"
                data-ocid="profile.button"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4 text-muted-foreground" />
                )}
              </Button>
            </div>
          </div>

          {/* Registration date */}
          {profile && (
            <div className="space-y-1.5">
              <Label className="font-sans text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t.myPages.registeredAt}
              </Label>
              <p className="font-sans text-sm text-foreground px-3 py-2.5 bg-muted/30 rounded-md border border-divider">
                {formatDate(profile.registeredAt)}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Profile form */}
      <Card className="border border-divider shadow-card">
        <CardHeader>
          <CardTitle className="font-serif text-lg text-foreground">
            {isReadOnly ? (
              <span className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-muted-foreground" />
                {t.myPages.readonly}
              </span>
            ) : (
              t.myPages.profile
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4" data-ocid="profile.loading_state">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Name */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="profile-name"
                  className="font-sans text-sm font-medium"
                >
                  {t.myPages.name}
                </Label>
                <Input
                  id="profile-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isReadOnly}
                  placeholder={isReadOnly ? "\u2014" : t.myPages.name}
                  className="font-sans text-sm"
                  data-ocid="profile.input"
                />
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="profile-email"
                  className="font-sans text-sm font-medium"
                >
                  {t.myPages.email}
                </Label>
                <Input
                  id="profile-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isReadOnly}
                  placeholder={isReadOnly ? "\u2014" : t.myPages.email}
                  className="font-sans text-sm"
                  data-ocid="profile.input"
                />
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="profile-phone"
                  className="font-sans text-sm font-medium"
                >
                  {t.myPages.phone}
                </Label>
                <Input
                  id="profile-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={isReadOnly}
                  placeholder={isReadOnly ? "\u2014" : t.myPages.phone}
                  className="font-sans text-sm"
                  data-ocid="profile.input"
                />
              </div>

              {/* Save button */}
              {canEdit && (
                <div className="pt-2">
                  <Button
                    onClick={handleSave}
                    disabled={saving || isFetching}
                    className="bg-gold hover:bg-gold/90 text-black font-sans rounded-full px-6"
                    data-ocid="profile.submit_button"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {t.myPages.saving}
                      </>
                    ) : (
                      t.myPages.save
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
