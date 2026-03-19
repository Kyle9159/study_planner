import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as api from "@/api/client";
import { queryKeys } from "@/lib/queryKeys";

export function useSettings() {
  return useQuery({
    queryKey: queryKeys.settings.current(),
    queryFn: api.getSettings,
  });
}

export function useUpdateSettingsMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.updateSettings,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.settings.current() });
      toast.success("Settings saved");
    },
    onError: (err) => toast.error(err.message),
  });
}
