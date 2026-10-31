import { registerAuthEventHandlers } from "./handlers/auth.events.handler";

export function registerEventHandlers(): void {
  registerAuthEventHandlers();
}
