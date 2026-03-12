export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/\bw\/\b/g, " ")
    .replace(/\bwith\b/g, " ")
    .replace(/\bfeat\.?\b/g, " ")
    .replace(/\bft\.?\b/g, " ")
    .replace(/\bpresented by\b.*$/i, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Format a date string (YYYY-MM-DD) with a relative label for nearby dates.
 * Examples: "Tonight — Thursday, March 12", "Tomorrow — Friday, March 13",
 *           "This Saturday — March 14", "Monday, March 23"
 */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffDays = Math.round(
    (date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  const fullDate = date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  if (diffDays === 0) return `Tonight — ${fullDate}`;
  if (diffDays === 1) return `Tomorrow — ${fullDate}`;
  if (diffDays >= 2 && diffDays <= 6) {
    const weekday = date.toLocaleDateString("en-US", { weekday: "long" });
    const monthDay = date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
    });
    return `This ${weekday} — ${monthDay}`;
  }

  return fullDate;
}

export function formatTime(timeStr: string | null): string {
  if (!timeStr) return "";
  const [hours, minutes] = timeStr.split(":");
  const h = parseInt(hours);
  const ampm = h >= 12 ? "PM" : "AM";
  const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${displayHour}:${minutes} ${ampm}`;
}
