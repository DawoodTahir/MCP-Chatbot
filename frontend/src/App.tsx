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
    hasResume,
    uploadResume,
    isUploadingResume
  } = useChat();

  return (
    <div className="h-screen w-full overflow-hidden bg-slate-900 text-white">
      <div className="mx-auto flex h-full max-w-7xl flex-col gap-6 p-4 md:p-8 lg:flex-row">
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
          />
        </div>
        <aside className="w-full max-h-full overflow-y-auto rounded-3xl border border-white/10 bg-white/10 p-1 lg:w-80 xl:w-96">
          <SidePanel hasResume={hasResume} onUpload={uploadResume} isUploading={isUploadingResume} />
        </aside>
      </div>
    </div>
  );
};

export default App;

