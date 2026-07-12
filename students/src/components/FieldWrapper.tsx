import type { ReactNode } from "react";
import { labels, type LabelKey } from "../labels";

export default function FieldWrapper({
  labelKey,
  htmlFor,
  children,
  extraHint,
}: {
  labelKey: LabelKey;
  htmlFor: string;
  children: ReactNode;
  extraHint?: string;
}) {
  const label = labels[labelKey];
  return (
    <div className="field">
      <label htmlFor={htmlFor} className="field-label-en">
        {label.en}
      </label>
      {label.my && (
        <div className="field-label-my" lang="my">
          {label.my}
        </div>
      )}
      {children}
      {(label.hintEn || extraHint) && (
        <p className="field-hint">
          {label.hintEn}
          {extraHint ? ` ${extraHint}` : ""}
        </p>
      )}
    </div>
  );
}
