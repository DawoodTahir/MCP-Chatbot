import { useEffect, useState } from "react";
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
  inputMode: "text" | "voice";
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
  isUploadingResume,
  inputMode
}: ChatLayoutProps) => {
  const [introText, setIntroText] = useState("");

  const handleSend = async () => {
    if (!composerValue.trim() || isSending || !hasResume) return;
    await onSend(composerValue.trim());
  };

  // Animated intro text when no resume is uploaded yet
  const introFullText =
    "Upload your resume once to unlock the interview. Use the Resume button beside the send control—after that, typing and voice both work.";

  useEffect(() => {
    if (!hasResume) {
      setIntroText("");
      let index = 0;
      const interval = window.setInterval(() => {
        index += 1;
        setIntroText(introFullText.slice(0, index));
        if (index >= introFullText.length) {
          window.clearInterval(interval);
        }
      }, 25);
      return () => window.clearInterval(interval);
    } else {
      // Reset when resume is uploaded
      setIntroText("");
    }
    // we intentionally depend only on hasResume to restart animation when it changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasResume]);

  return (
    <div className="flex h-full flex-col rounded-[26px] border border-white/10 bg-slate-900/60 p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="inline-flex items-center gap-2 rounded-full border border-brand-400/40 bg-brand-500/15 px-4 py-1 text-sm font-medium text-brand-50">
          <Sparkles className="size-4 text-brand-100" />
          RecruitLens
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden rounded-2xl border border-white/10 bg-slate-900/30">
        {!hasResume ? (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm text-white/70">
            <p>{introText}</p>
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
        hasResume={hasResume}
        inputMode={inputMode}
      />
    </div>
  );
};

export default ChatLayout;

