import { useState } from "react";
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  GraduationCap,
  Search,
  Youtube,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Badge } from "@/components/ui/badge";
import type { StructuredStudyGuide, StudySubject } from "@shared/types";

// ─── helpers ────────────────────────────────────────────────────────────────

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

function ExcerptBlock({
  sourceName,
  excerpt,
}: {
  sourceName: string;
  excerpt: string;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
      <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <BookOpen className="h-3 w-3 shrink-0" />
        {sourceName}
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

function SubjectCard({ subject, index }: { subject: StudySubject; index: number }) {
  const [excerptOpen, setExcerptOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const styles = PRIORITY_STYLES[subject.priority];
  const hasExcerpts = subject.materialExcerpts.length > 0;
  const hasSearches = subject.searchQueries.length > 0;

  return (
    <div
      className={`rounded-xl border border-l-4 border-border/60 bg-card/60 overflow-hidden ${styles.border}`}
    >
      {/* Header */}
      <div className="flex items-start gap-3 p-4 pb-3">
        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
          {index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold leading-tight">{subject.title}</h3>
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

      {/* Key points */}
      <div className="px-4 pb-3">
        <ul className="space-y-1.5">
          {subject.keyPoints.map((pt, i) => (
            <li key={i} className="flex gap-2 text-sm leading-snug">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
              {pt}
            </li>
          ))}
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
              {subject.materialExcerpts.map((ex, i) => (
                <ExcerptBlock key={i} sourceName={ex.sourceName} excerpt={ex.excerpt} />
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
              {subject.searchQueries.map((q, i) => (
                <SearchRow key={i} query={q} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── main renderer ───────────────────────────────────────────────────────────

interface StudyGuideRendererProps {
  content: string;
}

export const StudyGuideRenderer: React.FC<StudyGuideRendererProps> = ({ content }) => {
  // Try to parse as structured JSON
  let parsed: StructuredStudyGuide | null = null;
  try {
    // Strip any accidental markdown code fences from some models
    const cleaned = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "");
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
    // not JSON — fall through to markdown
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

  return (
    <div className="space-y-5">
      {/* Overview card */}
      <div className="rounded-xl border border-border/60 bg-gradient-to-br from-primary/5 to-primary/10 p-4">
        <div className="flex items-start gap-3">
          <GraduationCap className="h-5 w-5 shrink-0 text-primary mt-0.5" />
          <div>
            <p className="text-sm font-medium mb-1">Study Guide Overview</p>
            <p className="text-sm text-muted-foreground leading-relaxed">{parsed.overview}</p>
          </div>
        </div>
        {/* Priority summary */}
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
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
        </div>
      </div>

      {/* Subject cards */}
      <div className="space-y-3">
        {parsed.subjects.map((subject, i) => (
          <SubjectCard key={subject.id ?? i} subject={subject} index={i} />
        ))}
      </div>
    </div>
  );
};
