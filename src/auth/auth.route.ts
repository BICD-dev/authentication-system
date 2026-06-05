import { Router } from "express";
import { AuthController } from "./auth.controller";
const router = Router();
const authenticationController = new AuthController()

// Email and password
router.post("/",authenticationController.createAccountWithEmailPassword  )
router.post("/login",authenticationController.loginWithPassword)
// username and password


// Email with phone and Otp


// google Oauth


// apple Oauth

export default router;


