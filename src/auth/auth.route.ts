import { Router } from "express";
import { AuthController } from "./auth.controller";
import { authenticate } from "../utils/middleware/auth.middleware";
import { csrfProtection } from "../utils/middleware/csrf.middleware";
import { rateLimiters } from "../utils/middleware/rateLimit.middleware";
const router = Router();
const authenticationController = new AuthController()

router.get("/csrf", authenticationController.issueCsrfToken)

// Email and password
router.post("/signup", rateLimiters.strict, authenticationController.createAccountWithEmailPassword)
router.post("/login", rateLimiters.strict, authenticationController.loginWithPassword)
// These routes consume the refresh cookie directly, so they need the CSRF
// check explicitly. `authenticate` already includes it for protected routes.
router.post("/refresh", rateLimiters.moderate, csrfProtection, authenticationController.refreshSession)
router.get("/profile", authenticate, authenticationController.getProfile)
router.post("/logout", csrfProtection, authenticationController.logout)
router.post(
    "/password/forgot",
    rateLimiters.strict,
    authenticationController.forgotPassword
)
router.post(
    "/password/reset",
    rateLimiters.strict,
    authenticationController.resetPassword
)
router.post("/otp/verify", rateLimiters.strict, authenticationController.verifyEmailOtp)
router.post("/otp/resend", rateLimiters.strict, authenticationController.resendEmailOtp)
// username and password


// Email with phone and Otp


// google Oauth


// apple Oauth

export default router;
