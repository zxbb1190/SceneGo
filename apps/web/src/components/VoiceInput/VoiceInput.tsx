import {
  AudioLines,
  Laptop,
  Mic,
  Pause,
  Play,
  Radio,
  Square,
  X
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { transcribeAudio } from "../../api/audio.js";
import { ApiRequestError } from "../../api/http.js";
import {
  AudioCaptureError,
  listAudioInputDevices,
  startAudioCapture,
  type AudioCaptureMode,
  type AudioCaptureSession,
  type AudioInputDevice
} from "./audioCapture.js";

type VoiceStatus = "idle" | "acquiring" | "recording" | "paused" | "transcribing";

export interface VoiceInputProps {
  token: string;
  disabled?: boolean;
  onTranscript: (text: string) => void;
}

const MAX_RECORDING_MS = 5 * 60 * 1000;
const MAX_AUDIO_BYTES = 20 * 1024 * 1024;
const waveformWeights = [0.5, 0.8, 1.15, 0.7, 1.35, 0.9, 1.5, 0.75, 1.2, 0.65, 1.4, 0.85];

export function VoiceInput({ token, disabled = false, onTranscript }: VoiceInputProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<AudioCaptureMode>("microphone");
  const [devices, setDevices] = useState<AudioInputDevice[]>([]);
  const [microphoneDeviceId, setMicrophoneDeviceId] = useState("");
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [level, setLevel] = useState(0);
  const [error, setError] = useState<string>();
  const sessionRef = useRef<AudioCaptureSession>();
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const animationFrameRef = useRef<number>();
  const activeStartedAtRef = useRef<number>();
  const accumulatedMsRef = useRef(0);
  const finishingRef = useRef(false);
  const pausedRef = useRef(false);
  const finishRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    if (!open || !navigator.mediaDevices?.enumerateDevices) {
      return;
    }

    void refreshDevices();
    const handleDeviceChange = () => void refreshDevices();
    navigator.mediaDevices.addEventListener?.("devicechange", handleDeviceChange);
    return () => navigator.mediaDevices.removeEventListener?.("devicechange", handleDeviceChange);
  }, [open]);

  useEffect(() => () => {
    clearActivityTracking();
    sessionRef.current?.cancel();
  }, []);

  finishRef.current = () => {
    void finishRecording();
  };

  async function refreshDevices() {
    try {
      const nextDevices = await listAudioInputDevices();
      setDevices(nextDevices);
      setMicrophoneDeviceId((current) => current || nextDevices[0]?.deviceId || "");
    } catch {
      setDevices([]);
    }
  }

  async function beginRecording() {
    if (!token || status !== "idle") {
      return;
    }

    setError(undefined);
    setStatus("acquiring");
    try {
      const session = await startAudioCapture({
        mode,
        microphoneDeviceId: microphoneDeviceId || undefined,
        onSourceEnded: () => finishRef.current()
      });
      sessionRef.current = session;
      accumulatedMsRef.current = 0;
      pausedRef.current = false;
      activeStartedAtRef.current = Date.now();
      setElapsedMs(0);
      setStatus("recording");
      startActivityTracking(session);
      if (mode !== "system") {
        void refreshDevices();
      }
    } catch (nextError) {
      setStatus("idle");
      setError(getVoiceErrorMessage(nextError));
    }
  }

  async function finishRecording() {
    const session = sessionRef.current;
    if (!session || finishingRef.current) {
      return;
    }

    finishingRef.current = true;
    sessionRef.current = undefined;
    clearActivityTracking();
    setLevel(0);
    setStatus("transcribing");
    setError(undefined);
    try {
      const audio = await session.stop();
      if (!audio.size) {
        throw new Error("EMPTY_AUDIO");
      }
      if (audio.size > MAX_AUDIO_BYTES) {
        throw new Error("AUDIO_TOO_LARGE");
      }
      const result = await transcribeAudio(token, audio);
      if (!result.text.trim()) {
        throw new Error("EMPTY_TRANSCRIPT");
      }
      onTranscript(result.text.trim());
      setOpen(false);
      setElapsedMs(0);
    } catch (nextError) {
      setError(getVoiceErrorMessage(nextError));
    } finally {
      finishingRef.current = false;
      pausedRef.current = false;
      setStatus("idle");
    }
  }

  function cancelRecording() {
    sessionRef.current?.cancel();
    sessionRef.current = undefined;
    clearActivityTracking();
    accumulatedMsRef.current = 0;
    activeStartedAtRef.current = undefined;
    finishingRef.current = false;
    pausedRef.current = false;
    setElapsedMs(0);
    setLevel(0);
    setStatus("idle");
    setError(undefined);
    setOpen(false);
  }

  function togglePause() {
    const session = sessionRef.current;
    if (!session) {
      return;
    }

    if (status === "recording") {
      session.pause();
      pausedRef.current = true;
      accumulatedMsRef.current = getCurrentElapsedMs();
      activeStartedAtRef.current = undefined;
      setElapsedMs(accumulatedMsRef.current);
      setStatus("paused");
      setLevel(0);
      return;
    }

    if (status === "paused") {
      session.resume();
      pausedRef.current = false;
      activeStartedAtRef.current = Date.now();
      setStatus("recording");
    }
  }

  function startActivityTracking(session: AudioCaptureSession) {
    clearActivityTracking();
    timerRef.current = setInterval(() => {
      const nextElapsed = getCurrentElapsedMs();
      setElapsedMs(nextElapsed);
      if (nextElapsed >= MAX_RECORDING_MS) {
        finishRef.current();
      }
    }, 250);

    const updateLevel = () => {
      setLevel(pausedRef.current ? 0 : session.getLevel());
      animationFrameRef.current = window.requestAnimationFrame(updateLevel);
    };
    animationFrameRef.current = window.requestAnimationFrame(updateLevel);
  }

  function clearActivityTracking() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = undefined;
    }
    if (animationFrameRef.current !== undefined) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = undefined;
    }
  }

  function getCurrentElapsedMs(): number {
    return accumulatedMsRef.current + (activeStartedAtRef.current ? Date.now() - activeStartedAtRef.current : 0);
  }

  const isCapturing = status === "recording" || status === "paused";
  const triggerLabel = status === "transcribing" ? "正在转写语音" : isCapturing ? "正在录音" : "语音输入";

  return (
    <div className="voice-input">
      <button
        className={isCapturing || status === "transcribing" ? "voice-trigger is-active" : "voice-trigger"}
        type="button"
        aria-label={triggerLabel}
        title={triggerLabel}
        aria-expanded={open}
        disabled={disabled || !token}
        onClick={() => setOpen((current) => !current)}
      >
        {status === "transcribing" ? <AudioLines aria-hidden="true" /> : <Mic aria-hidden="true" />}
      </button>

      {open ? (
        <div className="voice-panel" role="dialog" aria-label="语音输入设置">
          {status === "idle" || status === "acquiring" ? (
            <>
              <div className="voice-source-options" role="group" aria-label="音频来源">
                <SourceButton mode="microphone" currentMode={mode} icon={<Mic aria-hidden="true" />} onSelect={setMode}>
                  麦克风
                </SourceButton>
                <SourceButton mode="system" currentMode={mode} icon={<Laptop aria-hidden="true" />} onSelect={setMode}>
                  电脑声音
                </SourceButton>
                <SourceButton mode="mixed" currentMode={mode} icon={<Radio aria-hidden="true" />} onSelect={setMode}>
                  混合
                </SourceButton>
              </div>

              {mode !== "system" ? (
                <label className="voice-device-field">
                  <span>麦克风设备</span>
                  <select value={microphoneDeviceId} onChange={(event) => setMicrophoneDeviceId(event.target.value)}>
                    {!devices.length ? <option value="">默认麦克风</option> : null}
                    {devices.map((device) => (
                      <option key={device.deviceId || device.label} value={device.deviceId}>{device.label}</option>
                    ))}
                  </select>
                </label>
              ) : null}

              <button className="voice-start-button" type="button" disabled={status === "acquiring"} onClick={() => void beginRecording()}>
                {status === "acquiring" ? <AudioLines aria-hidden="true" /> : <Mic aria-hidden="true" />}
                <span>{status === "acquiring" ? "正在请求权限" : "开始录音"}</span>
              </button>
            </>
          ) : null}

          {isCapturing ? (
            <div className="voice-recording-state">
              <div className="voice-waveform" aria-hidden="true">
                {waveformWeights.map((weight, index) => (
                  <i key={index} style={{ height: `${Math.max(4, Math.round(level * weight * 28))}px` }} />
                ))}
              </div>
              <strong>{formatDuration(elapsedMs)}</strong>
              <div className="voice-recording-controls">
                <button type="button" aria-label={status === "paused" ? "继续录音" : "暂停录音"} title={status === "paused" ? "继续录音" : "暂停录音"} onClick={togglePause}>
                  {status === "paused" ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
                </button>
                <button className="voice-stop-button" type="button" aria-label="停止并转写" title="停止并转写" onClick={() => void finishRecording()}>
                  <Square aria-hidden="true" />
                </button>
                <button type="button" aria-label="取消录音" title="取消录音" onClick={cancelRecording}>
                  <X aria-hidden="true" />
                </button>
              </div>
            </div>
          ) : null}

          {status === "transcribing" ? (
            <div className="voice-transcribing-state" role="status">
              <AudioLines aria-hidden="true" />
              <span>正在转写...</span>
            </div>
          ) : null}

          {error ? <p className="voice-error" role="alert">{error}</p> : null}
        </div>
      ) : null}
    </div>
  );
}

function SourceButton({
  mode,
  currentMode,
  icon,
  children,
  onSelect
}: {
  mode: AudioCaptureMode;
  currentMode: AudioCaptureMode;
  icon: ReactNode;
  children: ReactNode;
  onSelect: (mode: AudioCaptureMode) => void;
}) {
  return (
    <button
      type="button"
      className={mode === currentMode ? "is-active" : undefined}
      aria-pressed={mode === currentMode}
      onClick={() => onSelect(mode)}
    >
      {icon}
      <span>{children}</span>
    </button>
  );
}

function formatDuration(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function getVoiceErrorMessage(error: unknown): string {
  if (error instanceof AudioCaptureError) {
    return error.code === "SYSTEM_AUDIO_UNAVAILABLE"
      ? "没有获取到电脑声音，请在共享窗口中启用音频。"
      : "当前浏览器不支持此录音方式。";
  }

  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError") {
      return "录音权限未授予。";
    }
    if (error.name === "NotFoundError") {
      return "没有找到可用的音频设备。";
    }
    if (error.name === "NotReadableError") {
      return "音频设备当前无法读取。";
    }
    if (error.name === "AbortError") {
      return "已取消音频来源选择。";
    }
  }

  if (error instanceof ApiRequestError) {
    const messages: Record<string, string> = {
      STT_PROVIDER_NOT_CONFIGURED: "语音转写服务尚未配置。",
      STT_PROVIDER_TIMEOUT: "语音转写超时，请缩短录音后重试。",
      AUDIO_TOO_LARGE: "录音过长，请缩短后重试。",
      AUDIO_TYPE_UNSUPPORTED: "当前录音格式不受支持。"
    };
    return (error.code && messages[error.code]) || error.message;
  }

  if (error instanceof Error) {
    if (error.message === "AUDIO_TOO_LARGE") {
      return "录音过长，请缩短后重试。";
    }
    if (error.message === "EMPTY_AUDIO") {
      return "没有录到声音，请检查音频来源。";
    }
    if (error.message === "EMPTY_TRANSCRIPT") {
      return "没有识别到可用文字。";
    }
  }

  return "语音输入失败，请重试。";
}
