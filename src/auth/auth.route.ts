import { Router } from "express";
import { AuthController } from "./auth.controller";
import { authenticate } from "../utils/middleware/auth.middleware";
import { rateLimiters } from "../utils/middleware/rateLimit.middleware";
const router = Router();
const authenticationController = new AuthController()

router.get("/csrf", authenticationController.issueCsrfToken)

// Email and password
router.post("/signup",authenticationController.createAccountWithEmailPassword  )
router.post("/login",authenticationController.loginWithPassword)
router.post("/refresh",authenticationController.refreshSession)
router.get("/profile",authenticate,authenticationController.getProfile)
router.post("/logout",authenticationController.logout)
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
router.post("/otp/verify",authenticationController.verifyEmailOtp)
router.post("/otp/resend",authenticationController.resendEmailOtp)
// username and password


// Email with phone and Otp


// google Oauth


// apple Oauth

export default router;


