import Topbar from "@/components/dashboard/Topbar";

export default function EmptyModule({
  title,
  hint,
}: {
  title: string;
  hint: string;
}) {
  return (
    <>
      <Topbar title={title} subtitle={hint} />
      <div className="px-6 py-10">
        <div className="max-w-2xl border border-[--color-border] rounded-md p-10 text-center">
          <div className="text-mono text-[10px] uppercase tracking-[0.22em] text-[--color-fg-subtle] mb-3">
            Phase 2
          </div>
          <p className="text-[--color-fg-muted] text-sm">
            Nothing here yet. {title} ships in the next phase.
          </p>
        </div>
      </div>
    </>
  );
}
