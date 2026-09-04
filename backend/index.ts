import express from "express";
import cors from "cors";
const router = express.Router();

const app = express();
app.use(express.json());
app.use("/", router);

const PORT = 5000;

app.use(
  cors({
    origin: "http://localhost:3000",
  }),
);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
