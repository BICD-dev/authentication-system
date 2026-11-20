import { eventBus } from "./event-bus";
import { AuthEvents } from "./events.constants";
import {
  PasswordChangedEventPayload,
  SendPasswordResetEmailEventPayload,
  SendVerificationEmailEventPayload,
  UserLoggedInEventPayload,
  UserRegisteredEventPayload,
} from "./interface/auth.events.interface";

export class EventsService {
  emitUserRegistered(payload: UserRegisteredEventPayload): void {
    eventBus.emit(AuthEvents.USER_REGISTERED, payload);
  }
  emitUserLoggedIn(payload: UserLoggedInEventPayload): void {
    eventBus.emit(AuthEvents.USER_LOGGED_IN, payload);
  }
  emitSendVerificationEmail(payload: SendVerificationEmailEventPayload): void {
    eventBus.emit(AuthEvents.SEND_VERIFICATION_EMAIL, payload);
  }
  emitSendPasswordResetEmail(payload: SendPasswordResetEmailEventPayload): void {
    eventBus.emit(AuthEvents.SEND_PASSWORD_RESET_EMAIL, payload);
  }
  emitPasswordChanged(payload: PasswordChangedEventPayload): void {
    eventBus.emit(AuthEvents.PASSWORD_CHANGED, payload);
  }
}
