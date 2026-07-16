export type AudioCaptureMode = "microphone" | "system" | "mixed";

export interface AudioInputDevice {
  deviceId: string;
  label: string;
}

export interface StartAudioCaptureOptions {
  mode: AudioCaptureMode;
  microphoneDeviceId?: string;
  onSourceEnded?: () => void;
}

export interface AudioCaptureSession {
  readonly mimeType: string;
  getLevel: () => number;
  pause: () => void;
  resume: () => void;
  stop: () => Promise<Blob>;
  cancel: () => void;
}

export class AudioCaptureError extends Error {
  constructor(readonly code: "NOT_SUPPORTED" | "SYSTEM_AUDIO_UNAVAILABLE", message: string) {
    super(message);
    this.name = "AudioCaptureError";
  }
}

export async function listAudioInputDevices(): Promise<AudioInputDevice[]> {
  if (!navigator.mediaDevices?.enumerateDevices) {
    return [];
  }

  const devices = await navigator.mediaDevices.enumerateDevices();
  let anonymousIndex = 0;
  return devices
    .filter((device) => device.kind === "audioinput")
    .map((device) => {
      anonymousIndex += 1;
      return {
        deviceId: device.deviceId,
        label: device.label || `麦克风 ${anonymousIndex}`
      };
    });
}

export async function startAudioCapture(options: StartAudioCaptureOptions): Promise<AudioCaptureSession> {
  if (!navigator.mediaDevices || typeof MediaRecorder === "undefined") {
    throw new AudioCaptureError("NOT_SUPPORTED", "This browser does not support audio recording.");
  }

  const ownedStreams: MediaStream[] = [];
  const audioContexts: AudioContext[] = [];
  let disposed = false;

  try {
    const sourceStreams = await acquireSourceStreams(options, ownedStreams);
    const recordingStream = options.mode === "mixed"
      ? await mixAudioStreams(sourceStreams, audioContexts)
      : new MediaStream(sourceStreams.flatMap((stream) => stream.getAudioTracks()));
    ownedStreams.push(recordingStream);

    const meterContext = audioContexts[0] ?? new AudioContext();
    if (!audioContexts.includes(meterContext)) {
      audioContexts.push(meterContext);
    }
    await meterContext.resume();
    const analyser = meterContext.createAnalyser();
    analyser.fftSize = 256;
    const meterSource = meterContext.createMediaStreamSource(recordingStream);
    meterSource.connect(analyser);
    const samples = new Uint8Array(analyser.fftSize);

    const recorder = createMediaRecorder(recordingStream);
    const chunks: Blob[] = [];
    let stopResolver: ((blob: Blob) => void) | undefined;
    let stopRejecter: ((error: Error) => void) | undefined;

    const dispose = () => {
      if (disposed) {
        return;
      }
      disposed = true;
      meterSource.disconnect();
      analyser.disconnect();
      for (const stream of ownedStreams) {
        for (const track of stream.getTracks()) {
          track.stop();
        }
      }
      for (const context of audioContexts) {
        void context.close();
      }
    };

    for (const stream of sourceStreams) {
      for (const track of stream.getTracks()) {
        track.addEventListener("ended", () => {
          if (!disposed) {
            options.onSourceEnded?.();
          }
        }, { once: true });
      }
    }

    recorder.addEventListener("dataavailable", (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    });
    recorder.addEventListener("error", () => {
      const error = new Error("Audio recording failed.");
      stopRejecter?.(error);
      stopResolver = undefined;
      stopRejecter = undefined;
      dispose();
    });
    recorder.addEventListener("stop", () => {
      const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
      stopResolver?.(blob);
      stopResolver = undefined;
      stopRejecter = undefined;
      dispose();
    });
    recorder.start(250);

    return {
      mimeType: recorder.mimeType,
      getLevel: () => getAudioLevel(analyser, samples),
      pause: () => {
        if (recorder.state === "recording") {
          recorder.pause();
        }
      },
      resume: () => {
        if (recorder.state === "paused") {
          recorder.resume();
        }
      },
      stop: () => new Promise<Blob>((resolve, reject) => {
        if (recorder.state === "inactive") {
          resolve(new Blob(chunks, { type: recorder.mimeType || "audio/webm" }));
          dispose();
          return;
        }

        stopResolver = resolve;
        stopRejecter = reject;
        recorder.stop();
      }),
      cancel: () => {
        stopResolver = undefined;
        stopRejecter = undefined;
        if (recorder.state !== "inactive") {
          recorder.stop();
        } else {
          dispose();
        }
      }
    };
  } catch (error) {
    disposed = true;
    for (const stream of ownedStreams) {
      for (const track of stream.getTracks()) {
        track.stop();
      }
    }
    for (const context of audioContexts) {
      void context.close();
    }
    throw error;
  }
}

async function acquireSourceStreams(
  options: StartAudioCaptureOptions,
  ownedStreams: MediaStream[]
): Promise<MediaStream[]> {
  const streams: MediaStream[] = [];

  if (options.mode === "system" || options.mode === "mixed") {
    if (!navigator.mediaDevices.getDisplayMedia) {
      throw new AudioCaptureError("NOT_SUPPORTED", "This browser does not support system audio capture.");
    }

    const displayStream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: true,
      systemAudio: "include"
    } as DisplayMediaStreamOptions & { systemAudio: "include" });
    ownedStreams.push(displayStream);
    if (!displayStream.getAudioTracks().length) {
      throw new AudioCaptureError(
        "SYSTEM_AUDIO_UNAVAILABLE",
        "No system audio track was shared."
      );
    }
    streams.push(displayStream);
  }

  if (options.mode === "microphone" || options.mode === "mixed") {
    const microphoneStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        ...(options.microphoneDeviceId ? { deviceId: { exact: options.microphoneDeviceId } } : {}),
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      },
      video: false
    });
    ownedStreams.push(microphoneStream);
    streams.push(microphoneStream);
  }

  return streams;
}

async function mixAudioStreams(streams: MediaStream[], audioContexts: AudioContext[]): Promise<MediaStream> {
  const context = new AudioContext();
  audioContexts.push(context);
  await context.resume();
  const destination = context.createMediaStreamDestination();

  for (const stream of streams) {
    const audioOnlyStream = new MediaStream(stream.getAudioTracks());
    context.createMediaStreamSource(audioOnlyStream).connect(destination);
  }

  return destination.stream;
}

function createMediaRecorder(stream: MediaStream): MediaRecorder {
  const mimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"]
    .find((candidate) => MediaRecorder.isTypeSupported(candidate));

  return new MediaRecorder(stream, {
    ...(mimeType ? { mimeType } : {}),
    audioBitsPerSecond: 128_000
  });
}

function getAudioLevel(analyser: AnalyserNode, samples: Uint8Array<ArrayBuffer>): number {
  analyser.getByteTimeDomainData(samples);
  let sum = 0;
  for (const sample of samples) {
    const normalized = (sample - 128) / 128;
    sum += normalized * normalized;
  }
  return Math.min(1, Math.sqrt(sum / samples.length) * 4);
}
