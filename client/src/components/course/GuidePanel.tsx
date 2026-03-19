import {
  AlertTriangle,
  Check,
  ChevronDown,
  Copy,
  Download,
  FileDown,
  FileText,
  Loader2,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { EmptyState } from "@/components/layout";
import { ModelSelector } from "./ModelSelector";
import { StudyGuideRenderer } from "./StudyGuideRenderer";
import { exportAnkiCsv, exportMarkdown, exportPdf } from "@/lib/export";
import { copyTextToClipboard, formatDateTime, formatRelativeTime } from "@/lib/utils";
import type { ProjectGuide, StudyGuide } from "@shared/types";

interface GuidePanelProps {
  guide: StudyGuide | ProjectGuide | null;
  isGenerating: boolean;
  onGenerate: (model: string, options?: { minimalPass?: boolean }) => void;
  guideType: "study" | "project";
  defaultModel?: string;
  courseName?: string;
}

export const GuidePanel: React.FC<GuidePanelProps> = ({
  guide,
  isGenerating,
  onGenerate,
  guideType,
  defaultModel,
  courseName = "guide",
}) => {
  const [selectedModel, setSelectedModel] = useState(
    guide?.model ?? defaultModel ?? "",
  );
  const [copied, setCopied] = useState(false);
  const [minimalPass, setMinimalPass] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const pendingModel = useRef<string>("");

  const handleGenerate = () => {
    if (!selectedModel) return;
    if (guide) {
      // existing guide — confirm before overwriting
      pendingModel.current = selectedModel;
      setConfirmOpen(true);
    } else {
      onGenerate(selectedModel, { minimalPass });
    }
  };

  const handleConfirmRegenerate = () => {
    onGenerate(pendingModel.current, { minimalPass });
    setConfirmOpen(false);
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
          <>
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

            {/* Export dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4" />
                  Export
                  <ChevronDown className="h-3 w-3 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuLabel>Export As</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => exportMarkdown(guide, courseName)}>
                  <FileText className="h-4 w-4" />
                  Markdown (.md)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportPdf(guide, courseName)}>
                  <FileDown className="h-4 w-4" />
                  PDF
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => exportAnkiCsv(guide as StudyGuide, courseName)}
                  disabled={guideType !== "study"}
                >
                  <FileDown className="h-4 w-4" />
                  Anki Flashcards (.txt)
                  {guideType !== "study" && (
                    <span className="ml-auto text-xs text-muted-foreground">Study only</span>
                  )}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </div>

      {/* Minimal pass toggle — study guides only */}
      {guideType === "study" && (
        <div className="flex items-center gap-2.5">
          <Switch
            id="minimal-pass"
            checked={minimalPass}
            onCheckedChange={setMinimalPass}
            disabled={isGenerating}
          />
          <Label htmlFor="minimal-pass" className="text-sm cursor-pointer select-none">
            Minimal Pass Mode
          </Label>
          <span className="text-xs text-muted-foreground">
            — focus only on B-level competency, skip nice-to-haves
          </span>
        </div>
      )}

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
            <StudyGuideRenderer content={guide.content} guideId={guide.id} />
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

      {/* Regeneration confirmation dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerate {label}?</AlertDialogTitle>
            <AlertDialogDescription>
              Last generated{" "}
              <strong>{formatRelativeTime(guide?.updatedAt)}</strong>. Regenerating
              will overwrite the current guide and use API credits. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmRegenerate}>
              Regenerate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
