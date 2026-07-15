import { useQuery } from "@tanstack/react-query";
import type { LearningReport } from "@scenego/shared";
import { ArrowUpRight, Brain, Clapperboard } from "lucide-react";
import { Link } from "react-router-dom";
import { listProjects } from "../api/projects.js";
import { getLearningReport } from "../api/review.js";
import { useAuthStore } from "../stores/authStore.js";

export function ReportPage() {
  const token = useAuthStore((state) => state.accessToken);
  const reportQuery = useQuery({
    queryKey: ["report"],
    queryFn: () => getLearningReport(token ?? ""),
    enabled: Boolean(token)
  });
  const projectsQuery = useQuery({
    queryKey: ["projects"],
    queryFn: () => listProjects(token ?? ""),
    enabled: Boolean(token)
  });
  const report = reportQuery.data?.report;

  return (
    <section className="dashboard-page">
      <div className="dashboard-content">
        {reportQuery.isLoading ? <div className="scene-page-status">正在汇总学习数据...</div> : null}
        {!reportQuery.isLoading && !report ? <div className="scene-page-status">暂无报告数据</div> : null}
        {report ? (
          <>
            <section className="dashboard-metric-band" aria-label="今日学习数据">
              <ReportMetric label="今日学习内容" value={report.todayStudyItems} note="Study items" />
              <ReportMetric label="今日新增生词" value={report.todayVocabularyItems} note="Vocabulary" />
              <ReportMetric label="今日复习次数" value={report.todayReviewAttempts} note="Review attempts" />
              <ReportMetric label="当前待复习" value={report.dueToday} note="Due now" signal />
            </section>

            <section className="dashboard-section">
              <div className="dashboard-section-heading">
                <div><h2>今日学习活动</h2><p>使用当前真实记录汇总</p></div>
                <span>{new Intl.DateTimeFormat("zh-CN", { month: "2-digit", day: "2-digit" }).format(new Date())}</span>
              </div>
              <div className="dashboard-activity-chart">
                <ActivityBar label="新增内容" value={report.todayStudyItems} max={getActivityMax(report)} />
                <ActivityBar label="新增生词" value={report.todayVocabularyItems} max={getActivityMax(report)} tone="cyan" />
                <ActivityBar label="复习次数" value={report.todayReviewAttempts} max={getActivityMax(report)} />
                <ActivityBar label="模糊 / 不认识" value={report.todayFuzzyAttempts + report.todayUnknownAttempts} max={getActivityMax(report)} tone="coral" />
              </div>
            </section>

            <div className="dashboard-columns">
              <section className="dashboard-section">
                <div className="dashboard-section-heading"><div><h2>继续项目</h2><p>按最近更新时间排序</p></div><span>{projectsQuery.data?.projects.length ?? 0} 个项目</span></div>
                <div className="dashboard-project-list">
                  {projectsQuery.data?.projects.slice(0, 4).map((project) => (
                    <div className="dashboard-project-row" key={project.id}>
                      <span className="dashboard-project-icon"><Clapperboard aria-hidden="true" /></span>
                      <div><strong>{project.title}</strong><span>{project.learnedSentenceCount} / {project.subtitleLineCount} 句 · {formatSourceType(project.sourceType)}</span></div>
                      <Link to={`/projects/${project.id}/study`} title={`继续学习 ${project.title}`}><ArrowUpRight aria-hidden="true" /></Link>
                    </div>
                  ))}
                  {!projectsQuery.isLoading && !projectsQuery.data?.projects.length ? <p className="dashboard-empty-copy">还没有学习项目</p> : null}
                </div>
              </section>

              <section className="dashboard-section">
                <div className="dashboard-section-heading"><div><h2>累计掌握</h2><p>当前稳定学习成果</p></div></div>
                <div className="dashboard-mastery-list">
                  <ResultStat label="文本内容" value={report.masteredStudyItems} />
                  <ResultStat label="生词" value={report.masteredVocabularyItems} />
                  <ResultStat label="错题记录" value={report.mistakeAttempts} tone="coral" />
                </div>
                <p className="dashboard-suggestion">{getSuggestion(report)}</p>
              </section>
            </div>
          </>
        ) : null}
      </div>

      <aside className="dashboard-review-panel">
        <div className="dashboard-review-heading"><Brain aria-hidden="true" /><span>Review queue</span></div>
        {report ? (
          <>
            <div className="dashboard-due-count"><strong>{report.dueToday.toString().padStart(2, "0")}</strong><span>项待复习</span></div>
            <div className="dashboard-review-progress"><span style={{ width: `${getKnownRate(report)}%` }} /></div>
            <dl className="dashboard-review-breakdown">
              <div><dt>认识</dt><dd>{report.todayKnownAttempts}</dd></div>
              <div><dt>模糊</dt><dd>{report.todayFuzzyAttempts}</dd></div>
              <div><dt>不认识</dt><dd>{report.todayUnknownAttempts}</dd></div>
            </dl>
            <Link className="scene-primary-command" to="/review/today">开始今日复习 <Brain aria-hidden="true" /></Link>
            <Link className="dashboard-library-link" to="/library?type=mistakes">查看错题记录 <ArrowUpRight aria-hidden="true" /></Link>
          </>
        ) : null}
      </aside>
    </section>
  );
}

function ReportMetric({ label, note, signal = false, value }: { label: string; note: string; signal?: boolean; value: number }) {
  return (
    <div className={signal ? "is-signal" : ""}>
      <p>{label}</p>
      <strong>{value}</strong>
      <span>{note}</span>
    </div>
  );
}

function ResultStat({ label, value, tone = "normal" }: { label: string; value: number; tone?: "coral" | "normal" }) {
  return (
    <div className={tone === "coral" ? "is-coral" : ""}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ActivityBar({ label, max, tone = "signal", value }: { label: string; max: number; tone?: "coral" | "cyan" | "signal"; value: number }) {
  const width = value === 0 ? 0 : Math.max(8, Math.round((value / max) * 100));
  return <div className="dashboard-activity-row"><span>{label}</span><span className="dashboard-activity-track"><span className={`is-${tone}`} style={{ width: `${width}%` }} /></span><strong>{value}</strong></div>;
}

function getActivityMax(report: LearningReport): number {
  return Math.max(1, report.todayStudyItems, report.todayVocabularyItems, report.todayReviewAttempts, report.todayFuzzyAttempts + report.todayUnknownAttempts);
}

function getKnownRate(report: LearningReport): number {
  const attempts = report.todayKnownAttempts + report.todayFuzzyAttempts + report.todayUnknownAttempts;
  return attempts ? Math.round((report.todayKnownAttempts / attempts) * 100) : 0;
}

function formatSourceType(sourceType: string): string {
  return { local_file: "本地视频", network_url: "网络直链", external_embed: "外链伴学" }[sourceType] ?? sourceType;
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
