import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { sendChatMessage, uploadResume } from "../lib/api";
import type { ChatMessage, InterviewState, ToolCall } from "../types";

const USER_ID_KEY = "chatbot:session";

const ensureUserId = () => {
  if (typeof window === "undefined") {
    return crypto.randomUUID();
  }
  const existing = window.localStorage.getItem(USER_ID_KEY);
  if (existing) {
    return existing;
  }
  const generated = crypto.randomUUID();
  window.localStorage.setItem(USER_ID_KEY, generated);
  return generated;
};

export const useChat = () => {
  const [userId] = useState<string>(() => ensureUserId());
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [composerValue, setComposerValue] = useState("");
  const [temperature, setTemperature] = useState(0.3);
  const [interviewState, setInterviewState] = useState<InterviewState | null>(null);
  const [toolCalls, setToolCalls] = useState<ToolCall[]>([]);
  const [hasResume, setHasResume] = useState(false);

  const sendMutation = useMutation({
    mutationFn: ({ message }: { message: string }) =>
      sendChatMessage({ userId, message, temperature }),
    onMutate: async ({ message }) => {
      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: message,
        createdAt: new Date().toISOString()
      };
      const assistantPlaceholder: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "Spinning up MCP stack…",
        createdAt: new Date().toISOString(),
        pending: true
      };

      setMessages((prev) => [...prev, userMessage, assistantPlaceholder]);
      setComposerValue("");

      return {
        userMessageId: userMessage.id,
        assistantMessageId: assistantPlaceholder.id
      };
    },
    onSuccess: (data, _variables, context) => {
      if (!context) return;
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === context.assistantMessageId
            ? {
                ...msg,
                content: data.answer,
                pending: false,
                createdAt: new Date().toISOString()
              }
            : msg
        )
      );
      setInterviewState(data.interview_state);
      setToolCalls(data.tool_calls ?? []);
    },
    onError: (_error, variables, context) => {
      if (context) {
        setMessages((prev) =>
          prev.filter(
            (msg) => msg.id !== context.userMessageId && msg.id !== context.assistantMessageId
          )
        );
      }
      setComposerValue(variables.message);
    }
  });

  const resetConversation = () => {
    setMessages([]);
    setInterviewState(null);
    setToolCalls([]);
  };

  const uploadMutation = useMutation({
    mutationFn: ({ file }: { file: File }) => uploadResume({ userId, file }),
    onSuccess: (data) => {
      if (data?.resume_indexed || data?.status === "ok") {
        setHasResume(true);
      }
    }
  });

  const slotStats = useMemo(() => {
    if (!interviewState?.slots) {
      return { filled: 0, total: 0, remaining: 0 };
    }
    const entries = Object.entries(interviewState.slots);
    const filled = entries.filter(([, value]) => Boolean(value && value.trim())).length;
    const total = entries.length;
    return { filled, total, remaining: Math.max(total - filled, 0) };
  }, [interviewState]);

  return {
    messages,
    composerValue,
    setComposerValue,
    temperature,
    setTemperature,
    sendMessage: async (message: string) => {
      await sendMutation.mutateAsync({ message });
    },
    isSending: sendMutation.isPending,
    interviewState,
    resetConversation,
    userId,
    toolCalls,
    slotStats,
    hasResume,
    uploadResume: async (file: File) => {
      await uploadMutation.mutateAsync({ file });
    },
    isUploadingResume: uploadMutation.isPending
  };
};

