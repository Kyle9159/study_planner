import {
  AlertTriangle,
  Check,
  Copy,
  Loader2,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/layout";
import { ModelSelector } from "./ModelSelector";
import { StudyGuideRenderer } from "./StudyGuideRenderer";
import { copyTextToClipboard, formatDateTime } from "@/lib/utils";
import type { StudyGuide, ProjectGuide } from "@shared/types";

interface GuidePanelProps {
  guide: StudyGuide | ProjectGuide | null;
  isGenerating: boolean;
  onGenerate: (model: string) => void;
  guideType: "study" | "project";
  defaultModel?: string;
}

export const GuidePanel: React.FC<GuidePanelProps> = ({
  guide,
  isGenerating,
  onGenerate,
  guideType,
  defaultModel,
}) => {
  const [selectedModel, setSelectedModel] = useState(
    guide?.model ?? defaultModel ?? "",
  );
  const [copied, setCopied] = useState(false);

  const handleGenerate = () => {
    if (!selectedModel) return;
    onGenerate(selectedModel);
  };

  const handleCopy = async () => {
    if (!guide?.content) return;
    const ok = await copyTextToClipboard(guide.content);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const label = guideType === "study" ? "Study Guide" : "Project Guide";
  const description =
    guideType === "study"
      ? "AI analyzes your materials and rubric to tell you exactly what to focus on."
      : "AI generates a step-by-step plan for completing your project based on the rubric.";

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <ModelSelector
          value={selectedModel}
          onChange={setSelectedModel}
          disabled={isGenerating}
        />
        <Button
          onClick={handleGenerate}
          disabled={!selectedModel || isGenerating}
          size="sm"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : guide ? (
            <>
              <RefreshCw className="h-4 w-4" />
              Regenerate
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Generate {label}
            </>
          )}
        </Button>

        {guide && (
          <Button variant="outline" size="sm" onClick={handleCopy}>
            {copied ? (
              <>
                <Check className="h-4 w-4 text-emerald-600" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copy
              </>
            )}
          </Button>
        )}
      </div>

      {/* Guide content */}
      {guide ? (
        <div className="rounded-xl border border-border/60 bg-card/40 p-5">
          {guide.wasTruncated && (
            <div className="flex items-center gap-2 mb-4 rounded-lg bg-amber-50 px-3 py-2 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span className="text-xs">
                Some material was truncated due to length limits. The guide reflects the
                most important content.
              </span>
            </div>
          )}
          {guideType === "study" ? (
            <StudyGuideRenderer content={guide.content} />
          ) : (
            <div className="markdown-body">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{guide.content}</ReactMarkdown>
            </div>
          )}
          <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground border-t border-border/60 pt-3">
            <Badge variant="outline" className="font-mono text-xs">
              {guide.model}
            </Badge>
            <span>Generated {formatDateTime(guide.updatedAt)}</span>
          </div>
        </div>
      ) : !isGenerating ? (
        <EmptyState
          icon={Sparkles}
          title={`No ${label} yet`}
          description={description}
        />
      ) : (
        <div className="rounded-xl border border-border/60 bg-card/40 p-8 flex flex-col items-center gap-3 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">Generating {label}...</p>
            <p className="text-xs text-muted-foreground mt-1">
              This may take 30–60 seconds. Please wait.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
