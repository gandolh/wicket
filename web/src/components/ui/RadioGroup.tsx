import { Radio } from "@base-ui/react/radio";
import { RadioGroup as BaseRadioGroup } from "@base-ui/react/radio-group";
import { useId, type ReactNode } from "react";

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
    <div className="radio-field">
      <div id={labelId} className={segmented ? "sr-only" : "radio-label"}>
        {label}
      </div>
      <BaseRadioGroup<Value>
        aria-labelledby={labelId}
        value={value}
        onValueChange={onValueChange}
        className={segmented ? "radio-segments" : "radio-list"}
      >
        {options.map((option) =>
          segmented ? (
            <Radio.Root key={option.value} value={option.value} className="radio-segment">
              {option.label}
            </Radio.Root>
          ) : (
            <label key={option.value} className="radio-row">
              <Radio.Root value={option.value} className="radio-dot">
                <Radio.Indicator className="radio-dot-mark" />
              </Radio.Root>
              {option.label}
            </label>
          ),
        )}
      </BaseRadioGroup>
    </div>
  );
}
