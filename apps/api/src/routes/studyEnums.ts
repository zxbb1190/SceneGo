import {
  StudyItemMasteryStatus as PrismaStudyItemMasteryStatus,
  StudyItemType as PrismaStudyItemType,
  StudySourceType as PrismaStudySourceType
} from "@prisma/client";
import type { StudyItemMasteryStatus, StudyItemType, StudySourceType } from "@scenego/shared";

export const STUDY_ITEM_TYPE_TO_PRISMA = {
  word: PrismaStudyItemType.WORD,
  phrase: PrismaStudyItemType.PHRASE,
  sentence: PrismaStudyItemType.SENTENCE,
  paragraph: PrismaStudyItemType.PARAGRAPH,
  mixed: PrismaStudyItemType.MIXED
} satisfies Record<StudyItemType, PrismaStudyItemType>;

export const PRISMA_TO_STUDY_ITEM_TYPE = {
  [PrismaStudyItemType.WORD]: "word",
  [PrismaStudyItemType.PHRASE]: "phrase",
  [PrismaStudyItemType.SENTENCE]: "sentence",
  [PrismaStudyItemType.PARAGRAPH]: "paragraph",
  [PrismaStudyItemType.MIXED]: "mixed"
} satisfies Record<PrismaStudyItemType, StudyItemType>;

export const STUDY_SOURCE_TYPE_TO_PRISMA = {
  manual_input: PrismaStudySourceType.MANUAL_INPUT,
  video_subtitle: PrismaStudySourceType.VIDEO_SUBTITLE,
  external_manual: PrismaStudySourceType.EXTERNAL_MANUAL
} satisfies Record<StudySourceType, PrismaStudySourceType>;

export const PRISMA_TO_STUDY_SOURCE_TYPE = {
  [PrismaStudySourceType.MANUAL_INPUT]: "manual_input",
  [PrismaStudySourceType.VIDEO_SUBTITLE]: "video_subtitle",
  [PrismaStudySourceType.EXTERNAL_MANUAL]: "external_manual"
} satisfies Record<PrismaStudySourceType, StudySourceType>;

export const STUDY_ITEM_MASTERY_STATUS_TO_PRISMA = {
  new: PrismaStudyItemMasteryStatus.NEW,
  learning: PrismaStudyItemMasteryStatus.LEARNING,
  mastered: PrismaStudyItemMasteryStatus.MASTERED
} satisfies Record<StudyItemMasteryStatus, PrismaStudyItemMasteryStatus>;

export const PRISMA_TO_STUDY_ITEM_MASTERY_STATUS = {
  [PrismaStudyItemMasteryStatus.NEW]: "new",
  [PrismaStudyItemMasteryStatus.LEARNING]: "learning",
  [PrismaStudyItemMasteryStatus.MASTERED]: "mastered"
} satisfies Record<PrismaStudyItemMasteryStatus, StudyItemMasteryStatus>;
