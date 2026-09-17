import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import projectsRouter from "./projects";
import kitsRouter from "./kits";
import generationsRouter from "./generations";
import statsRouter from "./stats";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(projectsRouter);
router.use(kitsRouter);
router.use(generationsRouter);
router.use(statsRouter);

export default router;
