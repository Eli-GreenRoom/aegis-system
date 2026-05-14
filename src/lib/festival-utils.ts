export type FestivalDateRange = { startDate: string; endDate: string };

export function festivalDates(festival: FestivalDateRange): string[] {
  const dates: string[] = [];
  const start = new Date(`${festival.startDate}T00:00:00Z`);
  const end = new Date(`${festival.endDate}T00:00:00Z`);
  const cur = new Date(start);
  while (cur <= end) {
    dates.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return dates;
}

export function dateToDayLabel(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00Z`);
  return d.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });
}
