import express from "express";
import helmet from "helmet";
import cors from "cors"

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet())
app.use(cors());
app.use(express.json());

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});