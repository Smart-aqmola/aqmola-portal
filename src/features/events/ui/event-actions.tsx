"use client";

import { downloadText } from "@/shared/lib/download-text";
import { Button } from "@/shared/ui/button/button";
import { useToast } from "@/shared/ui/toast/toast-provider";
import { toIcs } from "../domain/events";
import styles from "./events.module.css";

type EventActionsProps = {
  event: { id: string; slug: string; startsAt: string; durationMinutes: number };
  text: { title: string; place: string; description: string };
  labels: { addToCalendar: string; tickets: string; ticketsNote: string };
};

/** "Add to calendar" gives a calendar file; tickets are not sold in the demo, and it says so. */
export function EventActions({ event, text, labels }: EventActionsProps) {
  const toast = useToast();
  return (
    <div className={styles.actions}>
      <Button
        onClick={() =>
          downloadText(
            `${event.slug}.ics`,
            toIcs(event, text, new Date()),
            "text/calendar;charset=utf-8",
          )
        }
      >
        {labels.addToCalendar}
      </Button>
      <Button variant="light" onClick={() => toast.show(labels.ticketsNote)}>
        {labels.tickets}
      </Button>
    </div>
  );
}
