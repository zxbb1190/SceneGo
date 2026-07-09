import { Router } from "express";
import { z } from "zod";
import { analyzeTextForUser } from "../services/textAnalysisService.js";
import { asyncHandler } from "../http/asyncHandler.js";
import { getAuth, requireAuth } from "../middleware/auth.js";
import { toStudyItemDetailDto } from "./studyItemDtos.js";
import { findStudyItemDetailOrThrow } from "./studyItemQueries.js";

const studySourceTypeSchema = z.enum(["manual_input", "video_subtitle", "external_manual"]);

const analyzeTextSchema = z.object({
  text: z.string().trim().min(1).max(4_000),
  language: z.string().trim().min(2).max(20).optional(),
  sourceNote: z.string().trim().max(255).optional(),
  sourceType: studySourceTypeSchema.optional(),
  tags: z.array(z.string().trim().min(1).max(32)).max(12).optional()
});

export function createTextRouter(): Router {
  const router = Router();

  router.use(requireAuth);

  router.post(
    "/analyze",
    asyncHandler(async (request, response) => {
      const { userId } = getAuth(request);
      const input = analyzeTextSchema.parse(request.body);
      const result = await analyzeTextForUser({
        userId,
        text: input.text,
        language: input.language,
        sourceNote: optionalString(input.sourceNote),
        sourceType: input.sourceType,
        tags: input.tags
      });
      const item = await findStudyItemDetailOrThrow(userId, result.studyItemId);

      response.status(result.cached ? 200 : 201).json({
        item: toStudyItemDetailDto(item),
        analysis: result.analysis,
        cached: result.cached,
        modelName: result.modelName
      });
    })
  );

  return router;
}

function optionalString(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}
