# 🔐 Authentication System (Backend)

A comprehensive authentication system built with **Node.js**, **Express**, and **TypeScript**, designed to explore and implement multiple authentication strategies within a single backend architecture.

---

## 📌 Overview

This project serves as a centralized authentication service that demonstrates and compares different authentication mechanisms commonly used in modern web applications.

The goal is to build a **robust, scalable, and extensible auth system** that can support multiple strategies while maintaining clean architecture and security best practices.

---

## 🚀 Features

### Implemented

- User registration and login with email + password
- JWT-based authentication with configurable lifetime
- Refresh-token sessions with rotation and reuse detection
- Profile endpoint with cookie or Bearer authentication
- Logout with refresh-session revocation
- Forgot/reset password with single-use email links
- Email verification with OTP
- Secure password hashing with bcrypt
- Input validation and structured error handling
- Provider-based email delivery (Gmail / Brevo)
- Cache abstraction (memory / Redis)

### In progress / planned

- OAuth 2.0 (Google, GitHub, Microsoft, Apple)
- Role-based access control (RBAC)
- API key authentication
- Multi-factor authentication (MFA)

---

## 🧠 Authentication Strategies Implemented / Planned

- **JWT (JSON Web Tokens)** — implemented
- **Session-based authentication** — implemented (refresh-token sessions)
- **OAuth 2.0 (Google, GitHub, Microsoft, Apple)** — planned
- **API Key authentication** — planned
- **Multi-factor authentication (MFA)** — planned

---

## 🏗️ Tech Stack

- **Node.js**
- **Express.js**
- **TypeScript**
- **SQLite** with **Prisma 7** and `better-sqlite3`
- **bcrypt** (password hashing)
- **jsonwebtoken** (JWT handling)
- **Redis** (optional cache provider)
- **Nodemailer** with Gmail or Brevo SMTP

---

## 📁 Project Structure

```text
src/
├── index.ts
├── auth/
│   ├── auth.controller.ts
│   ├── auth.route.ts
│   ├── auth.service.ts
│   ├── dto/
│   └── interface/
├── cache/
├── config/
├── constant/
├── dtos/
├── events/
├── generated/          # Prisma client (gitignored)
├── lib/
├── repositories/
├── service/
│   └── email/
├── session/
└── utils/
    ├── bcrypt/
    ├── jwt/
    ├── middleware/
    ├── cookies.ts
    └── time.ts
```

---

## ⚙️ Installation

```bash
# Clone the repository
git clone https://github.com/BICD-dev/authentication-system.git

# Navigate into the project
cd authentication-system

# Install dependencies
npm install
```

## 🔑 Environment Variables

Create a `.env` file in the root directory:

copy the content of `.env.example` into the newly created `.env`

## ▶️ Running the Application

```bash
# Development
npm run dev

# Build
npm run build

# Production
npm start
```

## 📦 Response Format

Every success and error response uses the same envelope:

```json
{
  "success": true,
  "statusCode": 201,
  "message": "Registration successful",
  "data": {}
}
```

Validation and application errors include optional field-level details:

```json
{
  "success": false,
  "statusCode": 400,
  "message": "email must be a valid email address",
  "errors": [
    {
      "field": "email",
      "message": "email must be a valid email address"
    }
  ]
}
```

`data` is omitted when there is no payload, and `errors` is omitted when there
are no structured error details.

## 🔐 Token & Session Model

Authentication uses a short-lived JWT access token and a long-lived opaque
refresh token.

| Token         | Lifetime                  | Storage                              |
| ------------- | ------------------------- | ------------------------------------ |
| Access token  | `JWT_EXPIRES_IN` (e.g. `2h`) | `access_token` httpOnly cookie, also returned in the login/refresh body |
| Refresh token | `JWT_REFRESH_EXPIRES_IN` (e.g. `7d`) | `refresh_token` httpOnly cookie |

- Refresh tokens are random 32-byte values. Only a SHA-256 hash is stored in the
  existing `Session` table; the raw token is never persisted.
- Each login creates one session row. The row stores the user, token hash,
  expiry, and optional request metadata (IP and user agent).
- `POST /api/auth/refresh` rotates the session: the old row is revoked and a new
  refresh token is issued. Reusing a revoked token is treated as theft and
  revokes every active session for that user.
- The login and refresh responses include `accessToken`, `tokenType`, `expiresIn`,
  and a safe user summary. The refresh token is only sent as a cookie.

### Protected routes

`GET /api/auth/profile` requires an access token from either:

- the `access_token` httpOnly cookie, or
- `Authorization: Bearer <accessToken>`.

The middleware verifies the JWT and attaches the authenticated user to
`req.user`. Account-state checks (missing, deleted, or inactive users) belong to
the application layer; the profile service rejects those accounts.

`POST /api/auth/logout` is idempotent: if a refresh-token cookie is present, the
matching session is revoked; both auth cookies are always cleared.

All user responses use a safe mapper that excludes the password hash and
internal fields. Emails are trimmed and lowercased before storage and lookup, so
login and OTP flows are case-insensitive.

### Password reset

`POST /api/auth/password/forgot` accepts an `email` and always returns the same
generic success response, whether or not an account exists. This prevents the
endpoint from being used to enumerate users.

When the email belongs to an account:

- a random 32-byte token is generated;
- only its SHA-256 hash is stored in the `MagicLink` table with
  `type = PASSWORD_RESET`;
- the link expires after `PASSWORD_RESET_TOKEN_TTL_MINUTES` (default `30`);
- any previous unused reset links for that account are invalidated;
- an email is sent to `${FRONTEND_URL}/reset-password?token=...`.

`POST /api/auth/password/reset` accepts `token` and `newPassword`. It rejects
missing, used, or expired tokens, consumes the token, updates the password and
`passwordChangedAt`, revokes every active session for that user, and sends a
"password changed" notification email.

Both endpoints use the shared `rateLimiters.strict` limiter: 5 requests per 15
minutes per IP. Because the same instance is attached to both routes, they
share one budget. See [Rate limiting](#rate-limiting) for the other tiers and
how to add per-email or per-token limits if they are needed later.

Limits are enforced by `express-rate-limit` through a thin wrapper
(`src/utils/middleware/rateLimit.middleware.ts`) that returns the standard
`429` error envelope and the `RateLimit-*` headers. The limiter currently uses
the in-memory store, which is per-process; a shared store (for example Redis)
is required before running more than one instance.

### Rate limiting

The middleware exports reusable tiers instead of one-off limiter functions:

| Tier       | Default                                             | Intended use                                          |
| ---------- | --------------------------------------------------- | ----------------------------------------------------- |
| `strict`   | 5 requests / 15 min                                 | login, signup, OTP verify, password reset             |
| `moderate` | 20 requests / 15 min                                | other write endpoints                                 |
| `lax`      | `RATE_LIMIT_MAX_REQUESTS` / `RATE_LIMIT_WINDOW_MS`  | general API traffic (defaults to 60 requests / min)   |

Ready-to-use, IP-based middlewares are available as `rateLimiters.strict`,
`rateLimiters.moderate`, and `rateLimiters.lax`:

```ts
router.post("/login", rateLimiters.strict, authenticationController.login);
router.get("/feed", rateLimiters.lax, feedController.list);
```

Use `rateLimit(tier, options)` when a route needs overrides, such as a custom
key generator, window, limit, or message:

```ts
const perEmail = rateLimit("strict", {
  keyGenerator: (req) => `email:${String(req.body?.email).trim().toLowerCase()}`,
});
```

A limiter instance keeps one counter per client across every route it is
attached to, so routes that need independent budgets should each create their
own instance with `rateLimit(tier)`.

### Browser clients: CORS, cookies, and CSRF

For a browser frontend:

1. Set `CORS_ALLOWED_ORIGINS` to the frontend origin(s). CORS runs with
   `credentials: true`, allows `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, and
   `OPTIONS` plus the `Content-Type`, `Authorization`, and `X-CSRF-Token`
   headers, and caches preflight results for `CORS_MAX_AGE_SECONDS` (default
   `600`). Requests from other origins get a `403` JSON error. In development,
   `CORS_ALLOW_ALL_ORIGINS=true` reflects any origin; it is ignored in
   production.
2. Call `GET /api/auth/csrf` before making unsafe cookie-authenticated requests.
   It returns the token in the response envelope under `data.token` and sets a
   readable (non-httpOnly) `csrf_token` cookie.
3. Send that token in the `X-CSRF-Token` header on every unsafe request that
   relies on auth cookies. The middleware compares it to the cookie with a
   constant-time comparison. Safe methods (`GET`, `HEAD`, `OPTIONS`), requests
   with `Authorization: Bearer`, and requests with no auth cookie are exempt.

`cookie-parser` populates `req.cookies`; the access and refresh cookies remain
`httpOnly`. `COOKIE_SAMESITE` defaults to `lax`; cross-site deployments should
use `none` with `COOKIE_SECURE=true`. The server refuses to start when
`COOKIE_SAMESITE=none` and `COOKIE_SECURE=false`.

## 📡 API Endpoints

### Implemented

| Method | Endpoint                    | Description                         |
| ------ | --------------------------- | ----------------------------------- |
| GET    | `/api/auth/csrf`            | Issue a CSRF token for cookie clients |
| POST   | `/api/auth/signup`          | Register a new user                 |
| POST   | `/api/auth/login`           | Login user and start a session      |
| POST   | `/api/auth/refresh`         | Rotate the refresh token            |
| GET    | `/api/auth/profile`         | Get the authenticated user          |
| POST   | `/api/auth/logout`          | Revoke the session and clear cookies |
| POST   | `/api/auth/password/forgot` | Request a password reset link       |
| POST   | `/api/auth/password/reset`  | Complete a password reset           |
| POST   | `/api/auth/otp/verify`      | Verify the email OTP                |
| POST   | `/api/auth/otp/resend`      | Resend the email verification OTP   |

## 🔒 Security Considerations

- Passwords are hashed using `bcrypt`
- Access tokens are signed JWTs with a configurable lifetime
- Refresh tokens are random, hashed at rest, rotated on every use, and revoked
  on logout or reuse detection
- Auth cookies are `httpOnly` and their `sameSite`/`secure` flags are
  configurable
- CORS uses an origin allowlist with credentials; CSRF uses double-submit
  tokens with constant-time comparison for cookie-authenticated writes
- Protected routes accept a cookie or Bearer token; account-state checks are
  enforced in the application layer
- User responses never include password hashes
- Password-reset tokens are hashed at rest, single-use, time-limited, and
  rate-limited; a successful reset revokes all sessions
- Abuse-prone endpoints are rate-limited with `express-rate-limit`, returning
  `429` in the standard error envelope
- Forgot-password responses do not reveal whether an email is registered
- Emails are normalized before storage and lookup
- Sensitive data stored in environment variables
- Input validation to prevent injection attacks
- Proper HTTP status codes and error handling

## 🧪 Future Improvements

- Add OAuth providers (Google, GitHub)
- Implement MFA (2FA with OTP)
- Extend rate limiting and brute-force protection to every auth endpoint
- Audit logging
- API documentation with Swagger

## 🤝 Contributing

Contributions are welcome. Feel free to fork the repository and submit a pull request.

## 📄 License

This project is open-source and available under the MIT License.


