const KIND_LABEL = { author: "Author", work: "Work", edge: "Pair" };

export default function SelectionChips({ selection, onClear }) {
  if (!selection) {
    return <p className="text-[.85rem] font-semibold text-muted">No filter — showing all references. Select something in the graph above.</p>;
  }
  return (
    <div className="flex flex-wrap items-center gap-2 text-[.85rem]">
      <span className="font-semibold text-muted">Filter:</span>
      <span className="inline-flex items-center gap-2 rounded-full bg-accent-soft px-3 py-1 font-extrabold text-accent">
        <span className="text-[.65rem] uppercase tracking-[.1em] opacity-70">{KIND_LABEL[selection.kind]}</span>
        <span className={selection.kind === "edge" ? "font-mono text-[.8rem]" : ""}>{selection.label}</span>
        <button type="button" onClick={onClear} aria-label="Clear filter" className="ml-1 rounded-full px-1 leading-none hover:text-pop">×</button>
      </span>
    </div>
  );
}
