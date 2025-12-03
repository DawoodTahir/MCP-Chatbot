import { motion } from "framer-motion";
import { Activity, Sparkles, Waves } from "lucide-react";
import MessageList from "./MessageList";
import Composer from "./Composer";
import type { ChatMessage, InterviewState } from "../types";

interface ChatLayoutProps {
  messages: ChatMessage[];
  isSending: boolean;
  composerValue: string;
  setComposerValue: (value: string) => void;
  onSend: (message: string) => Promise<void> | void;
  interviewState: InterviewState | null;
  hasResume: boolean;
  onUploadResume: (file: File) => Promise<void> | void;
  isUploadingResume: boolean;
}

const ChatLayout = ({
  messages,
  composerValue,
  setComposerValue,
  onSend,
  isSending,
  interviewState,
  hasResume,
  onUploadResume,
  isUploadingResume
}: ChatLayoutProps) => {
  const handleSend = async () => {
    if (!composerValue.trim() || isSending || !hasResume) return;
    await onSend(composerValue.trim());
  };

  const infoCards = [
    {
      label: "Status",
      value: !hasResume ? "Waiting for resume…" : isSending ? "Responding…" : "Online",
      icon: Activity
    },
    {
      label: "Channel",
      value: hasResume ? "Voice or text" : "Upload required",
      icon: Waves
    }
  ];

  return (
    <div className="flex h-full flex-col rounded-[26px] border border-white/10 bg-slate-900/60 p-6">
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-brand-400/40 bg-brand-500/15 px-4 py-1 text-sm font-medium text-brand-50">
          <Sparkles className="size-4 text-brand-100" />
          Concierge Assistant
        </div>
        <div className="ml-auto flex gap-3">
          {infoCards.map((item) => (
            <motion.div
              key={item.label}
              className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3"
              whileHover={{ translateY: -2 }}
            >
              <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-white/60">
                <item.icon className="size-4 text-brand-200" />
                {item.label}
              </div>
              <p className="text-xl font-semibold text-white">{item.value}</p>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden rounded-2xl border border-white/10 bg-slate-900/30">
        {!hasResume ? (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm text-white/70">
            <p>
              Upload your resume once to unlock the interview. Use the Resume button beside the send
              control—after that, typing and voice both work.
            </p>
          </div>
        ) : (
          <MessageList messages={messages} />
        )}
      </div>

      <Composer
        value={composerValue}
        onChange={setComposerValue}
        onSubmit={handleSend}
        disabled={isSending || !hasResume}
        onUploadResume={onUploadResume}
        isUploadingResume={isUploadingResume}
      />
    </div>
  );
};

export default ChatLayout;

