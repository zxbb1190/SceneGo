import { Prisma } from "@prisma/client";
import { prisma } from "../db/prisma.js";
import { ApiError } from "../http/apiError.js";

export const studyItemDetailInclude = {
  analysis: true,
  notes: {
    orderBy: { updatedAt: "desc" }
  },
  vocabularyItems: {
    include: {
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
    },
    orderBy: { updatedAt: "desc" }
  },
  _count: {
    select: {
      vocabularyItems: true
    }
  }
} satisfies Prisma.StudyItemInclude;

export const studyItemSummaryInclude = {
  analysis: true,
  notes: {
    orderBy: { updatedAt: "desc" },
    take: 1
  },
  _count: {
    select: {
      vocabularyItems: true
    }
  }
} satisfies Prisma.StudyItemInclude;

export async function findStudyItemDetailOrThrow(userId: string, itemId: string) {
  const item = await prisma.studyItem.findFirst({
    where: {
      id: itemId,
      userId
    },
    include: studyItemDetailInclude
  });

  if (!item) {
    throw new ApiError(404, "STUDY_ITEM_NOT_FOUND", "Study item was not found");
  }

  return item;
}
