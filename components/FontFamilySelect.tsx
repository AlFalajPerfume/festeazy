"use client";

import { FONT_OPTION_GROUPS } from "@/app/fonts";

type FontFamilySelectProps = {
  value: string;
  onChange: (fontFamily: string) => void;
  className?: string;
  ariaLabel?: string;
  includeGeorgia?: boolean;
};

export default function FontFamilySelect({
  value,
  onChange,
  className = "",
  ariaLabel = "Font family",
  includeGeorgia = false,
}: FontFamilySelectProps) {
  return (
    <select
      aria-label={ariaLabel}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      style={{ fontFamily: value }}
      className={className}
    >
      {FONT_OPTION_GROUPS.map((group) => (
        <optgroup key={group.label} label={group.label}>
          {group.options.map((font) => (
            <option
              key={font.label}
              value={font.value}
              style={{ fontFamily: font.value }}
            >
              {font.label}
            </option>
          ))}
        </optgroup>
      ))}

      {includeGeorgia && (
        <optgroup label="System Fonts">
          <option value="Georgia, serif" style={{ fontFamily: "Georgia, serif" }}>
            Georgia
          </option>
        </optgroup>
      )}
    </select>
  );
}
