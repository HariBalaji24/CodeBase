import express from "express";
import service from "../controllers/repository.controller.ts";
import analysis from "../controllers/analysis.controller.ts";
import * as auth from "../controllers/auth.controller.ts";
import { authenticate } from "../middleware/auth.middleware.ts";
import { rateLimit } from "../middleware/rateLimit.middleware.ts";

const router = express.Router();

// Public
router.route("/health").get(analysis.health);

// Authentication
const credentialLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: "Too many attempts. Please try again in a few minutes.",
});
router.route("/auth/register").post(credentialLimiter, auth.register);
router.route("/auth/login").post(credentialLimiter, auth.login);
router.route("/auth/refresh").post(auth.requireTrustedOrigin, auth.refresh);
router.route("/auth/logout").post(auth.requireTrustedOrigin, auth.logout);
router.route("/auth/me").get(authenticate, auth.me);

// Protected: require `Authorization: Bearer <access token>`
router.route("/getrepository").post(authenticate, service.getrepository);
router.route("/repositories").get(authenticate, analysis.listRepositories);
router.route("/repositories/:owner/:repo/stats").get(authenticate, analysis.getRepositoryStats);
router.route("/analyze").post(authenticate, analysis.startAnalysis);
router.route("/analyze/:jobId").get(authenticate, analysis.getAnalysisStatus);
router.route("/analyze/:owner/:repo/search").post(authenticate, analysis.searchRepository);
router.route("/evaluate/:owner/:repo/retrieval").post(authenticate, analysis.evaluateRetrieval);

export default router;
