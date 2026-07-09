import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { LearningProjectSummary } from "@scenego/shared";
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
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">学习项目</h1>
        <Link className="rounded bg-ink px-4 py-2 text-sm font-semibold text-white" to="/projects/new">
          新建项目
        </Link>
      </div>
      {projectsQuery.isLoading ? (
        <div className="rounded border border-line bg-white p-8 text-center text-sm text-slate-500">加载中...</div>
      ) : projectsQuery.data?.projects.length ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
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
        <div className="rounded border border-dashed border-line bg-white p-8 text-center text-sm text-slate-500">
          暂无项目
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
    <article className="rounded border border-line bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">{project.title}</h2>
          <p className="mt-1 text-sm text-slate-600">
            {project.language} · {formatSourceType(project.sourceType)}
          </p>
        </div>
        <button
          className="rounded border border-line px-2 py-1 text-xs text-slate-600 disabled:opacity-50"
          type="button"
          disabled={isDeleting}
          onClick={onDelete}
        >
          删除
        </button>
      </div>
      {isEditing ? (
        <form className="mt-4 grid gap-3" onSubmit={handleSubmit}>
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
      <dl className="mt-4 grid grid-cols-3 gap-2 text-sm">
        <Metric label="字幕" value={project.subtitleLineCount} />
        <Metric label="已学" value={project.learnedSentenceCount} />
        <Metric label="收藏" value={project.favoriteSentenceCount} />
      </dl>
      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
          <span>{formatProgress(project.lastPosition, project.duration)}</span>
          <span>{formatDateTime(project.updatedAt)}</span>
        </div>
        <div className="h-2 overflow-hidden rounded bg-panel">
          <div className="h-full rounded bg-accent" style={{ width: `${progressPercent}%` }} />
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button className="rounded border border-line px-3 py-2 text-sm text-slate-700" type="button" onClick={onEdit}>
          编辑
        </button>
        <Link className="rounded bg-accent px-3 py-2 text-sm font-semibold text-white" to={`/projects/${project.id}/study`}>
          继续学习
        </Link>
      </div>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded bg-panel p-2">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-1 font-semibold">{value}</dd>
    </div>
  );
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
