import { Router } from "express";
import { z } from "zod";
import { parseSubtitle, type SubtitleFormat } from "@scenego/subtitles";
import { prisma } from "../db/prisma.js";
import { ApiError } from "../http/apiError.js";
import { asyncHandler } from "../http/asyncHandler.js";
import { getAuth, requireAuth } from "../middleware/auth.js";
import { validateProjectSource, validateProjectSourceUpdate } from "./projectSourceValidation.js";
import {
  LEARNED_SENTENCE_STATUSES,
  PRISMA_TO_SOURCE_TYPE,
  PROJECT_STATUS_TO_PRISMA,
  SOURCE_TYPE_TO_PRISMA,
  type ProjectDetailRecord,
  type ProjectWithSubtitleCount,
  toProjectDto,
  toSubtitleLineDto
} from "./projectDtos.js";

const sourceTypeSchema = z.enum([
  "local_file",
  "network_url",
  "external_embed",
  "official_licensed",
  "public_domain",
  "creative_commons"
]);

const projectStatusSchema = z.enum(["active", "archived"]);
const subtitleFormatSchema = z.enum(["srt", "vtt"]);

const createProjectSchema = z.object({
  title: z.string().trim().min(1).max(255),
  language: z.string().trim().min(2).max(20),
  sourceType: sourceTypeSchema,
  sourceUrl: z.string().trim().url().max(2048).optional(),
  videoFileName: z.string().trim().min(1).max(255).optional(),
  subtitleFileName: z.string().trim().min(1).max(255).optional(),
  subtitleText: z.string().min(1).max(4_000_000).optional(),
  subtitleFormat: subtitleFormatSchema.optional(),
  duration: z.number().nonnegative().optional()
});

const updateProjectSchema = z
  .object({
    title: z.string().trim().min(1).max(255).optional(),
    language: z.string().trim().min(2).max(20).optional(),
    sourceUrl: z.string().trim().url().max(2048).nullable().optional(),
    videoFileName: z.string().trim().min(1).max(255).nullable().optional(),
    subtitleFileName: z.string().trim().min(1).max(255).nullable().optional(),
    duration: z.number().nonnegative().nullable().optional(),
    lastPosition: z.number().nonnegative().optional(),
    status: projectStatusSchema.optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required"
  });

const importSubtitleSchema = z.object({
  subtitleText: z.string().min(1).max(4_000_000),
  subtitleFileName: z.string().trim().min(1).max(255).optional(),
  subtitleFormat: subtitleFormatSchema.optional()
});

const updateProgressSchema = z.object({
  lastPosition: z.number().nonnegative(),
  duration: z.number().nonnegative().nullable().optional()
});

export function createProjectRouter(): Router {
  const router = Router();

  router.use(requireAuth);

  router.get(
    "/",
    asyncHandler(async (request, response) => {
      const { userId } = getAuth(request);
      const projects = await prisma.learningProject.findMany({
        where: { userId },
        orderBy: { updatedAt: "desc" },
        include: {
          _count: {
            select: { subtitleLines: true }
          }
        }
      });
      const counts = await loadProjectCounts(userId, projects.map((project) => project.id));

      response.json({
        projects: projects.map((project) => toProjectDto(project, counts.get(project.id)))
      });
    })
  );

  router.post(
    "/",
    asyncHandler(async (request, response) => {
      const { userId } = getAuth(request);
      const input = createProjectSchema.parse(request.body);
      validateProjectSource(input);
      const parsedLines = input.subtitleText
        ? parseSubtitle(input.subtitleText, input.subtitleFormat as SubtitleFormat | undefined)
        : [];

      if (input.subtitleText && parsedLines.length === 0) {
        throw new ApiError(400, "NO_SUBTITLE_LINES", "Subtitle text did not contain valid subtitle cues");
      }

      const project = await prisma.$transaction(async (tx) => {
        const createdProject = await tx.learningProject.create({
          data: {
            userId,
            title: input.title,
            language: input.language,
            sourceType: SOURCE_TYPE_TO_PRISMA[input.sourceType],
            sourceUrl: input.sourceUrl,
            videoFileName: input.videoFileName,
            subtitleFileName: input.subtitleFileName,
            duration: input.duration
          }
        });

        if (parsedLines.length > 0) {
          await tx.subtitleLine.createMany({
            data: parsedLines.map((line) => ({
              projectId: createdProject.id,
              lineIndex: line.lineIndex,
              startTime: line.startTime,
              endTime: line.endTime,
              textOriginal: line.textOriginal,
              textTranslation: line.textTranslation
            }))
          });
        }

        return tx.learningProject.findUniqueOrThrow({
          where: { id: createdProject.id },
          include: {
            _count: {
              select: { subtitleLines: true }
            }
          }
        });
      });

      response.status(201).json({ project: toProjectDto(project) });
    })
  );

  router.get(
    "/:projectId",
    asyncHandler(async (request, response) => {
      const { userId } = getAuth(request);
      const projectId = getProjectIdParam(request.params.projectId);
      const project = await loadProjectDetail(userId, projectId);
      const counts = await loadProjectCounts(userId, [project.id]);

      response.json({
        project: toProjectDto(project, counts.get(project.id)),
        subtitleLines: project.subtitleLines.map(toSubtitleLineDto)
      });
    })
  );

  router.patch(
    "/:projectId",
    asyncHandler(async (request, response) => {
      const { userId } = getAuth(request);
      const input = updateProjectSchema.parse(request.body);
      const projectId = getProjectIdParam(request.params.projectId);
      const existingProject = await assertProjectOwner(userId, projectId);
      validateProjectSourceUpdate({
        sourceType: PRISMA_TO_SOURCE_TYPE[existingProject.sourceType],
        sourceUrl: input.sourceUrl,
        videoFileName: input.videoFileName
      });

      const project = await prisma.learningProject.update({
        where: { id: projectId },
        data: {
          title: input.title,
          language: input.language,
          sourceUrl: input.sourceUrl,
          videoFileName: input.videoFileName,
          subtitleFileName: input.subtitleFileName,
          duration: input.duration,
          lastPosition: input.lastPosition,
          status: input.status ? PROJECT_STATUS_TO_PRISMA[input.status] : undefined
        },
        include: {
          _count: {
            select: { subtitleLines: true }
          }
        }
      });
      const counts = await loadProjectCounts(userId, [project.id]);

      response.json({ project: toProjectDto(project, counts.get(project.id)) });
    })
  );

  router.patch(
    "/:projectId/progress",
    asyncHandler(async (request, response) => {
      const { userId } = getAuth(request);
      const input = updateProgressSchema.parse(request.body);
      const projectId = getProjectIdParam(request.params.projectId);
      await assertProjectOwner(userId, projectId);

      const project = await prisma.learningProject.update({
        where: { id: projectId },
        data: {
          lastPosition: input.lastPosition,
          duration: input.duration
        },
        include: {
          _count: {
            select: { subtitleLines: true }
          }
        }
      });
      const counts = await loadProjectCounts(userId, [project.id]);

      response.json({ project: toProjectDto(project, counts.get(project.id)) });
    })
  );

  router.post(
    "/:projectId/subtitles",
    asyncHandler(async (request, response) => {
      const { userId } = getAuth(request);
      const input = importSubtitleSchema.parse(request.body);
      const projectId = getProjectIdParam(request.params.projectId);
      const existingProject = await assertProjectOwner(userId, projectId);

      if (existingProject.sourceType === SOURCE_TYPE_TO_PRISMA.external_embed) {
        throw new ApiError(
          400,
          "EXTERNAL_MODE_MANUAL_ONLY",
          "External companion mode does not import full subtitle files"
        );
      }

      const parsedLines = parseSubtitle(input.subtitleText, input.subtitleFormat as SubtitleFormat | undefined);
      if (parsedLines.length === 0) {
        throw new ApiError(400, "NO_SUBTITLE_LINES", "Subtitle text did not contain valid subtitle cues");
      }

      const project = await prisma.$transaction(async (tx) => {
        await tx.sentenceAnalysis.deleteMany({
          where: {
            projectId: existingProject.id,
            subtitleLineId: { not: null }
          }
        });
        await tx.userSentenceProgress.deleteMany({
          where: {
            projectId: existingProject.id,
            subtitleLineId: { not: null }
          }
        });
        await tx.subtitleLine.deleteMany({ where: { projectId: existingProject.id } });
        await tx.subtitleLine.createMany({
          data: parsedLines.map((line) => ({
            projectId: existingProject.id,
            lineIndex: line.lineIndex,
            startTime: line.startTime,
            endTime: line.endTime,
            textOriginal: line.textOriginal,
            textTranslation: line.textTranslation
          }))
        });

        return tx.learningProject.update({
          where: { id: existingProject.id },
          data: { subtitleFileName: input.subtitleFileName },
          include: {
            subtitleLines: {
              orderBy: { lineIndex: "asc" }
            },
            _count: {
              select: { subtitleLines: true }
            }
          }
        });
      });
      const counts = await loadProjectCounts(userId, [project.id]);

      response.json({
        project: toProjectDto(project, counts.get(project.id)),
        subtitleLines: project.subtitleLines.map(toSubtitleLineDto)
      });
    })
  );

  router.delete(
    "/:projectId",
    asyncHandler(async (request, response) => {
      const { userId } = getAuth(request);
      const projectId = getProjectIdParam(request.params.projectId);
      await assertProjectOwner(userId, projectId);
      await prisma.learningProject.delete({ where: { id: projectId } });
      response.status(204).send();
    })
  );

  return router;
}

function getProjectIdParam(projectId: string | undefined): string {
  if (!projectId) {
    throw new ApiError(400, "PROJECT_ID_REQUIRED", "Project id is required");
  }

  return projectId;
}

async function assertProjectOwner(userId: string, projectId: string) {
  const project = await prisma.learningProject.findFirst({
    where: { id: projectId, userId },
    select: {
      id: true,
      sourceType: true
    }
  });

  if (!project) {
    throw new ApiError(404, "PROJECT_NOT_FOUND", "Project was not found");
  }

  return project;
}

async function loadProjectDetail(userId: string, projectId: string): Promise<ProjectDetailRecord> {
  const project = await prisma.learningProject.findFirst({
    where: { id: projectId, userId },
    include: {
      subtitleLines: {
        orderBy: { lineIndex: "asc" }
      },
      _count: {
        select: { subtitleLines: true }
      }
    }
  });

  if (!project) {
    throw new ApiError(404, "PROJECT_NOT_FOUND", "Project was not found");
  }

  return project;
}

async function loadProjectCounts(userId: string, projectIds: string[]) {
  if (projectIds.length === 0) {
    return new Map<string, { learnedSentenceCount: number; favoriteSentenceCount: number; vocabularyCount: number }>();
  }

  const [learnedCounts, favoriteCounts, vocabularyCounts] = await Promise.all([
    prisma.userSentenceProgress.groupBy({
      by: ["projectId"],
      where: {
        userId,
        projectId: { in: projectIds },
        status: { in: [...LEARNED_SENTENCE_STATUSES] }
      },
      _count: { _all: true }
    }),
    prisma.userSentenceProgress.groupBy({
      by: ["projectId"],
      where: {
        userId,
        projectId: { in: projectIds },
        isFavorite: true
      },
      _count: { _all: true }
    }),
    prisma.vocabularyItem.groupBy({
      by: ["projectId"],
      where: {
        userId,
        projectId: { in: projectIds }
      },
      _count: { _all: true }
    })
  ]);

  const counts = new Map<string, { learnedSentenceCount: number; favoriteSentenceCount: number; vocabularyCount: number }>();

  for (const projectId of projectIds) {
    counts.set(projectId, {
      learnedSentenceCount: learnedCounts.find((item) => item.projectId === projectId)?._count._all ?? 0,
      favoriteSentenceCount: favoriteCounts.find((item) => item.projectId === projectId)?._count._all ?? 0,
      vocabularyCount: vocabularyCounts.find((item) => item.projectId === projectId)?._count._all ?? 0
    });
  }

  return counts;
}
