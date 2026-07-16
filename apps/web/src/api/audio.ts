import type { TranscribeAudioApiResponse } from "@scenego/shared";
import { apiRequest } from "./http.js";

export function transcribeAudio(token: string, audio: Blob) {
  return apiRequest<TranscribeAudioApiResponse>("/api/v1/audio/transcriptions", {
    method: "POST",
    token,
    headers: {
      "Content-Type": audio.type || "application/octet-stream",
      "X-Audio-Filename": createAudioFileName(audio.type)
    },
    body: audio
  });
}

function createAudioFileName(mimeType: string): string {
  if (mimeType.includes("mp4")) {
    return "scenego-recording.m4a";
  }

  if (mimeType.includes("ogg")) {
    return "scenego-recording.ogg";
  }

  return "scenego-recording.webm";
}
