import { Router, type IRouter } from "express";
import healthRouter from "./health";
import codeRouter from "./code.js";
import versionsRouter from "./versions.js";
import aiRouter from "./ai.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(codeRouter);
router.use(versionsRouter);
router.use(aiRouter);

export default router;
