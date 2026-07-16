export interface AudioTranscriptionRequest {
  audio: Uint8Array;
  mimeType: string;
  fileName: string;
}

export interface AudioTranscriptionResult {
  text: string;
  modelName: string;
}

export interface TranscriptionProvider {
  transcribe(request: AudioTranscriptionRequest): Promise<AudioTranscriptionResult>;
}

export interface OpenAiCompatibleTranscriptionProviderOptions {
  baseUrl: string;
  apiKey: string;
  model: string;
  transcriptionPath: string;
  requestTimeoutMs: number;
}

export class TranscriptionProviderTimeoutError extends Error {
  constructor() {
    super("Speech transcription provider request timed out");
    this.name = "TranscriptionProviderTimeoutError";
  }
}

export class TranscriptionProviderInvalidResponseError extends Error {
  constructor() {
    super("Speech transcription provider returned an invalid response");
    this.name = "TranscriptionProviderInvalidResponseError";
  }
}

export class TranscriptionProviderRequestError extends Error {
  constructor(readonly statusCode: number) {
    super(`Speech transcription provider request failed: ${statusCode}`);
    this.name = "TranscriptionProviderRequestError";
  }
}
