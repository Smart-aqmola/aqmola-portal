/**
 * The next free number of the year with this prefix: "DEMO-POK" gives DEMO-POK-2026-00001, then
 * DEMO-POK-2026-00002, ... Numbers of other prefixes and other years are not counted.
 */
export function nextYearNumber(
  prefix: string,
  existing: readonly (string | undefined)[],
  now: Date,
): string {
  const start = `${prefix}-${now.getUTCFullYear()}-`;
  const highest = existing.reduce<number>((max, number) => {
    if (!number?.startsWith(start)) return max;
    return Math.max(max, Number(number.slice(start.length)));
  }, 0);
  return `${start}${String(highest + 1).padStart(5, "0")}`;
}
