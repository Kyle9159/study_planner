import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as api from "@/api/client";
import { queryKeys } from "@/lib/queryKeys";
import { useNavigate } from "react-router-dom";

export function useCourses() {
  return useQuery({
    queryKey: queryKeys.courses.list(),
    queryFn: api.getCourses,
  });
}

export function useCourse(id: string) {
  return useQuery({
    queryKey: queryKeys.courses.detail(id),
    queryFn: () => api.getCourse(id),
    enabled: !!id,
  });
}

export function useCreateCourseMutation() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: api.createCourse,
    onSuccess: (course) => {
      qc.invalidateQueries({ queryKey: queryKeys.courses.list() });
      toast.success("Course created");
      navigate(`/courses/${course.id}`);
    },
    onError: (err) => toast.error(err.message),
  });
}

export function useUpdateCourseMutation(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof api.updateCourse>[1]) => api.updateCourse(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.courses.detail(id) });
      qc.invalidateQueries({ queryKey: queryKeys.courses.list() });
      toast.success("Course updated");
    },
    onError: (err) => toast.error(err.message),
  });
}

export function useDeleteCourseMutation() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: api.deleteCourse,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.courses.list() });
      toast.success("Course deleted");
      navigate("/");
    },
    onError: (err) => toast.error(err.message),
  });
}
