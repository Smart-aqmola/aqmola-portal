import type { EventRepository } from "../domain/repository";
import { StubEventRepository } from "./stub-event-repository";

let repository: EventRepository | undefined;

/** The one place that decides which implementation of the poster the app uses. */
export function getEventRepository(): EventRepository {
  repository ??= new StubEventRepository();
  return repository;
}
