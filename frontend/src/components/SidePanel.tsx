import DocumentUpload from "./DocumentUpload";

interface SidePanelProps {
  hasResume: boolean;
  onUpload: (file: File) => Promise<void> | void;
  isUploading: boolean;
}

const SidePanel = ({ hasResume, onUpload, isUploading }: SidePanelProps) => {
  return (
    <div className="flex h-full flex-col gap-5 rounded-[26px] border border-white/10 bg-slate-900/60 p-5">
      <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-brand-300/30 via-transparent to-transparent p-5">
        <p className="text-sm uppercase tracking-wide text-white/60">Atlas Concierge</p>
        <h2 className="mt-2 text-2xl font-semibold text-white">Seamless, white-glove chat</h2>
        <p className="mt-3 text-sm text-white/70">
          Upload once, then let the assistant drive a structured interview and prep WhatsApp-ready
          recaps.
        </p>
      </div>

      <section className="rounded-3xl border border-white/10 bg-white/15 p-5 text-sm text-white/80">
        <DocumentUpload onUpload={onUpload} isUploading={isUploading} />
        {hasResume ? (
          <p className="mt-3 text-xs text-emerald-300">
            Resume received. You can keep chatting or trigger WhatsApp updates any time.
          </p>
        ) : (
          <p className="mt-3 text-xs text-white/70">
            Upload your resume once to unlock the interview flow. Afterwards, the upload button
            stays disabled for this session.
          </p>
        )}
      </section>
    </div>
  );
};

export default SidePanel;

