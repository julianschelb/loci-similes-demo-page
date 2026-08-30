import { useEffect, useMemo, useState } from "react";
import PaperHeader from "./components/PaperHeader.jsx";
import Placeholder from "./components/Placeholder.jsx";
import ReferenceGraph from "./components/ReferenceGraph.jsx";
import SelectionChips from "./components/SelectionChips.jsx";

function Section({ kicker, title, children }) {
  return (
    <section className="pt-12">
      <p className="mb-1 text-[.7rem] font-extrabold uppercase tracking-[.12em] text-pop">{kicker}</p>
      <h2 className="mb-4 text-[1.5rem] font-extrabold tracking-[-.01em] text-accent">{title}</h2>
      {children}
    </section>
  );
}

export default function App() {
  const [stats, setStats] = useState(null);
  const [graph, setGraph] = useState(null);
  const [selection, setSelection] = useState(null);

  useEffect(() => {
    const base = import.meta.env.BASE_URL;
    fetch(`${base}data/stats.json`).then((r) => (r.ok ? r.json() : null)).then(setStats).catch(() => {});
    fetch(`${base}data/graph.json`).then((r) => (r.ok ? r.json() : null)).then(setGraph).catch(() => {});
  }, []);

  // Number of references matching the current selection (from the edge list).
  const matching = useMemo(() => {
    if (!graph) return null;
    const nodeAuthor = Object.fromEntries(graph.nodes.map((n) => [n.id, n.author]));
    return graph.edges
      .filter((e) => {
        if (!selection) return true;
        if (selection.kind === "author") return nodeAuthor[e.source] === selection.id || nodeAuthor[e.target] === selection.id;
        if (selection.kind === "work") return e.source === selection.id || e.target === selection.id;
        return e.source === selection.source && e.target === selection.target;
      })
      .reduce((s, e) => s + e.refs, 0);
  }, [graph, selection]);

  return (
    <div className="mx-auto max-w-[1040px] px-6 pb-24">
      <PaperHeader />

      <Section kicker="Explore" title="Reference graph">
        <div className="rounded-2xl border border-line bg-surface p-4 shadow-card">
          <ReferenceGraph graph={graph} selection={selection} onSelect={setSelection} />
        </div>
      </Section>

      <Section kicker="Browse" title="Documents and references">
        <div className="mb-4">
          <SelectionChips selection={selection} onClear={() => setSelection(null)} />
        </div>
        <Placeholder
          description={
            matching == null
              ? "Query segments with their intertextual references to the source corpus, side by side."
              : `This list will show the ${matching.toLocaleString()} reference${matching === 1 ? "" : "s"} matching the current filter, each with the citing and the source segment side by side.`
          }
          height="h-72"
        />
      </Section>

      <footer className="mt-16 flex flex-wrap justify-between gap-2 border-t border-line pt-5 text-[.88rem] font-semibold text-muted">
        <span>Loci Similes · University of Konstanz</span>
        <span>
          {stats?.built_at ? `Data built ${stats.built_at}` : "Read-only demo"} ·{" "}
          <a className="text-accent hover:text-pop" href="https://github.com/julianschelb/loci-similes-demo-page" target="_blank" rel="noopener">Source</a>
        </span>
      </footer>
    </div>
  );
}
