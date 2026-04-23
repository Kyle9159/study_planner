import { Check } from "lucide-react";
import { ProjectSectionCard } from "./ProjectSectionCard";
import type { ProjectSection } from "@shared/types";

interface ProjectSectionListProps {
  sections: ProjectSection[];
  generatingSectionId: string | null;
  onGenerate: (sectionId: string) => void;
  onUpdateDraft: (sectionId: string, content: string) => void;
  onUpdateCode: (sectionId: string, content: string) => void;
  onToggleComplete: (sectionId: string, currentStatus: string) => void;
  updatingSectionId: string | null;
}

export const ProjectSectionList: React.FC<ProjectSectionListProps> = ({
  sections,
  generatingSectionId,
  onGenerate,
  onUpdateDraft,
  onUpdateCode,
  onToggleComplete,
  updatingSectionId,
}) => {
  const completedCount = sections.filter((s) => s.status === "complete").length;
  const pct = sections.length > 0 ? Math.round((completedCount / sections.length) * 100) : 0;

  return (
    <div className="space-y-3">
      {/* Progress bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Check className="h-3 w-3" />
            {completedCount} of {sections.length} complete
          </span>
          <span>{pct}%</span>
        </div>
        <div className="h-2 rounded-full bg-muted/40 overflow-hidden">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Section cards */}
      {sections.map((section) => (
        <ProjectSectionCard
          key={section.id}
          section={section}
          isGenerating={generatingSectionId === section.id}
          onGenerate={() => onGenerate(section.id)}
          onUpdateDraft={(content) => onUpdateDraft(section.id, content)}
          onUpdateCode={(content) => onUpdateCode(section.id, content)}
          onToggleComplete={() => onToggleComplete(section.id, section.status)}
          isUpdating={updatingSectionId === section.id}
        />
      ))}
    </div>
  );
};
