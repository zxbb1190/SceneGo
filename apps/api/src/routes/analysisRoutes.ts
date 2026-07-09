import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { sentenceAnalysisJsonSchema } from "../adapters/ai/analysisSchema.js";
import { createAiProvider } from "../adapters/ai/providerFactory.js";
import { prisma } from "../db/prisma.js";
import { ApiError } from "../http/apiError.js";
import { asyncHandler } from "../http/asyncHandler.js";
import { getAuth, requireAuth } from "../middleware/auth.js";
import { STUDY_SOURCE_TYPE_TO_PRISMA } from "./studyEnums.js";

const sentenceAnalysisRequestSchema = z
  .object({
    projectId: z.string().uuid(),
    subtitleLineId: z.string().uuid().optional(),
    text: z.string().trim().min(1).max(10_000).optional(),
    language: z.string().trim().min(2).max(20).optional(),
    contextBefore: z.string().trim().max(2_000).optional(),
    contextAfter: z.string().trim().max(2_000).optional()
  })
  .refine((input) => Boolean(input.subtitleLineId || input.text), {
    message: "subtitleLineId or text is required"
  });

export function createAnalysisRouter(): Router {
  const router = Router();

  router.use(requireAuth);

  router.post(
    "/sentence",
    asyncHandler(async (request, response) => {
      const { userId } = getAuth(request);
      const input = sentenceAnalysisRequestSchema.parse(request.body);
      const project = await prisma.learningProject.findFirst({
        where: {
          id: input.projectId,
          userId
        },
        select: {
          id: true,
          language: true
        }
      });

      if (!project) {
        throw new ApiError(404, "PROJECT_NOT_FOUND", "Project was not found");
      }

      const subtitleLine = input.subtitleLineId
        ? await prisma.subtitleLine.findFirst({
            where: {
              id: input.subtitleLineId,
              projectId: project.id
            },
            select: {
              id: true,
              textOriginal: true
            }
          })
        : null;

      if (input.subtitleLineId && !subtitleLine) {
        throw new ApiError(404, "SUBTITLE_LINE_NOT_FOUND", "Subtitle line was not found");
      }

      const text = subtitleLine?.textOriginal ?? input.text;
      if (!text) {
        throw new ApiError(400, "TEXT_REQUIRED", "Text is required for manual sentence analysis");
      }

      const language = input.language ?? project.language;
      const textHash = hashAnalysisText(text);
      const cached = await prisma.sentenceAnalysis.findFirst({
        where: subtitleLine
          ? {
              projectId: project.id,
              subtitleLineId: subtitleLine.id,
              language
            }
          : {
              projectId: project.id,
              subtitleLineId: null,
              textHash,
              language
            }
      });

      if (cached) {
        response.json({
          analysisId: cached.id,
          cached: true,
          modelName: cached.modelName ?? undefined,
          analysis: sentenceAnalysisJsonSchema.parse(cached.analysisJson)
        });
        return;
      }

      const provider = createAiProvider();
      if (!provider) {
        throw new ApiError(
          503,
          "AI_PROVIDER_NOT_CONFIGURED",
          "AI provider is not configured. Set OPENAI_COMPATIBLE_BASE_URL, OPENAI_COMPATIBLE_API_KEY, and AI_MODEL."
        );
      }

      const result = await provider.analyzeSentence({
        projectId: project.id,
        subtitleLineId: subtitleLine?.id,
        language,
        text,
        contextBefore: input.contextBefore,
        contextAfter: input.contextAfter
      });

      const created = await prisma.sentenceAnalysis.create({
        data: {
          projectId: project.id,
          subtitleLineId: subtitleLine?.id,
          language,
          textHash,
          analysisJson: result.analysis as unknown as Prisma.InputJsonObject,
          modelName: result.modelName
        }
      });

      await prisma.aiUsageLog.create({
        data: {
          userId,
          projectId: project.id,
          actionType: "sentence_analysis",
          sourceType: subtitleLine
            ? STUDY_SOURCE_TYPE_TO_PRISMA.video_subtitle
            : STUDY_SOURCE_TYPE_TO_PRISMA.external_manual,
          inputHash: textHash,
          modelName: result.modelName,
          inputTokens: result.usage?.inputTokens,
          outputTokens: result.usage?.outputTokens,
          totalTokens: result.usage?.totalTokens
        }
      });

      response.status(201).json({
        analysisId: created.id,
        cached: false,
        modelName: created.modelName ?? undefined,
        analysis: result.analysis
      });
    })
  );

  return router;
}

function hashAnalysisText(text: string): string {
  return createHash("sha256").update(text.replace(/\s+/g, " ").trim()).digest("hex");
}
