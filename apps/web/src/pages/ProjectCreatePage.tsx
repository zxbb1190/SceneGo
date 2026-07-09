import { useMutation } from "@tanstack/react-query";
import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import type { SourceType } from "@scenego/shared";
import { createProject } from "../api/projects.js";
import { useAuthStore } from "../stores/authStore.js";
import { useLocalMediaStore } from "../stores/localMediaStore.js";

const sourceOptions: Array<{ value: SourceType; label: string }> = [
  { value: "local_file", label: "本地视频" },
  { value: "network_url", label: "网络直链" },
  { value: "external_embed", label: "外链伴学" }
];

export function ProjectCreatePage() {
  const navigate = useNavigate();
  const token = useAuthStore((state) => state.accessToken);
  const setProjectVideo = useLocalMediaStore((state) => state.setProjectVideo);
  const [sourceType, setSourceType] = useState<SourceType>("local_file");
  const [title, setTitle] = useState("");
  const [language, setLanguage] = useState("en");
  const [sourceUrl, setSourceUrl] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [subtitleFileName, setSubtitleFileName] = useState("");
  const [subtitleText, setSubtitleText] = useState("");
  const requiresSubtitle = sourceType !== "external_embed";
  const requiresLocalVideo = sourceType === "local_file";

  useEffect(() => {
    if (sourceType !== "local_file") {
      setVideoFile(null);
    }

    if (sourceType === "local_file") {
      setSourceUrl("");
    }

    if (sourceType === "external_embed") {
      setSubtitleFileName("");
      setSubtitleText("");
    }
  }, [sourceType]);

  const createMutation = useMutation({
    mutationFn: () =>
      createProject(token ?? "", {
        title,
        language,
        sourceType,
        sourceUrl:
          sourceType === "network_url" || sourceType === "external_embed"
            ? optionalString(sourceUrl)
            : undefined,
        videoFileName: sourceType === "local_file" ? videoFile?.name : undefined,
        subtitleFileName: optionalString(subtitleFileName),
        subtitleText: sourceType === "external_embed" ? undefined : optionalString(subtitleText),
        subtitleFormat: inferSubtitleFormat(subtitleFileName, subtitleText)
      }),
    onSuccess: ({ project }) => {
      if (videoFile) {
        setProjectVideo(project.id, videoFile);
      }

      navigate(`/projects/${project.id}/study`);
    }
  });

  async function handleSubtitleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setSubtitleFileName(file.name);
    setSubtitleText(await file.text());
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (requiresSubtitle && !optionalString(subtitleText)) {
      return;
    }

    if (requiresLocalVideo && !videoFile) {
      return;
    }

    createMutation.mutate();
  }

  return (
    <section className="rounded border border-line bg-white p-6">
      <h1 className="text-xl font-semibold">新建学习项目</h1>
      <form className="mt-6 grid gap-5 md:grid-cols-2" onSubmit={handleSubmit}>
        <label className="block text-sm font-medium md:col-span-2">
          项目名称
          <input
            className="mt-1 w-full rounded border border-line px-3 py-2"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
          />
        </label>
        <label className="block text-sm font-medium">
          来源类型
          <select
            className="mt-1 w-full rounded border border-line px-3 py-2"
            value={sourceType}
            onChange={(event) => setSourceType(event.target.value as SourceType)}
          >
            {sourceOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium">
          语言
          <select className="mt-1 w-full rounded border border-line px-3 py-2" value={language} onChange={(event) => setLanguage(event.target.value)}>
            <option value="en">英语</option>
            <option value="ja">日语</option>
            <option value="ko">韩语</option>
          </select>
        </label>
        <label className="block text-sm font-medium">
          本地视频
          <input
            className="mt-1 w-full rounded border border-line px-3 py-2"
            type="file"
            accept="video/*"
            disabled={sourceType !== "local_file"}
            required={requiresLocalVideo}
            onChange={(event) => setVideoFile(event.target.files?.[0] ?? null)}
          />
        </label>
        <label className="block text-sm font-medium">
          字幕文件
          <input
            className="mt-1 w-full rounded border border-line px-3 py-2"
            type="file"
            accept=".srt,.vtt,text/vtt"
            disabled={sourceType === "external_embed"}
            onChange={handleSubtitleFile}
          />
        </label>
        <label className="block text-sm font-medium md:col-span-2">
          外部链接
          <input
            className="mt-1 w-full rounded border border-line px-3 py-2"
            type="url"
            value={sourceUrl}
            disabled={sourceType === "local_file"}
            onChange={(event) => setSourceUrl(event.target.value)}
            required={sourceType !== "local_file"}
          />
        </label>
        <label className="block text-sm font-medium md:col-span-2">
          粘贴字幕
          <textarea
            className="mt-1 min-h-44 w-full rounded border border-line px-3 py-2"
            value={sourceType === "external_embed" ? "" : subtitleText}
            disabled={sourceType === "external_embed"}
            onChange={(event) => setSubtitleText(event.target.value)}
            required={requiresSubtitle}
          />
        </label>
        {requiresSubtitle && !optionalString(subtitleText) ? (
          <p className="text-sm text-slate-500 md:col-span-2">本地/网络视频项目需要导入或粘贴 SRT/VTT 字幕。</p>
        ) : null}
        {requiresLocalVideo && !videoFile ? (
          <p className="text-sm text-slate-500 md:col-span-2">本地视频项目需要选择当前设备上的视频文件，文件不会上传到服务器。</p>
        ) : null}
        {createMutation.error ? (
          <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700 md:col-span-2">{createMutation.error.message}</p>
        ) : null}
        <button
          className="w-fit rounded bg-ink px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          type="submit"
          disabled={createMutation.isPending}
        >
          {createMutation.isPending ? "创建中..." : "创建项目"}
        </button>
      </form>
    </section>
  );
}

function inferSubtitleFormat(fileName: string, subtitleText: string): "srt" | "vtt" | undefined {
  if (!fileName && !subtitleText) {
    return undefined;
  }

  if (fileName.toLowerCase().endsWith(".vtt") || subtitleText.trimStart().startsWith("WEBVTT")) {
    return "vtt";
  }

  return "srt";
}

function optionalString(value: string): string | undefined {
  const trimmedValue = value.trim();
  return trimmedValue ? trimmedValue : undefined;
}
