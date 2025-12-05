import { Bot, Loader2, User } from "lucide-react";
import type { ChatMessage } from "../types";

const roleStyling: Record<
  ChatMessage["role"],
  { bubble: string; accent: string; icon: typeof Bot | typeof User }
> = {
  user: {
    bubble: "bg-brand-500/20 border border-brand-400/30 self-end",
    accent: "text-brand-100",
    icon: User
  },
  assistant: {
    bubble: "bg-white/5 border border-white/10",
    accent: "text-white",
    icon: Bot
  },
  system: {
    bubble: "bg-amber-500/10 border border-amber-500/40",
    accent: "text-amber-100",
    icon: Bot
  }
};

interface MessageBubbleProps {
  message: ChatMessage;
}

const MessageBubble = ({ message }: MessageBubbleProps) => {
  const config = roleStyling[message.role];
  const Icon = config.icon;

  return (
    <div className={`flex max-w-3xl flex-col gap-2 rounded-2xl p-4 ${config.bubble}`}>
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-white/60">
        <div className={`flex items-center gap-2 font-semibold ${config.accent}`}>
          <Icon className="size-4" />
          {message.role === "assistant" ? "RecruitLens" : message.role}
        </div>
        <span className="text-white/40">·</span>
        <span>{new Date(message.createdAt).toLocaleTimeString()}</span>
        {message.pending && <Loader2 className="size-4 animate-spin text-white/50" />}
      </div>
      <p className="whitespace-pre-wrap text-base leading-relaxed text-white/90">{message.content}</p>
    </div>
  );
};

export default MessageBubble;

