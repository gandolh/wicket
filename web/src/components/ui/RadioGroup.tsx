import { Radio } from "@base-ui/react/radio";
import { RadioGroup as BaseRadioGroup } from "@base-ui/react/radio-group";
import { useId, type ReactNode } from "react";
import { cn } from "../../lib/cn";

export interface RadioOption<Value extends string> {
  value: Value;
  label: ReactNode;
}

export interface RadioGroupProps<Value extends string> {
  /** Names the group for a screen reader; shown only in the `list` look. */
  label: ReactNode;
  options: readonly RadioOption<Value>[];
  value: Value;
  onValueChange: (value: Value) => void;
  /** `list` stacks radios with dots; `segmented` draws one row of buttons, for a filter. */
  look?: "list" | "segmented";
}

/**
 * One choice from a few. Tab enters the group, and the arrow keys move and
 * choose: for a filter, and for a setting kept on the device.
 */
export function RadioGroup<Value extends string>({
  label,
  options,
  value,
  onValueChange,
  look = "list",
}: RadioGroupProps<Value>) {
  const labelId = useId();
  const segmented = look === "segmented";
  return (
    <div className="flex flex-col gap-1.5">
      <div id={labelId} className={segmented ? "sr-only" : "font-medium text-ink-muted"}>
        {label}
      </div>
      <BaseRadioGroup<Value>
        aria-labelledby={labelId}
        value={value}
        onValueChange={onValueChange}
        className={
          segmented
            ? "inline-flex rounded-group border border-line-control bg-surface p-0.5 max-[560px]:p-0"
            : "flex flex-col gap-2"
        }
      >
        {options.map((option) =>
          segmented ? (
            <Radio.Root
              key={option.value}
              value={option.value}
              className={cn(
                "inline-flex min-h-8 cursor-pointer items-center justify-center rounded-segment px-3 font-medium whitespace-nowrap text-ink-muted select-none max-[560px]:min-h-11 max-[560px]:px-2.25",
                "hover:not-data-checked:text-ink data-checked:bg-accent-soft data-checked:font-bold data-checked:text-ink data-checked:shadow-[inset_0_0_0_1.5px_var(--color-accent)]",
              )}
            >
              {option.label}
            </Radio.Root>
          ) : (
            <label key={option.value} className="flex items-center gap-2">
              <Radio.Root
                value={option.value}
                className="flex size-4 flex-none items-center justify-center rounded-full border border-line-control bg-surface data-checked:border-accent data-checked:bg-accent-soft"
              >
                <Radio.Indicator className="size-1.5 rounded-full bg-accent" />
              </Radio.Root>
              {option.label}
            </label>
          ),
        )}
      </BaseRadioGroup>
    </div>
  );
}
