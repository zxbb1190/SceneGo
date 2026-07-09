import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { ApiError } from "../http/apiError.js";
import { asyncHandler } from "../http/asyncHandler.js";
import { getAuth, requireAuth } from "../middleware/auth.js";
import {
  VOCABULARY_MASTERY_STATUS_TO_PRISMA,
  toVocabularyDto
} from "./vocabularyDtos.js";
import { STUDY_SOURCE_TYPE_TO_PRISMA } from "./studyEnums.js";

const masteryStatusSchema = z.enum(["new", "learning", "mastered"]);
const studySourceTypeSchema = z.enum(["manual_input", "video_subtitle", "external_manual"]);

const vocabularyQuerySchema = z.object({
  projectId: z.string().uuid().optional(),
  sourceType: studySourceTypeSchema.optional(),
  language: z.string().trim().min(2).max(20).optional(),
  masteryStatus: masteryStatusSchema.optional()
});

const createVocabularySchema = z
  .object({
    projectId: z.string().uuid().optional(),
    subtitleLineId: z.string().uuid().optional(),
    studyItemId: z.string().uuid().optional(),
    word: z.string().trim().min(1).max(255),
    meaning: z.string().trim().max(10_000).optional(),
    language: z.string().trim().min(2).max(20).optional(),
    sourceText: z.string().trim().max(10_000).optional(),
    sourceType: studySourceTypeSchema.optional(),
    note: z.string().trim().max(10_000).optional(),
    masteryStatus: masteryStatusSchema.optional()
  })
  .refine((input) => !input.subtitleLineId || Boolean(input.projectId), {
    message: "projectId is required when subtitleLineId is provided",
    path: ["projectId"]
  });

const updateVocabularySchema = z
  .object({
    word: z.string().trim().min(1).max(255).optional(),
    meaning: z.string().trim().max(10_000).nullable().optional(),
    language: z.string().trim().min(2).max(20).optional(),
    sourceText: z.string().trim().max(10_000).nullable().optional(),
    sourceType: studySourceTypeSchema.nullable().optional(),
    note: z.string().trim().max(10_000).nullable().optional(),
    masteryStatus: masteryStatusSchema.optional()
  })
  .refine((input) => Object.keys(input).length > 0, {
    message: "At least one field is required"
  });

export function createVocabularyRouter(): Router {
  const router = Router();

  router.use(requireAuth);

  router.get(
    "/",
    asyncHandler(async (request, response) => {
      const { userId } = getAuth(request);
      const query = vocabularyQuerySchema.parse(request.query);
      const items = await prisma.vocabularyItem.findMany({
        where: {
          userId,
          projectId: query.projectId,
          sourceType: query.sourceType ? STUDY_SOURCE_TYPE_TO_PRISMA[query.sourceType] : undefined,
          language: query.language,
          masteryStatus: query.masteryStatus
            ? VOCABULARY_MASTERY_STATUS_TO_PRISMA[query.masteryStatus]
            : undefined
        },
        include: vocabularyInclude,
        orderBy: { updatedAt: "desc" }
      });

      response.json({ items: items.map(toVocabularyDto) });
    })
  );

  router.post(
    "/",
    asyncHandler(async (request, response) => {
      const { userId } = getAuth(request);
      const input = createVocabularySchema.parse(request.body);
      const project = input.projectId ? await assertProjectOwner(userId, input.projectId) : null;
      const studyItem = input.studyItemId ? await assertStudyItemOwner(userId, input.studyItemId) : null;
      let subtitleLine: { id: string; textOriginal: string } | null = null;

      if (input.subtitleLineId) {
        subtitleLine = await assertSubtitleLineAccess(userId, input.subtitleLineId, input.projectId);
      }

      const language = input.language ?? studyItem?.language ?? project?.language;
      if (!language) {
        throw new ApiError(400, "LANGUAGE_REQUIRED", "language is required when projectId is not provided");
      }

      const sourceType = input.sourceType
        ? STUDY_SOURCE_TYPE_TO_PRISMA[input.sourceType]
        : studyItem?.sourceType ?? (input.subtitleLineId ? STUDY_SOURCE_TYPE_TO_PRISMA.video_subtitle : undefined);

      const item = await prisma.vocabularyItem.create({
        data: {
          userId,
          projectId: input.projectId,
          subtitleLineId: input.subtitleLineId,
          studyItemId: input.studyItemId,
          word: input.word,
          meaning: input.meaning,
          language,
          sourceText: input.sourceText ?? studyItem?.textOriginal ?? subtitleLine?.textOriginal,
          sourceType,
          note: input.note,
          masteryStatus: input.masteryStatus
            ? VOCABULARY_MASTERY_STATUS_TO_PRISMA[input.masteryStatus]
            : undefined
        },
        include: vocabularyInclude
      });

      response.status(201).json({ item: toVocabularyDto(item) });
    })
  );

  router.patch(
    "/:itemId",
    asyncHandler(async (request, response) => {
      const { userId } = getAuth(request);
      const itemId = getRequiredParam(request.params.itemId, "Vocabulary item id");
      const input = updateVocabularySchema.parse(request.body);
      const existing = await prisma.vocabularyItem.findFirst({
        where: { id: itemId, userId },
        select: { id: true }
      });

      if (!existing) {
        throw new ApiError(404, "VOCABULARY_ITEM_NOT_FOUND", "Vocabulary item was not found");
      }

      const item = await prisma.vocabularyItem.update({
        where: { id: existing.id },
        data: {
          word: input.word,
          meaning: input.meaning,
          language: input.language,
          sourceText: input.sourceText,
          sourceType:
            input.sourceType === null
              ? null
              : input.sourceType
                ? STUDY_SOURCE_TYPE_TO_PRISMA[input.sourceType]
                : undefined,
          note: input.note,
          masteryStatus: input.masteryStatus
            ? VOCABULARY_MASTERY_STATUS_TO_PRISMA[input.masteryStatus]
            : undefined
        },
        include: vocabularyInclude
      });

      response.json({ item: toVocabularyDto(item) });
    })
  );

  router.delete(
    "/:itemId",
    asyncHandler(async (request, response) => {
      const { userId } = getAuth(request);
      const itemId = getRequiredParam(request.params.itemId, "Vocabulary item id");
      const existing = await prisma.vocabularyItem.findFirst({
        where: { id: itemId, userId },
        select: { id: true }
      });

      if (!existing) {
        throw new ApiError(404, "VOCABULARY_ITEM_NOT_FOUND", "Vocabulary item was not found");
      }

      await prisma.vocabularyItem.delete({ where: { id: existing.id } });
      response.status(204).send();
    })
  );

  return router;
}

const vocabularyInclude = {
  project: {
    select: {
      id: true,
      title: true,
      language: true
    }
  },
  subtitleLine: {
    select: {
      id: true,
      lineIndex: true,
      startTime: true,
      endTime: true,
      textOriginal: true
    }
  },
  studyItem: {
    select: {
      id: true,
      itemType: true,
      textOriginal: true,
      sourceType: true
    }
  }
} as const;

async function assertProjectOwner(userId: string, projectId: string) {
  const project = await prisma.learningProject.findFirst({
    where: { id: projectId, userId },
    select: {
      id: true,
      language: true
    }
  });

  if (!project) {
    throw new ApiError(404, "PROJECT_NOT_FOUND", "Project was not found");
  }

  return project;
}

async function assertStudyItemOwner(userId: string, studyItemId: string) {
  const studyItem = await prisma.studyItem.findFirst({
    where: { id: studyItemId, userId },
    select: {
      id: true,
      language: true,
      sourceType: true,
      textOriginal: true
    }
  });

  if (!studyItem) {
    throw new ApiError(404, "STUDY_ITEM_NOT_FOUND", "Study item was not found");
  }

  return studyItem;
}

async function assertSubtitleLineAccess(
  userId: string,
  subtitleLineId: string,
  projectId?: string
): Promise<{ id: string; textOriginal: string }> {
  const subtitleLine = await prisma.subtitleLine.findFirst({
    where: {
      id: subtitleLineId,
      projectId,
      project: { userId }
    },
    select: {
      id: true,
      textOriginal: true
    }
  });

  if (!subtitleLine) {
    throw new ApiError(404, "SUBTITLE_LINE_NOT_FOUND", "Subtitle line was not found");
  }

  return subtitleLine;
}

function getRequiredParam(value: string | undefined, label: string): string {
  if (!value) {
    throw new ApiError(400, "PARAM_REQUIRED", `${label} is required`);
  }

  return value;
}
