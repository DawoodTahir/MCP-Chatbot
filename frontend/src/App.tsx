import ChatLayout from "./components/ChatLayout";
import SidePanel from "./components/SidePanel";
import { useChat } from "./hooks/useChat";

const App = () => {
  const {
    messages,
    sendMessage,
    setComposerValue,
    composerValue,
    isSending,
    interviewState,
    userId,
    hasResume,
    uploadResume,
    isUploadingResume,
    inputMode
  } = useChat();

  return (
    <div className="h-screen w-full overflow-hidden bg-slate-900 text-white">
      <header className="w-full border-b border-teal-400/40 bg-teal-600/90 text-sm text-white shadow-md shadow-teal-900/40">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-8">
          <div className="flex items-center gap-2">
            <span className="h-8 w-8 rounded-full bg-white/10" />
            <span className="text-base font-semibold tracking-wide">RecruitLens</span>
          </div>
          <nav className="flex items-center gap-6 text-xs font-medium uppercase tracking-wide">
            <button className="hover:text-teal-100/90">About</button>
            <button className="hover:text-teal-100/90">Pricing</button>
            <button className="hover:text-teal-100/90">Support</button>
            <button className="rounded-full bg-white/95 px-4 py-1.5 text-xs font-semibold text-teal-700 shadow-sm shadow-teal-900/30 hover:bg-white">
              Login / Signup
            </button>
          </nav>
        </div>
      </header>
      <div className="mx-auto flex h-[calc(100vh-56px)] max-w-7xl flex-col gap-6 p-4 md:p-8 lg:flex-row">
        <div className="flex-1 min-h-0 rounded-3xl border border-white/10 bg-white/10 p-1 shadow-elevated backdrop-blur-xl">
          <ChatLayout
            messages={messages}
            isSending={isSending}
            composerValue={composerValue}
            setComposerValue={setComposerValue}
            onSend={sendMessage}
            interviewState={interviewState}
            hasResume={hasResume}
            onUploadResume={uploadResume}
            isUploadingResume={isUploadingResume}
            inputMode={inputMode}
          />
        </div>
        <aside className="w-full max-h-full overflow-y-auto rounded-3xl border border-white/10 bg-white/10 p-1 lg:w-80 xl:w-96">
          <SidePanel
            hasResume={hasResume}
            onUpload={uploadResume}
            isUploading={isUploadingResume}
            userId={userId}
            interviewState={interviewState}
          />
        </aside>
      </div>
    </div>
  );
};

export default App;

