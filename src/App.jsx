import { useEffect, useMemo, useState } from "react";
import PaperHeader from "./components/PaperHeader.jsx";
import ReferenceGraph from "./components/ReferenceGraph.jsx";
import FilterBar from "./components/FilterBar.jsx";
import DocumentBrowser from "./components/DocumentBrowser.jsx";
import { EMPTY_FILTERS, applyFilters, filtersFromHash, filtersFromSelection, filtersToHash, selectionFromFilters } from "./filters.js";

function Section({ kicker, title, children }) {
  return (
    <section className="pt-12">
      <p className="mb-1 text-[.7rem] font-extrabold uppercase tracking-[.12em] text-pop">{kicker}</p>
      <h2 className="mb-4 text-[1.5rem] font-extrabold tracking-[-.01em] text-accent">{title}</h2>
      {children}
    </section>
  );
}

const load = (file) => fetch(`${import.meta.env.BASE_URL}data/${file}`).then((r) => (r.ok ? r.json() : null));

export default function App() {
  const [stats, setStats] = useState(null);
  const [graph, setGraph] = useState(null);
  const [refs, setRefs] = useState(null);
  const [docsIndex, setDocsIndex] = useState(null);
  const [filters, setFilters] = useState(() => filtersFromHash(window.location.hash));

  useEffect(() => {
    load("stats.json").then(setStats).catch(() => {});
    load("graph.json").then(setGraph).catch(() => {});
    load("references.json").then(setRefs).catch(() => {});
    load("docs.json").then(setDocsIndex).catch(() => {});
  }, []);

  // Keep the URL hash in sync so filtered views can be shared.
  useEffect(() => {
    const h = filtersToHash(filters);
    if (h !== window.location.hash) window.history.replaceState(null, "", h || window.location.pathname);
  }, [filters]);

  const selection = useMemo(() => selectionFromFilters(filters, graph), [filters, graph]);
  const filtered = useMemo(() => (refs ? applyFilters(refs, filters) : []), [refs, filters]);

  return (
    <div className="mx-auto max-w-[1040px] px-6 pb-24">
      <PaperHeader />

      <Section kicker="Explore" title="Reference graph">
        <ReferenceGraph graph={graph} selection={selection} onSelect={(sel) => setFilters(sel ? filtersFromSelection(sel, graph) : EMPTY_FILTERS)} />
      </Section>

      <Section kicker="Browse" title="Documents and references">
        <div className="mb-6">
          <FilterBar graph={graph} filters={filters} onChange={setFilters} shown={filtered.length} total={refs?.length ?? 0} />
        </div>
        {refs ? <DocumentBrowser refs={filtered} docsIndex={docsIndex} /> : <p className="text-muted">Loading references…</p>}
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
