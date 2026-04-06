import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const MODEL_GROUPS = [
  {
    label: "xAI",
    models: [
      { id: "grok-4.20-0309-reasoning", name: "Grok 4.2 (Reasoning)" },
      { id: "grok-4.20-0309-non-reasoning", name: "Grok 4.2" },
      { id: "grok-4-1-fast-reasoning", name: "Grok 4.1 Fast (Reasoning)" },
      { id: "grok-4-1-fast-non-reasoning", name: "Grok 4.1 Fast" },
    ],
  },
  {
    label: "Anthropic",
    models: [
      { id: "claude-opus-4-6", name: "Claude Opus 4.6" },
      { id: "claude-sonnet-4-6", name: "Claude Sonnet 4.6" },
      { id: "claude-haiku-3-5-20241022", name: "Claude 3.5 Haiku" },
    ],
  },
  {
    label: "GitHub Models",
    models: [
      { id: "gpt-4o", name: "GPT-4o" },
      { id: "gpt-4o-mini", name: "GPT-4o Mini" },
      { id: "grok-4-1-fast-reasoning", name: "Grok 4.1 Fast (Reasoning)" },
      { id: "grok-4-1-fast-non-reasoning", name: "Grok 4.1 Fast" },
      { id: "grok-code-fast-1", name: "Grok Code Fast 1" },
      { id: "claude-sonnet-4-6", name: "Claude Sonnet 4.6" },
      { id: "gpt-5.4", name: "GPT-5.4" },
      { id: "gemini-3-1-pro", name: "Gemini 3.1 Pro" },
    ],
  },
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
}) => (
  <Select value={value} onValueChange={onChange} disabled={disabled}>
    <SelectTrigger className="w-[260px]">
      <SelectValue placeholder={placeholder} />
    </SelectTrigger>
    <SelectContent>
      {MODEL_GROUPS.map((group) => (
        <div key={group.label}>
          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {group.label}
          </div>
          {group.models.map((m) => (
            <SelectItem key={`${group.label}-${m.id}`} value={m.id}>
              {m.name}
            </SelectItem>
          ))}
        </div>
      ))}
    </SelectContent>
  </Select>
);
