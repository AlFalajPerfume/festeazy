export const GOOGLE_FONT_STYLESHEET_URL =
  "https://fonts.googleapis.com/css2?family=Anton&family=Bebas+Neue&family=Cinzel:wght@400;500;600;700;800;900&family=Inter:wght@300;400;500;600;700;800;900&family=League+Spartan:wght@300;400;500;600;700;800;900&family=Merriweather:wght@300;400;700;900&family=Montserrat:wght@300;400;500;600;700;800;900&family=Noto+Kufi+Arabic:wght@400;500;600;700;800;900&family=Noto+Sans+Arabic:wght@400;500;600;700;800;900&family=Noto+Sans+Malayalam:wght@400;500;600;700;800;900&family=Noto+Serif+Malayalam:wght@400;500;600;700;800;900&family=Oswald:wght@300;400;500;600;700&family=Playfair+Display:wght@400;500;600;700;800;900&family=Poppins:wght@300;400;500;600;700;800;900&family=Roboto:wght@300;400;500;600;700;800;900&display=swap";

export const CUSTOM_FONT_FACE_CSS = `
@font-face {
  font-family: "Fhlecturis Rounded";
  src: url("/fonts/fhlecturis-rounded-light.otf") format("opentype");
  font-style: normal;
  font-weight: 300;
  font-display: swap;
}
@font-face {
  font-family: "Fhlecturis Rounded";
  src: url("/fonts/fhlecturis-rounded-regular.otf") format("opentype");
  font-style: normal;
  font-weight: 400;
  font-display: swap;
}
@font-face {
  font-family: "Fhlecturis Rounded";
  src: url("/fonts/fhlecturis-rounded-bold.otf") format("opentype");
  font-style: normal;
  font-weight: 700;
  font-display: swap;
}
@font-face {
  font-family: "Fhlecturis";
  src: url("/fonts/fhlecturis-light.otf") format("opentype");
  font-style: normal;
  font-weight: 300;
  font-display: swap;
}
@font-face {
  font-family: "Fhlecturis";
  src: url("/fonts/fhlecturis-regular.otf") format("opentype");
  font-style: normal;
  font-weight: 400;
  font-display: swap;
}
@font-face {
  font-family: "Fhlecturis";
  src: url("/fonts/fhlecturis-bold.otf") format("opentype");
  font-style: normal;
  font-weight: 700;
  font-display: swap;
}
@font-face {
  font-family: "FKL Jazri 2";
  src: url("/fonts/fkl-jazri-2-bold.otf") format("opentype");
  font-style: normal;
  font-weight: 700;
  font-display: swap;
}
`;

export type AppFontOption = {
  label: string;
  value: string;
  group: "Base Fonts" | "Language Fonts" | "Custom Fonts";
  availableWeights: number[];
};

export const DEFAULT_APP_FONT_FAMILY =
  "Montserrat, Poppins, Arial, Helvetica, sans-serif";

export const FONT_OPTION_GROUPS: Array<{
  label: AppFontOption["group"];
  options: AppFontOption[];
}> = [
  {
    label: "Base Fonts",
    options: [
      {
        label: "Montserrat",
        value: "Montserrat, Poppins, Arial, Helvetica, sans-serif",
        group: "Base Fonts",
        availableWeights: [300, 400, 500, 600, 700, 800, 900],
      },
      {
        label: "Poppins",
        value: "Poppins, Montserrat, Arial, Helvetica, sans-serif",
        group: "Base Fonts",
        availableWeights: [300, 400, 500, 600, 700, 800, 900],
      },
      {
        label: "Inter",
        value: "Inter, Arial, Helvetica, sans-serif",
        group: "Base Fonts",
        availableWeights: [300, 400, 500, 600, 700, 800, 900],
      },
      {
        label: "Roboto",
        value: "Roboto, Arial, Helvetica, sans-serif",
        group: "Base Fonts",
        availableWeights: [300, 400, 500, 600, 700, 800, 900],
      },
      {
        label: "Arial",
        value: "Arial, Helvetica, sans-serif",
        group: "Base Fonts",
        availableWeights: [400, 700, 900],
      },
      {
        label: "Oswald",
        value: "Oswald, Arial, sans-serif",
        group: "Base Fonts",
        availableWeights: [300, 400, 500, 600, 700],
      },
      {
        label: "Bebas Neue",
        value: "Bebas Neue, Oswald, Arial, sans-serif",
        group: "Base Fonts",
        availableWeights: [400],
      },
      {
        label: "Anton",
        value: "Anton, Arial Black, Arial, sans-serif",
        group: "Base Fonts",
        availableWeights: [400],
      },
      {
        label: "League Spartan",
        value: "League Spartan, Montserrat, Arial, sans-serif",
        group: "Base Fonts",
        availableWeights: [300, 400, 500, 600, 700, 800, 900],
      },
      {
        label: "Cinzel",
        value: "Cinzel, Georgia, serif",
        group: "Base Fonts",
        availableWeights: [400, 500, 600, 700, 800, 900],
      },
      {
        label: "Playfair Display",
        value: "Playfair Display, Georgia, serif",
        group: "Base Fonts",
        availableWeights: [400, 500, 600, 700, 800, 900],
      },
      {
        label: "Merriweather",
        value: "Merriweather, Georgia, serif",
        group: "Base Fonts",
        availableWeights: [300, 400, 700, 900],
      },
    ],
  },
  {
    label: "Language Fonts",
    options: [
      {
        label: "Noto Sans Malayalam",
        value: "Noto Sans Malayalam, Arial, sans-serif",
        group: "Language Fonts",
        availableWeights: [400, 500, 600, 700, 800, 900],
      },
      {
        label: "Noto Serif Malayalam",
        value: "Noto Serif Malayalam, Georgia, serif",
        group: "Language Fonts",
        availableWeights: [400, 500, 600, 700, 800, 900],
      },
      {
        label: "Noto Sans Arabic",
        value: "Noto Sans Arabic, Arial, sans-serif",
        group: "Language Fonts",
        availableWeights: [400, 500, 600, 700, 800, 900],
      },
      {
        label: "Noto Kufi Arabic",
        value: "Noto Kufi Arabic, Noto Sans Arabic, Arial, sans-serif",
        group: "Language Fonts",
        availableWeights: [400, 500, 600, 700, 800, 900],
      },
    ],
  },
  {
    label: "Custom Fonts",
    options: [
      {
        label: "Fhlecturis Rounded",
        value:
          '"Fhlecturis Rounded", Montserrat, Poppins, Arial, Helvetica, sans-serif',
        group: "Custom Fonts",
        availableWeights: [300, 400, 700],
      },
      {
        label: "Fhlecturis",
        value:
          '"Fhlecturis", Montserrat, Poppins, Arial, Helvetica, sans-serif',
        group: "Custom Fonts",
        availableWeights: [300, 400, 700],
      },
      {
        label: "FKL Jazri 2",
        value: '"FKL Jazri 2", Anton, Arial Black, Arial, sans-serif',
        group: "Custom Fonts",
        availableWeights: [700],
      },
    ],
  },
];

export const FONT_OPTIONS = FONT_OPTION_GROUPS.flatMap(
  (group) => group.options,
);

export const CUSTOM_FONT_OPTIONS = FONT_OPTIONS.filter(
  (font) => font.group === "Custom Fonts",
);

export function normalizeFontFamily(fontFamily: string | null | undefined) {
  const normalized = String(fontFamily || "").trim();

  const aliases: Record<string, string> = {
    "Montserrat, Arial, sans-serif":
      "Montserrat, Poppins, Arial, Helvetica, sans-serif",
    "Poppins, Arial, sans-serif":
      "Poppins, Montserrat, Arial, Helvetica, sans-serif",
  };

  return aliases[normalized] || normalized || DEFAULT_APP_FONT_FAMILY;
}

export function getFontLabel(fontFamily: string) {
  return (
    FONT_OPTIONS.find((font) => font.value === fontFamily)?.label ||
    fontFamily.split(",")[0]?.replaceAll('"', "").trim() ||
    "Custom Font"
  );
}

export function getSupportedFontWeight(
  fontFamily: string,
  requestedWeight: number,
) {
  const option = FONT_OPTIONS.find((font) => font.value === fontFamily);
  if (!option || option.availableWeights.includes(requestedWeight)) {
    return requestedWeight;
  }

  return option.availableWeights.reduce((closest, current) =>
    Math.abs(current - requestedWeight) < Math.abs(closest - requestedWeight)
      ? current
      : closest,
  );
}
