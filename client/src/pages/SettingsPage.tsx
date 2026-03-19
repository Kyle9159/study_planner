import { Eye, EyeOff, Loader2, Save, Settings } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

  const [xaiKey, setXaiKey] = useState("");
  const [githubToken, setGithubToken] = useState("");
  const [defaultModel, setDefaultModel] = useState("");

  const handleSaveXai = () => {
    if (!xaiKey.trim()) return;
    updateMutation.mutate({ xaiApiKey: xaiKey.trim() });
    setXaiKey("");
  };

  const handleSaveGithub = () => {
    if (!githubToken.trim()) return;
    updateMutation.mutate({ githubToken: githubToken.trim() });
    setGithubToken("");
  };

  const handleSaveDefaultModel = () => {
    if (!defaultModel) return;
    updateMutation.mutate({ defaultModel });
  };

  const handleClearXai = () => updateMutation.mutate({ xaiApiKey: "" });
  const handleClearGithub = () => updateMutation.mutate({ githubToken: "" });

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
      <PageHeader icon={Settings} title="Settings" subtitle="Configure AI providers and defaults" />
      <PageMain className="max-w-2xl space-y-4">
        {/* xAI */}
        <SectionCard
          title="xAI API Key"
          description="For Grok models (api.x.ai)"
        >
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Status:</span>
              {settings?.xaiApiKey ? (
                <span className="text-emerald-600 font-medium">Configured</span>
              ) : (
                <span className="text-muted-foreground">Not configured</span>
              )}
            </div>
            <div className="flex gap-2">
              <div className="flex-1 space-y-1">
                <Label htmlFor="xaiKey">New API Key</Label>
                <MaskedInput
                  id="xaiKey"
                  value={xaiKey}
                  onChange={setXaiKey}
                  placeholder="xai-..."
                  disabled={updateMutation.isPending}
                />
              </div>
              <div className="flex items-end gap-2">
                <Button
                  onClick={handleSaveXai}
                  disabled={!xaiKey.trim() || updateMutation.isPending}
                  size="sm"
                >
                  {updateMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save
                </Button>
                {settings?.xaiApiKey && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearXai}
                    disabled={updateMutation.isPending}
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </div>
        </SectionCard>

        {/* GitHub Token */}
        <SectionCard
          title="GitHub Token"
          description="For GitHub Models (models.inference.ai.azure.com) — GPT-4o, Llama, Grok, and more"
        >
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Status:</span>
              {settings?.githubToken ? (
                <span className="text-emerald-600 font-medium">Configured</span>
              ) : (
                <span className="text-muted-foreground">Not configured</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Create a GitHub Personal Access Token (PAT) with the{" "}
              <code className="font-mono bg-muted/60 rounded px-1">models:read</code> scope at
              github.com/settings/tokens
            </p>
            <div className="flex gap-2">
              <div className="flex-1 space-y-1">
                <Label htmlFor="githubToken">New Token</Label>
                <MaskedInput
                  id="githubToken"
                  value={githubToken}
                  onChange={setGithubToken}
                  placeholder="ghp_..."
                  disabled={updateMutation.isPending}
                />
              </div>
              <div className="flex items-end gap-2">
                <Button
                  onClick={handleSaveGithub}
                  disabled={!githubToken.trim() || updateMutation.isPending}
                  size="sm"
                >
                  {updateMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save
                </Button>
                {settings?.githubToken && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearGithub}
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

        {/* GitHub Copilot note */}
        <SectionCard title="GitHub Copilot (Coming Soon)">
          <p className="text-sm text-muted-foreground">
            GitHub Copilot doesn't use an API key — it requires the Copilot SDK (
            <code className="font-mono text-xs bg-muted/60 rounded px-1">
              @github/copilot-language-server
            </code>
            ). Support for direct Copilot integration is planned as a future enhancement.
            In the meantime, use <strong>GitHub Models</strong> above for similar access to
            GPT-4o and other models.
          </p>
        </SectionCard>
      </PageMain>
    </>
  );
};
