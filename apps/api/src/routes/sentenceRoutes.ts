import { StudyItemType as PrismaStudyItemType } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { ApiError } from "../http/apiError.js";
import { asyncHandler } from "../http/asyncHandler.js";
import { getAuth, requireAuth } from "../middleware/auth.js";
import {
  SENTENCE_PROGRESS_STATUS_TO_PRISMA,
  toSentenceProgressDto
} from "./sentenceDtos.js";
import { toStudyItemSummaryDto } from "./studyItemDtos.js";
import { studyItemSummaryInclude } from "./studyItemQueries.js";

const sentenceProgressStatusSchema = z.enum(["viewed", "learning", "mastered"]);

const upsertSentenceProgressSchema = z
  .object({
    projectId: z.string().uuid(),
    subtitleLineId: z.string().uuid().optional(),
    manualText: z.string().trim().min(1).max(10_000).optional(),
    status: sentenceProgressStatusSchema.optional(),
    listenCountIncrement: z.number().int().min(0).max(100).optional(),
    isFavorite: z.boolean().optional(),
    note: z.string().trim().max(10_000).nullable().optional()
  })
  .refine((input) => Boolean(input.subtitleLineId || input.manualText), {
    message: "subtitleLineId or manualText is required"
  });

const updateSentenceProgressSchema = z
  .object({
    status: sentenceProgressStatusSchema.optional(),
    listenCountIncrement: z.number().int().min(0).max(100).optional(),
    isFavorite: z.boolean().optional(),
    note: z.string().trim().max(10_000).nullable().optional()
  })
  .refine((input) => Object.keys(input).length > 0, {
    message: "At least one field is required"
  });

const favoriteQuerySchema = z.object({
  projectId: z.string().uuid().optional(),
  language: z.string().trim().min(2).max(20).optional()
});

const progressQuerySchema = z.object({
  projectId: z.string().uuid()
});

export function createSentenceRouter(): Router {
  const router = Router();

  router.use(requireAuth);

  router.get(
    "/favorites",
    asyncHandler(async (request, response) => {
      const { userId } = getAuth(request);
      const query = favoriteQuerySchema.parse(request.query);
      const [progressFavorites, studyItemFavorites] = await Promise.all([
        prisma.userSentenceProgress.findMany({
          where: {
            userId,
            isFavorite: true,
            projectId: query.projectId,
            project: query.language ? { language: query.language } : undefined
          },
          include: sentenceProgressInclude,
          orderBy: { updatedAt: "desc" }
        }),
        prisma.studyItem.findMany({
          where: {
            userId,
            isFavorite: true,
            itemType: PrismaStudyItemType.SENTENCE,
            projectId: query.projectId,
            language: query.language
          },
          include: studyItemSummaryInclude,
          orderBy: { updatedAt: "desc" }
        })
      ]);
      const favorites = [
        ...progressFavorites.map((progress) => ({
          ...toSentenceProgressDto(progress),
          source: "sentence_progress" as const,
          textOriginal: progress.subtitleLine?.textOriginal ?? progress.manualText ?? ""
        })),
        ...studyItemFavorites.map((item) => {
          const summary = toStudyItemSummaryDto(item);

          return {
            id: summary.id,
            source: "study_item" as const,
            userId: summary.userId,
            textOriginal: summary.textOriginal,
            translation: summary.translation,
            note: summary.note,
            isFavorite: summary.isFavorite,
            language: summary.language,
            projectId: summary.projectId,
            subtitleLineId: summary.subtitleLineId,
            studyItem: {
              id: summary.id,
              itemType: summary.itemType,
              sourceType: summary.sourceType,
              sourceNote: summary.sourceNote,
              masteryStatus: summary.masteryStatus
            },
            createdAt: summary.createdAt,
            updatedAt: summary.updatedAt
          };
        })
      ].sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt));

      response.json({
        sentences: favorites
      });
    })
  );

  router.get(
    "/progress",
    asyncHandler(async (request, response) => {
      const { userId } = getAuth(request);
      const query = progressQuerySchema.parse(request.query);
      await assertProjectOwner(userId, query.projectId);

      const progresses = await prisma.userSentenceProgress.findMany({
        where: {
          userId,
          projectId: query.projectId
        },
        include: sentenceProgressInclude,
        orderBy: [{ lastViewedAt: "desc" }, { updatedAt: "desc" }]
      });

      response.json({
        progresses: progresses.map(toSentenceProgressDto)
      });
    })
  );

  router.post(
    "/progress",
    asyncHandler(async (request, response) => {
      const { userId } = getAuth(request);
      const input = upsertSentenceProgressSchema.parse(request.body);
      await assertProjectOwner(userId, input.projectId);

      if (input.subtitleLineId) {
        await assertSubtitleLineInProject(input.projectId, input.subtitleLineId);
      }

      const existing = await findExistingProgress(userId, input.projectId, input.subtitleLineId, input.manualText);
      const now = new Date();
      const progress = existing
        ? await prisma.userSentenceProgress.update({
            where: { id: existing.id },
            data: {
              status: input.status ? SENTENCE_PROGRESS_STATUS_TO_PRISMA[input.status] : undefined,
              listenCount: input.listenCountIncrement
                ? { increment: input.listenCountIncrement }
                : undefined,
              isFavorite: input.isFavorite,
              note: input.note,
              lastViewedAt: now
            },
            include: sentenceProgressInclude
          })
        : await prisma.userSentenceProgress.create({
            data: {
              userId,
              projectId: input.projectId,
              subtitleLineId: input.subtitleLineId,
              manualText: input.manualText,
              status: input.status ? SENTENCE_PROGRESS_STATUS_TO_PRISMA[input.status] : undefined,
              listenCount: input.listenCountIncrement ?? 0,
              isFavorite: input.isFavorite ?? false,
              note: input.note,
              lastViewedAt: now
            },
            include: sentenceProgressInclude
          });

      response.status(existing ? 200 : 201).json({
        progress: toSentenceProgressDto(progress)
      });
    })
  );

  router.patch(
    "/progress/:progressId",
    asyncHandler(async (request, response) => {
      const { userId } = getAuth(request);
      const input = updateSentenceProgressSchema.parse(request.body);
      const existing = await prisma.userSentenceProgress.findFirst({
        where: {
          id: getRequiredParam(request.params.progressId, "Progress id"),
          userId
        },
        select: { id: true }
      });

      if (!existing) {
        throw new ApiError(404, "SENTENCE_PROGRESS_NOT_FOUND", "Sentence progress was not found");
      }

      const progress = await prisma.userSentenceProgress.update({
        where: { id: existing.id },
        data: {
          status: input.status ? SENTENCE_PROGRESS_STATUS_TO_PRISMA[input.status] : undefined,
          listenCount: input.listenCountIncrement ? { increment: input.listenCountIncrement } : undefined,
          isFavorite: input.isFavorite,
          note: input.note,
          lastViewedAt: new Date()
        },
        include: sentenceProgressInclude
      });

      response.json({ progress: toSentenceProgressDto(progress) });
    })
  );

  return router;
}

const sentenceProgressInclude = {
  project: {
    select: {
      id: true,
      title: true,
      language: true,
      sourceType: true
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
  }
} as const;

async function findExistingProgress(
  userId: string,
  projectId: string,
  subtitleLineId?: string,
  manualText?: string
) {
  if (subtitleLineId) {
    return prisma.userSentenceProgress.findFirst({
      where: {
        userId,
        projectId,
        subtitleLineId
      },
      select: { id: true }
    });
  }

  return prisma.userSentenceProgress.findFirst({
    where: {
      userId,
      projectId,
      subtitleLineId: null,
      manualText
    },
    select: { id: true }
  });
}

async function assertProjectOwner(userId: string, projectId: string): Promise<void> {
  const project = await prisma.learningProject.findFirst({
    where: { id: projectId, userId },
    select: { id: true }
  });

  if (!project) {
    throw new ApiError(404, "PROJECT_NOT_FOUND", "Project was not found");
  }
}

async function assertSubtitleLineInProject(projectId: string, subtitleLineId: string): Promise<void> {
  const subtitleLine = await prisma.subtitleLine.findFirst({
    where: { id: subtitleLineId, projectId },
    select: { id: true }
  });

  if (!subtitleLine) {
    throw new ApiError(404, "SUBTITLE_LINE_NOT_FOUND", "Subtitle line was not found");
  }
}

function getRequiredParam(value: string | undefined, label: string): string {
  if (!value) {
    throw new ApiError(400, "PARAM_REQUIRED", `${label} is required`);
  }

  return value;
}
