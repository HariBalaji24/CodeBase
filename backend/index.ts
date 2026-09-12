import express from "express";
import cors from "cors";
import router from "./routes/routes.ts";


const app = express();
const PORT = 5000;

app.use(
  cors({
    origin: ["http://localhost:3000", "https://code-base-xi.vercel.app/"],
    credentials: true,
  }),
);
app.use(express.json());

app.use("/", router);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
