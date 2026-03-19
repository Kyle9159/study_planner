import { BookOpen, CheckCircle2, FileText, Layers } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { CourseSummary } from "@shared/types";

interface CourseCardProps {
  course: CourseSummary;
}

export const CourseCard: React.FC<CourseCardProps> = ({ course }) => {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => navigate(`/courses/${course.id}`)}
      className={cn(
        "w-full text-left rounded-xl border border-border/60 bg-card/40 p-5",
        "transition-all hover:border-border hover:bg-card hover:shadow-sm",
        "flex flex-col gap-3",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-muted/30">
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">{course.name}</div>
            <div className="text-xs text-muted-foreground">{course.code}</div>
          </div>
        </div>
        <Badge variant="outline" className="shrink-0 text-xs">
          {course.semester} {course.year}
        </Badge>
      </div>

      {course.instructor && (
        <div className="text-xs text-muted-foreground">Instructor: {course.instructor}</div>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <FileText className="h-3.5 w-3.5" />
          <span>{course.materialCount} material{course.materialCount !== 1 ? "s" : ""}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Layers className="h-3.5 w-3.5" />
          <span>{course.rubricCount} rubric{course.rubricCount !== 1 ? "s" : ""}</span>
        </div>
        {course.hasStudyGuide && (
          <div className="flex items-center gap-1 text-xs text-emerald-600">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Study Guide
          </div>
        )}
        {course.hasProjectGuide && (
          <div className="flex items-center gap-1 text-xs text-emerald-600">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Project Guide
          </div>
        )}
      </div>
    </button>
  );
};
