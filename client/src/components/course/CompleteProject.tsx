import { Layers, Loader2, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ModelSelector } from "./ModelSelector";
import { ProjectSectionList } from "./ProjectSectionList";
import { ProjectChat } from "./ProjectChat";
import { ProjectExportButton } from "./ProjectExportButton";
import {
  useParseRubricSectionsMutation,
  useGenerateSectionDraftMutation,
  useUpdateSectionMutation,
  useSendChatMessageMutation,
  useClearChatMutation,
} from "@/hooks/queries/useProjectMutations";
import type { CourseDetail, ProjectSection } from "@shared/types";

/** Extract task group prefix from a section title (e.g. "Task 1" from "Task 1: A1 — ...") */
function extractTaskGroup(title: string): string | null {
  const m = title.match(/^(Task\s+\d+)/i);
  return m ? m[1] : null;
}

interface TaskGroup {
  label: string;
  sections: ProjectSection[];
}

interface CompleteProjectProps {
  course: CourseDetail;
  defaultModel?: string;
}

export const CompleteProject: React.FC<CompleteProjectProps> = ({
  course,
  defaultModel,
}) => {
  const [selectedModel, setSelectedModel] = useState(defaultModel ?? "");
  const courseId = course.id;

  const parseMutation = useParseRubricSectionsMutation(courseId);
  const generateDraft = useGenerateSectionDraftMutation(courseId);
  const updateSection = useUpdateSectionMutation(courseId);
  const sendChat = useSendChatMessageMutation(courseId);
  const clearChat = useClearChatMutation(courseId);

  const sections = course.projectSections ?? [];
  const chatMessages = course.projectChatMessages ?? [];
  const hasSections = sections.length > 0;

  // Group sections by task prefix for tabbed display
  const taskGroups = useMemo((): TaskGroup[] => {
    const groups = new Map<string, ProjectSection[]>();
    for (const s of sections) {
      const key = extractTaskGroup(s.title) ?? "All Sections";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(s);
    }
    return Array.from(groups.entries()).map(([label, secs]) => ({ label, sections: secs }));
  }, [sections]);

  const hasMultipleTasks = taskGroups.length > 1;

  const handleParse = () => {
    if (!selectedModel) return;
    parseMutation.mutate({ model: selectedModel, force: hasSections });
  };

  const handleGenerateDraft = (sectionId: string) => {
    if (!selectedModel) return;
    generateDraft.mutate({ sectionId, model: selectedModel });
  };

  const handleUpdateDraft = (sectionId: string, content: string) => {
    updateSection.mutate({
      sectionId,
      data: { draftContent: content },
    });
  };

  const handleUpdateCode = (sectionId: string, content: string) => {
    updateSection.mutate({
      sectionId,
      data: { codeContent: content },
    });
  };

  const handleToggleComplete = (sectionId: string, currentStatus: string) => {
    updateSection.mutate({
      sectionId,
      data: { status: currentStatus === "complete" ? "drafting" : "complete" },
    });
  };

  const handleSendChat = (message: string, model: string, sectionId?: string) => {
    sendChat.mutate({ message, model, sectionId });
  };

  // Empty state — no sections parsed yet
  if (!hasSections && !parseMutation.isPending) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <ModelSelector
            value={selectedModel}
            onChange={setSelectedModel}
            disabled={parseMutation.isPending}
          />
          <Button
            onClick={handleParse}
            disabled={!selectedModel || parseMutation.isPending}
            size="sm"
          >
            <Sparkles className="h-4 w-4" />
            Parse Rubric into Sections
          </Button>
        </div>
        <EmptyState
          icon={Layers}
          title="No project sections yet"
          description="Click 'Parse Rubric into Sections' to have AI analyze your rubric and break it into discrete tasks. Make sure you've uploaded a rubric first."
        />
      </div>
    );
  }

  // Parsing in progress
  if (parseMutation.isPending) {
    return (
      <div className="rounded-xl border border-border/60 bg-card/40 p-8 flex flex-col items-center gap-3 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <div>
          <p className="text-sm font-medium">Parsing rubric into sections...</p>
          <p className="text-xs text-muted-foreground mt-1">
            AI is analyzing your rubric to identify discrete tasks. This may take 15–30 seconds.
          </p>
        </div>
      </div>
    );
  }

  // Main layout — sections + chat
  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <ModelSelector
          value={selectedModel}
          onChange={setSelectedModel}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={handleParse}
          disabled={!selectedModel || parseMutation.isPending}
        >
          <Sparkles className="h-4 w-4" />
          Re-parse Rubric
        </Button>
        <ProjectExportButton courseId={courseId} sections={sections} />
      </div>

      {/* Task tabs + split layout */}
      {hasMultipleTasks ? (
        <Tabs defaultValue={taskGroups[0].label} className="w-full">
          <TabsList className="w-full justify-start">
            {taskGroups.map((g) => {
              const done = g.sections.filter((s) => s.status === "complete").length;
              return (
                <TabsTrigger key={g.label} value={g.label} className="gap-1.5">
                  {g.label}
                  <span className="text-xs text-muted-foreground">
                    {done}/{g.sections.length}
                  </span>
                </TabsTrigger>
              );
            })}
          </TabsList>
          {taskGroups.map((g) => (
            <TabsContent key={g.label} value={g.label} className="mt-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="rounded-xl border border-border/60 bg-card/40 p-4">
                  <ProjectSectionList
                    sections={g.sections}
                    generatingSectionId={generateDraft.isPending ? (generateDraft.variables?.sectionId ?? null) : null}
                    onGenerate={handleGenerateDraft}
                    onUpdateDraft={handleUpdateDraft}
                    onUpdateCode={handleUpdateCode}
                    onToggleComplete={handleToggleComplete}
                    updatingSectionId={updateSection.isPending ? (updateSection.variables?.sectionId ?? null) : null}
                  />
                </div>
                <div className="rounded-xl border border-border/60 bg-card/40 p-4 min-h-[500px] flex flex-col">
                  <ProjectChat
                    messages={chatMessages}
                    sections={g.sections}
                    isSending={sendChat.isPending}
                    onSend={handleSendChat}
                    onClear={() => clearChat.mutate()}
                    isClearing={clearChat.isPending}
                    defaultModel={selectedModel || defaultModel}
                  />
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      ) : (
      /* Single-task fallback — no tabs */
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left — sections */}
        <div className="rounded-xl border border-border/60 bg-card/40 p-4">
          <ProjectSectionList
            sections={sections}
            generatingSectionId={generateDraft.isPending ? (generateDraft.variables?.sectionId ?? null) : null}
            onGenerate={handleGenerateDraft}
            onUpdateDraft={handleUpdateDraft}
            onUpdateCode={handleUpdateCode}
            onToggleComplete={handleToggleComplete}
            updatingSectionId={updateSection.isPending ? (updateSection.variables?.sectionId ?? null) : null}
          />
        </div>

        {/* Right — chat */}
        <div className="rounded-xl border border-border/60 bg-card/40 p-4 min-h-[500px] flex flex-col">
          <ProjectChat
            messages={chatMessages}
            sections={sections}
            isSending={sendChat.isPending}
            onSend={handleSendChat}
            onClear={() => clearChat.mutate()}
            isClearing={clearChat.isPending}
            defaultModel={selectedModel || defaultModel}
          />
        </div>
      </div>
      )}
    </div>
  );
};
