"use client";

import { PointerEvent, useRef } from "react";

export type MilestoneElementKey =
  | "logo"
  | "eyebrow"
  | "organization"
  | "afterLabel"
  | "milestoneNumber"
  | "leaderboard"
  | "footerLabel"
  | "eventTitle"
  | "resultsCount";

export type MilestoneTextAlign = "left" | "center" | "right";
export type MilestoneLogoSource = "organization" | "custom" | "none";
export type MilestoneObjectFit = "contain" | "cover";

export type MilestoneLayerStyle = {
  x: number;
  y: number;
  width: number;
  height?: number;
  fontSize: number;
  fontWeight: number;
  color: string;
  fontFamily: string;
  textAlign: MilestoneTextAlign;
  visible: boolean;
  lineHeight?: number;
  letterSpacing?: number;
  italic?: boolean;
  uppercase?: boolean;
  rowGap?: number;
  rankFontSize?: number;
  nameFontSize?: number;
  pointsFontSize?: number;
  showRanks?: boolean;
  opacity?: number;
  borderRadius?: number;
  objectFit?: MilestoneObjectFit;
  logoSource?: MilestoneLogoSource;
  customLogoUrl?: string | null;
};

export type MilestonePosterLayout = {
  version: 1;
  elements: Record<MilestoneElementKey, MilestoneLayerStyle>;
};

export type MilestoneLeaderboardRow = {
  teamId?: string;
  teamName: string;
  points: number;
};

const FONT_SANS = 'Inter, Arial, Helvetica, sans-serif';
const FONT_SERIF = 'Georgia, "Times New Roman", serif';

export const MILESTONE_ELEMENT_LABELS: Record<MilestoneElementKey, string> = {
  logo: "Logo",
  eyebrow: "Top Label",
  organization: "Organization Name",
  afterLabel: '"After" Label',
  milestoneNumber: "Milestone Number",
  leaderboard: "Leaderboard",
  footerLabel: "Footer Label",
  eventTitle: "Event Title",
  resultsCount: "Results Count",
};

const ELEMENT_KEYS: MilestoneElementKey[] = [
  "logo",
  "eyebrow",
  "organization",
  "afterLabel",
  "milestoneNumber",
  "leaderboard",
  "footerLabel",
  "eventTitle",
  "resultsCount",
];

function proportional(value: number, width: number) {
  return Math.round(value * (width / 1080));
}

export function createDefaultMilestoneLayout(
  width = 1080,
  height = 1350,
): MilestonePosterLayout {
  const sx = width / 1080;
  const sy = height / 1350;

  return {
    version: 1,
    elements: {
      logo: {
        x: Math.round(62 * sx),
        y: Math.round(55 * sy),
        width: Math.round(132 * sx),
        height: Math.round(132 * sy),
        fontSize: proportional(14, width),
        fontWeight: 800,
        color: "#ffffff",
        fontFamily: FONT_SANS,
        textAlign: "center",
        visible: true,
        opacity: 1,
        borderRadius: Math.round(18 * sx),
        objectFit: "contain",
        logoSource: "organization",
        customLogoUrl: null,
      },
      eyebrow: {
        x: Math.round(225 * sx),
        y: Math.round(64 * sy),
        width: Math.round(785 * sx),
        fontSize: proportional(14, width),
        fontWeight: 800,
        color: "#ffffff",
        fontFamily: FONT_SANS,
        textAlign: "left",
        visible: true,
        lineHeight: 1.15,
        letterSpacing: 4.2 * sx,
        uppercase: true,
      },
      organization: {
        x: Math.round(225 * sx),
        y: Math.round(108 * sy),
        width: Math.round(785 * sx),
        fontSize: proportional(18, width),
        fontWeight: 700,
        color: "#ffffff",
        fontFamily: FONT_SANS,
        textAlign: "left",
        visible: true,
        lineHeight: 1.25,
      },
      afterLabel: {
        x: Math.round(160 * sx),
        y: Math.round(425 * sy),
        width: Math.round(220 * sx),
        fontSize: proportional(82, width),
        fontWeight: 400,
        color: "#ffffff",
        fontFamily: FONT_SERIF,
        textAlign: "left",
        visible: true,
        lineHeight: 1,
        italic: true,
      },
      milestoneNumber: {
        x: Math.round(380 * sx),
        y: Math.round(408 * sy),
        width: Math.round(330 * sx),
        fontSize: proportional(110, width),
        fontWeight: 800,
        color: "#ffffff",
        fontFamily: FONT_SANS,
        textAlign: "left",
        visible: true,
        lineHeight: 1,
      },
      leaderboard: {
        x: Math.round(170 * sx),
        y: Math.round(585 * sy),
        width: Math.round(650 * sx),
        fontSize: proportional(42, width),
        fontWeight: 500,
        color: "#ffffff",
        fontFamily: FONT_SANS,
        textAlign: "left",
        visible: true,
        lineHeight: 1,
        rowGap: Math.round(15 * sy),
        rankFontSize: proportional(21, width),
        nameFontSize: proportional(42, width),
        pointsFontSize: proportional(45, width),
        showRanks: true,
      },
      footerLabel: {
        x: Math.round(120 * sx),
        y: Math.round(1138 * sy),
        width: Math.round(600 * sx),
        fontSize: proportional(16, width),
        fontWeight: 800,
        color: "#ffffff",
        fontFamily: FONT_SANS,
        textAlign: "left",
        visible: true,
        lineHeight: 1.1,
        letterSpacing: 3.7 * sx,
        uppercase: true,
      },
      eventTitle: {
        x: Math.round(120 * sx),
        y: Math.round(1180 * sy),
        width: Math.round(720 * sx),
        fontSize: proportional(58, width),
        fontWeight: 900,
        color: "#ffffff",
        fontFamily: FONT_SANS,
        textAlign: "left",
        visible: true,
        lineHeight: 1,
      },
      resultsCount: {
        x: Math.round(820 * sx),
        y: Math.round(1195 * sy),
        width: Math.round(200 * sx),
        fontSize: proportional(19, width),
        fontWeight: 800,
        color: "#ffffff",
        fontFamily: FONT_SANS,
        textAlign: "center",
        visible: true,
        lineHeight: 1.1,
        uppercase: true,
      },
    },
  };
}

export function normalizeMilestoneLayout(
  value: any,
  width = 1080,
  height = 1350,
): MilestonePosterLayout {
  const defaults = createDefaultMilestoneLayout(width, height);
  const source =
    value && typeof value === "object" && value.elements
      ? value
      : value && typeof value === "object" && value.milestone_editor?.elements
        ? value.milestone_editor
        : null;

  if (!source) return defaults;

  const next = createDefaultMilestoneLayout(width, height);

  ELEMENT_KEYS.forEach((key) => {
    const candidate = source.elements?.[key];
    if (!candidate || typeof candidate !== "object") return;

    next.elements[key] = {
      ...next.elements[key],
      ...candidate,
      x: finiteNumber(candidate.x, next.elements[key].x),
      y: finiteNumber(candidate.y, next.elements[key].y),
      width: Math.max(40, finiteNumber(candidate.width, next.elements[key].width)),
      height:
        key === "logo"
          ? Math.max(40, finiteNumber(candidate.height, next.elements[key].height || next.elements[key].width))
          : candidate.height,
      fontSize: Math.max(6, finiteNumber(candidate.fontSize, next.elements[key].fontSize)),
      fontWeight: finiteNumber(candidate.fontWeight, next.elements[key].fontWeight),
      visible: candidate.visible !== false,
      opacity: clamp(finiteNumber(candidate.opacity, next.elements[key].opacity ?? 1), 0, 1),
      borderRadius: Math.max(0, finiteNumber(candidate.borderRadius, next.elements[key].borderRadius ?? 0)),
      objectFit: candidate.objectFit === "cover" ? "cover" : next.elements[key].objectFit,
      logoSource:
        candidate.logoSource === "custom" || candidate.logoSource === "none"
          ? candidate.logoSource
          : next.elements[key].logoSource,
      customLogoUrl:
        typeof candidate.customLogoUrl === "string"
          ? candidate.customLogoUrl
          : next.elements[key].customLogoUrl,
    };
  });

  return next;
}

function finiteNumber(value: unknown, fallback: number) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}



export type RenderMilestonePosterOptions = {
  width: number;
  height: number;
  backgroundUrl?: string | null;
  organizationName: string;
  organizationLogoUrl?: string | null;
  eventTitle: string;
  milestoneCount: number;
  publishedResultCount: number;
  rows: MilestoneLeaderboardRow[];
  layout?: MilestonePosterLayout | null;
  pixelRatio?: number;
};

/**
 * Render the milestone poster directly with the Canvas 2D API.
 *
 * We intentionally do not use html2canvas here. Tailwind v4 / modern browsers
 * can expose colors as lab()/oklch() in computed CSS, which html2canvas 1.4.1
 * cannot parse reliably. Rendering the poster directly also makes public PNG
 * downloads independent from the surrounding website CSS.
 */
export async function renderMilestonePosterToCanvas(
  options: RenderMilestonePosterOptions,
): Promise<HTMLCanvasElement> {
  const {
    width,
    height,
    backgroundUrl,
    organizationName,
    organizationLogoUrl,
    eventTitle,
    milestoneCount,
    publishedResultCount,
    rows,
    layout,
    pixelRatio = 2,
  } = options;

  if (typeof document === "undefined") {
    throw new Error("Poster download is available only in the browser.");
  }

  if ("fonts" in document) {
    try {
      await (document as any).fonts.ready;
    } catch {}
  }

  const safeRatio = Math.max(1, Math.min(4, Number(pixelRatio) || 2));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * safeRatio));
  canvas.height = Math.max(1, Math.round(height * safeRatio));

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Unable to create poster canvas.");

  ctx.scale(safeRatio, safeRatio);
  ctx.clearRect(0, 0, width, height);

  if (backgroundUrl) {
    const background = await loadPosterImage(backgroundUrl);
    drawImageCover(ctx, background, 0, 0, width, height);
  } else {
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "#3b0b4f");
    gradient.addColorStop(0.55, "#9b0f73");
    gradient.addColorStop(1, "#1f0635");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  const normalized = normalizeMilestoneLayout(layout, width, height);
  const visibleRows = rows.slice(0, 9);

  // Logo
  const logoLayer = normalized.elements.logo;
  const logoUrl =
    logoLayer.logoSource === "none"
      ? null
      : logoLayer.logoSource === "custom"
        ? logoLayer.customLogoUrl || null
        : organizationLogoUrl || null;

  if (logoLayer.visible && logoUrl) {
    const logo = await loadPosterImage(logoUrl);
    const logoWidth = logoLayer.width;
    const logoHeight = logoLayer.height || logoLayer.width;

    ctx.save();
    ctx.globalAlpha = clamp(logoLayer.opacity ?? 1, 0, 1);
    roundedRectPath(
      ctx,
      logoLayer.x,
      logoLayer.y,
      logoWidth,
      logoHeight,
      logoLayer.borderRadius ?? 0,
    );
    ctx.clip();

    if (logoLayer.objectFit === "cover") {
      drawImageCover(ctx, logo, logoLayer.x, logoLayer.y, logoWidth, logoHeight);
    } else {
      drawImageContain(ctx, logo, logoLayer.x, logoLayer.y, logoWidth, logoHeight);
    }
    ctx.restore();
  }

  drawLayerText(ctx, normalized.elements.eyebrow, "Official Team Points Update");
  drawLayerText(ctx, normalized.elements.organization, organizationName);
  drawLayerText(ctx, normalized.elements.afterLabel, "After");
  drawLayerText(ctx, normalized.elements.milestoneNumber, String(milestoneCount));

  const leaderboard = normalized.elements.leaderboard;
  if (leaderboard.visible) {
    ctx.save();
    ctx.fillStyle = leaderboard.color || "#ffffff";
    ctx.textBaseline = "top";

    if (visibleRows.length === 0) {
      applyCanvasFont(ctx, leaderboard);
      ctx.globalAlpha = 0.7;
      ctx.textAlign = "left";
      ctx.fillText("No points available", leaderboard.x, leaderboard.y);
    } else {
      const rankSize = leaderboard.rankFontSize ?? Math.max(14, leaderboard.fontSize * 0.52);
      const nameSize = leaderboard.nameFontSize ?? leaderboard.fontSize;
      const pointsSize = leaderboard.pointsFontSize ?? leaderboard.fontSize;
      const rowGap = leaderboard.rowGap ?? 14;
      const rowHeight = Math.max(rankSize, nameSize, pointsSize) + rowGap;
      const showRanks = leaderboard.showRanks !== false;
      const rankColumn = showRanks ? Math.max(42, proportional(58, width)) : 0;
      const colGap = proportional(16, width);
      const pointsWidth = Math.max(proportional(120, width), pointsSize * 2.2);
      const nameX = leaderboard.x + rankColumn + (showRanks ? colGap : 0);
      const pointsX = leaderboard.x + leaderboard.width;
      const nameMaxWidth = Math.max(
        20,
        leaderboard.width - rankColumn - pointsWidth - colGap * (showRanks ? 2 : 1),
      );

      visibleRows.forEach((row, index) => {
        const y = leaderboard.y + index * rowHeight;

        if (showRanks) {
          ctx.save();
          ctx.font = `${leaderboard.fontWeight || 800} ${rankSize}px ${leaderboard.fontFamily || FONT_SANS}`;
          ctx.globalAlpha = 0.7;
          ctx.textAlign = "left";
          ctx.fillText(String(index + 1), leaderboard.x, y);
          ctx.restore();
        }

        ctx.save();
        ctx.font = `${leaderboard.fontWeight || 500} ${nameSize}px ${leaderboard.fontFamily || FONT_SANS}`;
        ctx.globalAlpha = 1;
        ctx.textAlign = "left";
        const name = fitTextToWidth(ctx, String(row.teamName || "-"), nameMaxWidth);
        ctx.fillText(name, nameX, y);
        ctx.restore();

        ctx.save();
        ctx.font = `900 ${pointsSize}px ${leaderboard.fontFamily || FONT_SANS}`;
        ctx.globalAlpha = 1;
        ctx.textAlign = "right";
        ctx.fillText(String(Number(row.points || 0)), pointsX, y);
        ctx.restore();
      });
    }
    ctx.restore();
  }

  drawLayerText(ctx, normalized.elements.footerLabel, "Championship Standings");
  drawLayerText(ctx, normalized.elements.eventTitle, eventTitle);
  drawLayerText(ctx, normalized.elements.resultsCount, `${publishedResultCount} Results`);

  return canvas;
}

function applyCanvasFont(
  ctx: CanvasRenderingContext2D,
  layer: MilestoneLayerStyle,
) {
  const italic = layer.italic ? "italic " : "";
  ctx.font = `${italic}${layer.fontWeight || 400} ${layer.fontSize}px ${layer.fontFamily || FONT_SANS}`;
}

function drawLayerText(
  ctx: CanvasRenderingContext2D,
  layer: MilestoneLayerStyle,
  rawText: string,
) {
  if (!layer.visible) return;

  const text = layer.uppercase ? rawText.toUpperCase() : rawText;
  const lineHeightPx = layer.fontSize * (layer.lineHeight ?? 1.1);

  ctx.save();
  applyCanvasFont(ctx, layer);
  ctx.fillStyle = layer.color || "#ffffff";
  ctx.textBaseline = "top";
  ctx.globalAlpha = clamp(layer.opacity ?? 1, 0, 1);
  ctx.textAlign = layer.textAlign || "left";

  const lines = wrapCanvasText(ctx, text, Math.max(20, layer.width));
  let x = layer.x;
  if (ctx.textAlign === "center") x += layer.width / 2;
  if (ctx.textAlign === "right") x += layer.width;

  lines.forEach((line, index) => {
    ctx.fillText(line, x, layer.y + index * lineHeightPx);
  });
  ctx.restore();
}

function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
) {
  const explicitLines = String(text || "").split(/\r?\n/);
  const result: string[] = [];

  explicitLines.forEach((sourceLine) => {
    const words = sourceLine.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      result.push("");
      return;
    }

    let line = "";
    words.forEach((word) => {
      const test = line ? `${line} ${word}` : word;
      if (line && ctx.measureText(test).width > maxWidth) {
        result.push(line);
        line = word;
      } else {
        line = test;
      }
    });
    if (line) result.push(line);
  });

  return result.length ? result : [""];
}

function fitTextToWidth(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  const ellipsis = "…";
  let next = text;
  while (next.length > 1 && ctx.measureText(`${next}${ellipsis}`).width > maxWidth) {
    next = next.slice(0, -1);
  }
  return `${next.replace(/\s+$/, "")}${ellipsis}`;
}

function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawImageCover(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const sourceWidth = width / scale;
  const sourceHeight = height / scale;
  const sourceX = (image.naturalWidth - sourceWidth) / 2;
  const sourceY = (image.naturalHeight - sourceHeight) / 2;
  ctx.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height);
}

function drawImageContain(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  ctx.drawImage(
    image,
    x + (width - drawWidth) / 2,
    y + (height - drawHeight) / 2,
    drawWidth,
    drawHeight,
  );
}

async function loadPosterImage(url: string): Promise<HTMLImageElement> {
  const source = String(url || "").trim();
  if (!source) throw new Error("Poster image URL is empty.");

  // Fetching to a blob first avoids tainting the export canvas when the remote
  // storage server allows CORS. Same-origin public template paths also work.
  let objectUrl: string | null = null;
  try {
    const response = await fetch(source, { cache: "no-store", mode: "cors" });
    if (!response.ok) throw new Error(`Image request failed (${response.status}).`);
    const blob = await response.blob();
    objectUrl = URL.createObjectURL(blob);
    return await loadImageElement(objectUrl);
  } catch (fetchError) {
    // Fallback for same-origin/data/blob URLs or browser-cached assets.
    try {
      return await loadImageElement(source, true);
    } catch {
      throw fetchError instanceof Error
        ? fetchError
        : new Error("Unable to load poster image.");
    }
  } finally {
    if (objectUrl) {
      // Revoking after the image has decoded is safe; the decoded bitmap stays available.
      URL.revokeObjectURL(objectUrl);
    }
  }
}

function loadImageElement(source: string, useCors = false) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    if (useCors && !source.startsWith("data:") && !source.startsWith("blob:")) {
      image.crossOrigin = "anonymous";
    }
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to load poster image."));
    image.src = source;
  });
}

type MilestonePosterCanvasProps = {
  width: number;
  height: number;
  backgroundUrl?: string | null;
  backgroundAlt?: string;
  organizationName: string;
  organizationLogoUrl?: string | null;
  eventTitle: string;
  milestoneCount: number;
  publishedResultCount: number;
  rows: MilestoneLeaderboardRow[];
  scale?: number;
  layout?: MilestonePosterLayout | null;
  editable?: boolean;
  selectedElement?: MilestoneElementKey | null;
  onSelectElement?: (key: MilestoneElementKey) => void;
  onLayoutChange?: (layout: MilestonePosterLayout) => void;
};

type DragState = {
  key: MilestoneElementKey;
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startX: number;
  startY: number;
};

export default function MilestonePosterCanvas({
  width,
  height,
  backgroundUrl,
  backgroundAlt = "Milestone poster template",
  organizationName,
  organizationLogoUrl,
  eventTitle,
  milestoneCount,
  publishedResultCount,
  rows,
  scale = 1,
  layout,
  editable = false,
  selectedElement = null,
  onSelectElement,
  onLayoutChange,
}: MilestonePosterCanvasProps) {
  const normalized = normalizeMilestoneLayout(layout, width, height);
  const dragRef = useRef<DragState | null>(null);
  const visibleRows = rows.slice(0, 9);

  function updateElement(
    key: MilestoneElementKey,
    patch: Partial<MilestoneLayerStyle>,
  ) {
    if (!onLayoutChange) return;

    onLayoutChange({
      ...normalized,
      elements: {
        ...normalized.elements,
        [key]: {
          ...normalized.elements[key],
          ...patch,
        },
      },
    });
  }

  function startDrag(
    event: PointerEvent<HTMLDivElement>,
    key: MilestoneElementKey,
  ) {
    if (!editable || !onLayoutChange) return;

    event.preventDefault();
    event.stopPropagation();
    onSelectElement?.(key);
    event.currentTarget.setPointerCapture(event.pointerId);

    const element = normalized.elements[key];
    dragRef.current = {
      key,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: element.x,
      startY: element.y,
    };
  }

  function moveDrag(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId || !editable) return;

    const dx = (event.clientX - drag.startClientX) / Math.max(scale, 0.001);
    const dy = (event.clientY - drag.startClientY) / Math.max(scale, 0.001);
    const layer = normalized.elements[drag.key];

    updateElement(drag.key, {
      x: clamp(drag.startX + dx, 0, Math.max(0, width - layer.width)),
      y: clamp(drag.startY + dy, 0, Math.max(0, height - 20)),
    });
  }

  function endDrag(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {}

    dragRef.current = null;
  }

  function layerProps(key: MilestoneElementKey) {
    const item = normalized.elements[key];
    const selected = editable && selectedElement === key;

    return {
      onPointerDown: (event: PointerEvent<HTMLDivElement>) => startDrag(event, key),
      onPointerMove: moveDrag,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
      onClick: (event: any) => {
        if (!editable) return;
        event.stopPropagation();
        onSelectElement?.(key);
      },
      style: {
        left: item.x,
        top: item.y,
        width: item.width,
        fontSize: item.fontSize,
        fontWeight: item.fontWeight,
        color: item.color,
        fontFamily: item.fontFamily,
        textAlign: item.textAlign,
        lineHeight: item.lineHeight ?? 1.1,
        letterSpacing: item.letterSpacing,
        fontStyle: item.italic ? "italic" : "normal",
        textTransform: item.uppercase ? "uppercase" : "none",
        cursor: editable ? "move" : "default",
        touchAction: editable ? "none" : "auto",
        outline: selected ? "3px solid #8b5cf6" : editable ? "1px dashed rgba(139,92,246,.7)" : "none",
        outlineOffset: selected ? 3 : 2,
        background: editable ? "rgba(255,255,255,.035)" : "transparent",
        borderRadius: editable ? 8 : 0,
        userSelect: "none" as const,
        zIndex: selected ? 30 : 10,
      },
      className: "absolute",
    };
  }

  const logoLayer = normalized.elements.logo;
  const logoUrl =
    logoLayer.logoSource === "none"
      ? null
      : logoLayer.logoSource === "custom"
        ? logoLayer.customLogoUrl || null
        : organizationLogoUrl || null;

  return (
    <div
      style={{ position: "relative", overflow: "hidden", backgroundColor: "#020617", width: width * scale, height: height * scale }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          overflow: "hidden",
          backgroundColor: "#020617",
          width,
          height,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
        onClick={() => editable && onSelectElement?.("leaderboard")}
      >
        {backgroundUrl ? (
          <img
            src={backgroundUrl}
            alt={backgroundAlt}
            crossOrigin="anonymous"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
            draggable={false}
          />
        ) : (
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, #3b0b4f 0%, #9b0f73 55%, #1f0635 100%)" }} />
        )}

        {logoLayer.visible && (
          <div
            {...layerProps("logo")}
            style={{
              ...layerProps("logo").style,
              height: logoLayer.height || logoLayer.width,
              overflow: "hidden",
              opacity: logoLayer.opacity ?? 1,
              borderRadius: logoLayer.borderRadius ?? 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="Organization logo"
                crossOrigin="anonymous"
                draggable={false}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: logoLayer.objectFit || "contain",
                  pointerEvents: "none",
                }}
              />
            ) : editable ? (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "2px dashed rgba(255,255,255,.45)",
                  color: "rgba(255,255,255,.75)",
                  fontFamily: FONT_SANS,
                  fontSize: Math.max(13, proportional(14, width)),
                  fontWeight: 800,
                  background: "rgba(15,23,42,.25)",
                }}
              >
                Logo
              </div>
            ) : null}
          </div>
        )}

        {normalized.elements.eyebrow.visible && (
          <div {...layerProps("eyebrow")}>Official Team Points Update</div>
        )}

        {normalized.elements.organization.visible && (
          <div {...layerProps("organization")}>{organizationName}</div>
        )}

        {normalized.elements.afterLabel.visible && (
          <div {...layerProps("afterLabel")}>After</div>
        )}

        {normalized.elements.milestoneNumber.visible && (
          <div {...layerProps("milestoneNumber")}>{milestoneCount}</div>
        )}

        {normalized.elements.leaderboard.visible && (
          <div {...layerProps("leaderboard")}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: normalized.elements.leaderboard.rowGap ?? 14,
                width: "100%",
              }}
            >
              {visibleRows.length === 0 ? (
                <div style={{ opacity: 0.7 }}>No points available</div>
              ) : (
                visibleRows.map((row, index) => {
                  const layer = normalized.elements.leaderboard;
                  return (
                    <div
                      key={row.teamId || row.teamName || index}
                      style={{
                        display: "grid",
                        gridTemplateColumns: layer.showRanks === false ? "1fr auto" : "58px 1fr auto",
                        alignItems: "center",
                        columnGap: 16,
                        width: "100%",
                      }}
                    >
                      {layer.showRanks !== false && (
                        <span
                          style={{
                            fontSize: layer.rankFontSize ?? Math.max(14, layer.fontSize * 0.52),
                            fontWeight: 800,
                            opacity: 0.7,
                            textAlign: "left",
                          }}
                        >
                          {index + 1}
                        </span>
                      )}
                      <span
                        style={{
                          minWidth: 0,
                          overflow: "hidden",
                          whiteSpace: "nowrap",
                          textOverflow: "ellipsis",
                          fontSize: layer.nameFontSize ?? layer.fontSize,
                          fontWeight: layer.fontWeight,
                        }}
                      >
                        {row.teamName}
                      </span>
                      <span
                        style={{
                          fontSize: layer.pointsFontSize ?? layer.fontSize,
                          fontWeight: 900,
                          textAlign: "right",
                        }}
                      >
                        {row.points}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {normalized.elements.footerLabel.visible && (
          <div {...layerProps("footerLabel")}>Championship Standings</div>
        )}

        {normalized.elements.eventTitle.visible && (
          <div {...layerProps("eventTitle")}>{eventTitle}</div>
        )}

        {normalized.elements.resultsCount.visible && (
          <div {...layerProps("resultsCount")}>{publishedResultCount} Results</div>
        )}
      </div>
    </div>
  );
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}
