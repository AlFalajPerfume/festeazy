/* eslint-disable */
"use client";

import { forwardRef, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Align = "left" | "center" | "right";

type PosterField = {
  x: number;
  y: number;
  width: number;
  fontSize: number;
  fontWeight: number;
  color: string;
  align: Align;
  fontFamily?: string;
  letterSpacing?: string;
  lineHeight?: number;
};

type PosterConfig = Record<string, PosterField>;

type Result = {
  id: string | number;
  result_number?: number | null;
  programme_id?: number | null;
  program: string;
  category: string;
  type: string;
  group_type?: string | null;
  time: string;
  first: {
    name: string;
    unit: string;
    points: number;
  };
  second: {
    name: string;
    unit: string;
    points: number;
  };
  third: {
    name: string;
    unit: string;
    points: number;
  };
};

type ResultPosterProps = {
  result: Result;
};

type PosterSetting = {
  config: PosterConfig | null;
};

const POSTER_CANVAS_WIDTH = 1116;
const POSTER_CANVAS_HEIGHT = 1280;

// Keep only the templates that exist in public/image/templates.
// Browser path should start from /image, not your Mac /Users/... path.
const POSTER_TEMPLATES = [
  "/templates/result1.png",
  "/templates/result2.png",
];

const TEMPLATE_CACHE_VERSION = "v20";

const defaultConfig: PosterConfig = {
  result_label: {
    x: 155,
    y: 235,
    width: 180,
    fontSize: 34,
    fontWeight: 400,
    color: "#f2bd18",
    align: "left",
    fontFamily: "Montserrat, Poppins, Arial, sans-serif",
    letterSpacing: "5px",
    lineHeight: 1,
  },

  result_no: {
    x: 328,
    y: 205,
    width: 170,
    fontSize: 82,
    fontWeight: 500,
    color: "#f2bd18",
    align: "left",
    fontFamily: "Montserrat, Poppins, Arial, sans-serif",
    letterSpacing: "0px",
    lineHeight: 0.92,
  },

  category: {
    x: 155,
    y: 315,
    width: 620,
    fontSize: 28,
    fontWeight: 400,
    color: "#ffffff",
    align: "left",
    fontFamily: "Montserrat, Poppins, Arial, Helvetica, sans-serif",
    letterSpacing: "1.2px",
    lineHeight: 1,
  },

  programme: {
    x: 155,
    y: 360,
    width: 680,
    fontSize: 38,
    fontWeight: 800,
    color: "#ffffff",
    align: "left",
    fontFamily: "Montserrat, Poppins, Arial, Helvetica, sans-serif",
    letterSpacing: "0.5px",
    lineHeight: 1,
  },

  first_name: {
    x: 275,
    y: 492,
    width: 520,
    fontSize: 32,
    fontWeight: 500,
    color: "#ffffff",
    align: "left",
    fontFamily: "Montserrat, Poppins, Arial, Helvetica, sans-serif",
    letterSpacing: "0.3px",
    lineHeight: 1,
  },

  first_unit: {
    x: 275,
    y: 531,
    width: 520,
    fontSize: 24,
    fontWeight: 300,
    color: "#d7d7d7",
    align: "left",
    fontFamily: "Montserrat, Poppins, Arial, Helvetica, sans-serif",
    letterSpacing: "0px",
    lineHeight: 1,
  },

  second_name: {
    x: 275,
    y: 606,
    width: 520,
    fontSize: 32,
    fontWeight: 500,
    color: "#ffffff",
    align: "left",
    fontFamily: "Montserrat, Poppins, Arial, Helvetica, sans-serif",
    letterSpacing: "0.3px",
    lineHeight: 1,
  },

  second_unit: {
    x: 275,
    y: 645,
    width: 520,
    fontSize: 24,
    fontWeight: 300,
    color: "#d7d7d7",
    align: "left",
    fontFamily: "Montserrat, Poppins, Arial, Helvetica, sans-serif",
    letterSpacing: "0px",
    lineHeight: 1,
  },

  third_name: {
    x: 275,
    y: 720,
    width: 520,
    fontSize: 32,
    fontWeight: 500,
    color: "#ffffff",
    align: "left",
    fontFamily: "Montserrat, Poppins, Arial, Helvetica, sans-serif",
    letterSpacing: "0.3px",
    lineHeight: 1,
  },

  third_unit: {
    x: 275,
    y: 759,
    width: 520,
    fontSize: 24,
    fontWeight: 300,
    color: "#d7d7d7",
    align: "left",
    fontFamily: "Montserrat, Poppins, Arial, Helvetica, sans-serif",
    letterSpacing: "0px",
    lineHeight: 1,
  },
};

function mergeConfig(savedConfig: PosterConfig | null) {
  if (!savedConfig) return defaultConfig;

  const merged: PosterConfig = {};

  Object.keys(defaultConfig).forEach((key) => {
    merged[key] = {
      ...defaultConfig[key],
      ...(savedConfig[key] || {}),
    };
  });

  return merged;
}

function cleanText(value?: string | null) {
  return (value || "").replace(/\s+/g, " ").trim();
}

function formatText(value?: string | null) {
  return cleanText(value);
}

function formatResultNumber(value?: number | null) {
  if (!value) return "--";
  return String(value).padStart(2, "0");
}

function isHiddenGroup(value?: string | null) {
  const text = cleanText(value).toLowerCase();

  return (
    !text ||
    text === "open" ||
    text === "general" ||
    text === "individual" ||
    text === "boys" ||
    text === "boy"
  );
}

function normalizeGroup(value?: string | null) {
  const text = cleanText(value).toLowerCase();

  if (text.includes("girl")) return "Girls";
  if (isHiddenGroup(text)) return "";

  return formatText(value);
}

function formatPosterCategory(
  category?: string | null,
  type?: string | null,
  groupType?: string | null
) {
  const cleanCategory = formatText(category);
  const group = normalizeGroup(groupType);
  const typeText = normalizeGroup(type);

  if (group) return `${cleanCategory} • ${group}`;
  if (typeText) return `${cleanCategory} • ${typeText}`;

  return cleanCategory;
}

function getTemplateForResult(result: Result) {
  if (POSTER_TEMPLATES.length === 0) return "";

  // Stable random: the same result always gets the same template.
  // Result 01 => template1, Result 02 => template2, Result 03 => template3,
  // Result 04 => template1 again.
  if (result.result_number && result.result_number > 0) {
    const index = (result.result_number - 1) % POSTER_TEMPLATES.length;
    return POSTER_TEMPLATES[index];
  }

  // Fallback for rows without result_number.
  const idText = String(result.id || "");
  const hash = idText
    .split("")
    .reduce((sum, char) => sum + char.charCodeAt(0), 0);

  const index = Math.abs(hash) % POSTER_TEMPLATES.length;
  return POSTER_TEMPLATES[index];
}

function getTitleFontSize(value: string, baseSize: number) {
  const length = cleanText(value).length;

  if (length > 48) return Math.max(baseSize - 16, 22);
  if (length > 40) return Math.max(baseSize - 14, 24);
  if (length > 32) return Math.max(baseSize - 10, 26);
  if (length > 24) return Math.max(baseSize - 6, 28);

  return baseSize;
}

function getWinnerFontSize(name: string, baseSize: number) {
  const length = cleanText(name).length;

  if (length > 48) return Math.max(baseSize - 12, 22);
  if (length > 40) return Math.max(baseSize - 10, 24);
  if (length > 32) return Math.max(baseSize - 8, 25);
  if (length > 26) return Math.max(baseSize - 5, 27);

  return baseSize;
}

const ResultPoster = forwardRef<HTMLDivElement, ResultPosterProps>(
  function ResultPoster({ result }, ref) {
    const [config, setConfig] = useState<PosterConfig>(defaultConfig);
    const [backgroundImage, setBackgroundImage] = useState(() =>
      getTemplateForResult(result)
    );
    const [programmeGroupType, setProgrammeGroupType] = useState<string | null>(
      result.group_type ?? null
    );

    useEffect(() => {
      loadPosterSettings();
    }, []);

    useEffect(() => {
      setBackgroundImage(getTemplateForResult(result));
    }, [result.id, result.result_number]);

    useEffect(() => {
      setProgrammeGroupType(result.group_type ?? null);

      if (!result.group_type && result.programme_id) {
        loadProgrammeGroupType(result.programme_id);
      }
    }, [result.group_type, result.programme_id]);

    async function loadPosterSettings() {
      const { data, error } = await supabase
        .from("poster_settings")
        .select("config")
        .eq("is_active", true)
        .order("id", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error || !data) return;

      const settings = data as PosterSetting;
      setConfig(mergeConfig(settings.config));

      // Do not load background_image from DB here.
      // Background template is selected automatically from result-template1/2/3.
    }

    async function loadProgrammeGroupType(programmeId: number) {
      const { data, error } = await supabase
        .from("programmes")
        .select("group_type")
        .eq("id", programmeId)
        .maybeSingle();

      if (error || !data) return;

      setProgrammeGroupType(data.group_type ?? null);
    }

    return (
      <div
        ref={ref}
        style={{
          position: "relative",
          width: `${POSTER_CANVAS_WIDTH}px`,
          height: `${POSTER_CANVAS_HEIGHT}px`,
          overflow: "hidden",
          backgroundColor: "#ffffff",
          color: "#000000",
          fontFamily: "Montserrat, Poppins, Arial, Helvetica, sans-serif",
        }}
      >
        <style>
          {`@import url('https://fonts.googleapis.com/css2?family=Anton&family=Great+Vibes&family=Montserrat:wght@300;400;500;600;700;800;900&family=Poppins:wght@300;400;500;600;700;800;900&display=swap');`}
        </style>

        <img
          src={`${backgroundImage}?${TEMPLATE_CACHE_VERSION}`}
          alt=""
          draggable={false}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            zIndex: 0,
          }}
        />

        <SimplePosterText field={config.result_label} value="Result" />

        <SimplePosterText
          field={config.result_no}
          value={formatResultNumber(result.result_number)}
        />

        <PosterText
          field={config.category}
          value={formatPosterCategory(
            result.category,
            result.type,
            programmeGroupType
          )}
          variant="category"
        />

        <PosterText
          field={config.programme}
          value={formatText(result.program)}
          variant="programme"
        />

        <WinnerBlock
          name={result.first.name}
          unit={result.first.unit}
          nameField={config.first_name}
          unitField={config.first_unit}
        />

        <WinnerBlock
          name={result.second.name}
          unit={result.second.unit}
          nameField={config.second_name}
          unitField={config.second_unit}
        />

        <WinnerBlock
          name={result.third.name}
          unit={result.third.unit}
          nameField={config.third_name}
          unitField={config.third_unit}
        />
      </div>
    );
  }
);

export default ResultPoster;

function SimplePosterText({
  field,
  value,
}: {
  field: PosterField;
  value: string;
}) {
  if (!field || !value) return null;

  return (
    <div
      style={{
        position: "absolute",
        left: `${field.x}px`,
        top: `${field.y}px`,
        width: `${field.width}px`,
        color: field.color,
        fontSize: `${field.fontSize}px`,
        fontWeight: field.fontWeight,
        textAlign: field.align,
        lineHeight: field.lineHeight || 1,
        whiteSpace: "nowrap",
        letterSpacing: field.letterSpacing || "0px",
        fontFamily:
          field.fontFamily || "Poppins, Montserrat, Arial, Helvetica, sans-serif",
      }}
    >
      {value}
    </div>
  );
}

function PosterText({
  field,
  value,
  variant,
}: {
  field: PosterField;
  value: string;
  variant: "category" | "programme";
}) {
  if (!field || !value) return null;

  const posterValue = cleanText(value);
  const fontSize = getTitleFontSize(posterValue, field.fontSize);

  return (
    <div
      style={{
        position: "absolute",
        left: `${field.x}px`,
        top: `${field.y}px`,
        width: `${field.width}px`,
        color: field.color,
        fontSize: `${fontSize}px`,
        fontWeight: field.fontWeight,
        textAlign: field.align,
        lineHeight: field.lineHeight || 1,
        whiteSpace: "nowrap",
        overflow: "visible",
        wordBreak: "keep-all",
        overflowWrap: "normal",
        letterSpacing:
          field.letterSpacing || (variant === "programme" ? "0px" : "0px"),
        fontFamily:
          field.fontFamily ||
          "Montserrat, Poppins, Arial, Helvetica, sans-serif",
      }}
    >
      {posterValue}
    </div>
  );
}

function WinnerBlock({
  name,
  unit,
  nameField,
  unitField,
}: {
  name: string;
  unit: string;
  nameField: PosterField;
  unitField: PosterField;
}) {
  if (!nameField || !unitField) return null;

  const winnerName = formatText(name);
  const winnerUnit = formatText(unit);
  const fontSize = getWinnerFontSize(winnerName, nameField.fontSize);

  return (
    <div
      style={{
        position: "absolute",
        left: `${nameField.x}px`,
        top: `${nameField.y}px`,
        width: `${nameField.width}px`,
        minHeight: "118px",
        overflow: "visible",
        fontFamily:
          nameField.fontFamily ||
          "Montserrat, Poppins, Arial, Helvetica, sans-serif",
      }}
    >
      <div
        style={{
          color: nameField.color,
          fontSize: `${fontSize}px`,
          fontWeight: nameField.fontWeight,
          textAlign: nameField.align,
          lineHeight: nameField.lineHeight || 1.05,
          whiteSpace: "normal",
          wordBreak: "normal",
          overflowWrap: "break-word",
          letterSpacing: nameField.letterSpacing || "0px",
        }}
      >
        {winnerName}
      </div>

      <div
        style={{
          marginTop: "8px",
          color: unitField.color,
          fontSize: `${unitField.fontSize}px`,
          fontWeight: unitField.fontWeight,
          textAlign: unitField.align,
          lineHeight: unitField.lineHeight || 1.1,
          whiteSpace: "normal",
          wordBreak: "normal",
          overflowWrap: "break-word",
          letterSpacing: unitField.letterSpacing || "0px",
          fontFamily:
            unitField.fontFamily ||
            "Poppins, Montserrat, Arial, Helvetica, sans-serif",
        }}
      >
        {winnerUnit}
      </div>
    </div>
  );
}
