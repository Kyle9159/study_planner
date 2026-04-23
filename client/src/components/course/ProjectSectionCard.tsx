import {
  Check,
  ChevronDown,
  ChevronRight,
  CircleDot,
  Clock,
  Code2,
  Eye,
  Loader2,
  Pencil,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import CodeMirror from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";
import { oneDark as cmOneDark } from "@codemirror/theme-one-dark";
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
  onUpdateCode: (content: string) => void;
  onToggleComplete: () => void;
  isUpdating: boolean;
}

const statusConfig = {
  pending: { label: "Pending", color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400", icon: Clock },
  drafting: { label: "Drafting", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", icon: CircleDot },
  complete: { label: "Complete", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400", icon: Check },
} as const;

const CODE_KEYWORDS = /python|code|script|implement|program|function|algorithm|class|method/i;

function isCodingSection(section: ProjectSection): boolean {
  return CODE_KEYWORDS.test(section.title) || CODE_KEYWORDS.test(section.rubricText);
}

export const ProjectSectionCard: React.FC<ProjectSectionCardProps> = ({
  section,
  isGenerating,
  onGenerate,
  onUpdateDraft,
  onUpdateCode,
  onToggleComplete,
  isUpdating,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [editedDraft, setEditedDraft] = useState(section.draftContent ?? "");
  const [editedCode, setEditedCode] = useState(section.codeContent ?? "");
  const [draftView, setDraftView] = useState<"preview" | "edit">("preview");
  const [activeTab, setActiveTab] = useState<"draft" | "code">("draft");
  const status = statusConfig[section.status];
  const StatusIcon = status.icon;
  const showCodeTab = isCodingSection(section);

  // Sync local state when server data changes (e.g., after generate)
  useEffect(() => {
    setEditedDraft(section.draftContent ?? "");
  }, [section.draftContent]);

  useEffect(() => {
    setEditedCode(section.codeContent ?? "");
  }, [section.codeContent]);

  const handleDraftBlur = () => {
    if (editedDraft !== (section.draftContent ?? "")) {
      onUpdateDraft(editedDraft);
    }
  };

  const handleCodeBlur = () => {
    if (editedCode !== (section.codeContent ?? "")) {
      onUpdateCode(editedCode);
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
        {showCodeTab && (
          <Code2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" title="Has code editor" />
        )}
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

          {/* Draft / Code tab switcher */}
          {showCodeTab && (
            <div className="flex items-center gap-1 border-b border-border/40 pb-0">
              <button
                type="button"
                onClick={() => setActiveTab("draft")}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium border-b-2 transition-colors -mb-px",
                  activeTab === "draft"
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                Draft
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("code")}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium border-b-2 transition-colors -mb-px flex items-center gap-1",
                  activeTab === "code"
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                <Code2 className="h-3 w-3" />
                Python
              </button>
            </div>
          )}

          {/* Draft content */}
          {activeTab === "draft" && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-medium text-muted-foreground">Draft Content</p>
                {editedDraft && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant={draftView === "preview" ? "secondary" : "ghost"}
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => setDraftView("preview")}
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      Preview
                    </Button>
                    <Button
                      variant={draftView === "edit" ? "secondary" : "ghost"}
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => setDraftView("edit")}
                    >
                      <Pencil className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                  </div>
                )}
              </div>
              {draftView === "edit" || !editedDraft ? (
                <Textarea
                  value={editedDraft}
                  onChange={(e) => setEditedDraft(e.target.value)}
                  onBlur={handleDraftBlur}
                  rows={10}
                  placeholder="Draft content will appear here after generation, or you can write your own..."
                  className="text-sm"
                />
              ) : (
                <div className="prose prose-sm dark:prose-invert max-w-none rounded-md border border-border/60 p-3 text-sm">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      code({ className, children, ...props }) {
                        const match = /language-(\w+)/.exec(className ?? "");
                        const isBlock = !!match;
                        return isBlock ? (
                          <SyntaxHighlighter
                            style={oneDark}
                            language={match[1]}
                            PreTag="div"
                            customStyle={{ borderRadius: "0.375rem", fontSize: "0.8rem" }}
                          >
                            {String(children).replace(/\n$/, "")}
                          </SyntaxHighlighter>
                        ) : (
                          <code className={className} {...props}>{children}</code>
                        );
                      },
                    }}
                  >
                    {editedDraft}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          )}

          {/* Code editor (Python) */}
          {activeTab === "code" && showCodeTab && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-medium text-muted-foreground">Python Code</p>
                <span className="text-xs text-muted-foreground">Auto-saved on blur</span>
              </div>
              <div className="rounded-md overflow-hidden border border-border/60 text-sm">
                <CodeMirror
                  value={editedCode}
                  height="320px"
                  extensions={[python()]}
                  theme={cmOneDark}
                  onChange={(val) => setEditedCode(val)}
                  onBlur={handleCodeBlur}
                  placeholder="# Write or paste your Python code here..."
                  basicSetup={{
                    lineNumbers: true,
                    foldGutter: true,
                    autocompletion: true,
                    bracketMatching: true,
                    indentOnInput: true,
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
