import {
  StudyItemMasteryStatus as PrismaStudyItemMasteryStatus,
  VocabularyMasteryStatus as PrismaVocabularyMasteryStatus,
  type Prisma
} from "@prisma/client";
import type { ReviewAttemptResult } from "@scenego/shared";
import { prisma } from "../db/prisma.js";
import { ApiError } from "../http/apiError.js";
import {
  REVIEW_ATTEMPT_RESULT_TO_PRISMA,
  REVIEW_TARGET_TYPE_TO_PRISMA,
  reviewAttemptInclude,
  reviewTaskInclude
} from "../routes/reviewDtos.js";

export interface NextReviewPlan {
  masteryStatus: "new" | "learning" | "mastered";
  intervalDays: number;
  nextReviewAt: Date;
}

export interface SubmitReviewAttemptInput {
  userId: string;
  taskId: string;
  result: ReviewAttemptResult;
  quizItemId?: string;
  userAnswer?: string;
  isCorrect?: boolean;
}

export async function ensureReviewTasksForUser(userId: string): Promise<void> {
  const now = new Date();
  const [studyItems, vocabularyItems] = await Promise.all([
    prisma.studyItem.findMany({
      where: {
        userId,
        reviewTasks: {
          none: {
            userId
          }
        }
      },
      select: {
        id: true,
        createdAt: true
      }
    }),
    prisma.vocabularyItem.findMany({
      where: {
        userId,
        reviewTasks: {
          none: {
            userId
          }
        }
      },
      select: {
        id: true,
        createdAt: true
      }
    })
  ]);

  const taskData: Prisma.ReviewTaskCreateManyInput[] = [
    ...studyItems.map((item) => ({
      userId,
      targetType: REVIEW_TARGET_TYPE_TO_PRISMA.study_item,
      studyItemId: item.id,
      nextReviewAt: item.createdAt <= now ? now : item.createdAt
    })),
    ...vocabularyItems.map((item) => ({
      userId,
      targetType: REVIEW_TARGET_TYPE_TO_PRISMA.vocabulary_item,
      vocabularyItemId: item.id,
      nextReviewAt: item.createdAt <= now ? now : item.createdAt
    }))
  ];

  if (!taskData.length) {
    return;
  }

  await prisma.reviewTask.createMany({
    data: taskData,
    skipDuplicates: true
  });
}

export async function ensureReviewTaskForStudyItem(userId: string, studyItemId: string) {
  const existing = await prisma.reviewTask.findFirst({
    where: {
      userId,
      studyItemId
    },
    include: reviewTaskInclude
  });

  if (existing) {
    return existing;
  }

  return prisma.reviewTask.create({
    data: {
      userId,
      targetType: REVIEW_TARGET_TYPE_TO_PRISMA.study_item,
      studyItemId,
      nextReviewAt: new Date()
    },
    include: reviewTaskInclude
  });
}

export async function ensureReviewTaskForVocabularyItem(userId: string, vocabularyItemId: string) {
  const existing = await prisma.reviewTask.findFirst({
    where: {
      userId,
      vocabularyItemId
    },
    include: reviewTaskInclude
  });

  if (existing) {
    return existing;
  }

  return prisma.reviewTask.create({
    data: {
      userId,
      targetType: REVIEW_TARGET_TYPE_TO_PRISMA.vocabulary_item,
      vocabularyItemId,
      nextReviewAt: new Date()
    },
    include: reviewTaskInclude
  });
}

export async function submitReviewAttempt(input: SubmitReviewAttemptInput) {
  const task = await prisma.reviewTask.findFirst({
    where: {
      id: input.taskId,
      userId: input.userId
    },
    select: {
      id: true,
      userId: true,
      studyItemId: true,
      vocabularyItemId: true,
      intervalDays: true
    }
  });

  if (!task) {
    throw new ApiError(404, "REVIEW_TASK_NOT_FOUND", "Review task was not found");
  }

  if (input.quizItemId) {
    const quizItem = await prisma.quizItem.findFirst({
      where: {
        id: input.quizItemId,
        userId: input.userId,
        reviewTaskId: task.id
      },
      select: {
        id: true
      }
    });

    if (!quizItem) {
      throw new ApiError(404, "QUIZ_ITEM_NOT_FOUND", "Quiz item was not found");
    }
  }

  const now = new Date();
  const plan = calculateNextReviewPlan(input.result, task.intervalDays, now);
  const attemptResult = REVIEW_ATTEMPT_RESULT_TO_PRISMA[input.result];

  const result = await prisma.$transaction(async (tx) => {
    const attempt = await tx.reviewAttempt.create({
      data: {
        userId: input.userId,
        reviewTaskId: task.id,
        studyItemId: task.studyItemId,
        vocabularyItemId: task.vocabularyItemId,
        quizItemId: input.quizItemId,
        result: attemptResult,
        userAnswer: input.userAnswer,
        isCorrect: input.isCorrect
      }
    });

    await tx.reviewTask.update({
      where: {
        id: task.id
      },
      data: {
        nextReviewAt: plan.nextReviewAt,
        lastReviewedAt: now,
        intervalDays: plan.intervalDays,
        attemptCount: {
          increment: 1
        }
      }
    });

    if (task.studyItemId) {
      await tx.studyItem.update({
        where: {
          id: task.studyItemId
        },
        data: {
          masteryStatus: toPrismaStudyItemMasteryStatus(plan.masteryStatus),
          reviewCount: {
            increment: 1
          },
          lastViewedAt: now
        }
      });
    }

    if (task.vocabularyItemId) {
      await tx.vocabularyItem.update({
        where: {
          id: task.vocabularyItemId
        },
        data: {
          masteryStatus: toPrismaVocabularyMasteryStatus(plan.masteryStatus)
        }
      });
    }

    return {
      attempt,
      task: await tx.reviewTask.findUniqueOrThrow({
        where: {
          id: task.id
        },
        include: reviewTaskInclude
      })
    };
  });

  const attempt = await prisma.reviewAttempt.findUniqueOrThrow({
    where: {
      id: result.attempt.id
    },
    include: reviewAttemptInclude
  });

  return {
    task: result.task,
    attempt
  };
}

export function calculateNextReviewPlan(
  result: ReviewAttemptResult,
  currentIntervalDays: number,
  now = new Date()
): NextReviewPlan {
  if (result === "known") {
    const intervalDays = currentIntervalDays > 0 ? Math.min(currentIntervalDays * 2, 30) : 3;
    return {
      masteryStatus: "mastered",
      intervalDays,
      nextReviewAt: startOfDayAfter(now, intervalDays)
    };
  }

  if (result === "fuzzy") {
    return {
      masteryStatus: "learning",
      intervalDays: 1,
      nextReviewAt: startOfDayAfter(now, 1)
    };
  }

  return {
    masteryStatus: "new",
    intervalDays: 1,
    nextReviewAt: startOfDayAfter(now, 1)
  };
}

export function scoreQuizAnswer(userAnswer: string, expectedAnswer: string): boolean {
  return normalizeAnswer(userAnswer) === normalizeAnswer(expectedAnswer);
}

function startOfDayAfter(date: Date, days: number): Date {
  const nextDate = new Date(date);
  nextDate.setHours(0, 0, 0, 0);
  nextDate.setDate(nextDate.getDate() + Math.max(1, days));
  return nextDate;
}

function normalizeAnswer(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[，。！？、,.!?;:：；"'`“”‘’()\[\]\s]+/g, "");
}

function toPrismaStudyItemMasteryStatus(status: NextReviewPlan["masteryStatus"]) {
  if (status === "mastered") {
    return PrismaStudyItemMasteryStatus.MASTERED;
  }

  if (status === "learning") {
    return PrismaStudyItemMasteryStatus.LEARNING;
  }

  return PrismaStudyItemMasteryStatus.NEW;
}

function toPrismaVocabularyMasteryStatus(status: NextReviewPlan["masteryStatus"]) {
  if (status === "mastered") {
    return PrismaVocabularyMasteryStatus.MASTERED;
  }

  if (status === "learning") {
    return PrismaVocabularyMasteryStatus.LEARNING;
  }

  return PrismaVocabularyMasteryStatus.NEW;
}
