/** "12 345 ₸": whole tenge with a no-break space, so a sum never splits across two lines. */
export function formatMoney(amount: number): string {
  const sign = amount < 0 ? "-" : "";
  const digits = String(Math.round(Math.abs(amount))).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${sign}${digits} ₸`;
}
