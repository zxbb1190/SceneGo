import { z } from "zod";
import {
  TranscriptionProviderInvalidResponseError,
  TranscriptionProviderRequestError,
  TranscriptionProviderTimeoutError,
  type AudioTranscriptionRequest,
  type AudioTranscriptionResult,
  type OpenAiCompatibleTranscriptionProviderOptions,
  type TranscriptionProvider
} from "./types.js";

const transcriptionResponseSchema = z.object({
  text: z.string()
});

export class OpenAiCompatibleTranscriptionProvider implements TranscriptionProvider {
  private readonly baseUrl: string;

  constructor(private readonly options: OpenAiCompatibleTranscriptionProviderOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
  }

  async transcribe(request: AudioTranscriptionRequest): Promise<AudioTranscriptionResult> {
    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), this.options.requestTimeoutMs);
    const formData = new FormData();
    const audioBytes = new Uint8Array(request.audio.byteLength);
    audioBytes.set(request.audio);
    const audioBlob = new Blob([audioBytes.buffer], { type: request.mimeType });
    formData.append("file", audioBlob, request.fileName);
    formData.append("model", this.options.model);

    try {
      const response = await fetch(`${this.baseUrl}${normalizePath(this.options.transcriptionPath)}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.options.apiKey}`
        },
        body: formData,
        signal: abortController.signal
      });

      if (!response.ok) {
        throw new TranscriptionProviderRequestError(response.status);
      }

      const parsed = transcriptionResponseSchema.safeParse(await readJsonResponse(response));
      if (!parsed.success) {
        throw new TranscriptionProviderInvalidResponseError();
      }

      return {
        text: parsed.data.text.trim(),
        modelName: this.options.model
      };
    } catch (error) {
      if (error instanceof TranscriptionProviderInvalidResponseError) {
        throw error;
      }

      if (isAbortError(error)) {
        throw new TranscriptionProviderTimeoutError();
      }

      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}

async function readJsonResponse(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new TranscriptionProviderInvalidResponseError();
  }
}

function normalizePath(path: string): string {
  return path.startsWith("/") ? path : `/${path}`;
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError");
}
