import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { LearningProjectSummary } from "@scenego/shared";
import { ArrowUpRight, Clapperboard, Edit3, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { deleteProject, listProjects, updateProject } from "../api/projects.js";
import { useAuthStore } from "../stores/authStore.js";
import { useLocalMediaStore } from "../stores/localMediaStore.js";

export function ProjectListPage() {
  const token = useAuthStore((state) => state.accessToken);
  const clearProjectVideo = useLocalMediaStore((state) => state.clearProjectVideo);
  const queryClient = useQueryClient();
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [projectDraft, setProjectDraft] = useState<ProjectDraft>({
    language: "en",
    sourceUrl: "",
    title: ""
  });
  const projectsQuery = useQuery({
    queryKey: ["projects"],
    queryFn: () => listProjects(token ?? ""),
    enabled: Boolean(token)
  });
  const deleteMutation = useMutation({
    mutationFn: (projectId: string) => deleteProject(token ?? "", projectId),
    onSuccess: (_response, projectId) => {
      clearProjectVideo(projectId);
      setEditingProjectId((currentProjectId) => (currentProjectId === projectId ? null : currentProjectId));
      invalidateProjectRelatedQueries(queryClient, projectId);
      void queryClient.removeQueries({ queryKey: ["project", projectId] });
      void queryClient.removeQueries({ queryKey: ["sentence-progress", projectId] });
    }
  });
  const updateMutation = useMutation({
    mutationFn: (project: LearningProjectSummary) =>
      updateProject(token ?? "", project.id, {
        title: projectDraft.title,
        language: projectDraft.language,
        sourceUrl:
          project.sourceType === "network_url" || project.sourceType === "external_embed"
            ? optionalString(projectDraft.sourceUrl)
            : undefined
      }),
    onSuccess: (_response, project) => {
      setEditingProjectId(null);
      invalidateProjectRelatedQueries(queryClient, project.id);
    }
  });

  function startEditing(project: LearningProjectSummary) {
    setEditingProjectId(project.id);
    setProjectDraft({
      language: project.language,
      sourceUrl: project.sourceUrl ?? "",
      title: project.title
    });
  }

  return (
    <section className="projects-page">
      <div className="projects-summary-band">
        <div>
          <p>Active projects</p>
          <strong>{projectsQuery.data?.projects.length ?? 0}</strong>
        </div>
        <div>
          <p>Learned sentences</p>
          <strong>{sumProjectMetric(projectsQuery.data?.projects, "learnedSentenceCount")}</strong>
        </div>
        <div>
          <p>Saved sentences</p>
          <strong>{sumProjectMetric(projectsQuery.data?.projects, "favoriteSentenceCount")}</strong>
        </div>
        <div>
          <p>Vocabulary</p>
          <strong>{sumProjectMetric(projectsQuery.data?.projects, "vocabularyCount")}</strong>
        </div>
      </div>
      {projectsQuery.isLoading ? (
        <div className="scene-page-status">正在载入项目...</div>
      ) : projectsQuery.data?.projects.length ? (
        <div className="projects-list">
          {projectsQuery.data.projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              draft={projectDraft}
              isDeleting={deleteMutation.isPending}
              isEditing={editingProjectId === project.id}
              isUpdating={updateMutation.isPending}
              onCancelEdit={() => setEditingProjectId(null)}
              onDelete={() => deleteMutation.mutate(project.id)}
              onDraftChange={setProjectDraft}
              onEdit={() => startEditing(project)}
              onUpdate={() => updateMutation.mutate(project)}
            />
          ))}
        </div>
      ) : (
        <div className="scene-page-status">
          <Clapperboard aria-hidden="true" />
          <p>暂无项目</p>
          <Link className="scene-primary-command" to="/projects/new">创建第一个项目</Link>
        </div>
      )}
    </section>
  );
}

function ProjectCard({
  draft,
  isDeleting,
  isEditing,
  isUpdating,
  onCancelEdit,
  onDelete,
  onDraftChange,
  onEdit,
  onUpdate,
  project
}: {
  draft: ProjectDraft;
  isDeleting: boolean;
  isEditing: boolean;
  isUpdating: boolean;
  onCancelEdit: () => void;
  onDelete: () => void;
  onDraftChange: (draft: ProjectDraft) => void;
  onEdit: () => void;
  onUpdate: () => void;
  project: LearningProjectSummary;
}) {
  const progressPercent = getProgressPercent(project.lastPosition, project.duration);
  const canEditSourceUrl = project.sourceType === "network_url" || project.sourceType === "external_embed";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onUpdate();
  }

  return (
    <article className="project-row">
      <div className="project-row-visual"><Clapperboard aria-hidden="true" /></div>
      <div className="project-row-main">
        <div className="project-row-heading">
          <div>
          <h2 className="font-semibold">{project.title}</h2>
          <p>
            {project.language} · {formatSourceType(project.sourceType)}
          </p>
        </div>
        <button
          className="project-icon-button project-delete-button"
          type="button"
          title="删除项目"
          aria-label={`删除项目 ${project.title}`}
          disabled={isDeleting}
          onClick={onDelete}
        >
          <Trash2 aria-hidden="true" />
        </button>
      </div>
      {isEditing ? (
        <form className="project-edit-form" onSubmit={handleSubmit}>
          <label className="block text-sm font-medium">
            项目名称
            <input
              className="mt-1 w-full rounded border border-line px-3 py-2"
              value={draft.title}
              onChange={(event) => onDraftChange({ ...draft, title: event.target.value })}
              required
            />
          </label>
          <label className="block text-sm font-medium">
            语言
            <select
              className="mt-1 w-full rounded border border-line px-3 py-2"
              value={draft.language}
              onChange={(event) => onDraftChange({ ...draft, language: event.target.value })}
            >
              <option value="en">英语</option>
              <option value="ja">日语</option>
              <option value="ko">韩语</option>
            </select>
          </label>
          {canEditSourceUrl ? (
            <label className="block text-sm font-medium">
              外部链接
              <input
                className="mt-1 w-full rounded border border-line px-3 py-2"
                type="url"
                value={draft.sourceUrl}
                onChange={(event) => onDraftChange({ ...draft, sourceUrl: event.target.value })}
                required
              />
            </label>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <button
              className="rounded bg-ink px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
              type="submit"
              disabled={isUpdating}
            >
              {isUpdating ? "保存中..." : "保存"}
            </button>
            <button
              className="rounded border border-line px-3 py-2 text-sm text-slate-700"
              type="button"
              onClick={onCancelEdit}
            >
              取消
            </button>
          </div>
        </form>
      ) : null}
      <dl className="project-metrics">
        <Metric label="字幕" value={project.subtitleLineCount} />
        <Metric label="已学" value={project.learnedSentenceCount} />
        <Metric label="收藏" value={project.favoriteSentenceCount} />
      </dl>
      <div className="project-progress">
        <div>
          <span>{formatProgress(project.lastPosition, project.duration)}</span>
          <span>{formatDateTime(project.updatedAt)}</span>
        </div>
        <div className="project-progress-track">
          <div style={{ width: `${progressPercent}%` }} />
        </div>
      </div>
      </div>
      <div className="project-row-actions">
        <button className="project-secondary-command" type="button" onClick={onEdit}>
          <Edit3 aria-hidden="true" /> 编辑
        </button>
        <Link className="project-primary-command" to={`/projects/${project.id}/study`}>
          继续学习 <ArrowUpRight aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function sumProjectMetric(
  projects: LearningProjectSummary[] | undefined,
  key: "favoriteSentenceCount" | "learnedSentenceCount" | "vocabularyCount"
): number {
  return projects?.reduce((total, project) => total + project[key], 0) ?? 0;
}

function formatSourceType(sourceType: string) {
  const labels: Record<string, string> = {
    local_file: "本地视频",
    network_url: "网络直链",
    external_embed: "外链伴学"
  };

  return labels[sourceType] ?? sourceType;
}

interface ProjectDraft {
  language: string;
  sourceUrl: string;
  title: string;
}

function optionalString(value: string): string | undefined {
  const trimmedValue = value.trim();
  return trimmedValue ? trimmedValue : undefined;
}

function invalidateProjectRelatedQueries(queryClient: ReturnType<typeof useQueryClient>, projectId: string): void {
  void queryClient.invalidateQueries({ queryKey: ["projects"] });
  void queryClient.invalidateQueries({ queryKey: ["project", projectId] });
  void queryClient.invalidateQueries({ queryKey: ["sentence-progress", projectId] });
  void queryClient.invalidateQueries({ queryKey: ["favorite-sentences"] });
  void queryClient.invalidateQueries({ queryKey: ["vocabulary"] });
}

function getProgressPercent(lastPosition: number, duration?: number): number {
  if (!duration || duration <= 0) {
    return 0;
  }

  return Math.min(100, Math.max(0, Math.round((lastPosition / duration) * 100)));
}

function formatProgress(lastPosition: number, duration?: number): string {
  if (!duration || duration <= 0) {
    return `进度 ${lastPosition.toFixed(1)}s`;
  }

  return `进度 ${formatPlaybackTime(lastPosition)} / ${formatPlaybackTime(duration)} · ${getProgressPercent(lastPosition, duration)}%`;
}

function formatPlaybackTime(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;

  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

function formatDateTime(value: string): string {
  return `最近 ${new Intl.DateTimeFormat(undefined, {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value))}`;
}
