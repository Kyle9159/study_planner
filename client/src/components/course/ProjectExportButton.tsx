import { Download, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import * as api from "@/api/client";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { ProjectSection } from "@shared/types";

/** Extract task group prefix from a section title (e.g. "Task 1" from "Task 1: Executive Summary") */
function extractTaskGroup(title: string): string | null {
  const m = title.match(/^(Task\s+\d+)/i);
  return m ? m[1] : null;
}

interface ProjectExportButtonProps {
  courseId: string;
  sections: ProjectSection[];
}

export const ProjectExportButton: React.FC<ProjectExportButtonProps> = ({
  courseId,
  sections,
}) => {
  const [exporting, setExporting] = useState(false);
  const [selectedTask, setSelectedTask] = useState<string>("all");
  const completedCount = sections.filter((s) => s.status === "complete").length;

  // Derive unique task groups from section titles
  const taskGroups = useMemo(() => {
    const groups = new Set<string>();
    for (const s of sections) {
      const g = extractTaskGroup(s.title);
      if (g) groups.add(g);
    }
    return Array.from(groups).sort((a, b) => {
      const numA = Number.parseInt(a.replace(/\D/g, ""), 10);
      const numB = Number.parseInt(b.replace(/\D/g, ""), 10);
      return numA - numB;
    });
  }, [sections]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const tasks = selectedTask === "all" ? undefined : [selectedTask];
      const blob = await api.exportProjectDocument(courseId, tasks);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "project.docx";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Document exported");
    } catch (err) {
      toast.error(`Export failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {taskGroups.length > 1 && (
        <select
          className="h-8 rounded-md border border-input bg-background px-2 text-sm"
          value={selectedTask}
          onChange={(e) => setSelectedTask(e.target.value)}
        >
          <option value="all">All Tasks</option>
          {taskGroups.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={handleExport}
        disabled={exporting || sections.length === 0}
      >
        {exporting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        Export .docx
        <span className="text-xs text-muted-foreground ml-1">
          ({completedCount}/{sections.length})
        </span>
      </Button>
    </div>
  );
};
