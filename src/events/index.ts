import { loginEventHandler, registerAuthEventHandlers, sendVerificationEmailEventHandler } from "./handlers/auth.events.handler";

export function registerEventHandlers(): void {
  registerAuthEventHandlers();
  sendVerificationEmailEventHandler();
  loginEventHandler();
}
