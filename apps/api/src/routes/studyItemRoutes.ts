import { Prisma } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { ApiError } from "../http/apiError.js";
import { asyncHandler } from "../http/asyncHandler.js";
import { getAuth, requireAuth } from "../middleware/auth.js";
import { sanitizeTags } from "../services/textAnalysisService.js";
import {
  STUDY_ITEM_MASTERY_STATUS_TO_PRISMA,
  STUDY_ITEM_TYPE_TO_PRISMA,
  STUDY_SOURCE_TYPE_TO_PRISMA
} from "./studyEnums.js";
import { toStudyItemDetailDto, toStudyItemSummaryDto } from "./studyItemDtos.js";
import {
  findStudyItemDetailOrThrow,
  studyItemDetailInclude,
  studyItemSummaryInclude
} from "./studyItemQueries.js";
import {
  VOCABULARY_MASTERY_STATUS_TO_PRISMA,
  toVocabularyDto
} from "./vocabularyDtos.js";

const studyItemTypeSchema = z.enum(["word", "phrase", "sentence", "paragraph", "mixed"]);
const studySourceTypeSchema = z.enum(["manual_input", "video_subtitle", "external_manual"]);
const studyItemMasteryStatusSchema = z.enum(["new", "learning", "mastered"]);
const vocabularyMasteryStatusSchema = z.enum(["new", "learning", "mastered"]);

const listStudyItemsQuerySchema = z.object({
  keyword: z.string().trim().max(200).optional(),
  itemType: studyItemTypeSchema.optional(),
  sourceType: studySourceTypeSchema.optional(),
  tag: z.string().trim().max(32).optional(),
  isFavorite: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional()
});

const updateStudyItemSchema = z
  .object({
    isFavorite: z.boolean().optional(),
    masteryStatus: studyItemMasteryStatusSchema.optional(),
    sourceNote: z.string().trim().max(255).nullable().optional(),
    tags: z.array(z.string().trim().min(1).max(32)).max(12).optional(),
    reviewCountIncrement: z.number().int().min(0).max(100).optional()
  })
  .refine((input) => Object.keys(input).length > 0, {
    message: "At least one field is required"
  });

const updateNoteSchema = z.object({
  note: z.string().trim().max(10_000)
});

const addVocabularyFromStudyItemSchema = z.object({
  word: z.string().trim().min(1).max(255),
  meaning: z.string().trim().max(10_000).optional(),
  language: z.string().trim().min(2).max(20).optional(),
  note: z.string().trim().max(10_000).optional(),
  sourceText: z.string().trim().max(10_000).optional(),
  masteryStatus: vocabularyMasteryStatusSchema.optional()
});

export function createStudyItemRouter(): Router {
  const router = Router();

  router.use(requireAuth);

  router.get(
    "/",
    asyncHandler(async (request, response) => {
      const { userId } = getAuth(request);
      const query = listStudyItemsQuerySchema.parse(request.query);
      const where: Prisma.StudyItemWhereInput = {
        userId,
        itemType: query.itemType ? STUDY_ITEM_TYPE_TO_PRISMA[query.itemType] : undefined,
        sourceType: query.sourceType ? STUDY_SOURCE_TYPE_TO_PRISMA[query.sourceType] : undefined,
        isFavorite: query.isFavorite
      };

      if (query.keyword) {
        where.OR = [
          { textOriginal: { contains: query.keyword } },
          { normalizedText: { contains: query.keyword.toLowerCase() } },
          { sourceNote: { contains: query.keyword } }
        ];
      }

      const items = await prisma.studyItem.findMany({
        where,
        include: studyItemSummaryInclude,
        orderBy: { updatedAt: "desc" },
        take: 200
      });
      const filteredItems = query.tag
        ? items.filter((item) => parseTags(item.tags).includes(query.tag ?? ""))
        : items;

      response.json({
        items: filteredItems.map(toStudyItemSummaryDto)
      });
    })
  );

  router.get(
    "/:itemId",
    asyncHandler(async (request, response) => {
      const { userId } = getAuth(request);
      const itemId = getRequiredParam(request.params.itemId, "Study item id");

      await prisma.studyItem.updateMany({
        where: { id: itemId, userId },
        data: { lastViewedAt: new Date() }
      });

      const item = await findStudyItemDetailOrThrow(userId, itemId);
      response.json({ item: toStudyItemDetailDto(item) });
    })
  );

  router.patch(
    "/:itemId",
    asyncHandler(async (request, response) => {
      const { userId } = getAuth(request);
      const itemId = getRequiredParam(request.params.itemId, "Study item id");
      const input = updateStudyItemSchema.parse(request.body);
      await assertStudyItemOwner(userId, itemId);

      await prisma.studyItem.update({
        where: { id: itemId },
        data: {
          isFavorite: input.isFavorite,
          masteryStatus: input.masteryStatus
            ? STUDY_ITEM_MASTERY_STATUS_TO_PRISMA[input.masteryStatus]
            : undefined,
          sourceNote: input.sourceNote,
          tags: input.tags ? (sanitizeTags(input.tags) as Prisma.InputJsonArray) : undefined,
          reviewCount: input.reviewCountIncrement ? { increment: input.reviewCountIncrement } : undefined,
          lastViewedAt: new Date()
        }
      });

      const item = await findStudyItemDetailOrThrow(userId, itemId);
      response.json({ item: toStudyItemDetailDto(item) });
    })
  );

  router.delete(
    "/:itemId",
    asyncHandler(async (request, response) => {
      const { userId } = getAuth(request);
      const itemId = getRequiredParam(request.params.itemId, "Study item id");
      await assertStudyItemOwner(userId, itemId);

      await prisma.studyItem.delete({ where: { id: itemId } });
      response.status(204).send();
    })
  );

  router.patch(
    "/:itemId/note",
    asyncHandler(async (request, response) => {
      const { userId } = getAuth(request);
      const itemId = getRequiredParam(request.params.itemId, "Study item id");
      const input = updateNoteSchema.parse(request.body);
      await assertStudyItemOwner(userId, itemId);

      const existing = await prisma.userNote.findFirst({
        where: {
          userId,
          studyItemId: itemId
        },
        select: { id: true }
      });
      const trimmedNote = input.note.trim();

      if (!trimmedNote && existing) {
        await prisma.userNote.delete({ where: { id: existing.id } });
      } else if (trimmedNote && existing) {
        await prisma.userNote.update({
          where: { id: existing.id },
          data: { noteText: trimmedNote }
        });
      } else if (trimmedNote) {
        await prisma.userNote.create({
          data: {
            userId,
            studyItemId: itemId,
            noteText: trimmedNote
          }
        });
      }

      const item = await findStudyItemDetailOrThrow(userId, itemId);
      response.json({ item: toStudyItemDetailDto(item) });
    })
  );

  router.post(
    "/:itemId/vocabulary",
    asyncHandler(async (request, response) => {
      const { userId } = getAuth(request);
      const itemId = getRequiredParam(request.params.itemId, "Study item id");
      const input = addVocabularyFromStudyItemSchema.parse(request.body);
      const item = await prisma.studyItem.findFirst({
        where: { id: itemId, userId },
        select: {
          id: true,
          language: true,
          sourceType: true,
          textOriginal: true
        }
      });

      if (!item) {
        throw new ApiError(404, "STUDY_ITEM_NOT_FOUND", "Study item was not found");
      }

      const vocabulary = await prisma.vocabularyItem.create({
        data: {
          userId,
          studyItemId: item.id,
          word: input.word,
          meaning: input.meaning,
          language: input.language ?? item.language,
          sourceText: input.sourceText ?? item.textOriginal,
          sourceType: item.sourceType,
          note: input.note,
          masteryStatus: input.masteryStatus
            ? VOCABULARY_MASTERY_STATUS_TO_PRISMA[input.masteryStatus]
            : undefined
        },
        include: studyItemDetailInclude.vocabularyItems.include
      });

      response.status(201).json({ item: toVocabularyDto(vocabulary) });
    })
  );

  return router;
}

async function assertStudyItemOwner(userId: string, itemId: string): Promise<void> {
  const item = await prisma.studyItem.findFirst({
    where: { id: itemId, userId },
    select: { id: true }
  });

  if (!item) {
    throw new ApiError(404, "STUDY_ITEM_NOT_FOUND", "Study item was not found");
  }
}

function parseTags(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((tag): tag is string => typeof tag === "string");
}

function getRequiredParam(value: string | undefined, label: string): string {
  if (!value) {
    throw new ApiError(400, "PARAM_REQUIRED", `${label} is required`);
  }

  return value;
}
