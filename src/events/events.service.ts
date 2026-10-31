import { eventBus } from "./event-bus";
import { AuthEvents } from "./events.constants";
import { UserRegisteredEventPayload } from "./interface/auth.events.interface";

export class EventsService {
  emitUserRegistered(payload: UserRegisteredEventPayload): void {
    eventBus.emit(AuthEvents.USER_REGISTERED, payload);
  }
}
