import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import type { SentenceAnalysisJson, SentenceProgressSummary, SubtitleLine } from "@scenego/shared";
import { matchSubtitleLine } from "@scenego/subtitles";
import { analyzeSentence } from "../api/analysis.js";
import { ApiRequestError } from "../api/http.js";
import { getProject, importProjectSubtitles, updateProjectProgress } from "../api/projects.js";
import { listProjectSentenceProgress, upsertSentenceProgress } from "../api/sentences.js";
import { createVocabularyItem } from "../api/vocabulary.js";
import { ExternalStudyPanel } from "../components/ExternalStudyPanel/ExternalStudyPanel.js";
import { StudyPanel } from "../components/StudyPanel/StudyPanel.js";
import { PlayerControls } from "../components/VideoPlayer/PlayerControls.js";
import { VideoPlayer } from "../components/VideoPlayer/VideoPlayer.js";
import { useAuthStore } from "../stores/authStore.js";
import { useLocalMediaStore } from "../stores/localMediaStore.js";
import { usePlayerStore } from "../stores/playerStore.js";

export function PlayerStudyPage() {
  const { projectId } = useParams();
  const [searchParams] = useSearchParams();
  const token = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();
  const videoRef = useRef<HTMLVideoElement>(null);
  const initializedProjectId = useRef<string | null>(null);
  const initializedLineId = useRef<string | null>(null);
  const { currentTime, setCurrentSubtitleLineId, setPlaybackState } = usePlayerStore();
  const localVideo = useLocalMediaStore((state) => (projectId ? state.videosByProjectId[projectId] : undefined));
  const setProjectVideo = useLocalMediaStore((state) => state.setProjectVideo);
  const [analysis, setAnalysis] = useState<SentenceAnalysisJson | undefined>();
  const [manualAnalysis, setManualAnalysis] = useState<SentenceAnalysisJson | undefined>();
  const [manualText, setManualText] = useState("");
  const [manualNote, setManualNote] = useState("");
  const [isManualNoteDirty, setIsManualNoteDirty] = useState(false);
  const [manualVocabularyWord, setManualVocabularyWord] = useState("");
  const [manualVocabularyMeaning, setManualVocabularyMeaning] = useState("");
  const [note, setNote] = useState("");
  const [isNoteDirty, setIsNoteDirty] = useState(false);
  const [subtitleFileName, setSubtitleFileName] = useState("");
  const [subtitleText, setSubtitleText] = useState("");
  const [vocabularyWord, setVocabularyWord] = useState("");
  const [vocabularyMeaning, setVocabularyMeaning] = useState("");

  const projectQuery = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => getProject(token ?? "", projectId ?? ""),
    enabled: Boolean(token && projectId)
  });
  const subtitleLines = projectQuery.data?.subtitleLines ?? [];
  const project = projectQuery.data?.project;
  const sentenceProgressQuery = useQuery({
    queryKey: ["sentence-progress", projectId],
    queryFn: () => listProjectSentenceProgress(token ?? "", projectId ?? ""),
    enabled: Boolean(token && projectId)
  });
  const currentLine = useMemo(
    () => matchSubtitleLine(subtitleLines, currentTime) ?? undefined,
    [currentTime, subtitleLines]
  );
  const targetLineId = searchParams.get("lineId");
  const targetLine = useMemo(
    () => subtitleLines.find((line) => line.id === targetLineId),
    [subtitleLines, targetLineId]
  );
  const currentLineIndex = currentLine ? subtitleLines.findIndex((line) => line.id === currentLine.id) : -1;
  const progressBySubtitleLineId = useMemo(
    () => toProgressBySubtitleLineId(sentenceProgressQuery.data?.progresses ?? []),
    [sentenceProgressQuery.data?.progresses]
  );
  const progressByManualText = useMemo(
    () => toProgressByManualText(sentenceProgressQuery.data?.progresses ?? []),
    [sentenceProgressQuery.data?.progresses]
  );
  const currentProgress = currentLine ? progressBySubtitleLineId.get(currentLine.id) : undefined;
  const manualTextKey = normalizeManualText(manualText);
  const currentManualProgress = manualTextKey ? progressByManualText.get(manualTextKey) : undefined;
  const sourceUrl =
    project?.sourceType === "local_file"
      ? localVideo?.objectUrl
      : project?.sourceType === "network_url"
        ? project.sourceUrl
        : undefined;

  useEffect(() => {
    if (!project || initializedProjectId.current === project.id) {
      return;
    }

    initializedProjectId.current = project.id;
    setPlaybackState({
      currentTime: targetLine?.startTime ?? project.lastPosition,
      duration: project.duration ?? 0,
      isPaused: true,
      currentSubtitleLineId: undefined
    });
    setAnalysis(undefined);
    setManualAnalysis(undefined);
    setManualText("");
    setManualNote("");
    setIsManualNoteDirty(false);
    setNote("");
    setIsNoteDirty(false);
  }, [project, setPlaybackState, targetLine?.startTime]);

  useEffect(() => {
    if (!targetLine || initializedLineId.current === targetLine.id) {
      return;
    }

    initializedLineId.current = targetLine.id;
    seekToLine(targetLine);
  }, [targetLine?.id, targetLine?.startTime]);

  useEffect(() => {
    setCurrentSubtitleLineId(currentLine?.id);
    setAnalysis(undefined);
    setIsNoteDirty(false);
  }, [currentLine?.id, setCurrentSubtitleLineId]);

  useEffect(() => {
    if (!isNoteDirty) {
      setNote(currentProgress?.note ?? "");
    }
  }, [currentProgress?.note, currentLine?.id, isNoteDirty]);

  useEffect(() => {
    setManualAnalysis(undefined);
    setIsManualNoteDirty(false);
  }, [manualTextKey]);

  useEffect(() => {
    if (!isManualNoteDirty) {
      setManualNote(currentManualProgress?.note ?? "");
    }
  }, [currentManualProgress?.note, manualTextKey, isManualNoteDirty]);

  const saveProgressMutation = useMutation({
    mutationFn: (position: number) => updateProjectProgress(token ?? "", projectId ?? "", position),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      void queryClient.invalidateQueries({ queryKey: ["projects"] });
    }
  });
  const saveDurationMutation = useMutation({
    mutationFn: (duration: number) =>
      updateProjectProgress(token ?? "", projectId ?? "", project?.lastPosition ?? currentTime, duration),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      void queryClient.invalidateQueries({ queryKey: ["projects"] });
    }
  });
  const sentenceProgressMutation = useMutation({
    mutationFn: (input: {
      isFavorite?: boolean;
      listenCountIncrement?: number;
      manualText?: string;
      note?: string | null;
      status?: "viewed" | "learning" | "mastered";
    }) =>
      upsertSentenceProgress(token ?? "", {
        projectId: projectId ?? "",
        subtitleLineId: input.manualText ? undefined : currentLine?.id,
        manualText: input.manualText,
        status: input.status,
        listenCountIncrement: input.listenCountIncrement,
        isFavorite: input.isFavorite,
        note: input.note
      }),
    onSuccess: (_response, input) => {
      if (input.note !== undefined || input.isFavorite !== undefined) {
        if (input.manualText) {
          setIsManualNoteDirty(false);
        } else {
          setIsNoteDirty(false);
        }
      }
      void queryClient.invalidateQueries({ queryKey: ["sentence-progress", projectId] });
      void queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      void queryClient.invalidateQueries({ queryKey: ["projects"] });
      void queryClient.invalidateQueries({ queryKey: ["favorite-sentences"] });
    }
  });
  const analyzeMutation = useMutation({
    mutationFn: () =>
      analyzeSentence(token ?? "", {
        projectId: projectId ?? "",
        subtitleLineId: currentLine?.id
      }),
    onSuccess: (response) => setAnalysis(response.analysis)
  });
  const manualAnalyzeMutation = useMutation({
    mutationFn: () =>
      analyzeSentence(token ?? "", {
        projectId: projectId ?? "",
        text: manualTextKey,
        language: project?.language
      }),
    onSuccess: (response) => setManualAnalysis(response.analysis)
  });
  const vocabularyMutation = useMutation({
    mutationFn: (input?: { meaning?: string; sourceText?: string; sourceType?: "video_subtitle" | "external_manual"; word?: string }) =>
      createVocabularyItem(token ?? "", {
        projectId: projectId ?? "",
        subtitleLineId: currentLine?.id,
        word: input?.word ?? vocabularyWord,
        meaning: input?.meaning ?? (vocabularyMeaning || undefined),
        language: project?.language,
        sourceText: input?.sourceText ?? currentLine?.textOriginal,
        sourceType: input?.sourceType ?? (currentLine ? "video_subtitle" : undefined)
      }),
    onSuccess: () => {
      setVocabularyWord("");
      setVocabularyMeaning("");
      void queryClient.invalidateQueries({ queryKey: ["vocabulary"] });
      void queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      void queryClient.invalidateQueries({ queryKey: ["projects"] });
    }
  });
  const subtitleImportMutation = useMutation({
    mutationFn: () =>
      importProjectSubtitles(token ?? "", projectId ?? "", {
        subtitleText,
        subtitleFileName: optionalString(subtitleFileName),
        subtitleFormat: inferSubtitleFormat(subtitleFileName, subtitleText)
      }),
    onSuccess: () => {
      setSubtitleFileName("");
      setSubtitleText("");
      setAnalysis(undefined);
      setNote("");
      setIsNoteDirty(false);
      setPlaybackState({ currentSubtitleLineId: undefined });
      void queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      void queryClient.invalidateQueries({ queryKey: ["projects"] });
      void queryClient.invalidateQueries({ queryKey: ["sentence-progress", projectId] });
      void queryClient.invalidateQueries({ queryKey: ["favorite-sentences"] });
      void queryClient.invalidateQueries({ queryKey: ["vocabulary"] });
    }
  });

  function handleVideoFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file && projectId && project?.sourceType === "local_file") {
      setProjectVideo(projectId, file);
    }
  }

  async function handleSubtitleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setSubtitleFileName(file.name);
    setSubtitleText(await file.text());
  }

  function handleDurationChange(duration: number) {
    setPlaybackState({ duration });

    if (
      projectId &&
      Number.isFinite(duration) &&
      duration > 0 &&
      !saveDurationMutation.isPending &&
      Math.abs(duration - (project?.duration ?? 0)) > 0.5
    ) {
      saveDurationMutation.mutate(duration);
    }
  }

  function saveProgress(position = currentTime) {
    if (projectId) {
      saveProgressMutation.mutate(position);
    }

    if (currentLine) {
      sentenceProgressMutation.mutate({});
    }
  }

  function seekToLine(line?: SubtitleLine) {
    if (!line || !videoRef.current) {
      return;
    }

    videoRef.current.currentTime = line.startTime;
    setPlaybackState({ currentTime: line.startTime });
  }

  function replayCurrentLine() {
    if (!currentLine) {
      return;
    }

    seekToLine(currentLine);
    sentenceProgressMutation.mutate({ listenCountIncrement: 1 });
    void videoRef.current?.play();
  }

  function goPreviousLine() {
    seekToLine(subtitleLines[Math.max(0, currentLineIndex - 1)]);
  }

  function goNextLine() {
    const fallbackIndex = subtitleLines.findIndex((line) => line.startTime > currentTime);
    const nextIndex = currentLineIndex >= 0 ? currentLineIndex + 1 : fallbackIndex;
    seekToLine(subtitleLines[nextIndex]);
  }

  const analysisError = getErrorMessage(analyzeMutation.error);
  const manualAnalysisError = getErrorMessage(manualAnalyzeMutation.error);

  if (projectQuery.isLoading) {
    return <div className="rounded border border-line bg-white p-8 text-center text-sm text-slate-500">加载学习项目...</div>;
  }

  if (!project || !projectId) {
    return <div className="rounded border border-line bg-white p-8 text-center text-sm text-red-600">项目不存在</div>;
  }

  if (project.sourceType === "external_embed") {
    return (
      <ExternalStudyPanel
        externalUrl={project.sourceUrl}
        manualText={manualText}
        analysis={manualAnalysis}
        analysisError={manualAnalysisError}
        isFavorite={currentManualProgress?.isFavorite}
        isAnalyzing={manualAnalyzeMutation.isPending}
        note={manualNote}
        status={currentManualProgress?.status}
        vocabularyMeaning={manualVocabularyMeaning}
        vocabularyWord={manualVocabularyWord}
        onManualTextChange={setManualText}
        onAnalyzeManual={() => manualAnalyzeMutation.mutate()}
        onFavoriteManual={() =>
          sentenceProgressMutation.mutate({
            isFavorite: !currentManualProgress?.isFavorite,
            manualText: manualTextKey,
            note: manualNote
          })
        }
        onStatusManual={(status) =>
          sentenceProgressMutation.mutate({
            manualText: manualTextKey,
            note: manualNote,
            status
          })
        }
        onNoteChange={(nextNote) => {
          setManualNote(nextNote);
          setIsManualNoteDirty(true);
        }}
        onSaveManualNote={() =>
          sentenceProgressMutation.mutate({
            manualText: manualTextKey,
            note: manualNote
          })
        }
        onVocabularyMeaningChange={setManualVocabularyMeaning}
        onVocabularyWordChange={setManualVocabularyWord}
        onAddVocabulary={() =>
          vocabularyMutation.mutate(
            {
              word: manualVocabularyWord,
              meaning: manualVocabularyMeaning || undefined,
              sourceText: manualTextKey,
              sourceType: "external_manual"
            },
            {
              onSuccess: () => {
                setManualVocabularyWord("");
                setManualVocabularyMeaning("");
              }
            }
          )
        }
      />
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <section className="space-y-4">
        <div className="rounded border border-line bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-lg font-semibold">{project.title}</h1>
              <p className="mt-1 text-sm text-slate-600">
                {project.language} · {subtitleLines.length} 句字幕
              </p>
            </div>
            {project.sourceType === "local_file" ? (
              <label className="rounded border border-line px-3 py-2 text-sm text-slate-700">
                选择本地视频
                <input className="sr-only" type="file" accept="video/*" onChange={handleVideoFile} />
              </label>
            ) : null}
          </div>
        </div>
        <VideoPlayer
          videoRef={videoRef}
          sourceUrl={sourceUrl}
          initialPosition={targetLine?.startTime ?? project.lastPosition}
          subtitleText={currentLine?.textOriginal}
          onTimeUpdate={(time) => setPlaybackState({ currentTime: time, isPaused: false })}
          onDurationChange={handleDurationChange}
          onPause={(time) => {
            setPlaybackState({ currentTime: time, isPaused: true });
            saveProgress(time);
          }}
          onPlay={() => setPlaybackState({ isPaused: false })}
        />
        <PlayerControls
          disabled={!subtitleLines.length}
          onPrevious={goPreviousLine}
          onReplay={replayCurrentLine}
          onNext={goNextLine}
          onSaveProgress={() => saveProgress()}
        />
        {project.sourceType === "local_file" && !sourceUrl ? (
          <div className="rounded border border-dashed border-line bg-white p-6 text-center text-sm text-slate-500">
            本地视频不会上传到服务器。请选择当前设备上的视频文件后继续学习。
          </div>
        ) : null}
        <section className="rounded border border-line bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">替换字幕</h2>
              <p className="mt-1 text-xs text-slate-500">支持用户提供的 SRT / VTT 文件或粘贴文本。</p>
            </div>
            <label className="rounded border border-line px-3 py-2 text-sm text-slate-700">
              选择字幕文件
              <input className="sr-only" type="file" accept=".srt,.vtt,text/vtt" onChange={handleSubtitleFile} />
            </label>
          </div>
          {subtitleFileName ? <p className="mt-3 text-xs text-slate-500">{subtitleFileName}</p> : null}
          <textarea
            className="mt-3 min-h-24 w-full rounded border border-line bg-white p-3 text-sm outline-none focus:border-accent"
            placeholder="粘贴 SRT / VTT 字幕"
            value={subtitleText}
            onChange={(event) => setSubtitleText(event.target.value)}
          />
          {subtitleImportMutation.error ? (
            <p className="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
              {getErrorMessage(subtitleImportMutation.error)}
            </p>
          ) : null}
          <button
            className="mt-3 rounded bg-ink px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            type="button"
            disabled={!subtitleText.trim() || subtitleImportMutation.isPending}
            onClick={() => subtitleImportMutation.mutate()}
          >
            {subtitleImportMutation.isPending ? "导入中..." : "替换字幕"}
          </button>
        </section>
      </section>
      <StudyPanel
        currentLine={currentLine}
        analysis={analysis}
        analysisError={analysisError}
        isFavorite={currentProgress?.isFavorite}
        isAnalyzing={analyzeMutation.isPending}
        listenCount={currentProgress?.listenCount ?? 0}
        note={note}
        status={currentProgress?.status}
        onAnalyze={() => analyzeMutation.mutate()}
        onFavorite={() => sentenceProgressMutation.mutate({ isFavorite: !currentProgress?.isFavorite, note })}
        onStatusChange={(status) => sentenceProgressMutation.mutate({ status, note })}
        onAddVocabulary={() =>
          vocabularyMutation.mutate({
            word: vocabularyWord,
            meaning: vocabularyMeaning || undefined
          })
        }
        onNoteChange={(nextNote) => {
          setNote(nextNote);
          setIsNoteDirty(true);
        }}
        onSaveNote={() => sentenceProgressMutation.mutate({ note })}
        onVocabularyMeaningChange={setVocabularyMeaning}
        onVocabularyWordChange={setVocabularyWord}
        vocabularyMeaning={vocabularyMeaning}
        vocabularyWord={vocabularyWord}
      />
    </div>
  );
}

function getErrorMessage(error: unknown): string | undefined {
  if (!error) {
    return undefined;
  }

  if (error instanceof ApiRequestError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "请求失败";
}

function toProgressBySubtitleLineId(progresses: SentenceProgressSummary[]) {
  const progressBySubtitleLineId = new Map<string, SentenceProgressSummary>();

  for (const progress of progresses) {
    if (progress.subtitleLineId) {
      progressBySubtitleLineId.set(progress.subtitleLineId, progress);
    }
  }

  return progressBySubtitleLineId;
}

function toProgressByManualText(progresses: SentenceProgressSummary[]) {
  const progressByManualText = new Map<string, SentenceProgressSummary>();

  for (const progress of progresses) {
    const manualText = normalizeManualText(progress.manualText);
    if (manualText) {
      progressByManualText.set(manualText, progress);
    }
  }

  return progressByManualText;
}

function normalizeManualText(text: string | undefined): string {
  return text?.trim() ?? "";
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
