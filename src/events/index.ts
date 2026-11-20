import {
  loginEventHandler,
  passwordChangedEventHandler,
  passwordResetEmailEventHandler,
  registerAuthEventHandlers,
  sendVerificationEmailEventHandler,
} from "./handlers/auth.events.handler";

export function registerEventHandlers(): void {
  registerAuthEventHandlers();
  sendVerificationEmailEventHandler();
  loginEventHandler();
  passwordResetEmailEventHandler();
  passwordChangedEventHandler();
}
