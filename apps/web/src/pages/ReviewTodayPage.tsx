import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import type { QuizItem, ReviewAttemptResult, ReviewTaskSummary } from "@scenego/shared";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  answerQuiz,
  generateQuiz,
  getTodayReview,
  submitReviewAttempt
} from "../api/review.js";
import { useAuthStore } from "../stores/authStore.js";

export function ReviewTodayPage() {
  const token = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();
  const [generatedQuizByTaskId, setGeneratedQuizByTaskId] = useState<Record<string, QuizItem>>({});
  const [answerByQuizId, setAnswerByQuizId] = useState<Record<string, string>>({});
  const reviewQuery = useQuery({
    queryKey: ["review", "today"],
    queryFn: () => getTodayReview(token ?? ""),
    enabled: Boolean(token)
  });
  const tasks = reviewQuery.data?.tasks ?? [];
  const groupedTasks = useMemo(
    () => ({
      vocabulary: tasks.filter((task) => task.targetType === "vocabulary_item"),
      studyItems: tasks.filter((task) => task.targetType === "study_item")
    }),
    [tasks]
  );

  const markMutation = useMutation({
    mutationFn: (input: { taskId: string; result: ReviewAttemptResult }) =>
      submitReviewAttempt(token ?? "", input.taskId, { result: input.result }),
    onSuccess: () => invalidateReviewData(queryClient)
  });
  const quizMutation = useMutation({
    mutationFn: (task: ReviewTaskSummary) =>
      generateQuiz(token ?? "", {
        sourceType: task.targetType,
        sourceId: task.studyItemId ?? task.vocabularyItemId ?? ""
      }),
    onSuccess: (response) => {
      setGeneratedQuizByTaskId((current) => ({
        ...current,
        [response.task.id]: response.quiz
      }));
      void invalidateReviewData(queryClient);
    }
  });
  const answerMutation = useMutation({
    mutationFn: (input: { quizId: string; userAnswer: string }) =>
      answerQuiz(token ?? "", input.quizId, { userAnswer: input.userAnswer }),
    onSuccess: () => {
      setAnswerByQuizId({});
      void invalidateReviewData(queryClient);
    }
  });

  const mutationError = getErrorMessage(markMutation.error ?? quizMutation.error ?? answerMutation.error);

  return (
    <section className="space-y-4">
      <div className="rounded border border-line bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">今日复习</h1>
            <p className="mt-1 text-sm text-slate-600">按确定性规则复习生词和文本学习内容。</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-sm">
            <SummaryBadge label="待复习" value={reviewQuery.data?.summary.dueCount ?? 0} />
            <SummaryBadge label="生词" value={reviewQuery.data?.summary.vocabularyCount ?? 0} />
            <SummaryBadge label="句子/文本" value={reviewQuery.data?.summary.studyItemCount ?? 0} />
          </div>
        </div>
        {mutationError ? <p className="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{mutationError}</p> : null}
      </div>

      {reviewQuery.isLoading ? (
        <div className="rounded border border-line bg-white p-8 text-center text-sm text-slate-500">加载中...</div>
      ) : tasks.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <TaskGroup
            title="单词复习"
            tasks={groupedTasks.vocabulary}
            generatedQuizByTaskId={generatedQuizByTaskId}
            answerByQuizId={answerByQuizId}
            isMarking={markMutation.isPending}
            isGeneratingQuiz={quizMutation.isPending}
            isAnsweringQuiz={answerMutation.isPending}
            onMark={(task, result) => markMutation.mutate({ taskId: task.id, result })}
            onGenerateQuiz={(task) => quizMutation.mutate(task)}
            onSetAnswer={(quizId, answer) =>
              setAnswerByQuizId((current) => ({
                ...current,
                [quizId]: answer
              }))
            }
            onAnswerQuiz={(quiz) =>
              answerMutation.mutate({
                quizId: quiz.id,
                userAnswer: answerByQuizId[quiz.id] ?? ""
              })
            }
          />
          <TaskGroup
            title="句子与文本复习"
            tasks={groupedTasks.studyItems}
            generatedQuizByTaskId={generatedQuizByTaskId}
            answerByQuizId={answerByQuizId}
            isMarking={markMutation.isPending}
            isGeneratingQuiz={quizMutation.isPending}
            isAnsweringQuiz={answerMutation.isPending}
            onMark={(task, result) => markMutation.mutate({ taskId: task.id, result })}
            onGenerateQuiz={(task) => quizMutation.mutate(task)}
            onSetAnswer={(quizId, answer) =>
              setAnswerByQuizId((current) => ({
                ...current,
                [quizId]: answer
              }))
            }
            onAnswerQuiz={(quiz) =>
              answerMutation.mutate({
                quizId: quiz.id,
                userAnswer: answerByQuizId[quiz.id] ?? ""
              })
            }
          />
        </div>
      ) : (
        <div className="rounded border border-dashed border-line bg-white p-8 text-center text-sm text-slate-500">
          今天没有需要复习的内容。去文本学习或生词本积累一些材料吧。
        </div>
      )}
    </section>
  );
}

interface TaskGroupProps {
  title: string;
  tasks: ReviewTaskSummary[];
  generatedQuizByTaskId: Record<string, QuizItem>;
  answerByQuizId: Record<string, string>;
  isMarking: boolean;
  isGeneratingQuiz: boolean;
  isAnsweringQuiz: boolean;
  onMark: (task: ReviewTaskSummary, result: ReviewAttemptResult) => void;
  onGenerateQuiz: (task: ReviewTaskSummary) => void;
  onSetAnswer: (quizId: string, answer: string) => void;
  onAnswerQuiz: (quiz: QuizItem) => void;
}

function TaskGroup({
  title,
  tasks,
  generatedQuizByTaskId,
  answerByQuizId,
  isMarking,
  isGeneratingQuiz,
  isAnsweringQuiz,
  onMark,
  onGenerateQuiz,
  onSetAnswer,
  onAnswerQuiz
}: TaskGroupProps) {
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-slate-700">{title}</h2>
      {tasks.length ? (
        tasks.map((task) => {
          const quiz = generatedQuizByTaskId[task.id] ?? task.latestQuiz;
          return (
            <article key={task.id} className="rounded border border-line bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-500">{getTaskTypeLabel(task)}</p>
                  <h3 className="mt-1 break-words font-semibold">{getTaskTitle(task)}</h3>
                  {getTaskMeaning(task) ? <p className="mt-2 text-sm text-slate-600">{getTaskMeaning(task)}</p> : null}
                </div>
                <span className="rounded bg-panel px-2 py-1 text-xs text-slate-600">
                  {task.attemptCount ? `已复习 ${task.attemptCount} 次` : "首次复习"}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {reviewActions.map((action) => (
                  <button
                    key={action.value}
                    className={action.className}
                    type="button"
                    disabled={isMarking}
                    onClick={() => onMark(task, action.value)}
                  >
                    {action.label}
                  </button>
                ))}
                <button
                  className="rounded border border-line px-3 py-2 text-sm text-slate-700 disabled:opacity-50"
                  type="button"
                  disabled={isGeneratingQuiz || !getSourceId(task)}
                  onClick={() => onGenerateQuiz(task)}
                >
                  {isGeneratingQuiz ? "出题中..." : "AI 练习题"}
                </button>
                {getDetailHref(task) ? (
                  <Link className="rounded border border-line px-3 py-2 text-sm text-slate-700" to={getDetailHref(task) ?? ""}>
                    查看详情
                  </Link>
                ) : null}
              </div>

              {quiz ? (
                <div className="mt-4 rounded bg-panel p-3">
                  <p className="text-sm font-semibold">练习题</p>
                  <p className="mt-2 text-sm text-slate-700">{quiz.questionText}</p>
                  {quiz.choices.length ? (
                    <div className="mt-3 grid gap-2">
                      {quiz.choices.map((choice) => (
                        <button
                          key={choice}
                          className={[
                            "rounded border px-3 py-2 text-left text-sm",
                            answerByQuizId[quiz.id] === choice
                              ? "border-accent bg-white text-accent"
                              : "border-line bg-white text-slate-700"
                          ].join(" ")}
                          type="button"
                          onClick={() => onSetAnswer(quiz.id, choice)}
                        >
                          {choice}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <input
                      className="mt-3 w-full rounded border border-line bg-white px-3 py-2 text-sm"
                      placeholder="输入你的答案"
                      value={answerByQuizId[quiz.id] ?? ""}
                      onChange={(event) => onSetAnswer(quiz.id, event.target.value)}
                    />
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      className="rounded bg-accent px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                      type="button"
                      disabled={isAnsweringQuiz || !answerByQuizId[quiz.id]?.trim()}
                      onClick={() => onAnswerQuiz(quiz)}
                    >
                      保存练习结果
                    </button>
                    <span className="text-xs text-slate-500">{questionTypeLabels[quiz.questionType]}</span>
                  </div>
                </div>
              ) : null}
            </article>
          );
        })
      ) : (
        <div className="rounded border border-dashed border-line bg-white p-6 text-center text-sm text-slate-500">
          暂无这一类复习内容
        </div>
      )}
    </div>
  );
}

function SummaryBadge({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded bg-panel px-3 py-2">
      <p className="text-lg font-semibold">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}

const reviewActions: Array<{ value: ReviewAttemptResult; label: string; className: string }> = [
  {
    value: "known",
    label: "认识",
    className: "rounded bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
  },
  {
    value: "fuzzy",
    label: "模糊",
    className: "rounded bg-amber-500 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
  },
  {
    value: "unknown",
    label: "不认识",
    className: "rounded bg-rose-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
  }
];

const questionTypeLabels = {
  multiple_choice: "选择题",
  fill_blank: "填空题",
  short_answer: "简答题"
} as const;

function getTaskTitle(task: ReviewTaskSummary): string {
  return task.target.vocabularyItem?.word ?? task.target.studyItem?.textOriginal ?? "复习内容";
}

function getTaskMeaning(task: ReviewTaskSummary): string | undefined {
  return task.target.vocabularyItem?.meaning ?? task.target.studyItem?.translation ?? task.target.studyItem?.summary;
}

function getTaskTypeLabel(task: ReviewTaskSummary): string {
  if (task.targetType === "vocabulary_item") {
    return "生词";
  }

  return task.target.studyItem ? itemTypeLabels[task.target.studyItem.itemType] : "文本";
}

function getDetailHref(task: ReviewTaskSummary): string | undefined {
  if (task.studyItemId) {
    return `/study-items/${task.studyItemId}`;
  }

  return undefined;
}

function getSourceId(task: ReviewTaskSummary): string | undefined {
  return task.studyItemId ?? task.vocabularyItemId;
}

const itemTypeLabels = {
  word: "单词",
  phrase: "短语",
  sentence: "句子",
  paragraph: "段落",
  mixed: "混合"
} as const;

function invalidateReviewData(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: ["review"] });
  void queryClient.invalidateQueries({ queryKey: ["mistakes"] });
  void queryClient.invalidateQueries({ queryKey: ["report"] });
  void queryClient.invalidateQueries({ queryKey: ["study-items"] });
  void queryClient.invalidateQueries({ queryKey: ["vocabulary"] });
}

function getErrorMessage(error: unknown): string | undefined {
  return error instanceof Error ? error.message : undefined;
}
