import { Router } from "express";
import { coursesRouter } from "./routes/courses.js";
import { materialsRouter } from "./routes/materials.js";
import { aiRouter } from "./routes/ai.js";
import { settingsRouter } from "./routes/settings.js";

export const apiRouter = Router();

apiRouter.use("/courses", coursesRouter);
apiRouter.use("/courses", materialsRouter);
apiRouter.use("/courses", aiRouter);
apiRouter.use("/settings", settingsRouter);
