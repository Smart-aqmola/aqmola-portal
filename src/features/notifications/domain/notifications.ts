import type { Appeal } from "@/features/appeals/domain/appeal";
import type { Property } from "@/features/account/domain/property";
import type { Application } from "@/features/applications/domain/application";
import type { NotifyBy, ContractApplication } from "@/features/contracts/domain/contract";
import type { Meter, MeterResource } from "@/features/meters/domain/meter";
import type { MeterRequest } from "@/features/meters/domain/meter-request";
import type { Reading } from "@/features/meters/domain/reading";
import type { Payment } from "@/features/billing/domain/payment";

/** The events a person is told about, grouped as in the specification (16.1). */
export const notificationEvents = [
  "registered",
  "property_added",
  "property_confirmed",
  "property_rejected",
  "application_submitted",
  "application_status",
  "contract_submitted",
  "contract_returned",
  "contract_to_sign",
  "contract_concluded",
  "contract_status",
  "reading_due",
  "reading_registered",
  "reading_rejected",
  "reading_status",
  "verification_soon",
  "meter_request_registered",
  "meter_request_scheduled",
  "meter_request_rescheduled",
  "meter_request_done",
  "meter_request_status",
  "payment_processing",
  "payment_paid",
  "payment_status",
  "appeal_registered",
  "appeal_question",
  "appeal_answer",
  "appeal_status",
] as const;
export type NotificationEvent = (typeof notificationEvents)[number];

/** The dictionary that names a status, for the events that carry one. */
export type StatusScope =
  "application" | "contract" | "reading" | "meterRequest" | "payment" | "appeal";

/** What the text of a notification may mention; the words come from the dictionary at show time. */
export type NotificationRefs = {
  scope?: StatusScope;
  status?: string;
  resource?: MeterResource;
  serial?: string;
  /** `YYYY-MM-DD`. */
  date?: string;
  slot?: { date: string; time: "morning" | "day" | "evening" };
};

export type AppNotification = {
  /** The same for the same event every time, so what was read stays read. */
  id: string;
  event: NotificationEvent;
  /** ISO date and time the event happened (spec 16.3). */
  at: string;
  number?: string;
  address?: string;
  title?: string;
  note?: string;
  assignee?: string;
  refs: NotificationRefs;
  /** Where the event leads, inside the language: "/contracts/<id>". */
  path: string;
  channel: NotifyBy;
  /** The result of delivery (spec 16.3); the demo has no mail or SMS service, so it always arrives. */
  delivery: "delivered";
};

export type NotificationSources = {
  profile?: { createdAt: string };
  properties: readonly Property[];
  applications: readonly Application[];
  contracts: readonly ContractApplication[];
  meters: readonly Meter[];
  readings: readonly Reading[];
  requests: readonly MeterRequest[];
  payments: readonly Payment[];
  appeals: readonly Appeal[];
};

/** From this day of the month a reading is due if none was sent (spec 16.1, 7.5). */
export const READING_DUE_DAY = 20;
/** The days before the end of a verification when a notice appears (spec 16.1). */
export const VERIFICATION_NOTICE_DAYS = 60;
const DAY_MS = 24 * 60 * 60 * 1000;

const make = (
  event: NotificationEvent,
  id: string,
  at: string,
  path: string,
  extra: Partial<
    Omit<AppNotification, "event" | "id" | "at" | "path" | "refs" | "channel" | "delivery">
  > & {
    refs?: NotificationRefs;
    channel?: NotifyBy;
  } = {},
): AppNotification => {
  const { refs, channel, ...rest } = extra;
  return {
    id,
    event,
    at,
    path,
    refs: refs ?? {},
    channel: channel ?? "cabinet",
    delivery: "delivered",
    ...rest,
  };
};

const place = (property: Pick<Property, "locality" | "street" | "house">) =>
  [property.locality, property.street, property.house].filter(Boolean).join(", ");

function fromProperties(properties: readonly Property[]): AppNotification[] {
  return properties.flatMap((property) => {
    const path = `/properties/${property.id}`;
    const address = place(property);
    const items = [
      make("property_added", `property:${property.id}:added`, property.createdAt, path, {
        address,
      }),
    ];
    const { status, at, note } = property.verification;
    if (status === "confirmed" && at) {
      items.push(
        make("property_confirmed", `property:${property.id}:confirmed`, at, path, { address }),
      );
    }
    if (status === "rejected" && at) {
      items.push(
        make("property_rejected", `property:${property.id}:rejected`, at, path, { address, note }),
      );
    }
    return items;
  });
}

function fromApplications(applications: readonly Application[]): AppNotification[] {
  return applications.flatMap((app) =>
    app.history.map((entry, index) =>
      index === 0
        ? make(
            "application_submitted",
            `application:${app.number}:0`,
            entry.at,
            `/applications/${app.number}`,
            {
              number: app.number,
              title: app.serviceTitle,
            },
          )
        : make(
            "application_status",
            `application:${app.number}:${index}`,
            entry.at,
            `/applications/${app.number}`,
            {
              number: app.number,
              note: entry.note,
              refs: { scope: "application", status: entry.status },
            },
          ),
    ),
  );
}

/** Statuses that come from the person's own action: they need no notice. */
const OWN_CONTRACT_STATUSES = ["draft", "not_sent", "awaiting_provider_signature"];

function fromContracts(contracts: readonly ContractApplication[]): AppNotification[] {
  return contracts.flatMap((app) =>
    app.history
      .map((entry, index) => ({ entry, index }))
      .filter(({ entry }) => !OWN_CONTRACT_STATUSES.includes(entry.status))
      .map(({ entry, index }) => {
        const id = `contract:${app.id}:${index}`;
        const path = `/contracts/${app.id}`;
        const base = { number: app.number, title: app.serviceTitle, channel: app.notifyBy };
        switch (entry.status) {
          case "registered":
            return make("contract_submitted", id, entry.at, path, base);
          case "returned_for_revision":
            return make("contract_returned", id, entry.at, path, { ...base, note: entry.note });
          case "awaiting_applicant_signature":
            return make("contract_to_sign", id, entry.at, path, base);
          case "concluded":
            return make("contract_concluded", id, entry.at, path, base);
          default:
            return make("contract_status", id, entry.at, path, {
              ...base,
              note: entry.note,
              refs: { scope: "contract", status: entry.status },
            });
        }
      }),
  );
}

function fromReadings(readings: readonly Reading[]): AppNotification[] {
  return readings.flatMap((reading) =>
    reading.history
      .map((entry, index) => ({ entry, index }))
      .filter(({ entry }) => entry.status !== "sent" && entry.status !== "draft")
      .map(({ entry, index }) => {
        const id = `reading:${reading.id}:${index}`;
        const base = { number: reading.number, note: entry.note };
        if (entry.status === "registered") {
          return make("reading_registered", id, entry.at, "/meters/history", base);
        }
        if (entry.status === "rejected") {
          return make("reading_rejected", id, entry.at, "/meters/history", base);
        }
        return make("reading_status", id, entry.at, "/meters/history", {
          ...base,
          refs: { scope: "reading", status: entry.status },
        });
      }),
  );
}

function fromRequests(requests: readonly MeterRequest[]): AppNotification[] {
  return requests.flatMap((request) => {
    const lastScheduled = request.history.map((entry) => entry.status).lastIndexOf("scheduled");
    let scheduledSoFar = 0;
    return request.history.map((entry, index) => {
      const id = `meter-request:${request.id}:${index}`;
      const path = `/meters/requests/${request.id}`;
      const base = { number: request.number, title: request.kind, note: entry.note };
      switch (entry.status) {
        case "registered":
          return make("meter_request_registered", id, entry.at, path, base);
        case "scheduled": {
          scheduledSoFar += 1;
          return make(
            scheduledSoFar === 1 ? "meter_request_scheduled" : "meter_request_rescheduled",
            id,
            entry.at,
            path,
            {
              ...base,
              assignee: request.assignee,
              refs: index === lastScheduled && request.scheduled ? { slot: request.scheduled } : {},
            },
          );
        }
        case "done":
          return make("meter_request_done", id, entry.at, path, base);
        default:
          return make("meter_request_status", id, entry.at, path, {
            ...base,
            refs: { scope: "meterRequest", status: entry.status },
          });
      }
    });
  });
}

function fromPayments(payments: readonly Payment[]): AppNotification[] {
  return payments.flatMap((payment) =>
    payment.history
      .map((entry, index) => ({ entry, index }))
      .filter(({ entry }) => !["awaiting_payment", "initiated", "cancelled"].includes(entry.status))
      .map(({ entry, index }) => {
        const id = `payment:${payment.id}:${index}`;
        const path = `/billing/payments/${payment.id}`;
        const base = { number: payment.number };
        if (entry.status === "processing")
          return make("payment_processing", id, entry.at, path, base);
        if (entry.status === "paid") return make("payment_paid", id, entry.at, path, base);
        return make("payment_status", id, entry.at, path, {
          ...base,
          refs: { scope: "payment", status: entry.status },
        });
      }),
  );
}

function fromAppeals(appeals: readonly Appeal[]): AppNotification[] {
  return appeals.flatMap((appeal) =>
    appeal.events
      .map((event, index) => ({ event, index }))
      .filter(
        ({ event }) =>
          event.actor === "executor" && event.status && event.status !== "sent_to_executor",
      )
      .map(({ event, index }) => {
        const id = `appeal:${appeal.id}:${index}`;
        const path = `/appeals/${appeal.id}`;
        const base = { number: appeal.number, note: event.text };
        switch (event.status) {
          case "registered":
            return make("appeal_registered", id, event.at, path, base);
          case "info_required":
            return make("appeal_question", id, event.at, path, base);
          case "answer_ready":
          case "executed":
            return event.text
              ? make("appeal_answer", id, event.at, path, base)
              : make("appeal_status", id, event.at, path, {
                  ...base,
                  refs: { scope: "appeal", status: event.status },
                });
          default:
            return make("appeal_status", id, event.at, path, {
              ...base,
              refs: { scope: "appeal", status: event.status },
            });
        }
      }),
  );
}

/** Reminders that no one did anything to cause: a reading is due, a verification is near (spec 16.1). */
function reminders(
  meters: readonly Meter[],
  readings: readonly Reading[],
  now: Date,
): AppNotification[] {
  const items: AppNotification[] = [];
  const month = now.toISOString().slice(0, 7);
  const today = now.toISOString().slice(0, 10);
  for (const meter of meters) {
    if (meter.state !== "working" && meter.state !== "faulty") continue;
    const sentThisMonth = readings.some(
      (reading) =>
        reading.meterId === meter.id &&
        (reading.readingDate.startsWith(month) || reading.submittedAt.startsWith(month)),
    );
    if (now.getUTCDate() >= READING_DUE_DAY && !sentThisMonth) {
      items.push(
        make(
          "reading_due",
          `reading-due:${meter.id}:${month}`,
          `${month}-${READING_DUE_DAY}T06:00:00.000Z`,
          `/meters/submit?meter=${meter.id}`,
          {
            refs: { resource: meter.resource, serial: meter.serial },
          },
        ),
      );
    }
    if (meter.nextVerificationAt) {
      const left = (Date.parse(meter.nextVerificationAt) - Date.parse(today)) / DAY_MS;
      if (left >= 0 && left <= VERIFICATION_NOTICE_DAYS) {
        const at = new Date(
          Date.parse(meter.nextVerificationAt) - VERIFICATION_NOTICE_DAYS * DAY_MS,
        );
        items.push(
          make(
            "verification_soon",
            `verification:${meter.id}:${meter.nextVerificationAt}`,
            at.toISOString(),
            `/meters/order/verification?meter=${meter.id}`,
            {
              refs: {
                resource: meter.resource,
                serial: meter.serial,
                date: meter.nextVerificationAt,
              },
            },
          ),
        );
      }
    }
  }
  return items;
}

/**
 * Everything the person should have been told, newest first. The portal keeps no separate list:
 * each notice is read off the history of the thing it is about, so it can never disagree with it
 * (spec 16.1, 16.4). With a backend the same list comes from the notification service.
 */
export function buildNotifications(sources: NotificationSources, now: Date): AppNotification[] {
  const all = [
    ...(sources.profile
      ? [make("registered", "registered", sources.profile.createdAt, "/properties")]
      : []),
    ...fromProperties(sources.properties),
    ...fromApplications(sources.applications),
    ...fromContracts(sources.contracts),
    ...fromReadings(sources.readings),
    ...fromRequests(sources.requests),
    ...fromPayments(sources.payments),
    ...fromAppeals(sources.appeals),
    ...reminders(sources.meters, sources.readings, now),
  ];
  // Reversed first, so that of two notices of the same moment the later step comes first.
  return all.reverse().sort((a, b) => b.at.localeCompare(a.at));
}

/** The notices newer than the moment the person last marked everything as read (spec 16.4). */
export function unreadOf(
  notifications: readonly AppNotification[],
  readUpTo: string | undefined,
): AppNotification[] {
  return readUpTo ? notifications.filter((item) => item.at > readUpTo) : [...notifications];
}
