/**
 * What may be uploaded (spec 4.7, 19.4). The administrator will change these limits in the
 * backend; until then they are the defaults. The server must repeat every check: the browser
 * can be bypassed.
 */
export const UPLOAD_EXTENSIONS = ["pdf", "jpg", "jpeg", "png"] as const;
export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_FILES = 5;

export type FileProblem = "type" | "size" | "empty";

/** Why a file cannot be accepted, or null when it is fine. Only the name and size are known here. */
export function checkFile(file: { name: string; size: number }): FileProblem | null {
  const dot = file.name.lastIndexOf(".");
  const extension = dot === -1 ? "" : file.name.slice(dot + 1).toLowerCase();
  if (!(UPLOAD_EXTENSIONS as readonly string[]).includes(extension)) return "type";
  if (file.size <= 0) return "empty";
  if (file.size > MAX_FILE_BYTES) return "size";
  return null;
}

/** Megabytes with one digit for showing a file size: 1572864 -> "1.5". */
export function megabytes(bytes: number): string {
  return (Math.round((bytes / (1024 * 1024)) * 10) / 10).toString();
}

/** A size in the unit that reads best; the unit word comes from the dictionary. */
export function sizeParts(bytes: number): { value: string; unit: "kb" | "mb" } {
  if (bytes >= 1024 * 1024) return { value: megabytes(bytes), unit: "mb" };
  return { value: String(Math.max(1, Math.round(bytes / 1024))), unit: "kb" };
}
