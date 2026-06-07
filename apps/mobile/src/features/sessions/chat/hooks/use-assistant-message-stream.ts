import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { connectAssistantMessageStream } from "@/lib/stream/message-stream";
import {
  getStreamReconnectDecision,
  STREAM_RECONNECT_MAX_ATTEMPTS,
} from "@/lib/stream/stream-reconnect";
import { SseConnectionError } from "@/lib/stream/sse-client";
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

  const markInterrupted = useCallback((message: string) => {
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

  const updateLastEventId = useCallback((eventId: string | undefined, fallback: string | null) => {
    if (!eventId) {
      return fallback;
    }

    lastEventIdRef.current = eventId;
    return eventId;
  }, []);

  const scheduleReconnect = useCallback((message: string) => {
    clearReconnectTimer();
    flushPendingDelta();

    const decision = getStreamReconnectDecision({
      attemptCount: reconnectAttemptRef.current,
      firstFailureAt: reconnectWindowStartedAtRef.current,
      now: Date.now(),
    });

    if (!decision.shouldReconnect) {
      markInterrupted(message);
      return;
    }

    reconnectAttemptRef.current = decision.nextAttempt;
    reconnectWindowStartedAtRef.current = decision.firstFailureAt;

    setState((current) => ({
      ...current,
      isConnecting: false,
      isReconnecting: true,
      reconnectAttempt: decision.nextAttempt,
      canManualReconnect: false,
      connectionState: "reconnecting",
      errorMessage: null,
      ephemeralPhaseLabel: STREAM_RECONNECTING_LABEL,
    }));

    reconnectTimerRef.current = setTimeout(() => {
      reconnectTimerRef.current = null;
      const params = paramsRef.current;

      if (!params.sessionId || !params.assistantMessageId || !params.accessToken) {
        return;
      }

      disconnectHandledRef.current = false;
      closeConnection();

      const generation = ++connectionGenerationRef.current;
      connectionRef.current = connectAssistantMessageStream({
        sessionId: params.sessionId,
        assistantMessageId: params.assistantMessageId,
        accessToken: params.accessToken,
        lastEventId: lastEventIdRef.current,
        onEvent(event) {
          if (generation !== connectionGenerationRef.current) {
            return;
          }

          switch (event.type) {
            case "status":
              setState((current) => ({
                ...current,
                isConnecting: false,
                isReconnecting: false,
                reconnectAttempt: reconnectAttemptRef.current,
                canManualReconnect: false,
                connectionState: "streaming",
                lastEventId: updateLastEventId(event.id, current.lastEventId),
                errorMessage: null,
                ephemeralPhaseLabel: event.data.label,
              }));
              return;
            case "message.start":
              setState((current) => ({
                ...current,
                isConnecting: false,
                isReconnecting: false,
                reconnectAttempt: reconnectAttemptRef.current,
                canManualReconnect: false,
                connectionState: "streaming",
                lastEventId: updateLastEventId(event.id, current.lastEventId),
                errorMessage: null,
                ephemeralPhaseLabel: null,
              }));
              return;
            case "message.delta":
              pendingDeltaRef.current += event.data.delta;
              setState((current) => ({
                ...current,
                isConnecting: false,
                isReconnecting: false,
                reconnectAttempt: reconnectAttemptRef.current,
                canManualReconnect: false,
                connectionState: "streaming",
                lastEventId: updateLastEventId(event.id, current.lastEventId),
                errorMessage: null,
                ephemeralPhaseLabel: null,
              }));
              scheduleDeltaFlush();
              return;
            case "message.done":
              hasTerminalEventRef.current = true;
              pendingDeltaRef.current = "";
              cancelDeltaFlush();
              clearReconnectTimer();
              setState((current) => ({
                ...current,
                isConnecting: false,
                isReconnecting: false,
                reconnectAttempt: reconnectAttemptRef.current,
                canManualReconnect: false,
                connectionState: "terminal",
                lastEventId: updateLastEventId(event.id, current.lastEventId),
                streamedContent: event.data.message.content,
                terminalMessage: event.data.message,
                errorMessage: null,
                ephemeralPhaseLabel: null,
              }));
              resetReconnectBudget();
              return;
            case "message.aborted":
              hasTerminalEventRef.current = true;
              pendingDeltaRef.current = "";
              cancelDeltaFlush();
              clearReconnectTimer();
              setState((current) => ({
                ...current,
                isConnecting: false,
                isReconnecting: false,
                reconnectAttempt: reconnectAttemptRef.current,
                canManualReconnect: false,
                connectionState: "terminal",
                lastEventId: updateLastEventId(event.id, current.lastEventId),
                streamedContent: event.data.message.content,
                terminalMessage: event.data.message,
                errorMessage: null,
                ephemeralPhaseLabel: null,
              }));
              resetReconnectBudget();
              return;
            case "error":
              hasTerminalEventRef.current = true;
              pendingDeltaRef.current = "";
              cancelDeltaFlush();
              clearReconnectTimer();
              setState((current) => ({
                ...current,
                isConnecting: false,
                isReconnecting: false,
                reconnectAttempt: reconnectAttemptRef.current,
                canManualReconnect: false,
                connectionState: "terminal",
                lastEventId: updateLastEventId(event.id, current.lastEventId),
                terminalMessage: event.data.finalMessage ?? null,
                errorMessage: event.data.message,
                ephemeralPhaseLabel: null,
              }));
              resetReconnectBudget();
              return;
            default:
              return;
          }
        },
        onError(error) {
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
            markInterrupted(error.message);
            return;
          }

          if (error.message.startsWith("Invalid SSE payload")) {
            markInterrupted(error.message);
            return;
          }

          if (hasTerminalEventRef.current) {
            return;
          }

          scheduleReconnect(error.message);
        },
        onClose(details) {
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
            markInterrupted(`SSE request failed with status ${details.status}.`);
            return;
          }

          scheduleReconnect("SSE connection closed unexpectedly.");
        },
      });
    }, decision.delayMs);
  }, [
    cancelDeltaFlush,
    clearReconnectTimer,
    closeConnection,
    flushPendingDelta,
    markInterrupted,
    resetReconnectBudget,
    scheduleDeltaFlush,
    updateLastEventId,
  ]);

  const connectWithMode = useCallback((mode: "initial" | "manual" | "reconnect") => {
    const params = paramsRef.current;
    if (!params.sessionId || !params.assistantMessageId || !params.accessToken) {
      return;
    }

    disconnectHandledRef.current = false;
    closeConnection();

    const generation = ++connectionGenerationRef.current;

    setState((current) => {
      switch (mode) {
        case "initial":
          return {
            ...initialState,
            isConnecting: true,
            canManualReconnect: false,
            connectionState: "connecting",
          };
        case "manual":
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
        case "reconnect":
          return {
            ...current,
            isConnecting: true,
            isReconnecting: true,
            canManualReconnect: false,
            connectionState: "reconnecting",
            errorMessage: null,
            ephemeralPhaseLabel: STREAM_RECONNECTING_LABEL,
          };
      }
    });

    connectionRef.current = connectAssistantMessageStream({
      sessionId: params.sessionId,
      assistantMessageId: params.assistantMessageId,
      accessToken: params.accessToken,
      lastEventId: mode === "initial" ? null : lastEventIdRef.current,
      onEvent(event) {
        if (generation !== connectionGenerationRef.current) {
          return;
        }

        switch (event.type) {
          case "status":
            setState((current) => ({
              ...current,
              isConnecting: false,
              isReconnecting: false,
              reconnectAttempt: reconnectAttemptRef.current,
              canManualReconnect: false,
              connectionState: "streaming",
              lastEventId: updateLastEventId(event.id, current.lastEventId),
              errorMessage: null,
              ephemeralPhaseLabel: event.data.label,
            }));
            return;
          case "message.start":
            setState((current) => ({
              ...current,
              isConnecting: false,
              isReconnecting: false,
              reconnectAttempt: reconnectAttemptRef.current,
              canManualReconnect: false,
              connectionState: "streaming",
              lastEventId: updateLastEventId(event.id, current.lastEventId),
              errorMessage: null,
              ephemeralPhaseLabel: null,
            }));
            return;
          case "message.delta":
            pendingDeltaRef.current += event.data.delta;
            setState((current) => ({
              ...current,
              isConnecting: false,
              isReconnecting: false,
              reconnectAttempt: reconnectAttemptRef.current,
              canManualReconnect: false,
              connectionState: "streaming",
              lastEventId: updateLastEventId(event.id, current.lastEventId),
              errorMessage: null,
              ephemeralPhaseLabel: null,
            }));
            scheduleDeltaFlush();
            return;
          case "message.done":
            hasTerminalEventRef.current = true;
            pendingDeltaRef.current = "";
            cancelDeltaFlush();
            clearReconnectTimer();
            setState((current) => ({
              ...current,
              isConnecting: false,
              isReconnecting: false,
              reconnectAttempt: reconnectAttemptRef.current,
              canManualReconnect: false,
              connectionState: "terminal",
              lastEventId: updateLastEventId(event.id, current.lastEventId),
              streamedContent: event.data.message.content,
              terminalMessage: event.data.message,
              errorMessage: null,
              ephemeralPhaseLabel: null,
            }));
            resetReconnectBudget();
            return;
          case "message.aborted":
            hasTerminalEventRef.current = true;
            pendingDeltaRef.current = "";
            cancelDeltaFlush();
            clearReconnectTimer();
            setState((current) => ({
              ...current,
              isConnecting: false,
              isReconnecting: false,
              reconnectAttempt: reconnectAttemptRef.current,
              canManualReconnect: false,
              connectionState: "terminal",
              lastEventId: updateLastEventId(event.id, current.lastEventId),
              streamedContent: event.data.message.content,
              terminalMessage: event.data.message,
              errorMessage: null,
              ephemeralPhaseLabel: null,
            }));
            resetReconnectBudget();
            return;
          case "error":
            hasTerminalEventRef.current = true;
            pendingDeltaRef.current = "";
            cancelDeltaFlush();
            clearReconnectTimer();
            setState((current) => ({
              ...current,
              isConnecting: false,
              isReconnecting: false,
              reconnectAttempt: reconnectAttemptRef.current,
              canManualReconnect: false,
              connectionState: "terminal",
              lastEventId: updateLastEventId(event.id, current.lastEventId),
              terminalMessage: event.data.finalMessage ?? null,
              errorMessage: event.data.message,
              ephemeralPhaseLabel: null,
            }));
            resetReconnectBudget();
            return;
          default:
            return;
        }
      },
      onError(error) {
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
          markInterrupted(error.message);
          return;
        }

        if (error.message.startsWith("Invalid SSE payload")) {
          markInterrupted(error.message);
          return;
        }

        if (hasTerminalEventRef.current) {
          return;
        }

        scheduleReconnect(error.message);
      },
      onClose(details) {
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
          markInterrupted(`SSE request failed with status ${details.status}.`);
          return;
        }

        scheduleReconnect("SSE connection closed unexpectedly.");
      },
    });
  }, [
    cancelDeltaFlush,
    clearReconnectTimer,
    closeConnection,
    markInterrupted,
    resetReconnectBudget,
    scheduleDeltaFlush,
    scheduleReconnect,
    updateLastEventId,
  ]);

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
    connectWithMode("initial");

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
    connectWithMode,
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
    connectWithMode("manual");
  }, [clearReconnectTimer, connectWithMode, resetReconnectBudget, state.connectionState]);

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
