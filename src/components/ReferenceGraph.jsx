import { useEffect, useMemo, useRef, useState } from "react";

const W = 1000;

// One muted hue per author, in the Parchment palette; nodes use the hue, expanded columns a light tint of it.
const AUTHOR_COLORS = [
  "#9b3340", // wine
  "#8a6414", // ochre
  "#5e4a93", // violet
  "#3f7f6e", // sea green
  "#b5653a", // rust
  "#7a5c99", // plum
  "#4a8a9a", // teal
  "#a0783c", // tan
  "#5f6f3a", // olive
  "#8c6d62", // clay
  "#6b8e5a", // sage
  "#b07d9a", // mauve
];   // no blue: that is the edge colour

const EDGE = "#4f80b8";   // one colour for every edge

const authorRadius = (refs) => 8 + Math.sqrt(refs) * 0.9;
const workRadius = (refs) => Math.min(13, Math.max(4, 3 + Math.sqrt(refs) * 0.55));
const edgeWidth = (refs) => 1 + Math.sqrt(refs) * 0.55;
const X = { query: W * 0.24, source: W * 0.76 };
const TOP = 52;            // room for the two column headers
const SLOT_GAP = 14;       // vertical gap between two authors
const WORK_GAP = 5;        // vertical gap between two works of an expanded author
const COLUMN_TOP = 30;     // room for the author name above an expanded column
const MIN_H = 520;
const COLLAPSE_DELAY = 250;
const DURATION = 420;      // ms per transition

/** Static per-author data: colour, collapsed radius, works sorted by size. */
function useModel(graph) {
  return useMemo(() => {
    if (!graph) return null;
    const byId = Object.fromEntries(graph.nodes.map((n) => [n.id, n]));
    const authors = graph.authors.map((a, i) => ({
      ...a,
      color: AUTHOR_COLORS[i % AUTHOR_COLORS.length],
      r: authorRadius(a.refs),
      workNodes: a.works.map((id) => ({ ...byId[id], r: workRadius(byId[id].refs) })).sort((x, y) => y.refs - x.refs),
    }));
    const authorIndex = Object.fromEntries(authors.map((a) => [a.id, a]));
    const workIndex = Object.fromEntries(authors.flatMap((a) => a.workNodes.map((n) => [n.id, n])));
    const links = graph.edges.map((e, i) => ({ ...e, i, source: workIndex[e.source], target: workIndex[e.target] }));
    return { authors, authorIndex, workIndex, links };
  }, [graph]);
}

const hasFilter = (f) => Boolean(f.qAuthor || f.qWork || f.sAuthor || f.sWork);

/** Whether a work-level link passes the current filters (the same rule as the document browser). */
const linkMatches = (f, l) =>
  (!f.qAuthor || l.source.author === f.qAuthor) && (!f.qWork || l.source.work === f.qWork) &&
  (!f.sAuthor || l.target.author === f.sAuthor) && (!f.sWork || l.target.work === f.sWork);

/**
 * The target picture for a set of expanded authors and the filters, as flat numbers that can be tweened:
 * every author, work, column and work-level link has a position, size and opacity in every state.
 * A collapsed author's works sit at its centre with radius 0; an expanded author's own circle shrinks to 0.
 * Links are always drawn per work; where the endpoints are collapsed, one link of the group carries the summed width.
 */
function targetState({ authors, links }, expanded, filters) {
  const v = {};
  const groups = new Map();
  // vertical layout per side: authors one under another, an expanded author as a column of works
  const slotHeight = (a) => (expanded.has(a.id) ? COLUMN_TOP + a.workNodes.reduce((s, n) => s + 2 * n.r + WORK_GAP, 0) : 2 * a.r + 12);
  const sideHeight = (side) => {
    const list = authors.filter((a) => a.side === side);
    return list.reduce((s, a) => s + slotHeight(a), 0) + SLOT_GAP * (list.length - 1);
  };
  const H = Math.max(MIN_H, TOP + 24 + Math.max(sideHeight("query"), sideHeight("source")));
  v.H = H;

  const filtered = hasFilter(filters);
  const activeWorks = new Set();
  if (filtered) links.forEach((l) => { if (linkMatches(filters, l)) { activeWorks.add(l.source.id); activeWorks.add(l.target.id); } });
  const workActive = (n) => !filtered || activeWorks.has(n.id);
  const authorActive = (a) => !filtered || a.works.some((id) => activeWorks.has(id));

  for (const side of ["query", "source"]) {
    const list = authors.filter((a) => a.side === side);
    let y = TOP + (H - TOP - 24 - sideHeight(side)) / 2;
    const x = X[side];
    list.forEach((a) => {
      const h = slotHeight(a);
      const open = expanded.has(a.id);
      const dim = authorActive(a) ? 1 : 0.3;
      const cy = open ? y + COLUMN_TOP + (h - COLUMN_TOP) / 2 : y + h / 2;
      Object.assign(v, {
        [`a:${a.id}:x`]: x, [`a:${a.id}:y`]: cy, [`a:${a.id}:r`]: open ? 0 : a.r, [`a:${a.id}:o`]: open ? 0 : dim,
        [`b:${a.id}:t`]: open ? y + COLUMN_TOP - 10 : cy, [`b:${a.id}:b`]: open ? y + h : cy, [`b:${a.id}:o`]: open ? (authorActive(a) ? 1 : 0.45) : 0,
        [`b:${a.id}:ny`]: open ? y + 16 : cy,
      });
      let wy = y + COLUMN_TOP;
      a.workNodes.forEach((n) => {
        Object.assign(v, open
          ? { [`w:${n.id}:x`]: x, [`w:${n.id}:y`]: wy + n.r, [`w:${n.id}:r`]: n.r, [`w:${n.id}:o`]: workActive(n) ? 1 : 0.3 }
          : { [`w:${n.id}:x`]: x, [`w:${n.id}:y`]: cy, [`w:${n.id}:r`]: 0, [`w:${n.id}:o`]: 0 });
        wy += 2 * n.r + WORK_GAP;
      });
      y += h + SLOT_GAP;
    });
  }

  const end = (n) => (expanded.has(n.author) ? n.id : n.author);
  links.forEach((l) => {
    const key = `${end(l.source)}|${end(l.target)}`;
    const g = groups.get(key) ?? { key, rep: l.i, links: [], refs: 0, cit: 0, cf: 0, a: l.source, b: l.target, aOpen: expanded.has(l.source.author), bOpen: expanded.has(l.target.author) };
    g.links.push(l); g.refs += l.refs; g.cit += l.cit; g.cf += l.cf;
    groups.set(key, g);
  });
  const groupOf = {};
  groups.forEach((g) => {
    const active = !filtered || g.links.some((l) => linkMatches(filters, l));
    g.links.forEach((l) => {
      groupOf[l.i] = g;
      v[`l:${l.i}:w`] = l.i === g.rep ? edgeWidth(g.refs) : 0;
      v[`l:${l.i}:o`] = !filtered ? 0.4 : active ? 0.85 : 0.06;
    });
  });
  return { v, groupOf };
}

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const reduceMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** Tween every number of the picture from what is on screen to the new target. */
function useTween(target) {
  const [shown, setShown] = useState(target);
  const current = useRef(target);
  const frame = useRef(0);
  useEffect(() => {
    if (!target) return undefined;
    const from = current.current ?? target;
    if (reduceMotion() || from === target) { current.current = target; setShown(target); return undefined; }
    const start = performance.now();
    cancelAnimationFrame(frame.current);
    const step = (now) => {
      const k = Math.min(1, (now - start) / DURATION);
      const e = ease(k);
      const next = {};
      for (const key in target) {
        const a = from[key] ?? target[key];
        next[key] = a + (target[key] - a) * e;
      }
      current.current = next;
      setShown(next);
      if (k < 1) frame.current = requestAnimationFrame(step);
    };
    frame.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame.current);
  }, [target]);
  return shown ?? target;
}

const pathFor = (x1, y1, x2, y2) => {
  const mx = (x1 + x2) / 2;
  return `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`;
};

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
const labelStyle = { paintOrder: "stroke", stroke: "#f7f6f2", strokeWidth: 3 };

/** The legend: what the circles, columns and lines stand for; one icon box per item so the rows line up. */
function Legend() {
  const Icon = ({ children }) => <svg width="28" height="20" viewBox="0 0 28 20" className="shrink-0" aria-hidden="true">{children}</svg>;
  const Item = ({ icon, children }) => <span className="inline-flex items-center gap-1.5">{icon}<span>{children}</span></span>;
  return (
    <div className="mb-3 flex flex-wrap items-center gap-x-6 gap-y-1.5 rounded-md border border-line bg-surface px-3 py-2 text-[.8rem] text-ink-2">
      <span className="text-[.65rem] font-semibold uppercase tracking-[.08em] text-muted">Legend</span>
      <Item icon={<Icon><circle cx="14" cy="10" r="7" fill="#6a707a" /></Icon>}>author · size = references</Item>
      <Item icon={<Icon><rect x="9" y="0" width="10" height="20" rx="5" fill="#6a707a" opacity=".15" /><circle cx="14" cy="5" r="3" fill="#6a707a" /><circle cx="14" cy="11" r="2.4" fill="#6a707a" /><circle cx="14" cy="16" r="2" fill="#6a707a" /></Icon>}>unfolded author · one row per work</Item>
      <Item icon={<Icon><path d="M2,10 C12,10 16,4 26,4" stroke={EDGE} strokeWidth="1.5" fill="none" opacity=".7" /><path d="M2,10 C12,10 16,15 26,15" stroke={EDGE} strokeWidth="4" fill="none" opacity=".6" strokeLinecap="round" /></Icon>}>references · width = count</Item>
    </div>
  );
}

export default function ReferenceGraph({ graph, filters, onFilter }) {
  const model = useModel(graph);
  const [tipState, setTip] = useState(null);     // { id, x, y, title, lines }
  const [hovered, setHovered] = useState(null);  // the author unfolded by the pointer; folds back when the pointer leaves it
  const timer = useRef(null);
  const suppressed = useRef(null);               // an author just folded by a click, not re-opened by the same pointer

  // Expanded authors: the one under the pointer and the ones the filters name.
  const expandedKey = [hovered, filters.qAuthor, filters.sAuthor].filter(Boolean).sort().join(",");
  const target = useMemo(
    () => (model ? targetState(model, new Set(expandedKey ? expandedKey.split(",") : []), filters) : null),
    [model, expandedKey, filters]
  );
  const v = useTween(target?.v);

  if (!model || !target || !v) {
    return <div className="flex h-[520px] items-center justify-center text-muted">Loading graph…</div>;
  }
  const { authors, authorIndex, links } = model;
  const { groupOf } = target;
  const expanded = new Set(expandedKey ? expandedKey.split(",") : []);

  // Hover unfolds an author and folding follows shortly after the pointer leaves it (the delay bridges the gaps
  // between its circle, its column, its works and its lines). A click pins it open: it is then a filter.
  const enter = (id) => { clearTimeout(timer.current); if (suppressed.current !== id) setHovered(id); };
  const leave = () => { clearTimeout(timer.current); timer.current = setTimeout(() => setHovered(null), COLLAPSE_DELAY); };
  const keepOpen = (g) => { if (hovered && (g.a.author === hovered || g.b.author === hovered)) clearTimeout(timer.current); };
  const pinned = (a) => (a.side === "query" ? filters.qAuthor : filters.sAuthor) === a.id;
  // Clicking a pinned author again unpins it: its filter goes, and it folds even though the pointer is still on it.
  const toggleAuthor = (a) => {
    if (!pinned(a)) { select(authorPart(a)); return; }
    onFilter({ ...filters, ...(a.side === "query" ? { qAuthor: null, qWork: null } : { sAuthor: null, sWork: null }) });
    suppressed.current = a.id;
    setHovered(null);
    setTimeout(() => { if (suppressed.current === a.id) suppressed.current = null; }, DURATION + 300);
  };

  // A click sets the filters for the clicked item and keeps the reference-type filter.
  const select = (part) => onFilter({ qAuthor: null, qWork: null, sAuthor: null, sWork: null, type: filters.type ?? null, ...part });
  const authorPart = (a) => (a.side === "query" ? { qAuthor: a.id } : { sAuthor: a.id });
  const workPart = (n) => (n.side === "query" ? { qAuthor: n.author, qWork: n.work } : { sAuthor: n.author, sWork: n.work });
  const groupPart = (g) => ({
    ...(g.aOpen ? workPart(g.a) : { qAuthor: g.a.author }),
    ...(g.bOpen ? workPart(g.b) : { sAuthor: g.b.author }),
  });
  const groupLabel = (g) => `${g.aOpen ? g.a.work : authorIndex[g.a.author].name} → ${g.bOpen ? g.b.work : authorIndex[g.b.author].name}`;

  const tip = (evt, id, title, lines) => {
    const box = evt.currentTarget.ownerSVGElement.getBoundingClientRect();
    setTip({ id, x: evt.clientX - box.left, y: evt.clientY - box.top, title, lines });
  };
  const authorTip = (a) => [`${plural(a.works.length, "work")} · ${a.refs} references`, `${a.cit} verbatim (cit.) · ${a.cf} allusions (cf.)`];
  const isFilteredWork = (n) => (n.side === "query" ? filters.qWork : filters.sWork) === n.work && (n.side === "query" ? filters.qAuthor : filters.sAuthor) === n.author;
  const outer = (side, x, d) => (side === "query" ? x - d : x + d);
  const anchor = (side) => (side === "query" ? "end" : "start");
  const H = v.H;

  return (
    <div className="relative">
      <Legend />
      <svg viewBox={`0 0 ${W} ${H}`} className="block w-full select-none" role="img" aria-label="Graph of intertextual references between authors and their works"
        onMouseLeave={() => { leave(); setTip(null); }}
        onClick={() => onFilter({ ...filters, qAuthor: null, qWork: null, sAuthor: null, sWork: null })}>
        <text x={X.query} y={20} textAnchor="middle" className="fill-muted" style={{ fontSize: 11.5, letterSpacing: ".08em", fontWeight: 600 }}>CITING AUTHORS</text>
        <text x={X.source} y={20} textAnchor="middle" className="fill-muted" style={{ fontSize: 11.5, letterSpacing: ".08em", fontWeight: 600 }}>REFERENCED AUTHORS</text>

        {/* Columns of the expanded authors */}
        {authors.map((a) => {
          const o = v[`b:${a.id}:o`];
          if (o < 0.01) return null;
          const t = v[`b:${a.id}:t`], b = v[`b:${a.id}:b`], x = X[a.side], wide = 16;
          const isFilter = filters.qAuthor === a.id || filters.sAuthor === a.id;
          return (
            <g key={a.id} className="cursor-pointer" opacity={o} pointerEvents={expanded.has(a.id) ? "auto" : "none"}
              onMouseEnter={() => enter(a.id)}
              onClick={(e) => { e.stopPropagation(); toggleAuthor(a); }}
              onMouseMove={(e) => tip(e, a.id, a.name, [...authorTip(a), pinned(a) ? "click to fold and clear the filter" : "click to keep it open and filter"])}
              onMouseLeave={() => { setTip(null); leave(); }}>
              <rect x={x - wide} y={t} width={2 * wide} height={Math.max(0, b - t)} rx={wide} fill={a.color} opacity={isFilter ? 0.22 : 0.13} />
              <text x={x} y={v[`b:${a.id}:ny`]} textAnchor="middle" fill={a.color} style={{ fontSize: 15, fontWeight: 600, ...labelStyle }}>{a.name}</text>
            </g>
          );
        })}

        {/* Edges, one colour; width = number of references */}
        {links.map((l) => {
          const w = v[`l:${l.i}:w`];
          if (w < 0.05) return null;
          const g = groupOf[l.i];
          const live = g.rep === l.i;
          const hot = live && tipState?.id === g.key;
          return (
            <path key={l.i} d={pathFor(v[`w:${l.source.id}:x`], v[`w:${l.source.id}:y`], v[`w:${l.target.id}:x`], v[`w:${l.target.id}:y`])}
              fill="none" stroke={EDGE} strokeWidth={w + (hot ? 2 : 0)} strokeLinecap="round" className="cursor-pointer"
              opacity={hot ? Math.max(0.8, v[`l:${l.i}:o`]) : v[`l:${l.i}:o`]} pointerEvents={live ? "stroke" : "none"}
              onMouseEnter={() => keepOpen(g)}
              onClick={(ev) => { ev.stopPropagation(); select(groupPart(g)); }}
              onMouseMove={(ev) => tip(ev, g.key, groupLabel(g), [`${g.refs} references`, `${g.cit} verbatim (cit.) · ${g.cf} allusions (cf.)`])}
              onMouseLeave={() => { setTip(null); leave(); }} />
          );
        })}

        {/* Authors as single circles (they shrink away when unfolded) */}
        {authors.map((a) => {
          const r = v[`a:${a.id}:r`], o = v[`a:${a.id}:o`];
          if (r < 0.3 || o < 0.01) return null;
          const x = v[`a:${a.id}:x`], y = v[`a:${a.id}:y`];
          return (
            <g key={a.id} className="cursor-pointer" opacity={o} pointerEvents={expanded.has(a.id) ? "none" : "auto"}
              onMouseEnter={() => enter(a.id)} onMouseLeave={() => { setTip(null); leave(); }}
              onClick={(e) => { e.stopPropagation(); toggleAuthor(a); }}
              onMouseMove={(e) => tip(e, a.id, a.name, [...authorTip(a), "hover to list its works, click to keep it open"])}>
              <circle cx={x} cy={y} r={r} fill={a.color} stroke="#fff" strokeWidth={2} />
              <text x={outer(a.side, x, r + 8)} y={y + 5} textAnchor={anchor(a.side)} fill={a.color} style={{ fontSize: 15, fontWeight: 600, ...labelStyle }}>{a.name}</text>
            </g>
          );
        })}

        {/* Works, one per row in the column of an unfolded author */}
        {authors.flatMap((a) => a.workNodes).map((n) => {
          const r = v[`w:${n.id}:r`], o = v[`w:${n.id}:o`];
          if (r < 0.3 || o < 0.01) return null;
          const x = v[`w:${n.id}:x`], y = v[`w:${n.id}:y`];
          const selected = isFilteredWork(n);
          return (
            <g key={n.id} className="cursor-pointer" opacity={o} pointerEvents={expanded.has(n.author) ? "auto" : "none"}
              onMouseEnter={() => enter(n.author)} onMouseLeave={() => { setTip(null); leave(); }}
              onClick={(e) => { e.stopPropagation(); select(workPart(n)); }}
              onMouseMove={(e) => tip(e, n.id, n.work, [`${n.side === "query" ? "citing" : "source"} work · ${n.segments.toLocaleString()} segments`, `${n.refs} references: ${n.cit} cit. · ${n.cf} cf.`])}>
              <circle cx={x} cy={y} r={r} fill={authorIndex[n.author].color} stroke={selected ? "#1f2328" : "#fff"} strokeWidth={selected ? 2.5 : 1.5} />
              <text x={outer(n.side, x, 22 + r)} y={y + 4} textAnchor={anchor(n.side)} className="fill-ink-2"
                style={{ fontSize: 11.5, fontFamily: "IBM Plex Mono, monospace", fontWeight: selected ? 600 : 500, ...labelStyle }}>
                {n.work} <tspan className="fill-muted">{n.refs}</tspan>
              </text>
            </g>
          );
        })}
      </svg>

      {tipState && (
        <div className="pointer-events-none absolute z-10 max-w-xs rounded-md border border-line bg-surface px-3 py-2 text-[.8rem] shadow-card-lg"
          style={{ left: tipState.x + 14, top: tipState.y + 14 }}>
          <div className="font-semibold text-ink">{tipState.title}</div>
          {tipState.lines.map((l) => <div key={l} className="text-ink-2">{l}</div>)}
        </div>
      )}

      <p className="mt-1 text-right text-[.8rem] text-muted">click an author again to fold it · click the background to clear the filter</p>
    </div>
  );
}
