import { useEffect, useMemo, useRef, useState } from "react";

import { connectAssistantMessageStream } from "../../../lib/stream/message-stream";
import { selectAccessToken } from "../../../store/auth-slice";
import { useAppSelector } from "../../../store/hooks";
import { type Message } from "../api";

type StreamState = {
  lastEventId: string | null;
  streamedContent: string;
  terminalMessage: Message | null;
  errorMessage: string | null;
  ephemeralPhaseLabel: string | null;
  isConnecting: boolean;
};

const STREAM_FLUSH_INTERVAL_MS = 100;

const initialState: StreamState = {
  lastEventId: null,
  streamedContent: "",
  terminalMessage: null,
  errorMessage: null,
  ephemeralPhaseLabel: null,
  isConnecting: false,
};

export function useAssistantMessageStream(
  chatId: string | null,
  assistantMessageId: string | null,
) {
  const accessToken = useAppSelector(selectAccessToken);
  const [state, setState] = useState<StreamState>(initialState);
  const hasTerminalEventRef = useRef(false);
  const pendingDeltaRef = useRef("");
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function cancelDeltaFlush() {
    if (flushTimerRef.current === null) {
      return;
    }

    clearTimeout(flushTimerRef.current);
    flushTimerRef.current = null;
  }

  function flushPendingDelta() {
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
  }

  function scheduleDeltaFlush() {
    if (flushTimerRef.current !== null) {
      return;
    }

    flushTimerRef.current = setTimeout(() => {
      flushTimerRef.current = null;
      flushPendingDelta();
    }, STREAM_FLUSH_INTERVAL_MS);
  }

  useEffect(() => {
    if (!chatId || !assistantMessageId || !accessToken) {
      pendingDeltaRef.current = "";
      cancelDeltaFlush();
      setState(initialState);
      hasTerminalEventRef.current = false;
      return;
    }

    hasTerminalEventRef.current = false;
    pendingDeltaRef.current = "";
    cancelDeltaFlush();
    setState({
      lastEventId: null,
      streamedContent: "",
      terminalMessage: null,
      errorMessage: null,
      ephemeralPhaseLabel: null,
      isConnecting: true,
    });

    const connection = connectAssistantMessageStream({
      chatId,
      assistantMessageId,
      accessToken,
      onEvent(event) {
        switch (event.type) {
          case "status":
            setState((current) => ({
              ...current,
              isConnecting: false,
              lastEventId: event.id ?? current.lastEventId,
              ephemeralPhaseLabel: event.data.label,
            }));
            return;
          case "message.start":
            setState((current) => ({
              ...current,
              isConnecting: false,
              lastEventId: event.id ?? current.lastEventId,
              ephemeralPhaseLabel: null,
            }));
            return;
          case "message.delta":
            pendingDeltaRef.current += event.data.delta;
            setState((current) => ({
              ...current,
              isConnecting: false,
              lastEventId: event.id ?? current.lastEventId,
              ephemeralPhaseLabel: null,
            }));
            scheduleDeltaFlush();
            return;
          case "message.done":
            hasTerminalEventRef.current = true;
            pendingDeltaRef.current = "";
            cancelDeltaFlush();
            setState((current) => ({
              ...current,
              isConnecting: false,
              lastEventId: event.id ?? current.lastEventId,
              streamedContent: event.data.message.content,
              terminalMessage: event.data.message,
              errorMessage: null,
              ephemeralPhaseLabel: null,
            }));
            return;
          case "message.aborted":
            hasTerminalEventRef.current = true;
            pendingDeltaRef.current = "";
            cancelDeltaFlush();
            setState((current) => ({
              ...current,
              isConnecting: false,
              lastEventId: event.id ?? current.lastEventId,
              streamedContent: event.data.message.content,
              terminalMessage: event.data.message,
              ephemeralPhaseLabel: null,
            }));
            return;
          case "error":
            hasTerminalEventRef.current = true;
            pendingDeltaRef.current = "";
            cancelDeltaFlush();
            setState((current) => ({
              ...current,
              isConnecting: false,
              lastEventId: event.id ?? current.lastEventId,
              terminalMessage: event.data.finalMessage ?? null,
              errorMessage: event.data.message,
              ephemeralPhaseLabel: null,
            }));
            return;
          default:
            return;
        }
      },
      onError(error) {
        pendingDeltaRef.current = "";
        cancelDeltaFlush();
        setState((current) => ({
          ...current,
          isConnecting: false,
          errorMessage: error.message,
          ephemeralPhaseLabel: null,
        }));
      },
      onClose() {
        if (hasTerminalEventRef.current) {
          return;
        }

        flushPendingDelta();
        setState((current) => ({
          ...current,
          isConnecting: false,
        }));
      },
    });

    return () => {
      pendingDeltaRef.current = "";
      cancelDeltaFlush();
      connection.close();
    };
  }, [accessToken, assistantMessageId, chatId]);

  const isStreaming = useMemo(() => {
    return Boolean(chatId && assistantMessageId) && !state.terminalMessage && !state.errorMessage;
  }, [assistantMessageId, chatId, state.errorMessage, state.terminalMessage]);

  return {
    ...state,
    isStreaming,
  };
}
