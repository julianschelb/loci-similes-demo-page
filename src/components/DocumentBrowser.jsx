import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import PairDetail from "./detail/PairDetail.jsx";

const PAGE = 40;    // citing passages per page step
const LONG = 70;    // words after which a long passage shows only the stretch around its linked words
const CONTEXT = 18; // words of context kept on either side of that stretch

const bare = (cit) => cit.replace(/^<|>$/g, "");
const natural = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

// The edit operations, with the colours and wording of the edit-script review app.
const OPS = {
  COPY: { label: "COPY", text: "the same word, taken over unchanged", color: "#33618f", cls: "bg-op-copy-soft text-op-copy" },
  INFLECT: { label: "INFLECT", text: "the same word in another form", color: "#8a6414", cls: "bg-op-inflect-soft text-op-inflect" },
  SUBST: { label: "SUBST", text: "a different word in the same slot", color: "#9b3340", cls: "bg-op-subst-soft text-op-subst" },
  SPLIT: { label: "SPLIT", text: "one source word becomes two", color: "#5e4a93", cls: "bg-op-split-soft text-op-split" },
  MERGE: { label: "MERGE", text: "two source words become one", color: "#5e4a93", cls: "bg-op-split-soft text-op-split" },
  FRAME: { label: "FRAME", text: "the citing formula (ut ait poeta)", color: "#6a707a", cls: "bg-line-soft text-muted" },
};
const LINKED = new Set(["COPY", "INFLECT", "SUBST", "SPLIT", "MERGE"]);

/** The stretch of a long passage around its labelled words, with ellipses where text is left out. */
function excerpt(count, marked) {
  if (count <= LONG || !marked.length) return { from: 0, to: count };
  const from = Math.max(0, marked[0] - CONTEXT);
  const to = Math.min(count, Math.max(marked[marked.length - 1] + CONTEXT + 1, from + 2 * CONTEXT));
  return { from, to };
}

/**
 * A passage as words, each with its operation label (coloured as in the review app); INS and DEL stay plain.
 * Every word registers its element so the arrows can find it.
 */
function Passage({ words, labels, prefix, short, register, onWord }) {
  const marked = labels.map((l, i) => (l ? i : -1)).filter((i) => i >= 0);
  const { from, to } = short ? excerpt(words.length, marked) : { from: 0, to: words.length };
  return (
    <p className="font-serif text-[1rem] leading-[2.15] text-ink">
      {from > 0 && <span className="text-muted">… </span>}
      {words.slice(from, to).map((w, k) => {
        const i = from + k;
        const op = OPS[labels[i]];
        const key = `${prefix}${i}`;
        return (
          <span key={i}>
            {op ? (
              <span ref={(el) => register(key, el)} title={`${op.label}: ${op.text}`}
                onMouseEnter={() => LINKED.has(labels[i]) && onWord(key)} onMouseLeave={() => onWord(null)}
                className={`rounded-sm px-0.5 ${op.cls} ${LINKED.has(labels[i]) ? "cursor-pointer" : ""}`}>
                {w}
              </span>
            ) : w}
            {k < to - from - 1 ? " " : ""}
          </span>
        );
      })}
      {to < words.length && <span className="text-muted"> …</span>}
    </p>
  );
}

function TypeBadge({ type }) {
  return type === "cit"
    ? <span className="rounded bg-accent-soft px-1.5 py-0.5 text-[.65rem] font-semibold uppercase tracking-wide text-accent">cit.</span>
    : <span className="rounded bg-pop-soft px-1.5 py-0.5 text-[.65rem] font-semibold uppercase tracking-wide text-pop">cf.</span>;
}

/** One citing passage and every source passage it refers to, side by side; hovering a word outlines its span. */
function Group({ group, names, ops, showEnglish, onDetails }) {
  const [open, setOpen] = useState(false);
  const [word, setWord] = useState(null);     // the word under the pointer, e.g. "q:5" or "s12:3"
  const box = useRef(null);
  const nodes = useRef(new Map());
  const register = (key, el) => { if (el) nodes.current.set(key, el); else nodes.current.delete(key); };
  const q = group.q;
  const qWords = useMemo(() => q.text.split(/\s+/), [q.text]);

  // The links of the group as spans: a run of links with the same operation whose citing and source words both
  // follow one another becomes one span, outlined as one (INS and DEL have no link and are left out).
  const links = useMemo(() => group.refs.flatMap((r) => {
    const sorted = [...(ops?.[r.id]?.l ?? [])].sort((m, n) => m[0] - n[0]);
    const spans = [];
    sorted.forEach(([ri, si, op]) => {
      const last = spans[spans.length - 1];
      if (last && last.op === op && ri === last.qi[last.qi.length - 1] + 1 && si === last.si[last.si.length - 1] + 1) {
        last.qi.push(ri); last.si.push(si);
      } else spans.push({ op, qi: [ri], si: [si] });
    });
    return spans.map((sp) => ({
      op: sp.op, qKeys: sp.qi.map((i) => `q:${i}`), sKeys: sp.si.map((i) => `s${r.id}:${i}`),
      key: `s${r.id}:${sp.si[0]}>q:${sp.qi[0]}`,
    }));
  }), [group, ops]);
  // Labels of the citing words: the first linked operation over the group's sources, otherwise the citing formula.
  const qLabels = useMemo(() => qWords.map((_, i) => {
    let frame = false;
    for (const r of group.refs) {
      const t = ops?.[r.id]?.t?.[i];
      if (LINKED.has(t)) return t;
      if (t === "FRAME") frame = true;
    }
    return frame ? "FRAME" : null;
  }), [qWords, group, ops]);

  const shown = word ? links.filter((l) => l.qKeys.includes(word) || l.sKeys.includes(word)) : [];
  const [outlines, setOutlines] = useState([]);

  // The hovered word's span, on both sides: one outline per line it covers, around all its words together.
  useLayoutEffect(() => {
    const frame = box.current?.getBoundingClientRect();
    if (!frame || !shown.length) { setOutlines([]); return; }
    const rows = (keys) => {
      const rects = keys.map((k) => nodes.current.get(k)?.getBoundingClientRect()).filter(Boolean);
      const lines = [];
      rects.forEach((r) => {
        const row = lines.find((l) => Math.abs(l.top - r.top) < 4);
        if (row) { row.left = Math.min(row.left, r.left); row.right = Math.max(row.right, r.right); row.bottom = Math.max(row.bottom, r.bottom); }
        else lines.push({ top: r.top, bottom: r.bottom, left: r.left, right: r.right });
      });
      return lines.map((l) => ({ x: l.left - frame.left - 2, y: l.top - frame.top - 2, w: l.right - l.left + 4, h: l.bottom - l.top + 4 }));
    };
    setOutlines(shown.flatMap((l) => [...rows(l.sKeys), ...rows(l.qKeys)].map((r, i) => ({ ...r, key: `${l.key}:${i}`, op: l.op }))));
  }, [word, open, showEnglish, links]);   // eslint-disable-line react-hooks/exhaustive-deps

  const long = qWords.length > LONG;

  return (
    <article ref={box} onMouseLeave={() => setWord(null)}
      className="relative grid gap-x-8 gap-y-3 rounded-lg border border-line bg-surface p-4 shadow-card transition-shadow hover:shadow-card-lg md:grid-cols-2">
      {/* citing passage */}
      <div className="min-w-0">
        <p className="text-[.65rem] font-semibold uppercase tracking-[.08em] text-muted">{names[q.author] ?? q.author} · citing</p>
        <p className="mb-1.5 font-mono text-[.8rem] font-semibold text-ink">{bare(q.cit)}</p>
        <Passage words={qWords} labels={qLabels} prefix="q:" short={!open} register={register} onWord={setWord} />
        {long && (
          <button type="button" onClick={() => setOpen((o) => !o)} className="mt-1 text-[.78rem] font-semibold text-accent hover:underline">
            {open ? "show less" : "show the whole passage"}
          </button>
        )}
        {showEnglish && q.en && <p className="mt-2 text-[.85rem] italic leading-normal text-muted">{q.en}</p>}
      </div>

      {/* the sources it refers to */}
      <div className="flex min-w-0 flex-col gap-3 md:border-l md:border-line-soft md:pl-6">
        {group.refs.map((r) => {
          const sWords = r.s.text.split(/\s+/);
          const sLabels = sWords.map(() => null);
          (ops?.[r.id]?.l ?? []).forEach(([, si, op]) => { if (!sLabels[si]) sLabels[si] = op; });
          return (
            <div key={r.id} className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="text-[.65rem] font-semibold uppercase tracking-[.08em] text-muted">{names[r.s.author] ?? r.s.author} · source</span>
                <TypeBadge type={r.type} />
                {r.prov?.label && (
                  <a href={r.prov.url} target="_blank" rel="noopener" title={r.prov.title}
                    className="ml-auto text-[.72rem] text-muted hover:text-accent hover:underline">{r.prov.label}</a>
                )}
              </div>
              <p className="mb-1.5 font-mono text-[.8rem] font-semibold text-ink">{bare(r.s.cit)}</p>
              <Passage words={sWords} labels={sLabels} prefix={`s${r.id}:`} short register={register} onWord={setWord} />
              {showEnglish && r.s.en && <p className="mt-2 text-[.85rem] italic leading-normal text-muted">{r.s.en}</p>}
              <button type="button" onClick={() => onDetails(r)}
                className="btn-secondary mt-2.5 inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-[.8rem] font-semibold transition hover:-translate-y-px">
                Show details <span aria-hidden="true">→</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* the hovered span's outlines */}
      <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
        {outlines.map((o) => (
          <rect key={o.key} x={o.x} y={o.y} width={o.w} height={o.h} rx="4" fill="none" stroke={OPS[o.op]?.color ?? "#6a707a"}
            strokeWidth="1.6" className="arrow-head" />
        ))}
      </svg>
    </article>
  );
}

/**
 * The detail view of one reference in a full-screen dialog over the page: the review app's detail page, adapted.
 * Closed with the × button, Esc or a click on the backdrop; the page underneath keeps its place.
 */
const DIALOG_OUT = 180;   // ms of the closing animation (keep in step with .dialog-out in index.css)

function DetailDialog({ reference, names, onClose }) {
  const [record, setRecord] = useState(null);
  const [error, setError] = useState(null);
  const [closing, setClosing] = useState(false);
  const closeButton = useRef(null);
  // closing plays the fade-out first and unmounts after it (at once when the reader prefers less motion)
  const close = useCallback(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) { onClose(); return; }
    setClosing(true);
    setTimeout(onClose, DIALOG_OUT);
  }, [onClose]);
  useEffect(() => {
    setRecord(null); setError(null);
    fetch(`${import.meta.env.BASE_URL}data/details/${reference.id}.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(setRecord).catch((e) => setError(e.message));
  }, [reference.id]);
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButton.current?.focus();
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = overflow; };
  }, [close]);
  return (
    <div className={`fixed inset-0 z-50 flex items-start justify-center bg-ink/40 p-3 backdrop-blur-[2px] sm:p-6 ${closing ? "backdrop-out" : "backdrop-in"}`} onClick={close}
      role="dialog" aria-modal="true" aria-label={`Details of ${bare(reference.s.cit)} → ${bare(reference.q.cit)}`}>
      <div className={`flex max-h-full w-full max-w-5xl flex-col overflow-hidden rounded-lg border border-line bg-bg shadow-card-lg ${closing ? "dialog-out" : "dialog-in"}`}
        onClick={(e) => e.stopPropagation()}>
        {/* the header stays while the details scroll, so the close button is always at hand */}
        <header className="flex shrink-0 items-center gap-3 border-b border-black/10 bg-linear-to-b from-header-top to-header-bottom px-5 py-2.5 sm:px-7">
          <p className="min-w-0 truncate font-serif text-[1.05rem] font-semibold">
            <span className="text-pop">Details</span>{" "}
            <span className="text-accent">{bare(reference.s.cit)} → {bare(reference.q.cit)}</span>
          </p>
          <button ref={closeButton} type="button" onClick={close} aria-label="Close"
            className="btn-secondary ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1 text-[.8rem] font-semibold">
            Close <span aria-hidden="true" className="text-base leading-none">×</span>
          </button>
        </header>
        <div className="min-h-0 overflow-y-auto p-5 sm:p-7">
          {record ? <PairDetail record={record} provenance={reference.prov} names={names} />
            : <p className="p-8 text-center text-muted">{error ? `Could not load the details: ${error}` : "Loading…"}</p>}
        </div>
      </div>
    </div>
  );
}

/** Group the references by citing passage, in reading order of the citing works. */
function groupByCitingPassage(refs) {
  const groups = new Map();
  refs.forEach((r) => {
    let g = groups.get(r.q.cit);
    if (!g) { g = { key: r.q.cit, q: r.q, refs: [] }; groups.set(r.q.cit, g); }
    g.refs.push(r);
  });
  const list = [...groups.values()];
  list.forEach((g) => g.refs.sort((a, b) => natural.compare(a.s.cit, b.s.cit)));
  return list.sort((a, b) => natural.compare(a.key, b.key));
}

export default function DocumentBrowser({ refs, docsIndex, ops }) {
  const [limit, setLimit] = useState(PAGE);
  const [showEnglish, setShowEnglish] = useState(false);
  const [details, setDetails] = useState(null);   // the reference whose detail dialog is open
  const closeDetails = useCallback(() => setDetails(null), []);
  useEffect(() => { setLimit(PAGE); }, [refs]);

  const groups = useMemo(() => groupByCitingPassage(refs), [refs]);
  const names = useMemo(() => {
    const out = {};
    Object.values(docsIndex ?? {}).forEach((d) => { out[d.author] = d.author_name; });
    return out;
  }, [docsIndex]);

  if (refs.length === 0) {
    return <p className="rounded-lg border-2 border-dashed border-line p-8 text-center text-muted">No references match the current filters.</p>;
  }
  const shown = groups.slice(0, limit);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-md border border-line bg-surface px-3 py-2 text-[.8rem] text-ink-2">
        <span className="text-[.65rem] font-semibold uppercase tracking-[.08em] text-muted">Operations</span>
        {["COPY", "INFLECT", "SUBST", "SPLIT", "FRAME"].map((op) => (
          <span key={op} className="inline-flex items-center gap-1.5" title={OPS[op].text}>
            <span className={`rounded-sm px-1 text-[.7rem] font-semibold ${OPS[op].cls}`}>{op === "SPLIT" ? "SPLIT / MERGE" : op}</span>
            <span className="text-muted">{op === "SPLIT" ? "one word into two, or two into one" : OPS[op].text}</span>
          </span>
        ))}
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-[.8rem] text-ink-2">
        <span>{groups.length.toLocaleString()} citing passages, each beside the passages it refers to</span>
        <label className="ml-auto inline-flex cursor-pointer items-center gap-2 font-semibold">
          <input type="checkbox" checked={showEnglish} onChange={(e) => setShowEnglish(e.target.checked)} className="accent-accent" />
          English translations
        </label>
      </div>

      <div className="flex flex-col gap-3">
        {shown.map((g) => <Group key={g.key} group={g} names={names} ops={ops} showEnglish={showEnglish} onDetails={setDetails} />)}
      </div>

      {groups.length > shown.length && (
        <div className="mt-6 text-center">
          <button type="button" onClick={() => setLimit((l) => l + PAGE)}
            className="rounded-md border border-line bg-surface px-5 py-2 text-[.9rem] font-semibold text-ink-2 shadow-card transition hover:border-accent hover:text-accent">
            Show {Math.min(PAGE, groups.length - shown.length)} more of {(groups.length - shown.length).toLocaleString()} remaining passages
          </button>
        </div>
      )}

      {details && <DetailDialog reference={details} names={names} onClose={closeDetails} />}
    </div>
  );
}
