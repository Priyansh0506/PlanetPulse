/**
 * DP3 — When does a "week" start, and how is mid-week progress shown?
 *
 * Decision: ISO week, Monday 00:00 → Sunday 23:59:59, local time.
 * A Sunday-start week splits the weekend across two weeks, and weekends are
 * exactly when discretionary travel/food emissions spike — splitting them
 * hides the pattern the app exists to show. Mid-week progress is shown as
 * "Day X of 7" plus an expected-pace fraction, not just a raw percentage,
 * so a user on day 3 isn't alarmed at being under 50%.
 */

export function getWeekStart(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday ... 6 = Saturday
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diffToMonday);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getWeekEnd(date = new Date()) {
  const start = getWeekStart(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

export function getDayOfWeek(date = new Date()) {
  const day = date.getDay();
  return day === 0 ? 7 : day; // Monday=1 ... Sunday=7
}

export function getWeekProgressLabel(date = new Date()) {
  return `Day ${getDayOfWeek(date)} of 7`;
}

// Fraction of the week elapsed — used to judge pace, not as a hard rule.
export function getExpectedPaceFraction(date = new Date()) {
  return getDayOfWeek(date) / 7;
}
