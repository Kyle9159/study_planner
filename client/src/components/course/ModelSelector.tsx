import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAvailableModels } from "@/hooks/queries/useSettingsQueries";

const XAI_MODELS = [
  { id: "xai/grok-4.3", name: "Grok 4.3 (xAI)" },
  { id: "xai/grok-4-fast-reasoning", name: "Grok 4 Fast Reasoning (xAI)" },
  { id: "xai/grok-4-fast-non-reasoning", name: "Grok 4 Fast (xAI)" },
  { id: "xai/grok-4.20-0309-reasoning", name: "Grok 4.2 Reasoning (xAI)" },
  { id: "xai/grok-4.20-0309-non-reasoning", name: "Grok 4.2 (xAI)" },
  { id: "xai/grok-4-1-fast-reasoning", name: "Grok 4.1 Fast Reasoning (xAI)" },
  { id: "xai/grok-4-1-fast-non-reasoning", name: "Grok 4.1 Fast (xAI)" },
] as const;

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
  const hasSelectedValueOutsideList =
    !!value && !models.some((m) => m.id === value) && !XAI_MODELS.some((m) => m.id === value);

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled || isLoading}>
      <SelectTrigger className="w-[260px]">
        <SelectValue placeholder={isLoading ? "Loading models..." : placeholder} />
      </SelectTrigger>
      <SelectContent>
        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          xAI
        </div>
        {XAI_MODELS.map((model) => (
          <SelectItem key={model.id} value={model.id}>
            {model.name}
          </SelectItem>
        ))}
        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Gab AI
        </div>
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
