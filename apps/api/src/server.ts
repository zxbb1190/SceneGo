import cors from "cors";
import express, { type Express, type Request, type Response } from "express";
import { env } from "./config/env.js";
import { prisma } from "./db/prisma.js";
import { asyncHandler } from "./http/asyncHandler.js";
import { errorMiddleware } from "./http/errorMiddleware.js";
import { createAnalysisRouter } from "./routes/analysisRoutes.js";
import { createAudioRouter } from "./routes/audioRoutes.js";
import { createAuthRouter } from "./routes/authRoutes.js";
import { createProjectRouter } from "./routes/projectRoutes.js";
import { createReviewRouter } from "./routes/reviewRoutes.js";
import { V0_1_PROJECT_SOURCE_TYPES } from "./routes/projectSourceValidation.js";
import { createSentenceRouter } from "./routes/sentenceRoutes.js";
import { createStudyItemRouter } from "./routes/studyItemRoutes.js";
import { createTextRouter } from "./routes/textRoutes.js";
import { createVocabularyRouter } from "./routes/vocabularyRoutes.js";

export function createServer(): Express {
  const app = express();
  const corsOrigins = env.CORS_ORIGIN.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.use(
    cors({
      origin: corsOrigins.length === 1 ? corsOrigins[0] : corsOrigins,
      credentials: true
    })
  );
  app.use(express.json({ limit: "5mb" }));

  app.get("/health", (_request: Request, response: Response) => {
    response.json({ ok: true, service: "scenego-api" });
  });

  app.get(
    "/health/db",
    asyncHandler(async (_request: Request, response: Response) => {
      await prisma.$queryRaw`SELECT 1`;
      response.json({ ok: true, service: "scenego-api", database: "reachable" });
    })
  );

  app.get("/api/v1", (_request: Request, response: Response) => {
    response.json({
      name: "SceneGo API",
      version: "0.3.1",
      sourceTypes: V0_1_PROJECT_SOURCE_TYPES
    });
  });

  app.use("/api/v1/auth", createAuthRouter());
  app.use("/api/v1/projects", createProjectRouter());
  app.use("/api/v1/analysis", createAnalysisRouter());
  app.use("/api/v1/audio", createAudioRouter());
  app.use("/api/v1/text", createTextRouter());
  app.use("/api/text", createTextRouter());
  app.use("/api/v1/study-items", createStudyItemRouter());
  app.use("/api/v1/sentences", createSentenceRouter());
  app.use("/api/v1/vocabulary", createVocabularyRouter());
  app.use("/api/v1/review", createReviewRouter());
  app.use(errorMiddleware);

  return app;
}
