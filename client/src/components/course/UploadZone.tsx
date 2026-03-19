import { Upload, Link as LinkIcon, Loader2, Plus } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn, extractYouTubeId } from "@/lib/utils";
import type { FileType } from "@shared/types";

const ACCEPTED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "image/jpeg",
  "image/png",
  "image/webp",
].join(",");

function detectFileType(file: File): FileType {
  if (file.type === "application/pdf") return "pdf";
  if (
    file.type ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  )
    return "docx";
  if (file.type === "text/plain") return "txt";
  if (file.type.startsWith("image/")) return "image";
  return "txt";
}

interface UploadZoneProps {
  onFile: (formData: FormData) => Promise<void>;
  onYouTube: (url: string) => Promise<void>;
  isUploading?: boolean;
  label?: string;
}

export const UploadZone: React.FC<UploadZoneProps> = ({
  onFile,
  onYouTube,
  isUploading,
  label = "Upload files",
}) => {
  const [dragging, setDragging] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [addingYoutube, setAddingYoutube] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("fileType", detectFileType(file));
        await onFile(fd);
      }
    },
    [onFile],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles],
  );

  const handleAddYouTube = async () => {
    const trimmed = youtubeUrl.trim();
    if (!trimmed) return;
    if (!extractYouTubeId(trimmed)) {
      alert("Please enter a valid YouTube URL");
      return;
    }
    setAddingYoutube(true);
    try {
      await onYouTube(trimmed);
      setYoutubeUrl("");
    } finally {
      setAddingYoutube(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Drag & drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors",
          dragging
            ? "border-primary bg-primary/5"
            : "border-border/60 hover:border-border hover:bg-muted/20",
          isUploading && "pointer-events-none opacity-60",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES}
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <div className="flex flex-col items-center gap-2">
          {isUploading ? (
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          ) : (
            <Upload className="h-8 w-8 text-muted-foreground/60" />
          )}
          <div>
            <p className="text-sm font-medium">
              {isUploading ? "Uploading..." : label}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              PDF, DOCX, TXT, or images — drag & drop or click to browse
            </p>
          </div>
        </div>
      </div>

      {/* YouTube URL input */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <LinkIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            placeholder="YouTube URL (auto-fetches transcript)"
            className="pl-8"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddYouTube();
            }}
            disabled={addingYoutube || isUploading}
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleAddYouTube}
          disabled={!youtubeUrl.trim() || addingYoutube || isUploading}
        >
          {addingYoutube ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Add
        </Button>
      </div>
    </div>
  );
};
