export const statuses = ["submitted", "in_progress", "done", "rejected"] as const;
export type ApplicationStatus = (typeof statuses)[number];

/** An application never goes back to "submitted". */
export type NextStatus = Exclude<ApplicationStatus, "submitted">;

const next: Record<ApplicationStatus, readonly NextStatus[]> = {
  submitted: ["in_progress", "rejected"],
  in_progress: ["done", "rejected"],
  done: [],
  rejected: [],
};

export function allowedNextStatuses(status: ApplicationStatus): readonly NextStatus[] {
  return next[status];
}

export function canTransition(from: ApplicationStatus, to: ApplicationStatus): boolean {
  return (next[from] as readonly ApplicationStatus[]).includes(to);
}

export function isFinal(status: ApplicationStatus): boolean {
  return next[status].length === 0;
}

export function isStatus(value: unknown): value is ApplicationStatus {
  return typeof value === "string" && (statuses as readonly string[]).includes(value);
}
