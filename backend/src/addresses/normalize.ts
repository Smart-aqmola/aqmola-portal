export const normalizeAddress = (value: string) =>
  value.normalize("NFKC").trim().toLowerCase().replaceAll("ё", "е").replace(/\s+/g, " ");
