import { Eye, EyeOff, Loader2, Save, Settings } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { PageHeader, PageMain, SectionCard } from "@/components/layout";
import { ModelSelector } from "@/components/course/ModelSelector";
import { useSettings, useUpdateSettingsMutation } from "@/hooks/queries/useSettingsQueries";

const MaskedInput: React.FC<{
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
}> = ({ id, value, onChange, placeholder, disabled }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="pr-10"
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
        tabIndex={-1}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
};

export const SettingsPage: React.FC = () => {
  const { data: settings, isLoading } = useSettings();
  const updateMutation = useUpdateSettingsMutation();

  const [gabKey, setGabKey] = useState("");
  const [wguCookie, setWguCookie] = useState("");
  const [defaultModel, setDefaultModel] = useState("");

  const handleSaveGab = () => {
    if (!gabKey.trim()) return;
    updateMutation.mutate({ gabApiKey: gabKey.trim() });
    setGabKey("");
  };

  const handleSaveDefaultModel = () => {
    if (!defaultModel) return;
    updateMutation.mutate({ defaultModel });
  };

  const handleClearGab = () => updateMutation.mutate({ gabApiKey: "" });

  const handleSaveWguCookie = () => {
    if (!wguCookie.trim()) return;
    updateMutation.mutate({ wguSessionCookie: wguCookie.trim() });
    setWguCookie("");
  };
  const handleClearWguCookie = () => updateMutation.mutate({ wguSessionCookie: "" });

  if (isLoading) {
    return (
      <>
        <PageHeader icon={Settings} title="Settings" subtitle="API key configuration" />
        <PageMain>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 rounded-xl border border-border/60 bg-card/40" />
            ))}
          </div>
        </PageMain>
      </>
    );
  }

  return (
    <>
      <PageHeader icon={Settings} title="Settings" subtitle="Configure Gab AI access and defaults" />
      <PageMain className="max-w-2xl space-y-4">
        {/* Gab AI */}
        <SectionCard
          title="Gab API Key"
          description="Used for all available models via gab.ai/v1"
        >
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Status:</span>
              {settings?.gabApiKey ? (
                <span className="text-emerald-600 font-medium">Configured</span>
              ) : (
                <span className="text-muted-foreground">Not configured</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Add your gab.ai API key, then the model selector throughout the app will load every
              currently available model automatically.
            </p>
            <div className="flex gap-2">
              <div className="flex-1 space-y-1">
                <Label htmlFor="gabKey">New API Key</Label>
                <MaskedInput
                  id="gabKey"
                  value={gabKey}
                  onChange={setGabKey}
                  placeholder="gab_..."
                  disabled={updateMutation.isPending}
                />
              </div>
              <div className="flex items-end gap-2">
                <Button
                  onClick={handleSaveGab}
                  disabled={!gabKey.trim() || updateMutation.isPending}
                  size="sm"
                >
                  {updateMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save
                </Button>
                {settings?.gabApiKey && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearGab}
                    disabled={updateMutation.isPending}
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </div>
        </SectionCard>

        {/* WGU Session Cookie */}
        <SectionCard
          title="WGU Session Cookie"
          description="Required to scrape WGU course pages. Log into WGU in your browser, then copy your session cookie from DevTools and paste it here."
        >
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Status:</span>
              {settings?.wguSessionCookie ? (
                <span className="text-emerald-600 font-medium">Configured</span>
              ) : (
                <span className="text-muted-foreground">Not configured</span>
              )}
            </div>
            <Accordion type="single" collapsible>
              <AccordionItem value="how-to" className="border-border/60">
                <AccordionTrigger className="text-xs text-muted-foreground py-1 hover:no-underline">
                  How to find your session cookie
                </AccordionTrigger>
                <AccordionContent className="text-xs text-muted-foreground space-y-1 pb-2">
                  <p><strong>1.</strong> Log into WGU and navigate to any course page</p>
                  <p><strong>2.</strong> F12 → Application tab → Cookies → <code className="font-mono bg-muted/60 rounded px-1">cgp-oex.wgu.edu</code> (not the apps. subdomain)</p>
                  <p><strong>3.</strong> Find the <code className="font-mono bg-muted/60 rounded px-1">sessionid</code> row and copy its <strong>Value</strong></p>
                  <p className="pt-1">Paste the value below. This cookie expires after ~24 hours or when you log out.</p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
            <div className="flex gap-2">
              <div className="flex-1 space-y-1">
                <Label htmlFor="wguCookie">Session Cookie</Label>
                <MaskedInput
                  id="wguCookie"
                  value={wguCookie}
                  onChange={setWguCookie}
                  placeholder="sessionid=..."
                  disabled={updateMutation.isPending}
                />
              </div>
              <div className="flex items-end gap-2">
                <Button
                  onClick={handleSaveWguCookie}
                  disabled={!wguCookie.trim() || updateMutation.isPending}
                  size="sm"
                >
                  {updateMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save
                </Button>
                {settings?.wguSessionCookie && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearWguCookie}
                    disabled={updateMutation.isPending}
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Default Model */}
        <SectionCard
          title="Default Model"
          description="Pre-selects this model on the study/project guide tabs"
        >
          <div className="flex items-end gap-3">
            <div className="space-y-1.5">
              <Label>Model</Label>
              <ModelSelector
                value={defaultModel || settings?.defaultModel || ""}
                onChange={setDefaultModel}
                disabled={updateMutation.isPending}
                placeholder="Choose default model..."
              />
            </div>
            <Button
              onClick={handleSaveDefaultModel}
              disabled={!defaultModel || updateMutation.isPending}
              size="sm"
            >
              {updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save
            </Button>
          </div>
          {settings?.defaultModel && (
            <p className="mt-2 text-xs text-muted-foreground">
              Current default:{" "}
              <span className="font-mono">{settings.defaultModel}</span>
            </p>
          )}
        </SectionCard>
      </PageMain>
    </>
  );
};
