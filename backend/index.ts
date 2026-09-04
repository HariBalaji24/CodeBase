import express from "express";
import cors from "cors";
import router from "./routes/routes.ts";

// Optional: reads GITHUB_TOKEN from backend/.env if the file exists.
try {
  process.loadEnvFile();
} catch {
  // No .env file - the app still runs, just on GitHub's 60 req/hour anonymous limit.
}

const app = express();
const PORT = 5000;

app.use(
  cors({
    origin: "http://localhost:3000",
  }),
);
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.use("/", router);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(
    process.env.GITHUB_TOKEN
      ? "  GITHUB_TOKEN  loaded (5000 requests/hour)"
      : "  GITHUB_TOKEN  missing (60 requests/hour) - see .env.example",
  );
  console.log(
    process.env.GROQ_API_KEY
      ? "  GROQ_API_KEY  loaded"
      : "  GROQ_API_KEY  not set (AI features are not implemented yet)",
  );
});
