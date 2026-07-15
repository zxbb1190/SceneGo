export const SOURCE_TYPES = [
  "local_file",
  "network_url",
  "external_embed",
  "official_licensed",
  "public_domain",
  "creative_commons"
] as const;

export type SourceType = (typeof SOURCE_TYPES)[number];

export type ProjectStatus = "active" | "archived";

export type SentenceProgressStatus = "viewed" | "learning" | "mastered";

export type VocabularyMasteryStatus = "new" | "learning" | "mastered";

export type StudyItemType = "word" | "phrase" | "sentence" | "paragraph" | "mixed";

export type StudySourceType = "manual_input" | "video_subtitle" | "external_manual";

export type StudyItemMasteryStatus = "new" | "learning" | "mastered";

export type ReviewTargetType = "study_item" | "vocabulary_item";

export type ReviewAttemptResult = "known" | "fuzzy" | "unknown";

export interface User {
  id: string;
  email: string;
  nickname?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LearningProject {
  id: string;
  userId: string;
  title: string;
  language: string;
  sourceType: SourceType;
  sourceUrl?: string;
  videoFileName?: string;
  subtitleFileName?: string;
  duration?: number;
  lastPosition: number;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
}

export interface LearningProjectSummary extends LearningProject {
  subtitleLineCount: number;
  learnedSentenceCount: number;
  favoriteSentenceCount: number;
  vocabularyCount: number;
}

export interface CreateLearningProjectInput {
  title: string;
  language: string;
  sourceType: SourceType;
  sourceUrl?: string;
  videoFileName?: string;
  subtitleFileName?: string;
  subtitleText?: string;
  subtitleFormat?: "srt" | "vtt";
  duration?: number;
}

export interface UpdateLearningProjectInput {
  title?: string;
  language?: string;
  sourceUrl?: string | null;
  videoFileName?: string | null;
  subtitleFileName?: string | null;
  duration?: number | null;
  lastPosition?: number;
  status?: ProjectStatus;
}

export interface ImportProjectSubtitlesInput {
  subtitleText: string;
  subtitleFileName?: string;
  subtitleFormat?: "srt" | "vtt";
}

export interface SubtitleLine {
  id: string;
  projectId: string;
  lineIndex: number;
  startTime: number;
  endTime: number;
  textOriginal: string;
  textTranslation?: string;
  createdAt: string;
}

export interface UserSentenceProgress {
  id: string;
  userId: string;
  projectId: string;
  subtitleLineId?: string;
  manualText?: string;
  status: SentenceProgressStatus;
  listenCount: number;
  isFavorite: boolean;
  note?: string;
  lastViewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SentenceProgressSummary extends UserSentenceProgress {
  textOriginal?: string;
  project?: {
    id: string;
    title: string;
    language: string;
    sourceType: SourceType;
  };
  subtitleLine?: {
    id: string;
    lineIndex: number;
    startTime: number;
    endTime: number;
    textOriginal: string;
  };
}

export interface UpsertSentenceProgressInput {
  projectId: string;
  subtitleLineId?: string;
  manualText?: string;
  status?: SentenceProgressStatus;
  listenCountIncrement?: number;
  isFavorite?: boolean;
  note?: string | null;
}

export interface VocabularyItem {
  id: string;
  userId: string;
  projectId?: string;
  subtitleLineId?: string;
  studyItemId?: string;
  word: string;
  meaning?: string;
  language: string;
  sourceText?: string;
  sourceType?: StudySourceType;
  note?: string;
  masteryStatus: VocabularyMasteryStatus;
  createdAt: string;
  updatedAt: string;
}

export interface VocabularyItemSummary extends VocabularyItem {
  project?: {
    id: string;
    title: string;
    language: string;
  };
  subtitleLine?: {
    id: string;
    lineIndex: number;
    startTime: number;
    endTime: number;
    textOriginal: string;
  };
  studyItem?: {
    id: string;
    itemType: StudyItemType;
    textOriginal: string;
    sourceType: StudySourceType;
  };
}

export interface CreateVocabularyItemInput {
  projectId?: string;
  subtitleLineId?: string;
  studyItemId?: string;
  word: string;
  meaning?: string;
  language?: string;
  sourceText?: string;
  sourceType?: StudySourceType;
  note?: string;
  masteryStatus?: VocabularyMasteryStatus;
}

export interface UpdateVocabularyItemInput {
  word?: string;
  meaning?: string | null;
  language?: string;
  sourceText?: string | null;
  sourceType?: StudySourceType | null;
  note?: string | null;
  masteryStatus?: VocabularyMasteryStatus;
}

export interface StudyItem {
  id: string;
  userId: string;
  projectId?: string;
  subtitleLineId?: string;
  itemType: StudyItemType;
  sourceType: StudySourceType;
  language: string;
  textOriginal: string;
  normalizedText: string;
  sourceNote?: string;
  tags: string[];
  isFavorite: boolean;
  masteryStatus: StudyItemMasteryStatus;
  reviewCount: number;
  lastViewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StudyItemSummary extends StudyItem {
  translation?: string;
  summary?: string;
  note?: string;
  vocabularyCount: number;
}

export type FavoriteSentenceSource = "sentence_progress" | "study_item";

export interface FavoriteSentenceSummary {
  id: string;
  source: FavoriteSentenceSource;
  userId: string;
  textOriginal: string;
  translation?: string;
  note?: string;
  isFavorite: boolean;
  language?: string;
  projectId?: string;
  subtitleLineId?: string;
  project?: SentenceProgressSummary["project"];
  subtitleLine?: SentenceProgressSummary["subtitleLine"];
  studyItem?: Pick<
    StudyItemSummary,
    "id" | "itemType" | "sourceType" | "sourceNote" | "masteryStatus"
  >;
  createdAt: string;
  updatedAt: string;
}

export interface StudyItemDetail extends StudyItemSummary {
  analysis?: import("./ai.js").TextAnalysisJson;
  notes: Array<{
    id: string;
    noteText: string;
    createdAt: string;
    updatedAt: string;
  }>;
  vocabulary: VocabularyItemSummary[];
}

export interface AnalyzeTextInput {
  text: string;
  language?: string;
  sourceNote?: string;
  tags?: string[];
  sourceType?: StudySourceType;
}

export interface AnalyzeTextApiResponse {
  item: StudyItemDetail;
  analysis: import("./ai.js").TextAnalysisJson;
  cached: boolean;
  modelName?: string;
}

export interface AnalyzeConversationInput {
  message: string;
  language?: string;
  history?: import("./ai.js").ConversationTurn[];
  conversationId?: string;
}

export interface AnalyzeConversationApiResponse {
  messageType: import("./ai.js").ConversationMessageType;
  conversationId: string;
  shouldSave: boolean;
  reply: string;
  reasoning?: string;
  classificationReasoning?: string;
  analysisReasoning?: string;
  tags: string[];
  item?: StudyItemDetail;
  analysis?: import("./ai.js").TextAnalysisJson;
  cached?: boolean;
  modelName?: string;
}

export type ConversationStreamEvent =
  | { type: "conversation"; conversationId: string }
  | { type: "reasoning_delta"; phase: "classification" | "analysis"; delta: string }
  | { type: "content_delta"; delta: string }
  | { type: "analysis_delta"; analysis: import("./ai.js").TextAnalysisJson }
  | { type: "result"; data: AnalyzeConversationApiResponse }
  | { type: "error"; message: string; code?: string };

export interface ConversationSummary {
  id: string;
  title: string;
  messageCount: number;
  lastMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationMessageSummary {
  id: string;
  role: "user" | "assistant";
  content: string;
  reasoning?: string;
  classificationReasoning?: string;
  analysisReasoning?: string;
  messageType?: import("./ai.js").ConversationMessageType;
  shouldSave: boolean;
  tags: string[];
  studyItem?: StudyItemDetail;
  createdAt: string;
}

export interface ConversationDetail extends ConversationSummary {
  messages: ConversationMessageSummary[];
}

export interface StudyItemListFilters {
  keyword?: string;
  itemType?: StudyItemType;
  sourceType?: StudySourceType;
  tag?: string;
  isFavorite?: boolean;
}

export interface UpdateStudyItemInput {
  isFavorite?: boolean;
  masteryStatus?: StudyItemMasteryStatus;
  sourceNote?: string | null;
  tags?: string[];
  reviewCountIncrement?: number;
}

export interface UpdateStudyItemNoteInput {
  note: string;
}

export interface QuizItem {
  id: string;
  userId: string;
  reviewTaskId?: string;
  studyItemId?: string;
  vocabularyItemId?: string;
  questionType: import("./ai.js").QuizQuestionType;
  questionText: string;
  choices: string[];
  answer: string;
  explanation?: string;
  quiz: import("./ai.js").QuizQuestionJson;
  modelName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewTaskTarget {
  studyItem?: StudyItemSummary;
  vocabularyItem?: VocabularyItemSummary;
}

export interface ReviewTaskSummary {
  id: string;
  userId: string;
  targetType: ReviewTargetType;
  studyItemId?: string;
  vocabularyItemId?: string;
  nextReviewAt: string;
  lastReviewedAt?: string;
  intervalDays: number;
  attemptCount: number;
  target: ReviewTaskTarget;
  latestQuiz?: QuizItem;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewAttemptSummary {
  id: string;
  userId: string;
  reviewTaskId: string;
  studyItemId?: string;
  vocabularyItemId?: string;
  quizItemId?: string;
  result: ReviewAttemptResult;
  userAnswer?: string;
  isCorrect?: boolean;
  targetType: ReviewTargetType;
  target: ReviewTaskTarget;
  quiz?: QuizItem;
  createdAt: string;
}

export interface ReviewTodayResponse {
  tasks: ReviewTaskSummary[];
  summary: {
    dueCount: number;
    vocabularyCount: number;
    studyItemCount: number;
  };
}

export interface SubmitReviewAttemptInput {
  result: ReviewAttemptResult;
  quizItemId?: string;
  userAnswer?: string;
  isCorrect?: boolean;
}

export interface SubmitReviewAttemptResponse {
  task: ReviewTaskSummary;
  attempt: ReviewAttemptSummary;
}

export interface GenerateQuizInput {
  sourceType: ReviewTargetType;
  sourceId: string;
}

export interface GenerateQuizResponse {
  task: ReviewTaskSummary;
  quiz: QuizItem;
}

export interface AnswerQuizInput {
  userAnswer: string;
  result?: ReviewAttemptResult;
}

export interface MistakesResponse {
  attempts: ReviewAttemptSummary[];
}

export interface LearningReport {
  todayStudyItems: number;
  todayVocabularyItems: number;
  todayReviewAttempts: number;
  todayKnownAttempts: number;
  todayFuzzyAttempts: number;
  todayUnknownAttempts: number;
  dueToday: number;
  masteredStudyItems: number;
  masteredVocabularyItems: number;
  mistakeAttempts: number;
}
