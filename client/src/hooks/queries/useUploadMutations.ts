import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as api from "@/api/client";
import { queryKeys } from "@/lib/queryKeys";

export function useUploadMaterialMutation(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) => api.uploadMaterial(courseId, formData),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.courses.detail(courseId) });
      toast.success("Material uploaded");
    },
    onError: (err) => toast.error(`Upload failed: ${err.message}`),
  });
}

export function useAddYouTubeMaterialMutation(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (url: string) => api.addYouTubeMaterial(courseId, url),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.courses.detail(courseId) });
      toast.success("YouTube transcript added");
    },
    onError: (err) => toast.error(`Failed: ${err.message}`),
  });
}

export function useAddWebpageMaterialMutation(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (url: string) => api.addWebpageMaterial(courseId, url),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.courses.detail(courseId) });
      toast.success("WGU page content extracted");
    },
    onError: (err) => toast.error(`Failed: ${err.message}`),
  });
}

export function useDeleteMaterialMutation(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (materialId: string) => api.deleteMaterial(courseId, materialId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.courses.detail(courseId) });
      toast.success("Material removed");
    },
    onError: (err) => toast.error(err.message),
  });
}

export function useUploadRubricMutation(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) => api.uploadRubric(courseId, formData),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.courses.detail(courseId) });
      toast.success("Rubric uploaded");
    },
    onError: (err) => toast.error(`Upload failed: ${err.message}`),
  });
}

export function useAddYouTubeRubricMutation(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (url: string) => api.addYouTubeRubric(courseId, url),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.courses.detail(courseId) });
      toast.success("YouTube transcript added as rubric");
    },
    onError: (err) => toast.error(`Failed: ${err.message}`),
  });
}

export function useAddWebpageRubricMutation(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (url: string) => api.addWebpageRubric(courseId, url),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.courses.detail(courseId) });
      toast.success("WGU page content extracted as rubric");
    },
    onError: (err) => toast.error(`Failed: ${err.message}`),
  });
}

export function useDeleteRubricMutation(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (rubricId: string) => api.deleteRubric(courseId, rubricId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.courses.detail(courseId) });
      toast.success("Rubric removed");
    },
    onError: (err) => toast.error(err.message),
  });
}
