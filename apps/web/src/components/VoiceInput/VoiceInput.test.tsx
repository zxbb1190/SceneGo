import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { VoiceInput } from "./VoiceInput.js";

const mocks = vi.hoisted(() => ({
  listAudioInputDevices: vi.fn(),
  startAudioCapture: vi.fn(),
  transcribeAudio: vi.fn()
}));

vi.mock("../../api/audio.js", () => ({
  transcribeAudio: mocks.transcribeAudio
}));

vi.mock("./audioCapture.js", () => ({
  AudioCaptureError: class AudioCaptureError extends Error {
    constructor(readonly code: string, message: string) {
      super(message);
    }
  },
  listAudioInputDevices: mocks.listAudioInputDevices,
  startAudioCapture: mocks.startAudioCapture
}));

describe("VoiceInput", () => {
  const session = {
    mimeType: "audio/webm",
    getLevel: vi.fn(() => 0.4),
    pause: vi.fn(),
    resume: vi.fn(),
    stop: vi.fn(async () => new Blob(["audio"], { type: "audio/webm" })),
    cancel: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("navigator", {
      mediaDevices: {
        enumerateDevices: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      }
    });
    vi.stubGlobal("requestAnimationFrame", vi.fn(() => 1));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    mocks.listAudioInputDevices.mockResolvedValue([
      { deviceId: "mic-1", label: "USB Microphone" }
    ]);
    mocks.startAudioCapture.mockResolvedValue(session);
    mocks.transcribeAudio.mockResolvedValue({
      text: "He was not like this in the past.",
      modelName: "test-stt-model"
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("records the selected source and returns editable transcript text", async () => {
    const user = userEvent.setup();
    const onTranscript = vi.fn();
    render(<VoiceInput token="test-token" onTranscript={onTranscript} />);

    await user.click(screen.getByRole("button", { name: "语音输入" }));
    expect(await screen.findByRole("option", { name: "USB Microphone" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "电脑声音" }));
    await user.click(screen.getByRole("button", { name: "开始录音" }));

    await waitFor(() => {
      expect(mocks.startAudioCapture).toHaveBeenCalledWith(expect.objectContaining({ mode: "system" }));
    });
    await user.click(await screen.findByRole("button", { name: "停止并转写" }));

    await waitFor(() => {
      expect(mocks.transcribeAudio).toHaveBeenCalledWith("test-token", expect.any(Blob));
      expect(onTranscript).toHaveBeenCalledWith("He was not like this in the past.");
    });
  });
});
