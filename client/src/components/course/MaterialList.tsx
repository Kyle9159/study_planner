import {
  AlertCircle,
  ChevronDown,
  ChevronRight,
  FileImage,
  FileText,
  Trash2,
  Youtube,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Material, Rubric } from "@shared/types";

type Item = Material | Rubric;

const FILE_TYPE_ICONS: Record<string, React.FC<{ className?: string }>> = {
  pdf: FileText,
  docx: FileText,
  txt: FileText,
  image: FileImage,
  youtube: Youtube,
};

const FILE_TYPE_LABELS: Record<string, string> = {
  pdf: "PDF",
  docx: "DOCX",
  txt: "TXT",
  image: "Image",
  youtube: "YouTube",
};

interface MaterialItemProps {
  item: Item;
  onDelete: (id: string) => void;
  isDeleting?: boolean;
}

const MaterialItem: React.FC<MaterialItemProps> = ({ item, onDelete, isDeleting }) => {
  const [expanded, setExpanded] = useState(false);
  const Icon = FILE_TYPE_ICONS[item.fileType] ?? FileText;
  const hasText = !!item.extractedText;

  return (
    <div className="rounded-lg border border-border/60 bg-card/40 overflow-hidden">
      <div className="flex items-center gap-3 px-3 py-2.5">
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium truncate">{item.originalName}</span>
            <Badge variant="outline" className="text-xs shrink-0">
              {FILE_TYPE_LABELS[item.fileType]}
            </Badge>
            {item.extractionFailed && (
              <div className="flex items-center gap-1 text-xs text-amber-600">
                <AlertCircle className="h-3.5 w-3.5" />
                Extraction failed
              </div>
            )}
            {item.fileType === "image" && (
              <span className="text-xs text-muted-foreground">(no text extracted)</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {hasText && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setExpanded((v) => !v)}
              title={expanded ? "Collapse text" : "View extracted text"}
            >
              {expanded ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(item.id)}
            disabled={isDeleting}
            title="Remove"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {expanded && hasText && (
        <div className="border-t border-border/60 bg-muted/20 px-3 py-2.5">
          <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed max-h-48 overflow-y-auto">
            {item.extractedText}
          </pre>
        </div>
      )}
    </div>
  );
};

interface MaterialListProps {
  items: Item[];
  onDelete: (id: string) => void;
  deletingId?: string;
  emptyText?: string;
}

export const MaterialList: React.FC<MaterialListProps> = ({
  items,
  onDelete,
  deletingId,
  emptyText = "No files uploaded yet",
}) => {
  if (items.length === 0) {
    return (
      <p className={cn("text-sm text-muted-foreground py-4 text-center")}>{emptyText}</p>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <MaterialItem
          key={item.id}
          item={item}
          onDelete={onDelete}
          isDeleting={deletingId === item.id}
        />
      ))}
    </div>
  );
};
