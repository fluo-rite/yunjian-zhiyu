import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  connectAssistantMessageStream,
  type AssistantMessageStreamEvent,
} from "@/lib/stream/message-stream";
import {
  getStreamReconnectDecision,
  STREAM_RECONNECT_MAX_ATTEMPTS,
} from "@/lib/stream/stream-reconnect";
import {
  SseConnectionError,
  type SseConnectionCloseDetails,
} from "@/lib/stream/sse-client";
import { selectAccessToken } from "@/store/auth-slice";
import { useAppSelector } from "@/store/hooks";
import { type Message } from "@/features/sessions/api";

export type AssistantMessageStreamConnectionState =
  | "idle"
  | "connecting"
  | "streaming"
  | "reconnecting"
  | "terminal"
  | "interrupted";

type StreamState = {
  lastEventId: string | null;
  streamedContent: string;
  terminalMessage: Message | null;
  errorMessage: string | null;
  ephemeralPhaseLabel: string | null;
  isConnecting: boolean;
  isReconnecting: boolean;
  reconnectAttempt: number;
  canManualReconnect: boolean;
  connectionState: AssistantMessageStreamConnectionState;
};

const STREAM_FLUSH_INTERVAL_MS = 100;
const STREAM_RECONNECTING_LABEL = "网络波动，正在恢复连接…";

type ConnectionMode = "initial" | "manual_retry" | "auto_reconnect";

const initialState: StreamState = {
  lastEventId: null,
  streamedContent: "",
  terminalMessage: null,
  errorMessage: null,
  ephemeralPhaseLabel: null,
  isConnecting: false,
  isReconnecting: false,
  reconnectAttempt: 0,
  canManualReconnect: false,
  connectionState: "idle",
};

export function useAssistantMessageStream(
  sessionId: string | null,
  assistantMessageId: string | null,
) {
  const accessToken = useAppSelector(selectAccessToken);
  const [state, setState] = useState<StreamState>(initialState);
  const hasTerminalEventRef = useRef(false);
  const connectionRef = useRef<ReturnType<typeof connectAssistantMessageStream> | null>(null);
  const connectionGenerationRef = useRef(0);
  const disconnectHandledRef = useRef(false);
  const pendingDeltaRef = useRef("");
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectWindowStartedAtRef = useRef<number | null>(null);
  const lastEventIdRef = useRef<string | null>(null);
  const openConnectionRef = useRef<(mode: ConnectionMode) => void>(() => {});
  const scheduleReconnectRef = useRef<(message: string) => void>(() => {});
  const paramsRef = useRef<{
    sessionId: string | null;
    assistantMessageId: string | null;
    accessToken: string | null | undefined;
  }>({
    sessionId,
    assistantMessageId,
    accessToken,
  });

  const cancelDeltaFlush = useCallback(() => {
    if (flushTimerRef.current === null) {
      return;
    }

    clearTimeout(flushTimerRef.current);
    flushTimerRef.current = null;
  }, []);

  const flushPendingDelta = useCallback(() => {
    cancelDeltaFlush();

    if (!pendingDeltaRef.current) {
      return;
    }

    const bufferedDelta = pendingDeltaRef.current;
    pendingDeltaRef.current = "";

    setState((current) => ({
      ...current,
      streamedContent: current.streamedContent + bufferedDelta,
    }));
  }, [cancelDeltaFlush]);

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current === null) {
      return;
    }

    clearTimeout(reconnectTimerRef.current);
    reconnectTimerRef.current = null;
  }, []);

  const closeConnection = useCallback(() => {
    connectionRef.current?.close();
    connectionRef.current = null;
  }, []);

  const invalidateConnectionGeneration = useCallback(() => {
    ++connectionGenerationRef.current;
  }, []);

  const resetReconnectBudget = useCallback(() => {
    reconnectAttemptRef.current = 0;
    reconnectWindowStartedAtRef.current = null;
  }, []);

  const scheduleDeltaFlush = useCallback(() => {
    if (flushTimerRef.current !== null) {
      return;
    }

    flushTimerRef.current = setTimeout(() => {
      flushTimerRef.current = null;
      flushPendingDelta();
    }, STREAM_FLUSH_INTERVAL_MS);
  }, [flushPendingDelta]);

  const setInterruptedState = useCallback((message: string) => {
    clearReconnectTimer();
    setState((current) => ({
      ...current,
      isConnecting: false,
      isReconnecting: false,
      reconnectAttempt: reconnectAttemptRef.current,
      canManualReconnect: true,
      connectionState: "interrupted",
      errorMessage: message,
      ephemeralPhaseLabel: null,
    }));
  }, [clearReconnectTimer]);

  const setConnectingState = useCallback((mode: ConnectionMode) => {
    setState((current) => {
      switch (mode) {
        case "initial":
          return {
            ...initialState,
            isConnecting: true,
            canManualReconnect: false,
            connectionState: "connecting",
          };
        case "manual_retry":
          return {
            ...current,
            isConnecting: true,
            isReconnecting: false,
            reconnectAttempt: 0,
            canManualReconnect: false,
            connectionState: "connecting",
            errorMessage: null,
            ephemeralPhaseLabel: null,
          };
        case "auto_reconnect":
          return {
            ...current,
            isConnecting: true,
            isReconnecting: true,
            reconnectAttempt: reconnectAttemptRef.current,
            canManualReconnect: false,
            connectionState: "reconnecting",
            errorMessage: null,
            ephemeralPhaseLabel: STREAM_RECONNECTING_LABEL,
          };
      }
    });
  }, []);

  const setReconnectPendingState = useCallback((attempt: number) => {
    setState((current) => ({
      ...current,
      isConnecting: false,
      isReconnecting: true,
      reconnectAttempt: attempt,
      canManualReconnect: false,
      connectionState: "reconnecting",
      errorMessage: null,
      ephemeralPhaseLabel: STREAM_RECONNECTING_LABEL,
    }));
  }, []);

  const setStreamingState = useCallback((patch: Partial<StreamState>) => {
    setState((current) => ({
      ...current,
      ...patch,
      isConnecting: false,
      isReconnecting: false,
      reconnectAttempt: reconnectAttemptRef.current,
      canManualReconnect: false,
      connectionState: "streaming",
      errorMessage: null,
    }));
  }, []);

  const setTerminalState = useCallback((patch: Partial<StreamState>) => {
    setState((current) => ({
      ...current,
      ...patch,
      isConnecting: false,
      isReconnecting: false,
      reconnectAttempt: reconnectAttemptRef.current,
      canManualReconnect: false,
      connectionState: "terminal",
      ephemeralPhaseLabel: null,
    }));
  }, []);

  const updateLastEventId = useCallback((eventId: string | undefined, fallback: string | null) => {
    if (!eventId) {
      return fallback;
    }

    lastEventIdRef.current = eventId;
    return eventId;
  }, []);

  const handleStreamEvent = useCallback((event: AssistantMessageStreamEvent, generation: number) => {
    if (generation !== connectionGenerationRef.current) {
      return;
    }

    switch (event.type) {
      case "status": {
        const lastEventId = updateLastEventId(event.id, lastEventIdRef.current);
        setStreamingState({
          lastEventId,
          ephemeralPhaseLabel: event.data.label,
        });
        return;
      }
      case "message.start": {
        const lastEventId = updateLastEventId(event.id, lastEventIdRef.current);
        setStreamingState({
          lastEventId,
          ephemeralPhaseLabel: null,
        });
        return;
      }
      case "message.delta": {
        pendingDeltaRef.current += event.data.delta;
        const lastEventId = updateLastEventId(event.id, lastEventIdRef.current);
        setStreamingState({
          lastEventId,
          ephemeralPhaseLabel: null,
        });
        scheduleDeltaFlush();
        return;
      }
      case "message.done": {
        hasTerminalEventRef.current = true;
        pendingDeltaRef.current = "";
        cancelDeltaFlush();
        clearReconnectTimer();
        const lastEventId = updateLastEventId(event.id, lastEventIdRef.current);
        setTerminalState({
          lastEventId,
          streamedContent: event.data.message.content,
          terminalMessage: event.data.message,
          errorMessage: null,
        });
        resetReconnectBudget();
        return;
      }
      case "message.aborted": {
        hasTerminalEventRef.current = true;
        pendingDeltaRef.current = "";
        cancelDeltaFlush();
        clearReconnectTimer();
        const lastEventId = updateLastEventId(event.id, lastEventIdRef.current);
        setTerminalState({
          lastEventId,
          streamedContent: event.data.message.content,
          terminalMessage: event.data.message,
          errorMessage: null,
        });
        resetReconnectBudget();
        return;
      }
      case "error": {
        hasTerminalEventRef.current = true;
        pendingDeltaRef.current = "";
        cancelDeltaFlush();
        clearReconnectTimer();
        const lastEventId = updateLastEventId(event.id, lastEventIdRef.current);
        setTerminalState({
          lastEventId,
          terminalMessage: event.data.finalMessage ?? null,
          errorMessage: event.data.message,
        });
        resetReconnectBudget();
        return;
      }
      default:
        return;
    }
  }, [
    cancelDeltaFlush,
    clearReconnectTimer,
    resetReconnectBudget,
    scheduleDeltaFlush,
    setStreamingState,
    setTerminalState,
    updateLastEventId,
  ]);

  const handleConnectionError = useCallback((error: Error, generation: number) => {
    if (generation !== connectionGenerationRef.current || disconnectHandledRef.current) {
      return;
    }

    disconnectHandledRef.current = true;

    if (
      error instanceof SseConnectionError &&
      typeof error.status === "number" &&
      error.status >= 400 &&
      error.status < 500
    ) {
      setInterruptedState(error.message);
      return;
    }

    if (error.message.startsWith("Invalid SSE payload")) {
      setInterruptedState(error.message);
      return;
    }

    if (hasTerminalEventRef.current) {
      return;
    }

    scheduleReconnectRef.current(error.message);
  }, [setInterruptedState]);

  const handleConnectionClose = useCallback((details: SseConnectionCloseDetails, generation: number) => {
    if (
      generation !== connectionGenerationRef.current ||
      details.closedByCaller ||
      hasTerminalEventRef.current ||
      disconnectHandledRef.current
    ) {
      return;
    }

    disconnectHandledRef.current = true;

    if (details.status >= 400 && details.status < 500) {
      setInterruptedState(`SSE request failed with status ${details.status}.`);
      return;
    }

    scheduleReconnectRef.current("SSE connection closed unexpectedly.");
  }, [setInterruptedState]);

  const openConnection = useCallback((mode: ConnectionMode) => {
    const params = paramsRef.current;
    if (!params.sessionId || !params.assistantMessageId || !params.accessToken) {
      return;
    }

    disconnectHandledRef.current = false;
    closeConnection();

    const generation = ++connectionGenerationRef.current;
    setConnectingState(mode);

    connectionRef.current = connectAssistantMessageStream({
      sessionId: params.sessionId,
      assistantMessageId: params.assistantMessageId,
      accessToken: params.accessToken,
      lastEventId: mode === "initial" ? null : lastEventIdRef.current,
      onEvent: (event) => handleStreamEvent(event, generation),
      onError: (error) => handleConnectionError(error, generation),
      onClose: (details) => handleConnectionClose(details, generation),
    });
  }, [
    closeConnection,
    handleConnectionClose,
    handleConnectionError,
    handleStreamEvent,
    setConnectingState,
  ]);
  openConnectionRef.current = openConnection;

  const scheduleReconnect = useCallback((message: string) => {
    clearReconnectTimer();
    flushPendingDelta();

    const decision = getStreamReconnectDecision({
      attemptCount: reconnectAttemptRef.current,
      firstFailureAt: reconnectWindowStartedAtRef.current,
      now: Date.now(),
    });

    if (!decision.shouldReconnect) {
      setInterruptedState(message);
      return;
    }

    reconnectAttemptRef.current = decision.nextAttempt;
    reconnectWindowStartedAtRef.current = decision.firstFailureAt;
    setReconnectPendingState(decision.nextAttempt);

    reconnectTimerRef.current = setTimeout(() => {
      reconnectTimerRef.current = null;
      openConnectionRef.current("auto_reconnect");
    }, decision.delayMs);
  }, [clearReconnectTimer, flushPendingDelta, setInterruptedState, setReconnectPendingState]);
  scheduleReconnectRef.current = scheduleReconnect;

  useEffect(() => {
    paramsRef.current = {
      sessionId,
      assistantMessageId,
      accessToken,
    };

    if (!sessionId || !assistantMessageId || !accessToken) {
      invalidateConnectionGeneration();
      closeConnection();
      clearReconnectTimer();
      resetReconnectBudget();
      pendingDeltaRef.current = "";
      lastEventIdRef.current = null;
      cancelDeltaFlush();
      setState(initialState);
      hasTerminalEventRef.current = false;
      disconnectHandledRef.current = false;
      return;
    }

    hasTerminalEventRef.current = false;
    disconnectHandledRef.current = false;
    pendingDeltaRef.current = "";
    lastEventIdRef.current = null;
    resetReconnectBudget();
    clearReconnectTimer();
    cancelDeltaFlush();
    openConnection("initial");

    return () => {
      invalidateConnectionGeneration();
      pendingDeltaRef.current = "";
      disconnectHandledRef.current = false;
      clearReconnectTimer();
      cancelDeltaFlush();
      closeConnection();
    };
  }, [
    accessToken,
    assistantMessageId,
    cancelDeltaFlush,
    clearReconnectTimer,
    closeConnection,
    openConnection,
    invalidateConnectionGeneration,
    resetReconnectBudget,
    sessionId,
  ]);

  const retryNow = useCallback(() => {
    if (state.connectionState !== "interrupted") {
      return;
    }

    hasTerminalEventRef.current = false;
    disconnectHandledRef.current = false;
    resetReconnectBudget();
    clearReconnectTimer();
    openConnection("manual_retry");
  }, [clearReconnectTimer, openConnection, resetReconnectBudget, state.connectionState]);

  const isStreaming = useMemo(() => {
    return Boolean(sessionId && assistantMessageId) && !state.terminalMessage && !state.errorMessage;
  }, [assistantMessageId, sessionId, state.errorMessage, state.terminalMessage]);

  return {
    ...state,
    isStreaming,
    retryNow,
    reconnectBudget: STREAM_RECONNECT_MAX_ATTEMPTS,
  };
}
