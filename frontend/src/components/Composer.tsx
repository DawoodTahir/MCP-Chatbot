import { FormEvent, ReactNode, useMemo, useState, useRef } from "react";
import { Loader2, Mic, MicOff, Send, Paperclip } from "lucide-react";
import clsx from "clsx";

interface ComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void | Promise<void>;
  disabled?: boolean;
  onUploadResume?: (file: File) => Promise<void> | void;
  isUploadingResume?: boolean;
}

const Composer = ({
  value,
  onChange,
  onSubmit,
  disabled,
  onUploadResume,
  isUploadingResume
}: ComposerProps) => {
  const [isListening, setIsListening] = useState(false);
  const hasText = useMemo(() => value.trim().length > 0, [value]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  type SpeechRecognitionResultEvent = {
    results: {
      0: {
        0: {
          transcript: string;
        };
      };
    };
  };

  type SpeechRecognitionInstance = {
    lang: string;
    interimResults: boolean;
    maxAlternatives: number;
    onresult: ((event: SpeechRecognitionResultEvent) => void) | null;
    onerror: (() => void) | null;
    onend: (() => void) | null;
    start: () => void;
  };

  type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

  const getSpeechRecognition = (): SpeechRecognitionConstructor | null => {
    if (typeof window === "undefined") return null;
    const win = window as Window &
      typeof globalThis & {
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
        SpeechRecognition?: SpeechRecognitionConstructor;
    };
    return win.SpeechRecognition ?? win.webkitSpeechRecognition ?? null;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onSubmit();
  };

  const handleVoiceInput = () => {
    const Recognition = getSpeechRecognition();
    if (!Recognition) {
      if (typeof window !== "undefined") {
        window.alert("Voice capture is not supported in this browser yet.");
      }
      return;
    }

    try {
      const recognition = new Recognition();
      recognition.lang = "en-US";
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      setIsListening(true);

      recognition.onresult = (event: SpeechRecognitionResultEvent) => {
        const transcript = event.results[0][0].transcript;
        const nextValue = value ? `${value} ${transcript}` : transcript;
        onChange(nextValue.trimStart());
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-4 rounded-3xl border border-white/10 bg-white/10 p-4 shadow-lg shadow-black/20"
    >
      <textarea
        className="w-full resize-none rounded-2xl border border-white/10 bg-white/5 p-4 text-base text-white placeholder:text-white/50 focus:border-brand-400/60 focus:outline-none"
        rows={4}
        placeholder="Ask for insight, trigger WhatsApp distribution, or upload a doc…"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            if (!disabled && value.trim()) {
              void onSubmit();
            }
          }
        }}
        disabled={disabled}
      />

      <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center">
        <div className="flex flex-1 items-center gap-3 rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
          {isListening ? (
            <Indicator label="Listening…">
              <VoiceWave />
            </Indicator>
          ) : hasText ? (
            <Indicator label="Typing…">
              <TypingDots />
            </Indicator>
          ) : (
            <span className="text-sm text-white/60">Ready for your next question.</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleVoiceInput}
            disabled={disabled || isListening}
            className={clsx(
              "inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold uppercase tracking-wide transition",
              "border border-white/10 bg-white/5 hover:border-white/30 disabled:cursor-not-allowed disabled:opacity-50"
            )}
          >
            {isListening ? <MicOff className="size-4 text-rose-200" /> : <Mic className="size-4" />}
            {isListening ? "Listening…" : "Voice"}
          </button>
          <button
            type="submit"
            disabled={disabled || !value.trim()}
            className={clsx(
              "inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3 text-sm font-semibold uppercase tracking-wide transition",
              "bg-brand-500 hover:bg-brand-400 disabled:cursor-not-allowed disabled:bg-white/10"
            )}
          >
            {disabled ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Thinking
              </>
            ) : (
              <>
                <Send className="size-4" />
                Send
              </>
            )}
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || isUploadingResume}
              className={clsx(
                "inline-flex items-center justify-center gap-2 rounded-2xl px-3 py-3 text-sm font-semibold uppercase tracking-wide transition",
                "border border-white/10 bg-white/5 hover:border-white/30 disabled:cursor-not-allowed disabled:opacity-50"
              )}
            >
              {isUploadingResume ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Uploading…
                </>
              ) : (
                <>
                  <Paperclip className="size-4" />
                  Resume
                </>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.txt"
              className="hidden"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (file && onUploadResume) {
                  await onUploadResume(file);
                }
                event.target.value = "";
              }}
            />
          </div>
        </div>
      </div>
    </form>
  );
};

export default Composer;

const Indicator = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="flex items-center gap-3 text-sm text-white/80">
    {children}
    <span>{label}</span>
  </div>
);

const VoiceWave = () => (
  <div className="voice-wave">
    {Array.from({ length: 4 }).map((_, idx) => (
      <span key={idx} className="voice-wave-bar" />
    ))}
  </div>
);

const TypingDots = () => (
  <div className="typing-dots">
    {Array.from({ length: 3 }).map((_, idx) => (
      <span key={idx} className="typing-dot" />
    ))}
  </div>
);

