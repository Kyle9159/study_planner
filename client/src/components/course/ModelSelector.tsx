import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAvailableModels } from "@/hooks/queries/useSettingsQueries";

interface ModelSelectorProps {
  value: string;
  onChange: (model: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  value,
  onChange,
  disabled,
  placeholder = "Select a model...",
}) => {
  const { data: models = [], isLoading } = useAvailableModels();
  const hasSelectedValueOutsideList = !!value && !models.some((m) => m.id === value);

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled || isLoading}>
      <SelectTrigger className="w-[260px]">
        <SelectValue placeholder={isLoading ? "Loading models..." : placeholder} />
      </SelectTrigger>
      <SelectContent>
        {hasSelectedValueOutsideList && (
          <SelectItem value={value}>{value}</SelectItem>
        )}
        {models.length === 0 && !isLoading ? (
          <SelectItem value="__no_models__" disabled>
            No models found (check Gab API key)
          </SelectItem>
        ) : (
          models.map((model) => (
            <SelectItem key={model.id} value={model.id}>
              {model.name}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
};
