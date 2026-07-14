import { useQuery } from "@tanstack/react-query";
import type { LearningReport } from "@scenego/shared";
import { Link } from "react-router-dom";
import { getLearningReport } from "../api/review.js";
import { useAuthStore } from "../stores/authStore.js";

export function ReportPage() {
  const token = useAuthStore((state) => state.accessToken);
  const reportQuery = useQuery({
    queryKey: ["report"],
    queryFn: () => getLearningReport(token ?? ""),
    enabled: Boolean(token)
  });
  const report = reportQuery.data?.report;

  return (
    <section className="space-y-4">
      <div className="rounded border border-line bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">学习报告</h1>
            <p className="mt-1 text-sm text-slate-600">汇总今日学习、复习、掌握和错题统计。</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link className="rounded border border-line px-3 py-2 text-sm text-slate-700" to="/mistakes">
              错题本
            </Link>
            <Link className="rounded bg-accent px-3 py-2 text-sm font-semibold text-white" to="/review/today">
              今日复习
            </Link>
          </div>
        </div>
      </div>

      {reportQuery.isLoading ? (
        <div className="rounded border border-line bg-white p-8 text-center text-sm text-slate-500">加载中...</div>
      ) : report ? (
        <>
          <div className="grid gap-3 md:grid-cols-4">
            <ReportCard label="今日学习内容" value={report.todayStudyItems} />
            <ReportCard label="今日新增生词" value={report.todayVocabularyItems} />
            <ReportCard label="今日复习次数" value={report.todayReviewAttempts} />
            <ReportCard label="当前待复习" value={report.dueToday} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded border border-line bg-white p-4">
              <h2 className="text-sm font-semibold">今日复习结果</h2>
              <div className="mt-4 grid grid-cols-3 gap-3 text-center text-sm">
                <ResultStat label="认识" value={report.todayKnownAttempts} tone="text-emerald-700" />
                <ResultStat label="模糊" value={report.todayFuzzyAttempts} tone="text-amber-700" />
                <ResultStat label="不认识" value={report.todayUnknownAttempts} tone="text-rose-700" />
              </div>
            </div>

            <div className="rounded border border-line bg-white p-4">
              <h2 className="text-sm font-semibold">累计掌握</h2>
              <div className="mt-4 grid grid-cols-3 gap-3 text-center text-sm">
                <ResultStat label="文本内容" value={report.masteredStudyItems} tone="text-slate-800" />
                <ResultStat label="生词" value={report.masteredVocabularyItems} tone="text-slate-800" />
                <ResultStat label="错题记录" value={report.mistakeAttempts} tone="text-rose-700" />
              </div>
            </div>
          </div>

          <div className="rounded border border-line bg-white p-4">
            <h2 className="text-sm font-semibold">今日建议</h2>
            <p className="mt-2 text-sm text-slate-600">{getSuggestion(report)}</p>
          </div>
        </>
      ) : (
        <div className="rounded border border-dashed border-line bg-white p-8 text-center text-sm text-slate-500">
          暂无报告数据
        </div>
      )}
    </section>
  );
}

function ReportCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border border-line bg-white p-4">
      <p className="text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{label}</p>
    </div>
  );
}

function ResultStat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded bg-panel p-3">
      <p className={`text-xl font-semibold ${tone}`}>{value}</p>
      <p className="mt-1 text-xs text-slate-500">{label}</p>
    </div>
  );
}

function getSuggestion(report: LearningReport): string {
  if (report.dueToday > 0) {
    return `还有 ${report.dueToday} 个内容需要复习，建议先完成今日复习再继续新增材料。`;
  }

  if (report.todayStudyItems + report.todayVocabularyItems === 0) {
    return "今天还没有新增学习内容，可以从文本学习页分析一句感兴趣的英文。";
  }

  if (report.todayUnknownAttempts + report.todayFuzzyAttempts > report.todayKnownAttempts) {
    return "今天的模糊和不认识较多，建议先回看错题本，再生成几道 AI 练习题巩固。";
  }

  return "今天状态不错，可以少量新增内容，并保留明天的复习节奏。";
}
