import {
  Check,
  ChevronDown,
  ChevronRight,
  CircleDot,
  Clock,
  Loader2,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { ProjectSection } from "@shared/types";

interface ProjectSectionCardProps {
  section: ProjectSection;
  isGenerating: boolean;
  onGenerate: () => void;
  onUpdateDraft: (content: string) => void;
  onToggleComplete: () => void;
  isUpdating: boolean;
}

const statusConfig = {
  pending: { label: "Pending", color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400", icon: Clock },
  drafting: { label: "Drafting", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", icon: CircleDot },
  complete: { label: "Complete", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400", icon: Check },
} as const;

export const ProjectSectionCard: React.FC<ProjectSectionCardProps> = ({
  section,
  isGenerating,
  onGenerate,
  onUpdateDraft,
  onToggleComplete,
  isUpdating,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [editedDraft, setEditedDraft] = useState(section.draftContent ?? "");
  const status = statusConfig[section.status];
  const StatusIcon = status.icon;

  // Sync local state when server data changes (e.g., after generate)
  useEffect(() => {
    setEditedDraft(section.draftContent ?? "");
  }, [section.draftContent]);

  const handleBlur = () => {
    if (editedDraft !== (section.draftContent ?? "")) {
      onUpdateDraft(editedDraft);
    }
  };

  return (
    <div className="border border-border/60 rounded-lg overflow-hidden">
      {/* Header — always visible */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
        <span className="text-sm font-medium flex-1 truncate">{section.title}</span>
        <Badge variant="secondary" className={cn("text-xs shrink-0", status.color)}>
          <StatusIcon className="h-3 w-3 mr-1" />
          {status.label}
        </Badge>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-border/40">
          {/* Rubric requirement */}
          <div className="mt-3 rounded-lg bg-muted/30 p-3">
            <p className="text-xs font-medium text-muted-foreground mb-1">Rubric Requirement</p>
            <p className="text-sm whitespace-pre-wrap">{section.rubricText}</p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {!section.draftContent ? (
              <Button size="sm" onClick={onGenerate} disabled={isGenerating}>
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Generate Draft
                  </>
                )}
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={onGenerate} disabled={isGenerating}>
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Regenerating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    Regenerate
                  </>
                )}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={onToggleComplete}
              disabled={isUpdating}
            >
              {section.status === "complete" ? (
                <>
                  <Clock className="h-4 w-4" />
                  Mark Incomplete
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Mark Complete
                </>
              )}
            </Button>
          </div>

          {/* Guidance */}
          {section.guidance && (
            <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-3">
              <p className="text-xs font-medium text-blue-700 dark:text-blue-400 mb-1">Guidance</p>
              <p className="text-sm text-blue-800 dark:text-blue-300 whitespace-pre-wrap">{section.guidance}</p>
            </div>
          )}

          {/* Material excerpts */}
          {section.materialExcerpts && (() => {
            try {
              const excerpts = JSON.parse(section.materialExcerpts) as Array<{ sourceName: string; excerpt: string }>;
              if (excerpts.length === 0) return null;
              return (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Source Material</p>
                  {excerpts.map((ex, i) => (
                    <div key={i} className="rounded-lg border border-border/40 p-2.5">
                      <p className="text-xs font-medium text-muted-foreground mb-0.5">{ex.sourceName}</p>
                      <p className="text-xs">{ex.excerpt}</p>
                    </div>
                  ))}
                </div>
              );
            } catch {
              return null;
            }
          })()}

          {/* Draft editor */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Draft Content</p>
            <Textarea
              value={editedDraft}
              onChange={(e) => setEditedDraft(e.target.value)}
              onBlur={handleBlur}
              rows={10}
              placeholder="Draft content will appear here after generation, or you can write your own..."
              className="text-sm"
            />
          </div>
        </div>
      )}
    </div>
  );
};
