import express from "express";
import service from "../controllers/repository.controller.ts";
import analysis from "../controllers/analysis.controller.ts";

const router = express.Router();

router.route("/getrepository").post(service.getrepository);
router.route("/analyze").post(analysis.startAnalysis);
router.route("/analyze/:jobId").get(analysis.getAnalysisStatus);
router.route("/analyze/:owner/:repo/search").post(analysis.searchRepository);

export default router;
