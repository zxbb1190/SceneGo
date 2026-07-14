import {
  QuizQuestionType as PrismaQuizQuestionType,
  ReviewAttemptResult as PrismaReviewAttemptResult,
  ReviewTargetType as PrismaReviewTargetType,
  type Prisma,
  type QuizItem
} from "@prisma/client";
import type {
  QuizQuestionJson,
  QuizQuestionType,
  ReviewAttemptResult,
  ReviewTargetType
} from "@scenego/shared";
import { quizQuestionJsonSchema } from "../adapters/ai/analysisSchema.js";
import { toStudyItemSummaryDto } from "./studyItemDtos.js";
import { studyItemSummaryInclude } from "./studyItemQueries.js";
import { toVocabularyDto } from "./vocabularyDtos.js";

export const REVIEW_TARGET_TYPE_TO_PRISMA = {
  study_item: PrismaReviewTargetType.STUDY_ITEM,
  vocabulary_item: PrismaReviewTargetType.VOCABULARY_ITEM
} satisfies Record<ReviewTargetType, PrismaReviewTargetType>;

export const PRISMA_TO_REVIEW_TARGET_TYPE = {
  [PrismaReviewTargetType.STUDY_ITEM]: "study_item",
  [PrismaReviewTargetType.VOCABULARY_ITEM]: "vocabulary_item"
} satisfies Record<PrismaReviewTargetType, ReviewTargetType>;

export const REVIEW_ATTEMPT_RESULT_TO_PRISMA = {
  known: PrismaReviewAttemptResult.KNOWN,
  fuzzy: PrismaReviewAttemptResult.FUZZY,
  unknown: PrismaReviewAttemptResult.UNKNOWN
} satisfies Record<ReviewAttemptResult, PrismaReviewAttemptResult>;

export const PRISMA_TO_REVIEW_ATTEMPT_RESULT = {
  [PrismaReviewAttemptResult.KNOWN]: "known",
  [PrismaReviewAttemptResult.FUZZY]: "fuzzy",
  [PrismaReviewAttemptResult.UNKNOWN]: "unknown"
} satisfies Record<PrismaReviewAttemptResult, ReviewAttemptResult>;

export const QUIZ_QUESTION_TYPE_TO_PRISMA = {
  multiple_choice: PrismaQuizQuestionType.MULTIPLE_CHOICE,
  fill_blank: PrismaQuizQuestionType.FILL_BLANK,
  short_answer: PrismaQuizQuestionType.SHORT_ANSWER
} satisfies Record<QuizQuestionType, PrismaQuizQuestionType>;

export const PRISMA_TO_QUIZ_QUESTION_TYPE = {
  [PrismaQuizQuestionType.MULTIPLE_CHOICE]: "multiple_choice",
  [PrismaQuizQuestionType.FILL_BLANK]: "fill_blank",
  [PrismaQuizQuestionType.SHORT_ANSWER]: "short_answer"
} satisfies Record<PrismaQuizQuestionType, QuizQuestionType>;

export const reviewVocabularyInclude = {
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

export const reviewTaskInclude = {
  studyItem: {
    include: studyItemSummaryInclude
  },
  vocabularyItem: {
    include: reviewVocabularyInclude
  },
  quizItems: {
    orderBy: { createdAt: "desc" },
    take: 1
  }
} satisfies Prisma.ReviewTaskInclude;

export const reviewAttemptInclude = {
  reviewTask: {
    include: reviewTaskInclude
  },
  studyItem: {
    include: studyItemSummaryInclude
  },
  vocabularyItem: {
    include: reviewVocabularyInclude
  },
  quizItem: true
} satisfies Prisma.ReviewAttemptInclude;

export type ReviewTaskRecord = Prisma.ReviewTaskGetPayload<{
  include: typeof reviewTaskInclude;
}>;

export type ReviewAttemptRecord = Prisma.ReviewAttemptGetPayload<{
  include: typeof reviewAttemptInclude;
}>;

export function toReviewTaskDto(task: ReviewTaskRecord) {
  return {
    id: task.id,
    userId: task.userId,
    targetType: PRISMA_TO_REVIEW_TARGET_TYPE[task.targetType],
    studyItemId: task.studyItemId ?? undefined,
    vocabularyItemId: task.vocabularyItemId ?? undefined,
    nextReviewAt: task.nextReviewAt.toISOString(),
    lastReviewedAt: task.lastReviewedAt?.toISOString(),
    intervalDays: task.intervalDays,
    attemptCount: task.attemptCount,
    target: {
      studyItem: task.studyItem ? toStudyItemSummaryDto(task.studyItem) : undefined,
      vocabularyItem: task.vocabularyItem ? toVocabularyDto(task.vocabularyItem) : undefined
    },
    latestQuiz: task.quizItems[0] ? toQuizItemDto(task.quizItems[0]) : undefined,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString()
  };
}

export function toReviewAttemptDto(attempt: ReviewAttemptRecord) {
  const task = attempt.reviewTask;
  return {
    id: attempt.id,
    userId: attempt.userId,
    reviewTaskId: attempt.reviewTaskId,
    studyItemId: attempt.studyItemId ?? undefined,
    vocabularyItemId: attempt.vocabularyItemId ?? undefined,
    quizItemId: attempt.quizItemId ?? undefined,
    result: PRISMA_TO_REVIEW_ATTEMPT_RESULT[attempt.result],
    userAnswer: attempt.userAnswer ?? undefined,
    isCorrect: attempt.isCorrect ?? undefined,
    targetType: PRISMA_TO_REVIEW_TARGET_TYPE[task.targetType],
    target: {
      studyItem: attempt.studyItem ? toStudyItemSummaryDto(attempt.studyItem) : undefined,
      vocabularyItem: attempt.vocabularyItem ? toVocabularyDto(attempt.vocabularyItem) : undefined
    },
    quiz: attempt.quizItem ? toQuizItemDto(attempt.quizItem) : undefined,
    createdAt: attempt.createdAt.toISOString()
  };
}

export function toQuizItemDto(item: QuizItem) {
  const parsedQuiz = quizQuestionJsonSchema.safeParse(item.quizJson);
  const quiz = parsedQuiz.success
    ? parsedQuiz.data
    : {
        questionType: PRISMA_TO_QUIZ_QUESTION_TYPE[item.questionType],
        prompt: item.questionText,
        choices: parseChoices(item.choices),
        answer: item.answer,
        explanation: item.explanation ?? ""
      };

  return {
    id: item.id,
    userId: item.userId,
    reviewTaskId: item.reviewTaskId ?? undefined,
    studyItemId: item.studyItemId ?? undefined,
    vocabularyItemId: item.vocabularyItemId ?? undefined,
    questionType: PRISMA_TO_QUIZ_QUESTION_TYPE[item.questionType],
    questionText: item.questionText,
    choices: parseChoices(item.choices),
    answer: item.answer,
    explanation: item.explanation ?? undefined,
    quiz: quiz as QuizQuestionJson,
    modelName: item.modelName ?? undefined,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString()
  };
}

function parseChoices(value: Prisma.JsonValue | null): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((choice): choice is string => typeof choice === "string");
}
