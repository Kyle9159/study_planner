import { Loader2, MessageSquare, Send, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProjectChatMessage } from "./ProjectChatMessage";
import { ModelSelector } from "./ModelSelector";
import type { ProjectChatMessage as ChatMsg, ProjectSection } from "@shared/types";

interface ProjectChatProps {
  messages: ChatMsg[];
  sections: ProjectSection[];
  isSending: boolean;
  onSend: (message: string, model: string, sectionId?: string) => void;
  onClear: () => void;
  isClearing: boolean;
  defaultModel?: string;
}

export const ProjectChat: React.FC<ProjectChatProps> = ({
  messages,
  sections,
  isSending,
  onSend,
  onClear,
  isClearing,
  defaultModel,
}) => {
  const [input, setInput] = useState("");
  const [model, setModel] = useState(defaultModel ?? "");
  const [sectionId, setSectionId] = useState<string>("__none__");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || !model) return;
    onSend(trimmed, model, sectionId === "__none__" ? undefined : sectionId);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 pb-3 border-b border-border/60">
        <MessageSquare className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Project Chat</span>
        <div className="flex-1" />
        {messages.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            disabled={isClearing}
            className="text-xs text-muted-foreground"
          >
            {isClearing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
            Clear
          </Button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 py-3 min-h-0">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <MessageSquare className="h-8 w-8 mb-2 opacity-40" />
            <p className="text-sm">Ask questions about your course materials and project.</p>
            <p className="text-xs mt-1">Responses are grounded in your uploaded content.</p>
          </div>
        ) : (
          messages.map((msg) => (
            <ProjectChatMessage key={msg.id} role={msg.role} content={msg.content} />
          ))
        )}
        {isSending && (
          <div className="flex justify-start">
            <div className="bg-muted/60 border border-border/60 rounded-xl px-4 py-2.5">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Controls */}
      <div className="border-t border-border/60 pt-3 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <ModelSelector value={model} onChange={setModel} disabled={isSending} />
          <Select value={sectionId} onValueChange={setSectionId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All sections" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">All sections</SelectItem>
              {sections.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.title.length > 30 ? s.title.slice(0, 30) + "..." : s.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your project..."
            rows={2}
            className="resize-none"
            disabled={isSending}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || !model || isSending}
            size="icon"
            className="shrink-0 self-end"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
