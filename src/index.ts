import express from "express";
import helmet from "helmet";
import cors from "cors"
import authRouter from "./auth/auth.route";
import { globalErrorHandler, notFoundHandler } from "./utils/middleware/errorHandler";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet())
app.use(cors());
app.use(express.json());

app.use("/api/auth", authRouter);

app.use(notFoundHandler);
app.use(globalErrorHandler);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});