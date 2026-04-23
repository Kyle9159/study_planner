import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as api from "@/api/client";
import { queryKeys } from "@/lib/queryKeys";

export function useParseRubricSectionsMutation(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ model, force }: { model: string; force?: boolean }) =>
      api.parseRubricSections(courseId, model, force),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.courses.detail(courseId) });
      toast.success("Rubric parsed into sections");
    },
    onError: (err) => toast.error(`Parse failed: ${err.message}`),
  });
}

export function useGenerateSectionDraftMutation(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sectionId, model }: { sectionId: string; model: string }) =>
      api.generateSectionDraft(courseId, sectionId, model),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.courses.detail(courseId) });
      toast.success("Draft generated");
    },
    onError: (err) => toast.error(`Generation failed: ${err.message}`),
  });
}

export function useUpdateSectionMutation(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      sectionId,
      data,
    }: {
      sectionId: string;
      data: { draftContent?: string; codeContent?: string; status?: "pending" | "drafting" | "complete" };
    }) => api.updateSection(courseId, sectionId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.courses.detail(courseId) });
    },
    onError: (err) => toast.error(`Update failed: ${err.message}`),
  });
}

export function useSendChatMessageMutation(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      message,
      model,
      sectionId,
    }: {
      message: string;
      model: string;
      sectionId?: string;
    }) => api.sendChatMessage(courseId, message, model, sectionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.courses.detail(courseId) });
    },
    onError: (err) => toast.error(`Chat failed: ${err.message}`),
  });
}

export function useClearChatMutation(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.clearChat(courseId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.courses.detail(courseId) });
      toast.success("Chat cleared");
    },
    onError: (err) => toast.error(`Clear failed: ${err.message}`),
  });
}
