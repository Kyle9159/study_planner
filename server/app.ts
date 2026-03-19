import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import express from "express";
import { apiRouter } from "./api/routes.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = join(__dirname, "../data/uploads");

if (!existsSync(UPLOADS_DIR)) {
  mkdirSync(UPLOADS_DIR, { recursive: true });
}

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: "5mb" }));

  // Serve uploaded files
  app.use("/uploads", express.static(UPLOADS_DIR));

  // API routes
  app.use("/api", apiRouter);

  // Health check
  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // SPA fallback in production
  if (process.env.NODE_ENV === "production") {
    const clientDir = join(__dirname, "../dist/client");
    app.use(express.static(clientDir));
    app.get("*", (_req, res) => {
      res.sendFile(join(clientDir, "index.html"));
    });
  }

  return app;
}
