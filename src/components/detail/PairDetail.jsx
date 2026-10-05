import { useState } from "react";
import MappingVertical from "./MappingVertical.jsx";
import Legend from "./Legend.jsx";
import MappingDiagram from "./MappingDiagram.jsx";
import { LABEL_NAME, OP_STYLE } from "./labels.js";

function Kicker({ children }) {
  return <p className="mb-1 text-[.7rem] font-semibold uppercase tracking-[.08em] text-muted">{children}</p>;
}

function OpChip({ op }) {
  if (!op) return <span className="text-muted">–</span>;
  const style = OP_STYLE[op] ?? OP_STYLE.INS;
  return <span className={`rounded px-1.5 text-xs font-bold ${style.bg} ${style.text}`}>{op}</span>;
}

// The predicted links, one row per linked citing word.
function LinkTable({ record }) {
  const links = [...(record.pred?.links ?? [])].sort((a, b) => a.r - b.r);
  const src = record.source.tokens, reu = record.reuse.tokens;
  if (!links.length) return <p className="text-sm text-muted">No predicted links.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm tabular-nums">
        <thead>
          <tr className="border-b border-line text-left text-xs text-muted">
            <th className="py-1.5 pr-3 font-semibold">Citing word</th>
            <th className="py-1.5 pr-3 font-semibold">Operation</th>
            <th className="py-1.5 pr-3 font-semibold">Source word</th>
            <th className="py-1.5 pr-3 font-semibold">p</th>
          </tr>
        </thead>
        <tbody>
          {links.map((e) => (
            <tr key={e.r} className="border-b border-line-soft">
              <td className="py-1.5 pr-3 font-semibold">{reu[e.r]}</td>
              <td className="py-1.5 pr-3"><OpChip op={e.op} /></td>
              <td className="py-1.5 pr-3">{src[e.s]}</td>
              <td className="py-1.5 pr-3 text-muted">{e.p != null ? e.p.toFixed(2) : ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const bare = (citation) => (citation ?? "").replace(/[<>]/g, "");

function Field({ label, children }) {
  return (
    <div className="min-w-0">
      <dt className="text-[.65rem] font-semibold uppercase tracking-[.08em] text-muted">{label}</dt>
      <dd className="truncate text-sm text-ink" title={typeof children === "string" ? children : undefined}>{children ?? "–"}</dd>
    </div>
  );
}

function SideFields({ title, side, names }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-ink-2">{title}</p>
      <dl className="grid grid-cols-3 gap-x-4 gap-y-2">
        <Field label="Author">{names?.[side.author] ?? side.author}</Field>
        <Field label="Work">{side.work}</Field>
        <Field label="Length">{`${side.tokens.length} words`}</Field>
      </dl>
    </div>
  );
}

// The pair's metadata: the two passages' citations as the title, the reference type and where the reference comes
// from, then the two sides' fields.
function PairHeader({ record, provenance, names }) {
  return (
    <header className="space-y-4">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="font-serif text-[1.35rem] font-semibold text-ink">
          {bare(record.source.citation)} <span className="text-muted">→</span> {bare(record.reuse.citation)}
        </h2>
        <span className={`rounded px-1.5 py-0.5 text-[.65rem] font-semibold uppercase tracking-wide ${
          record.pair_label === "cit" ? "bg-accent-soft text-accent" : "bg-pop-soft text-pop"
        }`}>{LABEL_NAME[record.pair_label] ?? record.pair_label}</span>
        {provenance?.label && (
          <a href={provenance.url} target="_blank" rel="noopener" title={provenance.title}
             className="text-xs text-muted hover:text-accent hover:underline">from {provenance.label}</a>
        )}
      </div>

      <div className="grid gap-4 rounded-md border border-line bg-surface p-4 md:grid-cols-2">
        <SideFields title="Source" side={record.source} names={names} />
        <SideFields title="Citing" side={record.reuse} names={names} />
      </div>
    </header>
  );
}

// The two passages as the edition prints them, with their English translations: source left, reuse right, as in
// the header above.
function TextTable({ record }) {
  const sides = [["Source", record.source], ["Citing", record.reuse]];
  return (
    <section className="overflow-x-auto rounded-md border border-line bg-surface">
      <table className="w-full table-fixed text-sm">
        <thead>
          <tr className="border-b border-line text-left">
            <th className="w-20 px-4 py-2"></th>
            {sides.map(([name]) => <th key={name} className="px-4 py-2 text-xs font-semibold text-ink-2">{name}</th>)}
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-line-soft align-top">
            <th scope="row" className="px-4 py-2.5 text-left text-[.65rem] font-semibold uppercase tracking-[.08em] text-muted">Latin</th>
            {sides.map(([name, side]) => (
              <td key={name} className="px-4 py-2.5 font-serif text-[1rem] leading-snug text-ink">{side.text_original || side.text}</td>
            ))}
          </tr>
          <tr className="align-top">
            <th scope="row" className="px-4 py-2.5 text-left text-[.65rem] font-semibold uppercase tracking-[.08em] text-muted">English</th>
            {sides.map(([name, side]) => (
              <td key={name} className="px-4 py-2.5 font-serif text-[1rem] leading-snug text-ink-2">{side.text_english || "–"}</td>
            ))}
          </tr>
        </tbody>
      </table>
    </section>
  );
}

// The orientation is a per-viewer preference, remembered in the browser when it can be.
const ORIENTATION_KEY = "demo.mapping.orientation";
function savedOrientation() {
  try { return localStorage.getItem(ORIENTATION_KEY) === "vertical" ? "vertical" : "horizontal"; } catch { return "horizontal"; }
}

function Mapping({ record }) {
  const [orientation, setOrientation] = useState(savedOrientation);
  const choose = (value) => {
    setOrientation(value);
    try { localStorage.setItem(ORIENTATION_KEY, value); } catch { /* storage unavailable: keep it for this visit */ }
  };
  const props = { source: record.source.tokens, reuse: record.reuse.tokens,
                  links: record.pred?.links ?? [], spans: record.pred?.frame_spans ?? [] };
  return (
    <section className="rounded-md border border-line bg-surface p-5">
      <div className="mb-2 flex items-center">
        <Kicker>Mapping</Kicker>
        <div className="ml-auto inline-flex rounded-md border border-line p-0.5 text-xs font-semibold" role="group" aria-label="Orientation">
          {[["horizontal", "Horizontal"], ["vertical", "Vertical"]].map(([key, name]) => (
            <button key={key} type="button" onClick={() => choose(key)} aria-pressed={orientation === key}
                    className={`rounded px-2.5 py-0.5 ${orientation === key ? "bg-accent text-white" : "text-ink-2 hover:bg-bg"}`}>
              {name}
            </button>
          ))}
        </div>
      </div>
      {orientation === "vertical" ? <MappingVertical {...props} /> : <MappingDiagram {...props} />}
      <Legend />
    </section>
  );
}

// The detail view of one reference, adapted from the edit-script review app: header, mapping, texts, links.
export default function PairDetail({ record, provenance, names }) {
  return (
    <article className="space-y-6">
      <PairHeader record={record} provenance={provenance} names={names} />

      <Mapping record={record} />

      <TextTable record={record} />

      <section className="rounded-md border border-line bg-surface p-5">
        <Kicker>Links</Kicker>
        <LinkTable record={record} />
      </section>
    </article>
  );
}
