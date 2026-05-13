/** Pure helpers for points rules (same semantics as main app `src/server/utils/pointsPure.ts`). */

export function localDayKey(d: Date): string {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, "0");
  const day = String(x.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function countConsecutiveLoginStreakDays(
  todayStart: Date,
  loginDayKeys: ReadonlySet<string>,
): number {
  let streak = 0;
  for (let offset = 0; offset < 365; offset++) {
    const day = new Date(todayStart);
    day.setDate(day.getDate() - offset);
    day.setHours(0, 0, 0, 0);
    if (!loginDayKeys.has(localDayKey(day))) break;
    streak++;
  }
  return streak;
}
