/**
 * Kazakhstan mobile numbers: country code +7, then ten digits that start with 7 (70x, 77x, ...).
 * Accepts "+7 701 123 45 67", "8 (701) 123-45-67" or "701 123 45 67" and returns "+77011234567".
 */
export function normalizePhone(input: string): string | null {
  let digits = input.replace(/\D/g, "");
  if (digits.length === 11 && (digits.startsWith("7") || digits.startsWith("8"))) {
    digits = digits.slice(1);
  }
  if (!/^7\d{9}$/.test(digits)) return null;
  return `+7${digits}`;
}

/** "+77011234567" -> "+7 701 ••• •• 67": enough to recognise the number, not to copy it. */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length !== 11) return "••••";
  return `+7 ${digits.slice(1, 4)} ••• •• ${digits.slice(9)}`;
}

/** "+77011234567" -> "+7 701 123 45 67" for showing in a field. */
export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length !== 11) return phone;
  return `+7 ${digits.slice(1, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 9)} ${digits.slice(9)}`;
}
