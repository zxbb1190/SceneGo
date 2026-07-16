import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AnalyzeConversationApiResponse,
  ConversationDetail,
  StudyItemDetail,
  TextVocabularyAnalysis
} from "@scenego/shared";
import {
  ArrowUpRight,
  ArrowDown,
  Bookmark,
  BookPlus,
  BrainCircuit,
  Eraser,
  History,
  MessageSquareText,
  Save,
  Send,
  Sparkles,
  SquarePen,
  Tags
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getConversation, listConversations } from "../api/conversations.js";
import { listStudyItems, updateStudyItem, updateStudyItemNote, addStudyItemVocabulary } from "../api/studyItems.js";
import { TextAnalysisCard, getVocabularyKey } from "../components/TextStudy/TextAnalysisCard.js";
import { VoiceInput } from "../components/VoiceInput/VoiceInput.js";
import { useAuthStore } from "../stores/authStore.js";
import { useConversationStreamStore, type ConversationStreamJob } from "../stores/conversationStreamStore.js";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  item?: StudyItemDetail;
  response?: AnalyzeConversationApiResponse;
  streamJobId?: string;
}

export function TextStudyPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const token = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();
  const resultRegionRef = useRef<HTMLDivElement>(null);
  const scrollRegionRef = useRef<HTMLDivElement>(null);
  const shouldFollowScrollRef = useRef(true);
  const handledStreamJobIdRef = useRef<string | undefined>();
  const loadedHistoryIdRef = useRef<string | undefined>();
  const [text, setText] = useState("");
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [openNoteId, setOpenNoteId] = useState<string | undefined>();
  const [addingVocabularyKey, setAddingVocabularyKey] = useState<string | undefined>();

  const streamJobs = useConversationStreamStore((state) => state.jobs);
  const currentStreamJobId = useConversationStreamStore((state) => state.currentJobId);
  const startConversationStream = useConversationStreamStore((state) => state.start);
  const dismissCurrentStream = useConversationStreamStore((state) => state.dismissCurrent);
  const requestedConversationId = searchParams.get("conversation") ?? undefined;
  const streamJob = useMemo(
    () => findConversationStreamJob(streamJobs, currentStreamJobId, requestedConversationId),
    [currentStreamJobId, requestedConversationId, streamJobs]
  );
  const activeConversationId = requestedConversationId ?? streamJob?.conversationId;
  const historyMode = searchParams.get("history") === "1";
  const conversationListQuery = useQuery({
    queryKey: ["conversations"],
    queryFn: () => listConversations(token ?? ""),
    enabled: Boolean(token)
  });
  const recentQuery = useQuery({
    queryKey: ["study-items", "recent"],
    queryFn: () => listStudyItems(token ?? ""),
    enabled: Boolean(token)
  });
  const historyConversationQuery = useQuery({
    queryKey: ["conversation", requestedConversationId],
    queryFn: () => getConversation(token ?? "", requestedConversationId ?? ""),
    enabled: Boolean(token && requestedConversationId)
  });
  const updateMutation = useMutation({
    mutationFn: (input: { itemId: string; isFavorite: boolean }) =>
      updateStudyItem(token ?? "", input.itemId, { isFavorite: input.isFavorite }),
    onSuccess: (response, input) => {
      replaceMessageItem(input.itemId, response.item);
      void queryClient.invalidateQueries({ queryKey: ["study-items"] });
      void queryClient.invalidateQueries({ queryKey: ["favorite-sentences"] });
    }
  });
  const noteMutation = useMutation({
    mutationFn: (input: { itemId: string; note: string }) => updateStudyItemNote(token ?? "", input.itemId, input.note),
    onSuccess: (response, input) => {
      replaceMessageItem(input.itemId, response.item);
      setOpenNoteId(undefined);
      void queryClient.invalidateQueries({ queryKey: ["study-items"] });
    }
  });
  const vocabularyMutation = useMutation({
    mutationFn: (input: { itemId: string; vocabulary: TextVocabularyAnalysis; key: string; sourceText?: string }) =>
      addStudyItemVocabulary(token ?? "", input.itemId, {
        word: input.vocabulary.word,
        meaning: input.vocabulary.meaning,
        sourceText: input.sourceText
      }),
    onMutate: (input) => setAddingVocabularyKey(input.key),
    onSettled: () => setAddingVocabularyKey(undefined),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["vocabulary"] });
      void queryClient.invalidateQueries({ queryKey: ["study-items"] });
    }
  });
  const batchVocabularyMutation = useMutation({
    mutationFn: async (input: { itemId: string; vocabulary: TextVocabularyAnalysis[]; sourceText?: string }) => {
      await Promise.all(
        input.vocabulary.map((vocabulary) =>
          addStudyItemVocabulary(token ?? "", input.itemId, {
            word: vocabulary.word,
            meaning: vocabulary.meaning,
            sourceText: input.sourceText
          })
        )
      );
    },
    onMutate: () => setAddingVocabularyKey(ADD_ALL_VOCABULARY_KEY),
    onSettled: () => setAddingVocabularyKey(undefined),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["vocabulary"] });
      void queryClient.invalidateQueries({ queryKey: ["study-items"] });
    }
  });

  const activeItem = useMemo(
    () => streamJob?.response?.item ?? [...messages].reverse().find((message) => message.item)?.item,
    [messages, streamJob?.response?.item]
  );
  const latestAssistantId = [...messages].reverse().find((message) => message.role === "assistant")?.id;
  const isStreaming = streamJob?.status === "streaming";
  const streamingReply = streamJob?.reply ?? "";
  const streamingClassificationReasoning = streamJob?.classificationReasoning ?? "";
  const streamingAnalysisReasoning = streamJob?.analysisReasoning ?? "";
  const streamingAnalysis = streamJob?.analysis;
  const hasCommittedStreamMessage = Boolean(
    streamJob && messages.some((message) => message.streamJobId === streamJob.id)
  );
  const completedStreamMessage: ChatMessage | undefined =
    streamJob?.response && !hasCommittedStreamMessage
      ? {
          id: `stream-assistant-${streamJob.id}`,
          role: "assistant",
          content: streamJob.response.reply,
          item: streamJob.response.item,
          response: streamJob.response,
          streamJobId: streamJob.id
        }
      : undefined;
  const conversationError = streamJob?.status === "error" ? streamJob.error : undefined;
  const canSend = Boolean(text.trim()) && !isStreaming;

  useEffect(() => {
    const conversation = historyConversationQuery.data?.conversation;
    if (!conversation || loadedHistoryIdRef.current === conversation.id) {
      return;
    }

    loadedHistoryIdRef.current = conversation.id;
    setConversationId(conversation.id);
    setNoteDrafts(
      Object.fromEntries(
        conversation.messages
          .filter((message) => message.studyItem)
          .map((message) => [message.studyItem!.id, message.studyItem!.note ?? ""])
      )
    );
    setMessages(createConversationMessages(conversation));
    setText("");
    shouldFollowScrollRef.current = true;
  }, [historyConversationQuery.data]);

  useEffect(() => {
    if (requestedConversationId || !streamJob || messages.length) {
      return;
    }

    setConversationId(streamJob.conversationId ?? streamJob.input.conversationId);
    setMessages([
      {
        id: `stream-user-${streamJob.id}`,
        role: "user",
        content: streamJob.input.message
      }
    ]);
    shouldFollowScrollRef.current = true;
  }, [messages.length, requestedConversationId, streamJob]);

  useEffect(() => {
    if (!streamJob?.conversationId) {
      return;
    }

    setConversationId(streamJob.conversationId);
    void queryClient.invalidateQueries({ queryKey: ["conversations"] });
  }, [queryClient, streamJob?.conversationId]);

  useEffect(() => {
    const response = streamJob?.response;
    if (!response || handledStreamJobIdRef.current === streamJob.id) {
      return;
    }

    handledStreamJobIdRef.current = streamJob.id;
    setConversationId(response.conversationId);
    setMessages((current) => {
      if (current.some((message) => message.role === "assistant" && message.response?.conversationId === response.conversationId)) {
        return current;
      }

      const lastUserIndex = findLastIndex(current, (message) => message.role === "user" && !message.item);
      const withItem = response.item
        ? current.map((message, index) => (index === lastUserIndex ? { ...message, item: response.item } : message))
        : current;

      return [
        ...withItem,
        {
          id: createMessageId("assistant"),
          role: "assistant",
          content: response.reply,
          item: response.item,
          response,
          streamJobId: streamJob.id
        }
      ];
    });
    if (response.item) {
      setNoteDrafts((current) => ({ ...current, [response.item!.id]: response.item!.note ?? "" }));
    }
    void queryClient.invalidateQueries({ queryKey: ["conversation", response.conversationId] });
    void queryClient.invalidateQueries({ queryKey: ["conversations"] });
    void queryClient.invalidateQueries({ queryKey: ["study-items"] });
  }, [queryClient, streamJob]);

  useEffect(() => {
    if (searchParams.get("new") !== "1") {
      return;
    }

    startNewConversation();
    setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (!latestAssistantId) {
      return;
    }

    window.requestAnimationFrame(() => {
      resultRegionRef.current?.focus({ preventScroll: true });
    });
  }, [latestAssistantId]);

  useEffect(() => {
    window.requestAnimationFrame(() => {
      if (shouldFollowScrollRef.current) {
        scrollToBottom(isStreaming ? "auto" : "smooth");
      } else {
        updateScrollPosition();
      }
    });
  }, [
    isStreaming,
    messages.length,
    streamingAnalysis,
    streamingAnalysisReasoning.length,
    streamingClassificationReasoning.length,
    streamingReply.length
  ]);

  function startNewConversation() {
    loadedHistoryIdRef.current = undefined;
    handledStreamJobIdRef.current = undefined;
    dismissCurrentStream();
    setConversationId(undefined);
    setMessages([]);
    setText("");
    setShowScrollToBottom(false);
    setNoteDrafts({});
    setOpenNoteId(undefined);
    shouldFollowScrollRef.current = true;
  }

  function sendMessage() {
    const message = text.trim();
    if (!message || isStreaming || !token) {
      return;
    }

    const history = messages.slice(-12).map(({ role, content }) => ({ role, content }));
    handledStreamJobIdRef.current = undefined;
    shouldFollowScrollRef.current = true;
    setShowScrollToBottom(false);
    setMessages((current) => [
      ...current,
      {
        id: createMessageId("user"),
        role: "user",
        content: message
      }
    ]);
    setText("");
    startConversationStream(token, { message, history, conversationId });
  }

  function handleScroll() {
    updateScrollPosition();
  }

  function updateScrollPosition() {
    const region = scrollRegionRef.current;
    if (!region) {
      return;
    }

    const isNearBottom = region.scrollHeight - region.scrollTop - region.clientHeight <= 96;
    shouldFollowScrollRef.current = isNearBottom;
    setShowScrollToBottom(!isNearBottom);
  }

  function scrollToBottom(behavior: ScrollBehavior = "smooth") {
    const region = scrollRegionRef.current;
    if (!region) {
      return;
    }

    shouldFollowScrollRef.current = true;
    setShowScrollToBottom(false);
    if (typeof region.scrollTo === "function") {
      region.scrollTo({ top: region.scrollHeight, behavior });
    } else {
      region.scrollTop = region.scrollHeight;
    }
  }

  function replaceMessageItem(itemId: string, item: StudyItemDetail) {
    setMessages((current) =>
      current.map((message) => {
        if (message.item?.id !== itemId) {
          return message;
        }

        return {
          ...message,
          item,
          response: message.response ? { ...message.response, item, analysis: item.analysis } : undefined
        };
      })
    );
    setNoteDrafts((current) => ({ ...current, [itemId]: item.note ?? current[itemId] ?? "" }));
  }

  function toggleNote(item: StudyItemDetail) {
    setNoteDrafts((current) => ({ ...current, [item.id]: current[item.id] ?? item.note ?? "" }));
    setOpenNoteId((current) => (current === item.id ? undefined : item.id));
  }

  function renderAssistantMessage(message: ChatMessage) {
    return (
      <AssistantMessage
        key={message.id}
        message={message}
        resultRegionRef={message.id === latestAssistantId ? resultRegionRef : undefined}
        addingVocabularyKey={addingVocabularyKey}
        favoritePending={updateMutation.isPending && updateMutation.variables?.itemId === message.item?.id}
        batchVocabularyPending={batchVocabularyMutation.isPending}
        onToggleFavorite={() => {
          if (message.item) {
            updateMutation.mutate({ itemId: message.item.id, isFavorite: !message.item.isFavorite });
          }
        }}
        onAddVocabulary={(vocabulary, index) => {
          if (message.item) {
            vocabularyMutation.mutate({
              itemId: message.item.id,
              vocabulary,
              key: getVocabularyKey(vocabulary, index),
              sourceText: message.item.textOriginal
            });
          }
        }}
        onAddAllVocabulary={() => {
          if (message.item && message.response?.analysis?.vocabulary.length) {
            batchVocabularyMutation.mutate({
              itemId: message.item.id,
              vocabulary: message.response.analysis.vocabulary,
              sourceText: message.item.textOriginal
            });
          }
        }}
      />
    );
  }

  return (
    <section className="chat-page">
      <aside className="chat-history-panel" aria-label="最近对话">
        <button
          className="chat-new-button"
          type="button"
          onClick={() => {
            startNewConversation();
            setSearchParams({}, { replace: true });
          }}
        >
          <SquarePen aria-hidden="true" /> 新对话
        </button>
        <div className="chat-history-heading">
          <History aria-hidden="true" />
          <span>最近对话</span>
          <Link to={historyMode ? "/" : "/?history=1"}>{historyMode ? "收起" : "全部"}</Link>
        </div>
        <div className="chat-history-list">
          {(historyMode
            ? conversationListQuery.data?.conversations
            : conversationListQuery.data?.conversations.slice(0, 8))?.map((conversation) => (
            <Link
              key={conversation.id}
              className={activeConversationId === conversation.id ? "is-active" : ""}
              to={`/?conversation=${conversation.id}`}
            >
              <strong>{conversation.title}</strong>
              <span>{conversation.lastMessage ?? `${conversation.messageCount} 条消息`}</span>
            </Link>
          ))}
          {conversationListQuery.isLoading ? <p className="chat-muted-copy">正在载入...</p> : null}
          {!conversationListQuery.isLoading && !conversationListQuery.data?.conversations.length ? <p className="chat-muted-copy">还没有对话记录</p> : null}
        </div>
      </aside>

      <div className="chat-conversation">
        <div ref={scrollRegionRef} className="chat-scroll-region" onScroll={handleScroll}>
          <div className="chat-transcript">
            {!messages.length ? (
              <div className="chat-empty-state">
                <span className="chat-empty-mark">S</span>
                <h2>今天想学哪一句？</h2>
                <p>输入表达、追问上一句，或聊聊其他语言问题。</p>
                <div className="chat-prompt-row">
                  {exampleTexts.map((example) => (
                    <button key={example.label} type="button" onClick={() => setText(example.text)}>
                      {example.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((message) =>
                  message.role === "user" ? (
                    <UserMessage
                      key={message.id}
                      message={message}
                      note={message.item ? noteDrafts[message.item.id] ?? message.item.note ?? "" : ""}
                      noteOpen={message.item?.id === openNoteId}
                      notePending={noteMutation.isPending && noteMutation.variables?.itemId === message.item?.id}
                      onChangeNote={(value) => {
                        if (message.item) {
                          setNoteDrafts((current) => ({ ...current, [message.item!.id]: value }));
                        }
                      }}
                      onSaveNote={() => {
                        if (message.item) {
                          noteMutation.mutate({ itemId: message.item.id, note: noteDrafts[message.item.id] ?? "" });
                        }
                      }}
                      onToggleNote={() => message.item && toggleNote(message.item)}
                    />
                  ) : renderAssistantMessage(message)
                )}
                {completedStreamMessage ? renderAssistantMessage(completedStreamMessage) : null}
                {isStreaming && !hasCommittedStreamMessage ? (
                  <article className="chat-message chat-message-assistant chat-message-pending" aria-label="AI 正在回复">
                    <div className="chat-assistant-body">
                      {streamingClassificationReasoning ? (
                        <ReasoningBlock
                          label="理解与分类"
                          reasoning={streamingClassificationReasoning}
                          streaming={isStreaming && !streamingAnalysis}
                        />
                      ) : null}
                      {streamingAnalysisReasoning ? (
                        <ReasoningBlock label="学习分析" reasoning={streamingAnalysisReasoning} streaming={isStreaming} />
                      ) : null}
                      {streamingReply ? (
                        <p className="chat-assistant-text chat-streaming-text">{streamingReply}<span aria-hidden="true" /></p>
                      ) : !streamingClassificationReasoning && !streamingAnalysisReasoning ? (
                        <p className="chat-stream-stage">
                          <Sparkles aria-hidden="true" />
                          {streamingAnalysis ? "正在生成学习分析" : "正在理解你的消息"}
                        </p>
                      ) : null}
                      {streamingAnalysis ? <TextAnalysisCard analysis={streamingAnalysis} streaming /> : null}
                    </div>
                  </article>
                ) : null}
                {historyConversationQuery.isLoading ? <p className="chat-muted-copy">正在恢复这段对话...</p> : null}
              </>
            )}
          </div>
        </div>

        {showScrollToBottom ? (
          <button
            className="chat-scroll-to-bottom"
            type="button"
            aria-label="滚动到底部"
            title="滚动到底部"
            onClick={() => scrollToBottom("smooth")}
          >
            <ArrowDown aria-hidden="true" />
          </button>
        ) : null}

        <div className="chat-composer-wrap">
          {conversationError ? <p className="chat-error-message">{conversationError}</p> : null}
          <div className="chat-composer">
            <textarea
              aria-label="对话输入"
              maxLength={4000}
              placeholder="继续提问、粘贴英文，或输入一段需要润色的表达"
              value={text}
              onChange={(event) => setText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  sendMessage();
                }
              }}
            />
            <div className="chat-composer-footer">
              <div>
                <VoiceInput
                  token={token ?? ""}
                  onTranscript={(transcript) => setText((current) => current.trim() ? `${current.trimEnd()} ${transcript}` : transcript)}
                />
                <button type="button" title="清空输入" onClick={() => setText("")}><Eraser aria-hidden="true" /></button>
              </div>
              <button
                className="chat-send-button"
                type="button"
                aria-label="发送消息"
                disabled={!canSend}
                onClick={sendMessage}
              >
                {isStreaming ? <Sparkles aria-hidden="true" /> : <Send aria-hidden="true" />}
                <span>{isStreaming ? "思考中..." : "发送"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <aside className="chat-context-panel" aria-label="学习上下文">
        <div className="chat-context-heading">
          <p>Learning context</p>
          <span>{activeItem ? "当前学习项" : "Ready"}</span>
        </div>
        {activeItem ? (
          <>
            <section className="chat-context-section">
              <p className="chat-context-label">Captured</p>
              <h2>{activeItem.textOriginal}</h2>
              <span>{itemTypeLabels[activeItem.itemType]} · {activeItem.masteryStatus}</span>
              <button
                className={activeItem.isFavorite ? "chat-context-command is-active" : "chat-context-command"}
                type="button"
                disabled={updateMutation.isPending}
                onClick={() => updateMutation.mutate({ itemId: activeItem.id, isFavorite: !activeItem.isFavorite })}
              >
                <Bookmark aria-hidden="true" />
                {activeItem.isFavorite ? "已收藏" : "收藏当前内容"}
              </button>
            </section>
            <section className="chat-context-section">
              <div className="chat-context-section-head"><p className="chat-context-label">AI tags</p><Tags aria-hidden="true" /></div>
              <div className="chat-auto-tags">
                {activeItem.tags.length ? activeItem.tags.map((tag) => <span key={tag}>{tag}</span>) : <span>待 AI 归类</span>}
              </div>
            </section>
            <Link className="scene-primary-command" to={`/study-items/${activeItem.id}`}>
              打开学习内容 <ArrowUpRight aria-hidden="true" />
            </Link>
          </>
        ) : (
          <section className="chat-context-section">
            <p className="chat-context-label">Today</p>
            <strong className="chat-context-number">{recentQuery.data?.items.length ?? 0}</strong>
            <span>条学习记录</span>
            <Link className="scene-primary-command" to="/library">查看学习库 <ArrowUpRight aria-hidden="true" /></Link>
          </section>
        )}
      </aside>
    </section>
  );
}

function UserMessage({
  message,
  note,
  noteOpen,
  notePending,
  onChangeNote,
  onSaveNote,
  onToggleNote
}: {
  message: ChatMessage;
  note: string;
  noteOpen: boolean;
  notePending: boolean;
  onChangeNote: (value: string) => void;
  onSaveNote: () => void;
  onToggleNote: () => void;
}) {
  return (
    <article className="chat-message chat-message-user">
      <div className="chat-user-message-body">
        <p>{message.content}</p>
        {message.item ? (
          <div className="chat-bubble-note">
            <button className={note ? "is-set" : ""} type="button" onClick={onToggleNote}>
              <MessageSquareText aria-hidden="true" />
              {note ? "编辑备注" : "添加备注"}
            </button>
            {noteOpen ? (
              <div className="chat-bubble-note-editor">
                <textarea aria-label="当前句备注" placeholder="写下你的记忆、场景或疑问" value={note} onChange={(event) => onChangeNote(event.target.value)} />
                <button type="button" disabled={notePending} onClick={onSaveNote}>
                  <Save aria-hidden="true" /> {notePending ? "保存中..." : "保存备注"}
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
      <span>你</span>
    </article>
  );
}

function AssistantMessage({
  message,
  resultRegionRef,
  addingVocabularyKey,
  favoritePending,
  batchVocabularyPending,
  onToggleFavorite,
  onAddVocabulary,
  onAddAllVocabulary
}: {
  message: ChatMessage;
  resultRegionRef?: RefObject<HTMLDivElement>;
  addingVocabularyKey?: string;
  favoritePending: boolean;
  batchVocabularyPending: boolean;
  onToggleFavorite: () => void;
  onAddVocabulary: (vocabulary: TextVocabularyAnalysis, index: number) => void;
  onAddAllVocabulary: () => void;
}) {
  const response = message.response;
  const analysis = response?.analysis ?? message.item?.analysis;
  const canAddAllVocabulary = Boolean(analysis?.vocabulary.length) && !batchVocabularyPending;

  return (
    <article ref={resultRegionRef} tabIndex={-1} aria-label="AI 分析结果区" className="chat-message chat-message-assistant" data-message-type={response?.messageType}>
      <div className="chat-assistant-body">
        {response?.classificationReasoning ? (
          <ReasoningBlock label="理解与分类" reasoning={response.classificationReasoning} />
        ) : null}
        {response?.analysisReasoning ? (
          <ReasoningBlock label="学习分析" reasoning={response.analysisReasoning} />
        ) : null}
        {!response?.classificationReasoning && !response?.analysisReasoning && response?.reasoning ? (
          <ReasoningBlock label="思考过程" reasoning={response.reasoning} />
        ) : null}
        {response?.messageType !== "learning_candidate" ? (
          <p className="chat-assistant-text">{message.content}</p>
        ) : (
          <>
            <p className="chat-assistant-text">{message.content}</p>
            {analysis ? (
              <TextAnalysisCard
                analysis={analysis}
                addingVocabularyKey={addingVocabularyKey}
                onAddVocabulary={(vocabulary) => {
                  const index = analysis.vocabulary.indexOf(vocabulary);
                  onAddVocabulary(vocabulary, index);
                }}
              />
            ) : null}
            <div className="chat-artifact-actions">
              <button type="button" disabled={favoritePending} onClick={onToggleFavorite}>
                <Bookmark aria-hidden="true" />
                {message.item?.isFavorite ? "取消收藏" : "收藏句子"}
              </button>
              <button type="button" disabled={!canAddAllVocabulary} onClick={onAddAllVocabulary}>
                <BookPlus aria-hidden="true" />
                {batchVocabularyPending ? "加入中..." : "全部加入生词本"}
              </button>
              {message.item ? <Link to={`/study-items/${message.item.id}`}>查看详情 <ArrowUpRight aria-hidden="true" /></Link> : null}
            </div>
            {response?.tags.length ? (
              <div className="chat-message-tags"><Tags aria-hidden="true" />{response.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
            ) : null}
            {response?.cached ? <p className="chat-cache-state">已读取缓存</p> : null}
          </>
        )}
        {response?.messageType === "follow_up" ? <span className="chat-routing-state">继续上一句 · 未新增学习项</span> : null}
        {response?.messageType === "unrelated" ? <span className="chat-routing-state">普通对话 · 未加入学习库</span> : null}
      </div>
    </article>
  );
}

function ReasoningBlock({
  label,
  reasoning,
  streaming = false
}: {
  label: string;
  reasoning: string;
  streaming?: boolean;
}) {
  const contentRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (!streaming) {
      return;
    }

    window.requestAnimationFrame(() => {
      const content = contentRef.current;
      if (content) {
        content.scrollTop = content.scrollHeight;
      }
    });
  }, [reasoning, streaming]);

  return (
    <details className="chat-reasoning" open={streaming}>
      <summary><BrainCircuit aria-hidden="true" />{label}{streaming ? " · 生成中" : ""}</summary>
      <p ref={contentRef}>{reasoning}</p>
    </details>
  );
}

function createConversationMessages(conversation: ConversationDetail): ChatMessage[] {
  return conversation.messages.map((message) => {
    const response =
      message.role === "assistant"
        ? {
            messageType: message.messageType ?? "unrelated",
            conversationId: conversation.id,
            shouldSave: message.shouldSave,
            reply: message.content,
            reasoning: message.reasoning,
            classificationReasoning: message.classificationReasoning,
            analysisReasoning: message.analysisReasoning,
            tags: message.tags,
            item: message.studyItem,
            analysis: message.studyItem?.analysis,
            cached: true
          }
        : undefined;

    return {
      id: `persisted-${message.id}`,
      role: message.role,
      content: message.content,
      item: message.studyItem,
      response
    };
  });
}

const itemTypeLabels = {
  word: "单词",
  phrase: "短语",
  sentence: "句子",
  paragraph: "段落",
  mixed: "混合"
} as const;

const ADD_ALL_VOCABULARY_KEY = "__all__";

const exampleTexts = [
  { label: "口语表达", text: "I'm not gonna lie, that was pretty impressive." },
  { label: "工作场景", text: "Could you walk me through the main trade-offs before we make a decision?" },
  { label: "影视台词", text: "Sometimes the right path is not the easiest one, but it is still worth taking." }
] as const;

function createMessageId(role: ChatMessage["role"]): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${role}-${crypto.randomUUID()}`;
  }

  return `${role}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function findLastIndex<T>(items: T[], predicate: (item: T) => boolean): number {
  for (let index = items.length - 1; index >= 0; index -= 1) {
    const item = items[index];
    if (item !== undefined && predicate(item)) {
      return index;
    }
  }

  return -1;
}

function findConversationStreamJob(
  jobs: Record<string, ConversationStreamJob>,
  currentJobId: string | undefined,
  conversationId: string | undefined
): ConversationStreamJob | undefined {
  if (conversationId) {
    return Object.values(jobs)
      .filter((job) => job.conversationId === conversationId || job.input.conversationId === conversationId)
      .sort((left, right) => right.startedAt - left.startedAt)[0];
  }

  return currentJobId ? jobs[currentJobId] : undefined;
}
