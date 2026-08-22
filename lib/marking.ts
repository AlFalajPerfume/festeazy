/* eslint-disable */

export type GradeRules = {
  aPlusMin: number;
  aMin: number;
  bMin: number;
  cMin: number;
};

export const DEFAULT_GRADE_RULES: GradeRules = {
  aPlusMin: 80,
  aMin: 70,
  bMin: 60,
  cMin: 50,
};

export type PositionPointRules = Record<number, number>;

export const DEFAULT_INDIVIDUAL_POSITION_POINTS: PositionPointRules = {
  1: 10,
  2: 5,
  3: 3,
  4: 1,
};

export const DEFAULT_GROUP_POSITION_POINTS: PositionPointRules = {
  1: 20,
  2: 15,
  3: 10,
  4: 5,
};

// Kept for compatibility with any older imports.
export const DEFAULT_POSITION_POINTS = DEFAULT_INDIVIDUAL_POSITION_POINTS;

export function getGrade(
  mark: number,
  totalMarks = 100,
  rules: GradeRules = DEFAULT_GRADE_RULES,
) {
  const percentage = totalMarks > 0 ? (Number(mark || 0) / totalMarks) * 100 : 0;

  if (percentage >= Number(rules.aPlusMin)) return "A+";
  if (percentage >= Number(rules.aMin)) return "A";
  if (percentage >= Number(rules.bMin)) return "B";
  if (percentage >= Number(rules.cMin)) return "C";
  return "D";
}

export function getPositionPoints(
  position: number | null,
  rules: PositionPointRules = DEFAULT_INDIVIDUAL_POSITION_POINTS,
) {
  if (!position) return 0;
  return Number(rules[position] || 0);
}

export function competitionRanks<T>(
  rows: T[],
  getMark: (row: T) => number,
) {
  const sorted = [...rows].sort((a, b) => getMark(b) - getMark(a));

  let previousMark: number | null = null;
  let densePosition = 0;

  return sorted.map((row) => {
    const mark = Number(getMark(row).toFixed(2));

    if (previousMark === null || mark !== previousMark) {
      densePosition += 1;
    }

    previousMark = mark;

    return { row, position: densePosition };
  });
}

export function getPositionLabel(position: number | null) {
  if (position === 1) return "First Place";
  if (position === 2) return "Second Place";
  if (position === 3) return "Third Place";
  if (position === 4) return "Fourth Place";
  if (!position) return "No Position";
  return `Rank ${position}`;
}

export function formatMark(value: number) {
  return Number(value || 0).toFixed(2).replace(/\.00$/, "");
}
