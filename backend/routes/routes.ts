import express from "express";
import service from "../controllers/repository.controller.ts";

const router = express.Router();

router.route("/getrepository").post(service.getrepository);

export default router;