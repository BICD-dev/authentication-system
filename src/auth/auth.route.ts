import { Router } from "express";
import { AuthController } from "./auth.controller";
const router = Router();
const authenticationController = new AuthController()

// Email and password
router.post("/signup",authenticationController.createAccountWithEmailPassword  )
router.post("/login",authenticationController.loginWithPassword)
router.post("/otp/verify-email",authenticationController.verifyEmailOtp)
// username and password


// Email with phone and Otp


// google Oauth


// apple Oauth

export default router;


