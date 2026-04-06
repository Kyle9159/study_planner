import { useCallback, useEffect, useState } from "react";
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  FileCheck,
  GraduationCap,
  RotateCcw,
  Search,
  Youtube,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { StructuredStudyGuide, StudySubject } from "@shared/types";
import { normalizeKeyPoint } from "@shared/types";

// ─── mastery persistence ─────────────────────────────────────────────────────

type MasteryState = {
  subjects: Record<string, boolean>;
  keyPoints: Record<string, boolean>;
};

function loadMastery(guideId: string): MasteryState {
  try {
    const raw = localStorage.getItem(`mastery-${guideId}`);
    if (raw) return JSON.parse(raw) as MasteryState;
  } catch {
    // ignore
  }
  return { subjects: {}, keyPoints: {} };
}

function saveMastery(guideId: string, state: MasteryState) {
  try {
    localStorage.setItem(`mastery-${guideId}`, JSON.stringify(state));
  } catch {
    // ignore
  }
}

function useMastery(guideId: string | undefined) {
  const [mastery, setMastery] = useState<MasteryState>(() =>
    guideId ? loadMastery(guideId) : { subjects: {}, keyPoints: {} },
  );

  useEffect(() => {
    if (guideId) setMastery(loadMastery(guideId));
  }, [guideId]);

  const toggleSubject = useCallback(
    (id: string) => {
      setMastery((prev) => {
        const next = { ...prev, subjects: { ...prev.subjects, [id]: !prev.subjects[id] } };
        if (guideId) saveMastery(guideId, next);
        return next;
      });
    },
    [guideId],
  );

  const toggleKeyPoint = useCallback(
    (subjectId: string, index: number) => {
      const key = `${subjectId}-${index}`;
      setMastery((prev) => {
        const next = { ...prev, keyPoints: { ...prev.keyPoints, [key]: !prev.keyPoints[key] } };
        if (guideId) saveMastery(guideId, next);
        return next;
      });
    },
    [guideId],
  );

  const reset = useCallback(() => {
    const empty: MasteryState = { subjects: {}, keyPoints: {} };
    setMastery(empty);
    if (guideId) saveMastery(guideId, empty);
  }, [guideId]);

  const masteredCount = Object.values(mastery.subjects).filter(Boolean).length;

  return { mastery, toggleSubject, toggleKeyPoint, reset, masteredCount };
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function buildSearchLinks(query: string) {
  const enc = encodeURIComponent(query);
  return {
    ddg: `https://duckduckgo.com/?q=${enc}`,
    scholar: `https://scholar.google.com/scholar?q=${enc}`,
    youtube: `https://www.youtube.com/results?search_query=${encodeURIComponent(query + " lecture tutorial")}`,
  };
}

const PRIORITY_STYLES: Record<
  StudySubject["priority"],
  { pill: string; border: string; dot: string }
> = {
  High: {
    pill: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    border: "border-l-red-500",
    dot: "bg-red-500",
  },
  Medium: {
    pill: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    border: "border-l-amber-400",
    dot: "bg-amber-400",
  },
  Low: {
    pill: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    border: "border-l-emerald-500",
    dot: "bg-emerald-500",
  },
};

// ─── sub-components ──────────────────────────────────────────────────────────

function ExcerptBlock({ sourceName, excerpt, sourceType }: { sourceName: string; excerpt: string; sourceType?: "study" | "rubric" }) {
  const isRubric = sourceType === "rubric";
  return (
    <div className={`rounded-lg border bg-muted/30 p-3 ${isRubric ? "border-amber-300/60 dark:border-amber-700/40" : "border-border/60"}`}>
      <p className={`mb-1.5 flex items-center gap-1.5 text-xs font-medium ${isRubric ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}>
        {isRubric ? <FileCheck className="h-3 w-3 shrink-0" /> : <BookOpen className="h-3 w-3 shrink-0" />}
        {sourceName}
        {isRubric && <span className="ml-auto rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] dark:bg-amber-900/30">Rubric</span>}
      </p>
      <p className="text-xs leading-relaxed text-foreground/80 italic">
        &ldquo;{excerpt}&rdquo;
      </p>
    </div>
  );
}

function SearchRow({ query }: { query: string }) {
  const links = buildSearchLinks(query);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <Search className="h-3 w-3" />
        {query}
      </span>
      <div className="flex gap-1.5">
        <a
          href={links.ddg}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-background px-2 py-0.5 text-xs text-foreground hover:bg-muted transition-colors"
        >
          DuckDuckGo
          <ExternalLink className="h-2.5 w-2.5 opacity-60" />
        </a>
        <a
          href={links.scholar}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-background px-2 py-0.5 text-xs text-foreground hover:bg-muted transition-colors"
        >
          Scholar
          <ExternalLink className="h-2.5 w-2.5 opacity-60" />
        </a>
        <a
          href={links.youtube}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-background px-2 py-0.5 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          <Youtube className="h-2.5 w-2.5" />
          YouTube
          <ExternalLink className="h-2.5 w-2.5 opacity-60" />
        </a>
      </div>
    </div>
  );
}

function SubjectCard({
  subject,
  index,
  isSubjectMastered,
  onToggleSubject,
  isKeyPointMastered,
  onToggleKeyPoint,
}: {
  subject: StudySubject;
  index: number;
  isSubjectMastered: boolean;
  onToggleSubject: () => void;
  isKeyPointMastered: (i: number) => boolean;
  onToggleKeyPoint: (i: number) => void;
}) {
  const [excerptOpen, setExcerptOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const styles = PRIORITY_STYLES[subject.priority];
  const hasExcerpts = (subject.materialExcerpts?.length ?? 0) > 0;
  const hasSearches = (subject.searchQueries?.length ?? 0) > 0;

  return (
    <div
      className={`rounded-xl border border-l-4 border-border/60 bg-card/60 overflow-hidden transition-opacity ${styles.border} ${isSubjectMastered ? "opacity-50" : ""}`}
    >
      {/* Header */}
      <div className="flex items-start gap-3 p-4 pb-3">
        <div className="mt-0.5 flex items-center gap-2 shrink-0">
          <Checkbox
            checked={isSubjectMastered}
            onCheckedChange={onToggleSubject}
            aria-label={`Mark ${subject.title} as mastered`}
          />
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
            {index + 1}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h3 className={`text-sm font-semibold leading-tight ${isSubjectMastered ? "line-through text-muted-foreground" : ""}`}>
              {subject.title}
            </h3>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${styles.pill}`}
            >
              <span className={`mr-1 h-1.5 w-1.5 rounded-full ${styles.dot}`} />
              {subject.priority} Priority
            </span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{subject.summary}</p>
        </div>
      </div>

      {/* Key points with checkboxes */}
      <div className="px-4 pb-3">
        <ul className="space-y-2">
          {(subject.keyPoints ?? []).map((pt, i) => {
            const kp = normalizeKeyPoint(pt);
            return (
              <li key={i}>
                <div className="flex items-start gap-2">
                  <Checkbox
                    checked={isKeyPointMastered(i)}
                    onCheckedChange={() => onToggleKeyPoint(i)}
                    className="mt-0.5 shrink-0"
                    aria-label={`Mark key point as done: ${kp.text}`}
                  />
                  <span className={`text-sm leading-snug ${isKeyPointMastered(i) ? "line-through text-muted-foreground" : ""}`}>
                    {kp.text}
                  </span>
                </div>
                {kp.notes && (
                  <div className="ml-8 mt-1.5 rounded-lg border border-border/40 bg-muted/30 p-3">
                    <div className="text-xs leading-relaxed text-foreground/80 prose prose-xs dark:prose-invert max-w-none [&_ul]:mt-1 [&_ul]:mb-1 [&_li]:my-0.5">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{kp.notes}</ReactMarkdown>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {/* Expandable: material excerpts */}
      {hasExcerpts && (
        <div className="border-t border-border/40">
          <button
            type="button"
            onClick={() => setExcerptOpen((v) => !v)}
            className="flex w-full items-center gap-2 px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
          >
            <BookOpen className="h-3.5 w-3.5" />
            Source material excerpts ({subject.materialExcerpts.length})
            {excerptOpen ? (
              <ChevronUp className="ml-auto h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="ml-auto h-3.5 w-3.5" />
            )}
          </button>
          {excerptOpen && (
            <div className="space-y-2 px-4 pb-3">
              {(subject.materialExcerpts ?? []).map((ex, i) => (
                <ExcerptBlock key={i} sourceName={ex.sourceName} excerpt={ex.excerpt} sourceType={ex.sourceType} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Expandable: search links */}
      {hasSearches && (
        <div className="border-t border-border/40">
          <button
            type="button"
            onClick={() => setSearchOpen((v) => !v)}
            className="flex w-full items-center gap-2 px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
          >
            <Search className="h-3.5 w-3.5" />
            Find study resources online ({subject.searchQueries.length} queries)
            {searchOpen ? (
              <ChevronUp className="ml-auto h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="ml-auto h-3.5 w-3.5" />
            )}
          </button>
          {searchOpen && (
            <div className="space-y-2.5 px-4 pb-3">
              {(subject.searchQueries ?? []).map((q, i) => (
                <SearchRow key={i} query={q} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── JSON repair for truncated responses ─────────────────────────────────────

/**
 * Attempt to repair truncated JSON from an AI response that was cut off
 * mid-stream (e.g. due to max_tokens). Uses a stack-based approach to
 * close any unclosed strings, arrays, and objects.
 */
function tryRepairTruncatedJson(raw: string): StructuredStudyGuide | null {
  let str = raw.trim();
  if (!str.startsWith("{") || !str.includes('"subjects"')) return null;

  let inString = false;
  const stack: string[] = [];

  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (ch === "\\" && inString) {
      i++; // skip escaped char
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === "{") stack.push("}");
    else if (ch === "[") stack.push("]");
    else if (ch === "}" || ch === "]") stack.pop();
  }

  // Close unclosed string
  if (inString) str += '"';

  // Strip trailing comma before closing delimiters
  str = str.replace(/,\s*$/, "");

  // Close unclosed brackets/braces in reverse nesting order
  while (stack.length > 0) {
    str += stack.pop();
  }

  try {
    const candidate = JSON.parse(str) as unknown;
    if (
      candidate &&
      typeof candidate === "object" &&
      "subjects" in candidate &&
      Array.isArray((candidate as StructuredStudyGuide).subjects)
    ) {
      return candidate as StructuredStudyGuide;
    }
  } catch {
    // repair wasn't enough
  }
  return null;
}

// ─── main renderer ────────────────────────────────────────────────────────────

interface StudyGuideRendererProps {
  content: string;
  guideId?: string;
}

export const StudyGuideRenderer: React.FC<StudyGuideRendererProps> = ({ content, guideId }) => {
  const { mastery, toggleSubject, toggleKeyPoint, reset, masteredCount } = useMastery(guideId);

  // Try to parse as structured JSON
  let parsed: StructuredStudyGuide | null = null;
  const cleaned = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "");
  try {
    const candidate = JSON.parse(cleaned) as unknown;
    if (
      candidate &&
      typeof candidate === "object" &&
      "subjects" in candidate &&
      Array.isArray((candidate as StructuredStudyGuide).subjects)
    ) {
      parsed = candidate as StructuredStudyGuide;
    }
  } catch {
    // JSON.parse failed — try repairing truncated JSON
    parsed = tryRepairTruncatedJson(cleaned);
  }

  // Fallback: render as markdown
  if (!parsed) {
    return (
      <div className="markdown-body">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      </div>
    );
  }

  const highCount = parsed.subjects.filter((s) => s.priority === "High").length;
  const medCount = parsed.subjects.filter((s) => s.priority === "Medium").length;
  const lowCount = parsed.subjects.filter((s) => s.priority === "Low").length;
  const totalSubjects = parsed.subjects.length;

  return (
    <div className="space-y-5">
      {/* Overview card */}
      <div className="rounded-xl border border-border/60 bg-gradient-to-br from-primary/5 to-primary/10 p-4">
        <div className="flex items-start gap-3">
          <GraduationCap className="h-5 w-5 shrink-0 text-primary mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium mb-1">Study Guide Overview</p>
            <p className="text-sm text-muted-foreground leading-relaxed">{parsed.overview}</p>
          </div>
        </div>
        {/* Priority + mastery summary */}
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          {highCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-red-700 dark:bg-red-900/30 dark:text-red-400">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
              {highCount} High priority topic{highCount !== 1 ? "s" : ""}
            </span>
          )}
          {medCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              {medCount} Medium
            </span>
          )}
          {lowCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {lowCount} Low
            </span>
          )}
          {masteredCount > 0 && (
            <Badge variant="secondary" className="ml-auto text-xs">
              {masteredCount}/{totalSubjects} mastered
            </Badge>
          )}
          {masteredCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={reset}
              className="h-6 px-2 text-xs text-muted-foreground"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Subject cards */}
      <div className="space-y-3">
        {parsed.subjects.map((subject, i) => (
          <SubjectCard
            key={subject.id ?? i}
            subject={subject}
            index={i}
            isSubjectMastered={!!mastery.subjects[subject.id ?? String(i)]}
            onToggleSubject={() => toggleSubject(subject.id ?? String(i))}
            isKeyPointMastered={(ki) => !!mastery.keyPoints[`${subject.id ?? i}-${ki}`]}
            onToggleKeyPoint={(ki) => toggleKeyPoint(subject.id ?? String(i), ki)}
          />
        ))}
      </div>
    </div>
  );
};
