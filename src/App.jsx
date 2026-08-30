import { useEffect, useState } from "react";
import PaperHeader from "./components/PaperHeader.jsx";
import Placeholder from "./components/Placeholder.jsx";

export default function App() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/stats.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setStats)
      .catch(() => setStats(null));
  }, []);

  return (
    <div className="mx-auto max-w-[1040px] px-6 pb-24">
      <PaperHeader />

      <Placeholder
        kicker="Explore"
        title="Reference graph"
        description="Interactive graph of citing and source authors/works. Selecting nodes or edges here will filter the documents below."
        height="h-[420px]"
      >
        {stats && (
          <p className="font-mono text-[.8rem] text-muted">
            {stats.labels.rows.toLocaleString()} references · {stats.corpus.rows.toLocaleString()} source segments ·{" "}
            {stats.queries.rows.toLocaleString()} query segments
          </p>
        )}
      </Placeholder>

      <Placeholder
        kicker="Browse"
        title="Documents and references"
        description="Query segments with their intertextual references to the source corpus, side by side, filtered by the selection in the graph."
        height="h-96"
      />

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
