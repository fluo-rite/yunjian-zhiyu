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

  useEffect(() => {
    if (!chatId || !assistantMessageId || !accessToken) {
      setState(initialState);
      hasTerminalEventRef.current = false;
      return;
    }

    hasTerminalEventRef.current = false;
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
        setState((current) => ({
          ...current,
          isConnecting: false,
          lastEventId: event.id ?? current.lastEventId,
        }));

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
            setState((current) => ({
              ...current,
              isConnecting: false,
              lastEventId: event.id ?? current.lastEventId,
              streamedContent: current.streamedContent + event.data.delta,
              ephemeralPhaseLabel: null,
            }));
            return;
          case "message.done":
            hasTerminalEventRef.current = true;
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

        setState((current) => ({
          ...current,
          isConnecting: false,
        }));
      },
    });

    return () => {
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
