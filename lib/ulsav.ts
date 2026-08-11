export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function formatDateRange(startDate?: string | null, endDate?: string | null) {
  if (!startDate && !endDate) return "Date not set";
  if (startDate && !endDate) return startDate;
  if (!startDate && endDate) return endDate;
  if (startDate === endDate) return startDate || "Date not set";
  return `${startDate} to ${endDate}`;
}
