export interface UserRegisteredEventPayload {
  userId: string;
  email: string;
  firstName: string | null;
}
export interface SendVerificationEmailEventPayload {
  userId: string;
  email: string;
  firstName: string | null;
}

export interface UserLoggedInEventPayload {
  email: string;
  firstName: string | null;
}

export interface SendPasswordResetEmailEventPayload {
  email: string;
  firstName: string | null;
  token: string;
}

export interface PasswordChangedEventPayload {
  email: string;
  firstName: string | null;
}