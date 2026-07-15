import type { AnalyzeConversationApiResponse, AnalyzeConversationInput, TextAnalysisJson } from "@scenego/shared";
import { create } from "zustand";
import { streamConversation } from "../api/textStudy.js";

export type ConversationStreamStatus = "streaming" | "completed" | "error";

export interface ConversationStreamJob {
  id: string;
  input: AnalyzeConversationInput;
  conversationId?: string;
  reply: string;
  classificationReasoning: string;
  analysisReasoning: string;
  analysis?: TextAnalysisJson;
  status: ConversationStreamStatus;
  response?: AnalyzeConversationApiResponse;
  error?: string;
  startedAt: number;
}

interface ConversationStreamStore {
  jobs: Record<string, ConversationStreamJob>;
  currentJobId?: string;
  start: (token: string, input: AnalyzeConversationInput) => string;
  dismissCurrent: () => void;
  reset: () => void;
}

interface PendingStreamUpdate {
  reply: string;
  classificationReasoning: string;
  analysisReasoning: string;
  analysis?: TextAnalysisJson;
  timer?: ReturnType<typeof setTimeout>;
}

const STREAM_RENDER_INTERVAL_MS = 32;

export const useConversationStreamStore = create<ConversationStreamStore>((set, get) => {
  const pendingUpdates = new Map<string, PendingStreamUpdate>();
  const updateJob = (
    id: string,
    patch:
      | Partial<ConversationStreamJob>
      | ((current: ConversationStreamJob) => Partial<ConversationStreamJob>)
  ) => {
    set((state) => {
      const current = state.jobs[id];
      if (!current) {
        return state;
      }

      return {
        jobs: {
          ...state.jobs,
          [id]: {
            ...current,
            ...(typeof patch === "function" ? patch(current) : patch)
          }
        }
      };
    });
  };
  const flushPendingUpdate = (id: string) => {
    const pending = pendingUpdates.get(id);
    if (!pending) {
      return;
    }

    if (pending.timer) {
      clearTimeout(pending.timer);
    }
    pendingUpdates.delete(id);
    updateJob(id, (current) => ({
      reply: `${current.reply}${pending.reply}`,
      classificationReasoning: `${current.classificationReasoning}${pending.classificationReasoning}`,
      analysisReasoning: `${current.analysisReasoning}${pending.analysisReasoning}`,
      ...(pending.analysis ? { analysis: pending.analysis } : {})
    }));
  };
  const enqueueStreamUpdate = (
    id: string,
    patch: Partial<Omit<PendingStreamUpdate, "timer">>
  ) => {
    const pending = pendingUpdates.get(id) ?? {
      reply: "",
      classificationReasoning: "",
      analysisReasoning: ""
    };
    pending.reply += patch.reply ?? "";
    pending.classificationReasoning += patch.classificationReasoning ?? "";
    pending.analysisReasoning += patch.analysisReasoning ?? "";
    pending.analysis = patch.analysis ?? pending.analysis;
    if (!pending.timer) {
      pending.timer = setTimeout(() => flushPendingUpdate(id), STREAM_RENDER_INTERVAL_MS);
    }
    pendingUpdates.set(id, pending);
  };

  return {
    jobs: {},
    currentJobId: undefined,
    start: (token, input) => {
      const id = `conversation-stream-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const job: ConversationStreamJob = {
        id,
        input,
        reply: "",
        classificationReasoning: "",
        analysisReasoning: "",
        status: "streaming",
        startedAt: Date.now()
      };

      set((state) => ({
        jobs: { ...state.jobs, [id]: job },
        currentJobId: id
      }));

      void streamConversation(token, input, {
        onConversationId: (conversationId) => updateJob(id, { conversationId }),
        onContentDelta: (delta) => enqueueStreamUpdate(id, { reply: delta }),
        onReasoningDelta: (phase, delta) =>
          enqueueStreamUpdate(
            id,
            phase === "classification"
              ? { classificationReasoning: delta }
              : { analysisReasoning: delta }
          ),
        onAnalysisDelta: (analysis) => enqueueStreamUpdate(id, { analysis })
      })
        .then((response) => {
          flushPendingUpdate(id);
          updateJob(id, {
            conversationId: response.conversationId,
            status: "completed",
            response,
            reply: response.reply,
            analysis: response.analysis ?? get().jobs[id]?.analysis,
            classificationReasoning:
              response.classificationReasoning ?? get().jobs[id]?.classificationReasoning ?? "",
            analysisReasoning: response.analysisReasoning ?? get().jobs[id]?.analysisReasoning ?? ""
          });
        })
        .catch((error: unknown) => {
          flushPendingUpdate(id);
          updateJob(id, {
            status: "error",
            error: getStreamErrorMessage(error)
          });
        });

      return id;
    },
    dismissCurrent: () => set({ currentJobId: undefined }),
    reset: () => {
      for (const pending of pendingUpdates.values()) {
        if (pending.timer) {
          clearTimeout(pending.timer);
        }
      }
      pendingUpdates.clear();
      set({ jobs: {}, currentJobId: undefined });
    }
  };
});

function getStreamErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "对话流连接失败";
}
