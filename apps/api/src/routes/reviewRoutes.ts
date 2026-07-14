import {
  Prisma,
  ReviewAttemptResult as PrismaReviewAttemptResult,
  StudyItemMasteryStatus as PrismaStudyItemMasteryStatus,
  VocabularyMasteryStatus as PrismaVocabularyMasteryStatus
} from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { textAnalysisJsonSchema } from "../adapters/ai/analysisSchema.js";
import { createAiProvider } from "../adapters/ai/providerFactory.js";
import { prisma } from "../db/prisma.js";
import { ApiError } from "../http/apiError.js";
import { asyncHandler } from "../http/asyncHandler.js";
import { getAuth, requireAuth } from "../middleware/auth.js";
import {
  ensureReviewTaskForStudyItem,
  ensureReviewTaskForVocabularyItem,
  ensureReviewTasksForUser,
  scoreQuizAnswer,
  submitReviewAttempt
} from "../services/reviewService.js";
import {
  QUIZ_QUESTION_TYPE_TO_PRISMA,
  reviewAttemptInclude,
  reviewTaskInclude,
  reviewVocabularyInclude,
  toQuizItemDto,
  toReviewAttemptDto,
  toReviewTaskDto
} from "./reviewDtos.js";

const reviewAttemptResultSchema = z.enum(["known", "fuzzy", "unknown"]);
const reviewTargetTypeSchema = z.enum(["study_item", "vocabulary_item"]);

const submitAttemptSchema = z.object({
  result: reviewAttemptResultSchema,
  quizItemId: z.string().uuid().optional(),
  userAnswer: z.string().trim().max(10_000).optional(),
  isCorrect: z.boolean().optional()
});

const generateQuizSchema = z.object({
  sourceType: reviewTargetTypeSchema,
  sourceId: z.string().uuid()
});

const answerQuizSchema = z.object({
  userAnswer: z.string().trim().min(1).max(10_000),
  result: reviewAttemptResultSchema.optional()
});

export function createReviewRouter(): Router {
  const router = Router();

  router.use(requireAuth);

  router.get(
    "/today",
    asyncHandler(async (request, response) => {
      const { userId } = getAuth(request);
      await ensureReviewTasksForUser(userId);

      const tasks = await prisma.reviewTask.findMany({
        where: {
          userId,
          nextReviewAt: {
            lte: endOfToday()
          }
        },
        include: reviewTaskInclude,
        orderBy: [{ nextReviewAt: "asc" }, { createdAt: "asc" }],
        take: 200
      });
      const taskDtos = tasks.map(toReviewTaskDto);

      response.json({
        tasks: taskDtos,
        summary: {
          dueCount: taskDtos.length,
          vocabularyCount: taskDtos.filter((task) => task.targetType === "vocabulary_item").length,
          studyItemCount: taskDtos.filter((task) => task.targetType === "study_item").length
        }
      });
    })
  );

  router.post(
    "/tasks/:taskId/attempts",
    asyncHandler(async (request, response) => {
      const { userId } = getAuth(request);
      const taskId = getRequiredParam(request.params.taskId, "Review task id");
      const input = submitAttemptSchema.parse(request.body);
      const result = await submitReviewAttempt({
        userId,
        taskId,
        result: input.result,
        quizItemId: input.quizItemId,
        userAnswer: input.userAnswer,
        isCorrect: input.isCorrect
      });

      response.status(201).json({
        task: toReviewTaskDto(result.task),
        attempt: toReviewAttemptDto(result.attempt)
      });
    })
  );

  router.post(
    "/quiz",
    asyncHandler(async (request, response) => {
      const { userId } = getAuth(request);
      const input = generateQuizSchema.parse(request.body);
      const provider = createAiProvider();

      if (!provider) {
        throw new ApiError(
          503,
          "AI_PROVIDER_NOT_CONFIGURED",
          "AI provider is not configured. Set OPENAI_COMPATIBLE_BASE_URL, OPENAI_COMPATIBLE_API_KEY, and AI_MODEL."
        );
      }

      const source = await loadQuizSource(userId, input.sourceType, input.sourceId);
      const aiResult = await provider.generateQuiz({
        userId,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        language: source.language,
        text: source.text,
        meaning: source.meaning,
        context: source.context
      });
      const quiz = await prisma.quizItem.create({
        data: {
          userId,
          reviewTaskId: source.task.id,
          studyItemId: source.studyItemId,
          vocabularyItemId: source.vocabularyItemId,
          questionType: QUIZ_QUESTION_TYPE_TO_PRISMA[aiResult.quiz.questionType],
          questionText: aiResult.quiz.prompt,
          choices: aiResult.quiz.choices ? (aiResult.quiz.choices as Prisma.InputJsonArray) : undefined,
          answer: aiResult.quiz.answer,
          explanation: aiResult.quiz.explanation,
          quizJson: aiResult.quiz as unknown as Prisma.InputJsonObject,
          modelName: aiResult.modelName
        }
      });

      await prisma.aiUsageLog.create({
        data: {
          userId,
          studyItemId: source.studyItemId,
          actionType: "quiz_generation",
          sourceType: source.studySourceType,
          modelName: aiResult.modelName,
          inputTokens: aiResult.usage?.inputTokens,
          outputTokens: aiResult.usage?.outputTokens,
          totalTokens: aiResult.usage?.totalTokens
        }
      });

      const task = await prisma.reviewTask.findUniqueOrThrow({
        where: {
          id: source.task.id
        },
        include: reviewTaskInclude
      });

      response.status(201).json({
        task: toReviewTaskDto(task),
        quiz: toQuizItemDto(quiz)
      });
    })
  );

  router.post(
    "/quiz/:quizItemId/answer",
    asyncHandler(async (request, response) => {
      const { userId } = getAuth(request);
      const quizItemId = getRequiredParam(request.params.quizItemId, "Quiz item id");
      const input = answerQuizSchema.parse(request.body);
      const quiz = await prisma.quizItem.findFirst({
        where: {
          id: quizItemId,
          userId
        },
        select: {
          id: true,
          reviewTaskId: true,
          answer: true
        }
      });

      if (!quiz) {
        throw new ApiError(404, "QUIZ_ITEM_NOT_FOUND", "Quiz item was not found");
      }

      if (!quiz.reviewTaskId) {
        throw new ApiError(400, "QUIZ_TASK_MISSING", "Quiz item is not attached to a review task");
      }

      const isCorrect = scoreQuizAnswer(input.userAnswer, quiz.answer);
      const result = await submitReviewAttempt({
        userId,
        taskId: quiz.reviewTaskId,
        quizItemId: quiz.id,
        result: input.result ?? (isCorrect ? "known" : "unknown"),
        userAnswer: input.userAnswer,
        isCorrect
      });

      response.status(201).json({
        task: toReviewTaskDto(result.task),
        attempt: toReviewAttemptDto(result.attempt)
      });
    })
  );

  router.get(
    "/mistakes",
    asyncHandler(async (request, response) => {
      const { userId } = getAuth(request);
      const attempts = await prisma.reviewAttempt.findMany({
        where: {
          userId,
          OR: [
            {
              result: {
                not: PrismaReviewAttemptResult.KNOWN
              }
            },
            {
              isCorrect: false
            }
          ]
        },
        include: reviewAttemptInclude,
        orderBy: {
          createdAt: "desc"
        },
        take: 100
      });

      response.json({
        attempts: attempts.map(toReviewAttemptDto)
      });
    })
  );

  router.get(
    "/report",
    asyncHandler(async (request, response) => {
      const { userId } = getAuth(request);
      await ensureReviewTasksForUser(userId);
      const todayStart = startOfToday();
      const todayEnd = endOfToday();
      const todayAttemptWhere = {
        userId,
        createdAt: {
          gte: todayStart,
          lte: todayEnd
        }
      };
      const [
        todayStudyItems,
        todayVocabularyItems,
        todayReviewAttempts,
        todayKnownAttempts,
        todayFuzzyAttempts,
        todayUnknownAttempts,
        dueToday,
        masteredStudyItems,
        masteredVocabularyItems,
        mistakeAttempts
      ] = await Promise.all([
        prisma.studyItem.count({
          where: {
            userId,
            createdAt: { gte: todayStart, lte: todayEnd }
          }
        }),
        prisma.vocabularyItem.count({
          where: {
            userId,
            createdAt: { gte: todayStart, lte: todayEnd }
          }
        }),
        prisma.reviewAttempt.count({ where: todayAttemptWhere }),
        prisma.reviewAttempt.count({
          where: { ...todayAttemptWhere, result: PrismaReviewAttemptResult.KNOWN }
        }),
        prisma.reviewAttempt.count({
          where: { ...todayAttemptWhere, result: PrismaReviewAttemptResult.FUZZY }
        }),
        prisma.reviewAttempt.count({
          where: { ...todayAttemptWhere, result: PrismaReviewAttemptResult.UNKNOWN }
        }),
        prisma.reviewTask.count({
          where: {
            userId,
            nextReviewAt: { lte: todayEnd }
          }
        }),
        prisma.studyItem.count({
          where: {
            userId,
            masteryStatus: PrismaStudyItemMasteryStatus.MASTERED
          }
        }),
        prisma.vocabularyItem.count({
          where: {
            userId,
            masteryStatus: PrismaVocabularyMasteryStatus.MASTERED
          }
        }),
        prisma.reviewAttempt.count({
          where: {
            userId,
            OR: [
              {
                result: {
                  not: PrismaReviewAttemptResult.KNOWN
                }
              },
              {
                isCorrect: false
              }
            ]
          }
        })
      ]);

      response.json({
        report: {
          todayStudyItems,
          todayVocabularyItems,
          todayReviewAttempts,
          todayKnownAttempts,
          todayFuzzyAttempts,
          todayUnknownAttempts,
          dueToday,
          masteredStudyItems,
          masteredVocabularyItems,
          mistakeAttempts
        }
      });
    })
  );

  return router;
}

async function loadQuizSource(userId: string, sourceType: "study_item" | "vocabulary_item", sourceId: string) {
  if (sourceType === "study_item") {
    const studyItem = await prisma.studyItem.findFirst({
      where: {
        id: sourceId,
        userId
      },
      include: {
        analysis: true
      }
    });

    if (!studyItem) {
      throw new ApiError(404, "STUDY_ITEM_NOT_FOUND", "Study item was not found");
    }

    const task = await ensureReviewTaskForStudyItem(userId, studyItem.id);
    const analysis = studyItem.analysis?.analysisJson
      ? textAnalysisJsonSchema.safeParse(studyItem.analysis.analysisJson)
      : null;

    return {
      task,
      studyItemId: studyItem.id,
      vocabularyItemId: undefined,
      studySourceType: studyItem.sourceType,
      language: studyItem.language,
      text: studyItem.textOriginal,
      meaning: analysis?.success ? analysis.data.translation : undefined,
      context: analysis?.success
        ? JSON.stringify({
            summary: analysis.data.summary,
            chunks: analysis.data.chunks.slice(0, 4),
            vocabulary: analysis.data.vocabulary.slice(0, 6)
          })
        : studyItem.sourceNote ?? undefined
    };
  }

  const vocabulary = await prisma.vocabularyItem.findFirst({
    where: {
      id: sourceId,
      userId
    },
    include: reviewVocabularyInclude
  });

  if (!vocabulary) {
    throw new ApiError(404, "VOCABULARY_ITEM_NOT_FOUND", "Vocabulary item was not found");
  }

  const task = await ensureReviewTaskForVocabularyItem(userId, vocabulary.id);

  return {
    task,
    studyItemId: vocabulary.studyItemId ?? undefined,
    vocabularyItemId: vocabulary.id,
    studySourceType: vocabulary.sourceType ?? undefined,
    language: vocabulary.language,
    text: vocabulary.word,
    meaning: vocabulary.meaning ?? undefined,
    context: vocabulary.sourceText ?? vocabulary.subtitleLine?.textOriginal ?? vocabulary.studyItem?.textOriginal
  };
}

function startOfToday(): Date {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfToday(): Date {
  const date = new Date();
  date.setHours(23, 59, 59, 999);
  return date;
}

function getRequiredParam(value: string | undefined, label: string): string {
  if (!value) {
    throw new ApiError(400, "PARAM_REQUIRED", `${label} is required`);
  }

  return value;
}
