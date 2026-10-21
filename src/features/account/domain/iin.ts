/**
 * Checks only the shape of an IIN: twelve digits that start with a possible birth date (YYMMDD).
 * Whether the person exists is checked by the state service (spec 2.3), which the backend calls.
 */
export function isValidIinShape(value: string): boolean {
  if (!/^\d{12}$/.test(value)) return false;
  const month = Number(value.slice(2, 4));
  const day = Number(value.slice(4, 6));
  return month >= 1 && month <= 12 && day >= 1 && day <= 31;
}

/** "900101300123" -> "900101••••23": the full number is shown only where it is really needed. */
export function maskIin(iin: string): string {
  if (!/^\d{12}$/.test(iin)) return "••••••••••••";
  return `${iin.slice(0, 6)}••••${iin.slice(10)}`;
}
