import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as api from "@/api/client";
import { queryKeys } from "@/lib/queryKeys";

export function useGenerateStudyGuideMutation(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ model, minimalPass }: { model: string; minimalPass?: boolean }) =>
      api.generateStudyGuide(courseId, model, minimalPass ?? false),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.courses.detail(courseId) });
      toast.success("Study guide generated");
    },
    onError: (err) => toast.error(`Generation failed: ${err.message}`),
  });
}

export function useGenerateProjectGuideMutation(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ model }: { model: string }) => api.generateProjectGuide(courseId, model),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.courses.detail(courseId) });
      toast.success("Project guide generated");
    },
    onError: (err) => toast.error(`Generation failed: ${err.message}`),
  });
}
