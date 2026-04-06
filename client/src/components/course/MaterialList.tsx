import {
  AlertCircle,
  ChevronDown,
  ChevronRight,
  FileImage,
  FileText,
  FolderOpen,
  Globe,
  Loader2,
  Trash2,
  Youtube,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
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
  webpage: Globe,
};

const FILE_TYPE_LABELS: Record<string, string> = {
  pdf: "PDF",
  docx: "DOCX",
  txt: "TXT",
  image: "Image",
  youtube: "YouTube",
  webpage: "WGU Page",
};

interface MaterialItemProps {
  item: Item;
  onDelete: (id: string) => void;
  isDeleting?: boolean;
  onParseWebpage?: (url: string) => void;
  isParsing?: boolean;
}

const MaterialItem: React.FC<MaterialItemProps> = ({ item, onDelete, isDeleting, onParseWebpage, isParsing }) => {
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
            {item.extractionFailed && item.fileType === "webpage" ? (
              <div className="flex items-center gap-1 text-xs text-amber-600">
                <AlertCircle className="h-3.5 w-3.5" />
                Session expired —{" "}
                <Link to="/settings" className="underline underline-offset-2">
                  update cookie in Settings
                </Link>
              </div>
            ) : item.extractionFailed ? (
              <div className="flex items-center gap-1 text-xs text-amber-600">
                <AlertCircle className="h-3.5 w-3.5" />
                Extraction failed
              </div>
            ) : null}
            {item.fileType === "image" && (
              <span className="text-xs text-muted-foreground">(no text extracted)</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {item.fileType === "webpage" && item.url && onParseWebpage && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs gap-1"
              onClick={() => onParseWebpage(item.url!)}
              disabled={isParsing}
              title="Crawl all sections and generate a Word document"
            >
              {isParsing ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Parsing...
                </>
              ) : (
                <>
                  <FolderOpen className="h-3 w-3" />
                  Parse Sections
                </>
              )}
            </Button>
          )}
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
  onParseWebpage?: (url: string) => void;
  parsingUrl?: string;
}

export const MaterialList: React.FC<MaterialListProps> = ({
  items,
  onDelete,
  deletingId,
  emptyText = "No files uploaded yet",
  onParseWebpage,
  parsingUrl,
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
          onParseWebpage={onParseWebpage}
          isParsing={!!parsingUrl && item.fileType === "webpage" && item.url === parsingUrl}
        />
      ))}
    </div>
  );
};
