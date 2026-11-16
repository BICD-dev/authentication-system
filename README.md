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
- JWT-based authentication
- Email verification with OTP
- Secure password hashing with bcrypt
- Input validation and structured error handling
- Provider-based email delivery (Gmail / Brevo)
- Cache abstraction (memory / Redis)

### In progress / planned

- Session-based authentication and refresh-token rotation
- Profile and logout endpoints
- Password reset
- OAuth 2.0 (Google, GitHub, Microsoft, Apple)
- Role-based access control (RBAC)
- API key authentication
- Multi-factor authentication (MFA)

---

## 🧠 Authentication Strategies Implemented / Planned

- **JWT (JSON Web Tokens)** — implemented
- **Session-based authentication** — in progress (refresh-token sessions)
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
    └── middleware/
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

## 📡 API Endpoints

### Implemented

| Method | Endpoint                    | Description                         |
| ------ | --------------------------- | ----------------------------------- |
| POST   | `/api/auth/signup`          | Register a new user                 |
| POST   | `/api/auth/login`           | Login user                          |
| POST   | `/api/auth/otp/verify`      | Verify the email OTP                |
| POST   | `/api/auth/otp/resend`      | Resend the email verification OTP   |

### Planned

| Method | Endpoint                      | Description                     |
| ------ | ----------------------------- | ------------------------------- |
| POST   | `/api/auth/refresh`           | Refresh the current session     |
| GET    | `/api/auth/profile`           | Get the authenticated user      |
| POST   | `/api/auth/logout`            | Logout and revoke the session   |
| POST   | `/api/auth/password/forgot`   | Request a password reset        |
| POST   | `/api/auth/password/reset`    | Complete a password reset       |

## 🔒 Security Considerations

- Passwords are hashed using `bcrypt`
- Tokens are signed and verified securely
- Sensitive data stored in environment variables
- Input validation to prevent injection attacks
- Proper HTTP status codes and error handling

## 🧪 Future Improvements

- Add OAuth providers (Google, GitHub)
- Implement MFA (2FA with OTP)
- Rate limiting and brute-force protection
- Audit logging
- API documentation with Swagger

## 🤝 Contributing

Contributions are welcome. Feel free to fork the repository and submit a pull request.

## 📄 License

This project is open-source and available under the MIT License.


